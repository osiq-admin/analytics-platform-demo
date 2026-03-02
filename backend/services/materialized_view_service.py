"""Materialized view manager — metadata-driven MV refresh with DuckDB OLAP layer.

MVs are defined in workspace/metadata/medallion/materialized_views.json.
DuckDB reads from Iceberg via iceberg_scan(), materialized as DuckDB tables.
"""

import json
import logging
import time
from pathlib import Path
from typing import TYPE_CHECKING

from backend.models.lakehouse import MaterializedViewConfig

if TYPE_CHECKING:
    from backend.db import DuckDBManager
    from backend.services.lakehouse_service import LakehouseService

log = logging.getLogger(__name__)


class MaterializedViewService:
    """Manages materialized view definitions, refresh, and status tracking."""

    def __init__(
        self,
        workspace: Path,
        lakehouse: "LakehouseService | None" = None,
        db: "DuckDBManager | None" = None,
    ):
        self._workspace = workspace
        self._lakehouse = lakehouse
        self._db = db
        self._mv_path = workspace / "metadata" / "medallion" / "materialized_views.json"
        self._configs: list[MaterializedViewConfig] = []
        self._status: dict[str, dict] = {}
        self._load_configs()

    def load_mv_configs(self) -> list[MaterializedViewConfig]:
        return list(self._configs)

    def refresh(self, mv_id: str) -> dict:
        """Refresh a single materialized view. Returns status dict."""
        mv = self._get_mv(mv_id)
        if not mv:
            return {"status": "error", "error": f"MV {mv_id} not found"}

        if not self._db:
            return {"status": "error", "error": "No DuckDB connection"}

        start = time.time()
        try:
            cursor = self._db.cursor()
            # Drop and recreate the materialized table
            try:
                cursor.execute(f'DROP TABLE IF EXISTS "{mv.target_table}"')
            except Exception:
                pass
            cursor.execute(f'CREATE TABLE "{mv.target_table}" AS {mv.sql_template}')

            # Get row count
            result = cursor.execute(f'SELECT count(*) FROM "{mv.target_table}"')
            row_count = result.fetchone()[0]
            cursor.close()

            duration_ms = int((time.time() - start) * 1000)
            status = {
                "status": "success",
                "mv_id": mv_id,
                "target_table": mv.target_table,
                "record_count": row_count,
                "duration_ms": duration_ms,
                "refreshed_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            self._status[mv_id] = status
            log.info("Refreshed MV %s: %d rows in %dms", mv_id, row_count, duration_ms)
            return status
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            status = {"status": "error", "mv_id": mv_id, "error": str(e), "duration_ms": duration_ms}
            self._status[mv_id] = status
            log.warning("MV refresh failed for %s: %s", mv_id, e)
            return status

    def refresh_all(self) -> dict[str, dict]:
        """Refresh all materialized views. Returns {mv_id: status}."""
        results = {}
        for mv in self._configs:
            results[mv.mv_id] = self.refresh(mv.mv_id)
        return results

    def refresh_by_strategy(self, strategy: str) -> dict[str, dict]:
        """Refresh only MVs matching a specific strategy (e.g., 'on_pipeline_complete')."""
        results = {}
        for mv in self._configs:
            if mv.refresh_strategy == strategy:
                results[mv.mv_id] = self.refresh(mv.mv_id)
        return results

    def get_mv_status(self) -> list[dict]:
        """Return status of all MVs (last refresh info or 'pending')."""
        result = []
        for mv in self._configs:
            status = self._status.get(mv.mv_id, {"status": "pending"})
            result.append({
                "mv_id": mv.mv_id,
                "description": mv.description,
                "source_tier": mv.source_tier,
                "source_tables": mv.source_tables,
                "refresh_strategy": mv.refresh_strategy,
                "target_table": mv.target_table,
                **status,
            })
        return result

    def register_iceberg_views(self, tier: str) -> int:
        """Register DuckDB views from Iceberg tables for a tier. Returns count registered."""
        if not self._lakehouse or not self._db:
            return 0

        count = 0
        for table_name in self._lakehouse.list_tables(tier):
            try:
                self._lakehouse.register_duckdb_view(tier, table_name, self._db.cursor())
                count += 1
            except Exception:
                log.warning("Could not register DuckDB view for %s.%s", tier, table_name)
        return count

    def _get_mv(self, mv_id: str) -> MaterializedViewConfig | None:
        for mv in self._configs:
            if mv.mv_id == mv_id:
                return mv
        return None

    def _load_configs(self) -> None:
        if not self._mv_path.exists():
            return
        with open(self._mv_path) as f:
            data = json.load(f)
        self._configs = [MaterializedViewConfig(**mv) for mv in data.get("materialized_views", [])]
