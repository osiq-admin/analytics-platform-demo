# Phase 22: Masking, Encryption & Access Control — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dynamic data masking, role-based access control (RBAC), and audit-aware masking so that sensitive data is masked at API response time based on the current user's role — some roles see PII unmasked, others see masked values. A new DataGovernance view and a global role switcher make the feature demo-impressive.

**Architecture:** MaskingService applies masking at query/response time (not stored) using metadata-driven policies. RBACService manages role state and access checks. Audit logs mask PII when read by unauthorized roles. Frontend: new DataGovernance view at `/governance` with 4 tabs + global role switcher dropdown in the app header.

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript (frontend). Extends existing GovernanceService + PII registry from Phase 21. No new dependencies.

---

## Context

Phase 21 added PII governance with classification levels (HIGH/MEDIUM/LOW), tagging, and a PII registry covering 7 fields across 4 entities. However, the data is currently visible to everyone — no masking is applied, and audit logs store PII unmasked. Phase 22 closes this gap by making masking dynamic and role-aware.

**User requirements:**
- Some roles see data unmasked (compliance_officer, admin), others see masked
- Audit logs / logging tier must ALSO respect masking — unauthorized roles must not see PII in logs
- The plan must be comprehensive and incorporate ALL workflow items (tours, scenarios, operations, architecture registry, BDD, E2E, demo guide, memory, etc.) directly into tasks — nothing deferred to "Phase D cleanup"

**Starting state:** M256, 1186 tests (962 backend + 224 E2E), 21 views, 33 scenarios, 100 architecture sections, 971 frontend modules, 24 tours.

---

## What Already Exists (Reuse, Don't Recreate)

| Asset | Path | What It Provides |
|-------|------|-----------------|
| PII Registry | `workspace/metadata/governance/pii_registry.json` | 7 PII fields, 4 entities, classification levels, masking_strategy hints |
| Governance Models | `backend/models/governance.py` | PIIField, EntityGovernance, PIIRegistry, DataClassification, GovernanceTag |
| GovernanceService | `backend/services/governance_service.py` | load_pii_registry(), get_pii_fields(), get_table_classification() |
| Lakehouse API | `backend/api/lakehouse.py` | GET /governance/pii-registry, GET /governance/classification |
| Audit Service | `backend/services/audit_service.py` | record(), get_history() — **stores PII unmasked** (must fix) |
| Navigation metadata | `workspace/metadata/navigation/main.json` | 5 groups (Define, Ingest, Detect, Investigate, Advanced) |

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `workspace/metadata/governance/masking_policies.json` | CREATE | 1 |
| `workspace/metadata/governance/roles.json` | CREATE | 1 |
| `backend/models/governance.py` | MODIFY | 1 |
| `tests/test_masking_service.py` | CREATE | 2 |
| `backend/services/masking_service.py` | CREATE | 2 |
| `tests/test_rbac_service.py` | CREATE | 3 |
| `backend/services/rbac_service.py` | CREATE | 3 |
| `backend/api/governance.py` | CREATE | 4 |
| `backend/main.py` | MODIFY | 4 |
| `tests/test_governance_api.py` | CREATE | 4 |
| `backend/services/audit_service.py` | MODIFY | 5 |
| `tests/test_audit_service.py` | MODIFY | 5 |
| `workspace/metadata/navigation/main.json` | MODIFY | 6 |
| `frontend/src/views/DataGovernance/index.tsx` | CREATE | 6 |
| `frontend/src/App.tsx` (or routes file) | MODIFY | 6 |
| `frontend/src/components/AppLayout.tsx` | MODIFY | 7 |
| `frontend/src/stores/governanceStore.ts` | CREATE | 7 |
| `frontend/src/data/tourDefinitions.ts` | MODIFY | 8 |
| `frontend/src/data/scenarioDefinitions.ts` | MODIFY | 8 |
| `frontend/src/data/operationScripts.ts` | MODIFY | 8 |
| `frontend/src/data/architectureRegistry.ts` | MODIFY | 9 |
| `workspace/metadata/tours/registry.json` | MODIFY | 8 |
| `docs/requirements/bdd-scenarios.md` | MODIFY | 9 |
| `tests/e2e/test_e2e_views.py` | MODIFY | 10 |
| `docs/demo-guide.md` | MODIFY | 11 |
| `docs/progress.md` | MODIFY | 11 |
| `CLAUDE.md` | MODIFY | 12 |
| `README.md` | MODIFY | 12 |
| `docs/development-workflow-protocol.md` | MODIFY | 12 |
| `docs/feature-development-checklist.md` | MODIFY | 12 |
| `docs/architecture-traceability.md` | MODIFY | 12 |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | MODIFY | 12 |
| `.claude/memory/MEMORY.md` | MODIFY | 12 |
| Context-level `MEMORY.md` | MODIFY | 12 |

---

## Task 22.1: Masking Policy Metadata, Role Definitions & Pydantic Models (M257)

**Goal:** Create the metadata files that drive all masking and RBAC behavior, plus the Pydantic models.

**Files:**
- Create: `workspace/metadata/governance/masking_policies.json`
- Create: `workspace/metadata/governance/roles.json`
- Modify: `backend/models/governance.py`

**Step 1: Create masking_policies.json**

```json
{
  "version": "1.0",
  "policies": [
    {
      "policy_id": "mask_trader_name",
      "target_entity": "trader",
      "target_field": "trader_name",
      "classification": "HIGH",
      "masking_type": "partial",
      "algorithm": "first_last_char",
      "params": { "mask_char": "*", "visible_start": 1, "visible_end": 1 },
      "unmask_roles": ["compliance_officer", "admin"],
      "audit_unmask": true
    },
    {
      "policy_id": "mask_trader_id",
      "target_entity": "trader",
      "target_field": "trader_id",
      "classification": "MEDIUM",
      "masking_type": "tokenize",
      "algorithm": "sha256_prefix",
      "params": { "prefix_length": 8 },
      "unmask_roles": ["compliance_officer", "admin"],
      "audit_unmask": true
    },
    {
      "policy_id": "mask_account_name",
      "target_entity": "account",
      "target_field": "account_name",
      "classification": "HIGH",
      "masking_type": "partial",
      "algorithm": "first_last_char",
      "params": { "mask_char": "*", "visible_start": 1, "visible_end": 1 },
      "unmask_roles": ["compliance_officer", "admin"],
      "audit_unmask": true
    },
    {
      "policy_id": "mask_registration_country",
      "target_entity": "account",
      "target_field": "registration_country",
      "classification": "LOW",
      "masking_type": "generalize",
      "algorithm": "region_bucket",
      "params": {},
      "unmask_roles": ["compliance_officer", "data_engineer", "admin"],
      "audit_unmask": false
    },
    {
      "policy_id": "mask_exec_trader_id",
      "target_entity": "execution",
      "target_field": "trader_id",
      "classification": "MEDIUM",
      "masking_type": "tokenize",
      "algorithm": "sha256_prefix",
      "params": { "prefix_length": 8 },
      "unmask_roles": ["compliance_officer", "admin"],
      "audit_unmask": true
    },
    {
      "policy_id": "mask_exec_account_id",
      "target_entity": "execution",
      "target_field": "account_id",
      "classification": "MEDIUM",
      "masking_type": "tokenize",
      "algorithm": "sha256_prefix",
      "params": { "prefix_length": 8 },
      "unmask_roles": ["compliance_officer", "admin"],
      "audit_unmask": true
    },
    {
      "policy_id": "mask_order_trader_id",
      "target_entity": "order",
      "target_field": "trader_id",
      "classification": "MEDIUM",
      "masking_type": "tokenize",
      "algorithm": "sha256_prefix",
      "params": { "prefix_length": 8 },
      "unmask_roles": ["compliance_officer", "admin"],
      "audit_unmask": true
    }
  ]
}
```

**Step 2: Create roles.json**

```json
{
  "version": "1.0",
  "default_role": "analyst",
  "roles": [
    {
      "role_id": "analyst",
      "display_name": "Surveillance Analyst",
      "description": "Front-office surveillance analyst — sees masked PII",
      "icon": "Eye",
      "tier_access": ["gold", "platinum"],
      "classification_access": ["LOW"],
      "can_export": false,
      "can_view_audit": false
    },
    {
      "role_id": "compliance_officer",
      "display_name": "Compliance Officer",
      "description": "Full PII access for regulatory investigations",
      "icon": "Shield",
      "tier_access": ["silver", "gold", "platinum", "quarantine", "reference", "archive"],
      "classification_access": ["LOW", "MEDIUM", "HIGH"],
      "can_export": true,
      "can_view_audit": true
    },
    {
      "role_id": "data_engineer",
      "display_name": "Data Engineer",
      "description": "Pipeline access with masked PII",
      "icon": "Wrench",
      "tier_access": ["landing", "bronze", "silver", "gold", "quarantine", "logging", "metrics"],
      "classification_access": ["LOW"],
      "can_export": false,
      "can_view_audit": false
    },
    {
      "role_id": "admin",
      "display_name": "Administrator",
      "description": "Full access — all tiers, all data, audit logs",
      "icon": "Crown",
      "tier_access": ["landing", "bronze", "silver", "gold", "platinum", "quarantine", "reference", "sandbox", "logging", "metrics", "archive"],
      "classification_access": ["LOW", "MEDIUM", "HIGH"],
      "can_export": true,
      "can_view_audit": true
    }
  ]
}
```

**Step 3: Add Pydantic models to `backend/models/governance.py`**

Add after the existing models:

```python
class MaskingPolicy(BaseModel):
    policy_id: str
    target_entity: str
    target_field: str
    classification: Literal["HIGH", "MEDIUM", "LOW"]
    masking_type: Literal["redact", "partial", "tokenize", "hash", "generalize", "none"]
    algorithm: str = ""
    params: dict = Field(default_factory=dict)
    unmask_roles: list[str] = Field(default_factory=list)
    audit_unmask: bool = False

class MaskingPolicies(BaseModel):
    version: str = "1.0"
    policies: list[MaskingPolicy] = Field(default_factory=list)

class RoleDefinition(BaseModel):
    role_id: str
    display_name: str
    description: str = ""
    icon: str = "User"
    tier_access: list[str] = Field(default_factory=list)
    classification_access: list[str] = Field(default_factory=list)
    can_export: bool = False
    can_view_audit: bool = False

class RoleRegistry(BaseModel):
    version: str = "1.0"
    default_role: str = "analyst"
    roles: list[RoleDefinition] = Field(default_factory=list)

class MaskedValue(BaseModel):
    """A value with masking metadata — used in API responses."""
    original_field: str
    masked: bool
    display_value: str
    masking_type: str | None = None
    classification: str | None = None
```

**Step 4: Verify**

Run: `uv run python -c "from backend.models.governance import MaskingPolicy, RoleDefinition, MaskingPolicies, RoleRegistry; print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add workspace/metadata/governance/masking_policies.json workspace/metadata/governance/roles.json backend/models/governance.py
git commit -m "feat(governance): add masking policy metadata, role definitions, and Pydantic models (M257)"
```

---

## Task 22.2: MaskingService with TDD (M258)

**Goal:** Create the dynamic masking engine that applies field-level masking based on policies and current role.

**Files:**
- Create: `tests/test_masking_service.py`
- Create: `backend/services/masking_service.py`

**Step 1: Write failing tests**

```python
"""Tests for MaskingService — dynamic data masking engine."""
import json
import pytest
from pathlib import Path
from backend.services.masking_service import MaskingService


@pytest.fixture
def mask_workspace(tmp_path):
    """Create workspace with masking policies and roles."""
    ws = tmp_path / "workspace"
    gov = ws / "metadata" / "governance"
    gov.mkdir(parents=True)
    (gov / "masking_policies.json").write_text(json.dumps({
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
                "policy_id": "mask_country",
                "target_entity": "account",
                "target_field": "registration_country",
                "classification": "LOW",
                "masking_type": "generalize",
                "algorithm": "region_bucket",
                "params": {},
                "unmask_roles": ["compliance_officer", "data_engineer", "admin"],
                "audit_unmask": False,
            },
        ],
    }))
    (gov / "roles.json").write_text(json.dumps({
        "version": "1.0",
        "default_role": "analyst",
        "roles": [
            {"role_id": "analyst", "classification_access": ["LOW"], "tier_access": ["gold"]},
            {"role_id": "compliance_officer", "classification_access": ["LOW", "MEDIUM", "HIGH"], "tier_access": ["silver", "gold"]},
            {"role_id": "admin", "classification_access": ["LOW", "MEDIUM", "HIGH"], "tier_access": ["silver", "gold"]},
        ],
    }))
    return ws


@pytest.fixture
def svc(mask_workspace):
    return MaskingService(mask_workspace)


class TestMaskingServiceLoad:
    def test_loads_policies(self, svc):
        assert len(svc.policies.policies) == 3

    def test_loads_roles(self, svc):
        assert len(svc.roles.roles) == 3

    def test_get_policies_for_entity(self, svc):
        trader_policies = svc.get_policies_for_entity("trader")
        assert len(trader_policies) == 2

    def test_get_policies_for_unknown_entity(self, svc):
        assert svc.get_policies_for_entity("unknown") == []


class TestPartialMasking:
    def test_partial_mask_short_name(self, svc):
        result = svc.apply_mask("Jo", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "Jo"  # Too short to mask

    def test_partial_mask_normal_name(self, svc):
        result = svc.apply_mask("John Smith", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "J********h"

    def test_partial_mask_medium_name(self, svc):
        result = svc.apply_mask("Alice", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "A***e"


class TestTokenizeMasking:
    def test_tokenize_produces_hex_prefix(self, svc):
        result = svc.apply_mask("TRD-001", "tokenize", {"prefix_length": 8})
        assert len(result) == 8
        assert all(c in "0123456789abcdef" for c in result)

    def test_tokenize_deterministic(self, svc):
        r1 = svc.apply_mask("TRD-001", "tokenize", {"prefix_length": 8})
        r2 = svc.apply_mask("TRD-001", "tokenize", {"prefix_length": 8})
        assert r1 == r2

    def test_tokenize_different_values_differ(self, svc):
        r1 = svc.apply_mask("TRD-001", "tokenize", {"prefix_length": 8})
        r2 = svc.apply_mask("TRD-002", "tokenize", {"prefix_length": 8})
        assert r1 != r2


class TestGeneralizeMasking:
    def test_generalize_known_country(self, svc):
        result = svc.apply_mask("United Kingdom", "generalize", {})
        assert result == "Europe"

    def test_generalize_unknown_country(self, svc):
        result = svc.apply_mask("Narnia", "generalize", {})
        assert result == "Other"


class TestRedactMasking:
    def test_redact(self, svc):
        result = svc.apply_mask("secret", "redact", {})
        assert result == "***REDACTED***"


class TestMaskRecord:
    def test_analyst_sees_masked_trader(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TRD-001", "desk": "Equity"}
        masked = svc.mask_record("trader", record, "analyst")
        assert masked["trader_name"] != "John Smith"
        assert masked["trader_id"] != "TRD-001"
        assert masked["desk"] == "Equity"  # Non-PII unchanged

    def test_compliance_sees_unmasked_trader(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TRD-001", "desk": "Equity"}
        masked = svc.mask_record("trader", record, "compliance_officer")
        assert masked["trader_name"] == "John Smith"
        assert masked["trader_id"] == "TRD-001"

    def test_admin_sees_unmasked(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TRD-001"}
        masked = svc.mask_record("trader", record, "admin")
        assert masked["trader_name"] == "John Smith"

    def test_mask_records_batch(self, svc):
        records = [
            {"trader_name": "Alice", "trader_id": "TRD-001"},
            {"trader_name": "Bob", "trader_id": "TRD-002"},
        ]
        masked = svc.mask_records("trader", records, "analyst")
        assert len(masked) == 2
        assert masked[0]["trader_name"] != "Alice"
        assert masked[1]["trader_name"] != "Bob"

    def test_mask_preserves_none_values(self, svc):
        record = {"trader_name": None, "trader_id": "TRD-001"}
        masked = svc.mask_record("trader", record, "analyst")
        assert masked["trader_name"] is None


class TestMaskingMetadata:
    def test_mask_record_with_metadata(self, svc):
        record = {"trader_name": "John Smith", "desk": "Equity"}
        masked, meta = svc.mask_record_with_metadata("trader", record, "analyst")
        assert masked["trader_name"] != "John Smith"
        assert "trader_name" in meta
        assert meta["trader_name"]["masked"] is True
        assert meta["trader_name"]["masking_type"] == "partial"

    def test_unmasked_fields_have_no_metadata(self, svc):
        record = {"trader_name": "John Smith", "desk": "Equity"}
        _, meta = svc.mask_record_with_metadata("trader", record, "compliance_officer")
        assert "trader_name" not in meta  # Not masked for compliance
```

**Step 2: Run tests — verify they fail**

Run: `uv run pytest tests/test_masking_service.py -v`
Expected: FAIL (ImportError — module not found)

**Step 3: Implement MaskingService**

Create `backend/services/masking_service.py`:

```python
"""Dynamic data masking engine — applies field-level masking based on policies and role."""
import hashlib
import json
from pathlib import Path
from backend.models.governance import MaskingPolicies, MaskingPolicy, RoleRegistry


# Country→Region mapping for generalize masking
COUNTRY_REGIONS: dict[str, str] = {
    "United States": "Americas", "Canada": "Americas", "Brazil": "Americas", "Mexico": "Americas",
    "United Kingdom": "Europe", "Germany": "Europe", "France": "Europe", "Switzerland": "Europe",
    "Netherlands": "Europe", "Ireland": "Europe", "Luxembourg": "Europe", "Spain": "Europe",
    "Italy": "Europe", "Sweden": "Europe", "Norway": "Europe", "Denmark": "Europe",
    "Japan": "Asia-Pacific", "China": "Asia-Pacific", "Hong Kong": "Asia-Pacific",
    "Singapore": "Asia-Pacific", "Australia": "Asia-Pacific", "South Korea": "Asia-Pacific",
    "India": "Asia-Pacific", "Taiwan": "Asia-Pacific",
    "United Arab Emirates": "Middle East", "Saudi Arabia": "Middle East", "Israel": "Middle East",
    "South Africa": "Africa", "Nigeria": "Africa",
}


class MaskingService:
    """Applies dynamic field-level masking based on metadata policies and current user role."""

    def __init__(self, workspace: Path) -> None:
        self._workspace = workspace
        self._policies: MaskingPolicies | None = None
        self._roles: RoleRegistry | None = None

    @property
    def policies(self) -> MaskingPolicies:
        if self._policies is None:
            path = self._workspace / "metadata" / "governance" / "masking_policies.json"
            if path.exists():
                self._policies = MaskingPolicies.model_validate(json.loads(path.read_text()))
            else:
                self._policies = MaskingPolicies()
        return self._policies

    @property
    def roles(self) -> RoleRegistry:
        if self._roles is None:
            path = self._workspace / "metadata" / "governance" / "roles.json"
            if path.exists():
                self._roles = RoleRegistry.model_validate(json.loads(path.read_text()))
            else:
                self._roles = RoleRegistry()
        return self._roles

    def get_policies_for_entity(self, entity_id: str) -> list[MaskingPolicy]:
        return [p for p in self.policies.policies if p.target_entity == entity_id]

    def apply_mask(self, value: str, masking_type: str, params: dict) -> str:
        if value is None:
            return None
        value_str = str(value)
        if masking_type == "partial":
            vis_start = params.get("visible_start", 1)
            vis_end = params.get("visible_end", 1)
            mask_char = params.get("mask_char", "*")
            if len(value_str) <= vis_start + vis_end:
                return value_str
            middle_len = len(value_str) - vis_start - vis_end
            return value_str[:vis_start] + (mask_char * middle_len) + value_str[-vis_end:]
        elif masking_type == "tokenize":
            prefix_len = params.get("prefix_length", 8)
            h = hashlib.sha256(value_str.encode()).hexdigest()
            return h[:prefix_len]
        elif masking_type == "hash":
            return hashlib.sha256(value_str.encode()).hexdigest()[:16]
        elif masking_type == "generalize":
            return COUNTRY_REGIONS.get(value_str, "Other")
        elif masking_type == "redact":
            return "***REDACTED***"
        return value_str  # "none" or unknown

    def mask_record(self, entity_id: str, record: dict, role_id: str) -> dict:
        policies = self.get_policies_for_entity(entity_id)
        result = dict(record)
        for policy in policies:
            field = policy.target_field
            if field not in result or result[field] is None:
                continue
            if role_id in policy.unmask_roles:
                continue  # This role can see unmasked
            result[field] = self.apply_mask(str(result[field]), policy.masking_type, policy.params)
        return result

    def mask_records(self, entity_id: str, records: list[dict], role_id: str) -> list[dict]:
        return [self.mask_record(entity_id, r, role_id) for r in records]

    def mask_record_with_metadata(self, entity_id: str, record: dict, role_id: str) -> tuple[dict, dict]:
        policies = self.get_policies_for_entity(entity_id)
        result = dict(record)
        meta: dict = {}
        for policy in policies:
            field = policy.target_field
            if field not in result or result[field] is None:
                continue
            if role_id in policy.unmask_roles:
                continue
            result[field] = self.apply_mask(str(result[field]), policy.masking_type, policy.params)
            meta[field] = {
                "masked": True,
                "masking_type": policy.masking_type,
                "classification": policy.classification,
            }
        return result, meta

    def get_role(self, role_id: str):
        for r in self.roles.roles:
            if r.role_id == role_id:
                return r
        return None
```

**Step 4: Run tests — verify they pass**

Run: `uv run pytest tests/test_masking_service.py -v`
Expected: ALL PASS (~20 tests)

**Step 5: Commit**

```bash
git add tests/test_masking_service.py backend/services/masking_service.py
git commit -m "feat(governance): add MaskingService with TDD — partial, tokenize, generalize, redact masking (M258)"
```

---

## Task 22.3: RBACService with TDD (M259)

**Goal:** Create the role-based access control service managing role state and permission checks.

**Files:**
- Create: `tests/test_rbac_service.py`
- Create: `backend/services/rbac_service.py`

**Step 1: Write failing tests**

```python
"""Tests for RBACService — role-based access control."""
import json
import pytest
from pathlib import Path
from backend.services.rbac_service import RBACService


@pytest.fixture
def rbac_workspace(tmp_path):
    ws = tmp_path / "workspace"
    gov = ws / "metadata" / "governance"
    gov.mkdir(parents=True)
    (gov / "roles.json").write_text(json.dumps({
        "version": "1.0",
        "default_role": "analyst",
        "roles": [
            {"role_id": "analyst", "display_name": "Analyst", "tier_access": ["gold", "platinum"],
             "classification_access": ["LOW"], "can_export": False, "can_view_audit": False},
            {"role_id": "compliance_officer", "display_name": "Compliance", "tier_access": ["silver", "gold", "platinum"],
             "classification_access": ["LOW", "MEDIUM", "HIGH"], "can_export": True, "can_view_audit": True},
            {"role_id": "admin", "display_name": "Admin", "tier_access": ["silver", "gold", "platinum", "logging"],
             "classification_access": ["LOW", "MEDIUM", "HIGH"], "can_export": True, "can_view_audit": True},
        ],
    }))
    return ws


@pytest.fixture
def rbac(rbac_workspace):
    return RBACService(rbac_workspace)


class TestRoleLoading:
    def test_loads_roles(self, rbac):
        assert len(rbac.list_roles()) == 3

    def test_default_role(self, rbac):
        assert rbac.current_role_id == "analyst"

    def test_get_current_role(self, rbac):
        role = rbac.get_current_role()
        assert role.role_id == "analyst"


class TestRoleSwitching:
    def test_switch_to_valid_role(self, rbac):
        rbac.switch_role("compliance_officer")
        assert rbac.current_role_id == "compliance_officer"

    def test_switch_to_invalid_role_raises(self, rbac):
        with pytest.raises(ValueError, match="Unknown role"):
            rbac.switch_role("hacker")

    def test_switch_back(self, rbac):
        rbac.switch_role("compliance_officer")
        rbac.switch_role("analyst")
        assert rbac.current_role_id == "analyst"


class TestAccessChecks:
    def test_analyst_can_access_gold(self, rbac):
        assert rbac.can_access_tier("gold") is True

    def test_analyst_cannot_access_silver(self, rbac):
        assert rbac.can_access_tier("silver") is False

    def test_compliance_can_access_silver(self, rbac):
        rbac.switch_role("compliance_officer")
        assert rbac.can_access_tier("silver") is True

    def test_analyst_can_see_low_classification(self, rbac):
        assert rbac.can_view_classification("LOW") is True

    def test_analyst_cannot_see_high_classification(self, rbac):
        assert rbac.can_view_classification("HIGH") is False

    def test_compliance_can_see_high(self, rbac):
        rbac.switch_role("compliance_officer")
        assert rbac.can_view_classification("HIGH") is True

    def test_analyst_cannot_view_audit(self, rbac):
        assert rbac.can_view_audit() is False

    def test_compliance_can_view_audit(self, rbac):
        rbac.switch_role("compliance_officer")
        assert rbac.can_view_audit() is True

    def test_analyst_cannot_export(self, rbac):
        assert rbac.can_export() is False
```

**Step 2: Run tests — verify they fail**

Run: `uv run pytest tests/test_rbac_service.py -v`

**Step 3: Implement RBACService**

Create `backend/services/rbac_service.py`:

```python
"""Role-based access control service — manages role state and permission checks."""
import json
from pathlib import Path
from backend.models.governance import RoleRegistry, RoleDefinition


class RBACService:
    """Manages current role state and permission checks. Demo mode — no authentication."""

    def __init__(self, workspace: Path) -> None:
        self._workspace = workspace
        self._registry: RoleRegistry | None = None
        self._current_role_id: str | None = None

    @property
    def _roles(self) -> RoleRegistry:
        if self._registry is None:
            path = self._workspace / "metadata" / "governance" / "roles.json"
            if path.exists():
                self._registry = RoleRegistry.model_validate(json.loads(path.read_text()))
            else:
                self._registry = RoleRegistry()
        return self._registry

    @property
    def current_role_id(self) -> str:
        if self._current_role_id is None:
            self._current_role_id = self._roles.default_role
        return self._current_role_id

    def list_roles(self) -> list[RoleDefinition]:
        return self._roles.roles

    def get_current_role(self) -> RoleDefinition:
        for r in self._roles.roles:
            if r.role_id == self.current_role_id:
                return r
        return self._roles.roles[0]

    def get_role(self, role_id: str) -> RoleDefinition | None:
        for r in self._roles.roles:
            if r.role_id == role_id:
                return r
        return None

    def switch_role(self, role_id: str) -> RoleDefinition:
        role = self.get_role(role_id)
        if role is None:
            raise ValueError(f"Unknown role: {role_id}")
        self._current_role_id = role_id
        return role

    def can_access_tier(self, tier: str) -> bool:
        return tier in self.get_current_role().tier_access

    def can_view_classification(self, classification: str) -> bool:
        return classification in self.get_current_role().classification_access

    def can_view_audit(self) -> bool:
        return self.get_current_role().can_view_audit

    def can_export(self) -> bool:
        return self.get_current_role().can_export
```

**Step 4: Run tests — verify pass**

Run: `uv run pytest tests/test_rbac_service.py -v`

**Step 5: Commit**

```bash
git add tests/test_rbac_service.py backend/services/rbac_service.py
git commit -m "feat(governance): add RBACService with TDD — role switching, tier access, classification checks (M259)"
```

---

## Task 22.4: Governance API Router + Service Wiring (M260)

**Goal:** Create REST endpoints for governance operations and wire services into FastAPI app.state.

**Files:**
- Create: `backend/api/governance.py`
- Create: `tests/test_governance_api.py`
- Modify: `backend/main.py` (add router import + service init in lifespan)

**Step 1: Write API tests**

Tests for: GET /api/governance/roles, GET /api/governance/current-role, POST /api/governance/switch-role, GET /api/governance/masking-policies, GET /api/governance/masked-preview/{entity}, GET /api/governance/audit-log (role-aware).

Key test cases:
- `test_list_roles` — returns 4 roles
- `test_get_current_role` — default is analyst
- `test_switch_role` — POST switches, GET confirms
- `test_list_masking_policies` — returns 7 policies
- `test_masked_preview_analyst` — trader_name masked
- `test_masked_preview_compliance` — trader_name unmasked
- `test_audit_log_masked_for_analyst` — PII fields masked in audit entries
- `test_audit_log_unmasked_for_compliance` — PII fields visible
- `test_role_comparison` — GET /api/governance/role-comparison/{entity} returns all-roles side-by-side

**Step 2: Implement router**

Create `backend/api/governance.py`:
- Prefix: `/api/governance`
- Helper: `_masking(request)`, `_rbac(request)`, `_audit(request)`
- Endpoints: 7 (list roles, current role, switch role, policies, masked preview, audit log, role comparison)

**Step 3: Wire into main.py**

In `backend/main.py` lifespan:
- Initialize MaskingService and RBACService
- Store in `app.state.masking_service` and `app.state.rbac_service`
- Import and include `governance_router`

**Step 4: Run tests, commit**

```bash
git commit -m "feat(governance): add Governance API router — roles, masking, audit, role comparison (M260)"
```

---

## Task 22.5: Audit-Aware Masking (M261)

**Goal:** Modify the audit service so that when audit logs are READ via the API, PII fields in recorded values are masked based on the requesting role.

**Critical design:** Audit entries are still STORED unmasked (compliance/regulatory requirement). Masking is applied at READ time via the governance API endpoint.

**Files:**
- Modify: `backend/services/audit_service.py` — add `get_history_masked(role_id, masking_service)` method
- Modify: existing audit tests — add masked retrieval tests

**Step 1: Write tests for masked audit retrieval**

```python
class TestMaskedAuditRetrieval:
    def test_analyst_sees_masked_audit(self, audit_svc, masking_svc):
        """Analyst sees trader_name masked in audit log entries."""
        audit_svc.record("entities", "trader", "update",
                         new_value={"trader_name": "John Smith", "desk": "Equity"})
        history = audit_svc.get_history_masked("analyst", masking_svc)
        entry = history[0]
        assert entry["new_value"]["trader_name"] != "John Smith"
        assert entry["new_value"]["desk"] == "Equity"

    def test_compliance_sees_unmasked_audit(self, audit_svc, masking_svc):
        """Compliance officer sees full PII in audit log."""
        audit_svc.record("entities", "trader", "update",
                         new_value={"trader_name": "John Smith"})
        history = audit_svc.get_history_masked("compliance_officer", masking_svc)
        assert history[0]["new_value"]["trader_name"] == "John Smith"
```

**Step 2: Implement**

Add method to AuditService:
```python
def get_history_masked(self, role_id: str, masking_service, metadata_type=None, item_id=None):
    history = self.get_history(metadata_type, item_id)
    for entry in history:
        entity_id = entry.get("metadata_type", "")
        if entry.get("new_value"):
            entry["new_value"] = masking_service.mask_record(entity_id, entry["new_value"], role_id)
        if entry.get("previous_value"):
            entry["previous_value"] = masking_service.mask_record(entity_id, entry["previous_value"], role_id)
    return history
```

**Step 3: Run tests, commit**

```bash
git commit -m "feat(governance): add audit-aware masking — PII masked at read time by role (M261)"
```

---

## Task 22.6: DataGovernance View — Frontend (M262-M263)

**Goal:** Create a new DataGovernance view at `/governance` with 4 tabs: Masking Policies, Role Management, Data Preview (side-by-side masked/unmasked), and Audit Log.

**Files:**
- Create: `frontend/src/views/DataGovernance/index.tsx`
- Create: `frontend/src/stores/governanceStore.ts`
- Modify: `workspace/metadata/navigation/main.json` — add "Govern" group with governance entry
- Modify: frontend route config (wherever routes are defined)

**Implementation:**

**Tab 1 — Masking Policies:** Table showing all 7 policies with entity, field, classification badge, masking type, unmask roles list.

**Tab 2 — Role Management:** Role cards (4 roles) showing tier access badges, classification access, permissions. Current role highlighted with a "Switch" button.

**Tab 3 — Data Preview:** The demo-impressive tab. Fetches entity data from `/api/governance/role-comparison/{entity}` and renders a side-by-side table:
- Left column: field name
- Middle column: value as seen by the current role
- Right column: value as seen by compliance_officer (always unmasked)
- Masked fields highlighted with a colored background + masking type badge

**Tab 4 — Audit Log:** Loads from `/api/governance/audit-log` (role-aware). Shows entries with timestamp, metadata type, action, and masked/unmasked values. If current role is compliance_officer, shows a toggle: "Show raw PII / Show masked".

**Navigation:** Add new "Govern" group to `main.json`:
```json
{
    "title": "Govern",
    "order": 6,
    "items": [
        {"view_id": "governance", "label": "Data Governance", "path": "/governance", "icon": "Lock", "order": 0}
    ]
}
```

**Route:** Add `/governance` route pointing to `DataGovernance` component.

**data-tour attributes:** `governance-masking-policies`, `governance-role-management`, `governance-data-preview`, `governance-audit-log`, `governance-role-comparison`.

**data-trace attributes:** `governance.masking-policies`, `governance.role-management`, `governance.data-preview`, `governance.audit-log`.

**Commit:**
```bash
git commit -m "feat(governance): add DataGovernance view with 4 tabs — policies, roles, data preview, audit (M262-M263)"
```

---

## Task 22.7: Global Role Switcher in App Header (M264)

**Goal:** Add a role indicator/switcher dropdown to the app header bar, visible from every view.

**Files:**
- Create: `frontend/src/stores/governanceStore.ts` (if not created in Task 6)
- Modify: `frontend/src/components/AppLayout.tsx` — add role switcher dropdown

**Implementation:**

Zustand store (`governanceStore.ts`):
```typescript
interface GovernanceState {
  currentRole: string;
  roles: RoleDefinition[];
  loading: boolean;
  fetchRoles: () => Promise<void>;
  switchRole: (roleId: string) => Promise<void>;
}
```

In AppLayout header bar (next to the tour/scenario/trace buttons):
- Small dropdown showing current role icon + name (e.g., "🔒 Analyst")
- On click: dropdown with all 4 roles
- Selecting a role calls POST /api/governance/switch-role
- Role badge color: analyst=blue, compliance=green, data_engineer=amber, admin=purple
- `data-tour="role-switcher"` attribute on the dropdown

**Commit:**
```bash
git commit -m "feat(governance): add global role switcher dropdown to AppLayout header (M264)"
```

---

## Task 22.8: Tours, Scenarios, Operations, Tour Registry (M265)

**Goal:** Add all guided help system content for the new DataGovernance view.

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts` — add "governance" tour (7 steps)
- Modify: `frontend/src/data/scenarioDefinitions.ts` — add S34 "Role-Based Data Masking" scenario
- Modify: `frontend/src/data/operationScripts.ts` — add "governance" view operations (6 ops + 4 tips)
- Modify: `frontend/src/components/AppLayout.tsx` — add tour ID mapping for `/governance`
- Modify: `workspace/metadata/tours/registry.json` — add tour entry + update scenario count

**Tour steps (7):**
1. Role switcher in header — "Switch between roles to see different data masking levels"
2. Masking Policies tab — "View all 7 masking policies with types and unmask roles"
3. Role Management tab — "See role definitions with tier and classification access"
4. Data Preview tab — "Compare how the same data appears to different roles"
5. Side-by-side comparison — "Analyst sees masked, Compliance sees unmasked"
6. Audit Log tab — "View audit trail with role-appropriate masking"
7. Audit toggle — "Compliance officers can toggle between masked and raw PII view"

**Scenario S34 steps (8):**
1. Navigate to DataGovernance
2. View masking policies (wait)
3. Switch to Role Management tab (click)
4. Click role switcher to change to compliance_officer
5. Switch to Data Preview tab (click)
6. Observe unmasked data (wait)
7. Switch back to analyst role
8. Observe masked data (wait, validate differences)

**Operations (6):**
- switch_role, view_masking_policies, preview_masked_data, compare_roles, view_audit_log, toggle_audit_masking

**Tour registry update:**
- Add: `{"tour_id": "governance", "view_path": "/governance", "title": "Data Governance Tour", "step_count": 7}`
- Update scenarios total_count: 33 → 34
- Add Governance category count: 2 → 3

**Commit:**
```bash
git commit -m "feat(governance): add tour, S34 scenario, operations, tour registry for DataGovernance (M265)"
```

---

## Task 22.9: Architecture Registry + BDD Scenarios (M266)

**Goal:** Add architecture traceability entries and BDD acceptance scenarios.

**Files:**
- Modify: `frontend/src/data/architectureRegistry.ts` — add DataGovernance view with 4 sections
- Modify: `docs/requirements/bdd-scenarios.md` — add Category 14: Masking & RBAC (5 scenarios)
- Modify: `docs/architecture-traceability.md` — update section count and maturity distribution

**Architecture registry — 4 new sections:**
1. `governance.masking-policies` — "Masking policy table driven by /api/governance/masking-policies"
2. `governance.role-management` — "Role cards with tier/classification badges from /api/governance/roles"
3. `governance.data-preview` — "Side-by-side masked/unmasked data from /api/governance/role-comparison"
4. `governance.audit-log` — "Role-aware audit log from /api/governance/audit-log"

All sections: `metadataMaturity: "fully-metadata-driven"` (policies, roles, masking all from JSON metadata).

**BDD Scenarios (5):**

1. **Dynamic Masking by Role** — Given analyst role, when viewing trader data, then trader_name is partially masked and trader_id is tokenized
2. **Compliance Officer Full Access** — Given compliance_officer role, when viewing same trader data, then all fields are unmasked
3. **Audit Log PII Protection** — Given analyst role, when viewing audit log entries containing trader_name changes, then the audit values show masked PII
4. **Role Switching Live Preview** — Given the user switches from analyst to compliance_officer, when viewing the data preview tab, then previously masked fields become visible in real-time
5. **Tier Access Restriction** — Given analyst role, when requesting silver tier data, then access is denied; when compliance_officer, then access is granted

**Architecture traceability update:**
- 100 → 104 sections across 22 views
- Recalculate maturity distribution (all 4 new = fully-metadata-driven)

**Commit:**
```bash
git commit -m "feat(governance): add architecture registry (4 sections), BDD scenarios, traceability update (M266)"
```

---

## Task 22.10: E2E Playwright Tests (M267)

**Goal:** Add E2E tests for the DataGovernance view.

**Files:**
- Modify: `tests/e2e/test_e2e_views.py` — add TestDataGovernance class

**Tests (6):**

```python
class TestDataGovernance:
    """Data Governance view E2E tests."""

    def test_governance_view_renders(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle")
        assert loaded_page.locator("text=Data Governance").is_visible(timeout=5000) or \
               loaded_page.locator("text=Masking Policies").is_visible(timeout=5000)

    def test_masking_policies_tab(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle")
        # Should show masking policies table with at least 7 rows
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/masking-policies');
                const data = await resp.json();
                return { status: resp.status, count: data.policies?.length || 0 };
            }
        """)
        assert result["status"] == 200
        assert result["count"] == 7

    def test_role_switching_api(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                await fetch('/api/governance/switch-role', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({role_id: 'compliance_officer'})
                });
                const resp = await fetch('/api/governance/current-role');
                const data = await resp.json();
                return data.role_id;
            }
        """)
        assert result == "compliance_officer"

    def test_masked_preview_differs_by_role(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/role-comparison/trader');
                const data = await resp.json();
                return {
                    status: resp.status,
                    hasRoles: Object.keys(data).length >= 2
                };
            }
        """)
        assert result["status"] == 200
        assert result["hasRoles"] is True

    def test_audit_log_endpoint(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/audit-log');
                return { status: resp.status };
            }
        """)
        assert result["status"] == 200

    def test_roles_list_endpoint(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/roles');
                const data = await resp.json();
                return { status: resp.status, count: data.roles?.length || 0 };
            }
        """)
        assert result["status"] == 200
        assert result["count"] >= 4
```

**Run tests in batch mode:**
```bash
uv run pytest tests/e2e/test_e2e_views.py::TestDataGovernance -v
```

**Commit:**
```bash
git commit -m "test(governance): add E2E Playwright tests for DataGovernance view (M267)"
```

---

## Task 22.11: Demo Guide + Progress Tracker (M268)

**Goal:** Add DataGovernance to the demo guide and update progress tracker.

**Files:**
- Modify: `docs/demo-guide.md` — add Data Governance section
- Modify: `docs/progress.md` — add M257-M268 entries + update header

**Demo guide section:**

```markdown
### Data Governance — Phase 22

#### Role-Based Data Masking

The Data Governance view (`/governance`) demonstrates how the platform handles PII
dynamically based on the user's role.

#### Walkthrough A: Switch Roles and Compare

1. Navigate to **Data Governance** (`/governance`)
2. Note the **role indicator** in the app header — defaults to "Analyst"
3. On the **Masking Policies** tab, review the 7 masking policies — each shows the entity,
   field, classification level, masking type, and which roles can see unmasked data
4. Switch to the **Data Preview** tab
5. See trader data with **masked values** — trader_name shows "J********h", trader_id shows a hex token
6. Click the **role switcher** in the header → select "Compliance Officer"
7. The data preview **instantly updates** — all fields now show unmasked: "John Smith", "TRD-001"
8. Key takeaway: "The same API, the same data, dynamically masked based on who is looking"

#### Walkthrough B: Audit Log Protection

1. Switch to the **Audit Log** tab
2. As "Analyst", audit entries show masked PII — you can see that a change was made to a
   trader record, but the actual names are masked
3. Switch to "Compliance Officer" → the same audit entries now show full PII
4. Key takeaway: "Even audit logs respect role-based access — analysts can see activity
   patterns without seeing personal data"

#### Guided Scenario

**S34: Role-Based Data Masking** (Governance category, intermediate) — available in the
Scenarios browser. Walks through role switching, data comparison, and audit log masking.
```

**Progress entries:** Add M257 through M268 with descriptions for each milestone.

**Commit:**
```bash
git commit -m "docs(governance): add demo guide section, progress entries M257-M268 (M268)"
```

---

## Task 22.12: Phase D Completion — Full Count Sync, Verification, Final Commit (M269)

**Goal:** Complete ALL Phase D Tier 3 items in one task — no deferred cleanup.

**Files to update with new counts:**
- `docs/development-workflow-protocol.md` — Test Count Sync Registry (ALL locations)
- `docs/feature-development-checklist.md` — header + count locations + version history row
- `CLAUDE.md` — test counts, view count (22), metadata types
- `README.md` — test counts, module count, view count
- `docs/plans/2026-02-24-comprehensive-roadmap.md` — mark Phase 22 COMPLETE, update Current State
- `docs/architecture-traceability.md` — section count + maturity distribution
- `.claude/memory/MEMORY.md` — full state update
- Context-level `MEMORY.md` — full state update

**Expected new counts (verify at runtime):**
- Backend tests: 962 + ~45 new = ~1007
- E2E tests: 224 + 6 new = ~230
- Total: ~1237
- Frontend modules: ~975 (verify with `npm run build`)
- Views: 22 (DataGovernance added)
- Scenarios: 34 (S34 added)
- Architecture sections: 104 (4 new DataGovernance sections)
- Tours: 25 (governance tour added)
- Operations: ~129 (6 new governance operations)

**Verification steps:**

```bash
# 1. Backend tests
uv run python -m qa test backend
# Expected: ALL PASS, ~1007 tests

# 2. Frontend build
cd frontend && npm run build
# Expected: 0 errors, note module count

# 3. Quality gate
uv run python -m qa gate
# Expected: PASS

# 4. E2E tests (run in batches)
uv run pytest tests/e2e/test_e2e_views.py::TestDataGovernance -v
# Expected: ALL PASS

# 5. Playwright visual verification via MCP
# - Navigate to /governance
# - Screenshot each tab
# - Screenshot role switcher
# - Screenshot data preview with analyst vs compliance

# 6. Content accuracy audit
# - Verify tour selectors match DOM
# - Verify scenario labels match navigation
# - Verify architecture registry endpoints match API
# - Verify tour registry counts match actual counts

# 7. Cross-file count consistency
grep -rn "<new_backend_count>" CLAUDE.md README.md docs/ | grep -i "backend\|test"
grep -rn "<new_total_count>" CLAUDE.md README.md docs/ | grep -i "total\|test"

# 8. Regression baseline
uv run python -m qa baseline update
```

**Final commit:**
```bash
git add -A  # Stage all doc updates
git commit -m "docs(governance): Phase D Tier 3 complete — sync all counts, content audit, Playwright verified (M269)"
```

**Push + PR + Merge:**
```bash
git push origin <branch-name>
gh pr create --title "feat(governance): Phase 22 Masking, Encryption & Access Control (M257-M269)" --body "..."
gh pr merge <number> --squash --delete-branch
```

---

## Dependency Graph

```
Task 1 (metadata + models) ──┬──→ Task 2 (MaskingService)
                              ├──→ Task 3 (RBACService)
                              │
Task 2 + Task 3 ──────────────┼──→ Task 4 (API Router + wiring)
                              │
Task 4 ────────────────────────┼──→ Task 5 (Audit-aware masking)
                              │
Task 4 ────────────────────────┼──→ Task 6 (Frontend view)
                              │
Task 6 ────────────────────────┼──→ Task 7 (Global role switcher)
                              │
Task 6 + Task 7 ──────────────┼──→ Task 8 (Tours, scenarios, operations)
                              │
Task 8 ────────────────────────┼──→ Task 9 (Architecture registry + BDD)
                              │
Task 6 + Task 7 ──────────────┼──→ Task 10 (E2E tests)
                              │
Task 9 + Task 10 ─────────────┼──→ Task 11 (Demo guide + progress)
                              │
Task 11 ───────────────────────┴──→ Task 12 (Phase D completion)
```

---

## Milestone Summary

| Milestone | Task | Description |
|-----------|------|-------------|
| M257 | 22.1 | Masking policy metadata, role definitions, Pydantic models |
| M258 | 22.2 | MaskingService — partial, tokenize, generalize, redact, hash |
| M259 | 22.3 | RBACService — role switching, tier access, classification checks |
| M260 | 22.4 | Governance API router — 7 endpoints, service wiring |
| M261 | 22.5 | Audit-aware masking — PII masked at read time |
| M262-M263 | 22.6 | DataGovernance view — 4 tabs, navigation, route |
| M264 | 22.7 | Global role switcher in AppLayout header |
| M265 | 22.8 | Tours, S34 scenario, operations, tour registry |
| M266 | 22.9 | Architecture registry (4 sections), BDD (5 scenarios), traceability |
| M267 | 22.10 | E2E Playwright tests (6 tests) |
| M268 | 22.11 | Demo guide, progress tracker |
| M269 | 22.12 | Phase D Tier 3 — count sync, content audit, verification, merge |
