"""OOB Version Service — tracks out-of-box metadata versions and simulates upgrades."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field


class UpgradeReport(BaseModel):
    from_version: str
    to_version: str
    added: list[dict] = Field(default_factory=list)
    removed: list[dict] = Field(default_factory=list)
    modified: list[dict] = Field(default_factory=list)
    conflicts: list[dict] = Field(default_factory=list)
    user_overrides_intact: int = 0


class OobVersionService:
    def __init__(self, metadata_base: Path) -> None:
        self._base = metadata_base

    def _manifest_path(self) -> Path:
        return self._base / "oob_manifest.json"

    def _user_overrides_base(self) -> Path:
        return self._base / "user_overrides"

    def _load_manifest(self) -> dict:
        path = self._manifest_path()
        if path.exists():
            return json.loads(path.read_text())
        return {"oob_version": "0.0.0", "items": {}}

    def get_version(self) -> str:
        return self._load_manifest().get("oob_version", "0.0.0")

    def get_summary(self) -> dict:
        manifest = self._load_manifest()
        oob_count = sum(len(v) for v in manifest.get("items", {}).values())
        override_count = self._count_user_overrides()
        return {
            "oob_version": manifest.get("oob_version", "0.0.0"),
            "oob_item_count": oob_count,
            "user_override_count": override_count,
            "description": manifest.get("description", ""),
        }

    def _count_user_overrides(self) -> int:
        base = self._user_overrides_base()
        if not base.exists():
            return 0
        return sum(1 for f in base.rglob("*.json"))

    def compare_manifests(self, old_manifest: dict, new_manifest: dict) -> UpgradeReport:
        old_version = old_manifest.get("oob_version", "0.0.0")
        new_version = new_manifest.get("oob_version", "0.0.0")

        added: list[dict] = []
        removed: list[dict] = []
        modified: list[dict] = []
        conflicts: list[dict] = []

        old_items = old_manifest.get("items", {})
        new_items = new_manifest.get("items", {})

        all_types = set(old_items.keys()) | set(new_items.keys())

        override_count = self._count_user_overrides()

        for item_type in sorted(all_types):
            old_type = old_items.get(item_type, {})
            new_type = new_items.get(item_type, {})

            all_ids = set(old_type.keys()) | set(new_type.keys())

            for item_id in sorted(all_ids):
                in_old = item_id in old_type
                in_new = item_id in new_type

                if in_new and not in_old:
                    added.append({"type": item_type, "id": item_id})
                elif in_old and not in_new:
                    removed.append({"type": item_type, "id": item_id})
                elif in_old and in_new:
                    old_checksum = old_type[item_id].get("checksum", "")
                    new_checksum = new_type[item_id].get("checksum", "")
                    if old_checksum != new_checksum:
                        has_override = self._has_user_override(item_type, item_id)
                        entry = {
                            "type": item_type,
                            "id": item_id,
                            "old_version": old_type[item_id].get("version", ""),
                            "new_version": new_type[item_id].get("version", ""),
                        }
                        if has_override:
                            conflicts.append(entry)
                        else:
                            modified.append(entry)

        return UpgradeReport(
            from_version=old_version,
            to_version=new_version,
            added=added,
            removed=removed,
            modified=modified,
            conflicts=conflicts,
            user_overrides_intact=override_count,
        )

    def _has_user_override(self, item_type: str, item_id: str) -> bool:
        base = self._user_overrides_base() / item_type
        if not base.exists():
            return False
        for f in base.rglob(f"{item_id}.json"):
            return True
        return False

    def simulate_upgrade(self, new_manifest: dict) -> UpgradeReport:
        current = self._load_manifest()
        return self.compare_manifests(current, new_manifest)
