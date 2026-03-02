"""Tests for the Lineage graph REST API (backend/api/lineage.py)."""
import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace with enough metadata for the lineage engine to build."""
    ws = tmp_path / "workspace"
    # Required base dirs for app startup
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/calculations/time_windows",
        "metadata/calculations/derived",
        "metadata/calculations/aggregations",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/settings/score_thresholds",
        "metadata/detection_models",
        "metadata/navigation",
        "metadata/widgets",
        "metadata/format_rules",
        "metadata/query_presets",
        "metadata/grids",
        "metadata/view_config",
        "metadata/theme",
        "metadata/workflows",
        "metadata/demo",
        "metadata/tours",
        "metadata/standards/iso",
        "metadata/standards/fix",
        "metadata/standards/compliance",
        "metadata/mappings",
        "metadata/regulations",
        "metadata/match_patterns",
        "metadata/score_templates",
        "metadata/medallion",
        "metadata/quality",
        "metadata/reference",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    # Required data dirs
    (ws / "data" / "csv").mkdir(parents=True, exist_ok=True)
    (ws / "data" / "parquet").mkdir(parents=True, exist_ok=True)
    (ws / "results").mkdir(parents=True, exist_ok=True)
    (ws / "alerts" / "traces").mkdir(parents=True, exist_ok=True)

    # Lineage runs dir
    (ws / "lineage" / "runs").mkdir(parents=True, exist_ok=True)

    # Minimal entity for lineage to index
    (ws / "metadata" / "entities" / "order.json").write_text(
        json.dumps({
            "entity_id": "order",
            "name": "Order",
            "fields": [
                {"name": "order_id", "type": "string", "description": "PK"},
                {"name": "trader_id", "type": "string", "description": "FK"},
            ],
            "relationships": [
                {"target": "trader", "type": "many_to_one", "join_key": "trader_id"}
            ],
        })
    )

    # Minimal detection model (calculations must be list of dicts)
    (ws / "metadata" / "detection_models" / "mpr.json").write_text(
        json.dumps({
            "model_id": "mpr",
            "name": "Market Price Relevance",
            "time_window": "1d",
            "granularity": ["product_id"],
            "calculations": [
                {"calc_id": "trade_volume_ratio", "strictness": "MUST_PASS",
                 "threshold_setting": "mpr_score_threshold",
                 "score_steps_setting": None, "value_field": "trade_volume_ratio"},
            ],
            "score_threshold_setting": "mpr_score_threshold",
            "regulatory_coverage": [
                {"regulation": "MAR", "article": "Art. 12(1)(b)"}
            ],
        })
    )

    # Minimal calculation (inputs must be dicts, not strings)
    (ws / "metadata" / "calculations" / "transaction" / "trade_volume_ratio.json").write_text(
        json.dumps({
            "calc_id": "trade_volume_ratio",
            "name": "Trade Volume Ratio",
            "layer": "transaction",
            "inputs": [
                {"source_type": "entity", "entity_id": "execution", "fields": ["quantity"]},
                {"source_type": "entity", "entity_id": "md_eod", "fields": ["total_volume"]},
            ],
            "output": {"table_name": "calc_trade_volume_ratio", "fields": [
                {"name": "trade_volume_ratio", "type": "decimal"}
            ]},
            "logic": "SELECT 1",
            "depends_on": [],
        })
    )

    # Minimal setting
    (ws / "metadata" / "settings" / "thresholds" / "mpr_score_threshold.json").write_text(
        json.dumps({
            "setting_id": "mpr_score_threshold",
            "name": "MPR Score Threshold",
            "default": 30.0,
        })
    )

    # Medallion tiers
    (ws / "metadata" / "medallion" / "tiers.json").write_text(
        json.dumps({
            "tiers": [
                {"tier_id": "bronze", "name": "Bronze", "tier_number": 1},
                {"tier_id": "silver", "name": "Silver", "tier_number": 2},
                {"tier_id": "gold", "name": "Gold", "tier_number": 3},
            ]
        })
    )

    # Pipeline stages
    (ws / "metadata" / "medallion" / "pipeline_stages.json").write_text(
        json.dumps({
            "stages": [
                {"stage_id": "bronze_ingest", "name": "Bronze Ingest", "order": 1,
                 "source_tier": "landing", "target_tier": "bronze", "entity": "order"},
                {"stage_id": "silver_clean", "name": "Silver Clean", "order": 2,
                 "source_tier": "bronze", "target_tier": "silver", "entity": "order"},
            ]
        })
    )

    # Quality dimensions (for overlay)
    (ws / "metadata" / "quality" / "dimensions.json").write_text(
        json.dumps({
            "dimensions": [
                {"id": "completeness", "name": "Completeness"},
                {"id": "accuracy", "name": "Accuracy"},
            ]
        })
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


# ---------------------------------------------------------------------------
# Tier Lineage API
# ---------------------------------------------------------------------------


class TestTierLineageAPI:
    def test_full_tier_graph(self, client):
        """GET /api/lineage/tiers returns a lineage graph."""
        r = client.get("/api/lineage/tiers")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data
        assert "total_nodes" in data

    def test_entity_tier_lineage(self, client):
        """GET /api/lineage/tiers/order returns tier flow for 'order'."""
        r = client.get("/api/lineage/tiers/order")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data

    def test_quality_overlay(self, client):
        """GET /api/lineage/tiers/order/quality returns quality scores."""
        r = client.get("/api/lineage/tiers/order/quality")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)


# ---------------------------------------------------------------------------
# Field Lineage API
# ---------------------------------------------------------------------------


class TestFieldLineageAPI:
    def test_field_lineage(self, client):
        """GET /api/lineage/fields/order returns field traces."""
        r = client.get("/api/lineage/fields/order")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trace_single_field(self, client):
        """GET /api/lineage/fields/order/order_id returns a trace."""
        r = client.get("/api/lineage/fields/order/order_id")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "order"
        assert data["field"] == "order_id"

    def test_tier_transitions(self, client):
        """GET /api/lineage/fields/order/transitions returns column lineage."""
        r = client.get(
            "/api/lineage/fields/order/transitions",
            params={"source_tier": "bronze", "target_tier": "silver"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------------------------------------------------------------------
# Calc Chain API
# ---------------------------------------------------------------------------


class TestCalcLineageAPI:
    def test_calc_lineage(self, client):
        """GET /api/lineage/calculations returns calc dependency graph."""
        r = client.get("/api/lineage/calculations")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data

    def test_model_lineage(self, client):
        """GET /api/lineage/calculations/model/mpr returns model subgraph."""
        r = client.get("/api/lineage/calculations/model/mpr")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data


# ---------------------------------------------------------------------------
# Impact Analysis API
# ---------------------------------------------------------------------------


class TestImpactAPI:
    def test_impact_analysis(self, client):
        """GET /api/lineage/impact/{node_id} returns BFS results."""
        r = client.get("/api/lineage/impact/setting:setting:mpr_score_threshold:global")
        assert r.status_code == 200
        data = r.json()
        assert "origin" in data
        assert "direction" in data
        assert "affected_nodes" in data

    def test_impact_with_direction(self, client):
        """GET /api/lineage/impact/{node_id}?direction=downstream works."""
        r = client.get(
            "/api/lineage/impact/setting:setting:mpr_score_threshold:global",
            params={"direction": "downstream"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["direction"] == "downstream"

    def test_alert_lineage(self, client):
        """GET /api/lineage/alert/{alert_id} returns a graph (possibly empty)."""
        r = client.get("/api/lineage/alert/ALERT-FAKE-001")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data


# ---------------------------------------------------------------------------
# Settings Impact API
# ---------------------------------------------------------------------------


class TestSettingsAPI:
    def test_setting_impact(self, client):
        """GET /api/lineage/settings/{setting_id}/impact returns subgraph."""
        r = client.get("/api/lineage/settings/mpr_score_threshold/impact")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data

    def test_threshold_preview(self, client):
        """POST /api/lineage/settings/preview returns impact estimate."""
        r = client.post(
            "/api/lineage/settings/preview",
            json={
                "setting_id": "mpr_score_threshold",
                "parameter": "default",
                "proposed_value": 25.0,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["setting_id"] == "mpr_score_threshold"
        assert "current_value" in data
        assert "proposed_value" in data
        assert "delta" in data


# ---------------------------------------------------------------------------
# Surveillance Coverage API
# ---------------------------------------------------------------------------


class TestCoverageAPI:
    def test_coverage(self, client):
        """GET /api/lineage/coverage returns coverage matrix."""
        r = client.get("/api/lineage/coverage")
        assert r.status_code == 200
        data = r.json()
        assert "cells" in data
        assert "products" in data


# ---------------------------------------------------------------------------
# Pipeline Runs API
# ---------------------------------------------------------------------------


class TestRunsAPI:
    def test_runs_empty(self, client):
        """GET /api/lineage/runs returns empty list when no runs exist."""
        r = client.get("/api/lineage/runs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_runs_filter_by_job(self, client):
        """GET /api/lineage/runs?job_name=xyz returns filtered list."""
        r = client.get("/api/lineage/runs", params={"job_name": "nonexistent"})
        assert r.status_code == 200
        assert r.json() == []

    def test_run_not_found(self, client):
        """GET /api/lineage/runs/{run_id} returns 404 for unknown ID."""
        r = client.get("/api/lineage/runs/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404
        assert "error" in r.json()


# ---------------------------------------------------------------------------
# Unified Graph API
# ---------------------------------------------------------------------------


class TestUnifiedGraphAPI:
    def test_unified_graph_no_filters(self, client):
        """GET /api/lineage/graph returns full combined graph."""
        r = client.get("/api/lineage/graph")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data
        assert "layers" in data

    def test_unified_graph_entity_filter(self, client):
        """GET /api/lineage/graph?entities=order filters by entity."""
        r = client.get("/api/lineage/graph", params={"entities": "order"})
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data

    def test_unified_graph_layer_filter(self, client):
        """GET /api/lineage/graph?layers=tier_flow filters by layer."""
        r = client.get("/api/lineage/graph", params={"layers": "tier_flow"})
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
