"""Tests for SQL query presets loaded from metadata JSON."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def qp_workspace(tmp_path):
    """Create a workspace with query_presets metadata and minimal dirs for app boot."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata subdirectories needed for lifespan boot
    for subdir in [
        "entities",
        "calculations",
        "settings",
        "detection_models",
    ]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Copy query_presets metadata
    src = real_ws / "metadata" / "query_presets"
    if src.exists():
        shutil.copytree(src, ws / "metadata" / "query_presets")

    # Create data/csv directory (needed by data loader)
    (ws / "data" / "csv").mkdir(parents=True)

    return ws


@pytest.fixture
def client(qp_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", qp_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_presets_loaded_from_metadata(client):
    """GET /api/query/presets returns presets from JSON metadata."""
    resp = client.get("/api/query/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 3

    names = [p["name"] for p in data]
    assert "All Tables" in names
    assert "Alert Summary" in names
    assert "Calculation Results" in names


def test_presets_ordered_by_order_field(client):
    """Presets come back sorted by the order field."""
    resp = client.get("/api/query/presets")
    data = resp.json()
    orders = [p["order"] for p in data]
    assert orders == sorted(orders)
    assert orders == [1, 2, 3]


def test_presets_have_required_fields(client):
    """Each preset has preset_id, name, sql, category."""
    resp = client.get("/api/query/presets")
    data = resp.json()
    for preset in data:
        assert "preset_id" in preset
        assert "name" in preset
        assert "sql" in preset
        assert "category" in preset


def test_empty_presets_dir_returns_empty_list(qp_workspace, monkeypatch):
    """Removing the JSON file gives empty list."""
    from backend import config

    # Remove the query_presets directory contents
    presets_dir = qp_workspace / "metadata" / "query_presets"
    if presets_dir.exists():
        shutil.rmtree(presets_dir)
    presets_dir.mkdir(parents=True)

    monkeypatch.setattr(config.settings, "workspace_dir", qp_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        resp = tc.get("/api/query/presets")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0
