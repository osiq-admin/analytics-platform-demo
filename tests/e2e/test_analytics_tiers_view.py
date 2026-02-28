"""E2E tests for the Analytics Tiers view (Phase 20).

Covers:
- View loads at /analytics-tiers with header
- All 3 tier tabs (Platinum KPIs, Sandbox, Archive) visible
- Platinum tab shows KPI definition cards from metadata
- Sandbox tab shows sandbox list panel with Create button
- Archive tab shows retention policies table with regulation names
- Sidebar entry links to /analytics-tiers
- Archive tab shows GDPR-relevant policy flag
"""
import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


class TestAnalyticsTiersView:
    """E2E tests for the Analytics Tiers view."""

    @pytest.fixture(autouse=True)
    def navigate(self, loaded_page: Page):
        """Navigate to the Analytics Tiers view."""
        self.page = loaded_page
        self.page.goto(f"{APP_URL}/analytics-tiers")
        self.page.wait_for_load_state("networkidle")

    def test_view_loads(self):
        """Analytics Tiers view loads at /analytics-tiers with heading."""
        expect(self.page.locator("h1", has_text="Analytics Tiers")).to_be_visible()

    def test_tier_tabs_visible(self):
        """All 3 tier tabs are visible."""
        tabs = self.page.locator("[data-tour='analytics-tier-tabs']")
        expect(tabs).to_be_visible()
        expect(tabs.locator("button", has_text="Platinum KPIs")).to_be_visible()
        expect(tabs.locator("button", has_text="Sandbox")).to_be_visible()
        expect(tabs.locator("button", has_text="Archive")).to_be_visible()

    def test_platinum_tab_shows_kpis(self):
        """Platinum tab shows KPI definition cards (loaded from metadata)."""
        # Platinum is the default active tab
        expect(self.page.locator("text=KPI Definitions")).to_be_visible()
        # Should see the Alert Summary KPI card from metadata
        expect(self.page.locator("text=Alert Summary").first).to_be_visible()

    def test_sandbox_tab_shows_create(self):
        """Sandbox tab shows sandbox list panel with Create button."""
        self.page.locator("[data-tour='analytics-tier-tabs'] button", has_text="Sandbox").click()
        self.page.wait_for_load_state("networkidle")
        self.page.wait_for_timeout(500)
        expect(self.page.locator("[data-tour='analytics-sandbox-list']")).to_be_visible()
        expect(self.page.locator("button", has_text="Create").first).to_be_visible()

    def test_archive_tab_shows_policies(self):
        """Archive tab shows retention policies with regulation names."""
        self.page.locator("[data-tour='analytics-tier-tabs'] button", has_text="Archive").click()
        self.page.wait_for_load_state("networkidle")
        self.page.wait_for_timeout(500)
        expect(self.page.locator("[data-tour='analytics-archive-policies']")).to_be_visible()
        # MiFID II is the first retention policy in the metadata
        expect(self.page.locator("text=MiFID II").first).to_be_visible()

    def test_sidebar_entry_visible(self):
        """Analytics Tiers appears in the sidebar navigation."""
        expect(self.page.locator("a[href='/analytics-tiers']")).to_be_visible()

    def test_archive_gdpr_policy_visible(self):
        """Archive tab shows GDPR retention policy with relevant flag."""
        self.page.locator("[data-tour='analytics-tier-tabs'] button", has_text="Archive").click()
        self.page.wait_for_load_state("networkidle")
        self.page.wait_for_timeout(500)
        # GDPR policy row should show "Yes" for gdpr_relevant
        expect(self.page.locator("text=GDPR").first).to_be_visible()
        # The GDPR row has gdpr_relevant=true, rendered as "Yes"
        gdpr_row = self.page.locator("tr", has_text="GDPR")
        expect(gdpr_row.locator("text=Yes")).to_be_visible()
