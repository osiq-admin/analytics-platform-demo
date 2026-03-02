"""Phase 7B API E2E tests — backend endpoints and CRUD operations.

Covers:
- Phase 7B API endpoints (date range, domain values, match patterns, score templates,
  dry run, validation, use cases, submissions, AI calc, versions)
- CRUD cycle for use cases and submissions via API
"""
from playwright.sync_api import Page


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
