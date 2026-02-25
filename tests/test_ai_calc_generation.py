"""Tests for AI calculation generation."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def ai_workspace(tmp_path):
    """Create a workspace with full metadata for AI calc generation tests."""
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

    # Copy AI-specific metadata
    for fname in ["ai_instructions.md", "ai_mock_sequences.json"]:
        src = real_ws / "metadata" / fname
        if src.exists():
            shutil.copy2(src, ws / "metadata" / fname)

    # Create alerts directory (needed by AlertService)
    (ws / "alerts" / "traces").mkdir(parents=True)

    # Create submissions directory
    (ws / "submissions").mkdir(parents=True)

    return ws


@pytest.fixture
def client(ai_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", ai_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_suggest_ratio_calc(client):
    resp = client.post(
        "/api/ai/suggest-calculation",
        json={"description": "buy sell ratio for each product"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["layer"] == "derived"
    assert data["template_type"] == "ratio"
    assert data["ai_generated"] is True
    assert "logic" in data
    assert "suggestions" in data


def test_suggest_aggregation_calc(client):
    resp = client.post(
        "/api/ai/suggest-calculation",
        json={"description": "total trading volume aggregation per account"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["layer"] == "aggregation"
    assert data["template_type"] == "aggregation"


def test_suggest_time_window_calc(client):
    resp = client.post(
        "/api/ai/suggest-calculation",
        json={"description": "rolling time window for price movement"},
    )
    assert resp.status_code == 200
    assert resp.json()["template_type"] == "time_window"


def test_suggest_generic_calc(client):
    resp = client.post(
        "/api/ai/suggest-calculation",
        json={"description": "detect unusual patterns in trading"},
    )
    assert resp.status_code == 200
    assert resp.json()["ai_generated"] is True


def test_get_ai_context(client):
    resp = client.get("/api/ai/context")
    assert resp.status_code == 200
    data = resp.json()
    assert "context" in data
    assert "summary" in data
    assert data["summary"]["entities"] > 0
