"""Tests for Alert Generation & Trace — persistence, Parquet summary, DuckDB registration."""
import json
from pathlib import Path

import pyarrow.parquet as pq
import pytest

from backend.db import DuckDBManager
from backend.engine.detection_engine import DetectionEngine
from backend.engine.settings_resolver import SettingsResolver
from backend.models.alerts import AlertTrace
from backend.services.alert_service import AlertService
from backend.services.metadata_service import MetadataService


@pytest.fixture
def workspace(tmp_path):
    """Create workspace with settings and a detection model."""
    for d in [
        "metadata/detection_models",
        "metadata/settings/score_steps",
        "metadata/settings/score_thresholds",
        "metadata/entities",
        "metadata/calculations/transaction",
        "alerts/traces",
    ]:
        (tmp_path / d).mkdir(parents=True)

    # Score steps
    (tmp_path / "metadata/settings/score_steps/large_activity_score_steps.json").write_text(
        json.dumps({
            "setting_id": "large_activity_score_steps",
            "name": "Large Activity Score Steps",
            "value_type": "score_steps",
            "default": [
                {"min_value": 0, "max_value": 10000, "score": 0},
                {"min_value": 10000, "max_value": 100000, "score": 3},
                {"min_value": 100000, "max_value": 500000, "score": 7},
                {"min_value": 500000, "max_value": None, "score": 10},
            ],
            "match_type": "hierarchy",
            "overrides": [],
        })
    )
    (tmp_path / "metadata/settings/score_steps/quantity_match_score_steps.json").write_text(
        json.dumps({
            "setting_id": "quantity_match_score_steps",
            "name": "Quantity Match Score Steps",
            "value_type": "score_steps",
            "default": [
                {"min_value": 0, "max_value": 0.5, "score": 0},
                {"min_value": 0.5, "max_value": 0.8, "score": 3},
                {"min_value": 0.8, "max_value": 0.95, "score": 7},
                {"min_value": 0.95, "max_value": None, "score": 10},
            ],
            "match_type": "hierarchy",
            "overrides": [],
        })
    )
    (tmp_path / "metadata/settings/score_steps/vwap_proximity_score_steps.json").write_text(
        json.dumps({
            "setting_id": "vwap_proximity_score_steps",
            "name": "VWAP Proximity Score Steps",
            "value_type": "score_steps",
            "default": [
                {"min_value": 0, "max_value": 0.005, "score": 10},
                {"min_value": 0.005, "max_value": 0.01, "score": 7},
                {"min_value": 0.01, "max_value": 0.02, "score": 3},
                {"min_value": 0.02, "max_value": None, "score": 0},
            ],
            "match_type": "hierarchy",
            "overrides": [],
        })
    )
    (tmp_path / "metadata/settings/score_thresholds/wash_score_threshold.json").write_text(
        json.dumps({
            "setting_id": "wash_score_threshold",
            "name": "Wash Score Threshold",
            "value_type": "decimal",
            "default": 10,
            "match_type": "hierarchy",
            "overrides": [],
        })
    )

    # Detection model
    model = {
        "model_id": "wash_full_day",
        "name": "Wash Trading Full Day",
        "description": "Detects wash trading",
        "time_window": "business_date",
        "granularity": ["product_id", "account_id"],
        "calculations": [
            {"calc_id": "large_trading_activity", "strictness": "MUST_PASS",
             "threshold_setting": None, "score_steps_setting": "large_activity_score_steps"},
            {"calc_id": "wash_qty_match", "strictness": "OPTIONAL",
             "threshold_setting": None, "score_steps_setting": "quantity_match_score_steps"},
            {"calc_id": "wash_vwap_proximity", "strictness": "OPTIONAL",
             "threshold_setting": None, "score_steps_setting": "vwap_proximity_score_steps"},
        ],
        "score_threshold_setting": "wash_score_threshold",
        "query": "SELECT product_id, account_id, business_date, total_value, qty_match_ratio, vwap_proximity, 'equity' AS asset_class FROM calc_wash_detection WHERE is_wash_candidate = TRUE",
        "alert_template": {"title": "Wash Trading Alert"},
    }
    (tmp_path / "metadata/detection_models/wash_full_day.json").write_text(json.dumps(model))

    return tmp_path


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    # Create fake calculation results
    cursor = mgr.cursor()
    cursor.execute("""
        CREATE TABLE calc_wash_detection AS
        SELECT 'AAPL' AS product_id, 'ACC001' AS account_id,
               DATE '2026-01-15' AS business_date, 50000.0 AS total_value,
               0.9 AS qty_match_ratio, 0.003 AS vwap_proximity,
               TRUE AS is_wash_candidate
        UNION ALL
        SELECT 'MSFT', 'ACC002', DATE '2026-01-15', 80000.0, 0.95, 0.001, TRUE
    """)
    cursor.close()
    yield mgr
    mgr.close()


@pytest.fixture
def alert_service(workspace, db):
    meta = MetadataService(workspace)
    resolver = SettingsResolver()
    detection = DetectionEngine(workspace, db, meta, resolver)
    return AlertService(workspace, db, detection)


class TestAlertTraceFiles:
    def test_generates_trace_json_per_alert(self, workspace, alert_service):
        """Each fired alert should produce a JSON trace file."""
        alert_service.generate_alerts("wash_full_day")
        trace_dir = workspace / "alerts" / "traces"
        trace_files = list(trace_dir.glob("*.json"))
        assert len(trace_files) == 2  # 2 candidates, both should fire

    def test_trace_file_is_valid_json(self, workspace, alert_service):
        """Trace files should be valid JSON and contain expected fields."""
        alert_service.generate_alerts("wash_full_day")
        trace_dir = workspace / "alerts" / "traces"
        trace_file = next(trace_dir.glob("*.json"))
        data = json.loads(trace_file.read_text())
        assert "alert_id" in data
        assert "model_id" in data
        assert "calculation_scores" in data
        assert "accumulated_score" in data
        assert "trigger_path" in data

    def test_trace_includes_score_breakdown(self, workspace, alert_service):
        """Trace should include per-calculation score details."""
        alert_service.generate_alerts("wash_full_day")
        trace_dir = workspace / "alerts" / "traces"
        trace_file = next(trace_dir.glob("*.json"))
        data = json.loads(trace_file.read_text())
        calc_scores = data["calculation_scores"]
        assert len(calc_scores) == 3
        for cs in calc_scores:
            assert "calc_id" in cs
            assert "score" in cs
            assert "strictness" in cs


class TestAlertSummaryParquet:
    def test_summary_parquet_created(self, workspace, alert_service):
        """Alert summary should be written to Parquet."""
        alert_service.generate_alerts("wash_full_day")
        parquet_path = workspace / "alerts" / "summary.parquet"
        assert parquet_path.exists()

    def test_summary_has_expected_columns(self, workspace, alert_service):
        """Summary Parquet should have key columns."""
        alert_service.generate_alerts("wash_full_day")
        parquet_path = workspace / "alerts" / "summary.parquet"
        table = pq.read_table(parquet_path)
        column_names = table.column_names
        assert "alert_id" in column_names
        assert "model_id" in column_names
        assert "accumulated_score" in column_names
        assert "trigger_path" in column_names
        assert "alert_fired" in column_names

    def test_summary_row_count(self, workspace, alert_service):
        """Summary should contain only fired alerts."""
        alert_service.generate_alerts("wash_full_day")
        parquet_path = workspace / "alerts" / "summary.parquet"
        table = pq.read_table(parquet_path)
        assert table.num_rows == 2


class TestAlertDuckDBRegistration:
    def test_alerts_queryable_in_duckdb(self, workspace, db, alert_service):
        """Alerts should be registered as a DuckDB table for querying."""
        alert_service.generate_alerts("wash_full_day")
        cursor = db.cursor()
        rows = cursor.execute("SELECT COUNT(*) FROM alerts_summary").fetchone()
        cursor.close()
        assert rows[0] == 2

    def test_query_alerts_by_model(self, workspace, db, alert_service):
        """Should be able to filter alerts by model_id."""
        alert_service.generate_alerts("wash_full_day")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT alert_id, accumulated_score FROM alerts_summary WHERE model_id = 'wash_full_day'"
        ).fetchall()
        cursor.close()
        assert len(rows) == 2
        assert all(r[1] >= 10 for r in rows)  # all scores >= threshold
