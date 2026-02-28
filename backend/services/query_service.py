"""SQL query execution service against DuckDB."""
import logging
from typing import Any

from backend.db import DuckDBManager

log = logging.getLogger(__name__)


class QueryService:
    def __init__(self, db: DuckDBManager):
        self._db = db

    def execute(self, sql: str, limit: int = 1000) -> dict[str, Any]:
        try:
            cursor = self._db.cursor()
            cursor.execute(sql)
            columns = [desc[0] for desc in cursor.description]
            rows_raw = cursor.fetchmany(limit)
            cursor.close()
            rows = [dict(zip(columns, row)) for row in rows_raw]
            return {"columns": columns, "rows": rows, "row_count": len(rows)}
        except Exception as e:
            log.warning("Query failed: %s", e)
            return {"error": str(e)}

    def list_tables(self) -> list[dict[str, str]]:
        cursor = self._db.cursor()
        cursor.execute("""
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'main'
            ORDER BY table_name
        """)
        rows = cursor.fetchall()
        cursor.close()
        return [{"name": r[0], "type": r[1]} for r in rows]

    def get_table_schema(self, table_name: str) -> dict[str, Any]:
        cursor = self._db.cursor()
        cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '{table_name}' AND table_schema = 'main'
            ORDER BY ordinal_position
        """)  # nosec B608
        cols = cursor.fetchall()
        cursor.close()
        return {
            "table_name": table_name,
            "columns": [
                {"name": c[0], "type": c[1], "nullable": c[2] == "YES"}
                for c in cols
            ],
        }
