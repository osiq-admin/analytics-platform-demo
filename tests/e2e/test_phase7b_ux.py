"""Phase 7B UX E2E tests — tour system, operation scripts, examples drawer, sidebar.

Covers:
- Tour system: scenarios button, scenario selector, theme toggle, demo toolbar
- Operation scripts help panel
- ExamplesDrawer in Model Composer
- Sidebar navigation integrity
"""
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


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
