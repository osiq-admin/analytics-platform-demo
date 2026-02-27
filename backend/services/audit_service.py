"""Append-only audit trail for metadata changes."""
import json
from datetime import datetime, timezone
from pathlib import Path


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
