"""Append-only audit trail for metadata changes."""
from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.services.masking_service import MaskingService


class AuditService:
    def __init__(self, workspace_dir: Path):
        self._dir = workspace_dir / "metadata" / "_audit"
        self._dir.mkdir(parents=True, exist_ok=True)

    def record(self, metadata_type: str, item_id: str, action: str,
               new_value: dict | None = None, previous_value: dict | None = None) -> None:
        ts = datetime.now(timezone.utc)
        record = {
            "timestamp": ts.isoformat(),
            "metadata_type": metadata_type,
            "item_id": item_id,
            "action": action,
            "previous_value": previous_value,
            "new_value": new_value,
        }
        filename = f"{ts.strftime('%Y%m%dT%H%M%S%f')}_{metadata_type}_{item_id}_{action}.json"
        (self._dir / filename).write_text(json.dumps(record, indent=2, default=str))

    def get_history(self, metadata_type: str | None = None,
                    item_id: str | None = None) -> list[dict]:
        if not self._dir.exists():
            return []
        records = []
        for f in sorted(self._dir.glob("*.json")):
            record = json.loads(f.read_text())
            if metadata_type and record.get("metadata_type") != metadata_type:
                continue
            if item_id and record.get("item_id") != item_id:
                continue
            records.append(record)
        return records

    def get_history_masked(
        self,
        role_id: str,
        masking_service: MaskingService,
        metadata_type: str | None = None,
        item_id: str | None = None,
    ) -> list[dict]:
        """Return audit history with PII fields masked based on the requesting role.

        Audit entries are stored unmasked (regulatory requirement). This method
        applies read-time masking via the MaskingService so that roles without
        PII access see redacted values.

        The entity name for masking is derived from the entry's ``metadata_type``.
        If ``metadata_type`` is a generic category (e.g. "entities"), the entry's
        ``item_id`` is used as the entity name instead.
        """
        raw = self.get_history(metadata_type=metadata_type, item_id=item_id)
        masked_entries: list[dict] = []

        # Generic metadata_type values that are not entity names themselves
        _generic_types = {"entities", "calculations", "settings", "detection_models"}

        for entry in raw:
            entry = copy.deepcopy(entry)
            mt = entry.get("metadata_type", "")
            entity_id = mt if mt not in _generic_types else entry.get("item_id", mt)

            if entry.get("new_value") and isinstance(entry["new_value"], dict):
                entry["new_value"] = masking_service.mask_record(
                    entity_id, entry["new_value"], role_id
                )

            if entry.get("previous_value") and isinstance(entry["previous_value"], dict):
                entry["previous_value"] = masking_service.mask_record(
                    entity_id, entry["previous_value"], role_id
                )

            masked_entries.append(entry)

        return masked_entries
