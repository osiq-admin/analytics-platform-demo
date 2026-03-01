"""Dynamic data masking service — applies field-level masking based on policies and RBAC roles."""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from backend.models.governance import (
    MaskingPolicies,
    MaskingPolicy,
    RoleDefinition,
    RoleRegistry,
)

log = logging.getLogger(__name__)

# Country-to-region mapping for generalize masking (~25 countries)
COUNTRY_REGIONS: dict[str, str] = {
    # Americas
    "United States": "Americas",
    "Canada": "Americas",
    "Mexico": "Americas",
    "Brazil": "Americas",
    "Argentina": "Americas",
    "Chile": "Americas",
    "Colombia": "Americas",
    # Europe
    "United Kingdom": "Europe",
    "Germany": "Europe",
    "France": "Europe",
    "Italy": "Europe",
    "Spain": "Europe",
    "Netherlands": "Europe",
    "Switzerland": "Europe",
    "Ireland": "Europe",
    "Luxembourg": "Europe",
    # Asia-Pacific
    "Japan": "Asia-Pacific",
    "China": "Asia-Pacific",
    "Hong Kong": "Asia-Pacific",
    "Singapore": "Asia-Pacific",
    "Australia": "Asia-Pacific",
    "India": "Asia-Pacific",
    "South Korea": "Asia-Pacific",
    # Middle East
    "United Arab Emirates": "Middle East",
    "Saudi Arabia": "Middle East",
    "Qatar": "Middle East",
    # Africa
    "South Africa": "Africa",
    "Nigeria": "Africa",
    "Kenya": "Africa",
}


class MaskingService:
    """Applies dynamic data masking based on governance policies and role-based access control.

    Usage:
        svc = MaskingService(workspace_path)
        masked = svc.mask_record("trader", raw_record, "analyst")
    """

    def __init__(self, workspace: Path):
        self._workspace = workspace
        self._policies_path = workspace / "metadata" / "governance" / "masking_policies.json"
        self._roles_path = workspace / "metadata" / "governance" / "roles.json"
        self._policies: MaskingPolicies | None = None
        self._roles: RoleRegistry | None = None

    # ---- Lazy-loaded properties ----

    @property
    def policies(self) -> MaskingPolicies:
        """Load masking policies from workspace metadata (lazy, cached)."""
        if self._policies is not None:
            return self._policies
        if not self._policies_path.exists():
            log.warning("Masking policies file not found: %s", self._policies_path)
            self._policies = MaskingPolicies()
            return self._policies
        with open(self._policies_path) as f:
            data = json.load(f)
        self._policies = MaskingPolicies(**data)
        return self._policies

    @property
    def roles(self) -> RoleRegistry:
        """Load role registry from workspace metadata (lazy, cached)."""
        if self._roles is not None:
            return self._roles
        if not self._roles_path.exists():
            log.warning("Role registry file not found: %s", self._roles_path)
            self._roles = RoleRegistry()
            return self._roles
        with open(self._roles_path) as f:
            data = json.load(f)
        self._roles = RoleRegistry(**data)
        return self._roles

    # ---- Policy lookups ----

    def get_policies_for_entity(self, entity_id: str) -> list[MaskingPolicy]:
        """Return all masking policies that apply to the given entity."""
        return [p for p in self.policies.policies if p.target_entity == entity_id]

    def get_role(self, role_id: str) -> RoleDefinition | None:
        """Look up a role definition by ID."""
        for role in self.roles.roles:
            if role.role_id == role_id:
                return role
        return None

    # ---- Masking algorithms ----

    def apply_mask(self, value, masking_type: str, params: dict):
        """Apply a masking transformation to a single value.

        Args:
            value: The value to mask. Returns None unchanged.
            masking_type: One of "partial", "tokenize", "hash", "generalize", "redact", "none".
            params: Algorithm-specific parameters.

        Returns:
            The masked value, or None if the input was None.
        """
        if value is None:
            return None

        if masking_type == "partial":
            return self._mask_partial(str(value), params)
        if masking_type == "tokenize":
            return self._mask_tokenize(str(value), params)
        if masking_type == "hash":
            return self._mask_hash(str(value))
        if masking_type == "generalize":
            return self._mask_generalize(str(value))
        if masking_type == "redact":
            return "***REDACTED***"
        # "none" or unknown — pass through
        return value

    # ---- Record-level masking ----

    def mask_record(self, entity_id: str, record: dict, role_id: str) -> dict:
        """Mask PII fields in a record based on entity policies and role access.

        Returns a new dict (does not mutate the original).
        """
        policies = self.get_policies_for_entity(entity_id)
        if not policies:
            return dict(record)

        masked = dict(record)
        for policy in policies:
            field = policy.target_field
            if field not in masked:
                continue
            if role_id in policy.unmask_roles:
                continue
            masked[field] = self.apply_mask(masked[field], policy.masking_type, policy.params)

        return masked

    def mask_records(self, entity_id: str, records: list[dict], role_id: str) -> list[dict]:
        """Batch masking — apply mask_record to each record in the list."""
        return [self.mask_record(entity_id, r, role_id) for r in records]

    def mask_record_with_metadata(
        self, entity_id: str, record: dict, role_id: str
    ) -> tuple[dict, dict]:
        """Mask a record and return masking metadata for audit trail.

        Returns:
            Tuple of (masked_record, metadata_dict) where metadata_dict maps
            field names to masking details (masked, masking_type, classification).
        """
        policies = self.get_policies_for_entity(entity_id)
        if not policies:
            return dict(record), {}

        masked = dict(record)
        metadata: dict[str, dict] = {}

        for policy in policies:
            field = policy.target_field
            if field not in masked:
                continue

            is_unmasked = role_id in policy.unmask_roles
            if not is_unmasked:
                masked[field] = self.apply_mask(masked[field], policy.masking_type, policy.params)

            metadata[field] = {
                "masked": not is_unmasked,
                "masking_type": policy.masking_type,
                "classification": policy.classification,
            }

        return masked, metadata

    # ---- Private masking implementations ----

    @staticmethod
    def _mask_partial(value: str, params: dict) -> str:
        """Partial masking — show first N and last N characters, mask the middle."""
        if not value:
            return value
        mask_char = params.get("mask_char", "*")
        visible_start = params.get("visible_start", 1)
        visible_end = params.get("visible_end", 1)
        min_length = visible_start + visible_end + 1
        if len(value) < min_length:
            return value
        middle_len = len(value) - visible_start - visible_end
        return value[:visible_start] + (mask_char * middle_len) + value[-visible_end:]

    @staticmethod
    def _mask_tokenize(value: str, params: dict) -> str:
        """Tokenize — deterministic sha256 hex prefix."""
        prefix_length = params.get("prefix_length", 8)
        digest = hashlib.sha256(value.encode()).hexdigest()
        return digest[:prefix_length]

    @staticmethod
    def _mask_hash(value: str) -> str:
        """Hash — sha256 truncated to 16 hex characters."""
        return hashlib.sha256(value.encode()).hexdigest()[:16]

    @staticmethod
    def _mask_generalize(value: str) -> str:
        """Generalize — map country to region bucket."""
        return COUNTRY_REGIONS.get(value, "Other")
