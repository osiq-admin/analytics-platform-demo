"""Phase 7B view E2E tests — view rendering and interaction.

Covers:
- Use Case Studio view
- Submissions Queue view
- Model Composer 7-step wizard
- New views parametrized render tests
- Model Composer detail and selection
"""
import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


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
