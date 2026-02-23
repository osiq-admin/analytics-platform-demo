"""Integration test: generated data → data loader → calculation engine → detection engine → alerts."""
import shutil
from pathlib import Path

import pytest

from backend.db import DuckDBManager
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.data_loader import DataLoader
from backend.engine.detection_engine import DetectionEngine
from backend.engine.settings_resolver import SettingsResolver
from backend.services.metadata_service import MetadataService
from scripts.generate_data import SyntheticDataGenerator


@pytest.fixture
def pipeline_workspace(tmp_path):
    """Create workspace with generated data and copy metadata from real workspace."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    # Copy metadata from real workspace (calculations, settings, detection_models)
    real_ws = Path("workspace")
    shutil.copytree(real_ws / "metadata" / "calculations", ws / "metadata" / "calculations")
    shutil.copytree(real_ws / "metadata" / "settings", ws / "metadata" / "settings")
    shutil.copytree(real_ws / "metadata" / "detection_models", ws / "metadata" / "detection_models")

    # Generate data
    gen = SyntheticDataGenerator(ws, seed=42)
    gen.generate_all()

    return ws


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    yield mgr
    mgr.close()


@pytest.fixture
def loaded_pipeline(pipeline_workspace, db):
    """Load data and return all components."""
    metadata = MetadataService(pipeline_workspace)
    loader = DataLoader(pipeline_workspace, db)
    loaded = loader.load_all()

    calc_engine = CalculationEngine(pipeline_workspace, db, metadata)
    resolver = SettingsResolver()
    det_engine = DetectionEngine(pipeline_workspace, db, metadata, resolver)

    return {
        "workspace": pipeline_workspace,
        "db": db,
        "metadata": metadata,
        "loader_tables": loaded,
        "calc_engine": calc_engine,
        "det_engine": det_engine,
    }


class TestDataLoading:
    def test_loads_all_csv_tables(self, loaded_pipeline):
        tables = loaded_pipeline["loader_tables"]
        assert "execution" in tables
        assert "order" in tables
        assert "md_intraday" in tables
        assert "md_eod" in tables

    def test_execution_queryable(self, loaded_pipeline):
        db = loaded_pipeline["db"]
        cursor = db.cursor()
        result = cursor.execute("SELECT COUNT(*) FROM execution").fetchone()
        cursor.close()
        assert result[0] > 400


class TestCalculationPipeline:
    def test_all_calculations_run(self, loaded_pipeline):
        engine = loaded_pipeline["calc_engine"]
        results = engine.run_all()
        assert len(results) > 0

        # Verify key calculation tables were created
        calc_names = list(results.keys())
        assert "value_calc" in calc_names
        assert "adjusted_direction" in calc_names
        assert "business_date_window" in calc_names
        assert "trading_activity_aggregation" in calc_names
        assert "vwap_calc" in calc_names
        assert "large_trading_activity" in calc_names
        assert "wash_detection" in calc_names

    def test_wash_candidates_detected(self, loaded_pipeline):
        engine = loaded_pipeline["calc_engine"]
        engine.run_all()

        db = loaded_pipeline["db"]
        cursor = db.cursor()
        result = cursor.execute(
            "SELECT COUNT(*) FROM calc_wash_detection WHERE is_wash_candidate = TRUE"
        ).fetchone()
        cursor.close()
        assert result[0] > 0, "Should detect wash trading candidates"


class TestDetectionPipeline:
    def test_wash_alerts_generated(self, loaded_pipeline):
        calc_engine = loaded_pipeline["calc_engine"]
        calc_engine.run_all()

        det_engine = loaded_pipeline["det_engine"]
        alerts = det_engine.evaluate_model("wash_full_day")

        fired = [a for a in alerts if a.alert_fired]
        assert len(fired) > 0, "Wash trading alerts should fire"

    def test_all_models_evaluated(self, loaded_pipeline):
        calc_engine = loaded_pipeline["calc_engine"]
        calc_engine.run_all()

        det_engine = loaded_pipeline["det_engine"]
        all_alerts = det_engine.evaluate_all()
        assert len(all_alerts) > 0, "Should generate some alert traces"

        # Check that at least some alerts fired
        fired = [a for a in all_alerts if a.alert_fired]
        assert len(fired) > 0, "At least some alerts should fire"

        # Verify we have alerts from multiple models
        model_ids = {a.model_id for a in fired}
        assert len(model_ids) >= 2, f"Fired alerts from only {model_ids}, expected >= 2 models"
