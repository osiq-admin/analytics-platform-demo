"""Test data/query endpoints apply PII masking — GDPR Art. 25."""
import json

import pyarrow.csv as pcsv
import pyarrow.parquet as pq
import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
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
        "metadata/governance",
        "metadata/_audit",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)

    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    # Masking policies
    (ws / "metadata" / "governance" / "masking_policies.json").write_text(
        json.dumps({
            "version": "1.0",
            "policies": [
                {
                    "policy_id": "mask_trader_name",
                    "target_entity": "trader",
                    "target_field": "trader_name",
                    "classification": "HIGH",
                    "masking_type": "partial",
                    "algorithm": "first_last_char",
                    "params": {"mask_char": "*", "visible_start": 1, "visible_end": 1},
                    "unmask_roles": ["compliance_officer", "admin"],
                    "audit_unmask": True,
                },
                {
                    "policy_id": "mask_trader_id",
                    "target_entity": "trader",
                    "target_field": "trader_id",
                    "classification": "MEDIUM",
                    "masking_type": "tokenize",
                    "algorithm": "sha256_prefix",
                    "params": {"prefix_length": 8},
                    "unmask_roles": ["compliance_officer", "admin"],
                    "audit_unmask": True,
                },
                {
                    "policy_id": "mask_order_trader_id",
                    "target_entity": "order",
                    "target_field": "trader_id",
                    "classification": "MEDIUM",
                    "masking_type": "tokenize",
                    "algorithm": "sha256_prefix",
                    "params": {"prefix_length": 8},
                    "unmask_roles": ["compliance_officer", "admin"],
                    "audit_unmask": True,
                },
                {
                    "policy_id": "mask_exec_trader_id",
                    "target_entity": "execution",
                    "target_field": "trader_id",
                    "classification": "MEDIUM",
                    "masking_type": "tokenize",
                    "algorithm": "sha256_prefix",
                    "params": {"prefix_length": 8},
                    "unmask_roles": ["compliance_officer", "admin"],
                    "audit_unmask": True,
                },
                {
                    "policy_id": "mask_account_name",
                    "target_entity": "account",
                    "target_field": "account_name",
                    "classification": "HIGH",
                    "masking_type": "partial",
                    "algorithm": "first_last_char",
                    "params": {"mask_char": "*", "visible_start": 1, "visible_end": 1},
                    "unmask_roles": ["compliance_officer", "admin"],
                    "audit_unmask": True,
                },
            ],
        })
    )

    # Roles
    (ws / "metadata" / "governance" / "roles.json").write_text(
        json.dumps({
            "version": "1.0",
            "default_role": "analyst",
            "roles": [
                {
                    "role_id": "analyst",
                    "display_name": "Surveillance Analyst",
                    "description": "Front-office",
                    "icon": "Eye",
                    "tier_access": ["gold"],
                    "classification_access": ["LOW"],
                    "can_export": False,
                    "can_view_audit": False,
                },
                {
                    "role_id": "compliance_officer",
                    "display_name": "Compliance Officer",
                    "description": "Full PII access",
                    "icon": "Shield",
                    "tier_access": ["silver", "gold"],
                    "classification_access": ["LOW", "MEDIUM", "HIGH"],
                    "can_export": True,
                    "can_view_audit": True,
                },
            ],
        })
    )

    # PII registry
    (ws / "metadata" / "governance" / "pii_registry.json").write_text(
        json.dumps({
            "registry_version": "1.0",
            "entities": {
                "trader": {
                    "pii_fields": [
                        {"field": "trader_name", "classification": "HIGH", "regulation": ["GDPR"], "masking_strategy": "hash"},
                        {"field": "trader_id", "classification": "MEDIUM", "regulation": ["MiFID II"], "masking_strategy": "pseudonymize"},
                    ]
                },
                "account": {
                    "pii_fields": [
                        {"field": "account_name", "classification": "HIGH", "regulation": ["GDPR"], "masking_strategy": "hash"},
                    ]
                },
            },
        })
    )

    # CSV data
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    (ws / "data" / "parquet").mkdir(parents=True)

    (csv_dir / "trader.csv").write_text(
        "trader_id,trader_name,desk,trader_type\n"
        "T001,Alice Smith,Equities,senior\n"
        "T002,Bob Jones,FX,junior\n"
    )
    (csv_dir / "product.csv").write_text(
        "product_id,isin,asset_class\n"
        "P001,US1234567890,equity\n"
    )
    (csv_dir / "order.csv").write_text(
        "order_id,trader_id,product_id,order_type,limit_price,time_in_force,order_date,order_time,account_id\n"
        "ORD-001,T001,P001,LIMIT,100.50,DAY,2026-03-01,09:30:00,A001\n"
    )
    (csv_dir / "execution.csv").write_text(
        "execution_id,order_id,trader_id,exec_type,venue_mic,execution_date,execution_time,account_id\n"
        "EXC-001,ORD-001,T001,NEW,XNYS,2026-03-01,09:30:01,A001\n"
    )
    (csv_dir / "account.csv").write_text(
        "account_id,account_name,type,registration_country\n"
        "A001,ACME Corp,institutional,United States\n"
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)

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


class TestDataPreviewMasking:
    def test_trader_preview_has_pii_columns(self, client):
        resp = client.get("/api/data/files/trader/preview?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "pii_columns" in data

    def test_trader_preview_masks_name(self, client):
        resp = client.get("/api/data/files/trader/preview?limit=5")
        data = resp.json()
        rows = data.get("rows", [])
        assert len(rows) > 0
        assert "*" in rows[0]["trader_name"], "GDPR Art. 25: trader_name unmasked"

    def test_trader_preview_pii_metadata(self, client):
        resp = client.get("/api/data/files/trader/preview?limit=1")
        pii = resp.json().get("pii_columns", {})
        assert "trader_name" in pii
        assert pii["trader_name"]["classification"] == "HIGH"

    def test_product_preview_no_pii(self, client):
        resp = client.get("/api/data/files/product/preview?limit=5")
        data = resp.json()
        assert data.get("pii_columns", {}) == {}


class TestOrdersMasking:
    def test_orders_endpoint_masks_trader_id(self, client):
        resp = client.get("/api/data/orders?limit=5")
        data = resp.json()
        orders = data.get("orders", [])
        assert len(orders) > 0
        # tokenized = 8 hex chars
        assert len(orders[0]["trader_id"]) == 8, "order trader_id should be tokenized"

    def test_executions_masks_trader_id(self, client):
        resp = client.get("/api/data/orders?limit=5")
        data = resp.json()
        execs = data.get("executions", [])
        assert len(execs) > 0
        assert len(execs[0]["trader_id"]) == 8, "execution trader_id should be tokenized"


class TestQueryMasking:
    def test_query_masks_trader_pii(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT * FROM trader LIMIT 3"})
        data = resp.json()
        rows = data.get("rows", [])
        assert len(rows) > 0
        assert "*" in rows[0]["trader_name"]

    def test_query_pii_columns_metadata(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT * FROM trader LIMIT 3"})
        data = resp.json()
        pii = data.get("pii_columns", {})
        assert "trader_name" in pii

    def test_query_non_pii_unchanged(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT * FROM product LIMIT 3"})
        data = resp.json()
        assert data.get("pii_columns", {}) == {}

    def test_query_account_masks_name(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT * FROM account LIMIT 3"})
        data = resp.json()
        rows = data.get("rows", [])
        assert len(rows) > 0
        assert "*" in rows[0]["account_name"]
