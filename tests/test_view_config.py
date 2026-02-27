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
    # Theme palettes
    (ws / "metadata" / "theme").mkdir(parents=True)
    (ws / "metadata" / "theme" / "palettes.json").write_text(json.dumps({
        "palette_id": "default",
        "description": "Default color palette for charts, badges, and graph nodes",
        "chart_colors": ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"],
        "asset_class_colors": {
            "equity": "#6366f1",
            "fx": "#22d3ee",
            "commodity": "#f59e0b",
            "index": "#10b981",
            "fixed_income": "#8b5cf6"
        },
        "layer_badge_variants": {
            "oob": "info",
            "user": "warning",
            "custom": "success"
        },
        "graph_node_colors": {
            "regulation": "#3b82f6",
            "article_covered": "#22c55e",
            "article_uncovered": "#ef4444",
            "detection_model": "#f97316",
            "calculation": "#a855f7"
        }
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


class TestThemePalette:
    def test_palette_loads(self, client):
        resp = client.get("/api/metadata/theme/palettes/default")
        assert resp.status_code == 200
        data = resp.json()
        assert data["palette_id"] == "default"

    def test_chart_colors_present(self, client):
        resp = client.get("/api/metadata/theme/palettes/default")
        data = resp.json()
        assert len(data["chart_colors"]) >= 5
        assert all(c.startswith("#") for c in data["chart_colors"])

    def test_asset_class_colors(self, client):
        resp = client.get("/api/metadata/theme/palettes/default")
        data = resp.json()
        assert "equity" in data["asset_class_colors"]
        assert "fx" in data["asset_class_colors"]

    def test_graph_node_colors(self, client):
        resp = client.get("/api/metadata/theme/palettes/default")
        data = resp.json()
        assert "regulation" in data["graph_node_colors"]
        assert "detection_model" in data["graph_node_colors"]
        assert all(c.startswith("#") for c in data["graph_node_colors"].values())

    def test_layer_badge_variants(self, client):
        resp = client.get("/api/metadata/theme/palettes/default")
        data = resp.json()
        assert "oob" in data["layer_badge_variants"]
        assert "user" in data["layer_badge_variants"]

    def test_nonexistent_palette_returns_404(self, client):
        resp = client.get("/api/metadata/theme/palettes/nonexistent")
        assert resp.status_code == 404
