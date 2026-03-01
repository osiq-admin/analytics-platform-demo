"""Metadata replicator — syncs file-based metadata (seed) into Iceberg tables.

Replicates entity definitions, calculations, detection models, and settings
from workspace/metadata/ JSON files into platform.metadata.* Iceberg tables
for queryability, time-travel, and governed access.
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import pyarrow as pa

if TYPE_CHECKING:
    from backend.services.lakehouse_service import LakehouseService

log = logging.getLogger(__name__)

# Arrow schemas for metadata tables
ENTITY_SCHEMA = pa.schema([
    ("entity_id", pa.string()),
    ("display_name", pa.string()),
    ("field_count", pa.int32()),
    ("description", pa.string()),
    ("definition_json", pa.string()),
    ("synced_at", pa.string()),
])

CALCULATION_SCHEMA = pa.schema([
    ("calc_id", pa.string()),
    ("category", pa.string()),
    ("layer", pa.string()),
    ("description", pa.string()),
    ("definition_json", pa.string()),
    ("synced_at", pa.string()),
])

DETECTION_MODEL_SCHEMA = pa.schema([
    ("model_id", pa.string()),
    ("model_name", pa.string()),
    ("description", pa.string()),
    ("definition_json", pa.string()),
    ("synced_at", pa.string()),
])

SETTING_SCHEMA = pa.schema([
    ("setting_id", pa.string()),
    ("category", pa.string()),
    ("definition_json", pa.string()),
    ("synced_at", pa.string()),
])


class MetadataReplicator:
    """Syncs file-based metadata (seed) into Iceberg tables (platform.metadata.*)."""

    def __init__(self, workspace: Path, lakehouse: "LakehouseService | None" = None):
        self._workspace = workspace
        self._lakehouse = lakehouse
        self._metadata_dir = workspace / "metadata"

    def sync_entity_definitions(self) -> int:
        """Replicate entity JSON definitions into Iceberg. Returns count synced."""
        entities_dir = self._metadata_dir / "entities"
        if not entities_dir.exists():
            return 0

        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        rows: dict[str, list] = {
            "entity_id": [], "display_name": [], "field_count": [],
            "description": [], "definition_json": [], "synced_at": [],
        }

        for path in sorted(entities_dir.glob("*.json")):
            try:
                with open(path) as f:
                    data = json.load(f)
                entity_id = data.get("entity_id", path.stem)
                fields = data.get("fields", [])
                rows["entity_id"].append(entity_id)
                rows["display_name"].append(data.get("display_name", entity_id))
                rows["field_count"].append(len(fields))
                rows["description"].append(data.get("description", ""))
                rows["definition_json"].append(json.dumps(data))
                rows["synced_at"].append(now)
            except Exception:
                log.warning("Failed to read entity definition: %s", path)

        if not rows["entity_id"]:
            return 0

        return self._write_to_iceberg("logging", "metadata_entities", ENTITY_SCHEMA, rows)

    def sync_calculations(self) -> int:
        """Replicate calculation JSON definitions into Iceberg. Returns count synced."""
        calc_dir = self._metadata_dir / "calculations"
        if not calc_dir.exists():
            return 0

        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        rows: dict[str, list] = {
            "calc_id": [], "category": [], "layer": [],
            "description": [], "definition_json": [], "synced_at": [],
        }

        for category_dir in sorted(calc_dir.iterdir()):
            if not category_dir.is_dir():
                continue
            for path in sorted(category_dir.glob("*.json")):
                try:
                    with open(path) as f:
                        data = json.load(f)
                    calc_id = data.get("calc_id", path.stem)
                    rows["calc_id"].append(calc_id)
                    rows["category"].append(category_dir.name)
                    rows["layer"].append(data.get("layer", ""))
                    rows["description"].append(data.get("description", ""))
                    rows["definition_json"].append(json.dumps(data))
                    rows["synced_at"].append(now)
                except Exception:
                    log.warning("Failed to read calculation: %s", path)

        if not rows["calc_id"]:
            return 0

        return self._write_to_iceberg("logging", "metadata_calculations", CALCULATION_SCHEMA, rows)

    def sync_detection_models(self) -> int:
        """Replicate detection model JSON definitions into Iceberg. Returns count synced."""
        models_dir = self._metadata_dir / "detection_models"
        if not models_dir.exists():
            return 0

        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        rows: dict[str, list] = {
            "model_id": [], "model_name": [], "description": [],
            "definition_json": [], "synced_at": [],
        }

        for path in sorted(models_dir.glob("*.json")):
            try:
                with open(path) as f:
                    data = json.load(f)
                model_id = data.get("model_id", path.stem)
                rows["model_id"].append(model_id)
                rows["model_name"].append(data.get("model_name", model_id))
                rows["description"].append(data.get("description", ""))
                rows["definition_json"].append(json.dumps(data))
                rows["synced_at"].append(now)
            except Exception:
                log.warning("Failed to read detection model: %s", path)

        if not rows["model_id"]:
            return 0

        return self._write_to_iceberg("logging", "metadata_detection_models", DETECTION_MODEL_SCHEMA, rows)

    def sync_settings(self) -> int:
        """Replicate settings JSON definitions into Iceberg. Returns count synced."""
        settings_dir = self._metadata_dir / "settings"
        if not settings_dir.exists():
            return 0

        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        rows: dict[str, list] = {
            "setting_id": [], "category": [],
            "definition_json": [], "synced_at": [],
        }

        for category_dir in sorted(settings_dir.iterdir()):
            if not category_dir.is_dir():
                continue
            for path in sorted(category_dir.glob("*.json")):
                try:
                    with open(path) as f:
                        data = json.load(f)
                    setting_id = path.stem
                    rows["setting_id"].append(setting_id)
                    rows["category"].append(category_dir.name)
                    rows["definition_json"].append(json.dumps(data))
                    rows["synced_at"].append(now)
                except Exception:
                    log.warning("Failed to read setting: %s", path)

        if not rows["setting_id"]:
            return 0

        return self._write_to_iceberg("logging", "metadata_settings", SETTING_SCHEMA, rows)

    def sync_all(self) -> dict[str, int]:
        """Sync all metadata types. Returns {type: count}."""
        start = time.time()
        results = {
            "entities": self.sync_entity_definitions(),
            "calculations": self.sync_calculations(),
            "detection_models": self.sync_detection_models(),
            "settings": self.sync_settings(),
        }
        duration_ms = int((time.time() - start) * 1000)
        total = sum(results.values())
        log.info("Metadata replication complete: %d items in %dms — %s", total, duration_ms, results)
        return results

    def get_sync_status(self) -> dict:
        """Return status of metadata replication (table existence + record counts)."""
        tables = ["metadata_entities", "metadata_calculations", "metadata_detection_models", "metadata_settings"]
        status = {}
        for table_name in tables:
            if self._lakehouse and self._lakehouse.table_exists("logging", table_name):
                info = self._lakehouse.get_table_info("logging", table_name)
                status[table_name] = {
                    "exists": True,
                    "total_records": info.total_records,
                    "snapshot_count": info.snapshot_count,
                }
            else:
                status[table_name] = {"exists": False, "total_records": 0, "snapshot_count": 0}
        return status

    def _write_to_iceberg(self, tier: str, table_name: str, schema: pa.Schema, rows: dict) -> int:
        """Write rows to an Iceberg table. Creates table if needed. Returns row count."""
        if not self._lakehouse:
            log.warning("No lakehouse connection — metadata replication skipped for %s", table_name)
            return 0

        arrow_table = pa.table(rows, schema=schema)
        row_count = len(arrow_table)

        try:
            if not self._lakehouse.table_exists(tier, table_name):
                self._lakehouse.create_table(tier, table_name, schema)
            self._lakehouse.overwrite(tier, table_name, arrow_table)
            log.info("Replicated %d rows to %s.%s", row_count, tier, table_name)
            return row_count
        except Exception:
            log.warning("Failed to replicate metadata to %s.%s", tier, table_name, exc_info=True)
            return 0
