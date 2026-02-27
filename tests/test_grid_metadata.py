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
    (ws / "metadata" / "grids" / "related_executions.json").write_text(json.dumps({
        "grid_id": "related_executions",
        "view_id": "related_executions",
        "description": "Execution columns for alert detail Related Orders panel",
        "columns": [
            {"field": "execution_id", "header_name": "Exec ID", "width": 120, "cell_style": {"fontFamily": "monospace", "fontSize": "10px"}},
            {"field": "order_id", "header_name": "Order ID", "width": 120, "cell_style": {"fontFamily": "monospace", "fontSize": "10px"}},
            {"field": "execution_date", "header_name": "Date", "width": 100, "filter_type": "agDateColumnFilter"},
            {"field": "execution_time", "header_name": "Time", "width": 80},
            {"field": "side", "header_name": "Side", "width": 70, "filter_type": "agTextColumnFilter", "value_format": "side_badge"},
            {"field": "quantity", "header_name": "Qty", "width": 70, "column_type": "numericColumn", "filter_type": "agNumberColumnFilter"},
            {"field": "price", "header_name": "Price", "width": 90, "column_type": "numericColumn", "filter_type": "agNumberColumnFilter", "value_format": "decimal_2"},
            {"field": "venue_mic", "header_name": "Venue", "width": 80, "filter_type": "agTextColumnFilter"},
            {"field": "exec_type", "header_name": "Exec Type", "width": 90, "filter_type": "agTextColumnFilter"},
            {"field": "capacity", "header_name": "Capacity", "width": 90, "filter_type": "agTextColumnFilter"},
            {"field": "product_id", "header_name": "Product", "width": 80},
            {"field": "account_id", "header_name": "Account", "width": 90}
        ],
        "default_sort_field": "execution_date",
        "default_sort_direction": "desc"
    }))
    (ws / "metadata" / "grids" / "related_orders.json").write_text(json.dumps({
        "grid_id": "related_orders",
        "view_id": "related_orders",
        "description": "Order columns for alert detail Related Orders panel",
        "columns": [
            {"field": "order_id", "header_name": "Order ID", "width": 120, "cell_style": {"fontFamily": "monospace", "fontSize": "10px"}},
            {"field": "order_date", "header_name": "Date", "width": 100, "filter_type": "agDateColumnFilter"},
            {"field": "order_time", "header_name": "Time", "width": 80},
            {"field": "side", "header_name": "Side", "width": 70, "filter_type": "agTextColumnFilter", "value_format": "side_badge"},
            {"field": "quantity", "header_name": "Qty", "width": 70, "column_type": "numericColumn", "filter_type": "agNumberColumnFilter"},
            {"field": "order_type", "header_name": "Type", "width": 80, "filter_type": "agTextColumnFilter"},
            {"field": "limit_price", "header_name": "Limit Price", "width": 100, "column_type": "numericColumn", "filter_type": "agNumberColumnFilter", "value_format": "decimal_2"},
            {"field": "time_in_force", "header_name": "TIF", "width": 70, "filter_type": "agTextColumnFilter"},
            {"field": "trader_id", "header_name": "Trader", "width": 100, "filter_type": "agTextColumnFilter"},
            {"field": "product_id", "header_name": "Product", "width": 80},
            {"field": "account_id", "header_name": "Account", "width": 90}
        ],
        "default_sort_field": "order_date",
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


class TestRelatedOrdersGridMetadata:
    """Tests for related_executions and related_orders grid configs (M161)."""

    def test_related_executions_config_loads(self, client):
        """GET /api/metadata/grids/related_executions returns 200 with 12 columns."""
        resp = client.get("/api/metadata/grids/related_executions")
        assert resp.status_code == 200
        data = resp.json()
        assert "columns" in data
        assert len(data["columns"]) == 12
        fields = [c["field"] for c in data["columns"]]
        assert "execution_id" in fields
        assert "order_id" in fields
        assert "side" in fields
        assert "quantity" in fields
        assert "price" in fields
        assert "venue_mic" in fields

    def test_related_executions_column_types(self, client):
        """Numeric columns have column_type set."""
        resp = client.get("/api/metadata/grids/related_executions")
        data = resp.json()
        cols_by_field = {c["field"]: c for c in data["columns"]}
        assert cols_by_field["quantity"].get("column_type") == "numericColumn"
        assert cols_by_field["price"].get("column_type") == "numericColumn"

    def test_related_executions_sort_config(self, client):
        """Default sort by execution_date descending."""
        resp = client.get("/api/metadata/grids/related_executions")
        data = resp.json()
        assert data["default_sort_field"] == "execution_date"
        assert data["default_sort_direction"] == "desc"

    def test_related_orders_config_loads(self, client):
        """GET /api/metadata/grids/related_orders returns 200 with 11 columns."""
        resp = client.get("/api/metadata/grids/related_orders")
        assert resp.status_code == 200
        data = resp.json()
        assert "columns" in data
        assert len(data["columns"]) == 11
        fields = [c["field"] for c in data["columns"]]
        assert "order_id" in fields
        assert "side" in fields
        assert "order_type" in fields
        assert "limit_price" in fields
        assert "trader_id" in fields

    def test_related_orders_column_types(self, client):
        """Numeric columns have column_type set."""
        resp = client.get("/api/metadata/grids/related_orders")
        data = resp.json()
        cols_by_field = {c["field"]: c for c in data["columns"]}
        assert cols_by_field["quantity"].get("column_type") == "numericColumn"
        assert cols_by_field["limit_price"].get("column_type") == "numericColumn"

    def test_related_orders_sort_config(self, client):
        """Default sort by order_date descending."""
        resp = client.get("/api/metadata/grids/related_orders")
        data = resp.json()
        assert data["default_sort_field"] == "order_date"
        assert data["default_sort_direction"] == "desc"

    def test_related_executions_side_has_value_format(self, client):
        """Side column has value_format for badge rendering."""
        resp = client.get("/api/metadata/grids/related_executions")
        data = resp.json()
        side_col = next(c for c in data["columns"] if c["field"] == "side")
        assert side_col.get("value_format") == "side_badge"

    def test_related_orders_side_has_value_format(self, client):
        """Side column has value_format for badge rendering."""
        resp = client.get("/api/metadata/grids/related_orders")
        data = resp.json()
        side_col = next(c for c in data["columns"] if c["field"] == "side")
        assert side_col.get("value_format") == "side_badge"


class TestMarketDataConfigInDetectionModels:
    """Tests for market_data_config in detection model metadata (M161)."""

    def test_market_data_config_in_detection_model(self):
        """Load a detection model JSON, verify market_data_config exists with expected fields."""
        import json
        from pathlib import Path
        model_path = Path("workspace/metadata/detection_models/wash_full_day.json")
        data = json.loads(model_path.read_text())
        assert "market_data_config" in data
        mdc = data["market_data_config"]
        assert "chart_type" in mdc
        assert "time_field" in mdc
        assert "price_fields" in mdc
        assert "volume_field" in mdc

    def test_all_five_models_have_market_data_config(self):
        """All 5 detection models include market_data_config."""
        import json
        from pathlib import Path
        model_dir = Path("workspace/metadata/detection_models")
        model_files = sorted(model_dir.glob("*.json"))
        assert len(model_files) == 5, f"Expected 5 models, found {len(model_files)}"
        for f in model_files:
            data = json.loads(f.read_text())
            assert "market_data_config" in data, (
                f"Model {f.name} missing market_data_config"
            )
            mdc = data["market_data_config"]
            assert "chart_type" in mdc, f"Model {f.name} missing chart_type"
            assert "price_fields" in mdc, f"Model {f.name} missing price_fields"

    def test_market_data_config_pydantic_model(self):
        """DetectionModelDefinition accepts market_data_config field."""
        from backend.models.detection import DetectionModelDefinition
        model = DetectionModelDefinition(
            model_id="test",
            name="Test Model",
            time_window="business_date",
            granularity=["product_id"],
            score_threshold_setting="test_threshold",
            market_data_config={
                "chart_type": "candlestick",
                "time_field": "timestamp",
                "price_fields": {"open": "open", "high": "high", "low": "low", "close": "close"},
                "volume_field": "volume",
            },
        )
        assert model.market_data_config is not None
        assert model.market_data_config["chart_type"] == "candlestick"
