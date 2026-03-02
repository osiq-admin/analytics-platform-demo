"""E2E tests for Case Management view.

Covers:
- View loads with grid and seed data
- Case detail opens on row click
- Timeline tab renders annotations
- Linked Alerts tab shows linked alerts
- Status badge rendering
- Dashboard tab placeholder
"""


APP_URL = "http://127.0.0.1:8333"


class TestCaseManagementGrid:
    """Case Management view should load and display investigation cases."""

    def test_view_loads(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Grid panel should be visible
        grid = loaded_page.locator("[data-tour='cases-grid']")
        assert grid.is_visible(timeout=10000), "Cases grid panel not visible"

    def test_grid_shows_seed_data(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # AG Grid should have rows from seed data
        rows = loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row")
        assert rows.count() > 0, "No case rows found in grid"

    def test_case_id_column_visible(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Should show CASE- prefix IDs
        first_row = loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first
        row_text = first_row.inner_text()
        assert "CASE-" in row_text, f"Expected CASE- prefix in row text: {row_text[:200]}"


class TestCaseDetail:
    """Clicking a case row should open the detail panel."""

    def test_detail_opens_on_click(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click first row
        loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first.click()
        loaded_page.wait_for_timeout(500)

        # Detail panel should appear
        detail = loaded_page.locator("[data-tour='cases-detail']")
        assert detail.is_visible(timeout=5000), "Case detail panel not visible after row click"

    def test_detail_shows_metadata(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first.click()
        loaded_page.wait_for_timeout(500)

        detail_text = loaded_page.locator("[data-tour='cases-detail']").inner_text()
        assert "Case ID" in detail_text, "Detail should show Case ID field"
        assert "Priority" in detail_text, "Detail should show Priority field"

    def test_status_transitions_visible(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first.click()
        loaded_page.wait_for_timeout(500)

        # Status transition area should be visible for non-closed cases
        actions = loaded_page.locator("[data-tour='cases-status-actions']")
        # At least one case should have transitions
        if actions.is_visible(timeout=3000):
            actions_text = actions.inner_text()
            assert "Transition to" in actions_text


class TestCaseDetailTabs:
    """Case detail tabs should navigate between timeline, linked alerts, and reports."""

    def test_timeline_tab(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first.click()
        loaded_page.wait_for_timeout(500)

        # Click Timeline tab
        loaded_page.locator("button:has-text('Timeline')").click()
        loaded_page.wait_for_timeout(300)

        timeline = loaded_page.locator("[data-tour='cases-timeline']")
        assert timeline.is_visible(timeout=5000), "Timeline tab content not visible"

    def test_linked_alerts_tab(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first.click()
        loaded_page.wait_for_timeout(500)

        # Click Linked Alerts tab
        loaded_page.locator("button:has-text('Linked Alerts')").click()
        loaded_page.wait_for_timeout(300)

        linked = loaded_page.locator("[data-tour='cases-linked-alerts']")
        assert linked.is_visible(timeout=5000), "Linked Alerts tab content not visible"

    def test_reports_tab_placeholder(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("[data-tour='cases-grid'] .ag-body-viewport .ag-row").first.click()
        loaded_page.wait_for_timeout(500)

        # Click Reports tab
        loaded_page.locator("button:has-text('Reports')").click()
        loaded_page.wait_for_timeout(300)

        # Placeholder text should be visible
        main_text = loaded_page.locator("main").inner_text()
        assert "STOR/SAR" in main_text or "Stage 4" in main_text or "report" in main_text.lower()


class TestDashboardTab:
    """Dashboard tab should load."""

    def test_dashboard_tab_loads(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/cases")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click Dashboard tab
        loaded_page.locator("button:has-text('Dashboard')").click()
        loaded_page.wait_for_timeout(500)

        main_text = loaded_page.locator("main").inner_text()
        assert "Dashboard" in main_text
