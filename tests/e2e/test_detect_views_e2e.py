"""E2E tests for detection views — Model Composer, SQL Console, Pipeline & Alerts.

Covers:
- Model Composer — detection models and their calculations
- SQL Console — execute queries
- Pipeline & Alert generation E2E flow
"""


APP_URL = "http://127.0.0.1:8333"


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
    """Full E2E: load data -> run pipeline -> generate alerts -> view details."""

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
