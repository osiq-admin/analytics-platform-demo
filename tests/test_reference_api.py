"""Tests for Reference Data REST API."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    # Required metadata dirs for app startup
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/calculations/time_windows",
        "metadata/calculations/derived",
        "metadata/calculations/aggregations",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/settings/score_thresholds",
        "metadata/detection_models",
        "metadata/navigation",
        "metadata/widgets",
        "metadata/format_rules",
        "metadata/query_presets",
        "metadata/grids",
        "metadata/view_config",
        "metadata/theme",
        "metadata/workflows",
        "metadata/demo",
        "metadata/tours",
        "metadata/standards/iso",
        "metadata/standards/fix",
        "metadata/standards/compliance",
        "metadata/mappings",
        "metadata/regulations",
        "metadata/match_patterns",
        "metadata/score_templates",
        "metadata/medallion",
        "metadata/quality",
        "metadata/reference",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    # Reference configs
    ref_dir = ws / "metadata" / "reference"
    (ref_dir / "product.json").write_text(
        json.dumps(
            {
                "entity": "product",
                "golden_key": "isin",
                "display_name": "Product Master",
                "description": "Product reference",
                "match_rules": [
                    {"strategy": "exact", "fields": ["isin"], "threshold": 1.0, "weight": 1.0}
                ],
                "merge_rules": [
                    {"field": "name", "strategy": "longest", "source_priority": []}
                ],
                "external_sources": [],
                "auto_reconcile": True,
                "reconciliation_schedule": "on_demand",
            }
        )
    )
    (ref_dir / "venue.json").write_text(
        json.dumps(
            {
                "entity": "venue",
                "golden_key": "mic",
                "display_name": "Venue Master",
                "description": "Venue reference",
                "match_rules": [
                    {"strategy": "exact", "fields": ["mic"], "threshold": 1.0, "weight": 1.0}
                ],
                "merge_rules": [],
                "external_sources": [],
                "auto_reconcile": True,
                "reconciliation_schedule": "on_demand",
            }
        )
    )

    # CSV data
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    (ws / "data" / "parquet").mkdir(parents=True)

    (csv_dir / "product.csv").write_text(
        "product_id,isin,name,asset_class,cfi_code\n"
        "AAPL,US0378331005,Apple Inc.,equity,ESXXXX\n"
        "MSFT,US5949181045,Microsoft Corp,equity,ESXXXX\n"
    )
    (csv_dir / "venue.csv").write_text(
        "mic,name,country,timezone\n" "XNYS,NYSE,US,America/New_York\n"
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)

    import pyarrow.csv as pcsv
    import pyarrow.parquet as pq

    # The TestClient triggers the lifespan which connects db_manager to a file DB
    # and sets app.state.db / app.state.metadata. We then load CSV data into that DB.
    with TestClient(app, raise_server_exceptions=False) as c:
        db = app.state.db
        csv_dir = workspace / "data" / "csv"
        parquet_dir = workspace / "data" / "parquet"

        for csv_path in csv_dir.glob("*.csv"):
            table_name = csv_path.stem
            arrow_table = pcsv.read_csv(csv_path)
            parquet_path = parquet_dir / f"{table_name}.parquet"
            pq.write_table(arrow_table, parquet_path)
            cursor = db.cursor()
            cursor.execute(f'DROP VIEW IF EXISTS "{table_name}"')
            cursor.execute(
                f"CREATE VIEW \"{table_name}\" AS SELECT * FROM read_parquet('{parquet_path}')"
            )
            cursor.close()

        yield c


class TestReferenceAPI:
    def test_list_configs(self, client):
        """GET /api/reference/configs returns all reference configs."""
        r = client.get("/api/reference/configs")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        entities = [c["entity"] for c in data]
        assert "product" in entities
        assert "venue" in entities

    def test_get_config_product(self, client):
        """GET /api/reference/configs/product returns product config."""
        r = client.get("/api/reference/configs/product")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "product"
        assert data["golden_key"] == "isin"
        assert data["display_name"] == "Product Master"

    def test_get_config_not_found(self, client):
        """GET /api/reference/configs/nonexistent returns 404."""
        r = client.get("/api/reference/configs/nonexistent")
        assert r.status_code == 404
        assert "error" in r.json()

    def test_list_golden_records_empty(self, client):
        """GET /api/reference/product returns empty set before reconciliation."""
        r = client.get("/api/reference/product")
        assert r.status_code == 200
        data = r.json()
        assert data["record_count"] == 0
        assert data["records"] == []

    def test_reconcile_creates_golden_records(self, client):
        """POST /api/reference/product/reconcile creates golden records from CSV."""
        r = client.post("/api/reference/product/reconcile")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "product"
        assert data["total_golden_records"] == 2
        assert data["total_source_records"] == 2
        assert data["new_records"] == 2

    def test_reconcile_not_found(self, client):
        """POST /api/reference/nonexistent/reconcile returns 404."""
        r = client.post("/api/reference/nonexistent/reconcile")
        assert r.status_code == 404

    def test_list_golden_records_after_reconcile(self, client):
        """After reconciliation, golden records are listed."""
        client.post("/api/reference/product/reconcile")
        r = client.get("/api/reference/product")
        assert r.status_code == 200
        data = r.json()
        assert data["record_count"] == 2
        assert len(data["records"]) == 2

    def test_get_single_golden_record(self, client):
        """GET /api/reference/product/{golden_id} returns a single record."""
        client.post("/api/reference/product/reconcile")
        records = client.get("/api/reference/product").json()
        gid = records["records"][0]["golden_id"]
        r = client.get(f"/api/reference/product/{gid}")
        assert r.status_code == 200
        assert r.json()["golden_id"] == gid

    def test_get_golden_record_not_found(self, client):
        """GET /api/reference/product/GR-FAKE-9999 returns 404."""
        r = client.get("/api/reference/product/GR-FAKE-9999")
        assert r.status_code == 404

    def test_get_sources(self, client):
        """GET /api/reference/product/{id}/sources returns provenance."""
        client.post("/api/reference/product/reconcile")
        records = client.get("/api/reference/product").json()
        gid = records["records"][0]["golden_id"]
        r = client.get(f"/api/reference/product/{gid}/sources")
        assert r.status_code == 200
        data = r.json()
        assert data["golden_id"] == gid
        assert data["entity"] == "product"
        assert "provenance" in data
        assert "source_records" in data
        assert len(data["source_records"]) > 0

    def test_get_sources_not_found(self, client):
        """GET /api/reference/product/GR-FAKE-9999/sources returns 404."""
        r = client.get("/api/reference/product/GR-FAKE-9999/sources")
        assert r.status_code == 404

    def test_override_field(self, client):
        """POST /api/reference/product/{id}/override updates field value."""
        client.post("/api/reference/product/reconcile")
        records = client.get("/api/reference/product").json()
        gid = records["records"][0]["golden_id"]
        r = client.post(
            f"/api/reference/product/{gid}/override",
            json={"field": "name", "value": "Override Name", "notes": "test override"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["data"]["name"] == "Override Name"
        assert data["status"] == "manual_override"

    def test_override_not_found(self, client):
        """POST /api/reference/product/GR-FAKE-9999/override returns 404."""
        r = client.post(
            "/api/reference/product/GR-FAKE-9999/override",
            json={"field": "name", "value": "X"},
        )
        assert r.status_code == 404

    def test_summary_endpoint(self, client):
        """GET /api/reference/product/summary returns reconciliation stats."""
        client.post("/api/reference/product/reconcile")
        r = client.get("/api/reference/product/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "product"
        assert data["total_records"] == 2
        assert "confidence_distribution" in data
        assert "status_distribution" in data
        assert "last_reconciled" in data

    def test_summary_empty(self, client):
        """GET /api/reference/product/summary returns zeros before reconciliation."""
        r = client.get("/api/reference/product/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["total_records"] == 0

    def test_cross_references(self, client):
        """GET /api/reference/product/{id}/cross-references returns list."""
        client.post("/api/reference/product/reconcile")
        records = client.get("/api/reference/product").json()
        gid = records["records"][0]["golden_id"]
        r = client.get(f"/api/reference/product/{gid}/cross-references")
        assert r.status_code == 200
        # Returns a list (may be empty since no execution/order data in fixture)
        assert isinstance(r.json(), list)

    def test_reconcile_idempotent(self, client):
        """POST reconcile twice: first generates, second re-reconciles."""
        r1 = client.post("/api/reference/product/reconcile")
        assert r1.status_code == 200
        assert r1.json()["new_records"] == 2

        r2 = client.post("/api/reference/product/reconcile")
        assert r2.status_code == 200
        # Second run goes through reconcile path (existing records)
        assert r2.json()["total_golden_records"] == 2
