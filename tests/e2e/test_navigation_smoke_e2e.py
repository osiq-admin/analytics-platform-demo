"""E2E navigation smoke test: visit every sidebar path, verify no errors.

Unlike test_e2e_views.py::TestViewsRender which has a hardcoded list,
this test reads navigation paths dynamically from main.json. When new
views are added to navigation, they are automatically included.
"""

import json
from pathlib import Path

import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
NAV_PATH = PROJECT_ROOT / "workspace" / "metadata" / "navigation" / "main.json"


def _get_nav_routes():
    """Read all navigation paths from main.json."""
    nav = json.loads(NAV_PATH.read_text())
    routes = []
    for group in nav.get("groups", []):
        for item in group.get("items", []):
            path = item.get("path")
            label = item.get("label", path)
            if path:
                routes.append((path, label))
    return routes


NAV_ROUTES = _get_nav_routes()


class TestNavigationSmoke:
    """Every navigation path loads without JS errors or blank screen."""

    @pytest.mark.parametrize("path,label", NAV_ROUTES, ids=[r[0] for r in NAV_ROUTES])
    def test_nav_path_loads(self, loaded_page, path, label):
        """Navigate to {path} and verify content renders."""
        errors = []
        loaded_page.on("pageerror", lambda err: errors.append(str(err)))

        loaded_page.goto(f"{APP_URL}{path}")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Page should have content (not blank)
        body = loaded_page.locator("main")
        expect(body).to_be_visible(timeout=5000)
        body_text = body.inner_text(timeout=5000)
        assert len(body_text.strip()) > 0, f"View '{label}' at {path} rendered empty"

        # No JS errors
        assert len(errors) == 0, f"JS errors on {path}: {errors}"
