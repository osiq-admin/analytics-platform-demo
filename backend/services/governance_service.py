"""PII/IPP governance service — dual-layer tagging (metadata registry + Iceberg table properties)."""

import json
import logging
from pathlib import Path

from backend.models.governance import (
    DataClassification,
    EntityGovernance,
    PIIField,
    PIIRegistry,
)
from backend.services.lakehouse_service import LakehouseService

log = logging.getLogger(__name__)


class GovernanceService:
    """Manages PII classification, Iceberg table tagging, and GDPR compliance metadata."""

    def __init__(self, workspace: Path, lakehouse: LakehouseService):
        self._workspace = workspace
        self._registry_path = workspace / "metadata" / "governance" / "pii_registry.json"
        self._lakehouse = lakehouse
        self._registry: PIIRegistry | None = None

    def load_pii_registry(self) -> PIIRegistry:
        if self._registry is not None:
            return self._registry
        if not self._registry_path.exists():
            self._registry = PIIRegistry()
            return self._registry
        with open(self._registry_path) as f:
            data = json.load(f)
        self._registry = PIIRegistry(**data)
        return self._registry

    def get_pii_fields(self, entity_id: str) -> list[PIIField]:
        registry = self.load_pii_registry()
        entity_gov = registry.entities.get(entity_id)
        if not entity_gov:
            return []
        return entity_gov.pii_fields

    def tag_iceberg_table(self, tier: str, table_name: str, entity_id: str) -> None:
        """Apply governance tags to an Iceberg table based on entity PII registry."""
        pii_fields = self.get_pii_fields(entity_id)
        if not pii_fields:
            return

        if not self._lakehouse.table_exists(tier, table_name):
            return

        props: dict[str, str] = {}
        pii_names = [f.field for f in pii_fields]
        props["governance.pii.contains"] = "true"
        props["governance.pii.fields"] = ",".join(pii_names)

        classifications = sorted({f.classification for f in pii_fields})
        props["governance.pii.max_classification"] = classifications[-1] if classifications else "LOW"

        regulations = sorted({r for f in pii_fields for r in f.regulation})
        if regulations:
            props["governance.regulations"] = ",".join(regulations)

        crypto_fields = [f.field for f in pii_fields if f.crypto_shred]
        if crypto_fields:
            props["governance.crypto_shred.fields"] = ",".join(crypto_fields)

        min_retention = min(f.retention_years for f in pii_fields)
        props["governance.retention.min_years"] = str(min_retention)

        self._lakehouse.set_table_properties(tier, table_name, props)
        log.info("Tagged %s.%s with %d governance properties", tier, table_name, len(props))

    def get_table_classification(self, tier: str, table_name: str) -> DataClassification:
        """Derive data classification for a table from registry + Iceberg properties."""
        # Try to infer entity_id from table_name
        pii_fields = self.get_pii_fields(table_name)

        pii_names = [f.field for f in pii_fields]
        regulations = sorted({r for f in pii_fields for r in f.regulation})
        crypto_fields = [f.field for f in pii_fields if f.crypto_shred]

        # Determine classification level
        if any(f.classification == "HIGH" for f in pii_fields):
            classification = "confidential"
        elif any(f.classification == "MEDIUM" for f in pii_fields):
            classification = "internal"
        else:
            classification = "public" if not pii_fields else "internal"

        return DataClassification(
            table_name=table_name,
            tier=tier,
            classification=classification,
            pii_fields=pii_names,
            regulations=regulations,
            crypto_shred_fields=crypto_fields,
        )

    def get_gdpr_affected_tables(self) -> list[str]:
        """Return entity names that have GDPR-regulated PII fields."""
        registry = self.load_pii_registry()
        result = []
        for entity_id, entity_gov in registry.entities.items():
            for field in entity_gov.pii_fields:
                if "GDPR" in field.regulation:
                    result.append(entity_id)
                    break
        return sorted(result)

    def get_crypto_shred_fields(self, entity_id: str) -> list[str]:
        """Return field names requiring crypto-shredding for GDPR erasure."""
        pii_fields = self.get_pii_fields(entity_id)
        return [f.field for f in pii_fields if f.crypto_shred]

    def tag_all_tables(self, tier: str) -> dict[str, int]:
        """Tag all Iceberg tables in a tier with governance properties. Returns {table: tag_count}."""
        registry = self.load_pii_registry()
        result: dict[str, int] = {}
        for table_name in self._lakehouse.list_tables(tier):
            if table_name in registry.entities:
                pii_count = len(registry.entities[table_name].pii_fields)
                self.tag_iceberg_table(tier, table_name, table_name)
                result[table_name] = pii_count
        return result

    def get_registry_summary(self) -> dict:
        """Return summary statistics for the PII registry."""
        registry = self.load_pii_registry()
        total_fields = 0
        total_crypto = 0
        all_regulations: set[str] = set()
        for entity_gov in registry.entities.values():
            total_fields += len(entity_gov.pii_fields)
            for f in entity_gov.pii_fields:
                if f.crypto_shred:
                    total_crypto += 1
                all_regulations.update(f.regulation)
        return {
            "registry_version": registry.registry_version,
            "entity_count": len(registry.entities),
            "total_pii_fields": total_fields,
            "crypto_shred_fields": total_crypto,
            "regulations": sorted(all_regulations),
        }
