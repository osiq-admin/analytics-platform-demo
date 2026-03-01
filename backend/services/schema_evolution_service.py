"""Schema evolution service — derives Iceberg schemas from entity metadata and detects drift."""

import json
import logging
from datetime import datetime
from pathlib import Path

import pyarrow as pa

from typing import TYPE_CHECKING

from backend.models.lakehouse import SchemaEvolution, SchemaField

if TYPE_CHECKING:
    from backend.services.lakehouse_service import LakehouseService

log = logging.getLogger(__name__)

# Entity field type → PyArrow type mapping
TYPE_MAP: dict[str, pa.DataType] = {
    "string": pa.string(),
    "integer": pa.int64(),
    "int": pa.int64(),
    "long": pa.int64(),
    "float": pa.float64(),
    "double": pa.float64(),
    "decimal": pa.float64(),
    "boolean": pa.bool_(),
    "bool": pa.bool_(),
    "date": pa.date32(),
    "datetime": pa.timestamp("us"),
    "timestamp": pa.timestamp("us"),
}


class SchemaEvolutionService:
    """Derives Iceberg schemas from entity JSON definitions and manages schema drift."""

    def __init__(self, workspace: Path, lakehouse: "LakehouseService | None" = None):
        self._workspace = workspace
        self._entities_dir = workspace / "metadata" / "entities"
        self._history_path = workspace / "metadata" / "governance" / "schema_history.json"
        self._lakehouse = lakehouse

    def derive_schema_from_entity(self, entity_id: str) -> pa.Schema:
        """Convert entity JSON definition to a PyArrow Schema."""
        entity_path = self._entities_dir / f"{entity_id}.json"
        if not entity_path.exists():
            raise FileNotFoundError(f"Entity {entity_id} not found at {entity_path}")

        with open(entity_path) as f:
            entity = json.load(f)

        fields = []
        for field_def in entity.get("fields", []):
            name = field_def["name"]
            type_str = field_def.get("type", "string")
            nullable = field_def.get("nullable", True)
            pa_type = TYPE_MAP.get(type_str, pa.string())
            fields.append(pa.field(name, pa_type, nullable=nullable))

        return pa.schema(fields)

    def detect_schema_drift(self, tier: str, table_name: str, entity_id: str) -> list[SchemaEvolution]:
        """Compare Iceberg table schema with entity definition. Return needed evolutions."""
        if not self._lakehouse or not self._lakehouse.table_exists(tier, table_name):
            return []

        entity_schema = self.derive_schema_from_entity(entity_id)
        current_fields = self._lakehouse.get_schema(tier, table_name)
        current_names = {f.name for f in current_fields}
        entity_names = {f.name for f in entity_schema}

        evolutions = []

        # New fields in entity not in Iceberg
        for field in entity_schema:
            if field.name not in current_names:
                evolutions.append(
                    SchemaEvolution(
                        table_name=table_name,
                        operation="add_column",
                        field_name=field.name,
                        details={
                            "type": str(field.type),
                            "nullable": str(field.nullable),
                        },
                    )
                )

        # Fields in Iceberg not in entity (dropped)
        for field in current_fields:
            if field.name not in entity_names:
                evolutions.append(
                    SchemaEvolution(
                        table_name=table_name,
                        operation="drop_column",
                        field_name=field.name,
                        details={"reason": "removed_from_entity_definition"},
                    )
                )

        return evolutions

    def apply_evolutions(self, tier: str, table_name: str, evolutions: list[SchemaEvolution]) -> None:
        """Apply schema evolutions to an Iceberg table and record history."""
        if not evolutions:
            return

        if not self._lakehouse:
            log.warning("No lakehouse — cannot apply schema evolutions for %s.%s", tier, table_name)
            return

        self._lakehouse.evolve_schema(tier, table_name, evolutions)
        self._record_history(evolutions)
        log.info("Applied %d schema evolutions to %s.%s", len(evolutions), tier, table_name)

    def get_schema_history(self, tier: str | None = None, table_name: str | None = None) -> list[SchemaEvolution]:
        """Return schema evolution history, optionally filtered."""
        history = self._load_history()
        if table_name:
            history = [h for h in history if h.table_name == table_name]
        return history

    def sync_all_schemas(self, tier: str) -> dict[str, list[SchemaEvolution]]:
        """Check all entity schemas against Iceberg tables in a tier. Return drifts found."""
        result: dict[str, list[SchemaEvolution]] = {}
        for entity_path in sorted(self._entities_dir.glob("*.json")):
            entity_id = entity_path.stem
            table_name = entity_id
            drifts = self.detect_schema_drift(tier, table_name, entity_id)
            if drifts:
                result[entity_id] = drifts
        return result

    def _record_history(self, evolutions: list[SchemaEvolution]) -> None:
        history = self._load_history()
        history.extend(evolutions)
        self._history_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._history_path, "w") as f:
            json.dump([e.model_dump(mode="json") for e in history], f, indent=2, default=str)

    def _load_history(self) -> list[SchemaEvolution]:
        if not self._history_path.exists():
            return []
        with open(self._history_path) as f:
            data = json.load(f)
        return [SchemaEvolution(**item) for item in data]
