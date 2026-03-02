"""Tests for SemanticLayerService — metric and dimension queries."""

import json

import pytest

from backend.services.semantic_service import SemanticLayerService


@pytest.fixture()
def workspace(tmp_path):
    """Create a minimal workspace with semantic metadata for testing."""
    semantic_dir = tmp_path / "metadata" / "semantic"
    semantic_dir.mkdir(parents=True)

    metrics = {
        "semantic_id": "test",
        "version": "1.0",
        "description": "Test metrics",
        "metrics": [
            {
                "metric_id": "daily_alert_rate",
                "business_name": "Daily Alert Rate",
                "definition": "Number of alerts generated per trading day.",
                "formula": "COUNT(alerts) / COUNT(DISTINCT business_date)",
                "source_tier": "platinum",
                "source_entities": ["alert_summary"],
                "unit": "alerts/day",
                "format": "0.1f",
                "dimensions": ["asset_class", "model"],
                "owner": "surveillance_team",
                "glossary_term_id": "alert_score",
                "bcbs239_principle": "timeliness",
            },
            {
                "metric_id": "wash_trade_rate",
                "business_name": "Wash Trade Detection Rate",
                "definition": "Percentage of executions flagged as potential wash trades.",
                "formula": "COUNT(wash_alerts) / COUNT(executions) * 100",
                "source_tier": "gold",
                "source_entities": ["execution", "alert_summary"],
                "unit": "%",
                "format": "0.2f",
                "dimensions": ["asset_class", "venue"],
                "owner": "surveillance_team",
                "glossary_term_id": "wash_trade",
                "bcbs239_principle": "accuracy",
            },
            {
                "metric_id": "overall_quality_score",
                "business_name": "Overall Data Quality Score",
                "definition": "Weighted average across all quality dimensions.",
                "formula": "AVG(dimension_scores)",
                "source_tier": "gold",
                "source_entities": ["quality_results"],
                "unit": "%",
                "format": "0.1f",
                "dimensions": ["business_date"],
                "owner": "data_management",
                "glossary_term_id": "overall_quality_score",
                "bcbs239_principle": "accuracy",
            },
        ],
    }

    dimensions = {
        "dimensions": [
            {
                "dimension_id": "asset_class",
                "business_name": "Asset Class",
                "definition": "Classification of financial instruments.",
                "source_entity": "product",
                "source_field": "asset_class",
                "values": ["equity", "fx", "fixed_income", "commodity", "derivative"],
                "glossary_term_id": "financial_product",
            },
            {
                "dimension_id": "model",
                "business_name": "Detection Model",
                "definition": "Surveillance detection model type.",
                "source_entity": "detection_model",
                "source_field": "model_id",
                "values": ["wash_trading", "spoofing", "insider_dealing"],
                "glossary_term_id": "",
            },
            {
                "dimension_id": "venue",
                "business_name": "Trading Venue",
                "definition": "The exchange or venue where trades occur.",
                "source_entity": "venue",
                "source_field": "mic",
                "values": ["XNYS", "XNAS", "XLON"],
                "glossary_term_id": "market_venue",
            },
        ],
    }

    (semantic_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (semantic_dir / "dimensions.json").write_text(json.dumps(dimensions, indent=2))
    return tmp_path


def test_list_metrics_all(workspace):
    svc = SemanticLayerService(workspace)
    metrics = svc.list_metrics()
    assert len(metrics) == 3


def test_list_metrics_filter_by_tier(workspace):
    svc = SemanticLayerService(workspace)
    metrics = svc.list_metrics(tier="gold")
    assert len(metrics) == 2
    assert all(m.source_tier == "gold" for m in metrics)


def test_get_metric_found(workspace):
    svc = SemanticLayerService(workspace)
    metric = svc.get_metric("daily_alert_rate")
    assert metric is not None
    assert metric.business_name == "Daily Alert Rate"


def test_get_metric_not_found(workspace):
    svc = SemanticLayerService(workspace)
    metric = svc.get_metric("nonexistent")
    assert metric is None


def test_list_dimensions(workspace):
    svc = SemanticLayerService(workspace)
    dims = svc.list_dimensions()
    assert len(dims) == 3


def test_get_dimension_found(workspace):
    svc = SemanticLayerService(workspace)
    dim = svc.get_dimension("asset_class")
    assert dim is not None
    assert dim.business_name == "Asset Class"


def test_get_metrics_by_dimension(workspace):
    svc = SemanticLayerService(workspace)
    metrics = svc.get_metrics_by_dimension("asset_class")
    assert len(metrics) == 2
    ids = {m.metric_id for m in metrics}
    assert ids == {"daily_alert_rate", "wash_trade_rate"}


def test_get_summary(workspace):
    svc = SemanticLayerService(workspace)
    summary = svc.get_summary()
    assert summary["total_metrics"] == 3
    assert summary["by_tier"]["gold"] == 2
    assert summary["by_tier"]["platinum"] == 1
    assert summary["total_dimensions"] == 3
