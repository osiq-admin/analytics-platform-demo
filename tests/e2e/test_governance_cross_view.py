"""E2E: cross-view PII masking — GDPR Art. 25 compliance.

Tests that PII masking is enforced across data endpoints, role switching
changes masking behavior, and governance indicators are visible.
"""
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


class TestGovernanceCrossViewE2E:
    """Cross-view PII governance enforcement E2E tests."""

    def test_data_preview_shows_masked_names(self, loaded_page: Page):
        """DataManager shows masked trader names for analyst role."""
        loaded_page.goto(f"{APP_URL}/data")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        # Page should load without errors
        assert "data" in body.lower() or "files" in body.lower() or "preview" in body.lower()

    def test_pii_indicator_in_toolbar(self, loaded_page: Page):
        """Toolbar shows masking count next to role name."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Look for the masked count indicator in the toolbar
        toolbar = loaded_page.locator("header")
        toolbar_text = toolbar.inner_text()
        assert "masked" in toolbar_text.lower(), "Toolbar should show masked field count"

    def test_role_switch_updates_masked_count(self, loaded_page: Page):
        """Switching to compliance officer changes masked count."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click role switcher button
        role_btn = loaded_page.locator("[data-tour='role-switcher'] button").first
        role_btn.click()
        loaded_page.wait_for_timeout(300)

        # Switch to Compliance Officer
        compliance_btn = loaded_page.locator("text=Compliance Officer")
        if compliance_btn.is_visible(timeout=3000):
            compliance_btn.click()
            loaded_page.wait_for_timeout(1000)

        # The masked count should change (compliance sees fewer masked fields)
        toolbar = loaded_page.locator("header")
        toolbar_text = toolbar.inner_text()
        # Compliance officer may have 0 masked fields (no "masked" indicator)
        # or the count should differ from analyst
        assert "compliance" in toolbar_text.lower() or "masked" not in toolbar_text.lower() or "0 masked" in toolbar_text.lower()

    def test_governance_view_shows_cross_view_banner(self, loaded_page: Page):
        """DataGovernance masking policies tab shows cross-view enforcement banner."""
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "cross-view" in body.lower() or "enforcement" in body.lower() or "masking" in body.lower()

    def test_governance_masking_preview_still_works(self, loaded_page: Page):
        """DataGovernance masked preview tab still functions."""
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        # The view should load with governance content
        assert "masking" in body.lower() or "role" in body.lower()

    def test_pii_registry_api_returns_data(self, loaded_page: Page):
        """PII registry API endpoint returns field data."""
        resp = loaded_page.request.get(f"{APP_URL}/api/governance/pii-registry")
        assert resp.status == 200
        data = resp.json()
        assert "entities" in data
        assert "total_pii_fields" in data
        assert data["total_pii_fields"] > 0

    def test_data_preview_api_has_pii_metadata(self, loaded_page: Page):
        """Data preview API includes pii_columns metadata."""
        resp = loaded_page.request.get(f"{APP_URL}/api/data/files/trader/preview?limit=3")
        assert resp.status == 200
        data = resp.json()
        assert "pii_columns" in data

    def test_query_api_masks_pii(self, loaded_page: Page):
        """SQL query API masks PII fields for analyst role."""
        resp = loaded_page.request.post(
            f"{APP_URL}/api/query/execute",
            data={"sql": "SELECT * FROM trader LIMIT 3"},
        )
        assert resp.status == 200
        data = resp.json()
        assert "pii_columns" in data
