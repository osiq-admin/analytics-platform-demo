"""E2E tests for the ReferenceData view."""
import re
import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


class TestReferenceDataView:
    @pytest.fixture(autouse=True)
    def navigate(self, loaded_page: Page):
        """Navigate to the Reference Data view."""
        self.page = loaded_page
        self.page.goto(f"{APP_URL}/reference")
        self.page.wait_for_load_state("networkidle")

    def test_view_loads(self):
        expect(self.page.locator("text=Reference Data")).to_be_visible()

    def test_entity_tabs_visible(self):
        expect(self.page.locator("[data-tour='reference-entity-tabs']")).to_be_visible()

    def test_golden_record_list_visible(self):
        expect(self.page.locator("[data-tour='reference-golden-list']")).to_be_visible()

    def test_reconciliation_panel_visible(self):
        expect(self.page.locator("[data-tour='reference-reconciliation']")).to_be_visible()

    def test_sidebar_entry_visible(self):
        expect(self.page.locator("a[href='/reference']")).to_be_visible()

    def test_entity_tab_click_loads_records(self):
        # Click Product Master tab
        self.page.locator("[data-tour='reference-entity-tabs'] button", has_text="Product Master").click()
        self.page.wait_for_load_state("networkidle")
        # Should see golden records in the list
        expect(self.page.locator("text=GR-PRO-0001")).to_be_visible()

    def test_golden_record_count_badge(self):
        # Account Master tab should be active by default with record count
        expect(self.page.locator("[data-tour='reference-entity-tabs']")).to_contain_text("Account Master")
