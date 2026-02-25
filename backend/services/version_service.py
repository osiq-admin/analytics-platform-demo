"""Version management service — tracks metadata changes with snapshots."""
import json
import logging
from datetime import datetime
from pathlib import Path

from backend.services.metadata_service import MetadataService

log = logging.getLogger(__name__)


class VersionEntry:
    def __init__(self, version: int, timestamp: str, author: str, change_type: str, snapshot: dict, description: str = ""):
        self.version = version
        self.timestamp = timestamp
        self.author = author
        self.change_type = change_type  # create, update, delete
        self.snapshot = snapshot
        self.description = description

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "timestamp": self.timestamp,
            "author": self.author,
            "change_type": self.change_type,
            "snapshot": self.snapshot,
            "description": self.description,
        }


class VersionService:
    """Tracks metadata item versions as JSON files."""

    def __init__(self, workspace_dir: Path, metadata: MetadataService):
        self._workspace = workspace_dir
        self._metadata = metadata
        self._versions_dir = workspace_dir / "versions"
        self._versions_dir.mkdir(parents=True, exist_ok=True)

    def _item_dir(self, item_type: str, item_id: str) -> Path:
        d = self._versions_dir / item_type / item_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _load_history(self, item_type: str, item_id: str) -> list[dict]:
        history_file = self._item_dir(item_type, item_id) / "history.json"
        if history_file.exists():
            return json.loads(history_file.read_text())
        return []

    def _save_history(self, item_type: str, item_id: str, history: list[dict]) -> None:
        history_file = self._item_dir(item_type, item_id) / "history.json"
        history_file.write_text(json.dumps(history, indent=2, default=str))

    def record_version(self, item_type: str, item_id: str, snapshot: dict,
                       change_type: str = "update", author: str = "system",
                       description: str = "") -> dict:
        """Record a new version of a metadata item."""
        history = self._load_history(item_type, item_id)
        version = len(history) + 1

        entry = VersionEntry(
            version=version,
            timestamp=datetime.now().isoformat(),
            author=author,
            change_type=change_type,
            snapshot=snapshot,
            description=description,
        )
        history.append(entry.to_dict())
        self._save_history(item_type, item_id, history)
        return entry.to_dict()

    def get_history(self, item_type: str, item_id: str) -> list[dict]:
        """Get version history for a metadata item."""
        return self._load_history(item_type, item_id)

    def get_version(self, item_type: str, item_id: str, version: int) -> dict | None:
        """Get a specific version."""
        history = self._load_history(item_type, item_id)
        for entry in history:
            if entry["version"] == version:
                return entry
        return None

    def compare_versions(self, item_type: str, item_id: str,
                         version_a: int, version_b: int) -> dict:
        """Compare two versions and return the differences."""
        a = self.get_version(item_type, item_id, version_a)
        b = self.get_version(item_type, item_id, version_b)

        if not a or not b:
            return {"error": "Version not found", "changes": []}

        changes = self._diff_snapshots(a.get("snapshot", {}), b.get("snapshot", {}))
        return {
            "item_type": item_type,
            "item_id": item_id,
            "version_a": version_a,
            "version_b": version_b,
            "changes": changes,
            "summary": f"{len(changes)} field(s) changed",
        }

    def _diff_snapshots(self, a: dict, b: dict, prefix: str = "") -> list[dict]:
        """Compute field-level differences between two snapshots."""
        changes = []
        all_keys = set(list(a.keys()) + list(b.keys()))

        for key in sorted(all_keys):
            path = f"{prefix}.{key}" if prefix else key
            val_a = a.get(key)
            val_b = b.get(key)

            if key not in a:
                changes.append({"field": path, "type": "added", "old": None, "new": val_b})
            elif key not in b:
                changes.append({"field": path, "type": "removed", "old": val_a, "new": None})
            elif isinstance(val_a, dict) and isinstance(val_b, dict):
                changes.extend(self._diff_snapshots(val_a, val_b, path))
            elif val_a != val_b:
                changes.append({"field": path, "type": "changed", "old": val_a, "new": val_b})

        return changes

    def rollback(self, item_type: str, item_id: str, target_version: int) -> dict | None:
        """Rollback to a previous version (records a new version with the old snapshot)."""
        target = self.get_version(item_type, item_id, target_version)
        if not target:
            return None

        return self.record_version(
            item_type, item_id,
            snapshot=target["snapshot"],
            change_type="rollback",
            description=f"Rolled back to version {target_version}",
        )
