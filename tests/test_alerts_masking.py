"""Tests for alerts endpoint PII masking — GDPR Art. 25."""
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
        "alerts/traces",
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

    # Sample alert trace with trader PII
    (ws / "alerts" / "traces" / "ALT-001.json").write_text(
        json.dumps({
            "alert_id": "ALT-001",
            "model_id": "mpr_model",
            "timestamp": "2026-03-01T10:00:00",
            "accumulated_score": 85.0,
            "score_threshold": 70.0,
            "trigger_path": ["price_deviation"],
            "alert_fired": True,
            "trader_id": "TRD-001",
            "trader_name": "John Smith",
            "account_id": "ACC-001",
        })
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestAlertsMasking:
    def test_get_alert_masks_trader_fields(self, client):
        resp = client.get("/api/alerts/ALT-001")
        assert resp.status_code == 200
        data = resp.json()
        # trader_name should be masked for analyst
        assert "*" in data["trader_name"], "trader_name should be masked"
        # trader_id should be tokenized (8 hex chars)
        assert len(data["trader_id"]) == 8, "trader_id should be tokenized"

    def test_get_alert_trace_masks_pii(self, client):
        resp = client.get("/api/alerts/ALT-001/trace")
        assert resp.status_code == 200
        data = resp.json()
        assert "*" in data["trader_name"]

    def test_alert_404_still_works(self, client):
        resp = client.get("/api/alerts/NONEXISTENT")
        assert resp.status_code == 404

    def test_list_alerts_returns_list(self, client):
        resp = client.get("/api/alerts")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
