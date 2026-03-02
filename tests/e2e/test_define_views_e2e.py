"""E2E tests for definition views — Navigation, Entity Designer, Metadata Explorer, Settings.

Covers:
- Navigation metadata — sidebar loads from API
- Entity Designer — entity list, details, relationship graph, domain values
- Metadata Explorer — calculations, DAG visualization
- Settings Manager — settings list and details
"""
from playwright.sync_api import expect


APP_URL = "http://127.0.0.1:8333"


# ============================================================================
# Scenario 2c: Navigation metadata
# ============================================================================

class TestNavigationMetadata:
    """Navigation metadata E2E tests — verify sidebar loads from API."""

    def test_navigation_api_returns_all_views(self, loaded_page):
        """Verify the navigation API returns all 16 views."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/navigation');
                const data = await resp.json();
                const paths = data.groups.flatMap(g => g.items.map(i => i.path));
                return { status: resp.status, count: paths.length, paths };
            }
        """)
        assert result["status"] == 200
        assert result["count"] >= 16

    def test_sidebar_renders_all_groups(self, loaded_page):
        """Verify sidebar renders all navigation groups from metadata."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        sidebar = loaded_page.locator("[data-tour='sidebar'], [data-trace='app.sidebar']")
        expect(sidebar).to_be_visible(timeout=10000)
        # Check that nav links exist (should be at least 20)
        links = sidebar.locator("a")
        assert links.count() >= 20


# ============================================================================
# Scenario 3: Entity Designer
# ============================================================================

class TestEntityDesigner:
    """Entity Designer should show all 8 entities with fields and relationships."""

    def test_entity_list_shows_all_entities(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        for entity in ["account", "execution", "md_eod", "md_intraday", "order", "product", "trader", "venue"]:
            assert loaded_page.locator(f"text={entity}").first.is_visible(timeout=3000), f"Entity {entity} not found"

    def test_entity_click_shows_details(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # AG Grid uses div[role="gridcell"], not <td>
        loaded_page.locator("[role='gridcell']:has-text('product')").first.click()
        loaded_page.wait_for_timeout(500)

        # Should show entity details panel with field information
        # Use .first since "product_id" appears in many grid cells and relationship labels
        assert loaded_page.locator("text=product_id").first.is_visible(timeout=3000)

    def test_relationship_graph_renders(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Relationship graph should be visible
        assert loaded_page.locator("text=Relationships").is_visible()
        # Check for graph edges (ReactFlow groups)
        assert loaded_page.locator("[class*='react-flow']").count() > 0 or \
               loaded_page.locator("text=one_to_many").first.is_visible(timeout=3000)

    def test_fields_grid_has_domain_column(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click on product entity
        loaded_page.locator("[role='gridcell']:has-text('product')").first.click()
        loaded_page.wait_for_timeout(500)

        # Domain column header should be visible in the fields grid
        assert loaded_page.locator("[role='columnheader']:has-text('Domain')").first.is_visible(timeout=3000)

    def test_field_click_opens_domain_pane(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click on account entity
        loaded_page.locator("[role='gridcell']:has-text('account')").first.click()
        loaded_page.wait_for_timeout(500)

        # Click on risk_rating field row in the fields grid
        loaded_page.locator("[role='gridcell']:has-text('risk_rating')").first.click()
        loaded_page.wait_for_timeout(500)

        # Domain values pane should appear
        assert loaded_page.locator("[data-tour='domain-values-pane']").is_visible(timeout=3000)


# ============================================================================
# Scenario 4: Metadata Explorer — Calculations & DAG
# ============================================================================

class TestMetadataExplorer:
    """Calculations view should show all 10 calculations and DAG visualization."""

    def test_calculations_list(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/metadata")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Should show calculation names
        for calc in ["Value Calculation", "Wash Detection", "VWAP Calculation"]:
            assert loaded_page.locator(f"text={calc}").first.is_visible(timeout=3000), f"Calc {calc} not found"

    def test_layer_filter_buttons(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/metadata")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Layer filter buttons should be present
        for layer in ["All", "Transaction", "Time Window", "Aggregation", "Derived"]:
            assert loaded_page.locator(f"button:has-text('{layer}')").is_visible()

    def test_dag_visualization(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/metadata")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # DAG panel should be visible with node labels
        assert loaded_page.locator("text=Calculation DAG").is_visible()

    def test_calculation_click_shows_detail(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/metadata")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click on a calculation — Metadata Explorer may use AG Grid or table
        calc_cell = loaded_page.locator("[role='gridcell']:has-text('value_calc')").first
        if calc_cell.count() == 0:
            calc_cell = loaded_page.locator("td:has-text('value_calc')").first
        calc_cell.click()
        loaded_page.wait_for_timeout(500)

        # Should show SQL or description
        detail_area = loaded_page.locator("main").inner_text()
        assert "SELECT" in detail_area or "Value Calculation" in detail_area or "value_calc" in detail_area


# ============================================================================
# Scenario 10: Settings Manager
# ============================================================================

class TestSettingsManager:
    """Settings view should display settings with override details."""

    def test_settings_view_renders(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/settings")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        body = loaded_page.locator("main").inner_text()
        assert len(body) > 10

    def test_settings_list_has_items(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/settings")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Should show some settings (score thresholds, score steps, etc.)
        body = loaded_page.locator("main").inner_text()
        assert "threshold" in body.lower() or "score" in body.lower() or "setting" in body.lower()
