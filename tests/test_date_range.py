"""Tests for data date range API."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def dr_workspace(tmp_path):
    """Create a temporary workspace with metadata and CSV data."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata
    for subdir in ["calculations", "settings", "detection_models", "entities"]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Copy AI metadata
    for fname in ["ai_instructions.md", "ai_mock_sequences.json"]:
        src = real_ws / "metadata" / fname
        if src.exists():
            shutil.copy2(src, ws / "metadata" / fname)

    # Generate CSV data
    from scripts.generate_data import SyntheticDataGenerator
    gen = SyntheticDataGenerator(ws, seed=42)
    gen.generate_all()

    (ws / "snapshots").mkdir(exist_ok=True)
    return ws


@pytest.fixture
def client(dr_workspace, monkeypatch):
    """Create a test client with CSV data loaded into DuckDB."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", dr_workspace)

    # TestClient context manager triggers lifespan which sets up DB and app state
    with TestClient(app, raise_server_exceptions=False) as tc:
        # Load CSV data into DuckDB so date-range queries work
        resp = tc.post("/api/data/reload")
        assert resp.status_code == 200
        yield tc


def test_date_range_md_eod(client):
    """EOD market data should return trade_date range."""
    resp = client.get("/api/data/date-range/md_eod")
    assert resp.status_code == 200
    data = resp.json()
    assert "trade_date" in data["date_ranges"]
    assert "min_date" in data["date_ranges"]["trade_date"]
    assert "max_date" in data["date_ranges"]["trade_date"]


def test_date_range_execution(client):
    """Execution entity should return execution_date range."""
    resp = client.get("/api/data/date-range/execution")
    assert resp.status_code == 200
    data = resp.json()
    assert "execution_date" in data["date_ranges"]


def test_date_range_unknown_entity(client):
    """Unknown entity returns error."""
    resp = client.get("/api/data/date-range/nonexistent")
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data


def test_date_range_venue_no_dates(client):
    """Venue entity has no date fields."""
    resp = client.get("/api/data/date-range/venue")
    assert resp.status_code == 200
    data = resp.json()
    assert data["date_ranges"] == {}


def test_date_range_values_are_valid(client):
    """Date range min should be before max."""
    resp = client.get("/api/data/date-range/md_eod")
    data = resp.json()
    r = data["date_ranges"]["trade_date"]
    assert r["min_date"] <= r["max_date"]
