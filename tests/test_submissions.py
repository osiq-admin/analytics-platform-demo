"""Tests for submissions API."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def sub_workspace(tmp_path):
    """Create a workspace with full metadata for submission tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy all metadata subdirectories needed for lifespan
    for subdir in [
        "entities",
        "calculations",
        "settings",
        "detection_models",
    ]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Create alerts directory (needed by AlertService)
    (ws / "alerts" / "traces").mkdir(parents=True)

    # Create submissions directory
    (ws / "submissions").mkdir(parents=True)

    return ws


@pytest.fixture
def client(sub_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", sub_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_list_submissions_empty(client):
    resp = client.get("/api/submissions")
    assert resp.status_code == 200
    assert "submissions" in resp.json()


def test_create_submission(client):
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_test",
        "name": "Test Submission",
        "description": "Testing wash variant",
        "components": [
            {"type": "detection_model", "id": "wash_full_day", "action": "reference"},
        ],
        "tags": ["wash", "test"],
        "expected_results": {"should_fire": True},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["submission_id"].startswith("SUB-")
    assert data["status"] == "pending"
    assert len(data["recommendations"]) > 0


def test_get_submission(client):
    # Create first
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_get",
        "name": "Get Test",
        "components": [],
    })
    sub_id = resp.json()["submission_id"]

    resp = client.get(f"/api/submissions/{sub_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Get Test"


def test_update_submission_status(client):
    # Create
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_status",
        "name": "Status Test",
        "components": [],
    })
    sub_id = resp.json()["submission_id"]

    # Approve
    resp = client.put(f"/api/submissions/{sub_id}/status", json={
        "status": "approved",
        "reviewer": "reviewer_1",
        "comment": "Looks good, approved.",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    assert resp.json()["reviewer"] == "reviewer_1"
    assert len(resp.json()["comments"]) == 1


def test_delete_submission(client):
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_del",
        "name": "Delete Test",
        "components": [],
    })
    sub_id = resp.json()["submission_id"]

    resp = client.delete(f"/api/submissions/{sub_id}")
    assert resp.status_code == 200

    resp = client.get(f"/api/submissions/{sub_id}")
    assert resp.status_code == 404


def test_get_nonexistent_submission(client):
    resp = client.get("/api/submissions/nonexistent")
    assert resp.status_code == 404
