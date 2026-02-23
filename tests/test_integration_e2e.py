"""End-to-end integration test: FastAPI app with real workspace data.

Tests the full flow: API endpoints return correct data from a temp workspace.
"""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.db import DuckDBManager
from backend.main import app
from backend.services.metadata_service import MetadataService


@pytest.fixture
def e2e_workspace(tmp_path):
    """Create a temporary workspace with metadata and generated CSV data."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata
    for subdir in ["calculations", "settings", "detection_models", "entities"]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Copy AI metadata
    for fname in ["ai_instructions.md", "ai_mock_sequences.json"]:
        src = real_ws / "metadata" / fname
        if src.exists():
            shutil.copy2(src, ws / "metadata" / fname)

    # Generate CSV data
    from scripts.generate_data import SyntheticDataGenerator
    gen = SyntheticDataGenerator(ws, seed=42)
    gen.generate_all()

    # Create snapshots dir
    (ws / "snapshots").mkdir(exist_ok=True)

    return ws


@pytest.fixture
def client(e2e_workspace, monkeypatch):
    """Create a test client with patched settings and initialized app state."""
    from backend import config
    monkeypatch.setattr(config.settings, "workspace_dir", e2e_workspace)

    from backend.engine.settings_resolver import SettingsResolver

    # Set up DB and app state
    db = DuckDBManager()
    db.connect(":memory:")
    app.state.db = db
    app.state.metadata = MetadataService(e2e_workspace)
    app.state.resolver = SettingsResolver()

    try:
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc
    finally:
        db.close()


class TestHealthCheck:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestMetadataEndpoints:
    def test_list_entities(self, client):
        resp = client.get("/api/metadata/entities")
        assert resp.status_code == 200
        entities = resp.json()
        assert len(entities) >= 4

    def test_get_entity(self, client):
        resp = client.get("/api/metadata/entities/execution")
        assert resp.status_code == 200
        assert resp.json()["entity_id"] == "execution"

    def test_list_calculations(self, client):
        resp = client.get("/api/metadata/calculations")
        assert resp.status_code == 200
        calcs = resp.json()
        assert len(calcs) >= 10

    def test_list_settings(self, client):
        resp = client.get("/api/metadata/settings")
        assert resp.status_code == 200
        settings_list = resp.json()
        assert len(settings_list) > 0

    def test_list_detection_models(self, client):
        resp = client.get("/api/metadata/detection-models")
        assert resp.status_code == 200
        models = resp.json()
        assert len(models) >= 5


class TestQueryEndpoints:
    def test_execute_sql_show_tables(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT 42 AS answer"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["rows"][0]["answer"] == 42

    def test_preset_queries(self, client):
        resp = client.get("/api/query/presets")
        assert resp.status_code == 200
        presets = resp.json()
        assert len(presets) >= 1

    def test_bad_sql_returns_error(self, client):
        resp = client.post("/api/query/execute", json={"sql": "INVALID SQL HERE"})
        assert resp.status_code == 200
        data = resp.json()
        assert "error" in data


class TestDemoEndpoints:
    def test_get_state(self, client):
        resp = client.get("/api/demo/state")
        assert resp.status_code == 200
        state = resp.json()
        assert "current_checkpoint" in state
        assert "checkpoints" in state
        assert len(state["checkpoints"]) == 8

    def test_step(self, client):
        resp = client.post("/api/demo/step")
        assert resp.status_code == 200
        state = resp.json()
        assert state["checkpoint_index"] == 1


class TestAIEndpoints:
    def test_get_mode(self, client):
        resp = client.get("/api/ai/mode")
        assert resp.status_code == 200
        assert resp.json()["mode"] == "mock"

    def test_list_mock_sequences(self, client):
        resp = client.get("/api/ai/mock-sequences")
        assert resp.status_code == 200
        seqs = resp.json()
        assert len(seqs) >= 3

    def test_get_mock_sequence(self, client):
        # First get list
        seqs = client.get("/api/ai/mock-sequences").json()
        first_id = seqs[0]["id"]

        resp = client.get(f"/api/ai/mock-sequences/{first_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["messages"]) >= 2

    def test_chat_mock_known_question(self, client):
        resp = client.post("/api/ai/chat", json={
            "messages": [{"role": "user", "content": "What data do we have in the system?"}]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "assistant"
        assert data["mode"] == "mock"
        assert len(data["content"]) > 50

    def test_chat_mock_unknown_question(self, client):
        resp = client.post("/api/ai/chat", json={
            "messages": [{"role": "user", "content": "random question xyz"}]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == "mock"


class TestSettingsResolveEndpoint:
    def test_resolve_setting(self, client):
        """POST /api/metadata/settings/{id}/resolve returns resolution result."""
        resp = client.get("/api/metadata/settings")
        assert resp.status_code == 200
        settings_list = resp.json()
        assert len(settings_list) > 0

        setting_id = settings_list[0]["setting_id"]
        resp = client.post(
            f"/api/metadata/settings/{setting_id}/resolve",
            json={"context": {"asset_class": "equity"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "setting_id" in data
        assert "value" in data
        assert "why" in data


class TestAlertEndpoints:
    def test_list_alerts_empty(self, client):
        resp = client.get("/api/alerts/")
        assert resp.status_code == 200
        # No alerts loaded yet — should return empty or error gracefully
        data = resp.json()
        assert isinstance(data, list)

    def test_get_alert_not_found(self, client):
        resp = client.get("/api/alerts/nonexistent")
        assert resp.status_code == 404
