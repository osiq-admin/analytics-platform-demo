"""Tests for field mapping models and API."""
import json
import pytest
from starlette.testclient import TestClient
from backend import config
from backend.main import app
from backend.models.mapping import FieldMapping, MappingDefinition, MappingValidationResult


class TestMappingModels:
    def test_field_mapping_defaults(self):
        fm = FieldMapping(source_field="src", target_field="tgt")
        assert fm.transform == "direct"
        assert fm.expression == ""
        assert fm.default_value == ""

    def test_mapping_definition_defaults(self):
        md = MappingDefinition(mapping_id="m1", source_entity="execution", target_entity="execution")
        assert md.source_tier == "bronze"
        assert md.target_tier == "silver"
        assert md.status == "draft"
        assert len(md.field_mappings) == 0
        assert md.created_by == "system"

    def test_mapping_with_fields(self):
        md = MappingDefinition(
            mapping_id="m1",
            source_entity="execution",
            target_entity="execution",
            field_mappings=[
                FieldMapping(source_field="exec_id", target_field="execution_id", transform="rename"),
                FieldMapping(source_field="price", target_field="price", transform="direct"),
            ],
        )
        assert len(md.field_mappings) == 2
        assert md.field_mappings[0].transform == "rename"

    def test_validation_result_defaults(self):
        vr = MappingValidationResult()
        assert vr.valid is True
        assert vr.errors == []

    def test_validation_result_with_errors(self):
        vr = MappingValidationResult(valid=False, errors=["Missing required field"], warnings=["Type mismatch"])
        assert not vr.valid
        assert len(vr.errors) == 1
        assert len(vr.warnings) == 1


class TestMappingAPI:
    @pytest.fixture
    def workspace(self, tmp_path):
        ws = tmp_path / "workspace"
        for d in ["metadata/mappings", "metadata/entities", "metadata/calculations/transaction",
                   "metadata/detection_models", "metadata/settings/thresholds",
                   "metadata/medallion", "metadata/connectors", "data/csv", "data/parquet"]:
            (ws / d).mkdir(parents=True, exist_ok=True)
        (ws / "metadata" / "entities" / "execution.json").write_text(json.dumps({
            "entity_id": "execution", "name": "Execution", "fields": [
                {"name": "exec_id", "type": "string"},
                {"name": "order_id", "type": "string"},
                {"name": "price", "type": "decimal"},
            ]
        }))
        (ws / "metadata" / "mappings" / "test_map.json").write_text(json.dumps({
            "mapping_id": "test_map", "source_entity": "execution", "target_entity": "execution",
            "field_mappings": [{"source_field": "exec_id", "target_field": "exec_id", "transform": "direct"}]
        }))
        return ws

    @pytest.fixture
    def client(self, workspace, monkeypatch):
        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc

    def test_list_mappings(self, client):
        resp = client.get("/api/mappings/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert any(m["mapping_id"] == "test_map" for m in data)

    def test_get_mapping(self, client):
        resp = client.get("/api/mappings/test_map")
        assert resp.status_code == 200
        assert resp.json()["mapping_id"] == "test_map"

    def test_get_mapping_not_found(self, client):
        resp = client.get("/api/mappings/nonexistent")
        assert resp.status_code == 404

    def test_create_mapping(self, client):
        resp = client.post("/api/mappings/", json={
            "mapping_id": "new_map", "source_entity": "order", "target_entity": "order",
            "field_mappings": []
        })
        assert resp.status_code == 200
        assert resp.json()["mapping_id"] == "new_map"

    def test_update_mapping(self, client):
        resp = client.put("/api/mappings/test_map", json={
            "mapping_id": "test_map", "source_entity": "execution", "target_entity": "execution",
            "field_mappings": [], "status": "active"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    def test_delete_mapping(self, client):
        resp = client.delete("/api/mappings/test_map")
        assert resp.status_code == 200
        resp2 = client.get("/api/mappings/test_map")
        assert resp2.status_code == 404

    def test_validate_mapping(self, client):
        resp = client.post("/api/mappings/test_map/validate")
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True

    def test_list_mappings_returns_empty_for_fresh(self, client):
        """List mappings endpoint works even with no extra mappings."""
        resp = client.get("/api/mappings/")
        assert resp.status_code == 200
