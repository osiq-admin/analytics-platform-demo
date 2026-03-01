"""Tests for MaskingService — dynamic data masking with RBAC policy enforcement."""

import json
from pathlib import Path

import pytest

from backend.services.masking_service import MaskingService


# ---- Fixtures ----

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
        {
            "policy_id": "mask_account_country",
            "target_entity": "account",
            "target_field": "registration_country",
            "classification": "LOW",
            "masking_type": "generalize",
            "algorithm": "region_bucket",
            "params": {},
            "unmask_roles": ["compliance_officer", "data_engineer", "admin"],
            "audit_unmask": False,
        },
        {
            "policy_id": "mask_account_ssn",
            "target_entity": "account",
            "target_field": "ssn",
            "classification": "HIGH",
            "masking_type": "redact",
            "algorithm": "",
            "params": {},
            "unmask_roles": ["admin"],
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
}


@pytest.fixture
def mask_workspace(tmp_path):
    """Create a temporary workspace with masking_policies.json and roles.json."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    gov_dir = ws / "metadata" / "governance"
    gov_dir.mkdir(parents=True)
    (gov_dir / "masking_policies.json").write_text(json.dumps(SAMPLE_POLICIES))
    (gov_dir / "roles.json").write_text(json.dumps(SAMPLE_ROLES))
    return ws


@pytest.fixture
def svc(mask_workspace):
    """Create MaskingService instance with test workspace."""
    return MaskingService(mask_workspace)


# ---- TestMaskingServiceLoad ----


class TestMaskingServiceLoad:
    """Loading policies and roles from workspace metadata."""

    def test_loads_policies(self, svc):
        policies = svc.policies
        assert policies.version == "1.0"
        assert len(policies.policies) == 4

    def test_loads_roles(self, svc):
        roles = svc.roles
        assert roles.version == "1.0"
        assert roles.default_role == "analyst"
        assert len(roles.roles) == 3

    def test_get_policies_for_entity_trader(self, svc):
        trader_policies = svc.get_policies_for_entity("trader")
        assert len(trader_policies) == 2
        ids = {p.policy_id for p in trader_policies}
        assert "mask_trader_name" in ids
        assert "mask_trader_id" in ids

    def test_get_policies_for_entity_account(self, svc):
        account_policies = svc.get_policies_for_entity("account")
        assert len(account_policies) == 2
        ids = {p.policy_id for p in account_policies}
        assert "mask_account_country" in ids
        assert "mask_account_ssn" in ids

    def test_get_policies_for_unknown_entity(self, svc):
        policies = svc.get_policies_for_entity("nonexistent")
        assert len(policies) == 0

    def test_get_role(self, svc):
        role = svc.get_role("analyst")
        assert role is not None
        assert role.display_name == "Surveillance Analyst"

    def test_get_role_unknown(self, svc):
        role = svc.get_role("nonexistent")
        assert role is None

    def test_policies_cached(self, svc):
        """Second access returns same object (lazy load caching)."""
        p1 = svc.policies
        p2 = svc.policies
        assert p1 is p2

    def test_roles_cached(self, svc):
        """Second access returns same object (lazy load caching)."""
        r1 = svc.roles
        r2 = svc.roles
        assert r1 is r2

    def test_missing_policies_file(self, tmp_path):
        """Gracefully handles missing policies file."""
        ws = tmp_path / "workspace"
        ws.mkdir()
        gov_dir = ws / "metadata" / "governance"
        gov_dir.mkdir(parents=True)
        (gov_dir / "roles.json").write_text(json.dumps(SAMPLE_ROLES))
        service = MaskingService(ws)
        policies = service.policies
        assert len(policies.policies) == 0

    def test_missing_roles_file(self, tmp_path):
        """Gracefully handles missing roles file."""
        ws = tmp_path / "workspace"
        ws.mkdir()
        gov_dir = ws / "metadata" / "governance"
        gov_dir.mkdir(parents=True)
        (gov_dir / "masking_policies.json").write_text(json.dumps(SAMPLE_POLICIES))
        service = MaskingService(ws)
        roles = service.roles
        assert len(roles.roles) == 0


# ---- TestPartialMasking ----


class TestPartialMasking:
    """Partial masking with first_last_char algorithm."""

    def test_normal_name(self, svc):
        result = svc.apply_mask("John Smith", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "J********h"

    def test_medium_name(self, svc):
        result = svc.apply_mask("Alice", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "A***e"

    def test_short_name_unchanged(self, svc):
        """Names too short to mask (2 chars or fewer) returned unchanged."""
        result = svc.apply_mask("AB", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "AB"

    def test_single_char_unchanged(self, svc):
        result = svc.apply_mask("X", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == "X"

    def test_empty_string(self, svc):
        result = svc.apply_mask("", "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result == ""

    def test_none_value(self, svc):
        result = svc.apply_mask(None, "partial", {"mask_char": "*", "visible_start": 1, "visible_end": 1})
        assert result is None

    def test_custom_mask_char(self, svc):
        result = svc.apply_mask("Hello", "partial", {"mask_char": "#", "visible_start": 1, "visible_end": 1})
        assert result == "H###o"

    def test_wider_visible_window(self, svc):
        result = svc.apply_mask("John Smith", "partial", {"mask_char": "*", "visible_start": 2, "visible_end": 2})
        assert result == "Jo******th"


# ---- TestTokenizeMasking ----


class TestTokenizeMasking:
    """Tokenize masking with sha256 prefix."""

    def test_produces_hex_prefix(self, svc):
        result = svc.apply_mask("TR-001", "tokenize", {"prefix_length": 8})
        assert isinstance(result, str)
        assert len(result) == 8
        # Should be valid hex
        int(result, 16)

    def test_deterministic(self, svc):
        """Same input always produces same token."""
        r1 = svc.apply_mask("TR-001", "tokenize", {"prefix_length": 8})
        r2 = svc.apply_mask("TR-001", "tokenize", {"prefix_length": 8})
        assert r1 == r2

    def test_different_values_differ(self, svc):
        r1 = svc.apply_mask("TR-001", "tokenize", {"prefix_length": 8})
        r2 = svc.apply_mask("TR-002", "tokenize", {"prefix_length": 8})
        assert r1 != r2

    def test_none_value(self, svc):
        result = svc.apply_mask(None, "tokenize", {"prefix_length": 8})
        assert result is None

    def test_custom_prefix_length(self, svc):
        result = svc.apply_mask("TR-001", "tokenize", {"prefix_length": 12})
        assert len(result) == 12

    def test_default_prefix_length(self, svc):
        """Without prefix_length param, defaults to 8."""
        result = svc.apply_mask("TR-001", "tokenize", {})
        assert len(result) == 8


# ---- TestGeneralizeMasking ----


class TestGeneralizeMasking:
    """Generalize masking — country to region mapping."""

    def test_known_country_europe(self, svc):
        result = svc.apply_mask("United Kingdom", "generalize", {})
        assert result == "Europe"

    def test_known_country_americas(self, svc):
        result = svc.apply_mask("United States", "generalize", {})
        assert result == "Americas"

    def test_known_country_asia(self, svc):
        result = svc.apply_mask("Japan", "generalize", {})
        assert result == "Asia-Pacific"

    def test_unknown_country(self, svc):
        result = svc.apply_mask("Narnia", "generalize", {})
        assert result == "Other"

    def test_none_value(self, svc):
        result = svc.apply_mask(None, "generalize", {})
        assert result is None

    def test_empty_string(self, svc):
        result = svc.apply_mask("", "generalize", {})
        assert result == "Other"

    def test_germany_europe(self, svc):
        assert svc.apply_mask("Germany", "generalize", {}) == "Europe"

    def test_brazil_americas(self, svc):
        assert svc.apply_mask("Brazil", "generalize", {}) == "Americas"

    def test_australia_asia_pacific(self, svc):
        assert svc.apply_mask("Australia", "generalize", {}) == "Asia-Pacific"

    def test_uae_middle_east(self, svc):
        assert svc.apply_mask("United Arab Emirates", "generalize", {}) == "Middle East"

    def test_south_africa_africa(self, svc):
        assert svc.apply_mask("South Africa", "generalize", {}) == "Africa"


# ---- TestRedactMasking ----


class TestRedactMasking:
    """Redact masking — replaces value with sentinel."""

    def test_redact_string(self, svc):
        result = svc.apply_mask("123-45-6789", "redact", {})
        assert result == "***REDACTED***"

    def test_redact_any_value(self, svc):
        result = svc.apply_mask("anything", "redact", {})
        assert result == "***REDACTED***"

    def test_none_value(self, svc):
        result = svc.apply_mask(None, "redact", {})
        assert result is None

    def test_empty_string(self, svc):
        result = svc.apply_mask("", "redact", {})
        assert result == "***REDACTED***"


# ---- TestHashMasking ----


class TestHashMasking:
    """Hash masking — sha256 truncated to 16 chars."""

    def test_hash_produces_hex(self, svc):
        result = svc.apply_mask("some-value", "hash", {})
        assert isinstance(result, str)
        assert len(result) == 16
        int(result, 16)  # valid hex

    def test_hash_deterministic(self, svc):
        r1 = svc.apply_mask("some-value", "hash", {})
        r2 = svc.apply_mask("some-value", "hash", {})
        assert r1 == r2

    def test_hash_different_values(self, svc):
        r1 = svc.apply_mask("value-a", "hash", {})
        r2 = svc.apply_mask("value-b", "hash", {})
        assert r1 != r2

    def test_hash_none(self, svc):
        result = svc.apply_mask(None, "hash", {})
        assert result is None


# ---- TestNoneMasking ----


class TestNoneMasking:
    """No masking / unknown masking type — value passes through."""

    def test_none_type(self, svc):
        result = svc.apply_mask("original", "none", {})
        assert result == "original"

    def test_unknown_type(self, svc):
        result = svc.apply_mask("original", "unknown_type", {})
        assert result == "original"

    def test_none_value_with_none_type(self, svc):
        result = svc.apply_mask(None, "none", {})
        assert result is None


# ---- TestMaskRecord ----


class TestMaskRecord:
    """Record-level masking with RBAC enforcement."""

    def test_analyst_sees_masked_trader(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"}
        masked = svc.mask_record("trader", record, "analyst")
        # trader_name should be partially masked
        assert masked["trader_name"] == "J********h"
        # trader_id should be tokenized (8-char hex)
        assert len(masked["trader_id"]) == 8
        assert masked["trader_id"] != "TR-001"
        # desk is not a PII field — unchanged
        assert masked["desk"] == "Equities"

    def test_compliance_sees_unmasked(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"}
        masked = svc.mask_record("trader", record, "compliance_officer")
        assert masked["trader_name"] == "John Smith"
        assert masked["trader_id"] == "TR-001"
        assert masked["desk"] == "Equities"

    def test_admin_sees_unmasked(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"}
        masked = svc.mask_record("trader", record, "admin")
        assert masked["trader_name"] == "John Smith"
        assert masked["trader_id"] == "TR-001"

    def test_batch_masking(self, svc):
        records = [
            {"trader_name": "Alice Jones", "trader_id": "TR-010", "desk": "FX"},
            {"trader_name": "Bob Lee", "trader_id": "TR-020", "desk": "Rates"},
        ]
        masked = svc.mask_records("trader", records, "analyst")
        assert len(masked) == 2
        assert masked[0]["trader_name"] == "A*********s"
        assert masked[1]["trader_name"] == "B*****e"
        # Desks unchanged
        assert masked[0]["desk"] == "FX"
        assert masked[1]["desk"] == "Rates"

    def test_none_values_preserved(self, svc):
        record = {"trader_name": None, "trader_id": "TR-001", "desk": "Equities"}
        masked = svc.mask_record("trader", record, "analyst")
        assert masked["trader_name"] is None
        # trader_id still gets masked
        assert masked["trader_id"] != "TR-001"

    def test_no_policies_entity(self, svc):
        """Entity with no masking policies — record unchanged."""
        record = {"venue_mic": "XLON", "name": "London Stock Exchange"}
        masked = svc.mask_record("venue", record, "analyst")
        assert masked == record

    def test_original_record_not_mutated(self, svc):
        """Masking produces a new dict, does not mutate original."""
        record = {"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"}
        svc.mask_record("trader", record, "analyst")
        assert record["trader_name"] == "John Smith"
        assert record["trader_id"] == "TR-001"

    def test_account_generalize_for_analyst(self, svc):
        record = {"registration_country": "United Kingdom", "ssn": "123-45-6789"}
        masked = svc.mask_record("account", record, "analyst")
        assert masked["registration_country"] == "Europe"
        assert masked["ssn"] == "***REDACTED***"


# ---- TestMaskingMetadata ----


class TestMaskingMetadata:
    """mask_record_with_metadata returns tuple with masking audit trail."""

    def test_returns_tuple(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"}
        result = svc.mask_record_with_metadata("trader", record, "analyst")
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_metadata_for_masked_field(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TR-001", "desk": "Equities"}
        masked_record, metadata = svc.mask_record_with_metadata("trader", record, "analyst")

        assert "trader_name" in metadata
        assert metadata["trader_name"]["masked"] is True
        assert metadata["trader_name"]["masking_type"] == "partial"
        assert metadata["trader_name"]["classification"] == "HIGH"

        assert "trader_id" in metadata
        assert metadata["trader_id"]["masked"] is True
        assert metadata["trader_id"]["masking_type"] == "tokenize"
        assert metadata["trader_id"]["classification"] == "MEDIUM"

    def test_metadata_for_unmasked_field(self, svc):
        record = {"trader_name": "John Smith", "desk": "Equities"}
        _, metadata = svc.mask_record_with_metadata("trader", record, "analyst")
        # desk has no masking policy — not in metadata
        assert "desk" not in metadata

    def test_metadata_compliance_unmasked(self, svc):
        record = {"trader_name": "John Smith", "trader_id": "TR-001"}
        masked_record, metadata = svc.mask_record_with_metadata("trader", record, "compliance_officer")
        # Compliance has unmask access — fields not masked
        assert "trader_name" in metadata
        assert metadata["trader_name"]["masked"] is False
        assert masked_record["trader_name"] == "John Smith"

    def test_metadata_no_policies(self, svc):
        record = {"venue_mic": "XLON"}
        masked_record, metadata = svc.mask_record_with_metadata("venue", record, "analyst")
        assert metadata == {}
        assert masked_record["venue_mic"] == "XLON"
