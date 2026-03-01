# tests/test_analytics_tiers_models.py
"""Tests for Extended Analytical Tiers Pydantic models (Platinum, Sandbox, Archive)."""
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.models.analytics_tiers import (
    KPIDimension,
    KPIDefinition,
    KPIDataPoint,
    KPIDataset,
    PlatinumConfig,
    SandboxOverride,
    SandboxConfig,
    SandboxComparison,
    SandboxRegistry,
    RetentionPolicy,
    ArchiveEntry,
    ArchiveManifest,
    ArchiveConfig,
)


# ---------------------------------------------------------------------------
# Platinum KPI tests
# ---------------------------------------------------------------------------

class TestKPIDefinition:
    def test_defaults(self):
        kpi = KPIDefinition(kpi_id="k1", name="Alert Count")
        assert kpi.kpi_id == "k1"
        assert kpi.category == "alert_summary"
        assert kpi.dimensions == []
        assert kpi.schedule == "daily"
        assert kpi.source_tier == "gold"
        assert kpi.output_format == "json"

    def test_category_literals(self):
        for cat in ("alert_summary", "model_effectiveness", "score_distribution", "regulatory_report"):
            kpi = KPIDefinition(kpi_id="k1", name="Test", category=cat)
            assert kpi.category == cat

    def test_invalid_category_rejected(self):
        with pytest.raises(ValidationError):
            KPIDefinition(kpi_id="k1", name="Test", category="invalid_category")

    def test_with_dimensions(self):
        dims = [
            KPIDimension(field="model_id", label="Model"),
            KPIDimension(field="asset_class", label="Asset Class"),
        ]
        kpi = KPIDefinition(kpi_id="k2", name="By Model", dimensions=dims)
        assert len(kpi.dimensions) == 2
        assert kpi.dimensions[0].field == "model_id"
        assert kpi.dimensions[1].label == "Asset Class"

    def test_full_roundtrip(self):
        kpi = KPIDefinition(
            kpi_id="k3",
            name="Score Distribution",
            description="Histogram of alert scores",
            category="score_distribution",
            sql_template="SELECT score_bucket, COUNT(*) FROM alerts GROUP BY 1",
            dimensions=[KPIDimension(field="model_id", label="Model")],
            schedule="hourly",
            source_tier="gold",
            output_format="parquet",
        )
        data = kpi.model_dump()
        restored = KPIDefinition(**data)
        assert restored == kpi


class TestKPIDataset:
    def test_defaults(self):
        ds = KPIDataset(kpi_id="k1", name="Alert Count")
        assert ds.data_points == []
        assert ds.record_count == 0
        assert ds.category == ""

    def test_with_data_points(self):
        pts = [
            KPIDataPoint(
                dimension_values={"model": "wash_trading"},
                metric_name="alert_count",
                metric_value=42,
                period="2026-02",
            ),
            KPIDataPoint(
                dimension_values={"model": "spoofing"},
                metric_name="alert_count",
                metric_value=7,
                period="2026-02",
            ),
        ]
        ds = KPIDataset(kpi_id="k1", name="By Model", data_points=pts, record_count=2)
        assert len(ds.data_points) == 2
        assert ds.data_points[0].metric_value == 42
        assert ds.record_count == 2


# ---------------------------------------------------------------------------
# Sandbox tests
# ---------------------------------------------------------------------------

class TestSandboxConfig:
    def test_defaults(self):
        sb = SandboxConfig(sandbox_id="sb1", name="Test Sandbox")
        assert sb.status == "created"
        assert sb.source_tier == "gold"
        assert sb.overrides == []
        assert sb.results_summary == {}

    def test_status_literals(self):
        for status in ("created", "configured", "running", "completed", "discarded"):
            sb = SandboxConfig(sandbox_id="sb1", name="Test", status=status)
            assert sb.status == status

    def test_invalid_status_rejected(self):
        with pytest.raises(ValidationError):
            SandboxConfig(sandbox_id="sb1", name="Test", status="invalid")

    def test_with_overrides(self):
        overrides = [
            SandboxOverride(setting_id="threshold_mpr", original_value=0.8, sandbox_value=0.6),
            SandboxOverride(setting_id="lookback_days", original_value=30, sandbox_value=60),
        ]
        sb = SandboxConfig(sandbox_id="sb2", name="Tuning", overrides=overrides)
        assert len(sb.overrides) == 2
        assert sb.overrides[0].sandbox_value == 0.6


class TestSandboxComparison:
    def test_defaults(self):
        cmp = SandboxComparison(sandbox_id="sb1")
        assert cmp.production_alerts == 0
        assert cmp.sandbox_alerts == 0
        assert cmp.score_shift_avg == 0.0
        assert cmp.model_diffs == []

    def test_with_model_diffs(self):
        diffs = [
            {"model": "wash_trading", "prod_count": 10, "sandbox_count": 15},
            {"model": "spoofing", "prod_count": 5, "sandbox_count": 3},
        ]
        cmp = SandboxComparison(
            sandbox_id="sb1",
            production_alerts=15,
            sandbox_alerts=18,
            alerts_added=5,
            alerts_removed=2,
            score_shift_avg=-0.12,
            model_diffs=diffs,
        )
        assert len(cmp.model_diffs) == 2
        assert cmp.alerts_added == 5
        assert cmp.score_shift_avg == pytest.approx(-0.12)


# ---------------------------------------------------------------------------
# Archive tests
# ---------------------------------------------------------------------------

class TestRetentionPolicy:
    def test_defaults(self):
        pol = RetentionPolicy(policy_id="p1", regulation="MAR")
        assert pol.retention_years == 5
        assert pol.data_types == []
        assert pol.gdpr_relevant is False
        assert pol.crypto_shred is False

    def test_gdpr_crypto_shred(self):
        pol = RetentionPolicy(
            policy_id="p2",
            regulation="GDPR",
            retention_years=3,
            data_types=["trader", "account"],
            gdpr_relevant=True,
            crypto_shred=True,
        )
        assert pol.gdpr_relevant is True
        assert pol.crypto_shred is True
        assert "trader" in pol.data_types


class TestArchiveEntry:
    def test_defaults(self):
        entry = ArchiveEntry(entry_id="a1", entity="execution")
        assert entry.source_tier == "gold"
        assert entry.format == "compressed_parquet"
        assert entry.size_bytes == 0
        assert entry.checksum == ""

    def test_full_fields(self):
        entry = ArchiveEntry(
            entry_id="a2",
            entity="order",
            source_tier="gold",
            record_count=5000,
            archived_at="2026-01-15T00:00:00Z",
            expires_at="2031-01-15T00:00:00Z",
            policy_id="p1",
            format="compressed_parquet",
            size_bytes=1_048_576,
            checksum="sha256:abc123",
        )
        assert entry.record_count == 5000
        assert entry.size_bytes == 1_048_576
        assert entry.checksum.startswith("sha256:")


class TestArchiveManifest:
    def test_defaults(self):
        manifest = ArchiveManifest()
        assert manifest.tier_id == "archive"
        assert manifest.entries == []
        assert manifest.total_entries == 0

    def test_with_entries(self):
        entries = [
            ArchiveEntry(entry_id="a1", entity="execution", record_count=100),
            ArchiveEntry(entry_id="a2", entity="order", record_count=200),
        ]
        manifest = ArchiveManifest(entries=entries, total_entries=2, last_export="2026-02-28T12:00:00Z")
        assert len(manifest.entries) == 2
        assert manifest.total_entries == 2


class TestArchiveConfig:
    def test_defaults(self):
        cfg = ArchiveConfig()
        assert cfg.tier_id == "archive"
        assert cfg.policies == []
        assert cfg.archive_dir == "workspace/archive"
        assert cfg.default_format == "compressed_parquet"

    def test_with_policies(self):
        policies = [
            RetentionPolicy(policy_id="p1", regulation="MAR", retention_years=5),
            RetentionPolicy(policy_id="p2", regulation="MiFID II", retention_years=7),
        ]
        cfg = ArchiveConfig(policies=policies)
        assert len(cfg.policies) == 2
        assert cfg.policies[1].retention_years == 7


# ---------------------------------------------------------------------------
# Platinum KPI Metadata file loading tests
# ---------------------------------------------------------------------------

PLATINUM_DIR = Path("workspace/metadata/medallion/platinum")


class TestPlatinumKPIMetadata:
    def test_alert_summary_kpi_loads(self):
        data = json.loads((PLATINUM_DIR / "alert_summary.json").read_text())
        kpi = KPIDefinition(**data)
        assert kpi.kpi_id == "alert_summary"
        assert kpi.name == "Alert Summary"
        assert kpi.schedule == "daily"

    def test_model_effectiveness_kpi_loads(self):
        data = json.loads((PLATINUM_DIR / "model_effectiveness.json").read_text())
        kpi = KPIDefinition(**data)
        assert kpi.kpi_id == "model_effectiveness"
        assert kpi.name == "Model Effectiveness"
        assert kpi.schedule == "daily"

    def test_all_platinum_kpis_have_dimensions(self):
        for path in sorted(PLATINUM_DIR.glob("*.json")):
            data = json.loads(path.read_text())
            kpi = KPIDefinition(**data)
            assert len(kpi.dimensions) > 0, f"{path.name} has no dimensions"

    def test_platinum_kpi_categories(self):
        for path in sorted(PLATINUM_DIR.glob("*.json")):
            data = json.loads(path.read_text())
            kpi = KPIDefinition(**data)
            expected_category = path.stem  # filename without .json
            assert kpi.category == expected_category, (
                f"{path.name}: expected category '{expected_category}', got '{kpi.category}'"
            )


# ---------------------------------------------------------------------------
# Sandbox + Archive Metadata file loading tests
# ---------------------------------------------------------------------------

SANDBOX_DIR = Path("workspace/metadata/medallion/sandbox")
ARCHIVE_DIR = Path("workspace/metadata/medallion/archive")


class TestSandboxArchiveMetadata:
    def test_sandbox_template_loads(self):
        data = json.loads((SANDBOX_DIR / "template.json").read_text())
        assert data["tier_id"] == "sandbox"
        assert len(data["available_overrides"]) == 4

    def test_archive_policies_load(self):
        data = json.loads((ARCHIVE_DIR / "policies.json").read_text())
        cfg = ArchiveConfig(**data)
        assert cfg.tier_id == "archive"

    def test_archive_policies_count(self):
        data = json.loads((ARCHIVE_DIR / "policies.json").read_text())
        cfg = ArchiveConfig(**data)
        assert len(cfg.policies) == 5

    def test_gdpr_policy_has_crypto_shred(self):
        data = json.loads((ARCHIVE_DIR / "policies.json").read_text())
        cfg = ArchiveConfig(**data)
        gdpr = [p for p in cfg.policies if p.policy_id == "gdpr"]
        assert len(gdpr) == 1
        assert gdpr[0].gdpr_relevant is True
        assert gdpr[0].crypto_shred is True
