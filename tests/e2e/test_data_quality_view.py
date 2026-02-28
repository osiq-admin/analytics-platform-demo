"""E2E tests for the DataQuality view."""
import pytest
from playwright.sync_api import Page, expect


# Import APP_URL from conftest (available in tests/e2e/)
APP_URL = "http://127.0.0.1:8333"


class TestDataQualityView:
    @pytest.fixture(autouse=True)
    def navigate(self, loaded_page: Page):
        """Navigate to the Data Quality view."""
        self.page = loaded_page
        self.page.goto(f"{APP_URL}/quality")
        self.page.wait_for_load_state("networkidle")

    def test_view_loads(self):
        expect(self.page.locator("text=Data Quality")).to_be_visible()

    def test_quality_scores_panel(self):
        expect(self.page.locator("[data-tour='quality-scores']")).to_be_visible()

    def test_quarantine_queue_panel(self):
        expect(self.page.locator("[data-tour='quality-quarantine']")).to_be_visible()

    def test_data_profiling_panel(self):
        expect(self.page.locator("[data-tour='quality-profiling']")).to_be_visible()

    def test_sidebar_entry_visible(self):
        expect(self.page.locator("a[href='/quality']")).to_be_visible()

    def test_profiling_entity_selector(self):
        select = self.page.locator("[data-action='profile-entity-select']")
        expect(select).to_be_visible()

    def test_dimensions_badge(self):
        expect(self.page.locator("text=dimensions")).to_be_visible()
