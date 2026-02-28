# Phase 18: Data Quality, Quarantine & Profiling — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build ISO 8000/25012-aligned quality scoring, quarantine tier for failed records, and a DataQuality dashboard view — extending the Phase 17 Contract Validator into a full quality engine with per-dimension scores, investigation workflow, and quality trend tracking.

**Architecture:** Quality dimensions, rules, and profiles are all JSON metadata. The quality engine extends the existing ContractValidator (4 rule types) with 4 new rule types (regex_match, referential_integrity, freshness, custom_sql) and per-dimension weighted scoring. Failed records flow to the existing Quarantine tier (#3 in medallion tiers, already defined with `mutable: true`). A new DataQuality view (19th view) provides spider charts, quarantine queue, quality trends, and data profiling. All quality behavior reads from metadata — nothing hardcoded.

**Tech Stack:** Python FastAPI, DuckDB, PyArrow, Pydantic v2, React 19, TypeScript, Vite, Zustand, Tailwind CSS 4, Recharts (RadarChart for spider plots, LineChart for trends), AG Grid (quarantine queue)

---

## Context

**Current state (Phase 17 complete, M0-M204):**
- 18 views, 800 tests (590 backend + 210 E2E), 969 modules, 82 architecture sections
- Contract Validator (`backend/services/contract_validator.py`) handles 4 rule types: not_null, range_check, enum_check, unique
- 7 data contracts in `workspace/metadata/medallion/contracts/` with quality_rules arrays
- Pipeline Orchestrator calls contract validation after stage execution
- Quarantine tier (#3) defined in `workspace/metadata/medallion/tiers.json` with `mutable: true`, `quality_gate: "quarantine_reason"`
- TransformationStep model has `error_handling: "quarantine"` field (not yet wired)
- `referential_integrity` rules exist in contracts but have no handler yet

**What Phase 18 builds:**
1. Quality dimension metadata (ISO 8000/25012) — 7 weighted dimensions
2. Quality engine extending ContractValidator — 4 new rule types + per-dimension scoring
3. Quarantine service — capture failed records, retry/override with audit logging
4. DataQuality dashboard view — spider charts, quarantine queue, quality trends, profiling

**Milestone range:** M205-M215

---

## Task 1: Quality Dimension Metadata + Pydantic Models (M205)

Create the ISO 8000/25012-aligned quality dimension definitions and Pydantic models.

**Files:**
- Create: `workspace/metadata/quality/dimensions.json`
- Create: `backend/models/quality.py`
- Create: `tests/test_quality_models.py`

**Step 1: Create quality dimensions metadata**

Create directory and file `workspace/metadata/quality/dimensions.json`:

```json
{
  "dimensions": [
    {
      "id": "completeness",
      "name": "Completeness",
      "iso_ref": "ISO/IEC 25012:2008 §4.2.1",
      "description": "Ratio of non-null required values to total expected values",
      "weight": 0.20,
      "rule_types": ["not_null"],
      "score_method": "ratio",
      "thresholds": { "good": 99, "warning": 95, "critical": 90 }
    },
    {
      "id": "accuracy",
      "name": "Accuracy",
      "iso_ref": "ISO/IEC 25012:2008 §4.2.2",
      "description": "Values match real-world truth within defined bounds",
      "weight": 0.20,
      "rule_types": ["range_check", "enum_check", "regex_match"],
      "score_method": "ratio",
      "thresholds": { "good": 99, "warning": 95, "critical": 90 }
    },
    {
      "id": "consistency",
      "name": "Consistency",
      "iso_ref": "ISO/IEC 25012:2008 §4.2.3",
      "description": "No contradictions within or across datasets",
      "weight": 0.15,
      "rule_types": ["referential_integrity", "custom_sql"],
      "score_method": "ratio",
      "thresholds": { "good": 99, "warning": 95, "critical": 90 }
    },
    {
      "id": "timeliness",
      "name": "Timeliness",
      "iso_ref": "ISO/IEC 25012:2008 §4.2.4",
      "description": "Data available within agreed SLA timeframe",
      "weight": 0.15,
      "rule_types": ["freshness"],
      "score_method": "binary",
      "thresholds": { "good": 100, "warning": 50, "critical": 0 }
    },
    {
      "id": "uniqueness",
      "name": "Uniqueness",
      "iso_ref": "ISO/IEC 25012:2008 §4.2.5",
      "description": "No duplicate records for the same real-world entity",
      "weight": 0.10,
      "rule_types": ["unique"],
      "score_method": "ratio",
      "thresholds": { "good": 100, "warning": 99, "critical": 95 }
    },
    {
      "id": "validity",
      "name": "Validity",
      "iso_ref": "ISO/IEC 25012:2008 §4.2.6",
      "description": "Values conform to defined domain rules and formats",
      "weight": 0.10,
      "rule_types": ["enum_check", "regex_match", "range_check"],
      "score_method": "ratio",
      "thresholds": { "good": 99, "warning": 95, "critical": 90 }
    },
    {
      "id": "currentness",
      "name": "Currentness",
      "iso_ref": "ISO 8000-61",
      "description": "Data reflects the current state of real-world objects",
      "weight": 0.10,
      "rule_types": ["freshness"],
      "score_method": "binary",
      "thresholds": { "good": 100, "warning": 50, "critical": 0 }
    }
  ]
}
```

**Step 2: Create Pydantic models**

Create `backend/models/quality.py`:

```python
"""Pydantic models for data quality dimensions, scores, and quarantine records."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal


class QualityDimension(BaseModel):
    """A single quality dimension (ISO 8000/25012-aligned)."""
    id: str
    name: str
    iso_ref: str = ""
    description: str = ""
    weight: float = 0.0
    rule_types: list[str] = Field(default_factory=list)
    score_method: Literal["ratio", "binary"] = "ratio"
    thresholds: dict[str, float] = Field(default_factory=dict)


class QualityDimensionsConfig(BaseModel):
    """Top-level wrapper for quality dimensions metadata."""
    dimensions: list[QualityDimension] = Field(default_factory=list)


class DimensionScore(BaseModel):
    """Score for a single quality dimension."""
    dimension_id: str
    score: float = 100.0
    rules_evaluated: int = 0
    rules_passed: int = 0
    violation_count: int = 0
    total_count: int = 0
    status: Literal["good", "warning", "critical"] = "good"


class EntityQualityScore(BaseModel):
    """Aggregate quality score for an entity at a specific tier."""
    entity: str
    tier: str
    overall_score: float = 100.0
    dimension_scores: list[DimensionScore] = Field(default_factory=list)
    timestamp: str = ""
    contract_id: str = ""


class QuarantineRecord(BaseModel):
    """A record that failed quality validation and was quarantined."""
    record_id: str
    source_tier: str
    target_tier: str
    entity: str
    failed_rules: list[dict] = Field(default_factory=list)
    original_data: dict = Field(default_factory=dict)
    timestamp: str = ""
    retry_count: int = 0
    status: Literal["pending", "retried", "overridden", "discarded"] = "pending"
    notes: str = ""


class QuarantineSummary(BaseModel):
    """Summary statistics for quarantine queue."""
    total_records: int = 0
    by_entity: dict[str, int] = Field(default_factory=dict)
    by_tier_transition: dict[str, int] = Field(default_factory=dict)
    by_rule_type: dict[str, int] = Field(default_factory=dict)
    by_status: dict[str, int] = Field(default_factory=dict)


class QualityProfile(BaseModel):
    """Data profiling result for a single field."""
    field_name: str
    total_count: int = 0
    null_count: int = 0
    null_pct: float = 0.0
    distinct_count: int = 0
    min_value: str = ""
    max_value: str = ""
    top_values: list[dict] = Field(default_factory=list)


class EntityProfile(BaseModel):
    """Data profiling result for an entity."""
    entity: str
    tier: str
    table_name: str = ""
    row_count: int = 0
    field_profiles: list[QualityProfile] = Field(default_factory=list)
```

**Step 3: Write model tests**

Create `tests/test_quality_models.py`:

```python
"""Tests for quality Pydantic models."""
import json
from pathlib import Path
import pytest
from backend.models.quality import (
    QualityDimension,
    QualityDimensionsConfig,
    DimensionScore,
    EntityQualityScore,
    QuarantineRecord,
    QuarantineSummary,
    QualityProfile,
    EntityProfile,
)


class TestQualityDimensionModels:
    def test_dimension_defaults(self):
        d = QualityDimension(id="completeness", name="Completeness")
        assert d.weight == 0.0
        assert d.score_method == "ratio"
        assert d.rule_types == []

    def test_dimension_with_all_fields(self):
        d = QualityDimension(
            id="accuracy",
            name="Accuracy",
            iso_ref="ISO/IEC 25012:2008 §4.2.2",
            weight=0.2,
            rule_types=["range_check", "enum_check"],
            score_method="ratio",
            thresholds={"good": 99, "warning": 95, "critical": 90},
        )
        assert d.weight == 0.2
        assert len(d.rule_types) == 2
        assert d.thresholds["good"] == 99

    def test_dimensions_config(self):
        cfg = QualityDimensionsConfig(dimensions=[
            QualityDimension(id="completeness", name="Completeness", weight=0.2),
            QualityDimension(id="accuracy", name="Accuracy", weight=0.2),
        ])
        assert len(cfg.dimensions) == 2
        total_weight = sum(d.weight for d in cfg.dimensions)
        assert total_weight == pytest.approx(0.4)

    def test_dimensions_metadata_loads(self):
        path = Path("workspace/metadata/quality/dimensions.json")
        if path.exists():
            data = json.loads(path.read_text())
            cfg = QualityDimensionsConfig.model_validate(data)
            assert len(cfg.dimensions) == 7
            total_weight = sum(d.weight for d in cfg.dimensions)
            assert total_weight == pytest.approx(1.0)


class TestDimensionScore:
    def test_defaults(self):
        ds = DimensionScore(dimension_id="completeness")
        assert ds.score == 100.0
        assert ds.status == "good"

    def test_with_violations(self):
        ds = DimensionScore(
            dimension_id="completeness",
            score=95.5,
            rules_evaluated=3,
            rules_passed=2,
            violation_count=5,
            total_count=100,
            status="warning",
        )
        assert ds.score == 95.5
        assert ds.status == "warning"


class TestEntityQualityScore:
    def test_defaults(self):
        eqs = EntityQualityScore(entity="execution", tier="silver")
        assert eqs.overall_score == 100.0
        assert eqs.dimension_scores == []

    def test_with_dimensions(self):
        eqs = EntityQualityScore(
            entity="execution",
            tier="silver",
            overall_score=97.5,
            dimension_scores=[
                DimensionScore(dimension_id="completeness", score=100.0),
                DimensionScore(dimension_id="accuracy", score=95.0, status="warning"),
            ],
        )
        assert len(eqs.dimension_scores) == 2
        assert eqs.dimension_scores[1].status == "warning"


class TestQuarantineRecord:
    def test_defaults(self):
        qr = QuarantineRecord(
            record_id="q1",
            source_tier="bronze",
            target_tier="silver",
            entity="execution",
        )
        assert qr.status == "pending"
        assert qr.retry_count == 0

    def test_with_failed_rules(self):
        qr = QuarantineRecord(
            record_id="q2",
            source_tier="bronze",
            target_tier="silver",
            entity="execution",
            failed_rules=[
                {"rule": "not_null", "field": "order_id", "error": "NULL value"},
                {"rule": "referential_integrity", "field": "product_id", "error": "No match"},
            ],
            original_data={"execution_id": "E001", "order_id": None},
            status="pending",
        )
        assert len(qr.failed_rules) == 2
        assert qr.original_data["order_id"] is None


class TestQuarantineSummary:
    def test_defaults(self):
        qs = QuarantineSummary()
        assert qs.total_records == 0

    def test_with_data(self):
        qs = QuarantineSummary(
            total_records=15,
            by_entity={"execution": 10, "order": 5},
            by_rule_type={"not_null": 8, "referential_integrity": 7},
            by_status={"pending": 12, "retried": 3},
        )
        assert qs.total_records == 15
        assert qs.by_entity["execution"] == 10


class TestQualityProfile:
    def test_defaults(self):
        qp = QualityProfile(field_name="price")
        assert qp.null_pct == 0.0

    def test_with_stats(self):
        qp = QualityProfile(
            field_name="price",
            total_count=1000,
            null_count=5,
            null_pct=0.5,
            distinct_count=450,
            min_value="0.01",
            max_value="99999.99",
            top_values=[{"value": "100.00", "count": 15}],
        )
        assert qp.null_pct == 0.5


class TestEntityProfile:
    def test_defaults(self):
        ep = EntityProfile(entity="execution", tier="bronze")
        assert ep.row_count == 0
        assert ep.field_profiles == []
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_quality_models.py -v
```
Expected: 14 passed

**Step 5: Commit**

```bash
git add workspace/metadata/quality/dimensions.json backend/models/quality.py tests/test_quality_models.py
git commit -m "feat(quality): add ISO 8000/25012 quality dimension metadata + Pydantic models (M205)"
```

---

## Task 2: Quality Engine — Extend ContractValidator with New Rule Types (M206)

Add 4 new rule handlers to ContractValidator: regex_match, referential_integrity, freshness, custom_sql. These are referenced in existing data contracts but have no handler.

**Files:**
- Modify: `backend/services/contract_validator.py`
- Modify: `backend/models/medallion.py` (add regex/pattern field to QualityRule)
- Modify: `tests/test_contract_validator.py`

**Step 1: Add pattern field to QualityRule**

In `backend/models/medallion.py`, add `pattern` field to QualityRule (line 37):

```python
class QualityRule(BaseModel):
    """A single data quality rule within a contract."""
    rule: str
    fields: list[str] = Field(default_factory=list)
    field: str | None = None
    reference: str | None = None
    min: float | None = None
    max: float | None = None
    values: list[str] = Field(default_factory=list)
    pattern: str | None = None  # regex pattern for regex_match
    sql: str | None = None  # custom SQL expression for custom_sql
    freshness_minutes: int | None = None  # max age for freshness check
    timestamp_field: str | None = None  # field to check for freshness
```

**Step 2: Add rule handlers to ContractValidator**

In `backend/services/contract_validator.py`, add after `_check_unique` (line 211):

```python
    def _check_regex_match(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that a field matches a regex pattern."""
        field_name = rule.field or ""
        pattern = rule.pattern or ".*"
        try:
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '
                f"SUM(CASE WHEN NOT regexp_matches(\"{field_name}\", '{pattern}') THEN 1 ELSE 0 END) AS violations "
                f'FROM "{table_name}" WHERE "{field_name}" IS NOT NULL'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            violations = int(row["violations"])
            return RuleResult(
                rule="regex_match",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} pattern mismatch(es) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="regex_match", field=field_name, passed=False, details=f"error: {exc}"
            )

    def _check_referential_integrity(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that a field's values exist in a referenced table.field."""
        field_name = rule.field or ""
        reference = rule.reference or ""  # format: "table.field"
        try:
            ref_parts = reference.split(".")
            if len(ref_parts) != 2:
                return RuleResult(
                    rule="referential_integrity", field=field_name, passed=False,
                    details=f"invalid reference format: '{reference}' (expected 'table.field')",
                )
            ref_table, ref_field = ref_parts
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '
                f'SUM(CASE WHEN "{field_name}" NOT IN (SELECT DISTINCT "{ref_field}" FROM "{ref_table}") '
                f'THEN 1 ELSE 0 END) AS violations '
                f'FROM "{table_name}" WHERE "{field_name}" IS NOT NULL'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            violations = int(row["violations"])
            return RuleResult(
                rule="referential_integrity",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} orphan(s) in {total} rows (ref: {reference})",
            )
        except Exception as exc:
            return RuleResult(
                rule="referential_integrity", field=field_name, passed=False,
                details=f"error: {exc}",
            )

    def _check_freshness(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that data is not older than allowed freshness window."""
        ts_field = rule.timestamp_field or rule.field or ""
        freshness_min = rule.freshness_minutes or 60
        try:
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '
                f"SUM(CASE WHEN \"{ts_field}\"::TIMESTAMP < NOW() - INTERVAL '{freshness_min} minutes' "
                f'THEN 1 ELSE 0 END) AS stale '
                f'FROM "{table_name}" WHERE "{ts_field}" IS NOT NULL'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            stale = int(row["stale"])
            return RuleResult(
                rule="freshness",
                field=ts_field,
                passed=stale == 0,
                violation_count=stale,
                total_count=total,
                details=f"{stale} stale record(s) in {total} rows (>{freshness_min}min)",
            )
        except Exception as exc:
            return RuleResult(
                rule="freshness", field=ts_field, passed=False, details=f"error: {exc}"
            )

    def _check_custom_sql(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Execute a custom SQL expression that returns violation_count and total_count."""
        field_name = rule.field or "custom"
        sql_expr = rule.sql or ""
        if not sql_expr:
            return RuleResult(
                rule="custom_sql", field=field_name, passed=False,
                details="no SQL expression provided",
            )
        try:
            cursor = self._db.cursor()
            # Custom SQL must return columns: total, violations
            final_sql = sql_expr.replace("{table}", f'"{table_name}"')
            result = cursor.execute(final_sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row.get("total", 0))
            violations = int(row.get("violations", 0))
            return RuleResult(
                rule="custom_sql",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} violation(s) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="custom_sql", field=field_name, passed=False, details=f"error: {exc}"
            )
```

Also update the class docstring to list all 8 rule types.

**Step 3: Write tests for new rule types**

Add to `tests/test_contract_validator.py`:

```python
class TestRegexMatch:
    def test_regex_passes(self, db, contract):
        """ISIN-like pattern passes when all values match."""
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_products (isin VARCHAR)")
        cursor.execute("INSERT INTO test_products VALUES ('US0378331005'), ('GB0002634946')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="regex_match", field="isin", pattern="^[A-Z]{2}[A-Z0-9]{10}$")]
        result = ContractValidator(db).validate(contract, "test_products")
        assert result.rule_results[0].passed is True

    def test_regex_fails(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_products2 (isin VARCHAR)")
        cursor.execute("INSERT INTO test_products2 VALUES ('US0378331005'), ('invalid')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="regex_match", field="isin", pattern="^[A-Z]{2}[A-Z0-9]{10}$")]
        result = ContractValidator(db).validate(contract, "test_products2")
        assert result.rule_results[0].passed is False
        assert result.rule_results[0].violation_count == 1


class TestReferentialIntegrity:
    def test_referential_integrity_passes(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE ref_orders (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_orders VALUES ('O1'), ('O2')")
        cursor.execute("CREATE TABLE ref_exec (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_exec VALUES ('O1'), ('O2')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="referential_integrity", field="order_id", reference="ref_orders.order_id")]
        result = ContractValidator(db).validate(contract, "ref_exec")
        assert result.rule_results[0].passed is True

    def test_referential_integrity_fails(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE ref_orders2 (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_orders2 VALUES ('O1')")
        cursor.execute("CREATE TABLE ref_exec2 (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_exec2 VALUES ('O1'), ('O999')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="referential_integrity", field="order_id", reference="ref_orders2.order_id")]
        result = ContractValidator(db).validate(contract, "ref_exec2")
        assert result.rule_results[0].passed is False
        assert result.rule_results[0].violation_count == 1

    def test_invalid_reference_format(self, db, contract):
        contract.quality_rules = [QualityRule(rule="referential_integrity", field="x", reference="bad_format")]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is False
        assert "invalid reference format" in result.rule_results[0].details


class TestFreshness:
    def test_freshness_passes(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE fresh_data (ts TIMESTAMP)")
        cursor.execute("INSERT INTO fresh_data VALUES (NOW()), (NOW() - INTERVAL '5 minutes')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="freshness", field="ts", freshness_minutes=60)]
        result = ContractValidator(db).validate(contract, "fresh_data")
        assert result.rule_results[0].passed is True

    def test_freshness_fails(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE stale_data (ts TIMESTAMP)")
        cursor.execute("INSERT INTO stale_data VALUES (NOW() - INTERVAL '2 hours')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="freshness", field="ts", freshness_minutes=60)]
        result = ContractValidator(db).validate(contract, "stale_data")
        assert result.rule_results[0].passed is False
        assert result.rule_results[0].violation_count == 1


class TestCustomSQL:
    def test_custom_sql_passes(self, db, contract):
        contract.quality_rules = [QualityRule(
            rule="custom_sql", field="score",
            sql="SELECT COUNT(*) AS total, SUM(CASE WHEN score < 0 THEN 1 ELSE 0 END) AS violations FROM {table}",
        )]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is True

    def test_custom_sql_fails(self, db, contract):
        contract.quality_rules = [QualityRule(
            rule="custom_sql", field="score",
            sql="SELECT COUNT(*) AS total, SUM(CASE WHEN score > 50 THEN 1 ELSE 0 END) AS violations FROM {table}",
        )]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is False

    def test_custom_sql_no_expression(self, db, contract):
        contract.quality_rules = [QualityRule(rule="custom_sql", field="x")]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is False
        assert "no SQL expression" in result.rule_results[0].details
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_contract_validator.py -v
```
Expected: 22 passed (11 existing + 11 new)

**Step 5: Commit**

```bash
git add backend/services/contract_validator.py backend/models/medallion.py tests/test_contract_validator.py
git commit -m "feat(quality): add regex_match, referential_integrity, freshness, custom_sql rule types (M206)"
```

---

## Task 3: Quality Engine — Per-Dimension Weighted Scoring (M207)

Create the quality engine that wraps ContractValidator and produces per-dimension weighted scores using the ISO dimensions metadata.

**Files:**
- Create: `backend/engine/quality_engine.py`
- Modify: `backend/services/metadata_service.py` (add load_quality_dimensions)
- Create: `tests/test_quality_engine.py`

**Step 1: Add MetadataService method**

In `backend/services/metadata_service.py`, add after the `list_data_contracts` method:

```python
    def load_quality_dimensions(self) -> "QualityDimensionsConfig":
        from backend.models.quality import QualityDimensionsConfig
        path = self._base / "quality" / "dimensions.json"
        if not path.exists():
            return QualityDimensionsConfig()
        return QualityDimensionsConfig.model_validate_json(path.read_text())
```

**Step 2: Create quality engine**

Create `backend/engine/quality_engine.py`:

```python
"""Quality engine for ISO 8000/25012-aligned per-dimension scoring.

Wraps ContractValidator to produce weighted dimension scores from data
contract quality rules evaluated against DuckDB tables.
"""
from __future__ import annotations

from backend.db import DuckDBManager
from backend.models.medallion import DataContract
from backend.models.quality import (
    DimensionScore,
    EntityQualityScore,
    QualityDimensionsConfig,
    EntityProfile,
    QualityProfile,
)
from backend.services.contract_validator import ContractValidator, RuleResult


# Map each rule type to its primary quality dimension
_RULE_TO_DIMENSION: dict[str, str] = {
    "not_null": "completeness",
    "unique": "uniqueness",
    "range_check": "accuracy",
    "enum_check": "validity",
    "regex_match": "validity",
    "referential_integrity": "consistency",
    "freshness": "timeliness",
    "custom_sql": "consistency",
}


class QualityEngine:
    """Evaluates data quality rules and produces ISO 8000/25012 dimension scores.

    Uses ContractValidator for rule evaluation, then maps rule results
    to quality dimensions with weighted scoring.
    """

    def __init__(self, db: DuckDBManager, dimensions: QualityDimensionsConfig) -> None:
        self._db = db
        self._validator = ContractValidator(db)
        self._dimensions = {d.id: d for d in dimensions.dimensions}

    def score_entity(
        self, contract: DataContract, table_name: str,
    ) -> EntityQualityScore:
        """Evaluate contract rules and compute per-dimension quality scores.

        Returns an EntityQualityScore with overall weighted score and
        per-dimension breakdowns.
        """
        validation = self._validator.validate(contract, table_name)

        # Group rule results by dimension
        dim_results: dict[str, list[RuleResult]] = {d_id: [] for d_id in self._dimensions}
        for rr in validation.rule_results:
            dim_id = _RULE_TO_DIMENSION.get(rr.rule, "consistency")
            if dim_id in dim_results:
                dim_results[dim_id].append(rr)

        # Compute per-dimension scores
        dimension_scores: list[DimensionScore] = []
        for dim_id, dim_def in self._dimensions.items():
            rules = dim_results.get(dim_id, [])
            if not rules:
                dimension_scores.append(DimensionScore(dimension_id=dim_id, score=100.0))
                continue

            total_evaluated = len(rules)
            total_passed = sum(1 for r in rules if r.passed)
            total_violations = sum(r.violation_count for r in rules)
            total_records = max((r.total_count for r in rules), default=0)

            if dim_def.score_method == "binary":
                score = 100.0 if total_passed == total_evaluated else 0.0
            else:
                score = round((total_passed / total_evaluated) * 100, 1) if total_evaluated > 0 else 100.0

            # Determine status from thresholds
            thresholds = dim_def.thresholds
            if score >= thresholds.get("good", 99):
                status = "good"
            elif score >= thresholds.get("warning", 95):
                status = "warning"
            else:
                status = "critical"

            dimension_scores.append(DimensionScore(
                dimension_id=dim_id,
                score=score,
                rules_evaluated=total_evaluated,
                rules_passed=total_passed,
                violation_count=total_violations,
                total_count=total_records,
                status=status,
            ))

        # Compute weighted overall score
        overall = 0.0
        total_weight = 0.0
        for ds in dimension_scores:
            dim_def = self._dimensions.get(ds.dimension_id)
            weight = dim_def.weight if dim_def else 0.0
            overall += ds.score * weight
            total_weight += weight

        if total_weight > 0:
            overall = round(overall / total_weight, 1)

        return EntityQualityScore(
            entity=contract.entity,
            tier=contract.target_tier,
            overall_score=overall,
            dimension_scores=dimension_scores,
            contract_id=contract.contract_id,
        )

    def profile_entity(self, table_name: str, entity: str, tier: str) -> EntityProfile:
        """Profile all columns of a table for data quality analysis.

        Returns per-field statistics: null count, distinct count, min/max,
        top values.
        """
        try:
            cursor = self._db.cursor()
            # Get column names
            cursor.execute(f'SELECT * FROM "{table_name}" LIMIT 0')
            columns = [desc[0] for desc in cursor.description]
            cursor.close()

            # Get row count
            cursor = self._db.cursor()
            row = cursor.execute(f'SELECT COUNT(*) AS cnt FROM "{table_name}"').fetchone()
            row_count = int(row[0]) if row else 0
            cursor.close()

            field_profiles: list[QualityProfile] = []
            for col in columns:
                cursor = self._db.cursor()
                sql = (
                    f'SELECT '
                    f'COUNT(*) AS total, '
                    f'SUM(CASE WHEN "{col}" IS NULL THEN 1 ELSE 0 END) AS nulls, '
                    f'COUNT(DISTINCT "{col}") AS distincts, '
                    f'MIN("{col}")::VARCHAR AS min_val, '
                    f'MAX("{col}")::VARCHAR AS max_val '
                    f'FROM "{table_name}"'
                )
                result = cursor.execute(sql)
                cols = [desc[0] for desc in result.description]
                r = dict(zip(cols, result.fetchone()))
                cursor.close()

                total = int(r["total"])
                nulls = int(r["nulls"])
                field_profiles.append(QualityProfile(
                    field_name=col,
                    total_count=total,
                    null_count=nulls,
                    null_pct=round((nulls / total) * 100, 2) if total > 0 else 0.0,
                    distinct_count=int(r["distincts"]),
                    min_value=str(r["min_val"] or ""),
                    max_value=str(r["max_val"] or ""),
                ))

            return EntityProfile(
                entity=entity,
                tier=tier,
                table_name=table_name,
                row_count=row_count,
                field_profiles=field_profiles,
            )
        except Exception:
            return EntityProfile(entity=entity, tier=tier, table_name=table_name)
```

**Step 3: Write quality engine tests**

Create `tests/test_quality_engine.py`:

```python
"""Tests for the quality engine with per-dimension scoring."""
import duckdb
import pytest
from backend.models.medallion import DataContract, QualityRule
from backend.models.quality import QualityDimensionsConfig, QualityDimension
from backend.engine.quality_engine import QualityEngine


@pytest.fixture
def db():
    conn = duckdb.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE test_exec (
            execution_id VARCHAR, order_id VARCHAR, product_id VARCHAR,
            price DOUBLE, side VARCHAR, ts TIMESTAMP
        )
    """)
    cursor.execute("""
        INSERT INTO test_exec VALUES
        ('E1', 'O1', 'P1', 100.0, 'BUY', NOW()),
        ('E2', 'O2', 'P2', 200.0, 'SELL', NOW()),
        ('E3', 'O3', 'P3', 150.0, 'BUY', NOW())
    """)
    cursor.execute("CREATE TABLE ref_orders (order_id VARCHAR)")
    cursor.execute("INSERT INTO ref_orders VALUES ('O1'), ('O2'), ('O3')")
    cursor.close()
    yield conn
    conn.close()


@pytest.fixture
def dimensions():
    return QualityDimensionsConfig(dimensions=[
        QualityDimension(id="completeness", name="Completeness", weight=0.3, rule_types=["not_null"], score_method="ratio", thresholds={"good": 99, "warning": 95, "critical": 90}),
        QualityDimension(id="accuracy", name="Accuracy", weight=0.3, rule_types=["range_check"], score_method="ratio", thresholds={"good": 99, "warning": 95, "critical": 90}),
        QualityDimension(id="uniqueness", name="Uniqueness", weight=0.2, rule_types=["unique"], score_method="ratio", thresholds={"good": 100, "warning": 99, "critical": 95}),
        QualityDimension(id="consistency", name="Consistency", weight=0.2, rule_types=["referential_integrity"], score_method="ratio", thresholds={"good": 99, "warning": 95, "critical": 90}),
    ])


@pytest.fixture
def contract():
    return DataContract(
        contract_id="test_quality", source_tier="bronze", target_tier="silver", entity="execution",
    )


class TestQualityEngineScoring:
    def test_all_rules_pass_gives_100(self, db, dimensions, contract):
        contract.quality_rules = [
            QualityRule(rule="not_null", fields=["execution_id", "order_id"]),
            QualityRule(rule="range_check", field="price", min=0, max=1000),
            QualityRule(rule="unique", field="execution_id"),
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        assert score.overall_score == 100.0
        assert all(ds.status == "good" for ds in score.dimension_scores)

    def test_failed_rule_reduces_dimension_score(self, db, dimensions, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE bad_exec (execution_id VARCHAR, price DOUBLE)")
        cursor.execute("INSERT INTO bad_exec VALUES ('E1', 100.0), ('E2', -5.0)")
        cursor.close()
        contract.quality_rules = [
            QualityRule(rule="not_null", fields=["execution_id"]),
            QualityRule(rule="range_check", field="price", min=0, max=1000),
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "bad_exec")
        # completeness passes (100), accuracy fails (0), overall < 100
        accuracy = next(d for d in score.dimension_scores if d.dimension_id == "accuracy")
        assert accuracy.score == 0.0
        assert accuracy.status == "critical"
        assert score.overall_score < 100.0

    def test_weighted_overall_score(self, db, dimensions, contract):
        """2 dimensions with rules, 1 passes 1 fails — overall is weighted."""
        cursor = db.cursor()
        cursor.execute("CREATE TABLE weighted_test (id VARCHAR, val DOUBLE)")
        cursor.execute("INSERT INTO weighted_test VALUES ('A', 10), ('B', 20)")
        cursor.close()
        contract.quality_rules = [
            QualityRule(rule="not_null", fields=["id"]),  # completeness passes (weight 0.3)
            QualityRule(rule="range_check", field="val", min=100, max=200),  # accuracy fails (weight 0.3)
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "weighted_test")
        # completeness=100*0.3=30, accuracy=0*0.3=0, uniqueness/consistency=100*0.2+100*0.2=40
        # total weight=1.0, overall=70.0
        assert score.overall_score == pytest.approx(70.0, abs=0.5)

    def test_no_rules_gives_100(self, db, dimensions, contract):
        contract.quality_rules = []
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        assert score.overall_score == 100.0

    def test_entity_and_tier_in_result(self, db, dimensions, contract):
        contract.quality_rules = []
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        assert score.entity == "execution"
        assert score.tier == "silver"
        assert score.contract_id == "test_quality"

    def test_referential_integrity_scored_under_consistency(self, db, dimensions, contract):
        contract.quality_rules = [
            QualityRule(rule="referential_integrity", field="order_id", reference="ref_orders.order_id"),
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        consistency = next(d for d in score.dimension_scores if d.dimension_id == "consistency")
        assert consistency.score == 100.0
        assert consistency.rules_evaluated == 1


class TestQualityEngineProfiling:
    def test_profile_entity(self, db, dimensions):
        engine = QualityEngine(db, dimensions)
        profile = engine.profile_entity("test_exec", "execution", "bronze")
        assert profile.entity == "execution"
        assert profile.tier == "bronze"
        assert profile.row_count == 3
        assert len(profile.field_profiles) == 6  # 6 columns

        id_profile = next(p for p in profile.field_profiles if p.field_name == "execution_id")
        assert id_profile.null_count == 0
        assert id_profile.distinct_count == 3

    def test_profile_missing_table(self, db, dimensions):
        engine = QualityEngine(db, dimensions)
        profile = engine.profile_entity("nonexistent", "x", "y")
        assert profile.row_count == 0
        assert profile.field_profiles == []
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_quality_engine.py -v
```
Expected: 8 passed

**Step 5: Commit**

```bash
git add backend/engine/quality_engine.py backend/services/metadata_service.py tests/test_quality_engine.py
git commit -m "feat(quality): add quality engine with per-dimension weighted scoring + profiling (M207)"
```

---

## Task 4: Quarantine Service (M208)

Create the quarantine service for capturing, listing, retrying, and overriding failed records.

**Files:**
- Create: `backend/services/quarantine_service.py`
- Create: `tests/test_quarantine_service.py`

**Step 1: Create quarantine service**

Create `backend/services/quarantine_service.py`:

```python
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
            key = f"{r.source_tier}→{r.target_tier}"
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
```

**Step 2: Write quarantine service tests**

Create `tests/test_quarantine_service.py`:

```python
"""Tests for quarantine service."""
import pytest
from pathlib import Path
from backend.services.quarantine_service import QuarantineService


@pytest.fixture
def service(tmp_path):
    return QuarantineService(tmp_path)


class TestQuarantineCapture:
    def test_capture_creates_record(self, service):
        rec = service.capture(
            source_tier="bronze", target_tier="silver", entity="execution",
            failed_rules=[{"rule": "not_null", "field": "order_id", "error": "NULL value"}],
            original_data={"execution_id": "E1", "order_id": None},
        )
        assert rec.record_id
        assert rec.status == "pending"
        assert rec.entity == "execution"
        assert len(rec.failed_rules) == 1

    def test_capture_persists_to_disk(self, service):
        rec = service.capture(
            source_tier="bronze", target_tier="silver", entity="order",
            failed_rules=[], original_data={"order_id": "O1"},
        )
        loaded = service.get_record(rec.record_id)
        assert loaded is not None
        assert loaded.entity == "order"


class TestQuarantineList:
    def test_list_empty(self, service):
        assert service.list_records() == []

    def test_list_all(self, service):
        service.capture("bronze", "silver", "execution", [], {})
        service.capture("bronze", "silver", "order", [], {})
        assert len(service.list_records()) == 2

    def test_list_filter_by_entity(self, service):
        service.capture("bronze", "silver", "execution", [], {})
        service.capture("bronze", "silver", "order", [], {})
        assert len(service.list_records(entity="execution")) == 1

    def test_list_filter_by_status(self, service):
        rec = service.capture("bronze", "silver", "execution", [], {})
        service.override(rec.record_id, "test override")
        assert len(service.list_records(status="overridden")) == 1
        assert len(service.list_records(status="pending")) == 0


class TestQuarantineActions:
    def test_retry_increments_count(self, service):
        rec = service.capture("bronze", "silver", "execution", [], {})
        updated = service.retry(rec.record_id)
        assert updated.retry_count == 1
        assert updated.status == "retried"
        # Retry again
        updated2 = service.retry(rec.record_id)
        assert updated2.retry_count == 2

    def test_override_with_notes(self, service):
        rec = service.capture("bronze", "silver", "execution", [{"rule": "not_null"}], {})
        updated = service.override(rec.record_id, notes="Data corrected upstream")
        assert updated.status == "overridden"
        assert updated.notes == "Data corrected upstream"

    def test_discard(self, service):
        rec = service.capture("bronze", "silver", "execution", [], {})
        assert service.discard(rec.record_id) is True
        loaded = service.get_record(rec.record_id)
        assert loaded.status == "discarded"

    def test_retry_nonexistent(self, service):
        assert service.retry("nonexistent") is None

    def test_override_nonexistent(self, service):
        assert service.override("nonexistent") is None

    def test_discard_nonexistent(self, service):
        assert service.discard("nonexistent") is False


class TestQuarantineSummary:
    def test_empty_summary(self, service):
        s = service.summary()
        assert s.total_records == 0

    def test_summary_counts(self, service):
        service.capture("bronze", "silver", "execution",
                        [{"rule": "not_null"}, {"rule": "referential_integrity"}], {})
        service.capture("bronze", "silver", "execution", [{"rule": "not_null"}], {})
        service.capture("silver", "gold", "order", [{"rule": "range_check"}], {})
        s = service.summary()
        assert s.total_records == 3
        assert s.by_entity["execution"] == 2
        assert s.by_entity["order"] == 1
        assert s.by_tier_transition["bronze→silver"] == 2
        assert s.by_rule_type["not_null"] == 2
        assert s.by_status["pending"] == 3
```

**Step 3: Run tests**

```bash
uv run pytest tests/test_quarantine_service.py -v
```
Expected: 13 passed

**Step 4: Commit**

```bash
git add backend/services/quarantine_service.py tests/test_quarantine_service.py
git commit -m "feat(quality): add quarantine service with capture/retry/override/discard (M208)"
```

---

## Task 5: Quality + Quarantine API Endpoints (M209)

Create REST API for quality scoring, profiling, and quarantine operations.

**Files:**
- Create: `backend/api/quality.py`
- Modify: `backend/main.py` (register router)
- Add tests to: `tests/test_quality_engine.py`

**Step 1: Create quality API router**

Create `backend/api/quality.py`:

```python
"""Quality and quarantine REST API."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.models.quality import QuarantineRecord

router = APIRouter(prefix="/api/quality", tags=["quality"])


def _meta(request: Request):
    return request.app.state.metadata


def _db(request: Request):
    return request.app.state.db


def _quarantine(request: Request):
    from backend.services.quarantine_service import QuarantineService
    from backend import config
    return QuarantineService(config.settings.workspace_dir)


def _engine(request: Request):
    from backend.engine.quality_engine import QualityEngine
    dims = _meta(request).load_quality_dimensions()
    return QualityEngine(_db(request), dims)


# --- Quality Dimensions ---

@router.get("/dimensions")
def get_dimensions(request: Request):
    """Return quality dimension definitions (ISO 8000/25012)."""
    cfg = _meta(request).load_quality_dimensions()
    return [d.model_dump() for d in cfg.dimensions]


# --- Quality Scoring ---

@router.get("/scores")
def get_all_scores(request: Request):
    """Score all entities across all data contracts."""
    engine = _engine(request)
    contracts = _meta(request).list_data_contracts()
    scores = []
    for contract in contracts:
        table_name = _resolve_table(contract, request)
        if table_name:
            try:
                score = engine.score_entity(contract, table_name)
                scores.append(score.model_dump())
            except Exception:
                pass
    return scores


@router.get("/scores/{contract_id}")
def get_score(contract_id: str, request: Request):
    """Score a specific data contract."""
    contract = _meta(request).load_data_contract(contract_id)
    if not contract:
        return JSONResponse({"error": "Contract not found"}, status_code=404)
    table_name = _resolve_table(contract, request)
    if not table_name:
        return JSONResponse({"error": "No table resolved for contract"}, status_code=404)
    engine = _engine(request)
    score = engine.score_entity(contract, table_name)
    return score.model_dump()


# --- Data Profiling ---

@router.get("/profile/{entity}")
def profile_entity(entity: str, tier: str = "bronze", request: Request = None):
    """Profile an entity table for data quality analysis."""
    table_map = {"execution": "execution", "order": "order", "product": "product",
                 "md_eod": "md_eod", "md_intraday": "md_intraday",
                 "venue": "venue", "account": "account", "trader": "trader"}
    table_name = table_map.get(entity)
    if not table_name:
        return JSONResponse({"error": f"Unknown entity: {entity}"}, status_code=404)
    engine = _engine(request)
    profile = engine.profile_entity(table_name, entity, tier)
    return profile.model_dump()


# --- Quarantine ---

@router.get("/quarantine")
def list_quarantine(
    entity: str | None = None,
    status: str | None = None,
    source_tier: str | None = None,
    request: Request = None,
):
    """List quarantined records with optional filters."""
    svc = _quarantine(request)
    records = svc.list_records(entity=entity, status=status, source_tier=source_tier)
    return [r.model_dump() for r in records]


@router.get("/quarantine/summary")
def quarantine_summary(request: Request):
    """Get quarantine queue summary statistics."""
    svc = _quarantine(request)
    return svc.summary().model_dump()


@router.get("/quarantine/{record_id}")
def get_quarantine_record(record_id: str, request: Request):
    """Get a single quarantine record."""
    svc = _quarantine(request)
    rec = svc.get_record(record_id)
    if not rec:
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return rec.model_dump()


@router.post("/quarantine/{record_id}/retry")
def retry_quarantine(record_id: str, request: Request):
    """Retry processing a quarantined record."""
    svc = _quarantine(request)
    rec = svc.retry(record_id)
    if not rec:
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return rec.model_dump()


@router.post("/quarantine/{record_id}/override")
def override_quarantine(record_id: str, request: Request, notes: str = ""):
    """Force-accept a quarantined record with justification."""
    svc = _quarantine(request)
    rec = svc.override(record_id, notes=notes)
    if not rec:
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return rec.model_dump()


@router.delete("/quarantine/{record_id}")
def discard_quarantine(record_id: str, request: Request):
    """Discard a quarantined record."""
    svc = _quarantine(request)
    if not svc.discard(record_id):
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return {"discarded": record_id}


# --- Helpers ---

def _resolve_table(contract, request) -> str | None:
    """Resolve a data contract to a DuckDB table name."""
    entity_to_table = {
        "alert": "alerts", "execution": "execution", "order": "order",
        "product": "product", "calculation_result": "alerts",
    }
    return entity_to_table.get(contract.entity)
```

**Step 2: Register router in main.py**

In `backend/main.py`, add:

```python
from backend.api import quality
app.include_router(quality.router)
```

**Step 3: Write API tests**

Add to `tests/test_quality_engine.py`:

```python
class TestQualityAPI:
    @pytest.fixture
    def workspace(self, tmp_path):
        ws = tmp_path / "workspace"
        for d in ["metadata/quality", "metadata/medallion/contracts", "metadata/entities",
                   "metadata/calculations/transaction", "metadata/detection_models",
                   "metadata/settings/thresholds", "metadata/medallion",
                   "metadata/connectors", "data/csv", "data/parquet", "quarantine"]:
            (ws / d).mkdir(parents=True, exist_ok=True)
        # Write quality dimensions
        import json
        dims = {"dimensions": [
            {"id": "completeness", "name": "Completeness", "weight": 0.5,
             "rule_types": ["not_null"], "score_method": "ratio",
             "thresholds": {"good": 99, "warning": 95, "critical": 90}},
            {"id": "accuracy", "name": "Accuracy", "weight": 0.5,
             "rule_types": ["range_check"], "score_method": "ratio",
             "thresholds": {"good": 99, "warning": 95, "critical": 90}},
        ]}
        (ws / "metadata" / "quality" / "dimensions.json").write_text(json.dumps(dims))
        # Write a contract
        contract = {
            "contract_id": "test_contract", "source_tier": "bronze",
            "target_tier": "silver", "entity": "execution",
            "quality_rules": [{"rule": "not_null", "fields": ["execution_id"]}],
        }
        (ws / "metadata" / "medallion" / "contracts" / "test_contract.json").write_text(json.dumps(contract))
        # Write a quarantine record
        qr = {
            "record_id": "q001", "source_tier": "bronze", "target_tier": "silver",
            "entity": "execution", "failed_rules": [{"rule": "not_null"}],
            "original_data": {"execution_id": "E1"}, "timestamp": "2026-02-28T10:00:00Z",
            "status": "pending", "retry_count": 0, "notes": "",
        }
        (ws / "quarantine" / "q001.json").write_text(json.dumps(qr))
        return ws

    @pytest.fixture
    def client(self, workspace, monkeypatch):
        from backend import config
        from backend.main import app
        from starlette.testclient import TestClient
        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc

    def test_get_dimensions(self, client):
        resp = client.get("/api/quality/dimensions")
        assert resp.status_code == 200
        dims = resp.json()
        assert len(dims) == 2

    def test_quarantine_list(self, client):
        resp = client.get("/api/quality/quarantine")
        assert resp.status_code == 200
        records = resp.json()
        assert len(records) >= 1

    def test_quarantine_summary(self, client):
        resp = client.get("/api/quality/quarantine/summary")
        assert resp.status_code == 200
        assert resp.json()["total_records"] >= 1

    def test_quarantine_get_record(self, client):
        resp = client.get("/api/quality/quarantine/q001")
        assert resp.status_code == 200
        assert resp.json()["record_id"] == "q001"

    def test_quarantine_get_not_found(self, client):
        resp = client.get("/api/quality/quarantine/nonexistent")
        assert resp.status_code == 404

    def test_quarantine_retry(self, client):
        resp = client.post("/api/quality/quarantine/q001/retry")
        assert resp.status_code == 200
        assert resp.json()["retry_count"] == 1
        assert resp.json()["status"] == "retried"

    def test_quarantine_override(self, client):
        resp = client.post("/api/quality/quarantine/q001/override?notes=approved")
        assert resp.status_code == 200
        assert resp.json()["status"] == "overridden"

    def test_quarantine_discard(self, client):
        resp = client.delete("/api/quality/quarantine/q001")
        assert resp.status_code == 200
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_quality_engine.py -v
```
Expected: 16 passed (8 engine + 8 API)

**Step 5: Run full backend suite**

```bash
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -3
```
Expected: 625+ passed

**Step 6: Commit**

```bash
git add backend/api/quality.py backend/main.py tests/test_quality_engine.py
git commit -m "feat(quality): add quality + quarantine REST API (M209)"
```

---

## Task 6: DataQuality View — Scaffold + Scores Panel (M210)

Create the 19th view with quality scores by entity and spider/radar chart.

**Files:**
- Create: `frontend/src/views/DataQuality/index.tsx`
- Modify: `frontend/src/routes.tsx` (add route)
- Modify: `workspace/metadata/navigation/main.json` (add sidebar entry)

**Step 1: Add navigation entry**

In `workspace/metadata/navigation/main.json`, add to the "Governance" group (after "Submissions"):

```json
{"view_id": "quality", "label": "Data Quality", "path": "/quality", "icon": "ShieldCheck", "order": 2}
```

**Step 2: Add route**

In `frontend/src/routes.tsx`:
- Add lazy import: `const DataQuality = lazy(() => import("./views/DataQuality/index.tsx"));`
- Add route under Governance section: `{ path: "quality", element: <Suspense fallback={null}><DataQuality /></Suspense> },`

**Step 3: Create DataQuality view**

Create `frontend/src/views/DataQuality/index.tsx`:

```tsx
import { useEffect, useState, useMemo } from "react";
import Panel from "../../components/Panel.tsx";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { TOOLTIP_STYLE, TICK_STYLE } from "../../constants/chartStyles.ts";
import { formatLabel } from "../../utils/format.ts";

interface DimensionScore {
  dimension_id: string;
  score: number;
  rules_evaluated: number;
  rules_passed: number;
  violation_count: number;
  total_count: number;
  status: "good" | "warning" | "critical";
}

interface EntityScore {
  entity: string;
  tier: string;
  overall_score: number;
  dimension_scores: DimensionScore[];
  contract_id: string;
}

interface QuarantineRecord {
  record_id: string;
  source_tier: string;
  target_tier: string;
  entity: string;
  failed_rules: { rule: string; field?: string; error?: string }[];
  original_data: Record<string, unknown>;
  timestamp: string;
  retry_count: number;
  status: string;
  notes: string;
}

interface QuarantineSummary {
  total_records: number;
  by_entity: Record<string, number>;
  by_tier_transition: Record<string, number>;
  by_rule_type: Record<string, number>;
  by_status: Record<string, number>;
}

interface QualityDimension {
  id: string;
  name: string;
  iso_ref: string;
  weight: number;
}

const STATUS_COLORS: Record<string, string> = {
  good: "text-green-500",
  warning: "text-amber-500",
  critical: "text-red-500",
};

const SCORE_BG: Record<string, string> = {
  good: "bg-green-500/10 border-green-500/30",
  warning: "bg-amber-500/10 border-amber-500/30",
  critical: "bg-red-500/10 border-red-500/30",
};

function scoreStatus(score: number): string {
  if (score >= 99) return "good";
  if (score >= 95) return "warning";
  return "critical";
}

export default function DataQuality() {
  const [dimensions, setDimensions] = useState<QualityDimension[]>([]);
  const [scores, setScores] = useState<EntityScore[]>([]);
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [quarantineSummary, setQuarantineSummary] = useState<QuarantineSummary | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/quality/dimensions").then((r) => r.json()),
      fetch("/api/quality/scores").then((r) => r.json()),
      fetch("/api/quality/quarantine").then((r) => r.json()),
      fetch("/api/quality/quarantine/summary").then((r) => r.json()),
    ])
      .then(([dims, sc, qr, qs]) => {
        setDimensions(dims);
        setScores(sc);
        setQuarantineRecords(qr);
        setQuarantineSummary(qs);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedScore = useMemo(
    () => scores.find((s) => s.contract_id === selectedEntity) || scores[0],
    [scores, selectedEntity],
  );

  const radarData = useMemo(() => {
    if (!selectedScore) return [];
    return selectedScore.dimension_scores.map((ds) => ({
      dimension: formatLabel(ds.dimension_id),
      score: ds.score,
      fullMark: 100,
    }));
  }, [selectedScore]);

  const handleRetry = async (recordId: string) => {
    const resp = await fetch(`/api/quality/quarantine/${recordId}/retry`, { method: "POST" });
    if (resp.ok) {
      const updated = await resp.json();
      setQuarantineRecords((prev) =>
        prev.map((r) => (r.record_id === recordId ? updated : r)),
      );
    }
  };

  const handleOverride = async (recordId: string) => {
    const notes = "Manually overridden via Data Quality dashboard";
    const resp = await fetch(`/api/quality/quarantine/${recordId}/override?notes=${encodeURIComponent(notes)}`, { method: "POST" });
    if (resp.ok) {
      const updated = await resp.json();
      setQuarantineRecords((prev) =>
        prev.map((r) => (r.record_id === recordId ? updated : r)),
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Loading quality data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto p-4" data-tour="quality-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Data Quality</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>ISO/IEC 25012 + ISO 8000</span>
          <span>{dimensions.length} dimensions</span>
          <span>{scores.length} contracts scored</span>
        </div>
      </div>

      {/* Quality Scorecards */}
      <Panel title="Quality Scores by Contract" dataTour="quality-scores" dataTrace="quality.entity-scores">
        {scores.length === 0 ? (
          <p className="text-sm text-muted p-2">No quality scores available. Run pipeline stages to generate scores.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
            {scores.map((s) => {
              const status = scoreStatus(s.overall_score);
              return (
                <button
                  key={s.contract_id}
                  data-action={`select-score-${s.contract_id}`}
                  className={`border rounded-lg p-3 text-left transition-colors cursor-pointer ${SCORE_BG[status]} ${selectedEntity === s.contract_id ? "ring-2 ring-blue-400" : ""}`}
                  onClick={() => setSelectedEntity(s.contract_id)}
                >
                  <div className="text-xs text-muted">{s.entity} ({s.tier})</div>
                  <div className={`text-2xl font-bold ${STATUS_COLORS[status]}`}>
                    {s.overall_score}%
                  </div>
                  <div className="text-xs text-muted">{s.contract_id}</div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Spider Chart */}
      {selectedScore && radarData.length > 0 && (
        <Panel title={`Quality Dimensions — ${selectedScore.entity} (${selectedScore.tier})`} dataTour="quality-spider" dataTrace="quality.spider-chart">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="dimension" tick={TICK_STYLE} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={TICK_STYLE} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="var(--color-blue-500)"
                  fill="var(--color-blue-500)"
                  fillOpacity={0.3}
                  isAnimationActive={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Dimension breakdown table */}
          <table className="w-full text-xs mt-4">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-1">Dimension</th>
                <th className="text-left p-1">ISO Ref</th>
                <th className="text-right p-1">Score</th>
                <th className="text-right p-1">Rules</th>
                <th className="text-right p-1">Violations</th>
                <th className="text-left p-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedScore.dimension_scores.map((ds) => {
                const dim = dimensions.find((d) => d.id === ds.dimension_id);
                return (
                  <tr key={ds.dimension_id} className="border-b border-border/50">
                    <td className="p-1 font-medium">{formatLabel(ds.dimension_id)}</td>
                    <td className="p-1 text-muted">{dim?.iso_ref || ""}</td>
                    <td className={`p-1 text-right font-mono ${STATUS_COLORS[ds.status]}`}>{ds.score}%</td>
                    <td className="p-1 text-right">{ds.rules_passed}/{ds.rules_evaluated}</td>
                    <td className="p-1 text-right">{ds.violation_count}</td>
                    <td className="p-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${ds.status === "good" ? "bg-green-500/20 text-green-400" : ds.status === "warning" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                        {ds.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Quarantine Queue */}
      <Panel title={`Quarantine Queue (${quarantineSummary?.total_records || 0})`} dataTour="quality-quarantine" dataTrace="quality.quarantine-queue">
        {quarantineRecords.length === 0 ? (
          <p className="text-sm text-muted p-2">No quarantined records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">ID</th>
                  <th className="text-left p-1">Entity</th>
                  <th className="text-left p-1">Transition</th>
                  <th className="text-left p-1">Failed Rules</th>
                  <th className="text-right p-1">Retries</th>
                  <th className="text-left p-1">Status</th>
                  <th className="text-left p-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantineRecords.map((r) => (
                  <tr key={r.record_id} className="border-b border-border/50">
                    <td className="p-1 font-mono">{r.record_id}</td>
                    <td className="p-1">{r.entity}</td>
                    <td className="p-1">{r.source_tier} → {r.target_tier}</td>
                    <td className="p-1">{r.failed_rules.map((f) => f.rule).join(", ")}</td>
                    <td className="p-1 text-right">{r.retry_count}</td>
                    <td className="p-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${r.status === "pending" ? "bg-amber-500/20 text-amber-400" : r.status === "overridden" ? "bg-blue-500/20 text-blue-400" : "bg-muted/30 text-muted"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-1 flex gap-1">
                      {r.status === "pending" && (
                        <>
                          <button
                            data-action={`retry-${r.record_id}`}
                            className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            onClick={() => handleRetry(r.record_id)}
                          >
                            Retry
                          </button>
                          <button
                            data-action={`override-${r.record_id}`}
                            className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            onClick={() => handleOverride(r.record_id)}
                          >
                            Override
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Summary cards */}
        {quarantineSummary && quarantineSummary.total_records > 0 && (
          <div className="flex gap-4 mt-3 text-xs text-muted p-2 border-t border-border">
            <div>By entity: {Object.entries(quarantineSummary.by_entity).map(([k, v]) => `${k}(${v})`).join(", ")}</div>
            <div>By rule: {Object.entries(quarantineSummary.by_rule_type).map(([k, v]) => `${k}(${v})`).join(", ")}</div>
          </div>
        )}
      </Panel>
    </div>
  );
}
```

**Step 4: Build frontend**

```bash
cd frontend && npm run build
```
Expected: 0 errors, ~975 modules

**Step 5: Playwright verification**

1. Navigate to `/quality`
2. Verify Data Quality view renders with 3 panels
3. Verify sidebar "Data Quality" entry under Governance
4. Screenshot in light theme

**Step 6: Commit**

```bash
git add frontend/src/views/DataQuality/ frontend/src/routes.tsx workspace/metadata/navigation/main.json
git commit -m "feat(quality): add DataQuality view with scores, spider chart, quarantine queue (M210)"
```

---

## Task 7: DataQuality View — Data Profiling Panel (M211)

Add data profiling panel to the DataQuality view.

**Files:**
- Modify: `frontend/src/views/DataQuality/index.tsx`

**Step 1: Add profiling state and API call**

Add to the existing DataQuality component:

```tsx
// Add interface
interface FieldProfile {
  field_name: string;
  total_count: number;
  null_count: number;
  null_pct: number;
  distinct_count: number;
  min_value: string;
  max_value: string;
}

interface EntityProfileData {
  entity: string;
  tier: string;
  table_name: string;
  row_count: number;
  field_profiles: FieldProfile[];
}

// Add state
const [profileEntity, setProfileEntity] = useState<string>("execution");
const [profileTier, setProfileTier] = useState<string>("bronze");
const [profile, setProfile] = useState<EntityProfileData | null>(null);
const [profileLoading, setProfileLoading] = useState(false);

// Add effect
useEffect(() => {
  setProfileLoading(true);
  fetch(`/api/quality/profile/${profileEntity}?tier=${profileTier}`)
    .then((r) => r.json())
    .then((d) => setProfile(d))
    .catch(() => setProfile(null))
    .finally(() => setProfileLoading(false));
}, [profileEntity, profileTier]);
```

**Step 2: Add profiling panel JSX**

Add after the Quarantine Queue panel:

```tsx
{/* Data Profiling */}
<Panel title="Data Profiling" dataTour="quality-profiling" dataTrace="quality.data-profiling">
  <div className="flex gap-3 items-center mb-3 p-2">
    <label className="text-xs text-muted">Entity:</label>
    <select
      data-tour="profile-entity-select"
      className="rounded border border-border bg-transparent px-2 py-1 text-xs"
      value={profileEntity}
      onChange={(e) => setProfileEntity(e.target.value)}
    >
      {["execution", "order", "product", "md_eod", "venue", "account", "trader"].map((e) => (
        <option key={e} value={e}>{formatLabel(e)}</option>
      ))}
    </select>
    <label className="text-xs text-muted">Tier:</label>
    <select
      className="rounded border border-border bg-transparent px-2 py-1 text-xs"
      value={profileTier}
      onChange={(e) => setProfileTier(e.target.value)}
    >
      {["bronze", "silver", "gold"].map((t) => (
        <option key={t} value={t}>{formatLabel(t)}</option>
      ))}
    </select>
    {profile && <span className="text-xs text-muted">{profile.row_count} rows</span>}
  </div>
  {profileLoading ? (
    <p className="text-sm text-muted p-2">Loading profile...</p>
  ) : profile && profile.field_profiles.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-1">Field</th>
            <th className="text-right p-1">Total</th>
            <th className="text-right p-1">Nulls</th>
            <th className="text-right p-1">Null %</th>
            <th className="text-right p-1">Distinct</th>
            <th className="text-left p-1">Min</th>
            <th className="text-left p-1">Max</th>
          </tr>
        </thead>
        <tbody>
          {profile.field_profiles.map((fp) => (
            <tr key={fp.field_name} className="border-b border-border/50">
              <td className="p-1 font-mono">{fp.field_name}</td>
              <td className="p-1 text-right">{fp.total_count}</td>
              <td className="p-1 text-right">{fp.null_count}</td>
              <td className={`p-1 text-right ${fp.null_pct > 5 ? "text-red-400" : fp.null_pct > 0 ? "text-amber-400" : "text-green-400"}`}>
                {fp.null_pct}%
              </td>
              <td className="p-1 text-right">{fp.distinct_count}</td>
              <td className="p-1 text-muted truncate max-w-[120px]">{fp.min_value}</td>
              <td className="p-1 text-muted truncate max-w-[120px]">{fp.max_value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-sm text-muted p-2">No profile data available.</p>
  )}
</Panel>
```

**Step 3: Build and verify**

```bash
cd frontend && npm run build
```
Expected: 0 errors

**Step 4: Playwright verification**

1. Navigate to `/quality`
2. Verify Data Profiling panel shows execution fields
3. Switch entity to "order" — verify fields update
4. Screenshot

**Step 5: Commit**

```bash
git add frontend/src/views/DataQuality/
git commit -m "feat(quality): add data profiling panel to DataQuality view (M211)"
```

---

## Task 8: E2E Tests for DataQuality View (M212)

**Files:**
- Create: `tests/e2e/test_data_quality_view.py`

**Step 1: Write E2E tests**

```python
"""E2E tests for the DataQuality view."""
import re
import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def loaded_page(page: Page, live_server: str) -> Page:
    page.goto(f"{live_server}/quality")
    page.wait_for_load_state("networkidle")
    return page


class TestDataQualityView:
    def test_view_loads(self, loaded_page: Page):
        expect(loaded_page.locator("text=Data Quality")).to_be_visible()

    def test_quality_scores_panel(self, loaded_page: Page):
        expect(loaded_page.locator("[data-tour='quality-scores']")).to_be_visible()

    def test_quarantine_queue_panel(self, loaded_page: Page):
        expect(loaded_page.locator("[data-tour='quality-quarantine']")).to_be_visible()

    def test_data_profiling_panel(self, loaded_page: Page):
        expect(loaded_page.locator("[data-tour='quality-profiling']")).to_be_visible()

    def test_sidebar_entry_visible(self, loaded_page: Page):
        expect(loaded_page.locator("a[href='/quality']")).to_be_visible()

    def test_profiling_entity_selector(self, loaded_page: Page):
        select = loaded_page.locator("[data-tour='profile-entity-select']")
        expect(select).to_be_visible()
        select.select_option("order")
        loaded_page.wait_for_timeout(1000)
        expect(loaded_page.locator("text=order_id")).to_be_visible()

    def test_dimensions_badge(self, loaded_page: Page):
        expect(loaded_page.locator(text=re.compile(r"\d+ dimensions"))).to_be_visible()
```

**Step 2: Run E2E tests**

```bash
uv run pytest tests/e2e/test_data_quality_view.py -v
```
Expected: 7 passed

**Step 3: Commit**

```bash
git add tests/e2e/test_data_quality_view.py
git commit -m "test(quality): add E2E Playwright tests for DataQuality view (M212)"
```

---

## Task 9: Tours, Scenarios, Operations, Architecture Registry (M213)

Update all guided experience and traceability systems for the new DataQuality view.

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts`
- Modify: `frontend/src/data/scenarioDefinitions.ts`
- Modify: `frontend/src/data/operationScripts.ts`
- Modify: `frontend/src/data/architectureRegistry.ts`
- Modify: `frontend/src/layouts/AppLayout.tsx` (getTourIdForPath)
- Modify: `workspace/metadata/tours/registry.json`

**Step 1: Add tour definition**

In `tourDefinitions.ts`, add a `data-quality` tour:

```typescript
{
  id: "data-quality",
  title: "Data Quality Dashboard",
  steps: [
    { target: "[data-tour='quality-scores']", title: "Quality Scores", content: "Quality scores per entity and data contract, calculated using ISO/IEC 25012 weighted dimensions. Click a card to see the dimension breakdown.", placement: "bottom" },
    { target: "[data-tour='quality-spider']", title: "Quality Spider Chart", content: "Radar chart showing scores across 7 quality dimensions: completeness, accuracy, consistency, timeliness, uniqueness, validity, and currentness.", placement: "right" },
    { target: "[data-tour='quality-quarantine']", title: "Quarantine Queue", content: "Records that failed quality validation during pipeline execution. Retry to reprocess or override with justification.", placement: "top" },
    { target: "[data-tour='quality-profiling']", title: "Data Profiling", content: "Per-field statistics for any entity: null counts, distinct values, min/max. Switch entities and tiers to compare quality across the medallion architecture.", placement: "top" },
  ],
}
```

**Step 2: Add getTourIdForPath mapping**

In `AppLayout.tsx`, add to the `getTourIdForPath` function:
```typescript
case "/quality": return "data-quality";
```

**Step 3: Add scenario S31**

In `scenarioDefinitions.ts`, add S31 (Data Quality Investigation):

```typescript
{
  id: "s31_data_quality_investigation",
  title: "Data Quality Investigation",
  description: "Explore quality scores, investigate dimension breakdowns, review quarantine queue, and profile entity data",
  category: "governance",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  steps: [
    { target: "[data-tour='quality-dashboard']", title: "Data Quality Dashboard", content: "The Data Quality view provides ISO 8000/25012-aligned quality scoring across all entities.", action: "navigate", route: "/quality", placement: "center", hint: "Navigate to Data Quality", delay: 500 },
    { target: "[data-tour='quality-scores']", title: "Quality Scorecards", content: "Each card shows the weighted quality score for a data contract. Click one to see the dimension breakdown.", action: "wait", placement: "bottom", hint: "Click a scorecard to drill in", delay: 1500 },
    { target: "[data-tour='quality-spider']", title: "Spider Chart", content: "The radar chart shows how quality distributes across 7 ISO dimensions. Look for dimensions below the warning threshold.", action: "wait", placement: "right", hint: "Examine the dimension balance", delay: 2000 },
    { target: "[data-tour='quality-quarantine']", title: "Quarantine Queue", content: "Records that failed quality gates appear here. You can retry processing or override with justification.", action: "wait", placement: "top", hint: "Review quarantined records", delay: 2000 },
    { target: "[data-tour='quality-profiling']", title: "Data Profiling", content: "Select an entity to see per-field statistics. High null rates or low distinct counts indicate data quality issues.", action: "wait", placement: "top", hint: "Profile an entity", delay: 2000 },
  ],
}
```

**Step 4: Add operations**

In `operationScripts.ts`, add `data-quality` operations:

```typescript
{
  view: "data-quality",
  operations: [
    { id: "view_scores", label: "View quality scores", description: "See quality scores by entity and contract" },
    { id: "drill_dimensions", label: "Drill into dimensions", description: "Click a scorecard to see ISO dimension breakdown" },
    { id: "review_quarantine", label: "Review quarantine queue", description: "Investigate quarantined records" },
    { id: "retry_record", label: "Retry quarantined record", description: "Retry processing a failed record" },
    { id: "override_record", label: "Override quarantined record", description: "Force-accept with justification" },
    { id: "profile_entity", label: "Profile entity data", description: "View per-field null rates, distinct counts, min/max" },
    { id: "architecture_trace", label: "Toggle architecture traceability", description: "Inspect metadata sources and API endpoints" },
  ],
}
```

**Step 5: Add architecture registry sections**

In `architectureRegistry.ts`, add 4 new sections:

```typescript
// quality.entity-scores
{
  id: "quality.entity-scores",
  sectionName: "Quality Scores",
  viewId: "quality",
  description: "Weighted quality scores per entity and data contract using ISO 8000/25012 dimensions",
  metadataSource: "workspace/metadata/quality/dimensions.json",
  apiEndpoint: "/api/quality/scores",
  storeFile: "",
  componentFile: "frontend/src/views/DataQuality/index.tsx",
  metadataMaturity: "fully-metadata-driven",
  maturityExplanation: "Quality dimensions and rule-to-dimension mapping both loaded from metadata",
},
// quality.spider-chart
{
  id: "quality.spider-chart",
  sectionName: "Quality Spider Chart",
  viewId: "quality",
  description: "Radar chart showing per-dimension quality scores (ISO/IEC 25012 §4.2.1-4.2.6 + ISO 8000-61)",
  metadataSource: "workspace/metadata/quality/dimensions.json",
  apiEndpoint: "/api/quality/scores/{contract_id}",
  storeFile: "",
  componentFile: "frontend/src/views/DataQuality/index.tsx",
  metadataMaturity: "fully-metadata-driven",
  maturityExplanation: "Dimensions, weights, and thresholds all from metadata",
},
// quality.quarantine-queue
{
  id: "quality.quarantine-queue",
  sectionName: "Quarantine Queue",
  viewId: "quality",
  description: "Investigation queue for records that failed quality validation gates",
  metadataSource: "workspace/quarantine/*.json",
  apiEndpoint: "/api/quality/quarantine",
  storeFile: "",
  componentFile: "frontend/src/views/DataQuality/index.tsx",
  metadataMaturity: "fully-metadata-driven",
  maturityExplanation: "Quarantine records stored as JSON metadata, actions via CRUD API",
},
// quality.data-profiling
{
  id: "quality.data-profiling",
  sectionName: "Data Profiling",
  viewId: "quality",
  description: "Per-field statistics for data quality analysis — null rates, cardinality, min/max",
  metadataSource: "",
  apiEndpoint: "/api/quality/profile/{entity}",
  storeFile: "",
  componentFile: "frontend/src/views/DataQuality/index.tsx",
  metadataMaturity: "mostly-metadata-driven",
  maturityExplanation: "Profiling is computed from data, entity list is code-driven",
},
```

**Step 6: Update tours registry**

In `workspace/metadata/tours/registry.json`, update scenario count (30→31), add category "governance" update, add data-quality tour entry.

**Step 7: Build and verify**

```bash
cd frontend && npm run build
```
Expected: 0 errors

**Step 8: Commit**

```bash
git add frontend/src/data/ frontend/src/layouts/AppLayout.tsx workspace/metadata/tours/registry.json
git commit -m "feat(quality): add tour, S31 scenario, operations, architecture registry (M213)"
```

---

## Task 10: Full Test Suite + Playwright Verification (M214)

**Step 1: Run all backend tests**

```bash
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -3
```
Expected: 625+ passed (590 existing + ~35 new)

**Step 2: Build frontend**

```bash
cd frontend && npm run build 2>&1 | grep "modules transformed"
```
Expected: 0 errors, ~975 modules

**Step 3: Start server and verify API**

```bash
./start.sh &
sleep 5
curl -s http://localhost:8000/api/quality/dimensions | python -m json.tool | head -20
curl -s http://localhost:8000/api/quality/quarantine/summary | python -m json.tool
```

**Step 4: Playwright visual verification**

Using Playwright MCP browser:
1. Navigate to `/quality` — verify all 4 panels render
2. Click a quality scorecard (if scores available) — verify spider chart renders
3. Verify quarantine queue shows headers
4. Change profiling entity — verify table updates
5. Switch to dark theme — verify colors
6. Navigate to `/pipeline` — verify existing views still work
7. Screenshot each major state

**Step 5: Run E2E tests**

```bash
uv run pytest tests/e2e/test_data_quality_view.py -v
```
Expected: 7 passed

---

## Task 11: Phase D Documentation Sweep + PR (M215)

Per `docs/development-workflow-protocol.md`, run the full 3-tier completion protocol.

**Counts to update (expected):**

| Count | Old | New |
|-------|-----|-----|
| Backend tests | 590 | ~625 |
| E2E tests | 210 | ~217 |
| Total tests | 800 | ~842 |
| Views | 18 | 19 |
| Architecture sections | 82 | 86 |
| Scenarios | 30 | 31 |
| Operations | 109 | ~116 |
| Milestone range | M0-M204 | M0-M215 |

**Tier 1 (per-task) updates:**
- `docs/progress.md` — add M205-M215 entries
- `docs/architecture-traceability.md` — recalculate maturity %
- `docs/demo-guide.md` — add DataQuality section
- `workspace/metadata/tours/registry.json` — verify counts

**Tier 2 (count sync):**
- All files in Test Count Sync Registry (see `docs/development-workflow-protocol.md`)
- View Count Registry (18→19)
- Scenario Count Registry (30→31)
- Architecture Section Count Registry (82→86)
- Operation Script Count Registry (109→116)
- Milestone Range Registry (M0-M204→M0-M215)

**Tier 3 (branch merge):**
- Full test suite passes
- Context MEMORY.md updated
- In-repo MEMORY.md updated
- README.md updated
- CLAUDE.md updated
- Roadmap marked Phase 18 COMPLETE
- Feature checklist version history entry
- Push branch, create PR, squash merge to main

**The plan's final task must always be**: "Run Phase D of the Development Workflow Protocol"

---

## Dependencies

```
Task 1 (Quality Models) → Task 2 (New Rule Types) → Task 3 (Quality Engine)
Task 3 (Quality Engine) → Task 5 (API Endpoints)
Task 4 (Quarantine Service) → Task 5 (API Endpoints)
Task 5 (API Endpoints) → Task 6 (DataQuality View Scaffold)
Task 6 (DataQuality View) → Task 7 (Profiling Panel) → Task 8 (E2E Tests)
Task 8 (E2E Tests) → Task 9 (Tours/Scenarios/Ops/Arch)
Task 9 → Task 10 (Verification) → Task 11 (Docs/PR)
```

---

## Verification Plan

```bash
# Quality dimensions metadata
cat workspace/metadata/quality/dimensions.json | python -m json.tool | grep -c '"id"'
# Expected: 7

# Rule types implemented (8 total)
grep -c "_check_" backend/services/contract_validator.py
# Expected: 8

# Quality engine test coverage
uv run pytest tests/test_quality_engine.py -v
# Expected: 16+ passed

# Quarantine service tests
uv run pytest tests/test_quarantine_service.py -v
# Expected: 13+ passed

# API endpoints
curl -s http://localhost:8000/api/quality/dimensions | python -m json.tool
curl -s http://localhost:8000/api/quality/quarantine/summary | python -m json.tool
# Expected: valid JSON responses

# Frontend build
cd frontend && npm run build 2>&1 | grep "modules transformed"
# Expected: ~975 modules, 0 errors

# Architecture section count
grep -c "metadataMaturity:" frontend/src/data/architectureRegistry.ts
# Expected: 86

# Scenario count
grep -c "category:" frontend/src/data/scenarioDefinitions.ts
# Expected: 31

# DataQuality view exists
ls frontend/src/views/DataQuality/index.tsx
# Expected: file exists

# E2E tests
uv run pytest tests/e2e/test_data_quality_view.py -v
# Expected: 7 passed

# Full backend suite
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -1
# Expected: 625+ passed
```
