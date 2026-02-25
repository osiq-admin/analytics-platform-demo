"""Tests for version management."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def ver_workspace(tmp_path):
    """Create a workspace with metadata for version management tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata subdirectories needed for lifespan
    for subdir in ["entities", "calculations", "settings", "detection_models"]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Create directories needed by other services
    (ws / "alerts" / "traces").mkdir(parents=True)
    (ws / "submissions").mkdir(parents=True)
    (ws / "versions").mkdir(parents=True)

    return ws


@pytest.fixture
def client(ver_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", ver_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_record_and_get_version(client):
    resp = client.post("/api/versions/record", json={
        "item_type": "detection_model",
        "item_id": "test_model_v",
        "snapshot": {"name": "Test", "calculations": []},
        "change_type": "create",
        "author": "tester",
        "description": "Initial version",
    })
    assert resp.status_code == 200
    assert resp.json()["version"] == 1

    resp = client.get("/api/versions/detection_model/test_model_v")
    assert resp.status_code == 200
    assert len(resp.json()["versions"]) == 1


def test_version_comparison(client):
    # Record v1
    client.post("/api/versions/record", json={
        "item_type": "detection_model",
        "item_id": "test_compare",
        "snapshot": {"name": "Original", "threshold": 5},
    })
    # Record v2
    client.post("/api/versions/record", json={
        "item_type": "detection_model",
        "item_id": "test_compare",
        "snapshot": {"name": "Updated", "threshold": 8, "new_field": True},
    })

    resp = client.get("/api/versions/detection_model/test_compare/compare/1/2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["changes"]) > 0
    # name changed, threshold changed, new_field added
    change_types = {c["type"] for c in data["changes"]}
    assert "changed" in change_types


def test_rollback(client):
    client.post("/api/versions/record", json={
        "item_type": "setting",
        "item_id": "test_rollback",
        "snapshot": {"value": 1.0},
    })
    client.post("/api/versions/record", json={
        "item_type": "setting",
        "item_id": "test_rollback",
        "snapshot": {"value": 2.0},
    })

    resp = client.post("/api/versions/setting/test_rollback/rollback/1")
    assert resp.status_code == 200
    assert resp.json()["change_type"] == "rollback"
    assert resp.json()["version"] == 3


def test_get_nonexistent_version(client):
    resp = client.get("/api/versions/detection_model/nonexistent/999")
    assert resp.status_code == 404


def test_empty_history(client):
    resp = client.get("/api/versions/detection_model/no_history")
    assert resp.status_code == 200
    assert resp.json()["versions"] == []
