"""Archive tier service — regulatory retention and export management."""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from backend.models.analytics_tiers import (
    ArchiveEntry,
    ArchiveManifest,
)

if TYPE_CHECKING:
    from backend.models.analytics_tiers import ArchiveConfig, RetentionPolicy
    from backend.services.metadata_service import MetadataService


class ArchiveService:
    """Manage archive entries and retention compliance."""

    # Known entities and approximate record counts for demo
    ENTITY_RECORDS = {
        "product": 50,
        "execution": 761,
        "order": 786,
        "md_eod": 2150,
        "md_intraday": 32000,
        "venue": 6,
        "account": 220,
        "trader": 50,
    }

    def __init__(self, workspace: Path, metadata_service: MetadataService):
        self._workspace = workspace
        self._metadata = metadata_service

    # ── Export ──

    def export_entity(self, entity: str, policy_id: str) -> ArchiveEntry | None:
        """Create archive entry for an entity.

        Demo mode: writes a manifest entry but does not produce actual Parquet files.
        Returns *None* when the config is missing, the policy is unknown, or the
        entity is not covered by the requested policy.
        """
        config = self._metadata.load_archive_config()
        if not config:
            return None

        policy = next((p for p in config.policies if p.policy_id == policy_id), None)
        if not policy:
            return None

        # Entity must appear in the policy's data_types list
        if entity not in policy.data_types:
            return None

        manifest = self._metadata.load_archive_manifest()
        next_num = len(manifest.entries) + 1
        prefix = entity[:3].upper()
        entry_id = f"ARC-{prefix}-{next_num:04d}"

        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=policy.retention_years * 365)
        record_count = self.ENTITY_RECORDS.get(entity, 0)
        size_estimate = record_count * 256  # rough bytes per record

        entry = ArchiveEntry(
            entry_id=entry_id,
            entity=entity,
            source_tier="gold",
            record_count=record_count,
            archived_at=now.isoformat(),
            expires_at=expires.isoformat(),
            policy_id=policy_id,
            format=config.default_format,
            size_bytes=size_estimate,
            checksum=hashlib.sha256(
                f"{entry_id}-{entity}-{now.isoformat()}".encode()
            ).hexdigest()[:16],
        )

        manifest.entries.append(entry)
        manifest.total_entries = len(manifest.entries)
        manifest.last_export = now.isoformat()
        self._metadata.save_archive_manifest(manifest)
        return entry

    # ── Queries ──

    def list_entries(self) -> list[ArchiveEntry]:
        """List all archive entries."""
        manifest = self._metadata.load_archive_manifest()
        return manifest.entries

    def get_retention_timeline(self) -> list[dict]:
        """Build timeline: entity x regulation x retention period for visualization."""
        config = self._metadata.load_archive_config()
        if not config:
            return []

        now = datetime.now(timezone.utc)
        timeline: list[dict] = []
        for policy in config.policies:
            for entity in policy.data_types:
                timeline.append(
                    {
                        "entity": entity,
                        "regulation": policy.regulation,
                        "policy_id": policy.policy_id,
                        "retention_years": policy.retention_years,
                        "start": now.isoformat(),
                        "end": (now + timedelta(days=policy.retention_years * 365)).isoformat(),
                        "gdpr_relevant": policy.gdpr_relevant,
                        "crypto_shred": policy.crypto_shred,
                    }
                )
        return timeline

    def get_compliance_summary(self) -> dict:
        """Summary of archive compliance status."""
        config = self._metadata.load_archive_config()
        manifest = self._metadata.load_archive_manifest()
        policies = config.policies if config else []
        archived_entities = set(e.entity for e in manifest.entries)
        all_required: set[str] = set()
        for p in policies:
            all_required.update(p.data_types)
        gdpr_policies = [p for p in policies if p.gdpr_relevant]

        return {
            "total_policies": len(policies),
            "total_entries": manifest.total_entries,
            "archived_entities": sorted(archived_entities),
            "required_entities": sorted(all_required),
            "coverage_pct": round(
                len(archived_entities) / max(len(all_required), 1) * 100, 1
            ),
            "gdpr_policies": len(gdpr_policies),
            "last_export": manifest.last_export,
        }
