"""Tests for Trace API — explainability drill-down endpoints."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.db import DuckDBManager
from backend.engine.settings_resolver import SettingsResolver
from backend.main import app
from backend.services.metadata_service import MetadataService


@pytest.fixture
def trace_workspace(tmp_path):
    """Create a workspace with alert trace files and settings metadata."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    # Create alert traces directory
    traces_dir = ws / "alerts" / "traces"
    traces_dir.mkdir(parents=True)

    # Create a sample alert trace file
    trace_data = {
        "alert_id": "ALT-001",
        "model_id": "wash_full_day",
        "model_name": "Wash Trading Full Day",
        "timestamp": "2026-01-15T10:30:00Z",
        "alert_fired": True,
        "trigger_path": "score_threshold",
        "accumulated_score": 17,
        "score_threshold": 10,
        "executed_sql": "SELECT product_id, account_id FROM calc_wash_detection",
        "sql_row_count": 5,
        "entity_context": {
            "product_id": "AAPL",
            "account_id": "ACC001",
            "business_date": "2026-01-15",
        },
        "entity_context_source": {
            "product_id": "execution",
            "account_id": "account",
        },
        "calculation_scores": [
            {
                "calc_id": "large_trading_activity",
                "score": 7,
                "strictness": "MUST_PASS",
                "computed_value": 150000,
                "threshold_passed": True,
            },
            {
                "calc_id": "wash_qty_match",
                "score": 7,
                "strictness": "OPTIONAL",
                "computed_value": 0.85,
                "threshold_passed": True,
            },
            {
                "calc_id": "wash_vwap_proximity",
                "score": 3,
                "strictness": "OPTIONAL",
                "computed_value": 0.008,
                "threshold_passed": True,
            },
        ],
        "calculation_traces": [
            {
                "calc_id": "large_trading_activity",
                "computed_value": 150000,
                "score_awarded": 7,
                "passed": True,
            },
            {
                "calc_id": "wash_qty_match",
                "computed_value": 0.85,
                "score_awarded": 7,
                "passed": True,
            },
        ],
        "scoring_breakdown": [
            {"label": "Large Trading", "score": 7, "weight": 1.0},
            {"label": "Qty Match", "score": 7, "weight": 1.0},
            {"label": "VWAP Proximity", "score": 3, "weight": 1.0},
        ],
        "resolved_settings": {
            "wash_score_threshold": 10,
        },
        "settings_trace": [
            {
                "setting_id": "wash_score_threshold",
                "resolved_value": 10,
                "why": "default",
            }
        ],
        "calculation_trace": {
            "large_trading_activity": {"value": 150000, "score": 7},
        },
    }
    (traces_dir / "ALT-001.json").write_text(json.dumps(trace_data, indent=2))

    # Create a second trace for calc search testing
    trace_data_2 = {
        "alert_id": "ALT-002",
        "model_id": "wash_full_day",
        "model_name": "Wash Trading Full Day",
        "timestamp": "2026-01-15T11:00:00Z",
        "alert_fired": False,
        "trigger_path": "score_threshold",
        "accumulated_score": 3,
        "score_threshold": 10,
        "entity_context": {
            "product_id": "MSFT",
            "account_id": "ACC002",
            "business_date": "2026-01-15",
        },
        "calculation_scores": [
            {
                "calc_id": "large_trading_activity",
                "score": 3,
                "strictness": "MUST_PASS",
                "computed_value": 50000,
                "threshold_passed": True,
            },
        ],
        "calculation_traces": [
            {
                "calc_id": "large_trading_activity",
                "computed_value": 50000,
                "score_awarded": 3,
                "passed": True,
            },
        ],
    }
    (traces_dir / "ALT-002.json").write_text(json.dumps(trace_data_2, indent=2))

    # Create settings metadata
    settings_dir = ws / "metadata" / "settings" / "score_thresholds"
    settings_dir.mkdir(parents=True)
    setting_data = {
        "setting_id": "wash_score_threshold",
        "name": "Wash Score Threshold",
        "value_type": "decimal",
        "default": 10,
        "match_type": "hierarchy",
        "overrides": [
            {
                "match": {"asset_class": "equity"},
                "value": 8,
                "priority": 10,
            },
            {
                "match": {"asset_class": "fx"},
                "value": 15,
                "priority": 10,
            },
        ],
    }
    (settings_dir / "wash_score_threshold.json").write_text(
        json.dumps(setting_data, indent=2)
    )

    # Create entities dir (required by MetadataService)
    (ws / "metadata" / "entities").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "calculations").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "detection_models").mkdir(parents=True, exist_ok=True)

    return ws


@pytest.fixture
def trace_client(trace_workspace, monkeypatch):
    """Create a test client with the trace workspace."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", trace_workspace)

    db = DuckDBManager()
    db.connect(":memory:")
    app.state.db = db
    app.state.metadata = MetadataService(trace_workspace)
    app.state.resolver = SettingsResolver()

    try:
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc
    finally:
        db.close()


class TestAlertTraceEndpoint:
    def test_get_alert_trace_not_found(self, trace_client):
        """GET /api/trace/alert/{id} returns 404 for missing alert."""
        resp = trace_client.get("/api/trace/alert/NONEXISTENT")
        assert resp.status_code == 404
        assert resp.json()["error"] == "Alert trace not found"

    def test_get_alert_trace_full(self, trace_client):
        """GET /api/trace/alert/{id} returns full trace for existing alert."""
        resp = trace_client.get("/api/trace/alert/ALT-001")
        assert resp.status_code == 200
        data = resp.json()

        # Core fields
        assert data["alert_id"] == "ALT-001"
        assert data["model_id"] == "wash_full_day"
        assert data["model_name"] == "Wash Trading Full Day"
        assert data["alert_fired"] is True
        assert data["accumulated_score"] == 17
        assert data["score_threshold"] == 10
        assert data["trigger_path"] == "score_threshold"

        # Explainability fields
        assert "SELECT" in data["executed_sql"]
        assert data["sql_row_count"] == 5
        assert data["entity_context"]["product_id"] == "AAPL"
        assert len(data["calculation_scores"]) == 3
        assert len(data["calculation_traces"]) == 2
        assert len(data["scoring_breakdown"]) == 3
        assert data["resolved_settings"]["wash_score_threshold"] == 10
        assert len(data["settings_trace"]) == 1


class TestCalculationTraceEndpoint:
    def test_get_calculation_trace(self, trace_client):
        """GET /api/trace/calculation/{calc_id} returns traces across alerts."""
        resp = trace_client.get("/api/trace/calculation/large_trading_activity")
        assert resp.status_code == 200
        data = resp.json()

        assert data["calc_id"] == "large_trading_activity"
        assert data["count"] == 2  # Found in both ALT-001 and ALT-002
        assert len(data["traces"]) == 2

        # Check trace structure
        trace_entry = data["traces"][0]
        assert "alert_id" in trace_entry
        assert "model_id" in trace_entry
        assert "entity_context" in trace_entry
        assert "calculation_trace" in trace_entry

    def test_get_calculation_trace_no_results(self, trace_client):
        """GET /api/trace/calculation/{calc_id} returns empty for unknown calc."""
        resp = trace_client.get("/api/trace/calculation/nonexistent_calc")
        assert resp.status_code == 200
        data = resp.json()
        assert data["calc_id"] == "nonexistent_calc"
        assert data["count"] == 0
        assert data["traces"] == []

    def test_get_calculation_trace_filter_by_product(self, trace_client):
        """GET /api/trace/calculation/{calc_id}?product_id=X filters by product."""
        resp = trace_client.get(
            "/api/trace/calculation/large_trading_activity?product_id=AAPL"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1
        assert data["traces"][0]["entity_context"]["product_id"] == "AAPL"


class TestSettingsTraceEndpoint:
    def test_get_settings_trace(self, trace_client):
        """GET /api/trace/settings/{setting_id} returns setting details."""
        resp = trace_client.get("/api/trace/settings/wash_score_threshold")
        assert resp.status_code == 200
        data = resp.json()

        assert data["setting_id"] == "wash_score_threshold"
        assert data["name"] == "Wash Score Threshold"
        assert data["value_type"] == "decimal"
        assert data["default"] == 10
        assert data["num_overrides"] == 2
        assert len(data["overrides"]) == 2

    def test_get_settings_trace_not_found(self, trace_client):
        """GET /api/trace/settings/{setting_id} returns 404 for missing setting."""
        resp = trace_client.get("/api/trace/settings/nonexistent_setting")
        assert resp.status_code == 404
        assert resp.json()["error"] == "Setting not found"

    def test_resolve_settings_trace(self, trace_client):
        """POST /api/trace/settings/{setting_id}/resolve resolves with context."""
        resp = trace_client.post(
            "/api/trace/settings/wash_score_threshold/resolve",
            json={"context": {"asset_class": "equity"}},
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["setting_id"] == "wash_score_threshold"
        assert data["resolved_value"] == 8  # equity override value
        assert data["matched_override"] is not None
        assert data["matched_override"]["match"]["asset_class"] == "equity"
        assert data["default_value"] == 10
        assert data["context_provided"]["asset_class"] == "equity"
        assert len(data["override_evaluations"]) == 2

        # Check that one override matched and one didn't
        matched = [e for e in data["override_evaluations"] if e["context_matched"]]
        not_matched = [
            e for e in data["override_evaluations"] if not e["context_matched"]
        ]
        assert len(matched) == 1
        assert len(not_matched) == 1
        assert matched[0]["is_selected"] is True

    def test_resolve_settings_trace_default(self, trace_client):
        """POST /api/trace/settings/{setting_id}/resolve falls back to default."""
        resp = trace_client.post(
            "/api/trace/settings/wash_score_threshold/resolve",
            json={"context": {"asset_class": "crypto"}},
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["resolved_value"] == 10  # default
        assert data["matched_override"] is None
        assert "default" in data["why"].lower()

    def test_resolve_settings_trace_not_found(self, trace_client):
        """POST /api/trace/settings/{setting_id}/resolve returns 404 for missing."""
        resp = trace_client.post(
            "/api/trace/settings/nonexistent/resolve",
            json={"context": {}},
        )
        assert resp.status_code == 404
