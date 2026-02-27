"""Tests for view configuration metadata."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "view_config").mkdir(parents=True)
    (ws / "metadata" / "view_config" / "entity_designer.json").write_text(json.dumps({
        "view_id": "entity_designer",
        "description": "Entity Designer view configuration",
        "tabs": [
            {"id": "details", "label": "Entity Details", "icon": "table", "default": True},
            {"id": "relationships", "label": "Relationship Graph", "icon": "link"}
        ]
    }))
    (ws / "metadata" / "view_config" / "model_composer.json").write_text(json.dumps({
        "view_id": "model_composer",
        "description": "Model Composer view configuration",
        "tabs": [
            {"id": "validation", "label": "Validate", "icon": "check", "default": True},
            {"id": "preview", "label": "Preview", "icon": "eye"},
            {"id": "dependencies", "label": "Deps", "icon": "git-branch"}
        ]
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


class TestViewConfig:
    def test_entity_designer_config_loads(self, client):
        resp = client.get("/api/metadata/view_config/entity_designer")
        assert resp.status_code == 200
        data = resp.json()
        assert data["view_id"] == "entity_designer"
        assert len(data["tabs"]) == 2

    def test_model_composer_config_loads(self, client):
        resp = client.get("/api/metadata/view_config/model_composer")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tabs"]) == 3

    def test_tabs_have_required_fields(self, client):
        resp = client.get("/api/metadata/view_config/entity_designer")
        for tab in resp.json()["tabs"]:
            assert "id" in tab
            assert "label" in tab

    def test_default_tab_marked(self, client):
        resp = client.get("/api/metadata/view_config/entity_designer")
        defaults = [t for t in resp.json()["tabs"] if t.get("default")]
        assert len(defaults) == 1
        assert defaults[0]["id"] == "details"

    def test_nonexistent_view_returns_404(self, client):
        resp = client.get("/api/metadata/view_config/nonexistent")
        assert resp.status_code == 404

    def test_entity_designer_tab_labels_match(self, client):
        """Verify tab labels match the actual frontend labels."""
        resp = client.get("/api/metadata/view_config/entity_designer")
        tabs = resp.json()["tabs"]
        labels = {t["id"]: t["label"] for t in tabs}
        assert labels["details"] == "Entity Details"
        assert labels["relationships"] == "Relationship Graph"

    def test_model_composer_tab_labels_match(self, client):
        """Verify tab labels match the actual frontend labels."""
        resp = client.get("/api/metadata/view_config/model_composer")
        tabs = resp.json()["tabs"]
        labels = {t["id"]: t["label"] for t in tabs}
        assert labels["validation"] == "Validate"
        assert labels["preview"] == "Preview"
        assert labels["dependencies"] == "Deps"

    def test_tabs_have_icon_field(self, client):
        """All tabs with icons should have icon field."""
        resp = client.get("/api/metadata/view_config/entity_designer")
        for tab in resp.json()["tabs"]:
            assert "icon" in tab

    def test_view_config_has_description(self, client):
        """View config includes a description field."""
        resp = client.get("/api/metadata/view_config/entity_designer")
        data = resp.json()
        assert "description" in data
        assert len(data["description"]) > 0
