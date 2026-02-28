"""Reference Data / MDM service — reconciliation engine for golden records."""
from __future__ import annotations

import time
from collections import Counter
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

from backend.db import DuckDBManager
from backend.models.reference import (
    CrossReference,
    FieldProvenance,
    GoldenRecord,
    GoldenRecordSet,
    ReconciliationResult,
    ReferenceConfig,
)
from backend.services.metadata_service import MetadataService


class ReferenceService:
    def __init__(self, workspace: Path, db: DuckDBManager, metadata: MetadataService):
        self._workspace = workspace
        self._db = db
        self._metadata = metadata

    # ---- Public API ----

    def generate_golden_records(self, entity: str) -> ReconciliationResult:
        """Generate golden records from source data via DuckDB."""
        start = time.monotonic()
        config = self._metadata.load_reference_config(entity)
        if not config:
            return ReconciliationResult(entity=entity)

        source_rows = self._query_source(entity)
        if not source_rows:
            return ReconciliationResult(entity=entity)

        groups = self._match_records(config, source_rows)
        records: list[GoldenRecord] = []
        now = datetime.now(timezone.utc).isoformat()

        for idx, (key_value, group) in enumerate(sorted(groups.items()), start=1):
            gr = self._merge_group(config, group, key_value, entity, idx, now)
            records.append(gr)

        record_set = GoldenRecordSet(
            entity=entity,
            golden_key=config.golden_key,
            record_count=len(records),
            records=records,
            last_reconciled=now,
        )
        self._metadata.save_golden_records(entity, record_set)

        duration = int((time.monotonic() - start) * 1000)
        conf_dist = self._confidence_distribution(records)

        return ReconciliationResult(
            entity=entity,
            total_source_records=len(source_rows),
            total_golden_records=len(records),
            new_records=len(records),
            updated_records=0,
            conflicts=0,
            unmatched=0,
            confidence_distribution=conf_dist,
            timestamp=now,
            duration_ms=duration,
        )

    def reconcile(self, entity: str) -> ReconciliationResult:
        """Re-reconcile against current source data, detecting changes."""
        start = time.monotonic()
        config = self._metadata.load_reference_config(entity)
        if not config:
            return ReconciliationResult(entity=entity)

        existing = self._metadata.load_golden_records(entity)
        existing_map: dict[str, GoldenRecord] = {}
        if existing:
            for r in existing.records:
                existing_map[r.natural_key] = r

        source_rows = self._query_source(entity)
        if not source_rows:
            return ReconciliationResult(entity=entity)

        groups = self._match_records(config, source_rows)
        records: list[GoldenRecord] = []
        now = datetime.now(timezone.utc).isoformat()
        new_count = 0
        updated_count = 0
        conflict_count = 0

        for idx, (key_value, group) in enumerate(sorted(groups.items()), start=1):
            if key_value in existing_map:
                old = existing_map[key_value]
                merged = self._merge_group(config, group, key_value, entity, idx, now)
                merged.golden_id = old.golden_id
                merged.version = old.version + 1
                if merged.data != old.data:
                    updated_count += 1
                records.append(merged)
            else:
                gr = self._merge_group(config, group, key_value, entity, idx, now)
                new_count += 1
                records.append(gr)

        record_set = GoldenRecordSet(
            entity=entity,
            golden_key=config.golden_key,
            record_count=len(records),
            records=records,
            last_reconciled=now,
        )
        self._metadata.save_golden_records(entity, record_set)

        duration = int((time.monotonic() - start) * 1000)
        conf_dist = self._confidence_distribution(records)

        return ReconciliationResult(
            entity=entity,
            total_source_records=len(source_rows),
            total_golden_records=len(records),
            new_records=new_count,
            updated_records=updated_count,
            conflicts=conflict_count,
            unmatched=0,
            confidence_distribution=conf_dist,
            timestamp=now,
            duration_ms=duration,
        )

    def override_field(self, entity: str, golden_id: str, field: str, value, notes: str = ""):
        """Manually override a field value in a golden record."""
        record_set = self._metadata.load_golden_records(entity)
        if not record_set:
            return None
        for rec in record_set.records:
            if rec.golden_id == golden_id:
                rec.data[field] = value
                rec.provenance[field] = FieldProvenance(
                    value=value,
                    source="manual_override",
                    confidence=1.0,
                    last_updated=datetime.now(timezone.utc).isoformat(),
                )
                rec.status = "manual_override"
                rec.notes = notes or f"Manual override of {field}"
                rec.version += 1
                self._metadata.save_golden_records(entity, record_set)
                return rec
        return None

    def get_cross_references(self, entity: str, golden_id: str) -> list[CrossReference]:
        """Find downstream records referencing this golden record."""
        record = self._metadata.load_golden_record(entity, golden_id)
        if not record:
            return []

        refs: list[CrossReference] = []
        key_value = record.natural_key

        # Define FK relationships
        fk_map: dict[str, list[tuple[str, str]]] = {
            "product": [("execution", "product_id"), ("order", "product_id")],
            "venue": [("execution", "venue_mic")],
            "account": [("order", "account_id")],
            "trader": [("order", "trader_id"), ("account", "primary_trader_id")],
        }

        for ref_entity, ref_field in fk_map.get(entity, []):
            try:
                cursor = self._db.cursor()
                lookup_field = ref_field
                cursor.execute(
                    f'SELECT COUNT(*) FROM "{ref_entity}" WHERE "{lookup_field}" = ?',
                    [key_value],
                )
                count = cursor.fetchone()[0]
                cursor.close()
                if count > 0:
                    refs.append(CrossReference(
                        golden_id=golden_id,
                        entity=entity,
                        referencing_entity=ref_entity,
                        referencing_field=ref_field,
                        reference_count=count,
                    ))
            except Exception:
                pass  # Table may not be loaded

        return refs

    def get_reconciliation_summary(self, entity: str) -> dict:
        """Summary stats for an entity's golden records."""
        record_set = self._metadata.load_golden_records(entity)
        if not record_set:
            return {
                "entity": entity,
                "total_records": 0,
                "confidence_distribution": {},
                "last_reconciled": "",
                "status_distribution": {},
            }

        conf_dist = self._confidence_distribution(record_set.records)
        status_dist: dict[str, int] = {}
        for r in record_set.records:
            status_dist[r.status] = status_dist.get(r.status, 0) + 1

        return {
            "entity": entity,
            "total_records": record_set.record_count,
            "confidence_distribution": conf_dist,
            "last_reconciled": record_set.last_reconciled,
            "status_distribution": status_dist,
        }

    # ---- Private helpers ----

    def _query_source(self, entity: str) -> list[dict]:
        """Read source records from DuckDB."""
        try:
            cursor = self._db.cursor()
            cursor.execute(f'SELECT * FROM "{entity}"')
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            cursor.close()
            return [dict(zip(columns, row)) for row in rows]
        except Exception:
            return []

    def _match_records(self, config: ReferenceConfig, source_rows: list[dict]) -> dict[str, list[dict]]:
        """Group source records by golden key using match rules."""
        groups: dict[str, list[dict]] = {}
        golden_key = config.golden_key

        for row in source_rows:
            key_value = str(row.get(golden_key, ""))
            if key_value:
                groups.setdefault(key_value, []).append(row)

        return groups

    def _merge_group(
        self,
        config: ReferenceConfig,
        group: list[dict],
        golden_key_value: str,
        entity: str,
        index: int,
        timestamp: str,
    ) -> GoldenRecord:
        """Merge a group of source records into a single golden record."""
        prefix = entity[:3].upper()
        golden_id = f"GR-{prefix}-{index:04d}"

        # Collect all fields from the group
        all_fields: set[str] = set()
        for row in group:
            all_fields.update(row.keys())

        # Build merged data and provenance
        merge_rules_map = {r.field: r for r in config.merge_rules}
        data: dict = {}
        provenance: dict[str, FieldProvenance] = {}

        for field in sorted(all_fields):
            values = [row.get(field) for row in group if row.get(field) is not None and str(row.get(field)) != ""]
            if not values:
                continue

            rule = merge_rules_map.get(field)
            if rule:
                merged_value, confidence = self._apply_merge_strategy(
                    rule.strategy, values, rule.source_priority
                )
            else:
                # Default: take first non-null value
                merged_value = values[0]
                confidence = 1.0

            coerced = self._coerce_value(merged_value)
            data[field] = coerced
            provenance[field] = FieldProvenance(
                value=coerced,
                source=f"csv:{entity}.csv",
                confidence=confidence,
                last_updated=timestamp,
            )

        source_records = [f"{entity}.csv:{i}" for i in range(len(group))]
        avg_confidence = (
            sum(p.confidence for p in provenance.values()) / len(provenance)
            if provenance
            else 1.0
        )

        return GoldenRecord(
            golden_id=golden_id,
            entity=entity,
            natural_key=golden_key_value,
            data=data,
            provenance=provenance,
            source_records=source_records,
            confidence_score=round(avg_confidence, 4),
            last_reconciled=timestamp,
            status="active",
            version=1,
        )

    @staticmethod
    def _coerce_value(value):
        """Coerce non-primitive DuckDB types to JSON-serializable primitives."""
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, Decimal):
            return float(value)
        return str(value)

    def _apply_merge_strategy(
        self, strategy: str, values: list, source_priority: list[str] | None
    ) -> tuple:
        """Apply a merge strategy. Returns (value, confidence)."""
        if not values:
            return (None, 0.0)

        if strategy == "longest":
            str_values = [str(v) for v in values]
            result = max(str_values, key=len)
            return (result, 1.0)

        if strategy == "shortest":
            str_values = [str(v) for v in values]
            result = min(str_values, key=len)
            return (result, 1.0)

        if strategy == "most_frequent":
            counter = Counter(str(v) for v in values)
            most_common = counter.most_common(1)[0]
            confidence = most_common[1] / len(values)
            return (most_common[0], round(confidence, 4))

        if strategy == "most_recent":
            return (values[-1], 1.0)

        if strategy == "source_priority" and source_priority:
            # In a single-source scenario, just take the first value
            return (values[0], 1.0)

        # Default fallback
        return (values[0], 1.0)

    def _confidence_distribution(self, records: list[GoldenRecord]) -> dict[str, int]:
        """Bucket confidence scores into distribution."""
        dist = {"high": 0, "medium": 0, "low": 0}
        for r in records:
            if r.confidence_score >= 0.9:
                dist["high"] += 1
            elif r.confidence_score >= 0.7:
                dist["medium"] += 1
            else:
                dist["low"] += 1
        return dist
