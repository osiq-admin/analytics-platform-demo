"""Tests for entity compliance fields: account MiFID II classification and product regulatory jurisdiction."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.engine.data_loader import DataLoader
from backend.main import app


@pytest.fixture
def compliance_workspace(tmp_path):
    """Create a temporary workspace with real metadata and generated CSV data."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata
    for subdir in ["entities", "calculations", "settings", "detection_models", "query_presets"]:
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

    # Create snapshots dir
    (ws / "snapshots").mkdir(exist_ok=True)

    return ws


@pytest.fixture
def client(compliance_workspace, monkeypatch):
    """Create a test client with data loaded into DuckDB."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", compliance_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        # Load CSV data into DuckDB (lifespan creates the DB but doesn't load CSVs)
        loader = DataLoader(compliance_workspace, app.state.db)
        loader.load_all()
        yield tc


class TestAccountCompliance:
    def test_account_has_mifid_classification(self, client):
        resp = client.get("/api/metadata/entities")
        account = next((e for e in resp.json() if e["entity_id"] == "account"), None)
        assert account is not None
        field_names = [f["name"] for f in account["fields"]]
        assert "mifid_client_category" in field_names

    def test_mifid_classification_has_domain_values(self, client):
        resp = client.get("/api/metadata/entities")
        account = next((e for e in resp.json() if e["entity_id"] == "account"), None)
        field = next((f for f in account["fields"] if f["name"] == "mifid_client_category"), None)
        assert field is not None
        assert "retail" in field["domain_values"]
        assert "professional" in field["domain_values"]
        assert "eligible_counterparty" in field["domain_values"]

    def test_account_has_compliance_status(self, client):
        resp = client.get("/api/metadata/entities")
        account = next((e for e in resp.json() if e["entity_id"] == "account"), None)
        field_names = [f["name"] for f in account["fields"]]
        assert "compliance_status" in field_names

    def test_account_compliance_fields_in_data(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT mifid_client_category, compliance_status FROM account LIMIT 5"})
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        assert len(rows) > 0
        for row in rows:
            assert row["mifid_client_category"] in ("retail", "professional", "eligible_counterparty")
            assert row["compliance_status"] in ("active", "under_review", "restricted", "suspended")


class TestProductCompliance:
    def test_product_has_regulatory_scope(self, client):
        resp = client.get("/api/metadata/entities")
        product = next((e for e in resp.json() if e["entity_id"] == "product"), None)
        assert product is not None
        field_names = [f["name"] for f in product["fields"]]
        assert "regulatory_scope" in field_names

    def test_regulatory_scope_has_domain_values(self, client):
        resp = client.get("/api/metadata/entities")
        product = next((e for e in resp.json() if e["entity_id"] == "product"), None)
        field = next((f for f in product["fields"] if f["name"] == "regulatory_scope"), None)
        assert field is not None
        assert "EU" in field["domain_values"]
        assert "US" in field["domain_values"]

    def test_product_regulatory_scope_in_data(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT regulatory_scope FROM product LIMIT 5"})
        assert resp.status_code == 200
        for row in resp.json()["rows"]:
            assert row["regulatory_scope"] in ("EU", "US", "UK", "APAC", "MULTI")


class TestDetectionModelRegulatoryCoverage:
    def test_wash_model_covers_sec(self, client):
        resp = client.get("/api/metadata/detection-models")
        wash = next((m for m in resp.json() if m["model_id"] == "wash_full_day"), None)
        assert wash is not None
        regs = [rc["regulation"] for rc in wash["regulatory_coverage"]]
        assert "SEC" in regs

    def test_insider_model_covers_sec(self, client):
        resp = client.get("/api/metadata/detection-models")
        insider = next((m for m in resp.json() if m["model_id"] == "insider_dealing"), None)
        assert insider is not None
        regs = [rc["regulation"] for rc in insider["regulatory_coverage"]]
        assert "SEC" in regs

    def test_all_models_have_multi_jurisdiction(self, client):
        """Every model should reference at least 2 different regulations."""
        resp = client.get("/api/metadata/detection-models")
        for model in resp.json():
            regs = set(rc["regulation"] for rc in model["regulatory_coverage"])
            assert len(regs) >= 2, f"Model {model['model_id']} only covers {regs}"
