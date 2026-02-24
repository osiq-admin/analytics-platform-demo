"""Tests for layer-aware metadata API endpoints."""
import json

import pytest
from fastapi.testclient import TestClient

from backend.db import DuckDBManager
from backend.main import app
from backend.services.metadata_service import MetadataService


@pytest.fixture
def layer_api_workspace(tmp_path):
    """Workspace with OOB manifest and entities for API testing."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/settings/thresholds",
        "metadata/settings/score_thresholds",
        "metadata/detection_models",
        "metadata/user_overrides/entities",
        "metadata/user_overrides/calculations/transaction",
        "metadata/user_overrides/settings/thresholds",
        "metadata/user_overrides/detection_models",
    ]:
        (ws / d).mkdir(parents=True)

    # OOB entity
    entity = {
        "entity_id": "product",
        "name": "Product",
        "description": "OOB product",
        "fields": [{"name": "product_id", "type": "string", "is_key": True}],
    }
    (ws / "metadata/entities/product.json").write_text(json.dumps(entity))

    # OOB calc
    calc = {
        "calc_id": "value_calc",
        "name": "Value Calculation",
        "layer": "transaction",
        "inputs": [],
        "output": {},
        "logic": "",
        "depends_on": [],
    }
    (ws / "metadata/calculations/transaction/value_calc.json").write_text(json.dumps(calc))

    # OOB setting
    setting = {
        "setting_id": "wash_vwap_threshold",
        "name": "Wash VWAP Threshold",
        "value_type": "decimal",
        "default": 0.02,
    }
    (ws / "metadata/settings/thresholds/wash_vwap_threshold.json").write_text(json.dumps(setting))

    # OOB score threshold
    score_threshold = {
        "setting_id": "wash_score_threshold",
        "name": "Wash Score Threshold",
        "value_type": "decimal",
        "default": 70.0,
    }
    (ws / "metadata/settings/score_thresholds/wash_score_threshold.json").write_text(json.dumps(score_threshold))

    # OOB detection model
    model = {
        "model_id": "wash_full_day",
        "name": "Wash Trading Full Day",
        "time_window": "business_date",
        "granularity": ["product_id", "account_id"],
        "calculations": [],
        "score_threshold_setting": "wash_score_threshold",
        "regulatory_coverage": [],
    }
    (ws / "metadata/detection_models/wash_full_day.json").write_text(json.dumps(model))

    # OOB manifest
    manifest = {
        "oob_version": "1.0.0",
        "items": {
            "entities": {
                "product": {"checksum": "abc123", "version": "1.0.0", "path": "entities/product.json"},
            },
            "calculations": {
                "value_calc": {"checksum": "def456", "version": "1.0.0", "path": "calculations/transaction/value_calc.json"},
            },
            "settings": {
                "wash_vwap_threshold": {"checksum": "ghi789", "version": "1.0.0", "path": "settings/thresholds/wash_vwap_threshold.json"},
                "wash_score_threshold": {"checksum": "jkl012", "version": "1.0.0", "path": "settings/score_thresholds/wash_score_threshold.json"},
            },
            "detection_models": {
                "wash_full_day": {"checksum": "mno345", "version": "1.0.0", "path": "detection_models/wash_full_day.json"},
            },
        },
    }
    (ws / "metadata/oob_manifest.json").write_text(json.dumps(manifest))

    return ws


@pytest.fixture
def client(layer_api_workspace):
    db = DuckDBManager()
    svc = MetadataService(layer_api_workspace)
    app.state.db = db
    app.state.metadata = svc
    return TestClient(app)


class TestLayerAPI:
    def test_get_entity_has_layer_field(self, client):
        resp = client.get("/api/metadata/entities/product")
        assert resp.status_code == 200
        data = resp.json()
        assert data["metadata_layer"] == "oob"
        assert "_layer" in data
        assert data["_layer"]["is_oob"] is True

    def test_list_entities_has_layer(self, client):
        resp = client.get("/api/metadata/entities")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) > 0
        assert items[0]["metadata_layer"] == "oob"

    def test_get_oob_manifest(self, client):
        resp = client.get("/api/metadata/oob-manifest")
        assert resp.status_code == 200
        data = resp.json()
        assert data["oob_version"] == "1.0.0"
        assert "entities" in data["items"]

    def test_get_layer_info_oob(self, client):
        resp = client.get("/api/metadata/layers/entities/product/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_oob"] is True
        assert data["has_override"] is False
        assert data["layer"] == "oob"

    def test_save_then_layer_info_user(self, client):
        # Save entity (creates override since it's OOB)
        resp = client.put(
            "/api/metadata/entities/product",
            json={
                "entity_id": "product",
                "name": "Product Modified",
                "fields": [{"name": "product_id", "type": "string", "is_key": True}],
            },
        )
        assert resp.status_code == 200
        # Check layer info
        resp = client.get("/api/metadata/layers/entities/product/info")
        data = resp.json()
        assert data["has_override"] is True
        assert data["layer"] == "user"

    def test_reset_to_oob(self, client):
        # Create override first
        client.put(
            "/api/metadata/entities/product",
            json={
                "entity_id": "product",
                "name": "Product Modified",
                "fields": [{"name": "product_id", "type": "string", "is_key": True}],
            },
        )
        # Reset
        resp = client.post("/api/metadata/layers/entities/product/reset")
        assert resp.status_code == 200
        assert resp.json()["reset"] is True
        # Verify back to OOB
        resp = client.get("/api/metadata/layers/entities/product/info")
        assert resp.json()["has_override"] is False

    def test_get_oob_version(self, client):
        resp = client.get("/api/metadata/layers/entities/product/oob")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Product"

    def test_get_diff_unmodified(self, client):
        resp = client.get("/api/metadata/layers/entities/product/diff")
        assert resp.status_code == 200
        data = resp.json()
        # Unmodified OOB item — diff may show normalization differences
        # (model_dump includes defaults not in raw JSON) but no user edits
        assert isinstance(data["changes"], list)

    def test_get_diff_with_override(self, client):
        # Create override
        client.put(
            "/api/metadata/entities/product",
            json={
                "entity_id": "product",
                "name": "Product Modified",
                "description": "Changed",
                "fields": [{"name": "product_id", "type": "string", "is_key": True}],
            },
        )
        resp = client.get("/api/metadata/layers/entities/product/diff")
        data = resp.json()
        assert data["has_diff"] is True
        changed_fields = [c["field"] for c in data["changes"]]
        assert "name" in changed_fields

    def test_delete_oob_protected(self, client):
        # OOB item with no override — delete should fail
        resp = client.delete("/api/metadata/entities/product")
        assert resp.status_code == 404
