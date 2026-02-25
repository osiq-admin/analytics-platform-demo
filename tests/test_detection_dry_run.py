"""Tests for the detection model dry run endpoint."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def dr_workspace(tmp_path):
    """Create a workspace with full metadata for dry run tests."""
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

    return ws


@pytest.fixture
def client(dr_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", dr_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_dry_run_no_query(client):
    """Dry run with empty query returns error."""
    resp = client.post("/api/detection-models/dry-run", json={
        "model_id": "test_model",
        "name": "Test Model",
        "query": "",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "error"
    assert "No query provided" in data["error"]
    assert data["alerts"] == []


def test_dry_run_with_query(client):
    """Dry run with valid SQL returns results."""
    resp = client.post("/api/detection-models/dry-run", json={
        "model_id": "test_model",
        "name": "Test Model",
        "query": "SELECT 1 AS product_id, 100.0 AS value",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["row_count"] == 1
    assert data["preview_count"] == 1
    assert len(data["alerts"]) == 1
    assert "product_id" in data["columns"]
    assert "value" in data["columns"]
    # Check raw_row contains the values
    raw = data["alerts"][0]["raw_row"]
    assert raw["product_id"] == "1"
    assert raw["value"] == "100.0"


def test_dry_run_with_calculations(client):
    """Dry run includes calculation details when calculations are provided."""
    resp = client.post("/api/detection-models/dry-run", json={
        "model_id": "test_model",
        "name": "Test Model",
        "query": "SELECT 'AAPL' AS product_id, 'ACC001' AS account_id, 50000.0 AS total_value, 0.9 AS qty_match",
        "context_fields": ["product_id", "account_id"],
        "calculations": [
            {"calc_id": "large_activity", "value_field": "total_value", "strictness": "OPTIONAL"},
            {"calc_id": "qty_match_ratio", "value_field": "qty_match", "strictness": "MUST_PASS"},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["row_count"] == 1

    alert = data["alerts"][0]
    # Entity context should include product_id and account_id
    assert alert["entity_context"]["product_id"] == "AAPL"
    assert alert["entity_context"]["account_id"] == "ACC001"

    # Calculation details
    assert len(alert["calculation_details"]) == 2
    calc_ids = [cd["calc_id"] for cd in alert["calculation_details"]]
    assert "large_activity" in calc_ids
    assert "qty_match_ratio" in calc_ids

    # Check computed values are extracted from the row
    for cd in alert["calculation_details"]:
        if cd["calc_id"] == "large_activity":
            assert cd["computed_value"] == 50000.0
            assert cd["strictness"] == "OPTIONAL"
        elif cd["calc_id"] == "qty_match_ratio":
            assert cd["computed_value"] == 0.9
            assert cd["strictness"] == "MUST_PASS"
