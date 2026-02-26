"""Tests for domain values API."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.engine.data_loader import DataLoader
from backend.main import app


@pytest.fixture
def dv_workspace(tmp_path):
    """Create a workspace with metadata and CSV data for domain value tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata (entities, calculations, settings, detection_models)
    for subdir in ["entities", "calculations", "settings", "detection_models"]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Copy CSV data
    csv_src = real_ws / "data" / "csv"
    if csv_src.exists():
        shutil.copytree(csv_src, ws / "data" / "csv")

    return ws


@pytest.fixture
def client(dv_workspace, monkeypatch):
    """Create a test client with DuckDB loaded from workspace CSV data.

    The lifespan sets up app.state.db and app.state.metadata from
    config.settings.workspace_dir. By patching workspace_dir before
    entering TestClient, the lifespan uses our temp workspace.
    After the client starts, we load CSV data into the lifespan DB.
    """
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", dv_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        # Load CSV data into the DB that lifespan created
        loader = DataLoader(dv_workspace, app.state.db)
        loader.load_all()
        yield tc


def test_domain_values_asset_class(client):
    """Returns domain values for product.asset_class."""
    resp = client.get("/api/metadata/domain-values/product/asset_class")
    assert resp.status_code == 200
    data = resp.json()
    assert "metadata_values" in data
    assert "data_values" in data
    assert "combined" in data
    assert "cardinality" in data
    assert "equity" in data["combined"]


def test_domain_values_cardinality_small(client):
    """asset_class has <=50 values — cardinality is 'small'."""
    resp = client.get("/api/metadata/domain-values/product/asset_class")
    data = resp.json()
    assert data["cardinality"] == "small"


def test_domain_values_search(client):
    """Search filter narrows results."""
    resp = client.get("/api/metadata/domain-values/product/product_id?search=AAPL")
    assert resp.status_code == 200
    data = resp.json()
    assert any("AAPL" in v for v in data["combined"])


def test_domain_values_limit(client):
    """Limit parameter caps results."""
    resp = client.get("/api/metadata/domain-values/product/product_id?limit=5")
    data = resp.json()
    assert len(data["combined"]) <= 5


def test_domain_values_total_count(client):
    """total_count reflects actual distinct values."""
    resp = client.get("/api/metadata/domain-values/product/product_id")
    data = resp.json()
    assert data["total_count"] == 50  # 50 products


def test_match_keys(client):
    """Returns usable match keys from entity fields."""
    resp = client.get("/api/metadata/domain-values/match-keys")
    assert resp.status_code == 200
    data = resp.json()
    keys = [k["key"] for k in data["match_keys"]]
    assert "asset_class" in keys
    assert "exchange_mic" in keys


def test_match_keys_include_domain_values(client):
    """Match keys include domain_values when available."""
    resp = client.get("/api/metadata/domain-values/match-keys")
    data = resp.json()
    ac_key = next(k for k in data["match_keys"] if k["key"] == "asset_class")
    assert ac_key["domain_values"] is not None
    assert "equity" in ac_key["domain_values"]


def test_setting_ids(client):
    """Returns setting IDs, filterable by value_type."""
    resp = client.get("/api/metadata/domain-values/setting-ids?value_type=decimal")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["settings"]) > 0
    for s in data["settings"]:
        assert s["value_type"] == "decimal"


def test_setting_ids_score_steps(client):
    """Returns score_steps settings."""
    resp = client.get("/api/metadata/domain-values/setting-ids?value_type=score_steps")
    data = resp.json()
    assert len(data["settings"]) > 0


def test_calculation_ids(client):
    """Returns calculation IDs with metadata."""
    resp = client.get("/api/metadata/domain-values/calculation-ids")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["calculations"]) == 10
    calc = data["calculations"][0]
    assert "calc_id" in calc
    assert "name" in calc
    assert "layer" in calc
    assert "value_field" in calc


def test_calculation_ids_filter_layer(client):
    """Filter calculations by layer."""
    resp = client.get("/api/metadata/domain-values/calculation-ids?layer=derived")
    data = resp.json()
    for c in data["calculations"]:
        assert c["layer"] == "derived"


def test_unknown_entity(client):
    """Unknown entity returns empty."""
    resp = client.get("/api/metadata/domain-values/nonexistent/field")
    assert resp.status_code == 200
    data = resp.json()
    assert data["combined"] == []


def test_unknown_field(client):
    """Unknown field returns empty with data from SQL fallback."""
    resp = client.get("/api/metadata/domain-values/product/nonexistent_field")
    assert resp.status_code == 200
    data = resp.json()
    assert data["metadata_values"] == []


def test_metadata_values_priority(client):
    """Metadata values appear before data values in combined."""
    resp = client.get("/api/metadata/domain-values/product/asset_class")
    data = resp.json()
    if data["metadata_values"] and data["combined"]:
        assert data["combined"][0] in data["metadata_values"]


def test_get_domain_values_returns_metadata_and_data(client):
    """Verify endpoint returns both metadata_values and data_values for field with known domain values."""
    resp = client.get("/api/metadata/domain-values/account/risk_rating")
    assert resp.status_code == 200
    data = resp.json()
    # account.risk_rating has domain_values: ["LOW", "MEDIUM", "HIGH"]
    assert len(data["metadata_values"]) > 0
    assert "LOW" in data["metadata_values"]
    assert "MEDIUM" in data["metadata_values"]
    assert "HIGH" in data["metadata_values"]
    # data_values should come from DuckDB
    assert isinstance(data["data_values"], list)


def test_domain_values_empty_field(client):
    """For a field without domain_values, metadata_values should be empty, data_values from DuckDB."""
    resp = client.get("/api/metadata/domain-values/account/account_id")
    assert resp.status_code == 200
    data = resp.json()
    assert data["metadata_values"] == []
    # data_values should have actual account IDs from the database
    assert len(data["data_values"]) > 0
