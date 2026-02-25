"""Tests for the validation service."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def val_workspace(tmp_path):
    """Create a workspace with full metadata for validation tests."""
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

    # Copy OOB manifest if it exists
    oob = real_ws / "metadata" / "oob_manifest.json"
    if oob.exists():
        (ws / "metadata").mkdir(parents=True, exist_ok=True)
        shutil.copy2(oob, ws / "metadata" / "oob_manifest.json")

    # Create alerts directory (needed by AlertService)
    (ws / "alerts" / "traces").mkdir(parents=True)

    return ws


@pytest.fixture
def client(val_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", val_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_validate_model_required_fields(client):
    """Missing required fields should fail validation."""
    resp = client.post("/api/validation/detection-model", json={
        "model_id": "",
        "name": "",
        "calculations": [],
        "query": "",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["failed"] > 0
    # Check that required field checks failed
    failed_checks = [r for r in data["results"] if not r["passed"]]
    assert any("model_id" in r["check"] for r in failed_checks)


def test_validate_model_valid(client):
    """A well-formed model should mostly pass."""
    resp = client.post("/api/validation/detection-model", json={
        "model_id": "test_model",
        "name": "Test Model",
        "calculations": [{"calc_id": "wash_detection", "strictness": "MUST_PASS"}],
        "query": "SELECT 1 AS product_id, 100.0 AS total_value",
        "context_fields": ["product_id"],
        "score_threshold_setting": "wash_score_threshold",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["passed"] > 0


def test_validate_model_bad_sql(client):
    """Invalid SQL should fail static analysis."""
    resp = client.post("/api/validation/detection-model", json={
        "model_id": "bad_sql",
        "name": "Bad SQL",
        "calculations": [],
        "query": "SELECTT INVALID FROM nowhere",
    })
    assert resp.status_code == 200
    data = resp.json()
    sql_checks = [r for r in data["results"] if r["check"] == "sql_syntax"]
    assert any(not r["passed"] for r in sql_checks)


def test_validate_calculation(client):
    """Calculation validation should check required fields."""
    resp = client.post("/api/validation/calculation", json={
        "calc_id": "test_calc",
        "name": "Test Calc",
        "logic": "SELECT 1 AS value",
        "depends_on": [],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["passed"] > 0


def test_validate_setting(client):
    """Setting validation should check required fields and overrides."""
    resp = client.post("/api/validation/setting", json={
        "setting_id": "test_setting",
        "name": "Test Setting",
        "value_type": "decimal",
        "default": 0.5,
        "overrides": [
            {"match": {"asset_class": "equity"}, "value": 0.3, "priority": 1},
            {"match": {"asset_class": "fx"}, "value": 0.4, "priority": 2},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["passed"] > 0
    # Check overrides have unique priorities
    override_checks = [r for r in data["results"] if "override" in r["check"]]
    assert all(r["passed"] for r in override_checks)


def test_validate_setting_duplicate_priorities(client):
    """Duplicate override priorities should warn."""
    resp = client.post("/api/validation/setting", json={
        "setting_id": "test_dup",
        "name": "Dup Priorities",
        "value_type": "decimal",
        "default": 1.0,
        "overrides": [
            {"match": {"asset_class": "equity"}, "value": 0.3, "priority": 1},
            {"match": {"asset_class": "fx"}, "value": 0.4, "priority": 1},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    failed = [r for r in data["results"] if not r["passed"]]
    assert any("priorities" in r["check"] for r in failed)


def test_validate_model_impact_new(client):
    """New model should show impact as 'create'."""
    resp = client.post("/api/validation/detection-model", json={
        "model_id": "brand_new_model",
        "name": "Brand New",
        "calculations": [],
        "query": "SELECT 1",
    })
    assert resp.status_code == 200
    data = resp.json()
    impact = [r for r in data["results"] if r["layer"] == "impact"]
    assert len(impact) > 0
