"""E2E tests for Dashboard views and widget configuration.

Covers:
- Dashboard stat cards and charts
- Dashboard widget config — metadata-driven widget rendering
- Dashboard widget controls — chart type switchers and visibility toggles
"""
from playwright.sync_api import expect


APP_URL = "http://127.0.0.1:8333"


# ============================================================================
# Scenario 2: Dashboard with demo data
# ============================================================================

class TestDashboard:
    """Dashboard should show charts and stats after loading demo data."""

    def test_dashboard_has_stat_cards(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Should show stat cards
        assert loaded_page.locator("text=Total Alerts").is_visible()
        assert loaded_page.locator("text=Active Models").is_visible()
        assert loaded_page.locator("text=Avg Score").is_visible()

    def test_dashboard_has_charts(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("text=Alerts by Model").is_visible()
        assert loaded_page.locator("text=Score Distribution").is_visible()
        assert loaded_page.locator("text=Alerts by Asset Class").is_visible()


# ============================================================================
# Scenario 2b: Dashboard widget config — metadata-driven widget rendering
# ============================================================================

class TestDashboardWidgetConfig:
    """Dashboard widget config E2E tests — verify metadata-driven widget rendering."""

    def test_dashboard_loads_widgets_from_api(self, loaded_page):
        """Verify dashboard fetches widget config from /api/metadata/widgets/dashboard."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Verify KPI summary cards render (from widget config)
        cards = loaded_page.locator("[data-trace='dashboard.summary-cards']")
        expect(cards).to_be_visible(timeout=10000)

    def test_dashboard_chart_widgets_render(self, loaded_page):
        """Verify all chart widgets render from config."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Check chart widget containers exist
        expect(loaded_page.locator("text=Alerts by Model")).to_be_visible(timeout=10000)
        expect(loaded_page.locator("text=Score Distribution")).to_be_visible(timeout=10000)

    def test_widget_config_api_returns_data(self, loaded_page):
        """Verify the widget config API is accessible and returns dashboard config."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/widgets/dashboard');
                return { status: resp.status, data: await resp.json() };
            }
        """)
        assert result["status"] == 200
        assert result["data"]["view_id"] == "dashboard"
        assert len(result["data"]["widgets"]) >= 2


# ============================================================================
# Scenario 13: Phase 9 — Dashboard Widget Controls
# ============================================================================

class TestDashboardWidgets:
    """Dashboard should have chart type switchers and widget visibility toggles."""

    def test_chart_type_dropdowns(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Each chart should have a chart type dropdown (case-insensitive check)
        body = loaded_page.locator("main").inner_text()
        assert "alerts by model" in body.lower()
        # Check for at least one chart type selector
        selects = loaded_page.locator("select")
        assert selects.count() >= 1

    def test_widget_settings_gear(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # The gear button has title="Widget settings"
        gear_btn = loaded_page.locator("button[title='Widget settings']")
        assert gear_btn.is_visible()

    def test_widget_toggle_panel(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click gear to open widget settings
        gear_btn = loaded_page.locator("button[title='Widget settings']")
        gear_btn.click()
        loaded_page.wait_for_timeout(500)

        body = loaded_page.locator("main").inner_text()
        assert "widget visibility" in body.lower()
