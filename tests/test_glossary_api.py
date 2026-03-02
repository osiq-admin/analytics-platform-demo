"""Tests for Glossary REST API — terms, metrics, DMBOK, standards, entity gaps."""

import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    # Required metadata directories for app startup
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
        "metadata/governance",
        "metadata/_audit",
        "metadata/glossary",
        "metadata/semantic",
        "metadata/dmbok",
        "data/csv",
        "data/parquet",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    # Governance: masking policies (required by app)
    (ws / "metadata" / "governance" / "masking_policies.json").write_text(
        json.dumps({"version": "1.0", "policies": []})
    )
    # Governance: roles (required by app)
    (ws / "metadata" / "governance" / "roles.json").write_text(
        json.dumps({
            "version": "1.0",
            "default_role": "analyst",
            "roles": [
                {
                    "role_id": "analyst",
                    "display_name": "Analyst",
                    "description": "Default",
                    "icon": "Eye",
                    "tier_access": ["gold"],
                    "classification_access": ["LOW"],
                    "can_export": False,
                    "can_view_audit": False,
                },
            ],
        })
    )

    # Glossary terms
    (ws / "metadata" / "glossary" / "terms.json").write_text(
        json.dumps({
            "glossary_id": "test",
            "version": "1.0",
            "terms": [
                {
                    "term_id": "wash_trade",
                    "business_name": "Wash Trade",
                    "definition": "Same owner both sides of trade.",
                    "category": "market_abuse",
                    "domain": "surveillance",
                    "status": "approved",
                    "owner": "compliance",
                    "steward": "team_a",
                    "synonyms": ["self-dealing"],
                    "technical_mappings": [
                        {"entity": "execution", "field": "trader_id", "relationship": "key_field"},
                    ],
                },
                {
                    "term_id": "spoofing",
                    "business_name": "Spoofing",
                    "definition": "Placing orders with intent to cancel.",
                    "category": "market_abuse",
                    "domain": "surveillance",
                    "status": "approved",
                    "owner": "compliance",
                    "steward": "team_a",
                    "synonyms": [],
                    "technical_mappings": [],
                },
            ],
        })
    )

    # Glossary categories
    (ws / "metadata" / "glossary" / "categories.json").write_text(
        json.dumps({
            "categories": [
                {"category_id": "market_abuse", "display_name": "Market Abuse", "icon": "AlertTriangle", "order": 1},
            ]
        })
    )

    # Semantic metrics
    (ws / "metadata" / "semantic" / "metrics.json").write_text(
        json.dumps({
            "semantic_id": "test",
            "version": "1.0",
            "metrics": [
                {
                    "metric_id": "daily_alert_rate",
                    "business_name": "Daily Alert Rate",
                    "definition": "Alerts per day.",
                    "source_tier": "platinum",
                    "dimensions": ["asset_class"],
                },
                {
                    "metric_id": "quality_score",
                    "business_name": "Quality Score",
                    "definition": "Overall quality.",
                    "source_tier": "gold",
                    "dimensions": [],
                },
            ],
        })
    )

    # Semantic dimensions
    (ws / "metadata" / "semantic" / "dimensions.json").write_text(
        json.dumps({
            "dimensions": [
                {
                    "dimension_id": "asset_class",
                    "business_name": "Asset Class",
                    "source_entity": "product",
                    "source_field": "asset_class",
                },
            ],
        })
    )

    # DMBOK coverage
    (ws / "metadata" / "dmbok" / "coverage.json").write_text(
        json.dumps({
            "dmbok_id": "test",
            "version": "1.0",
            "knowledge_areas": [
                {"area_id": f"area_{i}", "name": f"Area {i}", "coverage": "high", "platform_capabilities": []}
                for i in range(1, 12)
            ],
        })
    )

    # Standards compliance registry
    (ws / "metadata" / "standards" / "compliance_registry.json").write_text(
        json.dumps({
            "registry_id": "test",
            "standards": [
                {"standard_id": "iso_6166", "name": "ISO 6166", "compliance_level": "full"},
                {"standard_id": "iso_11179", "name": "ISO 11179", "compliance_level": "full"},
            ],
            "gap_standards": [
                {"standard_id": "iso_17442", "name": "ISO 17442", "compliance_level": "not_implemented"},
            ],
        })
    )

    # Entity gaps
    (ws / "metadata" / "glossary" / "entity_gaps.json").write_text(
        json.dumps({
            "gap_analysis_id": "test",
            "entities": [
                {"entity_id": "product", "current_field_count": 18, "gaps": [{"field_name": "lei_issuer"}]},
                {"entity_id": "execution", "current_field_count": 13, "gaps": []},
                {"entity_id": "order", "current_field_count": 15, "gaps": []},
                {"entity_id": "account", "current_field_count": 10, "gaps": []},
                {"entity_id": "trader", "current_field_count": 6, "gaps": []},
                {"entity_id": "venue", "current_field_count": 8, "gaps": []},
                {"entity_id": "md_eod", "current_field_count": 10, "gaps": []},
                {"entity_id": "md_intraday", "current_field_count": 8, "gaps": []},
            ],
        })
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Terms
# ---------------------------------------------------------------------------


def test_list_terms_200(client):
    resp = client.get("/api/glossary/terms")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2


def test_list_terms_filter_category(client):
    resp = client.get("/api/glossary/terms?category=market_abuse")
    assert resp.status_code == 200
    assert resp.json()["count"] == 2


def test_list_terms_search(client):
    resp = client.get("/api/glossary/terms?search=wash")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 1
    assert data["terms"][0]["term_id"] == "wash_trade"


def test_get_term_200(client):
    resp = client.get("/api/glossary/terms/wash_trade")
    assert resp.status_code == 200
    assert resp.json()["business_name"] == "Wash Trade"


def test_get_term_404(client):
    resp = client.get("/api/glossary/terms/nonexistent")
    assert resp.status_code == 404


def test_update_term_200(client):
    resp = client.put("/api/glossary/terms/wash_trade", json={"definition": "Updated."})
    assert resp.status_code == 200
    assert resp.json()["definition"] == "Updated."


# ---------------------------------------------------------------------------
# Reverse lookup
# ---------------------------------------------------------------------------


def test_reverse_lookup_200(client):
    resp = client.get("/api/glossary/field/execution/trader_id")
    assert resp.status_code == 200
    assert resp.json()["count"] == 1


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


def test_summary_200(client):
    resp = client.get("/api/glossary/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["glossary"]["total_terms"] == 2
    assert data["semantic"]["total_metrics"] == 2


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


def test_list_metrics_200(client):
    resp = client.get("/api/glossary/metrics")
    assert resp.status_code == 200
    assert resp.json()["count"] == 2


def test_get_metric_404(client):
    resp = client.get("/api/glossary/metrics/nonexistent")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DMBOK
# ---------------------------------------------------------------------------


def test_dmbok_coverage_200(client):
    resp = client.get("/api/glossary/dmbok")
    assert resp.status_code == 200
    assert len(resp.json()["knowledge_areas"]) == 11


def test_dmbok_knowledge_areas_count_11(client):
    resp = client.get("/api/glossary/dmbok")
    areas = resp.json()["knowledge_areas"]
    assert all(a["coverage"] in ("high", "medium", "low") for a in areas)


# ---------------------------------------------------------------------------
# Standards
# ---------------------------------------------------------------------------


def test_standards_registry_200(client):
    resp = client.get("/api/glossary/standards")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["standards"]) == 2
    assert len(data["gap_standards"]) == 1


# ---------------------------------------------------------------------------
# Entity gaps
# ---------------------------------------------------------------------------


def test_entity_gaps_200(client):
    resp = client.get("/api/glossary/entity-gaps")
    assert resp.status_code == 200
    assert len(resp.json()["entities"]) == 8
