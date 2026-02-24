"""Tests for Regulatory Traceability API — registry, coverage, and graph endpoints."""
import json

import pytest
from fastapi.testclient import TestClient

from backend.db import DuckDBManager
from backend.main import app
from backend.services.metadata_service import MetadataService


@pytest.fixture
def reg_workspace(tmp_path):
    """Workspace with a minimal regulation registry, one calc, and one model."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/settings/thresholds",
        "metadata/detection_models",
        "metadata/regulations",
    ]:
        (ws / d).mkdir(parents=True)

    # Minimal registry: 1 regulation (MAR) with 2 articles
    registry = {
        "regulations": [
            {
                "id": "mar",
                "name": "MAR",
                "full_name": "EU Regulation 596/2014 (MAR)",
                "jurisdiction": "EU",
                "articles": [
                    {
                        "id": "mar_12_1_a",
                        "article": "Art. 12(1)(a)",
                        "title": "Wash Trading",
                        "description": "False or misleading signals",
                        "detection_pattern": "wash_trading",
                    },
                    {
                        "id": "mar_14",
                        "article": "Art. 14",
                        "title": "Insider Dealing",
                        "description": "Prohibition of insider dealing",
                        "detection_pattern": "insider_dealing",
                    },
                ],
            }
        ]
    }
    (ws / "metadata/regulations/registry.json").write_text(json.dumps(registry, indent=2))

    # One calculation with regulatory_tags
    calc = {
        "calc_id": "test_calc",
        "name": "Test Calculation",
        "layer": "transaction",
        "description": "A test calc",
        "logic": "SELECT 1",
        "value_field": "v",
        "storage": "calc_test",
        "depends_on": [],
        "inputs": [{"source_type": "entity", "entity_id": "execution", "fields": ["value"]}],
        "regulatory_tags": ["MAR Art. 12(1)(a)"],
    }
    (ws / "metadata/calculations/transaction/test_calc.json").write_text(
        json.dumps(calc, indent=2)
    )

    # One setting for the model
    setting = {
        "setting_id": "test_threshold",
        "name": "Test Threshold",
        "value_type": "decimal",
        "default": 10,
    }
    (ws / "metadata/settings/thresholds/test_threshold.json").write_text(
        json.dumps(setting, indent=2)
    )

    # One detection model that covers Art. 12(1)(a) but NOT Art. 14
    model = {
        "model_id": "test_model",
        "name": "Test Model",
        "description": "Covers wash trading",
        "time_window": "business_date",
        "granularity": ["product_id"],
        "calculations": [{"calc_id": "test_calc", "strictness": "MUST_PASS"}],
        "score_threshold_setting": "test_threshold",
        "regulatory_coverage": [
            {
                "regulation": "MAR",
                "article": "Art. 12(1)(a)",
                "description": "Wash trading detection",
            }
        ],
    }
    (ws / "metadata/detection_models/test_model.json").write_text(
        json.dumps(model, indent=2)
    )

    return ws


@pytest.fixture
def reg_client(reg_workspace, monkeypatch):
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", reg_workspace)

    db = DuckDBManager()
    db.connect(":memory:")
    app.state.db = db
    app.state.metadata = MetadataService(reg_workspace)

    try:
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc
    finally:
        db.close()


# -- Regulation Registry --


class TestRegulationRegistry:
    def test_get_registry(self, reg_client):
        """GET /api/metadata/regulatory/registry returns 200 with regulations."""
        resp = reg_client.get("/api/metadata/regulatory/registry")
        assert resp.status_code == 200
        data = resp.json()
        assert "regulations" in data
        assert len(data["regulations"]) >= 1

    def test_registry_has_articles(self, reg_client):
        """Registry contains the expected 2 articles."""
        resp = reg_client.get("/api/metadata/regulatory/registry")
        data = resp.json()
        mar = data["regulations"][0]
        assert mar["name"] == "MAR"
        assert len(mar["articles"]) == 2


# -- Regulatory Coverage --


class TestRegulatoryCoverage:
    def test_coverage_endpoint(self, reg_client):
        """GET /api/metadata/regulatory/coverage returns 200 with coverage_summary."""
        resp = reg_client.get("/api/metadata/regulatory/coverage")
        assert resp.status_code == 200
        data = resp.json()
        assert "coverage_summary" in data

    def test_coverage_summary(self, reg_client):
        """Coverage summary: 2 total, 1 covered, 1 uncovered, 50% coverage."""
        resp = reg_client.get("/api/metadata/regulatory/coverage")
        summary = resp.json()["coverage_summary"]
        assert summary["total_articles"] == 2
        assert summary["covered"] == 1
        assert summary["uncovered"] == 1
        assert summary["coverage_pct"] == 50.0

    def test_models_by_article(self, reg_client):
        """MAR Art. 12(1)(a) is mapped to test_model."""
        resp = reg_client.get("/api/metadata/regulatory/coverage")
        models_by_article = resp.json()["models_by_article"]
        assert "MAR Art. 12(1)(a)" in models_by_article
        assert "test_model" in models_by_article["MAR Art. 12(1)(a)"]


# -- Traceability Graph --


class TestTraceabilityGraph:
    def test_graph_endpoint(self, reg_client):
        """GET /api/metadata/regulatory/traceability-graph returns 200 with nodes/edges/summary."""
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data
        assert "summary" in data

    def test_graph_has_all_node_types(self, reg_client):
        """Graph contains regulation, article, detection_model, and calculation node types."""
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        nodes = resp.json()["nodes"]
        node_types = {n["type"] for n in nodes}
        assert "regulation" in node_types
        assert "article" in node_types
        assert "detection_model" in node_types
        assert "calculation" in node_types

    def test_graph_edges_connect_layers(self, reg_client):
        """Graph has contains, detected_by, and uses_calc edge types."""
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        edges = resp.json()["edges"]
        edge_types = {e["type"] for e in edges}
        assert "contains" in edge_types
        assert "detected_by" in edge_types
        assert "uses_calc" in edge_types

    def test_uncovered_article_flagged(self, reg_client):
        """Art. 14 (uncovered) node has covered=false."""
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        nodes = resp.json()["nodes"]
        art14_nodes = [n for n in nodes if n["type"] == "article" and "Art. 14" in n["label"]]
        assert len(art14_nodes) == 1
        assert art14_nodes[0]["covered"] is False


# -- Suggestions --


class TestSuggestions:
    def test_suggestions_endpoint(self, reg_client):
        """GET /api/metadata/regulatory/suggestions returns 200 with expected keys."""
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        assert resp.status_code == 200
        data = resp.json()
        assert "gaps" in data
        assert "improvements" in data
        assert "unused_calcs" in data
        assert "summary" in data

    def test_uncovered_article_appears_as_gap(self, reg_client):
        """Art. 14 (uncovered) appears in the gaps list."""
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        gaps = resp.json()["gaps"]
        assert any(g["article"] == "Art. 14" for g in gaps)

    def test_gap_has_suggestion_text(self, reg_client):
        """Every gap entry includes meaningful suggestion text."""
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        gaps = resp.json()["gaps"]
        for gap in gaps:
            assert "suggestion" in gap
            assert len(gap["suggestion"]) > 10

    def test_summary_counts(self, reg_client):
        """Summary counts match expected values for the fixture data."""
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        summary = resp.json()["summary"]
        assert summary["gap_count"] == 1
        assert isinstance(summary["total_suggestions"], int)
