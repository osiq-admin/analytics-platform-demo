"""CSV → Parquet → DuckDB data loader with change detection."""
import logging
from pathlib import Path

import pyarrow as pa
import pyarrow.csv as pcsv
import pyarrow.parquet as pq

from backend.db import DuckDBManager

log = logging.getLogger(__name__)


class DataLoader:
    def __init__(self, workspace_dir: Path, db: DuckDBManager):
        self._csv_dir = workspace_dir / "data" / "csv"
        self._parquet_dir = workspace_dir / "data" / "parquet"
        self._db = db
        self._csv_mtimes: dict[str, float] = {}

    def load_all(self) -> list[str]:
        """Load all CSV files, converting to Parquet and registering in DuckDB.

        Returns list of table names that were loaded or refreshed.
        """
        if not self._csv_dir.exists():
            return []

        loaded = []
        for csv_path in sorted(self._csv_dir.glob("*.csv")):
            table_name = csv_path.stem
            if self._needs_reload(csv_path):
                self._load_csv(csv_path, table_name)
                loaded.append(table_name)

        return loaded

    def _needs_reload(self, csv_path: Path) -> bool:
        mtime = csv_path.stat().st_mtime
        prev = self._csv_mtimes.get(csv_path.name)
        if prev is None or mtime > prev:
            self._csv_mtimes[csv_path.name] = mtime
            return True
        return False

    def _load_csv(self, csv_path: Path, table_name: str) -> None:
        log.info("Loading %s from %s", table_name, csv_path.name)

        # Read CSV with PyArrow
        arrow_table = pcsv.read_csv(csv_path)

        # Write Parquet
        self._parquet_dir.mkdir(parents=True, exist_ok=True)
        parquet_path = self._parquet_dir / f"{table_name}.parquet"
        pq.write_table(arrow_table, parquet_path)

        # Register as DuckDB view
        cursor = self._db.cursor()
        cursor.execute(f"DROP VIEW IF EXISTS {table_name}")
        cursor.execute(
            f"CREATE VIEW {table_name} AS SELECT * FROM read_parquet('{parquet_path}')"
        )
        cursor.close()

        log.info("Loaded %s: %d rows, %d columns", table_name, arrow_table.num_rows, arrow_table.num_columns)
