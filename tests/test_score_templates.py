"""Tests for score templates API."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def st_workspace(tmp_path):
    """Create a workspace with full metadata for score template tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy all metadata subdirectories
    for subdir in [
        "entities",
        "calculations",
        "settings",
        "detection_models",
        "score_templates",
    ]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    return ws


@pytest.fixture
def client(st_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", st_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_list_score_templates(client):
    """List all score templates — should return 7 OOB."""
    resp = client.get("/api/metadata/score-templates")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["templates"]) == 7


def test_filter_by_value_category(client):
    """Filter templates by value_category."""
    resp = client.get("/api/metadata/score-templates?value_category=volume")
    data = resp.json()
    assert len(data["templates"]) == 2
    for t in data["templates"]:
        assert t["value_category"] == "volume"


def test_get_score_template(client):
    """Get single template by ID."""
    resp = client.get("/api/metadata/score-templates/ratio_binary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["template_id"] == "ratio_binary"
    assert len(data["steps"]) == 2
    assert "usage_count" in data


def test_create_score_template(client):
    """Create a new score template via PUT."""
    template = {
        "template_id": "test_template",
        "label": "Test Template",
        "description": "For testing",
        "value_category": "volume",
        "steps": [
            {"min_value": 0, "max_value": 100, "score": 5},
            {"min_value": 100, "max_value": None, "score": 10},
        ],
        "layer": "user",
    }
    resp = client.put("/api/metadata/score-templates/test_template", json=template)
    assert resp.status_code == 200
    assert resp.json()["status"] == "saved"

    # Verify
    resp2 = client.get("/api/metadata/score-templates/test_template")
    assert resp2.status_code == 200
    assert resp2.json()["label"] == "Test Template"


def test_delete_score_template(client):
    """Delete a score template."""
    template = {
        "template_id": "to_delete",
        "label": "To Delete",
        "value_category": "test",
        "steps": [],
        "layer": "user",
    }
    client.put("/api/metadata/score-templates/to_delete", json=template)

    resp = client.delete("/api/metadata/score-templates/to_delete")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True


def test_score_template_not_found(client):
    """Non-existent template returns error."""
    resp = client.get("/api/metadata/score-templates/nonexistent")
    assert resp.status_code == 200
    assert "error" in resp.json()
