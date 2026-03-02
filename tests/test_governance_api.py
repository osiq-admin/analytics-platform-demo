"""Tests for Governance REST API — masking preview, RBAC switching, audit log."""

import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    # Required metadata directories for app startup
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

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    # Governance: masking policies
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
            ],
        })
    )

    # Governance: roles
    (ws / "metadata" / "governance" / "roles.json").write_text(
        json.dumps({
            "version": "1.0",
            "default_role": "analyst",
            "roles": [
                {
                    "role_id": "analyst",
                    "display_name": "Surveillance Analyst",
                    "description": "Front-office surveillance analyst",
                    "icon": "Eye",
                    "tier_access": ["gold", "platinum"],
                    "classification_access": ["LOW"],
                    "can_export": False,
                    "can_view_audit": False,
                },
                {
                    "role_id": "compliance_officer",
                    "display_name": "Compliance Officer",
                    "description": "Full PII access",
                    "icon": "Shield",
                    "tier_access": ["silver", "gold", "platinum"],
                    "classification_access": ["LOW", "MEDIUM", "HIGH"],
                    "can_export": True,
                    "can_view_audit": True,
                },
                {
                    "role_id": "data_engineer",
                    "display_name": "Data Engineer",
                    "description": "Pipeline access",
                    "icon": "Wrench",
                    "tier_access": ["landing", "bronze", "silver", "gold"],
                    "classification_access": ["LOW"],
                    "can_export": False,
                    "can_view_audit": False,
                },
                {
                    "role_id": "admin",
                    "display_name": "Administrator",
                    "description": "Full access",
                    "icon": "Crown",
                    "tier_access": ["landing", "bronze", "silver", "gold", "platinum"],
                    "classification_access": ["LOW", "MEDIUM", "HIGH"],
                    "can_export": True,
                    "can_view_audit": True,
                },
            ],
        })
    )

    # Seed an audit record to test audit-log endpoint
    (ws / "metadata" / "_audit" / "20260301T000000000000_trader_T001_update.json").write_text(
        json.dumps({
            "timestamp": "2026-03-01T00:00:00+00:00",
            "metadata_type": "trader",
            "item_id": "T001",
            "action": "update",
            "previous_value": {"trader_name": "Alice Smith", "trader_id": "T001"},
            "new_value": {"trader_name": "Alice B. Smith", "trader_id": "T001"},
        })
    )

    # CSV data — trader entity
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    (ws / "data" / "parquet").mkdir(parents=True)

    (csv_dir / "trader.csv").write_text(
        "trader_id,trader_name,desk,trader_type\n"
        "T001,Alice Smith,Equities,senior\n"
        "T002,Bob Jones,FX,junior\n"
        "T003,Carol White,Rates,senior\n"
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)

    import pyarrow.csv as pcsv
    import pyarrow.parquet as pq

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


# ---------------------------------------------------------------------------
# 1. Roles
# ---------------------------------------------------------------------------


class TestRoles:
    def test_list_roles(self, client):
        """GET /api/governance/roles returns 200 with roles list and current role."""
        r = client.get("/api/governance/roles")
        assert r.status_code == 200
        data = r.json()
        assert "roles" in data
        assert "current_role" in data
        assert len(data["roles"]) == 4
        assert data["current_role"] == "analyst"

    def test_get_current_role(self, client):
        """GET /api/governance/current-role returns analyst by default."""
        r = client.get("/api/governance/current-role")
        assert r.status_code == 200
        data = r.json()
        assert data["role_id"] == "analyst"
        assert data["display_name"] == "Surveillance Analyst"

    def test_switch_role(self, client):
        """POST /api/governance/switch-role switches to compliance_officer."""
        r = client.post("/api/governance/switch-role", json={"role_id": "compliance_officer"})
        assert r.status_code == 200
        data = r.json()
        assert data["role_id"] == "compliance_officer"
        assert data["display_name"] == "Compliance Officer"

        # Verify it stuck
        r2 = client.get("/api/governance/current-role")
        assert r2.json()["role_id"] == "compliance_officer"

    def test_switch_role_invalid(self, client):
        """POST /api/governance/switch-role with bad role returns 400."""
        r = client.post("/api/governance/switch-role", json={"role_id": "nonexistent_role"})
        assert r.status_code == 400
        assert "error" in r.json()


# ---------------------------------------------------------------------------
# 2. Masking policies
# ---------------------------------------------------------------------------


class TestMaskingPolicies:
    def test_list_masking_policies(self, client):
        """GET /api/governance/masking-policies returns policies list."""
        r = client.get("/api/governance/masking-policies")
        assert r.status_code == 200
        data = r.json()
        assert "policies" in data
        assert len(data["policies"]) == 2
        ids = [p["policy_id"] for p in data["policies"]]
        assert "mask_trader_name" in ids
        assert "mask_trader_id" in ids


# ---------------------------------------------------------------------------
# 3. Masked preview
# ---------------------------------------------------------------------------


class TestMaskedPreview:
    def test_masked_preview_trader(self, client):
        """GET /api/governance/masked-preview/trader returns masked records as analyst."""
        r = client.get("/api/governance/masked-preview/trader")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "trader"
        assert data["role"] == "analyst"
        assert len(data["records"]) == 3
        assert "masking_metadata" in data

        # Analyst should see masked trader_name (partial masking)
        first = data["records"][0]
        assert first["trader_name"] != "Alice Smith"  # masked
        assert "*" in first["trader_name"]  # partial mask uses *

        # trader_id should be tokenized (8 hex chars)
        assert first["trader_id"] != "T001"
        assert len(first["trader_id"]) == 8

    def test_masked_preview_entity_not_found(self, client):
        """GET /api/governance/masked-preview/nonexistent returns 404."""
        r = client.get("/api/governance/masked-preview/nonexistent")
        assert r.status_code == 404
        assert "error" in r.json()

    def test_masked_preview_unmasked_for_compliance(self, client):
        """Compliance officer sees unmasked trader data."""
        # Switch to compliance_officer first
        client.post("/api/governance/switch-role", json={"role_id": "compliance_officer"})

        r = client.get("/api/governance/masked-preview/trader")
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "compliance_officer"

        # Compliance officer is in unmask_roles — data should be unmasked
        first = data["records"][0]
        assert first["trader_name"] == "Alice Smith"
        assert first["trader_id"] == "T001"


# ---------------------------------------------------------------------------
# 4. Role comparison
# ---------------------------------------------------------------------------


class TestRoleComparison:
    def test_role_comparison_trader(self, client):
        """GET /api/governance/role-comparison/trader returns field-level comparison."""
        r = client.get("/api/governance/role-comparison/trader")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "trader"
        assert "fields" in data

        # Should have field entries
        fields = {f["field"]: f for f in data["fields"]}
        assert "trader_name" in fields
        assert "trader_id" in fields

        # Each field should have values for all 4 roles
        tn = fields["trader_name"]["values"]
        assert "analyst" in tn
        assert "compliance_officer" in tn
        assert "data_engineer" in tn
        assert "admin" in tn

        # Analyst trader_name should be masked
        assert tn["analyst"]["masked"] is True

        # Compliance officer trader_name should be unmasked
        assert tn["compliance_officer"]["masked"] is False

    def test_role_comparison_not_found(self, client):
        """GET /api/governance/role-comparison/nonexistent returns 404."""
        r = client.get("/api/governance/role-comparison/nonexistent")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# 5. Audit log
# ---------------------------------------------------------------------------


class TestAuditLog:
    def test_audit_log_denied(self, client):
        """GET /api/governance/audit-log as analyst returns access denied."""
        r = client.get("/api/governance/audit-log")
        assert r.status_code == 200
        data = r.json()
        assert data["entries"] == []
        assert "Access denied" in data["message"]

    def test_audit_log_allowed_for_compliance(self, client):
        """GET /api/governance/audit-log as compliance_officer returns entries."""
        client.post("/api/governance/switch-role", json={"role_id": "compliance_officer"})
        r = client.get("/api/governance/audit-log")
        assert r.status_code == 200
        data = r.json()
        assert len(data["entries"]) >= 1
        # Compliance officer is in unmask_roles, so PII should be unmasked
        entry = data["entries"][0]
        assert entry["new_value"]["trader_name"] == "Alice B. Smith"

    def test_audit_log_masked_for_admin(self, client):
        """GET /api/governance/audit-log as admin returns entries with unmasked PII."""
        client.post("/api/governance/switch-role", json={"role_id": "admin"})
        r = client.get("/api/governance/audit-log")
        assert r.status_code == 200
        data = r.json()
        assert len(data["entries"]) >= 1
        entry = data["entries"][0]
        # Admin is in unmask_roles — PII should pass through
        assert entry["new_value"]["trader_name"] == "Alice B. Smith"
        assert entry["new_value"]["trader_id"] == "T001"
