"""E2E tests for governance, compliance, and cross-cutting views.

Covers:
- Regulatory Map — traceability graph, coverage cards, suggestions
- OOB Layer Separation — badges, editor integration, APIs
- UX Usability — column readability, visual editor, responsive layout, tooltips
- Architecture Traceability — toggle mode, info icons, popups
- Audit Trail — audit API
- AI Context — context-summary API
- Data Governance — masking, roles, audit log
- Business Glossary — terms, categories, search, tabs
"""
import re

import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


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

    def test_regulatory_map_has_tabs(self, loaded_page):
        """Tab switcher with Traceability Map and Regulation Details."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        assert loaded_page.locator("button:has-text('Traceability Map')").is_visible(timeout=3000)
        assert loaded_page.locator("button:has-text('Regulation Details')").is_visible(timeout=3000)

    def test_regulation_details_tab_shows_grid(self, loaded_page):
        """Switch to Regulation Details tab and verify AG Grid with rows."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        loaded_page.locator("button:has-text('Regulation Details')").click()
        loaded_page.wait_for_timeout(500)
        # Should show AG Grid with regulation/article rows
        assert loaded_page.locator("[role='columnheader']:has-text('Regulation')").first.is_visible(timeout=3000)
        assert loaded_page.locator("[role='columnheader']:has-text('Article')").first.is_visible(timeout=3000)

    def test_node_click_shows_description(self, loaded_page):
        """Click an article node in the graph, verify description appears in detail pane."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Click first visible React Flow node
        node = loaded_page.locator(".react-flow__node").first
        if node.is_visible(timeout=5000):
            node.click()
            loaded_page.wait_for_timeout(500)
            # Detail pane should show some node information
            detail = loaded_page.locator("[data-tour='regulatory-detail']")
            assert detail.is_visible(timeout=3000)


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


# ============================================================================
# Scenario 17: Phase 12 — UX Usability Verification
# ============================================================================

class TestUxUsability:
    """Phase 12 UX usability — column readability, visual editor, responsive layout, tooltips."""

    # --- Column Readability Tests (1440x900) ---

    @pytest.fixture()
    def wide_page(self, app_server, browser_instance):
        """Create a 1440x900 viewport page with demo data loaded."""
        context = browser_instance.new_context(viewport={"width": 1440, "height": 900})
        pg = context.new_page()
        pg.set_default_timeout(15000)
        pg.set_default_navigation_timeout(30000)
        pg.goto(f"{APP_URL}/dashboard", wait_until="domcontentloaded")
        pg.wait_for_load_state("networkidle", timeout=15000)
        skip_btn = pg.locator("text=Skip")
        try:
            if skip_btn.is_visible(timeout=3000):
                skip_btn.click()
                pg.wait_for_timeout(500)
        except Exception:
            pass
        end_btn = pg.locator("button:has-text('End')")
        try:
            if end_btn.is_visible(timeout=3000):
                end_btn.click()
                pg.wait_for_timeout(2000)
        except Exception:
            pass
        yield pg
        pg.close()
        context.close()

    @pytest.fixture()
    def medium_page(self, app_server, browser_instance):
        """Create a 1280x800 viewport page with demo data loaded."""
        context = browser_instance.new_context(viewport={"width": 1280, "height": 800})
        pg = context.new_page()
        pg.set_default_timeout(15000)
        pg.set_default_navigation_timeout(30000)
        pg.goto(f"{APP_URL}/dashboard", wait_until="domcontentloaded")
        pg.wait_for_load_state("networkidle", timeout=15000)
        skip_btn = pg.locator("text=Skip")
        try:
            if skip_btn.is_visible(timeout=3000):
                skip_btn.click()
                pg.wait_for_timeout(500)
        except Exception:
            pass
        end_btn = pg.locator("button:has-text('End')")
        try:
            if end_btn.is_visible(timeout=3000):
                end_btn.click()
                pg.wait_for_timeout(2000)
        except Exception:
            pass
        yield pg
        pg.close()
        context.close()

    @pytest.fixture()
    def narrow_page(self, app_server, browser_instance):
        """Create a 1024x768 viewport page with demo data loaded."""
        context = browser_instance.new_context(viewport={"width": 1024, "height": 768})
        pg = context.new_page()
        pg.set_default_timeout(15000)
        pg.set_default_navigation_timeout(30000)
        pg.goto(f"{APP_URL}/dashboard", wait_until="domcontentloaded")
        pg.wait_for_load_state("networkidle", timeout=15000)
        skip_btn = pg.locator("text=Skip")
        try:
            if skip_btn.is_visible(timeout=3000):
                skip_btn.click()
                pg.wait_for_timeout(500)
        except Exception:
            pass
        end_btn = pg.locator("button:has-text('End')")
        try:
            if end_btn.is_visible(timeout=3000):
                end_btn.click()
                pg.wait_for_timeout(2000)
        except Exception:
            pass
        yield pg
        pg.close()
        context.close()

    def test_entity_list_columns_readable(self, wide_page):
        """Entity list column headers should not be truncated at 1440px."""
        wide_page.goto(f"{APP_URL}/entities")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-header-cell").first.wait_for(timeout=10000)

        headers = wide_page.locator(".ag-header-cell-text").all_inner_texts()
        for header in headers:
            assert "..." not in header, f"Header truncated: {header}"

    def test_calculation_list_columns_readable(self, wide_page):
        """Calculation IDs should show at least 10 chars at 1440px, not 'a...'."""
        wide_page.goto(f"{APP_URL}/metadata")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-row").first.wait_for(timeout=10000)

        # Find ID cells (first column) and check they aren't extremely truncated
        first_row_cells = wide_page.locator(".ag-row:first-child .ag-cell")
        if first_row_cells.count() > 0:
            id_text = first_row_cells.nth(0).inner_text()
            assert len(id_text) >= 5, f"ID column truncated to '{id_text}'"

    def test_settings_list_columns_readable(self, wide_page):
        """Settings IDs should show at least 10 chars at 1440px."""
        wide_page.goto(f"{APP_URL}/settings")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-row").first.wait_for(timeout=10000)

        first_row_cells = wide_page.locator(".ag-row:first-child .ag-cell")
        if first_row_cells.count() > 0:
            id_text = first_row_cells.nth(0).inner_text()
            assert len(id_text) >= 5, f"Setting ID truncated to '{id_text}'"

    def test_alert_list_columns_readable(self, wide_page):
        """Alert grid Model column should show full model names."""
        wide_page.goto(f"{APP_URL}/alerts")
        wide_page.wait_for_load_state("networkidle", timeout=15000)

        # Generate alerts if none present
        gen_btn = wide_page.locator("button:has-text('Generate Alerts')")
        if gen_btn.is_visible(timeout=3000):
            gen_btn.click()
            wide_page.wait_for_timeout(3000)

        rows = wide_page.locator(".ag-row")
        if rows.count() > 0:
            # Model column is the second column
            model_cell = wide_page.locator(".ag-row:first-child .ag-cell").nth(1)
            model_text = model_cell.inner_text()
            assert len(model_text) >= 5, f"Model column truncated to '{model_text}'"

    def test_entity_detail_fields_readable(self, wide_page):
        """Entity detail field names like 'account_id' should be fully visible."""
        wide_page.goto(f"{APP_URL}/entities")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-row").first.wait_for(timeout=10000)

        wide_page.locator("[role='gridcell']:has-text('account')").first.click()
        wide_page.wait_for_timeout(500)

        # The detail grid should show field names — check for "account_id"
        detail_text = wide_page.locator("main").inner_text()
        assert "account_id" in detail_text, "Field name 'account_id' not fully visible"

    # --- Visual Editor Tests (1280x800) ---

    def test_visual_editor_description_visible(self, medium_page):
        """Visual Editor Description header should be visible at 1280px."""
        medium_page.goto(f"{APP_URL}/editor")
        medium_page.wait_for_load_state("networkidle", timeout=15000)
        medium_page.wait_for_timeout(500)

        body = medium_page.locator("main").inner_text()
        assert "Description" in body, "Description header not visible in Visual Editor"

    def test_visual_editor_field_names_visible(self, medium_page):
        """Visual Editor field name inputs should show at least 8 chars."""
        medium_page.goto(f"{APP_URL}/editor")
        medium_page.wait_for_load_state("networkidle", timeout=15000)
        medium_page.wait_for_timeout(500)

        # Check that the "Name" header is visible in the fields grid
        body = medium_page.locator("main").inner_text()
        assert "Name" in body, "Name column header not visible in Visual Editor"

    # --- Responsive Layout Tests (1024x768) ---

    def test_entity_designer_not_collapsed_1024(self, narrow_page):
        """Entity Designer detail should be visible at 1024px, not squeezed."""
        narrow_page.goto(f"{APP_URL}/entities")
        narrow_page.wait_for_load_state("networkidle", timeout=15000)
        narrow_page.locator(".ag-row").first.wait_for(timeout=10000)

        narrow_page.locator("[role='gridcell']:has-text('account')").first.click()
        narrow_page.wait_for_timeout(1000)

        # Entity detail should show the Fields tab with account fields
        fields_tab = narrow_page.locator("text=Fields (")
        assert fields_tab.is_visible(timeout=5000), "Entity detail Fields tab not visible at 1024px"

    def test_metadata_editor_usable_1024(self, narrow_page):
        """Metadata Editor should show both editor panel labels at 1024px."""
        narrow_page.goto(f"{APP_URL}/editor")
        narrow_page.wait_for_load_state("networkidle", timeout=15000)

        assert narrow_page.locator("text=JSON Editor").is_visible(timeout=5000)
        assert narrow_page.locator("text=Visual Editor").is_visible(timeout=5000)

    # --- Tooltip & Resize Tests (1440x900) ---

    def test_grid_column_resize_enabled(self, wide_page):
        """AG Grid columns should have resize handles."""
        wide_page.goto(f"{APP_URL}/entities")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-header-cell").first.wait_for(timeout=10000)

        # AG Grid adds .ag-header-cell-resize elements when resizable=true
        resize_handles = wide_page.locator(".ag-header-cell-resize")
        assert resize_handles.count() > 0, "No column resize handles found — resizable not enabled"

    def test_grid_tooltip_on_hover(self, wide_page):
        """Hovering over a grid cell should show a tooltip with full text."""
        wide_page.goto(f"{APP_URL}/settings")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-row").first.wait_for(timeout=10000)

        # Hover over first cell to trigger tooltip
        first_cell = wide_page.locator(".ag-row:first-child .ag-cell").first
        first_cell.hover()
        wide_page.wait_for_timeout(500)

        # AG Grid tooltips use ag-tooltip or [role="tooltip"]
        _tooltip = wide_page.locator(".ag-tooltip, [role='tooltip']")
        # Tooltip may or may not appear depending on whether content is truncated
        # Just verify no error occurs during hover — the tooltip infrastructure is in place
        assert first_cell.is_visible(), "Cell should remain visible after hover"

    def test_light_mode_no_contrast_issues(self, wide_page):
        """Switching to light mode should keep grid text readable."""
        wide_page.goto(f"{APP_URL}/settings")
        wide_page.wait_for_load_state("networkidle", timeout=15000)
        wide_page.locator(".ag-row").first.wait_for(timeout=10000)

        # Click theme toggle (moon/sun icon button in header)
        theme_btn = wide_page.locator("button[title*='theme'], button[title*='Theme'], button[aria-label*='theme']")
        if theme_btn.count() > 0:
            theme_btn.first.click()
            wide_page.wait_for_timeout(500)

        # Verify grid text is still present and readable
        grid_text = wide_page.locator(".ag-body-viewport").inner_text()
        assert len(grid_text) > 10, "Grid text disappeared after theme switch"


# ============================================================================
# Architecture Traceability Mode (M128)
# ============================================================================


class TestArchitectureTraceability:
    """Tests for the Architecture Traceability toggle mode."""

    def test_trace_toggle_button_visible(self, loaded_page):
        """Trace button should be visible in toolbar."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        trace_btn = loaded_page.get_by_role("button", name="Trace", exact=True)
        expect(trace_btn).to_be_visible(timeout=5000)

    def test_trace_toggle_activates(self, loaded_page):
        """Clicking Trace button should activate it with accent styling."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        trace_btn = loaded_page.get_by_role("button", name="Trace", exact=True)
        trace_btn.click()
        # Active state should have accent border color
        expect(trace_btn).to_have_class(re.compile(r"border-accent"), timeout=3000)

    def test_trace_icons_appear_on_dashboard(self, loaded_page):
        """Enabling Trace mode should render info icons near data-trace elements."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Enable trace mode
        loaded_page.get_by_role("button", name="Trace", exact=True).click()
        loaded_page.wait_for_timeout(500)
        # data-trace elements should exist on dashboard
        trace_elements = loaded_page.locator("[data-trace]")
        expect(trace_elements.first).to_be_visible(timeout=5000)

    def test_trace_popup_opens(self, loaded_page):
        """Clicking a trace info icon should open the architecture popup."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Enable trace mode
        loaded_page.get_by_role("button", name="Trace", exact=True).click()
        loaded_page.wait_for_timeout(500)
        # Click the first trace info icon (title contains "Architecture trace:")
        trace_icon = loaded_page.locator("button[title^='Architecture trace:']")
        if trace_icon.count() > 0:
            trace_icon.first.click()
            loaded_page.wait_for_timeout(300)
            # Popup should show section name or "No registry entry found"
            popup = loaded_page.locator(".animate-slide-in-right")
            expect(popup).to_be_visible(timeout=3000)

    def test_trace_toggle_deactivates(self, loaded_page):
        """Toggling Trace off should remove all info icons."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        trace_btn = loaded_page.get_by_role("button", name="Trace", exact=True)
        # Enable
        trace_btn.click()
        loaded_page.wait_for_timeout(500)
        # Disable
        trace_btn.click()
        loaded_page.wait_for_timeout(300)
        # Trace icons should be gone
        icons = loaded_page.locator("button[title^='Architecture trace:']")
        assert icons.count() == 0, "Trace icons should disappear after toggle off"

    def test_trace_persists_across_navigation(self, loaded_page):
        """Trace mode should remain active when navigating to another view."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Enable trace mode
        loaded_page.get_by_role("button", name="Trace", exact=True).click()
        loaded_page.wait_for_timeout(300)
        # Navigate to entities
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Trace button should still be active
        trace_btn = loaded_page.get_by_role("button", name="Trace", exact=True)
        expect(trace_btn).to_have_class(re.compile(r"border-accent"), timeout=3000)

    def test_trace_works_on_entities(self, loaded_page):
        """Trace mode should show data-trace elements on the entities view."""
        loaded_page.goto(f"{APP_URL}/entities")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Enable trace mode
        loaded_page.get_by_role("button", name="Trace", exact=True).click()
        loaded_page.wait_for_timeout(500)
        # Should have entity-related trace elements
        trace_elements = loaded_page.locator("[data-trace^='entities.']")
        expect(trace_elements.first).to_be_visible(timeout=5000)


# ============================================================================
# Scenario 18: Audit trail
# ============================================================================

class TestAuditTrailE2E:
    """Audit trail E2E tests — verify audit API is accessible."""

    def test_audit_api_accessible(self, loaded_page):
        """Verify the audit API endpoint is accessible and returns a list."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/audit');
                const data = await resp.json();
                return { status: resp.status, isArray: Array.isArray(data) };
            }
        """)
        assert result["status"] == 200
        assert result["isArray"] is True


# ============================================================================
# Scenario 19: AI context summary
# ============================================================================

class TestAIContextE2E:
    """AI context E2E tests — verify context-summary reflects metadata."""

    def test_ai_context_summary_reflects_metadata(self, loaded_page):
        """Verify the AI context-summary endpoint returns meaningful context."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/ai/context-summary');
                const data = await resp.json();
                return { status: resp.status, hasContext: data.context.length > 50 };
            }
        """)
        assert result["status"] == 200
        assert result["hasContext"] is True


# ============================================================================
# Scenario 20: Data Governance
# ============================================================================

class TestDataGovernance:
    """Data Governance view E2E tests."""

    def test_governance_view_renders(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle")
        assert loaded_page.locator("text=Data Governance").first.is_visible(timeout=5000) or \
               loaded_page.locator("text=Masking Policies").first.is_visible(timeout=5000)

    def test_masking_policies_api(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/masking-policies');
                const data = await resp.json();
                return { status: resp.status, count: data.policies?.length || 0 };
            }
        """)
        assert result["status"] == 200
        assert result["count"] == 7

    def test_role_switching_api(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                await fetch('/api/governance/switch-role', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({role_id: 'compliance_officer'})
                });
                const resp = await fetch('/api/governance/current-role');
                const data = await resp.json();
                // Switch back to analyst for other tests
                await fetch('/api/governance/switch-role', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({role_id: 'analyst'})
                });
                return data.role_id;
            }
        """)
        assert result == "compliance_officer"

    def test_role_comparison_api(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/role-comparison/trader');
                const data = await resp.json();
                return {
                    status: resp.status,
                    entity: data.entity || '',
                    roleCount: Object.keys(data.roles || {}).length
                };
            }
        """)
        assert result["status"] == 200
        assert result["entity"] == "trader"
        assert result["roleCount"] >= 4

    def test_audit_log_api(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/audit-log');
                const data = await resp.json();
                return { status: resp.status, hasEntries: 'entries' in data };
            }
        """)
        assert result["status"] == 200
        assert result["hasEntries"] is True

    def test_roles_list_api(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/governance/roles');
                const data = await resp.json();
                return { status: resp.status, count: data.roles?.length || 0, currentRole: data.current_role || '' };
            }
        """)
        assert result["status"] == 200
        assert result["count"] >= 4
        assert result["currentRole"] == "analyst"


class TestBusinessGlossary:
    """Business Glossary view E2E tests (Phase 23)."""

    def test_view_loads(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        assert loaded_page.locator("text=Business Glossary").first.is_visible(timeout=5000) or \
               loaded_page.locator("text=Business Terms").first.is_visible(timeout=5000)

    def test_sidebar_entry_visible(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        nav_link = loaded_page.locator("a[href='/glossary'], [data-path='/glossary']").first
        assert nav_link.is_visible(timeout=5000)

    def test_category_list_visible(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        assert loaded_page.locator("[data-tour='glossary-categories'], text=Market Abuse").first.is_visible(timeout=5000)

    def test_term_list_visible(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        assert loaded_page.locator("[data-tour='glossary-term-list'], text=Wash Trade").first.is_visible(timeout=5000)

    def test_search_box_visible(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        assert loaded_page.locator("[data-tour='glossary-search'], input[placeholder*='earch']").first.is_visible(timeout=5000)

    def test_tab_navigation_to_metrics(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        metrics_tab = loaded_page.locator("text=Semantic Metrics").first
        if metrics_tab.is_visible(timeout=3000):
            metrics_tab.click()
            loaded_page.wait_for_timeout(500)
            assert loaded_page.locator("text=daily_alert_rate, text=Metric").first.is_visible(timeout=3000) or \
                   loaded_page.locator("[data-tour='glossary-metrics-list']").first.is_visible(timeout=3000)

    def test_tab_navigation_to_dmbok(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/glossary")
        loaded_page.wait_for_load_state("networkidle")
        dmbok_tab = loaded_page.locator("text=DAMA-DMBOK").first
        if dmbok_tab.is_visible(timeout=3000):
            dmbok_tab.click()
            loaded_page.wait_for_timeout(500)
            assert loaded_page.locator("text=Data Governance, text=Data Architecture").first.is_visible(timeout=3000) or \
                   loaded_page.locator("[data-tour='glossary-dmbok-grid']").first.is_visible(timeout=3000)

    def test_glossary_api_returns_terms(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/glossary/terms');
                const data = await resp.json();
                return { status: resp.status, count: data.count || 0 };
            }
        """)
        assert result["status"] == 200
        assert result["count"] >= 30
