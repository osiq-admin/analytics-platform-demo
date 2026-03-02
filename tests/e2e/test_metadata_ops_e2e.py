"""E2E tests for metadata operations — APIs, trace endpoints, editor, CRUD buttons.

Covers:
- Phase 7 — Metadata CRUD API via browser
- Phase 8 — Trace API endpoints
- Phase 9 — Metadata Editor
- Phase 9 — CRUD Buttons in existing views
"""
import json


APP_URL = "http://127.0.0.1:8333"


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
