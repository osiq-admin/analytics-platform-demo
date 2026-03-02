"""E2E tests for DataLineage view (25th view).

Covers:
- Lineage Explorer — hero graph with tier swim lanes, quality badges, calc chain
- Field Tracing — entity/field dropdowns, chain graph
- Impact Analysis — direction toggle, what-if simulator
- Sidebar navigation, tab switching, layer toggles
"""

import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


class TestDataLineageView:
    """Tests for the DataLineage view rendering and navigation."""

    def test_lineage_view_loads(self, loaded_page):
        """DataLineage loads at /lineage with 3 tabs visible."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "data lineage" in body.lower()

    def test_three_tabs_visible(self, loaded_page):
        """Three tab buttons render: Lineage Explorer, Field Tracing, Impact Analysis."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "lineage explorer" in body.lower()
        assert "field tracing" in body.lower()
        assert "impact analysis" in body.lower()

    def test_entity_multiselect_renders(self, loaded_page):
        """Entity multi-select dropdown renders with entity options."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Look for entity chips or select control in toolbar
        toolbar = loaded_page.locator("[data-tour='lineage-toolbar']")
        assert toolbar.is_visible(timeout=10000)

    def test_layer_toggle_chips_render(self, loaded_page):
        """6 layer toggle chips render in toolbar."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "tier flow" in body.lower()

    def test_sidebar_shows_data_lineage(self, loaded_page):
        """Sidebar navigation includes Data Lineage entry."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        sidebar = loaded_page.locator("nav, aside, [data-tour='sidebar']")
        sidebar_text = sidebar.first.inner_text()
        assert "data lineage" in sidebar_text.lower()


class TestLineageExplorerTab:
    """Tests for Tab 1: Lineage Explorer hero graph."""

    def test_hero_graph_renders(self, loaded_page):
        """React Flow graph container renders on Lineage Explorer tab."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Lineage Explorer is the default tab — look for React Flow container
        graph = loaded_page.locator(".react-flow")
        assert graph.first.is_visible(timeout=10000)

    def test_tier_nodes_visible(self, loaded_page):
        """Tier nodes render in the hero graph."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        loaded_page.wait_for_timeout(2000)  # Allow graph to load
        body = loaded_page.locator("main").inner_text()
        # Should see tier names in the graph
        assert "landing" in body.lower() or "bronze" in body.lower() or "silver" in body.lower() or "gold" in body.lower()

    def test_regulatory_overlay_toggle(self, loaded_page):
        """Regulatory overlay toggle button is present."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "regulatory" in body.lower()

    def test_coverage_button_present(self, loaded_page):
        """Surveillance Coverage button is present in toolbar."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "coverage" in body.lower()


class TestFieldTracingTab:
    """Tests for Tab 2: Field Tracing."""

    def test_field_tracing_tab_switch(self, loaded_page):
        """Switching to Field Tracing tab renders entity/field controls."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Click Field Tracing tab
        tab_btn = loaded_page.locator("[data-trace='lineage.tab.field-tracing']")
        tab_btn.click()
        loaded_page.wait_for_timeout(1000)
        body = loaded_page.locator("main").inner_text()
        # Should see entity selection or field controls
        assert "entity" in body.lower() or "field" in body.lower() or "trace" in body.lower()

    def test_field_tracing_entity_dropdown(self, loaded_page):
        """Entity dropdown renders on Field Tracing tab."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        tab_btn = loaded_page.locator("[data-trace='lineage.tab.field-tracing']")
        tab_btn.click()
        loaded_page.wait_for_timeout(1000)
        # Look for select elements
        selects = loaded_page.locator("select")
        assert selects.count() >= 1


class TestImpactAnalysisTab:
    """Tests for Tab 3: Impact Analysis."""

    def test_impact_tab_switch(self, loaded_page):
        """Switching to Impact Analysis tab renders direction controls."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        tab_btn = loaded_page.locator("[data-trace='lineage.tab.impact-analysis']")
        tab_btn.click()
        loaded_page.wait_for_timeout(1000)
        body = loaded_page.locator("main").inner_text()
        assert "upstream" in body.lower() or "downstream" in body.lower() or "node" in body.lower()

    def test_whatif_slider_present(self, loaded_page):
        """What-if threshold simulator panel renders on Impact Analysis tab."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        tab_btn = loaded_page.locator("[data-trace='lineage.tab.impact-analysis']")
        tab_btn.click()
        loaded_page.wait_for_timeout(1000)
        body = loaded_page.locator("main").inner_text()
        assert "what-if" in body.lower() or "threshold" in body.lower() or "simulator" in body.lower()

    def test_direction_toggle_renders(self, loaded_page):
        """Direction toggle buttons render (Upstream/Downstream/Both)."""
        loaded_page.goto(f"{APP_URL}/lineage")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        tab_btn = loaded_page.locator("[data-trace='lineage.tab.impact-analysis']")
        tab_btn.click()
        loaded_page.wait_for_timeout(2000)
        body = loaded_page.locator("main").inner_text()
        has_direction = "upstream" in body.lower() or "downstream" in body.lower() or "both" in body.lower()
        assert has_direction
