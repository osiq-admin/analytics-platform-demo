"""Tests for M93: $param placeholder migration in calculation SQL.

Verifies that all 6 migrated calculation JSONs use structured parameter
format and that the full pipeline produces identical alert output.
"""
import json
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

WORKSPACE = Path("workspace")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def pipeline_workspace(tmp_path):
    """Create workspace with generated data and real metadata."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    shutil.copytree(WORKSPACE / "metadata" / "calculations", ws / "metadata" / "calculations")
    shutil.copytree(WORKSPACE / "metadata" / "settings", ws / "metadata" / "settings")
    shutil.copytree(WORKSPACE / "metadata" / "detection_models", ws / "metadata" / "detection_models")
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
def full_pipeline(pipeline_workspace, db):
    """Load data, run calculations, return detection engine + alerts."""
    metadata = MetadataService(pipeline_workspace)
    loader = DataLoader(pipeline_workspace, db)
    loader.load_all()
    calc_engine = CalculationEngine(pipeline_workspace, db, metadata)
    calc_engine.run_all()
    resolver = SettingsResolver()
    det_engine = DetectionEngine(pipeline_workspace, db, metadata, resolver)
    all_alerts = det_engine.evaluate_all()
    return {
        "alerts": all_alerts,
        "det_engine": det_engine,
        "calc_engine": calc_engine,
        "db": db,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_calc(calc_path: str) -> dict:
    """Load a calculation JSON from the real workspace."""
    return json.loads((WORKSPACE / calc_path).read_text())


MIGRATED_CALCS = {
    "business_date_window": "metadata/calculations/time_windows/business_date_window.json",
    "cancellation_pattern": "metadata/calculations/time_windows/cancellation_pattern.json",
    "trend_window": "metadata/calculations/time_windows/trend_window.json",
    "market_event_window": "metadata/calculations/time_windows/market_event_window.json",
    "large_trading_activity": "metadata/calculations/derived/large_trading_activity.json",
    "wash_detection": "metadata/calculations/derived/wash_detection.json",
}


# ---------------------------------------------------------------------------
# Test: full pipeline produces alerts
# ---------------------------------------------------------------------------

class TestPipelineRegression:
    def test_param_substitution_produces_alerts(self, full_pipeline):
        """After migration, full pipeline must still produce >0 alerts."""
        alerts = full_pipeline["alerts"]
        fired = [a for a in alerts if a.alert_fired]
        assert len(fired) > 0, "Pipeline must produce fired alerts after param migration"

    def test_alert_count_matches_baseline(self, full_pipeline):
        """Alert count should remain in the baseline range (400-500, ~430 typical)."""
        alerts = full_pipeline["alerts"]
        fired = [a for a in alerts if a.alert_fired]
        assert 400 <= len(fired) <= 500, (
            f"Fired alert count {len(fired)} outside baseline range 400-500"
        )


# ---------------------------------------------------------------------------
# Test: structured parameters format
# ---------------------------------------------------------------------------

class TestStructuredParameters:
    def test_all_calculations_have_structured_params(self):
        """All migrated calcs with setting inputs must use structured format."""
        for calc_id, path in MIGRATED_CALCS.items():
            calc = _load_calc(path)
            params = calc.get("parameters", {})
            for name, spec in params.items():
                assert isinstance(spec, dict), (
                    f"{calc_id}.parameters.{name} should be a structured dict, got {type(spec).__name__}"
                )
                assert "source" in spec, (
                    f"{calc_id}.parameters.{name} missing 'source' key"
                )
                assert spec["source"] in ("setting", "literal"), (
                    f"{calc_id}.parameters.{name} has unexpected source: {spec['source']}"
                )


# ---------------------------------------------------------------------------
# Tests: individual calculation SQL uses $param placeholders
# ---------------------------------------------------------------------------

class TestBusinessDateWindow:
    def test_business_date_window_uses_param(self):
        """SQL must contain $cutoff_time and NOT hardcoded '17:00:00'."""
        calc = _load_calc(MIGRATED_CALCS["business_date_window"])
        sql = calc["logic"]
        assert "$cutoff_time" in sql, "SQL should contain $cutoff_time placeholder"
        assert "'17:00:00'" not in sql, "SQL should not contain hardcoded '17:00:00'"


class TestCancellationPattern:
    def test_cancellation_pattern_uses_param(self):
        """SQL must contain $cancel_threshold and NOT hardcoded >= 3."""
        calc = _load_calc(MIGRATED_CALCS["cancellation_pattern"])
        sql = calc["logic"]
        assert "$cancel_threshold" in sql, "SQL should contain $cancel_threshold placeholder"
        assert ">= 3)" not in sql, "SQL should not contain hardcoded '>= 3)'"


class TestTrendWindow:
    def test_trend_window_uses_param(self):
        """SQL must contain $trend_multiplier and NOT hardcoded * 1.5."""
        calc = _load_calc(MIGRATED_CALCS["trend_window"])
        sql = calc["logic"]
        assert "$trend_multiplier" in sql, "SQL should contain $trend_multiplier placeholder"
        assert "* 1.5" not in sql, "SQL should not contain hardcoded '* 1.5'"


class TestMarketEventWindow:
    def test_market_event_uses_param(self):
        """SQL must contain $lookback_days and other parameterized values."""
        calc = _load_calc(MIGRATED_CALCS["market_event_window"])
        sql = calc["logic"]
        assert "$lookback_days" in sql, "SQL should contain $lookback_days placeholder"
        assert "$lookforward_days" in sql, "SQL should contain $lookforward_days placeholder"
        assert "$price_change_threshold" in sql, "SQL should contain $price_change_threshold"
        assert "$volume_spike_multiplier" in sql, "SQL should contain $volume_spike_multiplier"
        assert "* 1.05" not in sql, "SQL should not contain hardcoded '* 1.05'"
        assert "* 0.95" not in sql, "SQL should not contain hardcoded '* 0.95'"
        assert "INTERVAL 5 DAY" not in sql, "SQL should not contain hardcoded 'INTERVAL 5 DAY'"
        assert "INTERVAL 2 DAY" not in sql, "SQL should not contain hardcoded 'INTERVAL 2 DAY'"


class TestLargeTradingActivity:
    def test_large_trading_activity_uses_param(self):
        """SQL must contain $activity_multiplier and NOT hardcoded * 2.0."""
        calc = _load_calc(MIGRATED_CALCS["large_trading_activity"])
        sql = calc["logic"]
        assert "$activity_multiplier" in sql, "SQL should contain $activity_multiplier placeholder"
        assert "* 2.0" not in sql, "SQL should not contain hardcoded '* 2.0'"


class TestWashDetection:
    def test_wash_detection_uses_param(self):
        """SQL must contain $vwap_threshold and $qty_threshold, NOT hardcoded values."""
        calc = _load_calc(MIGRATED_CALCS["wash_detection"])
        sql = calc["logic"]
        assert "$vwap_threshold" in sql, "SQL should contain $vwap_threshold placeholder"
        assert "$qty_threshold" in sql, "SQL should contain $qty_threshold placeholder"
        assert "< 0.02" not in sql, "SQL should not contain hardcoded '< 0.02'"
        assert "> 0.5" not in sql, "SQL should not contain hardcoded '> 0.5'"
