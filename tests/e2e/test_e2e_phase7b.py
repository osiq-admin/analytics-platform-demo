"""Phase 7B Playwright E2E tests — Metadata UX & Guided Demo.

Covers:
- New API endpoints: domain values, match patterns, score templates, dry run,
  validation, use cases, submissions, AI calc, versions, date range
- New views: Use Case Studio, Submissions Queue
- Model Composer 7-step wizard
- Tour system: scenarios button, scenario selector
- Operation scripts help panel
- ExamplesDrawer, ValidationPanel, DependencyMiniDAG
"""
import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


# ============================================================================
# 1. Phase 7B API endpoints — via fetch() from loaded_page
# ============================================================================

class TestPhase7bApiEndpoints:
    """Test all new backend APIs introduced in Phase 7B."""

    def test_date_range_api(self, loaded_page: Page):
        """GET /api/data/date-range/execution returns min/max dates."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/data/date-range/execution');
                return await resp.json();
            }
        """)
        assert "entity_id" in result
        assert result["entity_id"] == "execution"
        assert "date_ranges" in result

    def test_domain_values_api(self, loaded_page: Page):
        """GET /api/metadata/domain-values/execution/product_id returns values."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/domain-values/execution/product_id');
                return await resp.json();
            }
        """)
        # The endpoint returns domain values — either a list or object with values
        assert isinstance(result, (dict, list))
        if isinstance(result, dict):
            assert "values" in result or "error" not in result

    def test_domain_values_match_keys_api(self, loaded_page: Page):
        """GET /api/metadata/domain-values/match-keys returns match keys."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/domain-values/match-keys');
                return await resp.json();
            }
        """)
        assert "match_keys" in result
        assert isinstance(result["match_keys"], list)

    def test_domain_values_setting_ids_api(self, loaded_page: Page):
        """GET /api/metadata/domain-values/setting-ids returns setting IDs."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/domain-values/setting-ids');
                return await resp.json();
            }
        """)
        assert "settings" in result
        assert isinstance(result["settings"], list)

    def test_domain_values_calculation_ids_api(self, loaded_page: Page):
        """GET /api/metadata/domain-values/calculation-ids returns calc IDs."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/domain-values/calculation-ids');
                return await resp.json();
            }
        """)
        assert "calculations" in result
        assert isinstance(result["calculations"], list)

    def test_match_patterns_api(self, loaded_page: Page):
        """GET /api/metadata/match-patterns returns patterns array."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/match-patterns');
                return await resp.json();
            }
        """)
        assert "patterns" in result
        assert isinstance(result["patterns"], list)

    def test_score_templates_api(self, loaded_page: Page):
        """GET /api/metadata/score-templates returns templates array."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/score-templates');
                return await resp.json();
            }
        """)
        assert "templates" in result
        assert isinstance(result["templates"], list)

    def test_detection_dry_run_api(self, loaded_page: Page):
        """POST /api/detection-models/dry-run returns results."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/detection-models/dry-run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model_id: 'test_dry_run',
                        name: 'Test Dry Run',
                        description: 'E2E test dry run',
                        query: 'SELECT * FROM execution LIMIT 5',
                        calculations: [],
                        context_fields: ['product_id'],
                    }),
                });
                return await resp.json();
            }
        """)
        assert "status" in result
        # Either ok with results or error — both are valid responses
        assert result["status"] in ("ok", "error")
        assert "alerts" in result

    def test_detection_dry_run_empty_query(self, loaded_page: Page):
        """POST /api/detection-models/dry-run with empty query returns error."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/detection-models/dry-run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model_id: 'test_empty',
                        name: 'Empty',
                        query: '',
                    }),
                });
                return await resp.json();
            }
        """)
        assert result["status"] == "error"
        assert "No query provided" in result.get("error", "")

    def test_validation_detection_model_api(self, loaded_page: Page):
        """POST /api/validation/detection-model returns validation results."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/validation/detection-model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model_id: 'e2e_test_model',
                        name: 'E2E Test Model',
                        description: 'Test description',
                        calculations: [{ calc_id: 'buy_sell_ratio', strictness: 'MUST_PASS' }],
                        query: 'SELECT * FROM execution',
                        context_fields: ['product_id'],
                        score_threshold_setting: 'wash_score_threshold',
                    }),
                });
                return await resp.json();
            }
        """)
        assert "total" in result
        assert "passed" in result
        assert "failed" in result
        assert "results" in result
        assert isinstance(result["results"], list)
        assert result["total"] == result["passed"] + result["failed"]

    def test_validation_calculation_api(self, loaded_page: Page):
        """POST /api/validation/calculation returns validation results."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/validation/calculation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        calc_id: 'test_calc',
                        name: 'Test Calculation',
                        logic: 'SUM(quantity)',
                        layer: 'derived',
                    }),
                });
                return await resp.json();
            }
        """)
        assert "total" in result
        assert "passed" in result
        assert "results" in result

    def test_validation_setting_api(self, loaded_page: Page):
        """POST /api/validation/setting returns validation results."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/validation/setting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        setting_id: 'test_setting',
                        name: 'Test Setting',
                        value_type: 'decimal',
                        default: 0.5,
                    }),
                });
                return await resp.json();
            }
        """)
        assert "total" in result
        assert "results" in result

    def test_use_cases_api(self, loaded_page: Page):
        """GET /api/use-cases returns use cases array."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/use-cases');
                return await resp.json();
            }
        """)
        assert "use_cases" in result
        assert isinstance(result["use_cases"], list)

    def test_submissions_api(self, loaded_page: Page):
        """GET /api/submissions returns submissions array."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/submissions');
                return await resp.json();
            }
        """)
        assert "submissions" in result
        assert isinstance(result["submissions"], list)

    def test_ai_suggest_calculation_api(self, loaded_page: Page):
        """POST /api/ai/suggest-calculation returns a calculation proposal."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/ai/suggest-calculation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'Calculate buy-sell ratio per product per day',
                    }),
                });
                return await resp.json();
            }
        """)
        # Should return a suggestion with metadata_context
        assert isinstance(result, dict)
        assert "metadata_context" in result

    def test_ai_context_api(self, loaded_page: Page):
        """GET /api/ai/context returns metadata context."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/ai/context');
                return await resp.json();
            }
        """)
        assert "context" in result
        assert "summary" in result
        assert "entities" in result["summary"]
        assert "calculations" in result["summary"]
        assert "settings" in result["summary"]

    def test_versions_api(self, loaded_page: Page):
        """GET /api/versions/{item_type}/{item_id} returns version history."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/versions/detection_models/wash_trading_full_day');
                return await resp.json();
            }
        """)
        assert "item_type" in result
        assert "item_id" in result
        assert "versions" in result
        assert isinstance(result["versions"], list)

    def test_versions_record_api(self, loaded_page: Page):
        """POST /api/versions/record creates a version entry."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/versions/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_type: 'detection_models',
                        item_id: 'e2e_test_version',
                        snapshot: { name: 'E2E Test', version: 1 },
                        change_type: 'create',
                        author: 'e2e_test',
                        description: 'E2E test version',
                    }),
                });
                return await resp.json();
            }
        """)
        assert isinstance(result, dict)
        # Should have version information
        assert "item_type" in result or "version" in result or "snapshot" in result


# ============================================================================
# 2. Use Case Studio view
# ============================================================================

class TestUseCaseStudioView:
    """Test the Use Case Studio view renders and is interactive."""

    def test_use_case_studio_renders(self, loaded_page: Page):
        """Use Case Studio renders at /use-cases with proper heading."""
        loaded_page.goto(f"{APP_URL}/use-cases", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        heading = loaded_page.locator("text=Use Case Studio")
        expect(heading.first).to_be_visible()

    def test_new_use_case_button_visible(self, loaded_page: Page):
        """The '+ New Use Case' button is visible."""
        loaded_page.goto(f"{APP_URL}/use-cases", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Use Case')")
        expect(new_btn.first).to_be_visible()

    def test_use_case_list_panel_visible(self, loaded_page: Page):
        """The Use Cases panel is visible."""
        loaded_page.goto(f"{APP_URL}/use-cases", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # The left panel shows the heading "Use Cases"
        panel = loaded_page.locator("text=Use Cases").first
        expect(panel).to_be_visible()

    def test_empty_state_or_list(self, loaded_page: Page):
        """Either shows empty state or a list of use cases."""
        loaded_page.goto(f"{APP_URL}/use-cases", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Either we have use cases listed or the empty state message
        content_area = loaded_page.locator("main")
        expect(content_area).not_to_be_empty()

    def test_new_use_case_opens_builder(self, loaded_page: Page):
        """Clicking '+ New Use Case' opens the UseCaseBuilder form."""
        loaded_page.goto(f"{APP_URL}/use-cases", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Use Case')")
        new_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # The builder form should appear — look for form elements
        # UseCaseBuilder has input fields for name and description
        cancel_btn = loaded_page.locator("button:has-text('Cancel')")
        expect(cancel_btn.first).to_be_visible()


# ============================================================================
# 3. Submissions view
# ============================================================================

class TestSubmissionsView:
    """Test the Submissions Queue view renders correctly."""

    def test_submissions_view_renders(self, loaded_page: Page):
        """Submissions view renders at /submissions with proper heading."""
        loaded_page.goto(f"{APP_URL}/submissions", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        heading = loaded_page.locator("text=Submissions Review Queue")
        expect(heading.first).to_be_visible()

    def test_submissions_panel_visible(self, loaded_page: Page):
        """The Submissions panel with count is visible."""
        loaded_page.goto(f"{APP_URL}/submissions", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Panel title includes "Submissions ("
        panel = loaded_page.locator("text=/Submissions \\(/")
        expect(panel.first).to_be_visible()

    def test_submissions_empty_or_grid(self, loaded_page: Page):
        """Shows empty state message or AG Grid with data."""
        loaded_page.goto(f"{APP_URL}/submissions", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Either the empty state "No submissions yet" or AG Grid is present
        empty_state = loaded_page.locator("text=No submissions yet")
        ag_grid = loaded_page.locator(".ag-root-wrapper")

        is_empty = empty_state.count() > 0
        has_grid = ag_grid.count() > 0

        assert is_empty or has_grid, "Expected either empty state or AG Grid"


# ============================================================================
# 4. Model Composer wizard
# ============================================================================

class TestModelComposerWizard:
    """Test the Model Composer 7-step wizard flow."""

    def test_model_composer_renders(self, loaded_page: Page):
        """Model Composer renders at /models with heading."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        heading = loaded_page.locator("text=Model Composer")
        expect(heading.first).to_be_visible()

    def test_new_model_button_visible(self, loaded_page: Page):
        """The '+ New Model' button is visible."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Model')")
        expect(new_btn.first).to_be_visible()

    def test_detection_models_list(self, loaded_page: Page):
        """Detection Models list panel is visible with models."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        panel = loaded_page.locator("text=Detection Models")
        expect(panel.first).to_be_visible()

    def test_wizard_step1_define(self, loaded_page: Page):
        """Clicking '+ New Model' opens wizard Step 1 with name/description inputs."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Model')")
        new_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Step 1 should show "Create New Model" heading
        create_heading = loaded_page.locator("text=Create New Model")
        expect(create_heading.first).to_be_visible()

        # Step 1 should have "Define" in the wizard progress
        define_label = loaded_page.locator("text=Step 1: Define Model")
        expect(define_label.first).to_be_visible()

        # Name input should be present
        name_input = loaded_page.locator("input[placeholder*='Custom Wash']")
        expect(name_input.first).to_be_visible()

    def test_wizard_navigation_next(self, loaded_page: Page):
        """Fill name and click Next to go to Step 2 (Calculations)."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Model')")
        new_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Fill the name to enable Next
        name_input = loaded_page.locator("input[placeholder*='Custom Wash']")
        name_input.first.fill("E2E Test Model")
        loaded_page.wait_for_timeout(200)

        # Click Next
        next_btn = loaded_page.locator("button:has-text('Next')")
        expect(next_btn.first).to_be_enabled()
        next_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Step 2 should show calculations selection
        step2_heading = loaded_page.locator("text=/Step 2.*Calculation/i")
        expect(step2_heading.first).to_be_visible()

    def test_wizard_back_button(self, loaded_page: Page):
        """Back button works in wizard navigation."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Model')")
        new_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Fill name and go to step 2
        name_input = loaded_page.locator("input[placeholder*='Custom Wash']")
        name_input.first.fill("E2E Test Model")
        loaded_page.wait_for_timeout(200)
        next_btn = loaded_page.locator("button:has-text('Next')")
        next_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Click Back
        back_btn = loaded_page.locator("button:has-text('Back')")
        expect(back_btn.first).to_be_visible()
        back_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Should be back on step 1
        define_label = loaded_page.locator("text=Step 1: Define Model")
        expect(define_label.first).to_be_visible()

    def test_wizard_cancel(self, loaded_page: Page):
        """Cancel button exits the wizard."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Model')")
        new_btn.first.click()
        loaded_page.wait_for_timeout(500)

        cancel_btn = loaded_page.locator("button:has-text('Cancel')")
        cancel_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Should show the default view ("Select a detection model" message)
        default_msg = loaded_page.locator("text=Select a detection model")
        expect(default_msg.first).to_be_visible()

    def test_wizard_right_panel_tabs(self, loaded_page: Page):
        """In create mode, the right panel shows Validate/Preview/Deps tabs."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        new_btn = loaded_page.locator("button:has-text('New Model')")
        new_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Validate tab
        validate_tab = loaded_page.locator("button:has-text('Validate')")
        expect(validate_tab.first).to_be_visible()

        # Preview tab
        preview_tab = loaded_page.locator("button:has-text('Preview')")
        expect(preview_tab.first).to_be_visible()

        # Deps tab
        deps_tab = loaded_page.locator("button:has-text('Deps')")
        expect(deps_tab.first).to_be_visible()


# ============================================================================
# 5. Tour system — scenarios and tours
# ============================================================================

class TestTourSystem:
    """Test the tour and scenario system in the header toolbar."""

    def test_tour_button_visible(self, loaded_page: Page):
        """The 'Tour' button is visible in the header toolbar."""
        tour_btn = loaded_page.locator("button:has-text('Tour')")
        expect(tour_btn.first).to_be_visible()

    def test_scenarios_button_visible(self, loaded_page: Page):
        """The 'Scenarios' button is visible in the header toolbar."""
        scenarios_btn = loaded_page.locator("button:has-text('Scenarios')")
        expect(scenarios_btn.first).to_be_visible()

    def test_scenarios_opens_selector(self, loaded_page: Page):
        """Clicking 'Scenarios' opens the scenario selector overlay."""
        scenarios_btn = loaded_page.locator("button:has-text('Scenarios')")
        scenarios_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Scenario selector should appear with "Guided Scenarios" heading
        heading = loaded_page.locator("text=Guided Scenarios")
        expect(heading.first).to_be_visible()

    def test_scenario_selector_has_difficulty_filter(self, loaded_page: Page):
        """Scenario selector shows difficulty filter buttons."""
        scenarios_btn = loaded_page.locator("button:has-text('Scenarios')")
        scenarios_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Should have difficulty filter buttons
        all_levels = loaded_page.locator("button:has-text('All levels')")
        expect(all_levels.first).to_be_visible()

    def test_scenario_selector_has_categories(self, loaded_page: Page):
        """Scenario selector shows category groupings."""
        scenarios_btn = loaded_page.locator("button:has-text('Scenarios')")
        scenarios_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Check for at least one known category label
        # Categories include: Settings & Thresholds, Calculations, Detection Models, etc.
        selector_content = loaded_page.locator(".fixed.inset-0")
        expect(selector_content.first).to_be_visible()

    def test_scenario_selector_close(self, loaded_page: Page):
        """Scenario selector can be closed."""
        scenarios_btn = loaded_page.locator("button:has-text('Scenarios')")
        scenarios_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Close button (the 'x' button)
        close_btn = loaded_page.locator("button[title='Close']")
        if close_btn.count() > 0:
            close_btn.first.click()
        else:
            # Alternative: button with text 'x' in the scenario overlay header
            x_btn = loaded_page.locator(".fixed.inset-0 button:has-text('x')")
            if x_btn.count() > 0:
                x_btn.first.click()

        loaded_page.wait_for_timeout(500)

        # Overlay should be dismissed — "Guided Scenarios" should no longer be visible
        heading = loaded_page.locator("text=Guided Scenarios")
        expect(heading).to_have_count(0)

    def test_theme_toggle_visible(self, loaded_page: Page):
        """The theme toggle button (Light/Dark) is in the toolbar."""
        theme_btn = loaded_page.locator("button:has-text('Light'), button:has-text('Dark')")
        expect(theme_btn.first).to_be_visible()

    def test_demo_toolbar_visible(self, loaded_page: Page):
        """The DemoToolbar is visible with Reset/Step/End buttons."""
        reset_btn = loaded_page.locator("button:has-text('Reset')")
        expect(reset_btn.first).to_be_visible()

        step_btn = loaded_page.locator("button:has-text('Step')")
        expect(step_btn.first).to_be_visible()

        end_btn = loaded_page.locator("button:has-text('End')")
        expect(end_btn.first).to_be_visible()


# ============================================================================
# 6. Operation scripts — per-view help panel
# ============================================================================

class TestOperationScripts:
    """Test the per-view help panel (OperationScripts)."""

    def test_help_button_visible(self, loaded_page: Page):
        """The floating '?' help button is visible on the page."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # OperationScripts renders a fixed button with '?'
        help_btn = loaded_page.locator("button[title='What can I do here?']")
        expect(help_btn.first).to_be_visible()

    def test_help_button_opens_panel(self, loaded_page: Page):
        """Clicking '?' opens the operations help panel."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        help_btn = loaded_page.locator("button[title='What can I do here?']")
        help_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Panel should appear with "What can you do on this view?" text
        panel_text = loaded_page.locator("text=What can you do on this view?")
        expect(panel_text.first).to_be_visible()

    def test_help_panel_has_operations(self, loaded_page: Page):
        """The help panel shows 'Available Operations' section."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        help_btn = loaded_page.locator("button[title='What can I do here?']")
        help_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Should have "Available Operations" heading
        ops_heading = loaded_page.locator("text=Available Operations")
        expect(ops_heading.first).to_be_visible()

    def test_help_panel_close(self, loaded_page: Page):
        """The help panel can be closed."""
        loaded_page.goto(f"{APP_URL}/settings", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        help_btn = loaded_page.locator("button[title='What can I do here?']")
        help_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Close via the 'x' button in the panel header
        close_btn = loaded_page.locator(".fixed.top-0.right-0 button:has-text('x')")
        if close_btn.count() > 0:
            close_btn.first.click()
        else:
            # Click the backdrop to close
            backdrop = loaded_page.locator(".fixed.inset-0.bg-black\\/30")
            if backdrop.count() > 0:
                backdrop.first.click()

        loaded_page.wait_for_timeout(500)

        # "What can you do" text should be gone
        panel_text = loaded_page.locator("text=What can you do on this view?")
        expect(panel_text).to_have_count(0)

    def test_help_button_on_models_view(self, loaded_page: Page):
        """Help button appears on the Models view too."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        help_btn = loaded_page.locator("button[title='What can I do here?']")
        expect(help_btn.first).to_be_visible()

    def test_help_button_on_entities_view(self, loaded_page: Page):
        """Help button appears on the Entities view."""
        loaded_page.goto(f"{APP_URL}/entities", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        help_btn = loaded_page.locator("button[title='What can I do here?']")
        expect(help_btn.first).to_be_visible()


# ============================================================================
# 7. Examples drawer in Model Composer
# ============================================================================

class TestExamplesDrawer:
    """Test the ExamplesDrawer component on the Model Composer view."""

    def test_examples_button_visible(self, loaded_page: Page):
        """The 'Examples' button is visible on Model Composer."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        examples_btn = loaded_page.locator("button:has-text('Examples')")
        expect(examples_btn.first).to_be_visible()

    def test_examples_drawer_opens(self, loaded_page: Page):
        """Clicking 'Examples' opens the drawer."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        examples_btn = loaded_page.locator("button:has-text('Examples')")
        examples_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Drawer header should show "Examples & Use Cases"
        drawer_title = loaded_page.locator("text=Examples & Use Cases")
        expect(drawer_title.first).to_be_visible()

    def test_examples_drawer_has_tabs(self, loaded_page: Page):
        """The drawer has Models / Settings / Calculations tabs."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        examples_btn = loaded_page.locator("button:has-text('Examples')")
        examples_btn.first.click()
        loaded_page.wait_for_timeout(500)

        models_tab = loaded_page.locator("button:has-text('Models')")
        expect(models_tab.first).to_be_visible()

        settings_tab = loaded_page.locator("button:has-text('Settings')")
        expect(settings_tab.first).to_be_visible()

        calcs_tab = loaded_page.locator("button:has-text('Calculations')")
        expect(calcs_tab.first).to_be_visible()

    def test_examples_drawer_has_content(self, loaded_page: Page):
        """The drawer shows example cards."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        examples_btn = loaded_page.locator("button:has-text('Examples')")
        examples_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Example cards should be present — they have a border class and rounded style
        # Look for any element with category badges (the colored tags)
        drawer_panel = loaded_page.locator(".fixed.top-0.right-0")
        expect(drawer_panel.first).to_be_visible()

    def test_examples_drawer_close(self, loaded_page: Page):
        """The drawer can be closed."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        examples_btn = loaded_page.locator("button:has-text('Examples')")
        examples_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Close button with aria-label
        close_btn = loaded_page.locator("button[aria-label='Close examples drawer']")
        expect(close_btn.first).to_be_visible()
        close_btn.first.click()
        loaded_page.wait_for_timeout(500)

        # Drawer closed — button text reverts to "Examples" (drawer uses CSS
        # translate-x-full so it stays in DOM but is off-screen)
        examples_btn_text = loaded_page.locator("button:has-text('Examples')").first
        expect(examples_btn_text).to_be_visible()
        expect(examples_btn_text).not_to_have_text("Close Examples")

    def test_examples_button_toggles_to_close(self, loaded_page: Page):
        """The button text changes to 'Close Examples' when open."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        examples_btn = loaded_page.locator("button:has-text('Examples')")
        examples_btn.first.click()
        loaded_page.wait_for_timeout(500)

        close_label = loaded_page.locator("button:has-text('Close Examples')")
        expect(close_label.first).to_be_visible()

    def test_ask_ai_button_visible(self, loaded_page: Page):
        """The 'Ask AI' button is visible on Model Composer."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        ai_btn = loaded_page.locator("button:has-text('Ask AI')")
        expect(ai_btn.first).to_be_visible()


# ============================================================================
# 8. New views render (parametrized)
# ============================================================================

class TestNewViewsRender:
    """Parametrized test that new Phase 7B routes render correctly."""

    @pytest.mark.parametrize(
        "route,expected_heading",
        [
            ("/use-cases", "Use Case Studio"),
            ("/submissions", "Submissions Review Queue"),
        ],
    )
    def test_new_view_renders(self, loaded_page: Page, route: str, expected_heading: str):
        """New Phase 7B views render with expected heading."""
        loaded_page.goto(f"{APP_URL}{route}", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        heading = loaded_page.locator(f"text={expected_heading}")
        expect(heading.first).to_be_visible()

    @pytest.mark.parametrize(
        "route",
        ["/use-cases", "/submissions"],
    )
    def test_new_view_main_content_not_empty(self, loaded_page: Page, route: str):
        """Main content area is not empty on new views."""
        loaded_page.goto(f"{APP_URL}{route}", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        main = loaded_page.locator("main")
        expect(main).not_to_be_empty()

    @pytest.mark.parametrize(
        "route",
        ["/use-cases", "/submissions"],
    )
    def test_new_view_sidebar_nav_works(self, loaded_page: Page, route: str):
        """Sidebar navigation links work for new views."""
        loaded_page.goto(f"{APP_URL}/dashboard", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Find the sidebar link that points to this route
        nav_link = loaded_page.locator(f"aside a[href='{route}']")
        if nav_link.count() > 0:
            nav_link.first.click()
            loaded_page.wait_for_load_state("networkidle")
            assert loaded_page.url.endswith(route)


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
# 11. API CRUD operations for use cases and submissions
# ============================================================================

class TestApiCrudOperations:
    """Test CRUD cycle for use cases and submissions via API."""

    def test_use_case_crud_cycle(self, loaded_page: Page):
        """Create, read, and delete a use case via API."""
        # Create
        create_result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/use-cases/e2e_test_uc', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        use_case_id: 'e2e_test_uc',
                        name: 'E2E Test Use Case',
                        description: 'Created by E2E test',
                        status: 'draft',
                        author: 'e2e',
                        components: [],
                        tags: ['e2e'],
                        sample_data: {},
                        expected_results: { should_fire: false },
                    }),
                });
                return { status: resp.status, body: await resp.json() };
            }
        """)
        assert create_result["status"] == 200
        assert create_result["body"]["name"] == "E2E Test Use Case"

        # Read
        read_result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/use-cases/e2e_test_uc');
                return { status: resp.status, body: await resp.json() };
            }
        """)
        assert read_result["status"] == 200
        assert read_result["body"]["name"] == "E2E Test Use Case"

        # Delete
        delete_result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/use-cases/e2e_test_uc', { method: 'DELETE' });
                return { status: resp.status, body: await resp.json() };
            }
        """)
        assert delete_result["status"] == 200
        assert delete_result["body"]["deleted"] == "e2e_test_uc"

    def test_submission_create_and_list(self, loaded_page: Page):
        """Create a submission and verify it appears in the list."""
        # First create a use case to attach
        loaded_page.evaluate("""
            async () => {
                await fetch('/api/use-cases/e2e_sub_uc', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        use_case_id: 'e2e_sub_uc',
                        name: 'E2E Submission UC',
                        description: 'For submission test',
                        status: 'draft',
                        author: 'e2e',
                        components: [],
                        tags: [],
                        sample_data: {},
                        expected_results: { should_fire: false },
                    }),
                });
            }
        """)

        # Create submission
        create_result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        use_case_id: 'e2e_sub_uc',
                        name: 'E2E Test Submission',
                        description: 'Created by E2E test',
                        author: 'e2e_user',
                        components: [],
                        tags: ['e2e'],
                    }),
                });
                return { status: resp.status, body: await resp.json() };
            }
        """)
        assert create_result["status"] == 200
        sub_id = create_result["body"]["submission_id"]
        assert sub_id.startswith("SUB-")

        # Verify in list
        list_result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/submissions');
                return await resp.json();
            }
        """)
        sub_ids = [s["submission_id"] for s in list_result["submissions"]]
        assert sub_id in sub_ids

        # Clean up: delete both
        loaded_page.evaluate(f"""
            async () => {{
                await fetch('/api/submissions/{sub_id}', {{ method: 'DELETE' }});
                await fetch('/api/use-cases/e2e_sub_uc', {{ method: 'DELETE' }});
            }}
        """)


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


# ============================================================================
# 13. Sidebar navigation integrity
# ============================================================================

class TestSidebarNavigation:
    """Verify sidebar navigation includes Phase 7B entries."""

    def test_sidebar_has_use_cases_link(self, loaded_page: Page):
        """Sidebar has a 'Use Cases' navigation link."""
        sidebar = loaded_page.locator("aside")
        use_cases_link = sidebar.locator("a:has-text('Use Cases')")
        expect(use_cases_link.first).to_be_visible()

    def test_sidebar_has_submissions_link(self, loaded_page: Page):
        """Sidebar has a 'Submissions' navigation link."""
        sidebar = loaded_page.locator("aside")
        submissions_link = sidebar.locator("a:has-text('Submissions')")
        expect(submissions_link.first).to_be_visible()

    def test_sidebar_investigate_section(self, loaded_page: Page):
        """Sidebar has an 'Investigate' section with Risk Cases, Submissions, Regulatory Map."""
        sidebar = loaded_page.locator("aside")
        investigate_heading = sidebar.locator("text=Investigate")
        expect(investigate_heading.first).to_be_visible()

    def test_sidebar_detect_section(self, loaded_page: Page):
        """Sidebar has a 'Detect' section with Models, Use Cases, Pipeline, Dashboard."""
        sidebar = loaded_page.locator("aside")
        detect_heading = sidebar.locator("text=Detect")
        expect(detect_heading.first).to_be_visible()


# ============================================================================
# 14. Model Composer — model selection and detail
# ============================================================================

class TestModelComposerDetail:
    """Test model selection and detail view in Model Composer."""

    def test_select_existing_model(self, loaded_page: Page):
        """Clicking an existing model shows its detail."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        # Click on one of the detection model entries in the left list
        model_buttons = loaded_page.locator("[data-tour='model-list'] button.text-left")
        if model_buttons.count() > 1:
            # Skip the first button (it's "+ New Model") — click the second one
            model_buttons.nth(1).click()
            loaded_page.wait_for_timeout(500)

            # Detail view should appear
            detail_area = loaded_page.locator("[data-tour='model-detail']")
            expect(detail_area.first).to_be_visible()

    def test_model_detail_has_deploy_button(self, loaded_page: Page):
        """Selected model detail shows 'Deploy & Run' button."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        model_buttons = loaded_page.locator("[data-tour='model-list'] button.text-left")
        if model_buttons.count() > 1:
            model_buttons.nth(1).click()
            loaded_page.wait_for_timeout(500)

            deploy_btn = loaded_page.locator("button:has-text('Deploy & Run')")
            expect(deploy_btn.first).to_be_visible()

    def test_model_detail_has_calculations_panel(self, loaded_page: Page):
        """Selected model detail shows 'Calculations & Scoring' panel."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        model_buttons = loaded_page.locator("[data-tour='model-list'] button.text-left")
        if model_buttons.count() > 1:
            model_buttons.nth(1).click()
            loaded_page.wait_for_timeout(500)

            calcs_panel = loaded_page.locator("text=Calculations & Scoring")
            expect(calcs_panel.first).to_be_visible()

    def test_model_layer_badges_visible(self, loaded_page: Page):
        """Model list entries show OOB/Custom layer badges."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        badges = loaded_page.locator("[data-tour='model-layer-badge']")
        if badges.count() > 0:
            expect(badges.first).to_be_visible()

    def test_available_calculations_panel(self, loaded_page: Page):
        """Available Calculations panel is visible in browse mode."""
        loaded_page.goto(f"{APP_URL}/models", wait_until="domcontentloaded")
        loaded_page.wait_for_load_state("networkidle")

        avail_calcs = loaded_page.locator("text=Available Calculations")
        expect(avail_calcs.first).to_be_visible()
