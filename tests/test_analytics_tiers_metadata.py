"""Tests for MetadataService analytics-tier methods (Platinum, Sandbox, Archive)."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.models.analytics_tiers import (
    ArchiveEntry,
    ArchiveManifest,
    KPIDataPoint,
    KPIDataset,
    SandboxConfig,
    SandboxOverride,
    SandboxRegistry,
)
from backend.services.metadata_service import MetadataService

WORKSPACE = Path(__file__).resolve().parent.parent / "workspace"


# ── Fixtures ──


@pytest.fixture
def real_service() -> MetadataService:
    """Service pointed at the real workspace (read-only tests)."""
    return MetadataService(WORKSPACE)


@pytest.fixture
def tmp_service(tmp_path: Path) -> MetadataService:
    """Service pointed at a temporary workspace (write tests)."""
    (tmp_path / "metadata").mkdir()
    return MetadataService(tmp_path)


# ── Platinum ──


def test_load_platinum_config(real_service: MetadataService):
    """Loads 4 KPI definitions from existing metadata."""
    config = real_service.load_platinum_config()
    assert config is not None
    assert config.tier_id == "platinum"
    assert len(config.kpi_definitions) == 4
    ids = {k.kpi_id for k in config.kpi_definitions}
    assert ids == {"alert_summary", "model_effectiveness", "score_distribution", "regulatory_report"}


def test_save_and_load_kpi_dataset(tmp_service: MetadataService):
    """Round-trip save/load of a KPI dataset."""
    dataset = KPIDataset(
        kpi_id="alert_summary",
        name="Alert Summary",
        category="alert_summary",
        generated_at="2026-02-28T10:00:00Z",
        period="2026-02-28",
        data_points=[
            KPIDataPoint(
                dimension_values={"model_id": "mpr"},
                metric_name="alert_count",
                metric_value=42,
                period="2026-02-28",
            ),
        ],
        record_count=1,
    )
    tmp_service.save_kpi_dataset("alert_summary", dataset)
    loaded = tmp_service.load_kpi_dataset("alert_summary")
    assert loaded is not None
    assert loaded.kpi_id == "alert_summary"
    assert loaded.record_count == 1
    assert len(loaded.data_points) == 1
    assert loaded.data_points[0].metric_value == 42


def test_list_kpi_datasets_empty(tmp_service: MetadataService):
    """Returns empty list when no datasets exist."""
    result = tmp_service.list_kpi_datasets()
    assert result == []


# ── Sandbox ──


def test_load_sandbox_registry_empty(tmp_service: MetadataService):
    """Returns empty registry when no file exists."""
    registry = tmp_service.load_sandbox_registry()
    assert registry.tier_id == "sandbox"
    assert registry.sandboxes == []


def test_save_and_load_sandbox_registry(tmp_service: MetadataService):
    """Round-trip save/load with a sandbox entry."""
    registry = SandboxRegistry(
        sandboxes=[
            SandboxConfig(
                sandbox_id="sb-001",
                name="Test Sandbox",
                description="Lower MPR threshold",
                status="configured",
                overrides=[
                    SandboxOverride(
                        setting_id="mpr_score_threshold",
                        original_value=30.0,
                        sandbox_value=20.0,
                    ),
                ],
            ),
        ],
    )
    tmp_service.save_sandbox_registry(registry)
    loaded = tmp_service.load_sandbox_registry()
    assert len(loaded.sandboxes) == 1
    sb = loaded.sandboxes[0]
    assert sb.sandbox_id == "sb-001"
    assert sb.status == "configured"
    assert len(sb.overrides) == 1
    assert sb.overrides[0].sandbox_value == 20.0


def test_load_sandbox_template(real_service: MetadataService):
    """Loads template from existing metadata."""
    template = real_service.load_sandbox_template()
    assert template is not None
    assert template["tier_id"] == "sandbox"
    assert "available_overrides" in template
    assert len(template["available_overrides"]) >= 1


# ── Archive ──


def test_load_archive_config(real_service: MetadataService):
    """Loads policies from existing metadata."""
    config = real_service.load_archive_config()
    assert config is not None
    assert config.tier_id == "archive"
    assert len(config.policies) == 5
    policy_ids = {p.policy_id for p in config.policies}
    assert "mifid2" in policy_ids
    assert "gdpr" in policy_ids


def test_load_archive_manifest_empty(tmp_service: MetadataService):
    """Returns empty manifest when no file exists."""
    manifest = tmp_service.load_archive_manifest()
    assert manifest.tier_id == "archive"
    assert manifest.entries == []
    assert manifest.total_entries == 0
