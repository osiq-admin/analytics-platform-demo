"""Contract tests: governance API response shapes match frontend TypeScript interfaces.

These tests validate the *structure* of API responses, not just status codes.
They ensure that when the backend returns data, it matches the TypeScript
interfaces in frontend/src/stores/governanceStore.ts:
  - RoleDefinition: role_id, display_name, description, icon, tier_access,
    classification_access, can_export, can_view_audit
  - RoleComparisonResponse: { entity, fields: [{ field, values: { role_id:
    { value, masked, masking_type } } }] }
  - AuditLogResponse: { entries: [{ timestamp, metadata_type, item_id, action,
    previous_value, new_value }] }
  - MaskingPolicy shape: { policies: [{ policy_id, target_entity, target_field,
    masking_type, ... }] }
"""

import json

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
    (ws / "metadata" / "governance" / "masking_policies.json").write_text(
        json.dumps({
            "version": "1.0",
            "policies": [{
                "policy_id": "mask_trader_name",
                "target_entity": "trader",
                "target_field": "trader_name",
                "classification": "HIGH",
                "masking_type": "partial",
                "algorithm": "first_last_char",
                "params": {"mask_char": "*", "visible_start": 1, "visible_end": 1},
                "unmask_roles": ["compliance_officer", "admin"],
                "audit_unmask": True,
            }],
        })
    )
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
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    (ws / "data" / "parquet").mkdir(parents=True)
    (csv_dir / "trader.csv").write_text(
        "trader_id,trader_name,desk,trader_type\n"
        "T001,Alice Smith,Equities,senior\n"
        "T002,Bob Jones,FX,junior\n"
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


class TestRolesContract:
    """Validate /api/governance/roles matches frontend RoleDefinition[]."""

    def test_roles_response_has_required_top_level_keys(self, client):
        r = client.get("/api/governance/roles")
        assert r.status_code == 200
        data = r.json()
        assert "roles" in data
        assert "current_role" in data
        assert isinstance(data["roles"], list)
        assert isinstance(data["current_role"], str)

    def test_each_role_has_all_required_fields(self, client):
        r = client.get("/api/governance/roles")
        data = r.json()
        required_fields = {
            "role_id", "display_name", "description", "icon",
            "tier_access", "classification_access", "can_export", "can_view_audit",
        }
        for role in data["roles"]:
            missing = required_fields - set(role.keys())
            assert not missing, f"Role '{role.get('role_id')}' missing: {missing}"
            assert isinstance(role["tier_access"], list)
            assert isinstance(role["classification_access"], list)
            assert isinstance(role["can_export"], bool)
            assert isinstance(role["can_view_audit"], bool)

    def test_current_role_response_shape(self, client):
        r = client.get("/api/governance/current-role")
        assert r.status_code == 200
        data = r.json()
        assert "role_id" in data
        assert "display_name" in data
        assert isinstance(data["role_id"], str)
        assert isinstance(data["display_name"], str)

    def test_switch_role_returns_full_role_definition(self, client):
        r = client.post(
            "/api/governance/switch-role",
            json={"role_id": "compliance_officer"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["role_id"] == "compliance_officer"
        assert "display_name" in data
        assert "tier_access" in data


class TestMaskedPreviewContract:
    """Validate /api/governance/masked-preview/{entity} response shape."""

    def test_response_has_required_keys(self, client):
        r = client.get("/api/governance/masked-preview/trader")
        assert r.status_code == 200
        data = r.json()
        required = {"entity", "role", "records", "masking_metadata"}
        assert required <= set(data.keys()), f"Missing: {required - set(data.keys())}"

    def test_records_are_list_of_dicts(self, client):
        r = client.get("/api/governance/masked-preview/trader")
        data = r.json()
        assert isinstance(data["records"], list)
        assert len(data["records"]) > 0
        for rec in data["records"]:
            assert isinstance(rec, dict)

    def test_masking_metadata_is_dict(self, client):
        r = client.get("/api/governance/masked-preview/trader")
        data = r.json()
        assert isinstance(data["masking_metadata"], dict)

    def test_entity_and_role_are_strings(self, client):
        r = client.get("/api/governance/masked-preview/trader")
        data = r.json()
        assert isinstance(data["entity"], str)
        assert isinstance(data["role"], str)


class TestRoleComparisonContract:
    """Validate /api/governance/role-comparison/{entity} field-level shape.

    Frontend expects: { entity, fields: [{ field, values: { role_id:
    { value, masked, masking_type } } }] }
    This was the bug that shipped -- old format had {roles: {analyst:
    {records}}} instead.
    """

    def test_response_has_entity_and_fields(self, client):
        r = client.get("/api/governance/role-comparison/trader")
        assert r.status_code == 200
        data = r.json()
        assert "entity" in data
        assert "fields" in data
        assert "roles" not in data, "Old format detected -- should use 'fields', not 'roles'"

    def test_fields_is_list_with_correct_shape(self, client):
        r = client.get("/api/governance/role-comparison/trader")
        data = r.json()
        assert isinstance(data["fields"], list)
        assert len(data["fields"]) > 0
        for field_entry in data["fields"]:
            assert "field" in field_entry, "Each entry must have 'field' key"
            assert "values" in field_entry, "Each entry must have 'values' key"
            assert isinstance(field_entry["field"], str)
            assert isinstance(field_entry["values"], dict)

    def test_field_values_have_role_level_shape(self, client):
        r = client.get("/api/governance/role-comparison/trader")
        data = r.json()
        for field_entry in data["fields"]:
            for role_id, role_val in field_entry["values"].items():
                assert "value" in role_val, \
                    f"Field '{field_entry['field']}' role '{role_id}' missing 'value'"
                assert "masked" in role_val, \
                    f"Field '{field_entry['field']}' role '{role_id}' missing 'masked'"
                assert isinstance(role_val["masked"], bool)


class TestAuditLogContract:
    """Validate /api/governance/audit-log response shape."""

    def test_response_always_has_entries_list(self, client):
        """Even when access denied, entries should be a list."""
        r = client.get("/api/governance/audit-log")
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data
        assert isinstance(data["entries"], list)

    def test_audit_entries_have_required_fields(self, client):
        """As compliance officer, each entry must have standard audit fields."""
        client.post("/api/governance/switch-role",
                    json={"role_id": "compliance_officer"})
        r = client.get("/api/governance/audit-log")
        data = r.json()
        assert len(data["entries"]) >= 1
        required = {"timestamp", "metadata_type", "item_id", "action",
                    "previous_value", "new_value"}
        for entry in data["entries"]:
            missing = required - set(entry.keys())
            assert not missing, f"Audit entry missing: {missing}"


class TestMaskingPoliciesContract:
    """Validate /api/governance/masking-policies response shape."""

    def test_response_has_policies_list(self, client):
        r = client.get("/api/governance/masking-policies")
        assert r.status_code == 200
        data = r.json()
        assert "policies" in data
        assert isinstance(data["policies"], list)

    def test_each_policy_has_required_fields(self, client):
        r = client.get("/api/governance/masking-policies")
        data = r.json()
        required = {"policy_id", "target_entity", "target_field", "masking_type"}
        for p in data["policies"]:
            missing = required - set(p.keys())
            assert not missing, f"Policy '{p.get('policy_id')}' missing: {missing}"
