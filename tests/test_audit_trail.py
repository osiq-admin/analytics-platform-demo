"""Tests for metadata audit trail."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    for d in ["entities", "calculations", "settings", "detection_models", "query_presets", "navigation", "format_rules"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestAuditTrail:
    def test_save_entity_creates_audit_record(self, workspace, client):
        entity = {"entity_id": "test_entity", "name": "Test", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/test_entity", json=entity)
        audit_dir = workspace / "metadata" / "_audit"
        assert audit_dir.exists()
        records = list(audit_dir.glob("*.json"))
        assert len(records) >= 1
        record = json.loads(records[0].read_text())
        assert record["action"] == "created"
        assert record["metadata_type"] == "entity"
        assert record["item_id"] == "test_entity"
        assert "timestamp" in record
        assert "new_value" in record

    def test_audit_records_include_previous_value(self, workspace, client):
        entity = {"entity_id": "test_entity", "name": "Test V1", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/test_entity", json=entity)
        entity["name"] = "Test V2"
        client.put("/api/metadata/entities/test_entity", json=entity)
        audit_dir = workspace / "metadata" / "_audit"
        records = sorted(audit_dir.glob("*.json"))
        last = json.loads(records[-1].read_text())
        assert last["action"] == "updated"
        assert last["previous_value"]["name"] == "Test V1"
        assert last["new_value"]["name"] == "Test V2"

    def test_audit_api_returns_history(self, workspace, client):
        entity = {"entity_id": "audited", "name": "Audited", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/audited", json=entity)
        resp = client.get("/api/metadata/audit?metadata_type=entity&item_id=audited")
        assert resp.status_code == 200
        history = resp.json()
        assert len(history) >= 1
        assert history[0]["item_id"] == "audited"
