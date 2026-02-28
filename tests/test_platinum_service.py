"""Tests for PlatinumService — KPI generation engine."""
import json

import pytest

from backend.models.analytics_tiers import KPIDataset, KPIDefinition, PlatinumConfig
from backend.services.metadata_service import MetadataService
from backend.services.platinum_service import PlatinumService


# ── Fixtures ──


@pytest.fixture
def tmp_workspace(tmp_path):
    """Create a temporary workspace with platinum KPI definitions."""
    platinum_dir = tmp_path / "metadata" / "medallion" / "platinum"
    platinum_dir.mkdir(parents=True)

    definitions = [
        {
            "kpi_id": "alert_summary",
            "name": "Alert Summary",
            "description": "Aggregated alert counts",
            "category": "alert_summary",
            "sql_template": "SELECT model_id, asset_class, COUNT(*) FROM alerts GROUP BY 1, 2",
            "dimensions": [
                {"field": "model_id", "label": "Detection Model"},
                {"field": "asset_class", "label": "Asset Class"},
            ],
            "schedule": "daily",
            "source_tier": "gold",
            "output_format": "json",
        },
        {
            "kpi_id": "model_effectiveness",
            "name": "Model Effectiveness",
            "description": "Per-model trigger rates",
            "category": "model_effectiveness",
            "sql_template": "SELECT model_id, COUNT(*) FROM alerts GROUP BY 1",
            "dimensions": [{"field": "model_id", "label": "Detection Model"}],
            "schedule": "daily",
            "source_tier": "gold",
            "output_format": "json",
        },
        {
            "kpi_id": "score_distribution",
            "name": "Score Distribution",
            "description": "Score histogram",
            "category": "score_distribution",
            "sql_template": "SELECT model_id, score_bucket, COUNT(*) FROM alerts GROUP BY 1, 2",
            "dimensions": [
                {"field": "model_id", "label": "Detection Model"},
                {"field": "score_bucket", "label": "Score Range"},
            ],
            "schedule": "daily",
            "source_tier": "gold",
            "output_format": "json",
        },
        {
            "kpi_id": "regulatory_report",
            "name": "Regulatory Report",
            "description": "Regulatory coverage",
            "category": "regulatory_report",
            "sql_template": "SELECT regulation, model_id, COUNT(*) FROM alerts GROUP BY 1, 2",
            "dimensions": [
                {"field": "regulation", "label": "Regulation"},
                {"field": "model_id", "label": "Detection Model"},
            ],
            "schedule": "weekly",
            "source_tier": "gold",
            "output_format": "json",
        },
    ]

    for defn in definitions:
        path = platinum_dir / f"{defn['kpi_id']}.json"
        path.write_text(json.dumps(defn, indent=2))

    return tmp_path


@pytest.fixture
def metadata_service(tmp_workspace):
    return MetadataService(tmp_workspace)


@pytest.fixture
def service(tmp_workspace, metadata_service):
    return PlatinumService(tmp_workspace, metadata_service)


# ── Tests ──


def test_generate_alert_summary_kpi(service):
    """Generate alert_summary KPI and verify dataset has data points."""
    dataset = service.generate_kpi("alert_summary")
    assert dataset is not None
    assert dataset.kpi_id == "alert_summary"
    assert dataset.category == "alert_summary"
    assert len(dataset.data_points) > 0
    # 3 models x 3 asset classes = 9 points
    assert len(dataset.data_points) == 9


def test_generate_score_distribution_kpi(service):
    """Generate score_distribution KPI and verify structure."""
    dataset = service.generate_kpi("score_distribution")
    assert dataset is not None
    assert dataset.kpi_id == "score_distribution"
    assert dataset.category == "score_distribution"
    # 3 models x 10 buckets = 30 points
    assert len(dataset.data_points) == 30
    # Verify score_bucket dimension is present
    for dp in dataset.data_points:
        assert "score_bucket" in dp.dimension_values
        assert "model_id" in dp.dimension_values


def test_generate_all_kpis(service):
    """Generate all 4 KPIs and verify count."""
    datasets = service.generate_all()
    assert len(datasets) == 4
    kpi_ids = {ds.kpi_id for ds in datasets}
    assert kpi_ids == {
        "alert_summary",
        "model_effectiveness",
        "score_distribution",
        "regulatory_report",
    }


def test_kpi_dataset_has_data_points(service):
    """Every generated dataset must have non-empty data_points."""
    datasets = service.generate_all()
    for ds in datasets:
        assert len(ds.data_points) > 0, f"{ds.kpi_id} has no data points"


def test_kpi_dimensions_present(service):
    """Every data point must have non-empty dimension_values."""
    datasets = service.generate_all()
    for ds in datasets:
        for dp in ds.data_points:
            assert len(dp.dimension_values) > 0, (
                f"{ds.kpi_id} data point missing dimension_values"
            )


def test_get_summary(service):
    """Verify summary dict has expected keys and structure."""
    # Before generation
    summary = service.get_summary()
    assert summary["total_kpis"] == 4
    assert summary["datasets_generated"] == 0
    assert "alert_summary" in summary["categories"]
    assert summary["last_generated"] == ""

    # After generation
    service.generate_all()
    summary = service.get_summary()
    assert summary["datasets_generated"] == 4
    assert summary["last_generated"] != ""


def test_missing_kpi_returns_none(service):
    """Non-existent kpi_id returns None."""
    result = service.generate_kpi("does_not_exist")
    assert result is None


def test_kpi_dataset_record_count(service):
    """record_count must match len(data_points)."""
    datasets = service.generate_all()
    for ds in datasets:
        assert ds.record_count == len(ds.data_points), (
            f"{ds.kpi_id}: record_count={ds.record_count} != len(data_points)={len(ds.data_points)}"
        )
