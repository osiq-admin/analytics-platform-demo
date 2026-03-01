"""RBAC service — role-based access control for tier, classification, audit, and export."""

import json
import logging
from pathlib import Path

from backend.models.governance import RoleDefinition, RoleRegistry

log = logging.getLogger(__name__)


class RBACService:
    """Manages role switching and access checks against the governance role registry."""

    def __init__(self, workspace: Path):
        self._workspace = workspace
        self._registry: RoleRegistry | None = None
        self._current_role_id: str | None = None

    # ---- Internal helpers ----

    @property
    def _roles(self) -> RoleRegistry:
        """Lazy-load the role registry from workspace/metadata/governance/roles.json."""
        if self._registry is not None:
            return self._registry
        roles_path = self._workspace / "metadata" / "governance" / "roles.json"
        if not roles_path.exists():
            self._registry = RoleRegistry()
            return self._registry
        with open(roles_path) as f:
            data = json.load(f)
        self._registry = RoleRegistry(**data)
        return self._registry

    def _role_map(self) -> dict[str, RoleDefinition]:
        return {r.role_id: r for r in self._roles.roles}

    # ---- Public API ----

    @property
    def current_role_id(self) -> str:
        """Return the active role id (defaults to the registry's default_role)."""
        if self._current_role_id is None:
            return self._roles.default_role
        return self._current_role_id

    def list_roles(self) -> list[RoleDefinition]:
        """Return all available role definitions."""
        return list(self._roles.roles)

    def get_current_role(self) -> RoleDefinition:
        """Return the full RoleDefinition for the active role."""
        role = self._role_map().get(self.current_role_id)
        if role is None:
            # Fallback: return first role or a bare default
            if self._roles.roles:
                return self._roles.roles[0]
            return RoleDefinition(role_id="analyst")
        return role

    def get_role(self, role_id: str) -> RoleDefinition | None:
        """Return the RoleDefinition for *role_id*, or None if not found."""
        return self._role_map().get(role_id)

    def switch_role(self, role_id: str) -> None:
        """Switch the active role. Raises ValueError if *role_id* is not in the registry."""
        if role_id not in self._role_map():
            raise ValueError(f"Unknown role: {role_id}")
        self._current_role_id = role_id
        log.info("Switched RBAC role to %s", role_id)

    def can_access_tier(self, tier: str) -> bool:
        """Check whether the current role may access *tier*."""
        return tier in self.get_current_role().tier_access

    def can_view_classification(self, classification: str) -> bool:
        """Check whether the current role may view data at *classification* level."""
        return classification in self.get_current_role().classification_access

    def can_view_audit(self) -> bool:
        """Check whether the current role may view audit logs."""
        return self.get_current_role().can_view_audit

    def can_export(self) -> bool:
        """Check whether the current role may export data."""
        return self.get_current_role().can_export
