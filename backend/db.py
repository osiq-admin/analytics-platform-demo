"""DuckDB connection management with thread-safe cursor creation."""
from contextlib import asynccontextmanager
from threading import Lock

import duckdb
from fastapi import FastAPI

from backend.config import settings


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
    from backend.services.metadata_service import MetadataService
    from backend.engine.settings_resolver import SettingsResolver
    from backend.engine.detection_engine import DetectionEngine
    from backend.services.alert_service import AlertService
    from backend.services.validation_service import ValidationService
    from backend.services.recommendation_service import RecommendationService
    from backend.services.version_service import VersionService

    db_manager.connect(str(settings.workspace_dir / "analytics.duckdb"))

    # Make services available via app.state
    app.state.db = db_manager
    app.state.metadata = MetadataService(settings.workspace_dir)
    app.state.resolver = SettingsResolver()
    app.state.detection = DetectionEngine(
        settings.workspace_dir, db_manager, app.state.metadata, app.state.resolver
    )
    app.state.alerts = AlertService(
        settings.workspace_dir, db_manager, app.state.detection
    )
    app.state.validation = ValidationService(
        settings.workspace_dir, db_manager, app.state.metadata
    )
    app.state.recommendations = RecommendationService(
        settings.workspace_dir, app.state.metadata
    )
    app.state.versions = VersionService(settings.workspace_dir, app.state.metadata)

    yield
    db_manager.close()
