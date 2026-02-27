"""Tests for navigation metadata."""
import json
import pathlib

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "navigation").mkdir(parents=True)
    (ws / "metadata" / "navigation" / "main.json").write_text(json.dumps({
        "navigation_id": "main",
        "groups": [
            {
                "title": "Overview",
                "order": 1,
                "items": [
                    {"view_id": "dashboard", "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"}
                ]
            },
            {
                "title": "Define",
                "order": 2,
                "items": [
                    {"view_id": "entities", "label": "Entities", "path": "/entities", "icon": "Database"},
                    {"view_id": "metadata", "label": "Calculations", "path": "/metadata", "icon": "Calculator"}
                ]
            }
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


class TestNavigationMetadata:
    def test_navigation_endpoint(self, client):
        resp = client.get("/api/metadata/navigation")
        assert resp.status_code == 200
        data = resp.json()
        assert data["navigation_id"] == "main"
        assert len(data["groups"]) == 2

    def test_groups_ordered(self, client):
        resp = client.get("/api/metadata/navigation")
        groups = resp.json()["groups"]
        orders = [g["order"] for g in groups]
        assert orders == sorted(orders)

    def test_items_have_required_fields(self, client):
        resp = client.get("/api/metadata/navigation")
        for group in resp.json()["groups"]:
            for item in group["items"]:
                assert "view_id" in item
                assert "label" in item
                assert "path" in item

    def test_all_16_views_present_in_production_nav(self):
        """Verify production navigation.json covers all 16 views."""
        nav_path = pathlib.Path("workspace/metadata/navigation/main.json")
        if not nav_path.exists():
            pytest.skip("Not in project root")
        data = json.loads(nav_path.read_text())
        all_paths = []
        for group in data["groups"]:
            for item in group["items"]:
                all_paths.append(item["path"])
        assert len(all_paths) >= 16, f"Expected 16 views, got {len(all_paths)}"
