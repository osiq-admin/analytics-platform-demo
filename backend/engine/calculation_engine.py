"""Calculation DAG executor — builds dependency graph and executes SQL layer by layer."""
import logging
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from backend.db import DuckDBManager
from backend.models.calculations import CalculationDefinition, CalculationLayer
from backend.services.metadata_service import MetadataService

log = logging.getLogger(__name__)

LAYER_ORDER = [
    CalculationLayer.TRANSACTION,
    CalculationLayer.TIME_WINDOW,
    CalculationLayer.AGGREGATION,
    CalculationLayer.DERIVED,
]


class CalculationEngine:
    def __init__(self, workspace_dir: Path, db: DuckDBManager, metadata: MetadataService):
        self._workspace = workspace_dir
        self._db = db
        self._metadata = metadata

    def build_dag(self) -> list[CalculationDefinition]:
        """Load all calculations and return them in topological (dependency) order.

        Raises ValueError if a cycle is detected.
        """
        calcs = self._metadata.list_calculations()
        if not calcs:
            return []

        calc_map = {c.calc_id: c for c in calcs}
        visited: set[str] = set()
        in_stack: set[str] = set()
        order: list[str] = []

        def visit(cid: str):
            if cid in in_stack:
                raise ValueError(f"Dependency cycle detected involving '{cid}'")
            if cid in visited:
                return
            in_stack.add(cid)
            calc = calc_map.get(cid)
            if calc:
                for dep in calc.depends_on:
                    visit(dep)
            in_stack.remove(cid)
            visited.add(cid)
            order.append(cid)

        for cid in calc_map:
            visit(cid)

        # Return in topological order, further sorted by layer
        ordered = [calc_map[cid] for cid in order if cid in calc_map]
        layer_rank = {layer: i for i, layer in enumerate(LAYER_ORDER)}
        ordered.sort(key=lambda c: layer_rank.get(c.layer, 99))
        return ordered

    def run_all(self) -> dict[str, dict]:
        """Execute all calculations in DAG order. Returns {calc_id: {row_count, table_name}}."""
        dag = self.build_dag()
        results = {}
        for calc in dag:
            results[calc.calc_id] = self._execute(calc)
        return results

    def run_one(self, calc_id: str) -> dict:
        """Execute a single calculation (and its dependencies if not already materialized)."""
        dag = self.build_dag()
        calc_map = {c.calc_id: c for c in dag}
        calc = calc_map.get(calc_id)
        if calc is None:
            raise ValueError(f"Calculation '{calc_id}' not found")

        # Execute dependencies first
        for dep_id in self._resolve_deps(calc_id, calc_map):
            if dep_id != calc_id:
                dep_calc = calc_map[dep_id]
                self._execute(dep_calc)
        return self._execute(calc)

    def _resolve_deps(self, calc_id: str, calc_map: dict[str, CalculationDefinition]) -> list[str]:
        """Get ordered list of all transitive dependencies including self."""
        visited: set[str] = set()
        order: list[str] = []

        def visit(cid: str):
            if cid in visited:
                return
            visited.add(cid)
            calc = calc_map.get(cid)
            if calc:
                for dep in calc.depends_on:
                    visit(dep)
            order.append(cid)

        visit(calc_id)
        return order

    def _execute(self, calc: CalculationDefinition) -> dict:
        """Execute a single calculation's SQL and persist results."""
        table_name = calc.output.get("table_name", f"calc_{calc.calc_id}")
        sql = calc.logic
        if not sql:
            log.warning("Calculation %s has no SQL logic, skipping", calc.calc_id)
            return {"row_count": 0, "table_name": table_name}

        log.info("Executing calculation: %s → %s", calc.calc_id, table_name)
        cursor = self._db.cursor()

        # Execute SQL and fetch results
        result = cursor.execute(sql)
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        cursor.close()

        # Create DuckDB table from results (quote name for reserved words)
        cursor = self._db.cursor()
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        cursor.execute(f'DROP VIEW IF EXISTS "{table_name}"')
        cursor.execute(f'CREATE TABLE "{table_name}" AS {sql}')
        cursor.close()

        row_count = len(rows)

        # Write results to Parquet
        self._write_parquet(calc, table_name, sql)

        log.info("Calculation %s complete: %d rows → %s", calc.calc_id, row_count, table_name)
        return {"row_count": row_count, "table_name": table_name}

    def _write_parquet(self, calc: CalculationDefinition, table_name: str, sql: str) -> None:
        """Write calculation results to a Parquet file in the results directory."""
        layer_dir = self._workspace / "results" / calc.layer.value
        layer_dir.mkdir(parents=True, exist_ok=True)
        parquet_path = layer_dir / f"{table_name}.parquet"

        cursor = self._db.cursor()
        arrow_table = cursor.execute(f'SELECT * FROM "{table_name}"').fetch_arrow_table()
        cursor.close()

        pq.write_table(arrow_table, parquet_path)
