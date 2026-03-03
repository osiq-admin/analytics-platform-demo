"""Tests for PII registry API endpoint — GDPR Art. 30."""
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
                    "display_name": "Analyst",
                    "description": "Analyst",
                    "icon": "Eye",
                    "tier_access": ["gold"],
                    "classification_access": ["LOW"],
                    "can_export": False,
                    "can_view_audit": False,
                },
                {
                    "role_id": "compliance_officer",
                    "display_name": "Compliance Officer",
                    "description": "Full PII",
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
                        {"field": "trader_name", "classification": "HIGH", "regulation": ["GDPR", "MiFID II"], "crypto_shred": True, "retention_years": 1, "masking_strategy": "hash"},
                        {"field": "trader_id", "classification": "MEDIUM", "regulation": ["MiFID II"], "crypto_shred": False, "retention_years": 7, "masking_strategy": "pseudonymize"},
                    ]
                },
                "account": {
                    "pii_fields": [
                        {"field": "account_name", "classification": "HIGH", "regulation": ["GDPR"], "crypto_shred": True, "retention_years": 1, "masking_strategy": "hash"},
                    ]
                },
            },
        })
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestPiiRegistryEndpoint:
    def test_returns_entities(self, client):
        resp = client.get("/api/governance/pii-registry")
        assert resp.status_code == 200
        data = resp.json()
        assert "entities" in data
        assert "trader" in data["entities"]
        assert "account" in data["entities"]

    def test_masking_status_for_analyst(self, client):
        resp = client.get("/api/governance/pii-registry")
        trader = resp.json()["entities"]["trader"]["pii_fields"]
        name_field = next(f for f in trader if f["field"] == "trader_name")
        assert name_field["currently_masked"] is True
        assert name_field["masking_type"] == "partial"

    def test_masking_status_for_compliance(self, client):
        client.post("/api/governance/switch-role", json={"role_id": "compliance_officer"})
        resp = client.get("/api/governance/pii-registry")
        trader = resp.json()["entities"]["trader"]["pii_fields"]
        name_field = next(f for f in trader if f["field"] == "trader_name")
        assert name_field["currently_masked"] is False
        # Reset role
        client.post("/api/governance/switch-role", json={"role_id": "analyst"})

    def test_includes_regulations(self, client):
        resp = client.get("/api/governance/pii-registry")
        trader = resp.json()["entities"]["trader"]["pii_fields"]
        name_field = next(f for f in trader if f["field"] == "trader_name")
        assert "GDPR" in name_field["regulation"]

    def test_includes_classification(self, client):
        resp = client.get("/api/governance/pii-registry")
        trader = resp.json()["entities"]["trader"]["pii_fields"]
        name_field = next(f for f in trader if f["field"] == "trader_name")
        assert name_field["classification"] == "HIGH"

    def test_total_pii_fields_count(self, client):
        resp = client.get("/api/governance/pii-registry")
        data = resp.json()
        assert "total_pii_fields" in data
        assert data["total_pii_fields"] == 3  # 2 trader + 1 account

    def test_masked_count_for_analyst(self, client):
        resp = client.get("/api/governance/pii-registry")
        data = resp.json()
        assert "masked_count" in data
        assert data["masked_count"] == 3  # all masked for analyst
