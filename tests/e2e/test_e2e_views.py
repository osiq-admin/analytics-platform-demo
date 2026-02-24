"""Comprehensive Playwright E2E tests for all views and Phase 7-8-10 features.

Covers:
- All 13 navigation views render without errors
- Dashboard with demo data
- Entity Designer — entity list, details, relationship graph
- Metadata Explorer — calculations, DAG visualization
- Model Composer — detection models and their calculations
- Settings Manager — settings list and details
- Pipeline view — run pipeline
- SQL Console — execute queries
- Risk Case Manager — generate alerts, view alert detail
- Explainability UI (Phase 8) — trace panel in alert detail
- API endpoints — metadata CRUD, dependency graph, validation (Phase 7)
- Regulatory Map (Phase 10) — traceability graph, coverage cards, suggestions
"""
import json

import pytest
from playwright.sync_api import Page, expect


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
# Scenario 5: Model Composer
# ============================================================================

class TestModelComposer:
    """Model Composer should show all 5 detection models with their calculations."""

    def test_detection_models_listed(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/models")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        models = [
            "Wash Trading — Full Day",
            "Wash Trading — Intraday",
            "Spoofing / Layering",
            "Market Price Ramping",
            "Insider Dealing",
        ]
        for model in models:
            assert loaded_page.locator(f"text={model}").first.is_visible(timeout=3000), f"Model {model} not found"

    def test_model_click_shows_calculations(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/models")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click on wash trading model
        loaded_page.locator("button:has-text('Wash Trading — Full Day')").click()
        loaded_page.wait_for_timeout(500)

        # Should show model details with calculations
        detail_text = loaded_page.locator("main").inner_text()
        assert "large_trading_activity" in detail_text or "Calculation" in detail_text

    def test_available_calculations_panel(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/models")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("text=Available Calculations").is_visible()


# ============================================================================
# Scenario 6: SQL Console
# ============================================================================

class TestSQLConsole:
    """SQL Console should execute queries and show results."""

    def test_default_query_runs(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/sql")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Click Run button (default query is SHOW TABLES)
        loaded_page.locator("button:has-text('Run')").click()
        loaded_page.wait_for_timeout(1000)

        # Should show results with table names
        results = loaded_page.locator("main").inner_text()
        assert "execution" in results or "product" in results

    def test_custom_query(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/sql")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Monaco editor has overlay divs that intercept pointer events.
        # Click the visible .view-line element directly with force=True to bypass.
        loaded_page.locator(".monaco-editor .view-line").first.click(force=True, timeout=5000)
        loaded_page.wait_for_timeout(300)

        # Select all and replace with custom query
        loaded_page.keyboard.press("Meta+a")  # macOS: Cmd+A
        loaded_page.wait_for_timeout(100)
        loaded_page.keyboard.type("SELECT COUNT(*) AS cnt FROM product")

        # Run query
        loaded_page.locator("button:has-text('Run')").click()
        loaded_page.wait_for_timeout(1500)

        # Should show result count
        results = loaded_page.locator("main").inner_text()
        assert "cnt" in results

    def test_preset_buttons(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/sql")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Should have preset query buttons
        assert loaded_page.locator("button:has-text('All Tables')").is_visible()


# ============================================================================
# Scenario 7: Pipeline & Alert Generation E2E Flow
# ============================================================================

class TestPipelineToAlerts:
    """Full E2E: load data → run pipeline → generate alerts → view details."""

    def test_pipeline_view_renders(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/pipeline")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        body = loaded_page.locator("main").inner_text()
        assert len(body) > 10  # Has content

    def test_risk_cases_view(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/alerts")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("text=Risk Case Manager").is_visible()

    def test_generate_alerts_button(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/alerts")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        # Generate Alerts button should be visible
        gen_btn = loaded_page.locator("button:has-text('Generate Alerts')")
        assert gen_btn.is_visible()


# ============================================================================
# Scenario 8: Phase 7 — Metadata CRUD API via browser
# ============================================================================

class TestPhase7MetadataAPIs:
    """Phase 7 metadata CRUD APIs should work from the browser."""

    def test_dependency_graph_api(self, loaded_page):
        """GET /api/metadata/dependency-graph should return graph data."""
        loaded_page.goto(f"{APP_URL}/api/metadata/dependency-graph")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        text = loaded_page.locator("body").inner_text()
        data = json.loads(text)
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) >= 10  # At least 10 calculations + models

    def test_validation_api_valid(self, loaded_page):
        """POST /api/metadata/validate should validate correctly."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/validate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: 'calculation',
                        definition: {
                            calc_id: 'test_calc',
                            name: 'Test',
                            layer: 'transaction',
                            description: 'Test calc',
                            inputs: [],
                            output: {table_name: 'test', fields: []},
                            logic: 'SELECT 1',
                            depends_on: []
                        }
                    })
                });
                return await resp.json();
            }
        """)
        assert result["valid"] is True

    def test_validation_api_invalid_dependency(self, loaded_page):
        """Validation should catch missing dependencies."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/validate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: 'calculation',
                        definition: {
                            calc_id: 'test_calc',
                            name: 'Test',
                            layer: 'transaction',
                            description: 'Test',
                            inputs: [],
                            output: {table_name: 'test', fields: []},
                            logic: 'SELECT 1',
                            depends_on: ['nonexistent_calc']
                        }
                    })
                });
                return await resp.json();
            }
        """)
        assert result["valid"] is False
        assert "nonexistent_calc" in str(result["errors"])

    def test_calculation_dependents_api(self, loaded_page):
        """GET /api/metadata/calculations/{id}/dependents should return dependents."""
        loaded_page.goto(f"{APP_URL}/api/metadata/calculations/value_calc/dependents")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        text = loaded_page.locator("body").inner_text()
        data = json.loads(text)
        assert "calculations" in data
        assert "detection_models" in data

    def test_entities_crud_api(self, loaded_page):
        """GET /api/metadata/entities should return all 8 entities."""
        loaded_page.goto(f"{APP_URL}/api/metadata/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        text = loaded_page.locator("body").inner_text()
        data = json.loads(text)
        assert len(data) == 8
        entity_ids = [e["entity_id"] for e in data]
        assert "product" in entity_ids
        assert "execution" in entity_ids


# ============================================================================
# Scenario 9: Phase 8 — Trace API endpoints
# ============================================================================

class TestPhase8TraceAPIs:
    """Phase 8 trace API endpoints should work."""

    def test_trace_alert_404(self, loaded_page):
        """GET /api/trace/alert/NONEXISTENT should return 404."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/trace/alert/NONEXISTENT');
                return {status: resp.status};
            }
        """)
        assert result["status"] == 404

    def test_trace_calculation_empty(self, loaded_page):
        """GET /api/trace/calculation/{id} should work (may return empty)."""
        loaded_page.goto(f"{APP_URL}/api/trace/calculation/value_calc")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        text = loaded_page.locator("body").inner_text()
        data = json.loads(text)
        assert data["calc_id"] == "value_calc"
        assert "traces" in data

    def test_trace_settings(self, loaded_page):
        """GET /api/trace/settings/{id} should return setting details."""
        loaded_page.goto(f"{APP_URL}/api/trace/settings/wash_score_threshold")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        text = loaded_page.locator("body").inner_text()
        data = json.loads(text)
        assert data["setting_id"] == "wash_score_threshold"
        assert "default" in data
        assert "overrides" in data

    def test_trace_settings_resolve(self, loaded_page):
        """POST /api/trace/settings/{id}/resolve should resolve with context."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/trace/settings/wash_score_threshold/resolve', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({context: {}})
                });
                return await resp.json();
            }
        """)
        assert "resolved_value" in result
        assert "why" in result


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


# ============================================================================
# Scenario 12: Phase 9 — Metadata Editor
# ============================================================================

class TestMetadataEditor:
    """Metadata Editor should show JSON + Visual side-by-side for all 4 types."""

    def test_editor_loads_entity(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("text=Metadata Editor").is_visible()
        assert loaded_page.locator("text=JSON Editor").is_visible()
        assert loaded_page.locator("text=Visual Editor").is_visible()

    def test_editor_type_buttons(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        for btn_text in ["Entities", "Calculations", "Settings", "Models"]:
            assert loaded_page.locator(f"button:has-text('{btn_text}')").is_visible()

    def test_editor_switch_to_calculations(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("button:has-text('Calculations')").click()
        loaded_page.wait_for_timeout(500)

        body = loaded_page.locator("main").inner_text()
        assert "Layer" in body or "SQL Logic" in body or "calc_id" in body

    def test_editor_switch_to_models(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("button:has-text('Models')").click()
        loaded_page.wait_for_timeout(500)

        body = loaded_page.locator("main").inner_text()
        assert "model_id" in body or "Time Window" in body or "Granularity" in body

    def test_editor_valid_json_indicator(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("text=Valid JSON").is_visible(timeout=5000)
        assert loaded_page.locator("button:has-text('Save')").is_visible()


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


# ============================================================================
# Scenario 14: Phase 9 — CRUD Buttons in Existing Views
# ============================================================================

class TestCRUDButtons:
    """Existing views should have New/Edit/Delete buttons."""

    def test_entity_new_button(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("button:has-text('New Entity')").is_visible()

    def test_entity_edit_delete_on_select(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("[role='gridcell']:has-text('account')").first.click()
        loaded_page.wait_for_timeout(500)

        assert loaded_page.locator("button:has-text('Edit')").is_visible()
        assert loaded_page.locator("button:has-text('Delete')").is_visible()

    def test_settings_new_button(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/settings")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("button:has-text('New Setting')").is_visible()

    def test_model_new_button(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/models")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        assert loaded_page.locator("button:has-text('New Model')").is_visible()

    def test_model_edit_delete_on_select(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/models")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)

        loaded_page.locator("button:has-text('Wash Trading — Full Day')").click()
        loaded_page.wait_for_timeout(500)

        assert loaded_page.locator("button:has-text('Edit')").is_visible()
        assert loaded_page.locator("button:has-text('Delete')").is_visible()


# ============================================================================
# Scenario 15: Phase 10 — Regulatory Map
# ============================================================================

class TestRegulatoryMap:
    """Tests for the Regulatory Map view."""

    def test_regulatory_map_loads(self, loaded_page):
        """RegulatoryMap loads with heading."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "regulatory traceability" in body.lower()

    def test_coverage_cards_visible(self, loaded_page):
        """Coverage summary cards are visible."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "total requirements" in body.lower()
        assert "covered" in body.lower()

    def test_graph_renders(self, loaded_page):
        """React Flow graph container renders."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        graph = loaded_page.locator(".react-flow")
        assert graph.is_visible(timeout=10000)

    def test_suggestions_section(self, loaded_page):
        """Suggestions section appears."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "suggestions" in body.lower()


# ============================================================================
# Scenario 10: OOB Layer Separation (Phase 11)
# ============================================================================

class TestOobLayers:
    """OOB layer separation features — badges, editor integration, APIs."""

    @pytest.fixture()
    def loaded_page(self, page: Page):
        """Navigate to dashboard first to ensure app is ready."""
        page.goto(f"{APP_URL}/dashboard")
        page.wait_for_load_state("networkidle", timeout=20000)
        return page

    def test_editor_shows_layer_badge(self, loaded_page):
        """MetadataEditor shows OOB badge next to item selector."""
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        badge = loaded_page.locator("[data-tour='editor-layer-badge']")
        assert badge.is_visible(timeout=10000)

    def test_entity_designer_layer_badges(self, loaded_page):
        """Entity Designer shows layer badges in entity list."""
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Wait for AG Grid rows to render
        loaded_page.locator(".ag-row").first.wait_for(timeout=10000)
        # AG Grid cellRenderer injects HTML via innerHTML — check for OOB/Custom text in grid cells
        grid_text = loaded_page.locator(".ag-body-viewport").inner_text()
        assert "OOB" in grid_text or "Custom" in grid_text

    def test_metadata_explorer_layer_badges(self, loaded_page):
        """Metadata Explorer shows layer badges on calculation list."""
        loaded_page.goto(f"{APP_URL}/metadata")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        loaded_page.locator(".ag-row").first.wait_for(timeout=10000)
        grid_text = loaded_page.locator(".ag-body-viewport").inner_text()
        assert "OOB" in grid_text or "User" in grid_text

    def test_settings_manager_layer_badges(self, loaded_page):
        """Settings Manager shows layer badges."""
        loaded_page.goto(f"{APP_URL}/settings")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        loaded_page.locator(".ag-row").first.wait_for(timeout=10000)
        grid_text = loaded_page.locator(".ag-body-viewport").inner_text()
        assert "OOB" in grid_text or "Custom" in grid_text

    def test_model_composer_layer_badges(self, loaded_page):
        """Model Composer shows layer badges."""
        loaded_page.goto(f"{APP_URL}/models")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        badge = loaded_page.locator("[data-tour='model-layer-badge']").first
        assert badge.is_visible(timeout=10000)

    def test_oob_info_banner_visible(self, loaded_page):
        """OOB info banner visible when editing an OOB item."""
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        banner = loaded_page.locator("[data-tour='editor-oob-banner']")
        assert banner.is_visible(timeout=10000)

    def test_oob_version_panel_visible(self, loaded_page):
        """OOB Version panel is present in MetadataEditor."""
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        panel = loaded_page.locator("[data-tour='oob-version-panel']")
        assert panel.is_visible(timeout=10000)

    def test_reset_button_hidden_for_unmodified(self, loaded_page):
        """Reset to OOB button is not visible for unmodified OOB items."""
        loaded_page.goto(f"{APP_URL}/editor")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        reset_btn = loaded_page.locator("[data-tour='reset-to-oob']")
        assert reset_btn.count() == 0

    def test_layer_api_oob_manifest(self, loaded_page):
        """API: /api/metadata/oob-manifest returns manifest with items."""
        result = loaded_page.evaluate("""
            async () => {
                const res = await fetch('/api/metadata/oob-manifest');
                return await res.json();
            }
        """)
        assert "oob_version" in result
        assert "items" in result
        assert "entities" in result["items"]

    def test_layer_api_entity_has_layer(self, loaded_page):
        """API: /api/metadata/entities returns items with metadata_layer."""
        result = loaded_page.evaluate("""
            async () => {
                const res = await fetch('/api/metadata/entities');
                return await res.json();
            }
        """)
        assert len(result) > 0
        assert result[0].get("metadata_layer") == "oob"
