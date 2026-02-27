"""Tests for grid column metadata."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "grids").mkdir(parents=True)
    (ws / "metadata" / "grids" / "data_manager.json").write_text(json.dumps({
        "grid_id": "data_manager_tables",
        "view_id": "data_manager",
        "description": "Data Manager table list and entity-aware preview columns",
        "columns": [
            {"field": "name", "header_name": "Table", "flex": 1, "filter_type": "agTextColumnFilter"},
            {"field": "type", "header_name": "Type", "width": 90, "filter_type": "agTextColumnFilter"}
        ],
        "default_sort_field": "name",
        "default_sort_direction": "asc"
    }))
    (ws / "metadata" / "grids" / "risk_case_manager.json").write_text(json.dumps({
        "grid_id": "alert_summary",
        "view_id": "risk_case_manager",
        "description": "Alert summary grid columns and filter configuration for Risk Case Manager",
        "columns": [
            {"field": "alert_id", "header_name": "Alert ID", "min_width": 150, "flex": 1, "filter_type": "agTextColumnFilter"},
            {"field": "model_id", "header_name": "Model", "min_width": 120, "flex": 1, "filter_type": "agTextColumnFilter", "value_format": "label"},
            {"field": "product_id", "header_name": "Product", "width": 90, "filter_type": "agTextColumnFilter"},
            {"field": "account_id", "header_name": "Account", "width": 100, "filter_type": "agTextColumnFilter"},
            {"field": "accumulated_score", "header_name": "Score", "width": 80, "column_type": "numericColumn", "filter_type": "agNumberColumnFilter"},
            {"field": "score_threshold", "header_name": "Threshold", "width": 80, "column_type": "numericColumn", "filter_type": "agNumberColumnFilter"},
            {"field": "trigger_path", "header_name": "Trigger", "min_width": 100, "filter_type": "agTextColumnFilter", "value_format": "label"},
            {"field": "timestamp", "header_name": "Time", "min_width": 180, "filter_type": "agDateColumnFilter", "value_format": "timestamp"}
        ],
        "default_sort_field": "timestamp",
        "default_sort_direction": "desc"
    }))
    for d in ["entities", "calculations", "settings", "detection_models", "query_presets"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestGridColumnMetadata:
    def test_grid_endpoint_returns_columns(self, client):
        resp = client.get("/api/metadata/grids/data_manager")
        assert resp.status_code == 200
        data = resp.json()
        assert "columns" in data
        assert len(data["columns"]) >= 2

    def test_column_has_required_fields(self, client):
        resp = client.get("/api/metadata/grids/data_manager")
        for col in resp.json()["columns"]:
            assert "field" in col
            assert "header_name" in col

    def test_nonexistent_view_returns_404(self, client):
        resp = client.get("/api/metadata/grids/nonexistent_view")
        assert resp.status_code == 404

    def test_grid_config_has_metadata(self, client):
        resp = client.get("/api/metadata/grids/data_manager")
        data = resp.json()
        assert data["grid_id"] == "data_manager_tables"
        assert data["view_id"] == "data_manager"


class TestAlertFilterMetadata:
    def test_alert_filter_config_loads(self, client):
        """GET /api/metadata/grids/risk_case_manager returns 200 with columns."""
        resp = client.get("/api/metadata/grids/risk_case_manager")
        assert resp.status_code == 200
        data = resp.json()
        assert "columns" in data
        assert len(data["columns"]) == 8
        fields = [c["field"] for c in data["columns"]]
        assert "alert_id" in fields
        assert "accumulated_score" in fields
        assert "timestamp" in fields

    def test_alert_filter_columns_have_filter_types(self, client):
        """Every column in alert_summary has a filter_type."""
        resp = client.get("/api/metadata/grids/risk_case_manager")
        data = resp.json()
        for col in data["columns"]:
            assert col.get("filter_type") is not None, (
                f"Column '{col['field']}' missing filter_type"
            )

    def test_alert_filter_sort_config(self, client):
        """default_sort_field is 'timestamp', direction is 'desc'."""
        resp = client.get("/api/metadata/grids/risk_case_manager")
        data = resp.json()
        assert data["default_sort_field"] == "timestamp"
        assert data["default_sort_direction"] == "desc"
