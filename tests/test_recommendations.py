"""Tests for recommendation service."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def rec_workspace(tmp_path):
    """Create a workspace with full metadata for recommendation tests."""
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
def client(rec_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", rec_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_recommendations_missing_description(client):
    """Submission without description should get a recommendation."""
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_rec_1",
        "name": "No Description",
        "components": [{"type": "detection_model", "id": "wash_full_day", "action": "reference"}],
    })
    data = resp.json()
    recs = data["recommendations"]
    assert any(r["title"] == "Missing description" for r in recs)


def test_recommendations_no_model(client):
    """Submission without detection model should warn."""
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_rec_2",
        "name": "No Model",
        "components": [{"type": "calculation", "id": "wash_detection", "action": "reference"}],
    })
    recs = resp.json()["recommendations"]
    assert any("No detection model" in r["title"] for r in recs)


def test_recommendations_similarity_check(client):
    """Submission with overlapping calcs should flag similarity."""
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_rec_3",
        "name": "Similar Model",
        "components": [
            {"type": "calculation", "id": "large_trading_activity", "action": "reference"},
            {"type": "calculation", "id": "wash_qty_match", "action": "reference"},
            {"type": "detection_model", "id": "wash_full_day", "action": "reference"},
        ],
    })
    recs = resp.json()["recommendations"]
    similarity_recs = [r for r in recs if r["category"] == "similarity"]
    # Should find similarity with wash_full_day model (shares large_trading_activity + wash_qty_match)
    assert len(similarity_recs) > 0


def test_recommendations_new_components(client):
    """Submission with new components should classify as new."""
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_rec_4",
        "name": "New Component",
        "components": [
            {"type": "calculation", "id": "custom_calc", "action": "create", "config": {"name": "Custom"}},
        ],
    })
    recs = resp.json()["recommendations"]
    assert any("New components" in r["title"] for r in recs)


def test_rerun_recommendations(client):
    """POST /recommend should re-analyze and update."""
    resp = client.post("/api/submissions", json={
        "use_case_id": "uc_rec_5",
        "name": "Rerun Test",
        "components": [],
    })
    sub_id = resp.json()["submission_id"]

    resp = client.post(f"/api/submissions/{sub_id}/recommend")
    assert resp.status_code == 200
    assert "recommendations" in resp.json()
