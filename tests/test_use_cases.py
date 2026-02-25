"""Tests for use cases API."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def uc_workspace(tmp_path):
    """Create a workspace with full metadata for use case tests."""
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

    # Create use_cases directory
    (ws / "use_cases").mkdir(parents=True)

    return ws


@pytest.fixture
def client(uc_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", uc_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_list_use_cases_empty(client):
    """Initially returns empty list."""
    resp = client.get("/api/use-cases")
    assert resp.status_code == 200
    assert "use_cases" in resp.json()


def test_create_and_get_use_case(client):
    """Create a use case, then retrieve it."""
    uc = {
        "use_case_id": "test_uc_1",
        "name": "Test Use Case",
        "description": "Testing wash trading variant",
        "status": "draft",
        "components": [
            {"type": "detection_model", "id": "wash_full_day", "action": "reference"},
            {"type": "calculation", "id": "wash_detection", "action": "reference"},
        ],
        "sample_data": {},
        "expected_results": {"should_fire": True},
        "tags": ["wash", "testing"],
    }
    resp = client.put("/api/use-cases/test_uc_1", json=uc)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Use Case"

    # Get it back
    resp = client.get("/api/use-cases/test_uc_1")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Use Case"
    assert len(resp.json()["components"]) == 2


def test_delete_use_case(client):
    """Create and delete a use case."""
    uc = {
        "use_case_id": "test_uc_delete",
        "name": "To Delete",
        "components": [],
    }
    client.put("/api/use-cases/test_uc_delete", json=uc)

    resp = client.delete("/api/use-cases/test_uc_delete")
    assert resp.status_code == 200
    assert resp.json()["deleted"] == "test_uc_delete"

    # Should be gone
    resp = client.get("/api/use-cases/test_uc_delete")
    assert resp.status_code == 404


def test_get_nonexistent_use_case(client):
    """404 for nonexistent use case."""
    resp = client.get("/api/use-cases/nonexistent_uc")
    assert resp.status_code == 404


def test_run_use_case(client):
    """Run a use case that references an existing model."""
    uc = {
        "use_case_id": "test_uc_run",
        "name": "Run Test",
        "components": [
            {"type": "detection_model", "id": "wash_full_day", "action": "reference"},
        ],
    }
    client.put("/api/use-cases/test_uc_run", json=uc)

    resp = client.post("/api/use-cases/test_uc_run/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert len(data["results"]) == 1
    assert data["results"][0]["model_id"] == "wash_full_day"


def test_run_use_case_no_model(client):
    """Running a use case with no model component returns error."""
    uc = {
        "use_case_id": "test_uc_no_model",
        "name": "No Model",
        "components": [
            {"type": "calculation", "id": "wash_detection", "action": "reference"},
        ],
    }
    client.put("/api/use-cases/test_uc_no_model", json=uc)

    resp = client.post("/api/use-cases/test_uc_no_model/run")
    assert resp.status_code == 200
    assert resp.json()["status"] == "error"
