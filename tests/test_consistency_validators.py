"""Cross-system consistency validators.

These tests detect when navigation metadata, tour registries, masking policies,
and API modules drift out of sync. They read JSON/Python files directly from
disk — no running server required.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

# Repository root (two levels up from tests/)
REPO_ROOT = Path(__file__).resolve().parent.parent
WORKSPACE = REPO_ROOT / "workspace"
METADATA = WORKSPACE / "metadata"


def _load_json(path: Path) -> dict:
    """Load a JSON file and return its parsed contents."""
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def navigation() -> dict:
    return _load_json(METADATA / "navigation" / "main.json")


@pytest.fixture(scope="module")
def nav_paths(navigation: dict) -> set[str]:
    """All paths defined in navigation metadata, including root."""
    paths: set[str] = {"/"}
    for group in navigation["groups"]:
        for item in group["items"]:
            paths.add(item["path"])
    return paths


@pytest.fixture(scope="module")
def nav_view_ids(navigation: dict) -> set[str]:
    """All view_id values defined in navigation metadata."""
    ids: set[str] = set()
    for group in navigation["groups"]:
        for item in group["items"]:
            ids.add(item["view_id"])
    return ids


@pytest.fixture(scope="module")
def tour_registry() -> dict:
    return _load_json(METADATA / "tours" / "registry.json")


@pytest.fixture(scope="module")
def masking_policies() -> dict:
    return _load_json(METADATA / "governance" / "masking_policies.json")


@pytest.fixture(scope="module")
def governance_roles() -> dict:
    return _load_json(METADATA / "governance" / "roles.json")


@pytest.fixture(scope="module")
def entity_ids() -> set[str]:
    """Entity IDs derived from the entity JSON file names on disk."""
    entity_dir = METADATA / "entities"
    return {p.stem for p in entity_dir.glob("*.json")}


@pytest.fixture(scope="module")
def entity_fields() -> dict[str, set[str]]:
    """Mapping of entity_id -> set of field names from the entity JSON."""
    entity_dir = METADATA / "entities"
    result: dict[str, set[str]] = {}
    for path in entity_dir.glob("*.json"):
        data = _load_json(path)
        eid = data.get("entity_id", path.stem)
        result[eid] = {f["name"] for f in data.get("fields", [])}
    return result


# ===========================================================================
# 1. Navigation Consistency
# ===========================================================================

class TestNavigationConsistency:
    """Validates navigation metadata internal consistency."""

    def test_no_duplicate_paths(self, navigation: dict) -> None:
        """Each path must appear at most once across all navigation groups."""
        paths: list[str] = []
        for group in navigation["groups"]:
            for item in group["items"]:
                paths.append(item["path"])

        duplicates = [p for p in paths if paths.count(p) > 1]
        assert not duplicates, f"Duplicate navigation paths: {set(duplicates)}"

    def test_no_duplicate_view_ids(self, navigation: dict) -> None:
        """Each view_id must be unique across all navigation items."""
        view_ids: list[str] = []
        for group in navigation["groups"]:
            for item in group["items"]:
                view_ids.append(item["view_id"])

        duplicates = [v for v in view_ids if view_ids.count(v) > 1]
        assert not duplicates, f"Duplicate view_ids: {set(duplicates)}"

    def test_paths_start_with_slash(self, navigation: dict) -> None:
        """All navigation paths must start with '/'."""
        bad: list[str] = []
        for group in navigation["groups"]:
            for item in group["items"]:
                if not item["path"].startswith("/"):
                    bad.append(item["path"])
        assert not bad, f"Paths missing leading slash: {bad}"

    def test_group_orders_unique(self, navigation: dict) -> None:
        """Group order values must be unique."""
        orders = [g["order"] for g in navigation["groups"]]
        assert len(orders) == len(set(orders)), f"Duplicate group orders: {orders}"

    def test_item_orders_unique_within_group(self, navigation: dict) -> None:
        """Item order values must be unique within each group."""
        for group in navigation["groups"]:
            orders = [item["order"] for item in group["items"]]
            assert len(orders) == len(set(orders)), (
                f"Duplicate item orders in group '{group['title']}': {orders}"
            )

    def test_all_items_have_required_keys(self, navigation: dict) -> None:
        """Every navigation item must have view_id, label, path, icon, order."""
        required = {"view_id", "label", "path", "icon", "order"}
        for group in navigation["groups"]:
            for item in group["items"]:
                missing = required - set(item.keys())
                assert not missing, (
                    f"Item '{item.get('label', '?')}' missing keys: {missing}"
                )


# ===========================================================================
# 2. Tour Consistency
# ===========================================================================

class TestTourConsistency:
    """Validates tour registry references valid navigation paths."""

    def test_tour_paths_reference_valid_nav_paths(
        self, tour_registry: dict, nav_paths: set[str]
    ) -> None:
        """Every tour view_path must exist in navigation metadata or be root '/'."""
        bad: list[dict[str, str]] = []
        for tour in tour_registry["tours"]:
            if tour["view_path"] not in nav_paths:
                bad.append(
                    {"tour_id": tour["tour_id"], "view_path": tour["view_path"]}
                )
        assert not bad, (
            f"Tour(s) reference non-existent navigation path(s): {bad}"
        )

    def test_no_duplicate_tour_ids(self, tour_registry: dict) -> None:
        """Tour IDs must be unique."""
        ids = [t["tour_id"] for t in tour_registry["tours"]]
        duplicates = [i for i in ids if ids.count(i) > 1]
        assert not duplicates, f"Duplicate tour IDs: {set(duplicates)}"

    def test_tours_have_positive_step_count(self, tour_registry: dict) -> None:
        """Every tour must declare at least 1 step."""
        bad = [
            t["tour_id"]
            for t in tour_registry["tours"]
            if t.get("step_count", 0) < 1
        ]
        assert not bad, f"Tours with step_count < 1: {bad}"

    def test_scenario_counts_consistent(self, tour_registry: dict) -> None:
        """Sum of category counts must equal total_count in scenarios section."""
        scenarios = tour_registry.get("scenarios", {})
        total = scenarios.get("total_count", 0)
        categories = scenarios.get("categories", [])
        cat_sum = sum(c["count"] for c in categories)
        assert cat_sum == total, (
            f"Scenario total_count ({total}) != sum of categories ({cat_sum})"
        )


# ===========================================================================
# 3. Masking Policy Consistency
# ===========================================================================

class TestMaskingPolicyConsistency:
    """Validates masking policies reference valid entities and roles."""

    def test_target_entities_exist(
        self, masking_policies: dict, entity_ids: set[str]
    ) -> None:
        """Every policy target_entity must be a known entity."""
        bad: list[dict[str, str]] = []
        for policy in masking_policies["policies"]:
            if policy["target_entity"] not in entity_ids:
                bad.append(
                    {
                        "policy_id": policy["policy_id"],
                        "target_entity": policy["target_entity"],
                    }
                )
        assert not bad, f"Policies reference unknown entities: {bad}"

    def test_target_fields_exist_on_entity(
        self, masking_policies: dict, entity_fields: dict[str, set[str]]
    ) -> None:
        """Every policy target_field must exist on its target_entity."""
        bad: list[dict[str, str]] = []
        for policy in masking_policies["policies"]:
            entity = policy["target_entity"]
            field = policy["target_field"]
            fields = entity_fields.get(entity, set())
            if field not in fields:
                bad.append(
                    {
                        "policy_id": policy["policy_id"],
                        "target_entity": entity,
                        "target_field": field,
                    }
                )
        assert not bad, f"Policies reference unknown fields: {bad}"

    def test_unmask_roles_are_valid(
        self, masking_policies: dict, governance_roles: dict
    ) -> None:
        """Every unmask_role must be defined in governance/roles.json."""
        valid_roles = {r["role_id"] for r in governance_roles["roles"]}
        bad: list[dict] = []
        for policy in masking_policies["policies"]:
            invalid = set(policy.get("unmask_roles", [])) - valid_roles
            if invalid:
                bad.append(
                    {
                        "policy_id": policy["policy_id"],
                        "invalid_roles": sorted(invalid),
                    }
                )
        assert not bad, f"Policies reference undefined roles: {bad}"

    def test_no_duplicate_policy_ids(self, masking_policies: dict) -> None:
        """Policy IDs must be unique."""
        ids = [p["policy_id"] for p in masking_policies["policies"]]
        duplicates = [i for i in ids if ids.count(i) > 1]
        assert not duplicates, f"Duplicate policy IDs: {set(duplicates)}"

    def test_classification_levels_valid(self, masking_policies: dict) -> None:
        """Classification must be one of LOW, MEDIUM, HIGH."""
        valid = {"LOW", "MEDIUM", "HIGH"}
        bad: list[dict[str, str]] = []
        for policy in masking_policies["policies"]:
            if policy.get("classification") not in valid:
                bad.append(
                    {
                        "policy_id": policy["policy_id"],
                        "classification": policy.get("classification"),
                    }
                )
        assert not bad, f"Policies with invalid classification: {bad}"

    def test_masking_types_valid(self, masking_policies: dict) -> None:
        """Masking type must be one of the supported types."""
        valid = {"partial", "tokenize", "generalize", "redact"}
        bad: list[dict[str, str]] = []
        for policy in masking_policies["policies"]:
            if policy.get("masking_type") not in valid:
                bad.append(
                    {
                        "policy_id": policy["policy_id"],
                        "masking_type": policy.get("masking_type"),
                    }
                )
        assert not bad, f"Policies with invalid masking_type: {bad}"


# ===========================================================================
# 4. API Endpoint Sentinel
# ===========================================================================

class TestAPIEndpointSentinel:
    """Maintains a known-tested set of API modules.

    When a new module is added to ``backend/api/`` the test fails, forcing the
    developer to (a) add tests for the new module and (b) update TESTED_MODULES.
    """

    # This set must match every .py file in backend/api/ that is NOT __init__.py
    TESTED_MODULES: frozenset[str] = frozenset(
        {
            "ai",
            "alerts",
            "archive",
            "cases",
            "dashboard",
            "reports",
            "data",
            "data_info",
            "demo",
            "detection_dry_run",
            "domain_values",
            "glossary",
            "governance",
            "lakehouse",
            "lineage",
            "mappings",
            "match_patterns",
            "medallion",
            "metadata",
            "metrics_api",
            "observability",
            "onboarding",
            "pipeline",
            "platinum",
            "quality",
            "query",
            "reference",
            "sandbox",
            "score_templates",
            "submissions",
            "trace",
            "use_cases",
            "validation",
            "versions",
            "ws",
        }
    )

    @staticmethod
    def _discover_api_modules() -> set[str]:
        """Return the set of Python module names in backend/api/ (excluding __init__)."""
        api_dir = REPO_ROOT / "backend" / "api"
        return {
            p.stem
            for p in api_dir.glob("*.py")
            if p.stem != "__init__"
        }

    def test_no_untested_api_modules(self) -> None:
        """Fails when a new API module exists that is not in TESTED_MODULES.

        If this test fails, it means a new file was added to ``backend/api/``
        without updating the sentinel set. Steps to fix:
        1. Write tests for the new module.
        2. Add its name (without .py) to TESTED_MODULES above.
        """
        on_disk = self._discover_api_modules()
        new_modules = on_disk - self.TESTED_MODULES
        assert not new_modules, (
            f"New API module(s) detected without test coverage registration: "
            f"{sorted(new_modules)}. Add tests and update TESTED_MODULES in "
            f"{__file__}"
        )

    def test_no_stale_sentinel_entries(self) -> None:
        """Fails when TESTED_MODULES references a module that no longer exists.

        Keeps the sentinel set clean — if a module is removed, update the set.
        """
        on_disk = self._discover_api_modules()
        stale = self.TESTED_MODULES - on_disk
        assert not stale, (
            f"TESTED_MODULES contains module(s) no longer on disk: "
            f"{sorted(stale)}. Remove them from TESTED_MODULES in {__file__}"
        )

    def test_sentinel_set_not_empty(self) -> None:
        """Sanity check: the sentinel set must not be accidentally emptied."""
        assert len(self.TESTED_MODULES) > 0, "TESTED_MODULES is empty — this is a bug"

    def test_api_directory_exists(self) -> None:
        """Sanity check: backend/api/ must exist."""
        api_dir = REPO_ROOT / "backend" / "api"
        assert api_dir.is_dir(), f"Expected API directory at {api_dir}"
