"""Tests for the RBACService — role loading, switching, and access checks."""
import json

import pytest

from backend.services.rbac_service import RBACService


@pytest.fixture()
def rbac_workspace(tmp_path):
    """Create a minimal workspace with governance/roles.json containing 3 roles."""
    gov_dir = tmp_path / "metadata" / "governance"
    gov_dir.mkdir(parents=True)
    roles_data = {
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
                "description": "Full PII access for regulatory investigations",
                "icon": "Shield",
                "tier_access": ["silver", "gold", "platinum", "quarantine", "reference", "archive"],
                "classification_access": ["LOW", "MEDIUM", "HIGH"],
                "can_export": True,
                "can_view_audit": True,
            },
            {
                "role_id": "admin",
                "display_name": "Administrator",
                "description": "Full access — all tiers, all data, audit logs",
                "icon": "Crown",
                "tier_access": [
                    "landing", "bronze", "silver", "gold", "platinum",
                    "quarantine", "reference", "sandbox", "logging", "metrics", "archive",
                ],
                "classification_access": ["LOW", "MEDIUM", "HIGH"],
                "can_export": True,
                "can_view_audit": True,
            },
        ],
    }
    (gov_dir / "roles.json").write_text(json.dumps(roles_data, indent=2))
    return tmp_path


@pytest.fixture()
def rbac(rbac_workspace):
    """Return an RBACService instance backed by the test workspace."""
    return RBACService(rbac_workspace)


# ---------------------------------------------------------------------------
# TestRoleLoading
# ---------------------------------------------------------------------------


class TestRoleLoading:
    """Verify that the service loads the role registry correctly."""

    def test_loads_three_roles(self, rbac):
        """Service should discover all 3 roles defined in the fixture."""
        roles = rbac.list_roles()
        assert len(roles) == 3

    def test_default_role_is_analyst(self, rbac):
        """The default current role should match the registry's default_role."""
        assert rbac.current_role_id == "analyst"

    def test_get_current_role_returns_analyst(self, rbac):
        """get_current_role() should return the full RoleDefinition for analyst."""
        role = rbac.get_current_role()
        assert role.role_id == "analyst"
        assert role.display_name == "Surveillance Analyst"

    def test_get_role_by_id(self, rbac):
        """get_role() should return the matching RoleDefinition."""
        role = rbac.get_role("compliance_officer")
        assert role is not None
        assert role.role_id == "compliance_officer"

    def test_get_role_unknown_returns_none(self, rbac):
        """get_role() should return None for an unknown role_id."""
        assert rbac.get_role("nonexistent") is None


# ---------------------------------------------------------------------------
# TestRoleSwitching
# ---------------------------------------------------------------------------


class TestRoleSwitching:
    """Verify role switching behaviour."""

    def test_switch_to_valid_role(self, rbac):
        """Switching to a known role should update current_role_id."""
        rbac.switch_role("compliance_officer")
        assert rbac.current_role_id == "compliance_officer"

    def test_switch_to_invalid_role_raises(self, rbac):
        """Switching to an unknown role should raise ValueError."""
        with pytest.raises(ValueError, match="Unknown role"):
            rbac.switch_role("hacker")

    def test_switch_back(self, rbac):
        """Switching away and back should restore the original role."""
        rbac.switch_role("admin")
        assert rbac.current_role_id == "admin"
        rbac.switch_role("analyst")
        assert rbac.current_role_id == "analyst"


# ---------------------------------------------------------------------------
# TestAccessChecks
# ---------------------------------------------------------------------------


class TestAccessChecks:
    """Verify tier, classification, audit, and export access checks."""

    # -- Tier access --

    def test_analyst_can_access_gold(self, rbac):
        """Analyst has gold in tier_access."""
        assert rbac.can_access_tier("gold") is True

    def test_analyst_cannot_access_silver(self, rbac):
        """Analyst does NOT have silver in tier_access."""
        assert rbac.can_access_tier("silver") is False

    def test_compliance_can_access_silver(self, rbac):
        """Compliance officer has silver in tier_access."""
        rbac.switch_role("compliance_officer")
        assert rbac.can_access_tier("silver") is True

    # -- Classification access --

    def test_analyst_can_see_low_classification(self, rbac):
        """Analyst has LOW in classification_access."""
        assert rbac.can_view_classification("LOW") is True

    def test_analyst_cannot_see_high_classification(self, rbac):
        """Analyst does NOT have HIGH in classification_access."""
        assert rbac.can_view_classification("HIGH") is False

    def test_compliance_can_see_high_classification(self, rbac):
        """Compliance officer has HIGH in classification_access."""
        rbac.switch_role("compliance_officer")
        assert rbac.can_view_classification("HIGH") is True

    # -- Audit access --

    def test_analyst_cannot_view_audit(self, rbac):
        """Analyst has can_view_audit=False."""
        assert rbac.can_view_audit() is False

    def test_compliance_can_view_audit(self, rbac):
        """Compliance officer has can_view_audit=True."""
        rbac.switch_role("compliance_officer")
        assert rbac.can_view_audit() is True

    # -- Export access --

    def test_analyst_cannot_export(self, rbac):
        """Analyst has can_export=False."""
        assert rbac.can_export() is False

    def test_compliance_can_export(self, rbac):
        """Compliance officer has can_export=True."""
        rbac.switch_role("compliance_officer")
        assert rbac.can_export() is True
