"""Tests for match patterns API."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def mp_workspace(tmp_path):
    """Create a workspace with full metadata for match pattern tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy all metadata subdirectories
    for subdir in [
        "entities",
        "calculations",
        "settings",
        "detection_models",
        "match_patterns",
    ]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    return ws


@pytest.fixture
def client(mp_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", mp_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_list_match_patterns(client):
    """List all match patterns — should return 9 OOB."""
    resp = client.get("/api/metadata/match-patterns")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["patterns"]) == 9


def test_get_match_pattern(client):
    """Get single pattern by ID."""
    resp = client.get("/api/metadata/match-patterns/equity_stocks")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pattern_id"] == "equity_stocks"
    assert data["match"] == {"asset_class": "equity"}
    assert "usage_count" in data


def test_create_match_pattern(client):
    """Create a new match pattern via PUT."""
    pattern = {
        "pattern_id": "test_pattern",
        "label": "Test Pattern",
        "description": "For testing",
        "match": {"asset_class": "equity", "instrument_type": "stock"},
        "layer": "user",
    }
    resp = client.put("/api/metadata/match-patterns/test_pattern", json=pattern)
    assert resp.status_code == 200
    assert resp.json()["status"] == "saved"

    # Verify it was created
    resp2 = client.get("/api/metadata/match-patterns/test_pattern")
    assert resp2.status_code == 200
    assert resp2.json()["label"] == "Test Pattern"


def test_delete_match_pattern(client):
    """Delete a match pattern."""
    # Create one first
    pattern = {
        "pattern_id": "to_delete",
        "label": "To Delete",
        "match": {"asset_class": "test"},
        "layer": "user",
    }
    client.put("/api/metadata/match-patterns/to_delete", json=pattern)

    resp = client.delete("/api/metadata/match-patterns/to_delete")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True


def test_match_pattern_usage_count(client):
    """Equity stocks pattern should have usage count from settings overrides."""
    resp = client.get("/api/metadata/match-patterns/equity_stocks")
    data = resp.json()
    # equity pattern match {"asset_class": "equity"} is used in multiple settings overrides
    assert data["usage_count"] >= 1


def test_match_pattern_not_found(client):
    """Non-existent pattern returns error."""
    resp = client.get("/api/metadata/match-patterns/nonexistent")
    assert resp.status_code == 200
    assert "error" in resp.json()
