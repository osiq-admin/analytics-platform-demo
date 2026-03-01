"""Tests for metadata audit trail."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config
from backend.services.audit_service import AuditService
from backend.services.masking_service import MaskingService


# ---- Masking fixtures for audit-aware masking tests ----

SAMPLE_POLICIES = {
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
}

SAMPLE_ROLES = {
    "version": "1.0",
    "default_role": "analyst",
    "roles": [
        {
            "role_id": "analyst",
            "display_name": "Surveillance Analyst",
            "description": "Front-office analyst — sees masked PII",
            "icon": "Eye",
            "tier_access": ["gold", "platinum"],
            "classification_access": ["LOW"],
            "can_export": False,
            "can_view_audit": False,
        },
        {
            "role_id": "compliance_officer",
            "display_name": "Compliance Officer",
            "description": "Full PII access for regulatory investigations",
            "icon": "Shield",
            "tier_access": ["silver", "gold", "platinum"],
            "classification_access": ["LOW", "MEDIUM", "HIGH"],
            "can_export": True,
            "can_view_audit": True,
        },
    ],
}


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    for d in ["entities", "calculations", "settings", "detection_models", "query_presets", "navigation", "format_rules"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def mask_workspace(tmp_path):
    """Create a temporary workspace with masking_policies.json, roles.json, and _audit dir."""
    ws = tmp_path / "mask_workspace"
    ws.mkdir()
    gov_dir = ws / "metadata" / "governance"
    gov_dir.mkdir(parents=True)
    (gov_dir / "masking_policies.json").write_text(json.dumps(SAMPLE_POLICIES))
    (gov_dir / "roles.json").write_text(json.dumps(SAMPLE_ROLES))
    return ws


@pytest.fixture
def audit_svc(mask_workspace):
    """AuditService instance backed by the mask_workspace."""
    return AuditService(mask_workspace)


@pytest.fixture
def masking_svc(mask_workspace):
    """MaskingService instance backed by the mask_workspace."""
    return MaskingService(mask_workspace)


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestAuditTrail:
    def test_save_entity_creates_audit_record(self, workspace, client):
        entity = {"entity_id": "test_entity", "name": "Test", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/test_entity", json=entity)
        audit_dir = workspace / "metadata" / "_audit"
        assert audit_dir.exists()
        records = list(audit_dir.glob("*.json"))
        assert len(records) >= 1
        record = json.loads(records[0].read_text())
        assert record["action"] == "created"
        assert record["metadata_type"] == "entity"
        assert record["item_id"] == "test_entity"
        assert "timestamp" in record
        assert "new_value" in record

    def test_audit_records_include_previous_value(self, workspace, client):
        entity = {"entity_id": "test_entity", "name": "Test V1", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/test_entity", json=entity)
        entity["name"] = "Test V2"
        client.put("/api/metadata/entities/test_entity", json=entity)
        audit_dir = workspace / "metadata" / "_audit"
        records = sorted(audit_dir.glob("*.json"))
        last = json.loads(records[-1].read_text())
        assert last["action"] == "updated"
        assert last["previous_value"]["name"] == "Test V1"
        assert last["new_value"]["name"] == "Test V2"

    def test_audit_api_returns_history(self, workspace, client):
        entity = {"entity_id": "audited", "name": "Audited", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/audited", json=entity)
        resp = client.get("/api/metadata/audit?metadata_type=entity&item_id=audited")
        assert resp.status_code == 200
        history = resp.json()
        assert len(history) >= 1
        assert history[0]["item_id"] == "audited"


class TestAuditMasking:
    """Audit-aware masking — PII is masked at read time based on the requesting role."""

    def test_get_history_masked_analyst(self, audit_svc, masking_svc):
        """Analyst should see trader_name masked in audit entries."""
        audit_svc.record(
            metadata_type="trader",
            item_id="TR-001",
            action="updated",
            new_value={"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"},
        )
        history = audit_svc.get_history_masked("analyst", masking_svc, metadata_type="trader")
        assert len(history) == 1
        entry = history[0]
        # trader_name should be partially masked (J********h)
        assert entry["new_value"]["trader_name"] != "John Smith"
        assert entry["new_value"]["trader_name"] == "J********h"
        # trader_id should be tokenized (8-char hex, not the original)
        assert entry["new_value"]["trader_id"] != "TR-001"
        assert len(entry["new_value"]["trader_id"]) == 8
        # Non-PII field unchanged
        assert entry["new_value"]["desk"] == "Equities"

    def test_get_history_masked_compliance(self, audit_svc, masking_svc):
        """Compliance officer should see trader_name unmasked."""
        audit_svc.record(
            metadata_type="trader",
            item_id="TR-001",
            action="updated",
            new_value={"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"},
        )
        history = audit_svc.get_history_masked("compliance_officer", masking_svc, metadata_type="trader")
        assert len(history) == 1
        entry = history[0]
        assert entry["new_value"]["trader_name"] == "John Smith"
        assert entry["new_value"]["trader_id"] == "TR-001"
        assert entry["new_value"]["desk"] == "Equities"

    def test_get_history_masked_no_values(self, audit_svc, masking_svc):
        """Entry with no new_value or previous_value should not error."""
        audit_svc.record(
            metadata_type="trader",
            item_id="TR-001",
            action="deleted",
            new_value=None,
            previous_value=None,
        )
        history = audit_svc.get_history_masked("analyst", masking_svc, metadata_type="trader")
        assert len(history) == 1
        entry = history[0]
        assert entry["new_value"] is None
        assert entry["previous_value"] is None
        assert entry["action"] == "deleted"

    def test_get_history_masked_previous_value(self, audit_svc, masking_svc):
        """previous_value containing PII should also be masked for analyst."""
        audit_svc.record(
            metadata_type="trader",
            item_id="TR-001",
            action="updated",
            previous_value={"trader_name": "Alice Jones", "trader_id": "TR-001", "desk": "FX"},
            new_value={"trader_name": "Alice B. Jones", "trader_id": "TR-001", "desk": "FX"},
        )
        history = audit_svc.get_history_masked("analyst", masking_svc, metadata_type="trader")
        assert len(history) == 1
        entry = history[0]
        # previous_value trader_name should be masked
        assert entry["previous_value"]["trader_name"] != "Alice Jones"
        assert entry["previous_value"]["trader_name"] == "A*********s"
        # new_value trader_name should also be masked
        assert entry["new_value"]["trader_name"] != "Alice B. Jones"
        assert entry["new_value"]["trader_name"] == "A************s"
        # Non-PII field unchanged in both
        assert entry["previous_value"]["desk"] == "FX"
        assert entry["new_value"]["desk"] == "FX"
