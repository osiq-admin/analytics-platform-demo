"""Tests for ArchiveService — export, retention timeline, compliance summary."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.models.analytics_tiers import ArchiveEntry
from backend.services.archive_service import ArchiveService
from backend.services.metadata_service import MetadataService

WORKSPACE = Path(__file__).resolve().parent.parent / "workspace"

# ── Policies payload matching workspace/metadata/medallion/archive/policies.json ──

POLICIES_JSON = {
    "tier_id": "archive",
    "policies": [
        {
            "policy_id": "mifid2",
            "regulation": "MiFID II",
            "retention_years": 7,
            "data_types": ["order", "execution", "alert"],
            "description": "Orders, executions, communications",
            "gdpr_relevant": False,
            "crypto_shred": False,
        },
        {
            "policy_id": "gdpr",
            "regulation": "GDPR",
            "retention_years": 1,
            "data_types": ["account", "trader"],
            "description": "PII data — crypto-shredding ready",
            "gdpr_relevant": True,
            "crypto_shred": True,
        },
    ],
    "archive_dir": "workspace/archive",
    "default_format": "compressed_parquet",
}


# ── Fixtures ──


@pytest.fixture
def tmp_workspace(tmp_path: Path) -> Path:
    """Temporary workspace with archive policies pre-seeded."""
    (tmp_path / "metadata" / "medallion" / "archive").mkdir(parents=True)
    (tmp_path / "metadata" / "medallion" / "archive" / "policies.json").write_text(
        json.dumps(POLICIES_JSON, indent=2)
    )
    return tmp_path


@pytest.fixture
def svc(tmp_workspace: Path) -> ArchiveService:
    """ArchiveService backed by a temporary workspace."""
    meta = MetadataService(tmp_workspace)
    return ArchiveService(tmp_workspace, meta)


# ── Tests ──


def test_export_entity(svc: ArchiveService):
    """Export 'order' under MiFID II policy — verify entry fields."""
    entry = svc.export_entity("order", "mifid2")
    assert entry is not None
    assert entry.entity == "order"
    assert entry.policy_id == "mifid2"
    assert entry.source_tier == "gold"
    assert entry.record_count == 786
    assert entry.format == "compressed_parquet"
    assert entry.entry_id.startswith("ARC-ORD-")
    assert entry.archived_at != ""
    assert entry.expires_at != ""
    assert len(entry.checksum) == 16


def test_list_entries(svc: ArchiveService):
    """Export 2 entities, list returns both."""
    svc.export_entity("order", "mifid2")
    svc.export_entity("execution", "mifid2")
    entries = svc.list_entries()
    assert len(entries) == 2
    entities = {e.entity for e in entries}
    assert entities == {"order", "execution"}


def test_retention_timeline(svc: ArchiveService):
    """Timeline entries have expected fields for each entity x policy pair."""
    timeline = svc.get_retention_timeline()
    assert len(timeline) > 0
    first = timeline[0]
    assert "entity" in first
    assert "regulation" in first
    assert "retention_years" in first
    assert "start" in first
    assert "end" in first
    assert "gdpr_relevant" in first
    assert "crypto_shred" in first


def test_compliance_summary(svc: ArchiveService):
    """Summary has expected keys and correct initial values."""
    summary = svc.get_compliance_summary()
    assert summary["total_policies"] == 2
    assert summary["total_archived"] == 0
    assert summary["entities_covered"] == 0
    assert summary["gdpr_relevant"] >= 0
    assert summary["compliance_status"] in ("compliant", "partial")
    assert "total_size_bytes" in summary
    assert "oldest_archive" in summary
    assert "newest_archive" in summary


def test_gdpr_crypto_shred_flag(svc: ArchiveService):
    """GDPR policy export: retention_years=1, crypto_shred=True in timeline."""
    entry = svc.export_entity("account", "gdpr")
    assert entry is not None
    assert entry.policy_id == "gdpr"
    # Verify timeline reflects GDPR constraints
    timeline = svc.get_retention_timeline()
    gdpr_entries = [t for t in timeline if t["policy_id"] == "gdpr"]
    assert len(gdpr_entries) > 0
    for t in gdpr_entries:
        assert t["retention_years"] == 1
        assert t["gdpr_relevant"] is True
        assert t["crypto_shred"] is True


def test_archive_manifest_persists(tmp_workspace: Path):
    """Export, create a new service instance, verify entries persist."""
    meta = MetadataService(tmp_workspace)
    svc1 = ArchiveService(tmp_workspace, meta)
    svc1.export_entity("order", "mifid2")

    # Create fresh service instances to force re-read from disk
    meta2 = MetadataService(tmp_workspace)
    svc2 = ArchiveService(tmp_workspace, meta2)
    entries = svc2.list_entries()
    assert len(entries) == 1
    assert entries[0].entity == "order"


def test_export_missing_entity(svc: ArchiveService):
    """Entity not in policy data_types but present in ENTITY_RECORDS returns None."""
    # "product" is in ENTITY_RECORDS but not in mifid2's data_types
    result = svc.export_entity("product", "mifid2")
    assert result is None


def test_export_missing_policy(svc: ArchiveService):
    """Non-existent policy_id returns None."""
    result = svc.export_entity("order", "nonexistent_policy")
    assert result is None
