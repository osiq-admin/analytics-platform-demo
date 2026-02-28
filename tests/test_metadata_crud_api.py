"""Tests for Metadata CRUD API — PUT/DELETE for all 4 metadata types."""

import pytest
from fastapi.testclient import TestClient

from backend.db import DuckDBManager
from backend.engine.settings_resolver import SettingsResolver
from backend.main import app
from backend.services.metadata_service import MetadataService


@pytest.fixture
def crud_workspace(tmp_path):
    """Workspace with metadata dirs for CRUD testing."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/calculations/time_window",
        "metadata/calculations/aggregation",
        "metadata/calculations/derived",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/detection_models",
    ]:
        (ws / d).mkdir(parents=True)
    return ws


@pytest.fixture
def crud_client(crud_workspace, monkeypatch):
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", crud_workspace)

    db = DuckDBManager()
    db.connect(":memory:")
    app.state.db = db
    app.state.metadata = MetadataService(crud_workspace)
    app.state.resolver = SettingsResolver()

    try:
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc
    finally:
        db.close()


# -- Entity CRUD --


class TestEntityCrud:
    def test_put_entity_creates_new(self, crud_client):
        """PUT new entity returns 200 and creates it."""
        body = {
            "name": "Test Entity",
            "description": "A test entity",
            "fields": [
                {"name": "id", "type": "string", "is_key": True},
                {"name": "value", "type": "decimal"},
            ],
        }
        resp = crud_client.put("/api/metadata/entities/test_entity", json=body)
        assert resp.status_code == 200
        assert resp.json()["saved"] is True

        # Verify it's retrievable
        resp2 = crud_client.get("/api/metadata/entities/test_entity")
        assert resp2.status_code == 200
        assert resp2.json()["name"] == "Test Entity"
        assert len(resp2.json()["fields"]) == 2

    def test_put_entity_updates_existing(self, crud_client):
        """PUT existing entity overwrites it."""
        body1 = {"name": "Original", "fields": []}
        crud_client.put("/api/metadata/entities/test_entity", json=body1)

        body2 = {"name": "Updated", "description": "changed", "fields": []}
        resp = crud_client.put("/api/metadata/entities/test_entity", json=body2)
        assert resp.status_code == 200

        resp2 = crud_client.get("/api/metadata/entities/test_entity")
        assert resp2.json()["name"] == "Updated"
        assert resp2.json()["description"] == "changed"

    def test_delete_entity(self, crud_client):
        """DELETE existing entity returns 200."""
        crud_client.put(
            "/api/metadata/entities/to_delete",
            json={"name": "Doomed", "fields": []},
        )
        resp = crud_client.delete("/api/metadata/entities/to_delete")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

        resp2 = crud_client.get("/api/metadata/entities/to_delete")
        assert resp2.status_code == 404

    def test_delete_entity_not_found(self, crud_client):
        """DELETE nonexistent entity returns 404."""
        resp = crud_client.delete("/api/metadata/entities/nonexistent")
        assert resp.status_code == 404


# -- Calculation CRUD --


class TestCalculationCrud:
    def _make_calc(self, calc_id="test_calc", layer="transaction", depends_on=None):
        return {
            "name": f"Test Calc {calc_id}",
            "layer": layer,
            "description": "A test calculation",
            "logic": "SELECT * FROM execution",
            "value_field": "total_value",
            "storage": f"calc_{calc_id}",
            "depends_on": depends_on or [],
        }

    def test_put_calculation_valid(self, crud_client):
        """PUT valid calculation returns 200."""
        body = self._make_calc()
        resp = crud_client.put("/api/metadata/calculations/test_calc", json=body)
        assert resp.status_code == 200
        assert resp.json()["saved"] is True

        resp2 = crud_client.get("/api/metadata/calculations/test_calc")
        assert resp2.status_code == 200
        assert resp2.json()["name"] == "Test Calc test_calc"

    def test_put_calculation_cycle_detection(self, crud_client):
        """PUT self-referencing calc is rejected (Pydantic model_validator)."""
        body = self._make_calc(depends_on=["test_calc"])
        resp = crud_client.put("/api/metadata/calculations/test_calc", json=body)
        # Pydantic model_validator raises ValidationError → 422 or 500
        assert resp.status_code >= 400

    def test_delete_calculation_with_dependents(self, crud_client):
        """DELETE calc used by a model returns 409."""
        # Create the calc first
        calc_body = self._make_calc()
        crud_client.put("/api/metadata/calculations/test_calc", json=calc_body)

        # Create a setting for the model's score_threshold_setting
        setting_body = {
            "name": "Test Threshold",
            "value_type": "decimal",
            "default": 10,
        }
        crud_client.put("/api/metadata/settings/test_threshold", json=setting_body)

        # Create a model that uses this calc
        model_body = {
            "name": "Test Model",
            "description": "Uses test_calc",
            "time_window": "business_date",
            "granularity": ["product_id"],
            "calculations": [{"calc_id": "test_calc", "strictness": "MUST_PASS"}],
            "score_threshold_setting": "test_threshold",
        }
        crud_client.put("/api/metadata/detection-models/test_model", json=model_body)

        # Try to delete the calc — should fail
        resp = crud_client.delete("/api/metadata/calculations/test_calc")
        assert resp.status_code == 409
        assert "dependents" in resp.json()
        assert "test_model" in resp.json()["dependents"]["detection_models"]

    def test_delete_calculation_no_dependents(self, crud_client):
        """DELETE standalone calc returns 200."""
        calc_body = self._make_calc(calc_id="standalone")
        crud_client.put("/api/metadata/calculations/standalone", json=calc_body)

        resp = crud_client.delete("/api/metadata/calculations/standalone")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True


# -- Setting CRUD --


class TestSettingCrud:
    def test_put_setting(self, crud_client):
        """PUT setting returns 200."""
        body = {
            "name": "Test Threshold",
            "value_type": "decimal",
            "default": 0.05,
            "overrides": [
                {"match": {"asset_class": "equity"}, "value": 0.03, "priority": 10}
            ],
        }
        resp = crud_client.put("/api/metadata/settings/test_threshold", json=body)
        assert resp.status_code == 200
        assert resp.json()["saved"] is True

        resp2 = crud_client.get("/api/metadata/settings/test_threshold")
        assert resp2.status_code == 200
        assert resp2.json()["default"] == 0.05
        assert len(resp2.json()["overrides"]) == 1

    def test_delete_setting_with_dependents(self, crud_client):
        """DELETE setting referenced by a model returns 409."""
        # Create the setting
        setting_body = {
            "name": "Model Threshold",
            "value_type": "decimal",
            "default": 10,
        }
        crud_client.put(
            "/api/metadata/settings/model_threshold", json=setting_body
        )

        # Create a model that uses this setting as score_threshold_setting
        model_body = {
            "name": "Dep Model",
            "description": "Uses model_threshold",
            "time_window": "business_date",
            "granularity": ["product_id"],
            "calculations": [],
            "score_threshold_setting": "model_threshold",
        }
        crud_client.put(
            "/api/metadata/detection-models/dep_model", json=model_body
        )

        resp = crud_client.delete("/api/metadata/settings/model_threshold")
        assert resp.status_code == 409
        assert "dep_model" in resp.json()["dependents"]["detection_models"]


# -- Detection Model CRUD --


class TestDetectionModelCrud:
    def test_put_detection_model(self, crud_client):
        """PUT detection model returns 200."""
        # Create required setting first
        crud_client.put(
            "/api/metadata/settings/wash_threshold",
            json={"name": "Wash Threshold", "value_type": "decimal", "default": 10},
        )
        body = {
            "name": "Wash Trading Test",
            "description": "Test model",
            "time_window": "business_date",
            "granularity": ["product_id", "account_id"],
            "calculations": [],
            "score_threshold_setting": "wash_threshold",
        }
        resp = crud_client.put(
            "/api/metadata/detection-models/wash_test", json=body
        )
        assert resp.status_code == 200
        assert resp.json()["saved"] is True

    def test_delete_detection_model(self, crud_client):
        """DELETE detection model returns 200."""
        crud_client.put(
            "/api/metadata/settings/del_threshold",
            json={"name": "Del Threshold", "value_type": "decimal", "default": 10},
        )
        crud_client.put(
            "/api/metadata/detection-models/to_delete",
            json={
                "name": "Delete Me",
                "time_window": "business_date",
                "granularity": ["product_id"],
                "score_threshold_setting": "del_threshold",
            },
        )
        resp = crud_client.delete("/api/metadata/detection-models/to_delete")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True


# -- Dependency Queries --


class TestDependencyQueries:
    def test_get_calculation_dependents(self, crud_client):
        """GET /calculations/{id}/dependents returns dependent calcs and models."""
        # Create base calc
        crud_client.put(
            "/api/metadata/calculations/base_calc",
            json={
                "name": "Base Calc",
                "layer": "transaction",
                "logic": "SELECT 1",
                "value_field": "v",
                "storage": "calc_base",
                "depends_on": [],
            },
        )
        # Create dependent calc
        crud_client.put(
            "/api/metadata/calculations/dep_calc",
            json={
                "name": "Dep Calc",
                "layer": "aggregation",
                "logic": "SELECT 1",
                "value_field": "v",
                "storage": "calc_dep",
                "depends_on": ["base_calc"],
            },
        )

        resp = crud_client.get("/api/metadata/calculations/base_calc/dependents")
        assert resp.status_code == 200
        data = resp.json()
        assert "dep_calc" in data["calculations"]

    def test_get_setting_dependents(self, crud_client):
        """GET /settings/{id}/dependents returns dependent calcs and models."""
        # Create setting
        crud_client.put(
            "/api/metadata/settings/threshold_s",
            json={"name": "Threshold S", "value_type": "decimal", "default": 5},
        )
        # Create model referencing it
        crud_client.put(
            "/api/metadata/detection-models/model_s",
            json={
                "name": "Model S",
                "time_window": "business_date",
                "granularity": ["product_id"],
                "score_threshold_setting": "threshold_s",
            },
        )

        resp = crud_client.get("/api/metadata/settings/threshold_s/dependents")
        assert resp.status_code == 200
        data = resp.json()
        assert "model_s" in data["detection_models"]
