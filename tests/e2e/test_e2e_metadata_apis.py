"""E2E tests for metadata API endpoints (M151-M164).

Covers:
- Standards registries: ISO, FIX protocol, compliance requirements
- Grid column configurations: data_manager, risk_case_manager, related_executions, related_orders
- View configurations: entity_designer, model_composer
- Theme palettes: default palette with chart, asset class, and graph node colors
"""
import pytest
from playwright.sync_api import Page


# ============================================================================
# Standards Registries (M151-M152)
# ============================================================================

class TestStandardsMetadataE2E:
    """Test ISO, FIX, and compliance standards API endpoints."""

    def test_iso_registry_returns_data(self, loaded_page: Page):
        """GET /api/metadata/standards/iso returns ISO registry with mappings."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/standards/iso');
            return await resp.json();
        }""")
        assert data["registry_id"] == "iso_standards"
        assert "iso_mappings" in data
        assert len(data["iso_mappings"]) >= 5
        # Verify first mapping has expected structure
        mapping = data["iso_mappings"][0]
        assert "iso_standard" in mapping
        assert "standard_name" in mapping
        assert "field_path" in mapping
        assert "entities_using" in mapping
        assert "validation_rules" in mapping

    def test_iso_registry_has_known_standards(self, loaded_page: Page):
        """ISO registry should include well-known standards like ISO 6166 (ISIN)."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/standards/iso');
            return await resp.json();
        }""")
        standard_codes = [m["iso_standard"] for m in data["iso_mappings"]]
        assert "ISO 6166" in standard_codes  # ISIN
        assert "ISO 10383" in standard_codes  # MIC
        assert "ISO 10962" in standard_codes  # CFI

    def test_fix_registry_returns_data(self, loaded_page: Page):
        """GET /api/metadata/standards/fix returns FIX protocol fields."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/standards/fix');
            return await resp.json();
        }""")
        assert data["registry_id"] == "fix_protocol"
        assert "fix_fields" in data
        assert len(data["fix_fields"]) >= 5
        # Verify FIX field structure
        field = data["fix_fields"][0]
        assert "field_number" in field
        assert "field_name" in field
        assert "domain_values" in field
        assert "entities_using" in field

    def test_fix_registry_has_known_fields(self, loaded_page: Page):
        """FIX registry should include known fields like OrdType (40) and Side (54)."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/standards/fix');
            return await resp.json();
        }""")
        field_names = [f["field_name"] for f in data["fix_fields"]]
        assert "OrdType" in field_names
        assert "Side" in field_names
        assert "ExecType" in field_names

    def test_compliance_requirements_returns_data(self, loaded_page: Page):
        """GET /api/metadata/standards/compliance returns compliance requirements."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/standards/compliance');
            return await resp.json();
        }""")
        assert data["registry_id"] == "compliance_requirements"
        assert "requirements" in data
        assert len(data["requirements"]) >= 10
        # Verify requirement structure
        req = data["requirements"][0]
        assert "requirement_id" in req
        assert "regulation" in req
        assert "article" in req
        assert "requirement_text" in req
        assert "status" in req

    def test_compliance_covers_multiple_regulations(self, loaded_page: Page):
        """Compliance requirements should span MAR, MiFID II, Dodd-Frank, FINRA, EMIR, SEC."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/standards/compliance');
            return await resp.json();
        }""")
        regulations = {r["regulation"] for r in data["requirements"]}
        assert "MAR" in regulations
        assert "MiFID II" in regulations
        assert "Dodd-Frank" in regulations


# ============================================================================
# Grid Column Configurations (M159-M161)
# ============================================================================

class TestGridMetadataE2E:
    """Test grid column metadata API endpoints."""

    def test_data_manager_grid(self, loaded_page: Page):
        """GET /api/metadata/grids/data_manager returns 2 columns."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/grids/data_manager');
            return await resp.json();
        }""")
        assert data["view_id"] == "data_manager"
        assert len(data["columns"]) == 2
        fields = [c["field"] for c in data["columns"]]
        assert "name" in fields
        assert "type" in fields

    def test_risk_case_manager_grid(self, loaded_page: Page):
        """GET /api/metadata/grids/risk_case_manager returns 8 columns."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/grids/risk_case_manager');
            return await resp.json();
        }""")
        assert data["view_id"] == "risk_case_manager"
        assert len(data["columns"]) == 8
        fields = [c["field"] for c in data["columns"]]
        assert "alert_id" in fields
        assert "model_id" in fields
        assert "accumulated_score" in fields
        assert "timestamp" in fields

    def test_related_executions_grid(self, loaded_page: Page):
        """GET /api/metadata/grids/related_executions returns 12 columns."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/grids/related_executions');
            return await resp.json();
        }""")
        assert data["view_id"] == "related_executions"
        assert len(data["columns"]) == 12
        fields = [c["field"] for c in data["columns"]]
        assert "execution_id" in fields
        assert "order_id" in fields
        assert "side" in fields
        assert "price" in fields

    def test_related_orders_grid(self, loaded_page: Page):
        """GET /api/metadata/grids/related_orders returns 11 columns."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/grids/related_orders');
            return await resp.json();
        }""")
        assert data["view_id"] == "related_orders"
        assert len(data["columns"]) == 11
        fields = [c["field"] for c in data["columns"]]
        assert "order_id" in fields
        assert "side" in fields
        assert "order_type" in fields
        assert "trader_id" in fields

    def test_grid_columns_have_required_fields(self, loaded_page: Page):
        """Every grid column should have at minimum 'field' and 'header_name'."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/grids/risk_case_manager');
            return await resp.json();
        }""")
        for col in data["columns"]:
            assert "field" in col, f"Column missing 'field': {col}"
            assert "header_name" in col, f"Column missing 'header_name': {col}"

    def test_nonexistent_grid_returns_404(self, loaded_page: Page):
        """GET /api/metadata/grids/nonexistent should return 404."""
        status = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/grids/nonexistent');
            return resp.status;
        }""")
        assert status == 404


# ============================================================================
# View Configurations (M163)
# ============================================================================

class TestViewConfigE2E:
    """Test view configuration API endpoints."""

    def test_entity_designer_config(self, loaded_page: Page):
        """GET /api/metadata/view_config/entity_designer returns 2 tabs."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/view_config/entity_designer');
            return await resp.json();
        }""")
        assert data["view_id"] == "entity_designer"
        assert len(data["tabs"]) == 2
        tab_ids = [t["id"] for t in data["tabs"]]
        assert "details" in tab_ids
        assert "relationships" in tab_ids

    def test_model_composer_config(self, loaded_page: Page):
        """GET /api/metadata/view_config/model_composer returns 3 tabs."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/view_config/model_composer');
            return await resp.json();
        }""")
        assert data["view_id"] == "model_composer"
        assert len(data["tabs"]) == 3
        tab_ids = [t["id"] for t in data["tabs"]]
        assert "validation" in tab_ids
        assert "preview" in tab_ids
        assert "dependencies" in tab_ids

    def test_view_config_tabs_have_labels(self, loaded_page: Page):
        """Every tab in a view config should have id, label, and icon."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/view_config/entity_designer');
            return await resp.json();
        }""")
        for tab in data["tabs"]:
            assert "id" in tab
            assert "label" in tab
            assert "icon" in tab

    def test_nonexistent_view_config_returns_404(self, loaded_page: Page):
        """GET /api/metadata/view_config/nonexistent should return 404."""
        status = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/view_config/nonexistent');
            return resp.status;
        }""")
        assert status == 404


# ============================================================================
# Theme Palettes (M164)
# ============================================================================

class TestThemePaletteE2E:
    """Test theme palette API endpoints."""

    def test_default_palette_loads(self, loaded_page: Page):
        """GET /api/metadata/theme/palettes/default returns default palette."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/theme/palettes/default');
            return await resp.json();
        }""")
        assert data["palette_id"] == "default"
        assert "chart_colors" in data
        assert len(data["chart_colors"]) >= 5

    def test_palette_has_asset_class_colors(self, loaded_page: Page):
        """Default palette should include asset class color mappings."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/theme/palettes/default');
            return await resp.json();
        }""")
        assert "asset_class_colors" in data
        assert "equity" in data["asset_class_colors"]
        assert "fx" in data["asset_class_colors"]
        assert "commodity" in data["asset_class_colors"]

    def test_palette_has_graph_node_colors(self, loaded_page: Page):
        """Default palette should include graph node color mappings."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/theme/palettes/default');
            return await resp.json();
        }""")
        assert "graph_node_colors" in data
        assert "regulation" in data["graph_node_colors"]
        assert "detection_model" in data["graph_node_colors"]
        assert "calculation" in data["graph_node_colors"]

    def test_palette_has_layer_badge_variants(self, loaded_page: Page):
        """Default palette should include layer badge variant mappings."""
        data = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/theme/palettes/default');
            return await resp.json();
        }""")
        assert "layer_badge_variants" in data
        assert "oob" in data["layer_badge_variants"]
        assert "user" in data["layer_badge_variants"]

    def test_nonexistent_palette_returns_404(self, loaded_page: Page):
        """GET /api/metadata/theme/palettes/nonexistent should return 404."""
        status = loaded_page.evaluate("""async () => {
            const resp = await fetch('/api/metadata/theme/palettes/nonexistent');
            return resp.status;
        }""")
        assert status == 404
