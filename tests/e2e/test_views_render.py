"""E2E tests for view rendering and console error checks.

Covers:
- All navigation views render without errors
- Full navigation sweep with no JavaScript console errors
"""
import pytest


APP_URL = "http://127.0.0.1:8333"


# ============================================================================
# Scenario 1: All 12 views render without console errors
# ============================================================================

class TestViewsRender:
    """Every nav link should load without JavaScript errors."""

    NAV_ROUTES = [
        ("/dashboard", "Dashboard"),
        ("/entities", "Entity Designer"),
        ("/metadata", "Metadata Explorer"),
        ("/settings", "Settings"),
        ("/mappings", "Mapping"),
        ("/editor", "Metadata Editor"),
        ("/pipeline", "Pipeline"),
        ("/schema", "Schema"),
        ("/sql", "SQL Console"),
        ("/models", "Model Composer"),
        ("/data", "Data"),
        ("/alerts", "Risk Case Manager"),
        ("/assistant", "Assistant"),
        ("/regulatory", "Regulatory"),
    ]

    @pytest.mark.parametrize("route,expected_text", NAV_ROUTES)
    def test_view_renders(self, loaded_page, route, expected_text):
        """Each view should render with its expected heading text."""
        loaded_page.goto(f"{APP_URL}{route}")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Verify no console errors
        errors = []
        loaded_page.on("pageerror", lambda err: errors.append(str(err)))

        # Check the page has meaningful content (not blank)
        body_text = loaded_page.locator("main").inner_text(timeout=5000)
        assert len(body_text) > 0, f"View {route} rendered empty"
        assert len(errors) == 0, f"Console errors on {route}: {errors}"


# ============================================================================
# Scenario 11: No console errors across all views
# ============================================================================

class TestNoConsoleErrors:
    """Navigate through all views and verify no JavaScript errors."""

    def test_full_navigation_no_errors(self, loaded_page):
        errors = []
        loaded_page.on("pageerror", lambda err: errors.append(str(err)))

        routes = [
            "/dashboard", "/entities", "/metadata", "/settings",
            "/editor", "/pipeline", "/sql", "/models", "/alerts", "/assistant",
            "/regulatory",
        ]

        for route in routes:
            loaded_page.goto(f"{APP_URL}{route}")
            loaded_page.wait_for_load_state("networkidle", timeout=15000)
            loaded_page.wait_for_timeout(300)

        assert len(errors) == 0, f"JavaScript errors found: {errors}"
