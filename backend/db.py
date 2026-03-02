"""DuckDB connection management with thread-safe cursor creation."""
import logging
from contextlib import asynccontextmanager
from threading import Lock

import duckdb
from fastapi import FastAPI

from backend.config import settings

log = logging.getLogger(__name__)


class DuckDBManager:
    def __init__(self):
        self._conn: duckdb.DuckDBPyConnection | None = None
        self._lock = Lock()

    def connect(self, db_path: str = ":memory:") -> None:
        self._conn = duckdb.connect(db_path, read_only=False)
        self._conn.execute("SET threads TO 4")
        self._conn.execute("SET memory_limit = '2GB'")
        self._install_iceberg_extension()

    def _install_iceberg_extension(self) -> None:
        if self._conn is None:
            return
        try:
            self._conn.execute("INSTALL iceberg")
            self._conn.execute("LOAD iceberg")
        except Exception:
            log.warning("DuckDB Iceberg extension not available — Iceberg scan disabled")

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
    from backend.services.audit_service import AuditService

    db_manager.connect(str(settings.workspace_dir / "analytics.duckdb"))

    # Make services available via app.state
    app.state.db = db_manager
    app.state.metadata = MetadataService(settings.workspace_dir)
    app.state.audit = AuditService(settings.workspace_dir)
    app.state.metadata.set_audit(app.state.audit)
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

    # Governance: masking + RBAC
    from backend.services.masking_service import MaskingService
    from backend.services.rbac_service import RBACService

    app.state.masking_service = MaskingService(settings.workspace_dir)
    app.state.rbac_service = RBACService(settings.workspace_dir)

    # Glossary + semantic layer
    from backend.services.glossary_service import GlossaryService
    from backend.services.semantic_service import SemanticLayerService

    app.state.glossary_service = GlossaryService(settings.workspace_dir)
    app.state.semantic_service = SemanticLayerService(settings.workspace_dir)

    # Lakehouse services (optional — gracefully degrade if Iceberg unavailable)
    _init_lakehouse_services(app)

    # Load CSV data into DuckDB and register alerts_summary if present
    _load_data(app)

    yield
    db_manager.close()


def _load_data(app: FastAPI) -> None:
    """Load CSV data into DuckDB and register alerts_summary if available."""
    from backend.engine.data_loader import DataLoader

    ws = settings.workspace_dir
    lakehouse = getattr(app.state, "lakehouse", None)
    loader = DataLoader(ws, db_manager, lakehouse=lakehouse)
    loaded = loader.load_all()
    if loaded:
        log.info("Loaded %d tables into DuckDB: %s", len(loaded), ", ".join(loaded))

    # Register alerts_summary from Parquet if available
    summary_path = ws / "alerts" / "summary.parquet"
    if summary_path.exists():
        try:
            cursor = db_manager.cursor()
            cursor.execute('DROP TABLE IF EXISTS "alerts_summary"')
            cursor.execute(
                f"CREATE TABLE alerts_summary AS SELECT * FROM read_parquet('{summary_path}')"  # nosec B608
            )
            cursor.close()
            log.info("Registered alerts_summary from %s", summary_path)
        except Exception:
            log.warning("Failed to register alerts_summary", exc_info=True)


def _init_lakehouse_services(app: FastAPI) -> None:
    """Initialize lakehouse services. Non-fatal — app works without Iceberg."""
    from backend.services.lakehouse_service import load_lakehouse_config
    from backend.services.governance_service import GovernanceService
    from backend.services.calc_result_service import CalcResultService
    from backend.services.run_versioning_service import RunVersioningService
    from backend.services.materialized_view_service import MaterializedViewService
    from backend.services.schema_evolution_service import SchemaEvolutionService
    from backend.services.metadata_replicator import MetadataReplicator

    ws = settings.workspace_dir
    try:
        lakehouse_config, tier_config = load_lakehouse_config(ws, settings.lakehouse_env)
        from backend.services.lakehouse_service import LakehouseService
        lakehouse = LakehouseService(ws, lakehouse_config, tier_config)
        app.state.lakehouse = lakehouse
        log.info("Lakehouse services initialized (env=%s)", settings.lakehouse_env)
    except Exception:
        log.info("Lakehouse services not available — running in Parquet-only mode")
        lakehouse = None

    app.state.governance = GovernanceService(ws, lakehouse=lakehouse)
    app.state.calc_results = CalcResultService(ws, lakehouse=lakehouse)
    app.state.run_versioning = RunVersioningService(ws, lakehouse=lakehouse)
    app.state.mvs = MaterializedViewService(ws, db=db_manager, lakehouse=lakehouse)
    app.state.schema_evolution = SchemaEvolutionService(ws, lakehouse=lakehouse)
    app.state.metadata_replicator = MetadataReplicator(ws, lakehouse=lakehouse)
