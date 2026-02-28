"""Quarantine service for managing records that fail quality validation.

Quarantined records are stored as JSON files in workspace/quarantine/.
Each record preserves the original data, failed rules, and investigation context.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.models.quality import QuarantineRecord, QuarantineSummary


class QuarantineService:
    """Manages quarantined records — capture, list, retry, override."""

    def __init__(self, workspace: Path) -> None:
        self._dir = workspace / "quarantine"
        self._dir.mkdir(parents=True, exist_ok=True)

    def capture(
        self,
        source_tier: str,
        target_tier: str,
        entity: str,
        failed_rules: list[dict],
        original_data: dict,
    ) -> QuarantineRecord:
        """Capture a failed record into quarantine."""
        record = QuarantineRecord(
            record_id=str(uuid.uuid4())[:8],
            source_tier=source_tier,
            target_tier=target_tier,
            entity=entity,
            failed_rules=failed_rules,
            original_data=original_data,
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="pending",
        )
        self._save(record)
        return record

    def list_records(
        self,
        entity: str | None = None,
        status: str | None = None,
        source_tier: str | None = None,
    ) -> list[QuarantineRecord]:
        """List quarantine records with optional filters."""
        records: list[QuarantineRecord] = []
        for path in sorted(self._dir.glob("*.json")):
            rec = QuarantineRecord.model_validate_json(path.read_text())
            if entity and rec.entity != entity:
                continue
            if status and rec.status != status:
                continue
            if source_tier and rec.source_tier != source_tier:
                continue
            records.append(rec)
        return records

    def get_record(self, record_id: str) -> QuarantineRecord | None:
        """Get a single quarantine record by ID."""
        path = self._dir / f"{record_id}.json"
        if not path.exists():
            return None
        return QuarantineRecord.model_validate_json(path.read_text())

    def retry(self, record_id: str) -> QuarantineRecord | None:
        """Mark a record as retried (increment retry_count)."""
        record = self.get_record(record_id)
        if record is None:
            return None
        record.retry_count += 1
        record.status = "retried"
        self._save(record)
        return record

    def override(self, record_id: str, notes: str = "") -> QuarantineRecord | None:
        """Force-accept a record with justification."""
        record = self.get_record(record_id)
        if record is None:
            return None
        record.status = "overridden"
        record.notes = notes
        self._save(record)
        return record

    def discard(self, record_id: str) -> bool:
        """Remove a quarantine record."""
        path = self._dir / f"{record_id}.json"
        if not path.exists():
            return False
        # Mark as discarded rather than deleting (audit trail)
        record = QuarantineRecord.model_validate_json(path.read_text())
        record.status = "discarded"
        self._save(record)
        return True

    def summary(self) -> QuarantineSummary:
        """Get aggregate summary of quarantine queue."""
        records = self.list_records()
        by_entity: dict[str, int] = {}
        by_tier: dict[str, int] = {}
        by_rule: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for r in records:
            by_entity[r.entity] = by_entity.get(r.entity, 0) + 1
            key = f"{r.source_tier}\u2192{r.target_tier}"
            by_tier[key] = by_tier.get(key, 0) + 1
            by_status[r.status] = by_status.get(r.status, 0) + 1
            for fr in r.failed_rules:
                rule_type = fr.get("rule", "unknown")
                by_rule[rule_type] = by_rule.get(rule_type, 0) + 1
        return QuarantineSummary(
            total_records=len(records),
            by_entity=by_entity,
            by_tier_transition=by_tier,
            by_rule_type=by_rule,
            by_status=by_status,
        )

    def _save(self, record: QuarantineRecord) -> None:
        path = self._dir / f"{record.record_id}.json"
        path.write_text(record.model_dump_json(indent=2))
