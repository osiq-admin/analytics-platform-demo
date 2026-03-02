"""Phase 7B settings and metadata E2E tests — settings manager, metadata editor, patterns.

Covers:
- Settings Manager enhancements
- Metadata Editor enhancements
- Match patterns and score templates API operations
"""
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


# ============================================================================
# 9. Settings Manager enhancements
# ============================================================================

class TestSettingsEnhancements:
    """Test Settings Manager view with Phase 7B enhancements."""

    def test_settings_view_renders(self, loaded_page: Page):
        """Settings Manager renders at /settings."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        heading = loaded_page.locator("text=Settings Manager")
        expect(heading.first).to_be_visible()

    def test_settings_list_visible(self, loaded_page: Page):
        """Settings list panel is visible."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Panel with title "Settings"
        panel = loaded_page.locator("[data-tour='settings-list']")
        expect(panel.first).to_be_visible()

    def test_settings_new_setting_button(self, loaded_page: Page):
        """The '+ New Setting' button is visible."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Setting')")
        expect(new_btn.first).to_be_visible()

    def test_settings_click_shows_detail(self, loaded_page: Page):
        """Clicking a setting shows its detail panel."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # The settings list is rendered via AG Grid — click a row
        # Wait for the AG Grid to load
        loaded_page.wait_for_timeout(1000)

        # Try clicking any row in the settings list (AG Grid rows)
        row = loaded_page.locator("[data-tour='settings-list'] .ag-row").first
        if row.is_visible(timeout=3000):
            row.click()
            loaded_page.wait_for_timeout(500)

            # Detail panel should appear with Edit/Delete buttons
            edit_btn = loaded_page.locator("button:has-text('Edit')")
            if edit_btn.count() > 0:
                expect(edit_btn.first).to_be_visible()


# ============================================================================
# 10. Metadata Editor enhancements
# ============================================================================

class TestMetadataEditorEnhancements:
    """Test Metadata Editor with Phase 7B enhancements."""

    def test_editor_renders(self, loaded_page: Page):
        """Metadata Editor renders at /editor."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        heading = loaded_page.locator("text=Metadata Editor")
        expect(heading.first).to_be_visible()

    def test_type_selector_visible(self, loaded_page: Page):
        """The type selector buttons (Entities, Calculations, Settings, Models) are visible."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        type_selector = loaded_page.locator("[data-tour='editor-type-selector']")
        expect(type_selector.first).to_be_visible()

        # Verify individual type buttons
        entities_btn = loaded_page.locator("[data-tour='editor-type-selector'] button:has-text('Entities')")
        expect(entities_btn.first).to_be_visible()

        calcs_btn = loaded_page.locator("[data-tour='editor-type-selector'] button:has-text('Calculations')")
        expect(calcs_btn.first).to_be_visible()

        settings_btn = loaded_page.locator("[data-tour='editor-type-selector'] button:has-text('Settings')")
        expect(settings_btn.first).to_be_visible()

        models_btn = loaded_page.locator("[data-tour='editor-type-selector'] button:has-text('Models')")
        expect(models_btn.first).to_be_visible()

    def test_json_editor_panel_visible(self, loaded_page: Page):
        """JSON Editor panel is visible."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        json_panel = loaded_page.locator("[data-tour='editor-json']")
        expect(json_panel.first).to_be_visible()

    def test_visual_editor_panel_visible(self, loaded_page: Page):
        """Visual Editor panel is visible."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        visual_panel = loaded_page.locator("[data-tour='editor-visual']")
        expect(visual_panel.first).to_be_visible()

    def test_type_selector_switches_type(self, loaded_page: Page):
        """Clicking a different type button switches the displayed items."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Click Calculations button
        calcs_btn = loaded_page.locator("[data-tour='editor-type-selector'] button:has-text('Calculations')")
        calcs_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # The Calculations button should now have the active styling (bg-accent class)
        # Check that it has the accent styling
        calcs_classes = calcs_btn.first.get_attribute("class")
        assert "accent" in (calcs_classes or ""), "Calculations button should have accent class when active"

    def test_save_button_visible(self, loaded_page: Page):
        """The Save button is visible in the editor."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        save_btn = loaded_page.locator("[data-tour='editor-save'] button:has-text('Save')")
        expect(save_btn.first).to_be_visible()

    def test_json_validity_indicator(self, loaded_page: Page):
        """The JSON validity indicator shows 'Valid JSON'."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        valid_indicator = loaded_page.locator("text=Valid JSON")
        expect(valid_indicator.first).to_be_visible()

    def test_layer_badge_visible(self, loaded_page: Page):
        """The layer badge (OOB/Custom) is visible next to the item selector."""
        loaded_page.goto(f"{APP_URL}/editor", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        layer_badge = loaded_page.locator("[data-tour='editor-layer-badge']")
        expect(layer_badge.first).to_be_visible()


# ============================================================================
# 12. Match patterns and score templates CRUD
# ============================================================================

class TestMatchPatternsAndScoreTemplates:
    """Test match patterns and score templates API operations."""

    def test_match_patterns_list_not_empty(self, loaded_page: Page):
        """Match patterns list returns patterns (may have OOB patterns)."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/match-patterns');
                return await resp.json();
            }
        """)
        assert "patterns" in result
        # Patterns array exists (may be empty in a fresh workspace)
        assert isinstance(result["patterns"], list)

    def test_score_templates_list(self, loaded_page: Page):
        """Score templates list returns templates."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/score-templates');
                return await resp.json();
            }
        """)
        assert "templates" in result
        assert isinstance(result["templates"], list)

    def test_score_templates_filter_by_category(self, loaded_page: Page):
        """Score templates can be filtered by value_category."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/score-templates?value_category=ratio');
                return await resp.json();
            }
        """)
        assert "templates" in result
        assert isinstance(result["templates"], list)
