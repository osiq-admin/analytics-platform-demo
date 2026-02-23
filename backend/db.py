"""DuckDB connection management with thread-safe cursor creation."""
from contextlib import asynccontextmanager
from threading import Lock

import duckdb
from fastapi import FastAPI


class DuckDBManager:
    def __init__(self):
        self._conn: duckdb.DuckDBPyConnection | None = None
        self._lock = Lock()

    def connect(self, db_path: str = ":memory:") -> None:
        self._conn = duckdb.connect(db_path, read_only=False)
        self._conn.execute("SET threads TO 4")
        self._conn.execute("SET memory_limit = '2GB'")

    def cursor(self) -> duckdb.DuckDBPyConnection:
        if self._conn is None:
            raise RuntimeError("DuckDB not connected")
        with self._lock:
            return self._conn.cursor()

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


db_manager = DuckDBManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_manager.connect("workspace/analytics.duckdb")
    yield
    db_manager.close()
