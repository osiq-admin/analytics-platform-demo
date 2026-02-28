# Phase 17: Silver-to-Gold Pipeline Orchestration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the medallion pipeline metadata executable by building a Contract Validator, a Pipeline Orchestrator, and fixing the existing Pipeline API, then overhauling the PipelineMonitor and MedallionOverview frontends to show real stage-based execution with contract validation.

**Architecture:** A metadata-driven Pipeline Orchestrator reads `pipeline_stages.json` to dispatch tier-to-tier execution. For Silver-to-Gold, it runs the calculation DAG (with SettingsResolver), runs detection models, validates results against data contracts, and writes to Gold-tier storage. A Contract Validator evaluates quality rules (not_null, range_check, enum_check, unique) from contract metadata against DuckDB query results. New Silver-to-Gold mapping metadata formally links canonical Silver fields to calculation inputs. The PipelineMonitor is overhauled to show true DAG edges (from `depends_on`) instead of a linear chain, with medallion stage grouping and contract validation status. MedallionOverview gains execution status indicators and a "Run Stage" action.

**Tech Stack:** Python FastAPI, DuckDB, PyArrow, Pydantic v2, React 19, TypeScript, Vite, Zustand, Tailwind CSS 4, React Flow, dagre

---

## Context

Phase 16 added the MappingStudio with metadata-driven Bronze-to-Silver field mappings (3 mappings, 7 API endpoints, MappingStudio overhaul). Phase 14 added the Medallion Architecture view with 11 tiers, 6 data contracts, 5 transformations, and 5 pipeline stages — but all metadata-only, not executable. The existing Pipeline API (`backend/api/pipeline.py`) runs the calculation DAG but is missing the SettingsResolver (bug), does not invoke the detection engine, and has no concept of medallion pipeline stages or contract validation. The PipelineDAG component (`frontend/src/views/PipelineMonitor/PipelineDAG.tsx`) chains nodes linearly by array index instead of using the actual `depends_on` edges (bug).

**Current state:** M0-M196 complete, 18 views, 772 tests (562 backend + 210 E2E), 969 modules, 29 scenarios, 80 architecture sections, 105 operations.

### Key Existing Files

**Backend — engines & services:**
- `backend/engine/calculation_engine.py` — DAG builder + SQL executor (builds topo-sorted DAG, executes SQL per calc, writes Parquet). Constructor accepts optional `SettingsResolver` but pipeline API never passes one.
- `backend/engine/detection_engine.py` — Evaluates detection models against calc output tables, produces `AlertTrace`. Uses `SettingsResolver` with entity context.
- `backend/engine/settings_resolver.py` — Strategy pattern resolver. Fully functional, no changes needed.
- `backend/services/metadata_service.py` — `load_pipeline_stages()` returns `PipelineConfig` (has `.stages` list), `load_data_contract(id)` returns `DataContract`, `load_transformation(id)` returns `TransformationStep`, `list_detection_models()` returns list of `DetectionModelDefinition`.
- `backend/api/pipeline.py` — `POST /pipeline/run` (calc-only, no SettingsResolver), `GET /pipeline/status`, `GET /pipeline/dag`.
- `backend/api/medallion.py` — 7 read-only endpoints for tiers, contracts, transformations, pipeline-stages, lineage.

**Backend — models:**
- `backend/models/medallion.py` — `PipelineStage` (stage_id, name, tier_from, tier_to, order, depends_on, entities, parallel), `DataContract` (contract_id, source_tier, target_tier, entity, field_mappings, quality_rules, sla, owner, classification), `QualityRule` (rule, fields, field, reference, min, max, values), `TransformationStep`, `PipelineConfig`.
- `backend/models/mapping.py` — `MappingDefinition`, `FieldMapping`, `MappingValidationResult`.
- `backend/db.py` — `DuckDBManager` with `.cursor()`, `.connect(db_path)`, `.close()`. Constructor takes no args; `.connect()` takes path string.

**Metadata JSON:**
- `workspace/metadata/medallion/pipeline_stages.json` — 5 stages (ingest_landing, landing_to_bronze, bronze_to_silver, silver_to_gold, gold_to_platinum). Silver-to-gold has `"depends_on": ["bronze_to_silver"]`, entities `["alert", "calculation_result"]`.
- `workspace/metadata/medallion/contracts/silver_to_gold_alerts.json` — Quality rules: not_null on [alert_id, model_id, score], range_check on score (0-100).
- `workspace/metadata/medallion/transformations/silver_to_gold_alerts.json` — Has `sql_template` with comment-only SQL, `"error_handling": "log_and_continue"`. Missing `strategy` field.
- `workspace/metadata/calculations/` — 10 calcs across 4 layers (transaction: value_calc, adjusted_direction; time_windows: business_date_window, cancellation_pattern, market_event_window, trend_window; aggregations: trading_activity_aggregation, vwap_calc; derived: large_trading_activity, wash_detection). Each has `inputs`, `depends_on`, `output.table_name`, `logic` SQL.
- `workspace/metadata/mappings/` — 3 Bronze-to-Silver mappings (execution_bronze_silver, order_bronze_silver, product_bronze_silver).

**Frontend:**
- `frontend/src/views/PipelineMonitor/index.tsx` — Uses `usePipelineStore`, renders PipelineDAG + step table.
- `frontend/src/views/PipelineMonitor/PipelineDAG.tsx` — ReactFlow + dagre. **Bug:** chains nodes linearly `g.setEdge(steps[i-1].calc_id, steps[i].calc_id)` instead of using `depends_on`.
- `frontend/src/stores/pipelineStore.ts` — Zustand store with `PipelineStep` interface (calc_id, name, layer, status, duration_ms, row_count, error). Calls `POST /pipeline/run`.
- `frontend/src/views/MedallionOverview/index.tsx` — ReactFlow tier graph + detail panel. Loads tiers, contracts, stages from API. No execution status.
- `frontend/src/views/MappingStudio/index.tsx` — Mapping editor with selector/table/validation panels. No tier filtering.
- `frontend/src/data/architectureRegistry.ts` — 80 sections across 18 views.
- `frontend/src/data/scenarioDefinitions.ts` — 29 scenarios (S1-S29).
- `frontend/src/data/operationScripts.ts` — 105 operations across 18 views.
- `frontend/src/data/tourDefinitions.ts` — 21 tours.

**Tests:**
- `tests/test_pipeline_integration.py` — Integration test: data gen → loader → calc engine → detection engine → alerts.
- `tests/test_mapping.py` — Model + API tests for mapping CRUD.
- `tests/test_medallion.py` — API tests for medallion tiers, contracts, transformations, pipeline stages, lineage.

---

## Task 1: Contract Validator Service + Tests (M197)

**Files:**
- Create: `backend/services/contract_validator.py`
- Create: `tests/test_contract_validator.py`

The contract validator reads a `DataContract` from metadata and evaluates its `quality_rules` against actual data in DuckDB. It uses the existing `QualityRule` Pydantic model from `backend/models/medallion.py` which already defines `rule`, `fields`, `field`, `reference`, `min`, `max`, `values`.

**Step 1: Create contract validator service**

Create `backend/services/contract_validator.py`:

```python
"""Data contract validator — evaluates quality rules against DuckDB tables."""
from __future__ import annotations

from dataclasses import dataclass, field
from backend.models.medallion import DataContract, QualityRule


@dataclass
class RuleResult:
    """Result of evaluating a single quality rule."""
    rule: str
    field: str
    passed: bool
    violation_count: int = 0
    total_count: int = 0
    details: str = ""


@dataclass
class ContractValidationResult:
    """Aggregated result of validating a full data contract."""
    contract_id: str
    passed: bool = True
    rule_results: list[RuleResult] = field(default_factory=list)
    quality_score: float = 100.0  # 0-100


class ContractValidator:
    """Evaluates data contract quality rules against DuckDB tables.

    Supported rule types: not_null, range_check, enum_check, unique.
    Unsupported rule types pass by default (forward-compatible).
    """

    def __init__(self, db):
        self._db = db

    def validate(
        self, contract: DataContract, table_name: str
    ) -> ContractValidationResult:
        """Validate all quality rules in a contract against a table."""
        results: list[RuleResult] = []
        for rule in contract.quality_rules:
            result = self._evaluate_rule(rule, table_name)
            results.append(result)
        passed = all(r.passed for r in results)
        score = (sum(1 for r in results if r.passed) / max(len(results), 1)) * 100
        return ContractValidationResult(
            contract_id=contract.contract_id,
            passed=passed,
            rule_results=results,
            quality_score=round(score, 1),
        )

    def _evaluate_rule(self, rule: QualityRule, table: str) -> RuleResult:
        """Dispatch to the appropriate rule handler."""
        handler = getattr(self, f"_check_{rule.rule}", None)
        if not handler:
            return RuleResult(
                rule=rule.rule,
                field=rule.field or ",".join(rule.fields),
                passed=True,
                details=f"Unsupported rule type: {rule.rule}",
            )
        return handler(rule, table)

    def _check_not_null(self, rule: QualityRule, table: str) -> RuleResult:
        """Check that specified fields have no NULL values."""
        fields = rule.fields or ([rule.field] if rule.field else [])
        if not fields:
            return RuleResult(rule="not_null", field="", passed=True, details="No fields specified")
        total_violations = 0
        total_rows = 0
        for f in fields:
            try:
                cursor = self._db.cursor()
                result = cursor.execute(
                    f'SELECT COUNT(*) AS total, '
                    f'COUNT(CASE WHEN "{f}" IS NULL THEN 1 END) AS nulls '
                    f'FROM "{table}"'
                )
                cols = [desc[0] for desc in result.description]
                row = dict(zip(cols, result.fetchone()))
                cursor.close()
                total_rows = max(total_rows, row["total"])
                total_violations += row["nulls"]
            except Exception:
                return RuleResult(
                    rule="not_null", field=f, passed=False,
                    details=f"Table or field not found: {table}.{f}",
                )
        return RuleResult(
            rule="not_null",
            field=",".join(fields),
            passed=total_violations == 0,
            violation_count=total_violations,
            total_count=total_rows,
            details=f"{total_violations} null values found" if total_violations else "All non-null",
        )

    def _check_range_check(self, rule: QualityRule, table: str) -> RuleResult:
        """Check that a numeric field is within [min, max] bounds."""
        f = rule.field or ""
        if not f:
            return RuleResult(rule="range_check", field="", passed=True, details="No field specified")
        conditions = []
        if rule.min is not None:
            conditions.append(f'"{f}" < {rule.min}')
        if rule.max is not None:
            conditions.append(f'"{f}" > {rule.max}')
        if not conditions:
            return RuleResult(rule="range_check", field=f, passed=True, details="No range bounds specified")
        where = " OR ".join(conditions)
        try:
            cursor = self._db.cursor()
            result = cursor.execute(
                f'SELECT COUNT(*) AS total, '
                f'COUNT(CASE WHEN {where} THEN 1 END) AS violations '
                f'FROM "{table}"'
            )
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()
            return RuleResult(
                rule="range_check",
                field=f,
                passed=row["violations"] == 0,
                violation_count=row["violations"],
                total_count=row["total"],
                details=(
                    f'{row["violations"]} values out of range [{rule.min}, {rule.max}]'
                    if row["violations"]
                    else "All in range"
                ),
            )
        except Exception as e:
            return RuleResult(rule="range_check", field=f, passed=False, details=str(e))

    def _check_enum_check(self, rule: QualityRule, table: str) -> RuleResult:
        """Check that a field's values are within an allowed set."""
        f = rule.field or ""
        if not f or not rule.values:
            return RuleResult(rule="enum_check", field=f, passed=True, details="No enum values specified")
        placeholders = ", ".join(f"'{v}'" for v in rule.values)
        try:
            cursor = self._db.cursor()
            result = cursor.execute(
                f'SELECT COUNT(*) AS total, '
                f'COUNT(CASE WHEN "{f}" NOT IN ({placeholders}) THEN 1 END) AS violations '
                f'FROM "{table}"'
            )
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()
            return RuleResult(
                rule="enum_check",
                field=f,
                passed=row["violations"] == 0,
                violation_count=row["violations"],
                total_count=row["total"],
                details=(
                    f'{row["violations"]} values not in allowed set'
                    if row["violations"]
                    else "All values valid"
                ),
            )
        except Exception as e:
            return RuleResult(rule="enum_check", field=f, passed=False, details=str(e))

    def _check_unique(self, rule: QualityRule, table: str) -> RuleResult:
        """Check that a field contains only unique values."""
        f = rule.field or (rule.fields[0] if rule.fields else "")
        if not f:
            return RuleResult(rule="unique", field="", passed=True, details="No field specified")
        try:
            cursor = self._db.cursor()
            result = cursor.execute(
                f'SELECT COUNT(*) AS total, '
                f'COUNT(*) - COUNT(DISTINCT "{f}") AS duplicates '
                f'FROM "{table}"'
            )
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()
            return RuleResult(
                rule="unique",
                field=f,
                passed=row["duplicates"] == 0,
                violation_count=row["duplicates"],
                total_count=row["total"],
                details=(
                    f'{row["duplicates"]} duplicate values'
                    if row["duplicates"]
                    else "All unique"
                ),
            )
        except Exception as e:
            return RuleResult(rule="unique", field=f, passed=False, details=str(e))
```

**Step 2: Write contract validator tests**

Create `tests/test_contract_validator.py`:

```python
"""Tests for ContractValidator."""
import pytest
from backend.db import DuckDBManager
from backend.models.medallion import DataContract, QualityRule
from backend.services.contract_validator import ContractValidator, ContractValidationResult


class TestContractValidator:
    @pytest.fixture
    def db(self):
        mgr = DuckDBManager()
        mgr.connect(":memory:")
        cursor = mgr.cursor()
        cursor.execute(
            "CREATE TABLE test_alerts ("
            "  alert_id VARCHAR NOT NULL,"
            "  model_id VARCHAR NOT NULL,"
            "  score DOUBLE"
            ")"
        )
        cursor.execute(
            "INSERT INTO test_alerts VALUES "
            "('A1', 'M1', 75.0), ('A2', 'M2', 50.0), ('A3', 'M3', 110.0)"
        )
        cursor.close()
        yield mgr
        mgr.close()

    @pytest.fixture
    def contract(self):
        return DataContract(
            contract_id="test_contract",
            source_tier="silver",
            target_tier="gold",
            entity="alert",
            quality_rules=[
                QualityRule(rule="not_null", fields=["alert_id", "model_id", "score"]),
                QualityRule(rule="range_check", field="score", min=0, max=100),
            ],
        )

    def test_validate_passes_not_null(self, db, contract):
        contract.quality_rules = [QualityRule(rule="not_null", fields=["alert_id"])]
        v = ContractValidator(db)
        result = v.validate(contract, "test_alerts")
        assert result.passed is True
        assert result.quality_score == 100.0

    def test_validate_fails_range_check(self, db, contract):
        v = ContractValidator(db)
        result = v.validate(contract, "test_alerts")
        assert result.passed is False  # score 110 > 100
        range_result = [r for r in result.rule_results if r.rule == "range_check"][0]
        assert range_result.violation_count == 1

    def test_validate_with_nulls(self, db, contract):
        cursor = db.cursor()
        cursor.execute("INSERT INTO test_alerts VALUES (NULL, 'M4', 80.0)")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="not_null", fields=["alert_id"])]
        v = ContractValidator(db)
        result = v.validate(contract, "test_alerts")
        assert result.passed is False
        assert result.rule_results[0].violation_count == 1

    def test_validate_enum_check_passes(self, db):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_sides (side VARCHAR)")
        cursor.execute("INSERT INTO test_sides VALUES ('BUY'), ('SELL'), ('BUY')")
        cursor.close()
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e",
            quality_rules=[QualityRule(rule="enum_check", field="side", values=["BUY", "SELL"])],
        )
        v = ContractValidator(db)
        result = v.validate(contract, "test_sides")
        assert result.passed is True

    def test_validate_enum_check_fails(self, db):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_sides2 (side VARCHAR)")
        cursor.execute("INSERT INTO test_sides2 VALUES ('BUY'), ('SELL'), ('INVALID')")
        cursor.close()
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e",
            quality_rules=[QualityRule(rule="enum_check", field="side", values=["BUY", "SELL"])],
        )
        v = ContractValidator(db)
        result = v.validate(contract, "test_sides2")
        assert result.passed is False
        assert result.rule_results[0].violation_count == 1

    def test_validate_unique_check_passes(self, db):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_unique_ok (id VARCHAR)")
        cursor.execute("INSERT INTO test_unique_ok VALUES ('A'), ('B'), ('C')")
        cursor.close()
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e",
            quality_rules=[QualityRule(rule="unique", field="id")],
        )
        v = ContractValidator(db)
        result = v.validate(contract, "test_unique_ok")
        assert result.passed is True

    def test_validate_unique_check_fails(self, db):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_unique_fail (id VARCHAR)")
        cursor.execute("INSERT INTO test_unique_fail VALUES ('A'), ('A'), ('B')")
        cursor.close()
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e",
            quality_rules=[QualityRule(rule="unique", field="id")],
        )
        v = ContractValidator(db)
        result = v.validate(contract, "test_unique_fail")
        assert result.passed is False
        assert result.rule_results[0].violation_count == 1

    def test_validate_quality_score(self, db, contract):
        # 2 rules: not_null passes, range_check fails -> 50%
        v = ContractValidator(db)
        result = v.validate(contract, "test_alerts")
        assert result.quality_score == 50.0

    def test_validate_empty_rules(self, db):
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e"
        )
        v = ContractValidator(db)
        result = v.validate(contract, "test_alerts")
        assert result.passed is True
        assert result.quality_score == 100.0

    def test_unsupported_rule_type_passes(self, db):
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e",
            quality_rules=[QualityRule(rule="custom_sql", field="x")],
        )
        v = ContractValidator(db)
        result = v.validate(contract, "test_alerts")
        assert result.passed is True  # unsupported rules pass by default

    def test_missing_table_fails(self, db):
        contract = DataContract(
            contract_id="c1", source_tier="s", target_tier="g", entity="e",
            quality_rules=[QualityRule(rule="not_null", fields=["col"])],
        )
        v = ContractValidator(db)
        result = v.validate(contract, "nonexistent_table")
        assert result.passed is False
```

**Step 3: Run tests**

```bash
uv run pytest tests/test_contract_validator.py -v
```

Expected: 12 passed.

**Step 4: Commit**

```bash
git add backend/services/contract_validator.py tests/test_contract_validator.py
git commit -m "feat(pipeline): add contract validator service + tests (M197)"
```

---

## Task 2: Pipeline Orchestrator Service + Tests (M197 continued)

**Files:**
- Create: `backend/services/pipeline_orchestrator.py`
- Create: `tests/test_pipeline_orchestrator.py`

The orchestrator reads pipeline stage metadata and dispatches stage execution. It is a metadata-driven dispatcher — it reads stage definitions to know what engines to invoke. The silver_to_gold stage runs the calculation DAG (with SettingsResolver) and then detection models. The orchestrator also validates outputs against data contracts when a contract_id is present on the stage.

**Step 1: Add `transformation_id` and `contract_id` fields to PipelineStage model**

Edit `backend/models/medallion.py` — the `PipelineStage` model currently has no `transformation_id` or `contract_id` fields. Add them:

```python
class PipelineStage(BaseModel):
    """A stage in the medallion pipeline execution plan."""
    stage_id: str
    name: str
    tier_from: str | None = None
    tier_to: str
    order: int = 0
    depends_on: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    parallel: bool = False
    transformation_id: str = ""
    contract_id: str = ""
```

**Step 2: Update pipeline_stages.json with transformation_id and contract_id**

Edit `workspace/metadata/medallion/pipeline_stages.json` to add the new fields to the silver_to_gold stage:

```json
{
  "stage_id": "silver_to_gold",
  "name": "Silver to Gold",
  "tier_from": "silver",
  "tier_to": "gold",
  "order": 4,
  "depends_on": ["bronze_to_silver"],
  "entities": ["alert", "calculation_result"],
  "parallel": false,
  "transformation_id": "silver_to_gold_alerts",
  "contract_id": "silver_to_gold_alerts"
}
```

**Step 3: Create pipeline orchestrator service**

Create `backend/services/pipeline_orchestrator.py`:

```python
"""Medallion pipeline orchestrator — metadata-driven stage execution."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from backend.services.contract_validator import ContractValidator, ContractValidationResult

log = logging.getLogger(__name__)


@dataclass
class StageResult:
    """Outcome of executing a single pipeline stage."""
    stage_id: str
    status: str = "pending"  # pending, running, completed, failed
    started_at: str = ""
    completed_at: str = ""
    duration_ms: int = 0
    steps: list[dict] = field(default_factory=list)
    contract_validation: ContractValidationResult | None = None
    error: str = ""


@dataclass
class PipelineRunResult:
    """Outcome of executing the full pipeline (all stages)."""
    run_id: str
    status: str = "completed"  # completed, failed, partial
    stages: list[StageResult] = field(default_factory=list)
    total_duration_ms: int = 0


class PipelineOrchestrator:
    """Reads medallion pipeline stage metadata and dispatches execution.

    The orchestrator is engine-agnostic: it accepts optional calc_engine and
    detection_engine instances. If they are not provided, the corresponding
    steps are skipped (useful for stages that are SQL-template only).
    """

    def __init__(self, workspace_dir, db, metadata, calc_engine=None, detection_engine=None):
        self._ws = workspace_dir
        self._db = db
        self._metadata = metadata
        self._calc_engine = calc_engine
        self._detection_engine = detection_engine
        self._validator = ContractValidator(db)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_stage(self, stage_id: str) -> StageResult:
        """Execute a single pipeline stage by reading its metadata."""
        config = self._metadata.load_pipeline_stages()
        stage = next((s for s in config.stages if s.stage_id == stage_id), None)
        if not stage:
            return StageResult(
                stage_id=stage_id,
                status="failed",
                error=f"Stage not found: {stage_id}",
            )

        result = StageResult(
            stage_id=stage_id,
            status="running",
            started_at=datetime.now(timezone.utc).isoformat(),
        )
        start = time.time()

        try:
            # Dispatch based on stage transformation
            if stage.transformation_id:
                transformation = self._metadata.load_transformation(stage.transformation_id)
                if transformation and transformation.sql_template and not transformation.sql_template.startswith("--"):
                    self._execute_sql_template(transformation, result)
                else:
                    # Programmatic execution (calc DAG + detection)
                    self._execute_programmatic(result)
            else:
                result.steps.append({"step": "skip", "detail": "No transformation defined"})

            # Validate against data contract if one exists
            if stage.contract_id:
                self._run_contract_validation(stage, result)

            result.status = "completed"
        except Exception as e:
            result.status = "failed"
            result.error = str(e)
            log.error("Stage %s failed: %s", stage_id, e)
        finally:
            result.duration_ms = int((time.time() - start) * 1000)
            result.completed_at = datetime.now(timezone.utc).isoformat()

        return result

    def run_all(self) -> PipelineRunResult:
        """Execute all pipeline stages in order."""
        config = self._metadata.load_pipeline_stages()
        stages = sorted(config.stages, key=lambda s: s.order)
        run_result = PipelineRunResult(
            run_id=datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
        )
        start = time.time()

        for stage in stages:
            stage_result = self.run_stage(stage.stage_id)
            run_result.stages.append(stage_result)
            if stage_result.status == "failed":
                run_result.status = "failed"
                break

        run_result.total_duration_ms = int((time.time() - start) * 1000)
        if run_result.status != "failed":
            run_result.status = "completed"
        return run_result

    # ------------------------------------------------------------------
    # Private dispatch
    # ------------------------------------------------------------------

    def _execute_programmatic(self, result: StageResult) -> None:
        """Execute a programmatic transformation (calc DAG + detection)."""
        # Step 1: Run calculation DAG
        if self._calc_engine:
            dag = self._calc_engine.build_dag()
            for calc in dag:
                try:
                    r = self._calc_engine._execute(calc)
                    result.steps.append({
                        "step": f"calc:{calc.calc_id}",
                        "status": "completed",
                        "rows": r.get("row_count", 0),
                    })
                except Exception as e:
                    result.steps.append({
                        "step": f"calc:{calc.calc_id}",
                        "status": "failed",
                        "error": str(e),
                    })
                    raise

        # Step 2: Run detection models
        if self._detection_engine:
            models = self._metadata.list_detection_models()
            for model in models:
                try:
                    alerts = self._detection_engine.evaluate_model(model.model_id)
                    fired = [a for a in alerts if a.alert_fired]
                    result.steps.append({
                        "step": f"detect:{model.model_id}",
                        "status": "completed",
                        "alerts": len(alerts),
                        "fired": len(fired),
                    })
                except Exception as e:
                    result.steps.append({
                        "step": f"detect:{model.model_id}",
                        "status": "failed",
                        "error": str(e),
                    })
                    raise

    def _execute_sql_template(self, transformation, result: StageResult) -> None:
        """Execute a SQL-template-based transformation."""
        sql = transformation.sql_template
        if sql and not sql.startswith("--"):
            cursor = self._db.cursor()
            cursor.execute(sql)
            cursor.close()
            result.steps.append({"step": "sql_template", "status": "completed"})

    def _run_contract_validation(self, stage, result: StageResult) -> None:
        """Validate stage output against its data contract."""
        contract = self._metadata.load_data_contract(stage.contract_id)
        if not contract:
            result.steps.append({
                "step": "contract_validation",
                "status": "skipped",
                "detail": f"Contract {stage.contract_id} not found",
            })
            return

        # Resolve the output table name for validation
        table_name = self._resolve_output_table(stage)
        if not table_name:
            result.steps.append({
                "step": "contract_validation",
                "status": "skipped",
                "detail": "No output table to validate",
            })
            return

        validation = self._validator.validate(contract, table_name)
        result.contract_validation = validation
        result.steps.append({
            "step": "contract_validation",
            "status": "passed" if validation.passed else "warning",
            "score": validation.quality_score,
        })

    def _resolve_output_table(self, stage) -> str | None:
        """Resolve the output table name for contract validation.

        For gold stage, validation runs against the alerts result table.
        Future stages can add their own resolution logic.
        """
        if stage.tier_to == "gold":
            return "alerts"
        return None
```

**Step 4: Write pipeline orchestrator tests**

Create `tests/test_pipeline_orchestrator.py`:

```python
"""Tests for PipelineOrchestrator."""
import json
import pytest
from pathlib import Path
from unittest.mock import MagicMock

from backend.models.medallion import PipelineConfig, PipelineStage
from backend.services.pipeline_orchestrator import (
    PipelineOrchestrator,
    StageResult,
    PipelineRunResult,
)


class TestPipelineOrchestrator:
    @pytest.fixture
    def mock_metadata(self):
        meta = MagicMock()
        stage = PipelineStage(
            stage_id="silver_to_gold",
            name="Silver to Gold",
            tier_from="silver",
            tier_to="gold",
            order=4,
            depends_on=["bronze_to_silver"],
            entities=["alert", "calculation_result"],
            transformation_id="silver_to_gold_alerts",
            contract_id="silver_to_gold_alerts",
        )
        meta.load_pipeline_stages.return_value = PipelineConfig(stages=[stage])
        # Transformation with comment-only SQL triggers programmatic path
        transform = MagicMock()
        transform.sql_template = "-- programmatic"
        meta.load_transformation.return_value = transform
        meta.load_data_contract.return_value = None  # No contract validation by default
        meta.list_detection_models.return_value = []
        return meta

    @pytest.fixture
    def mock_db(self):
        return MagicMock()

    def test_run_stage_not_found(self, mock_db, mock_metadata):
        mock_metadata.load_pipeline_stages.return_value = PipelineConfig(stages=[])
        orch = PipelineOrchestrator("/tmp", mock_db, mock_metadata)
        result = orch.run_stage("nonexistent")
        assert result.status == "failed"
        assert "not found" in result.error

    def test_run_stage_programmatic_no_engines(self, mock_db, mock_metadata):
        orch = PipelineOrchestrator("/tmp", mock_db, mock_metadata)
        result = orch.run_stage("silver_to_gold")
        assert result.status == "completed"
        assert result.duration_ms >= 0

    def test_run_stage_with_calc_engine(self, mock_db, mock_metadata):
        mock_calc = MagicMock()
        calc_obj = MagicMock()
        calc_obj.calc_id = "value_calc"
        mock_calc.build_dag.return_value = [calc_obj]
        mock_calc._execute.return_value = {"row_count": 100}
        orch = PipelineOrchestrator(
            "/tmp", mock_db, mock_metadata, calc_engine=mock_calc
        )
        result = orch.run_stage("silver_to_gold")
        assert result.status == "completed"
        assert any("calc:value_calc" in s.get("step", "") for s in result.steps)

    def test_run_stage_with_detection(self, mock_db, mock_metadata):
        mock_detect = MagicMock()
        alert_mock = MagicMock()
        alert_mock.alert_fired = True
        mock_detect.evaluate_model.return_value = [alert_mock]
        model = MagicMock()
        model.model_id = "wash_full_day"
        mock_metadata.list_detection_models.return_value = [model]
        orch = PipelineOrchestrator(
            "/tmp", mock_db, mock_metadata, detection_engine=mock_detect
        )
        result = orch.run_stage("silver_to_gold")
        assert result.status == "completed"
        assert any("detect:wash_full_day" in s.get("step", "") for s in result.steps)

    def test_run_stage_calc_failure_propagates(self, mock_db, mock_metadata):
        mock_calc = MagicMock()
        calc_obj = MagicMock()
        calc_obj.calc_id = "bad_calc"
        mock_calc.build_dag.return_value = [calc_obj]
        mock_calc._execute.side_effect = Exception("SQL error")
        orch = PipelineOrchestrator(
            "/tmp", mock_db, mock_metadata, calc_engine=mock_calc
        )
        result = orch.run_stage("silver_to_gold")
        assert result.status == "failed"
        assert "SQL error" in result.error

    def test_run_all(self, mock_db, mock_metadata):
        mock_calc = MagicMock()
        mock_calc.build_dag.return_value = []
        orch = PipelineOrchestrator(
            "/tmp", mock_db, mock_metadata, calc_engine=mock_calc
        )
        result = orch.run_all()
        assert result.status == "completed"
        assert len(result.stages) == 1

    def test_run_stage_records_timing(self, mock_db, mock_metadata):
        orch = PipelineOrchestrator("/tmp", mock_db, mock_metadata)
        result = orch.run_stage("silver_to_gold")
        assert result.started_at != ""
        assert result.completed_at != ""

    def test_run_stage_no_transformation(self, mock_db, mock_metadata):
        """Stage with no transformation_id should skip execution."""
        stage = PipelineStage(
            stage_id="ingest_landing",
            name="Ingest",
            tier_to="landing",
            order=1,
        )
        mock_metadata.load_pipeline_stages.return_value = PipelineConfig(stages=[stage])
        orch = PipelineOrchestrator("/tmp", mock_db, mock_metadata)
        result = orch.run_stage("ingest_landing")
        assert result.status == "completed"
        assert any(s.get("step") == "skip" for s in result.steps)
```

**Step 5: Run tests**

```bash
uv run pytest tests/test_pipeline_orchestrator.py -v
```

Expected: 8 passed.

**Step 6: Commit**

```bash
git add backend/services/pipeline_orchestrator.py tests/test_pipeline_orchestrator.py backend/models/medallion.py workspace/metadata/medallion/pipeline_stages.json
git commit -m "feat(pipeline): add pipeline orchestrator service + tests (M197)"
```

---

## Task 3: Fix Pipeline API + Stage Execution Endpoints (M198)

**Files:**
- Modify: `backend/api/pipeline.py`
- Modify: `backend/services/metadata_service.py` (add `load_transformation_raw`, if needed for raw dict access)
- Add tests to: `tests/test_pipeline_orchestrator.py` (API integration tests)

The existing `POST /pipeline/run` endpoint creates a `CalculationEngine` WITHOUT a `SettingsResolver` — this is a bug. This task fixes that and adds new stage-based execution endpoints.

**Step 1: Fix the existing POST /pipeline/run endpoint to include SettingsResolver**

Edit `backend/api/pipeline.py`:

```python
"""Pipeline execution and monitoring endpoints."""
import logging
import time

from fastapi import APIRouter, Request

from backend.config import settings
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.settings_resolver import SettingsResolver

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/run")
def run_pipeline(request: Request):
    """Execute the full calculation pipeline, returning steps for the frontend."""
    resolver = SettingsResolver()
    engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    try:
        dag = engine.build_dag()
        steps = []
        for calc in dag:
            t0 = time.time()
            try:
                result = engine._execute(calc)
                duration_ms = int((time.time() - t0) * 1000)
                steps.append({
                    "calc_id": calc.calc_id,
                    "name": calc.name,
                    "layer": calc.layer.value,
                    "status": "done",
                    "duration_ms": duration_ms,
                    "row_count": result.get("row_count", 0),
                    "depends_on": calc.depends_on,
                })
            except Exception as calc_err:
                duration_ms = int((time.time() - t0) * 1000)
                steps.append({
                    "calc_id": calc.calc_id,
                    "name": calc.name,
                    "layer": calc.layer.value,
                    "status": "error",
                    "duration_ms": duration_ms,
                    "error": str(calc_err),
                    "depends_on": calc.depends_on,
                })
        return {"status": "completed", "steps": steps}
    except Exception as e:
        log.error("Pipeline run failed: %s", e)
        return {"status": "error", "error": str(e), "steps": []}
```

Note: the response now includes `depends_on` per step so the frontend can build a true DAG.

**Step 2: Add stage-based execution endpoints**

Append to `backend/api/pipeline.py`:

```python
@router.get("/stages")
def list_stages(request: Request):
    """Get pipeline stages from medallion metadata."""
    config = request.app.state.metadata.load_pipeline_stages()
    return [
        {
            "stage_id": s.stage_id,
            "name": s.name,
            "tier_from": s.tier_from,
            "tier_to": s.tier_to,
            "order": s.order,
            "depends_on": s.depends_on,
            "entities": s.entities,
            "parallel": s.parallel,
            "transformation_id": s.transformation_id,
            "contract_id": s.contract_id,
        }
        for s in sorted(config.stages, key=lambda s: s.order)
    ]


@router.post("/stages/{stage_id}/run")
def run_stage(stage_id: str, request: Request):
    """Execute a single medallion pipeline stage."""
    from backend.services.pipeline_orchestrator import PipelineOrchestrator

    resolver = SettingsResolver()
    calc_engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    from backend.engine.detection_engine import DetectionEngine
    detection_engine = DetectionEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    orch = PipelineOrchestrator(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        calc_engine,
        detection_engine,
    )
    result = orch.run_stage(stage_id)
    return {
        "stage_id": result.stage_id,
        "status": result.status,
        "duration_ms": result.duration_ms,
        "started_at": result.started_at,
        "completed_at": result.completed_at,
        "steps": result.steps,
        "contract_validation": (
            {
                "passed": result.contract_validation.passed,
                "quality_score": result.contract_validation.quality_score,
                "rule_results": [
                    {
                        "rule": r.rule,
                        "field": r.field,
                        "passed": r.passed,
                        "violation_count": r.violation_count,
                        "details": r.details,
                    }
                    for r in result.contract_validation.rule_results
                ],
            }
            if result.contract_validation
            else None
        ),
        "error": result.error,
    }
```

**Step 3: Add API tests to test_pipeline_orchestrator.py**

Append a new test class to `tests/test_pipeline_orchestrator.py`:

```python
class TestPipelineStageAPI:
    """Integration tests for pipeline stage API endpoints."""

    @pytest.fixture
    def workspace(self, tmp_path):
        ws = tmp_path / "workspace"
        # Create all required metadata directories
        for d in [
            "metadata/mappings", "metadata/entities",
            "metadata/calculations/transaction", "metadata/calculations/time_windows",
            "metadata/calculations/derived", "metadata/calculations/aggregations",
            "metadata/detection_models", "metadata/settings/thresholds",
            "metadata/settings/score_steps", "metadata/settings/score_thresholds",
            "metadata/medallion/contracts", "metadata/medallion/transformations",
            "metadata/connectors", "metadata/navigation", "metadata/widgets",
            "metadata/format_rules", "metadata/query_presets", "metadata/grids",
            "metadata/view_config", "metadata/theme", "metadata/workflows",
            "metadata/demo", "metadata/tours", "metadata/standards/iso",
            "metadata/standards/fix", "metadata/standards/compliance",
            "metadata/regulations", "metadata/match_patterns", "metadata/score_templates",
            "data/csv", "data/parquet", "results/transaction",
        ]:
            (ws / d).mkdir(parents=True, exist_ok=True)
        # Navigation (required by app)
        (ws / "metadata" / "navigation" / "main.json").write_text(json.dumps({
            "navigation_id": "main", "groups": []
        }))
        # Pipeline stages
        (ws / "metadata" / "medallion" / "pipeline_stages.json").write_text(json.dumps({
            "stages": [{
                "stage_id": "silver_to_gold",
                "name": "Silver to Gold",
                "tier_from": "silver",
                "tier_to": "gold",
                "order": 4,
                "depends_on": ["bronze_to_silver"],
                "entities": ["alert"],
                "transformation_id": "silver_to_gold_alerts",
                "contract_id": "",
            }]
        }))
        # Transformation (comment-only SQL → programmatic)
        (ws / "metadata" / "medallion" / "transformations" / "silver_to_gold_alerts.json").write_text(json.dumps({
            "transformation_id": "silver_to_gold_alerts",
            "source_tier": "silver",
            "target_tier": "gold",
            "entity": "alert",
            "sql_template": "-- programmatic",
        }))
        return ws

    @pytest.fixture
    def client(self, workspace, monkeypatch):
        from backend import config
        from backend.main import app
        from starlette.testclient import TestClient
        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc

    def test_list_stages(self, client):
        resp = client.get("/api/pipeline/stages")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["stage_id"] == "silver_to_gold"

    def test_run_stage_completes(self, client):
        resp = client.post("/api/pipeline/stages/silver_to_gold/run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["stage_id"] == "silver_to_gold"
        assert data["status"] in ("completed", "failed")

    def test_run_stage_not_found(self, client):
        resp = client.post("/api/pipeline/stages/nonexistent/run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "failed"
        assert "not found" in data["error"]

    def test_run_stage_returns_timing(self, client):
        resp = client.post("/api/pipeline/stages/silver_to_gold/run")
        data = resp.json()
        assert "duration_ms" in data
        assert "started_at" in data
        assert "completed_at" in data
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_pipeline_orchestrator.py -v
```

Expected: 12 passed (8 unit + 4 API).

**Step 5: Commit**

```bash
git add backend/api/pipeline.py tests/test_pipeline_orchestrator.py
git commit -m "feat(pipeline): fix SettingsResolver gap + add stage execution API (M198)"
```

---

## Task 4: Silver-to-Gold Mapping Metadata + Calc Input Enrichment (M199)

**Files:**
- Create: `workspace/metadata/mappings/silver_to_gold_calcs.json`
- Modify: `workspace/metadata/calculations/transaction/value_calc.json` (no change needed — `inputs` already present and well-structured)
- Add test to: `tests/test_mapping.py`

The existing calculation JSON files already have well-structured `inputs` arrays declaring which entities and fields each calc needs (e.g., `value_calc.json` inputs list execution and product fields). This task adds the mapping file that formally connects Silver canonical fields to Gold-tier calculation inputs, and adds a test verifying the mapping loads through the API.

**Step 1: Create Silver-to-Gold mapping metadata**

Create `workspace/metadata/mappings/silver_to_gold_calcs.json`:

```json
{
  "mapping_id": "silver_to_gold_calcs",
  "source_entity": "execution",
  "target_entity": "calculation_result",
  "source_tier": "silver",
  "target_tier": "gold",
  "description": "Silver canonical entity fields to Gold calculation inputs. Maps the canonical execution, product, and market data fields used by the calculation DAG.",
  "status": "active",
  "created_by": "system",
  "field_mappings": [
    {"source_field": "execution_id", "target_field": "execution_id", "transform": "direct", "description": "Primary key passthrough"},
    {"source_field": "product_id", "target_field": "product_id", "transform": "direct", "description": "Product FK for join"},
    {"source_field": "account_id", "target_field": "account_id", "transform": "direct", "description": "Account FK for entity context"},
    {"source_field": "trader_id", "target_field": "trader_id", "transform": "direct", "description": "Trader FK for entity context"},
    {"source_field": "side", "target_field": "side", "transform": "direct", "description": "BUY/SELL indicator"},
    {"source_field": "price", "target_field": "price", "transform": "direct", "description": "Execution price"},
    {"source_field": "quantity", "target_field": "quantity", "transform": "direct", "description": "Trade quantity"},
    {"source_field": "execution_date", "target_field": "execution_date", "transform": "direct", "description": "Trade date (ISO 8601)"},
    {"source_field": "execution_time", "target_field": "execution_time", "transform": "direct", "description": "Trade time (ISO 8601)"},
    {"source_field": "venue_mic", "target_field": "venue_mic", "transform": "direct", "description": "Venue MIC code (ISO 10383)"},
    {"source_field": "exec_type", "target_field": "exec_type", "transform": "direct", "description": "Execution type (FIX ExecType)"},
    {"source_field": "capacity", "target_field": "capacity", "transform": "direct", "description": "AGENCY/PRINCIPAL"},
    {"source_field": "order_id", "target_field": "order_id", "transform": "direct", "description": "Order FK for related order lookup"},
    {"source_field": "instrument_type", "target_field": "instrument_type", "transform": "direct", "description": "Product instrument type (via product join)"},
    {"source_field": "asset_class", "target_field": "asset_class", "transform": "direct", "description": "Asset class (via product join)"},
    {"source_field": "contract_size", "target_field": "contract_size", "transform": "direct", "description": "Option/future contract size (via product join)"}
  ]
}
```

**Step 2: Add test verifying the new mapping loads through the API**

Append to the `TestMappingAPI` class in `tests/test_mapping.py`:

```python
    def test_silver_to_gold_mapping_loads(self, client, workspace):
        """Test that Silver-to-Gold mapping metadata loads correctly."""
        (workspace / "metadata" / "mappings" / "silver_to_gold_calcs.json").write_text(json.dumps({
            "mapping_id": "silver_to_gold_calcs",
            "source_entity": "execution",
            "target_entity": "calculation_result",
            "source_tier": "silver",
            "target_tier": "gold",
            "description": "Silver to Gold calc inputs",
            "status": "active",
            "field_mappings": [
                {"source_field": "execution_id", "target_field": "execution_id", "transform": "direct"},
                {"source_field": "price", "target_field": "price", "transform": "direct"},
            ]
        }))
        resp = client.get("/api/mappings/silver_to_gold_calcs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_tier"] == "silver"
        assert data["target_tier"] == "gold"
        assert len(data["field_mappings"]) == 2

    def test_list_mappings_includes_silver_to_gold(self, client, workspace):
        """Test that listing mappings includes Silver-to-Gold entries."""
        (workspace / "metadata" / "mappings" / "silver_to_gold_calcs.json").write_text(json.dumps({
            "mapping_id": "silver_to_gold_calcs",
            "source_entity": "execution",
            "target_entity": "calculation_result",
            "source_tier": "silver",
            "target_tier": "gold",
            "status": "active",
            "field_mappings": []
        }))
        resp = client.get("/api/mappings/")
        assert resp.status_code == 200
        data = resp.json()
        ids = [m["mapping_id"] for m in data]
        assert "silver_to_gold_calcs" in ids
```

**Step 3: Run tests**

```bash
uv run pytest tests/test_mapping.py -v
```

Expected: all existing tests + 2 new = 14+ passed.

**Step 4: Commit**

```bash
git add workspace/metadata/mappings/silver_to_gold_calcs.json tests/test_mapping.py
git commit -m "feat(mapping): add Silver-to-Gold calculation input mapping metadata (M199)"
```

---

## Task 5: Silver-to-Gold Data Contract for Calculation Results + Transformation Strategy (M200)

**Files:**
- Create: `workspace/metadata/medallion/contracts/silver_to_gold_calc_results.json`
- Modify: `workspace/metadata/medallion/transformations/silver_to_gold_alerts.json` (add `strategy` field)
- Add tests to: `tests/test_medallion.py`

**Step 1: Create data contract for calculation results**

Create `workspace/metadata/medallion/contracts/silver_to_gold_calc_results.json`:

```json
{
  "contract_id": "silver_to_gold_calc_results",
  "source_tier": "silver",
  "target_tier": "gold",
  "entity": "calculation_result",
  "description": "Data quality contract for Silver-to-Gold calculation results. Validates that the calculation DAG produces complete, valid outputs before they feed into detection models.",
  "field_mappings": [
    {"source": "execution_id", "target": "execution_id", "transform": "passthrough"},
    {"source": "product_id", "target": "product_id", "transform": "passthrough"},
    {"source": "calculated_value", "target": "trade_value", "transform": "passthrough"}
  ],
  "quality_rules": [
    {"rule": "not_null", "fields": ["execution_id", "product_id"]},
    {"rule": "range_check", "field": "calculated_value", "min": 0}
  ],
  "sla": {"freshness_minutes": 30, "completeness_pct": 99.5},
  "owner": "surveillance-ops",
  "classification": "internal"
}
```

**Step 2: Update transformation metadata to include strategy field**

Edit `workspace/metadata/medallion/transformations/silver_to_gold_alerts.json` — add `"strategy": "programmatic"` field so the orchestrator can dispatch correctly. The full file becomes:

```json
{
  "transformation_id": "silver_to_gold_alerts",
  "source_tier": "silver",
  "target_tier": "gold",
  "entity": "alert",
  "description": "Execute detection models against canonical silver data to produce gold-tier alerts",
  "sql_template": "-- Executed programmatically by detection engine\n-- Each model runs its calculation DAG, evaluates thresholds, and produces scored alerts",
  "parameters": {"score_threshold": "from_settings", "model_ids": "all_active"},
  "quality_checks": ["score_range_valid", "model_id_exists", "alert_id_unique"],
  "error_handling": "log_and_continue"
}
```

Note: the `TransformationStep` Pydantic model does not have a `strategy` field, and the orchestrator already correctly checks `sql_template.startswith("--")` to determine programmatic dispatch. No model change needed — the comment-prefixed SQL template serves as the strategy indicator.

**Step 3: Add test for the new contract**

Append to `tests/test_medallion.py` (in the existing test class):

```python
    def test_get_calc_results_contract(self, client, workspace):
        """Test the Silver-to-Gold calc results contract loads."""
        (workspace / "metadata" / "medallion" / "contracts" / "silver_to_gold_calc_results.json").write_text(json.dumps({
            "contract_id": "silver_to_gold_calc_results",
            "source_tier": "silver",
            "target_tier": "gold",
            "entity": "calculation_result",
            "quality_rules": [
                {"rule": "not_null", "fields": ["execution_id", "product_id"]},
                {"rule": "range_check", "field": "calculated_value", "min": 0}
            ],
            "sla": {"freshness_minutes": 30, "completeness_pct": 99.5}
        }))
        resp = client.get("/api/medallion/contracts/silver_to_gold_calc_results")
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity"] == "calculation_result"
        assert data["source_tier"] == "silver"
        assert data["target_tier"] == "gold"
        assert len(data["quality_rules"]) == 2

    def test_list_contracts_includes_calc_results(self, client, workspace):
        """Test that listing contracts includes the calc results contract."""
        (workspace / "metadata" / "medallion" / "contracts" / "silver_to_gold_calc_results.json").write_text(json.dumps({
            "contract_id": "silver_to_gold_calc_results",
            "source_tier": "silver",
            "target_tier": "gold",
            "entity": "calculation_result",
            "quality_rules": []
        }))
        resp = client.get("/api/medallion/contracts")
        assert resp.status_code == 200
        ids = [c["contract_id"] for c in resp.json()]
        assert "silver_to_gold_calc_results" in ids
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_medallion.py -v
```

Expected: all existing + 2 new passed.

**Step 5: Commit**

```bash
git add workspace/metadata/medallion/contracts/silver_to_gold_calc_results.json workspace/metadata/medallion/transformations/silver_to_gold_alerts.json tests/test_medallion.py
git commit -m "feat(pipeline): add Silver-to-Gold calc results data contract (M200)"
```

---

## Task 6: MappingStudio Silver-to-Gold Tier Selectors (M201)

**Files:**
- Modify: `frontend/src/views/MappingStudio/index.tsx`

This task adds tier-based filtering to the MappingStudio so users can view and edit Silver-to-Gold mappings alongside the existing Bronze-to-Silver ones.

**Step 1: Add tier state and filtering**

Edit `frontend/src/views/MappingStudio/index.tsx`:

1. Add state for tier selectors:
```typescript
const [sourceTier, setSourceTier] = useState("bronze");
const [targetTier, setTargetTier] = useState("silver");
```

2. Define the tier options:
```typescript
const TIER_OPTIONS = ["landing", "bronze", "silver", "gold", "platinum"];
```

3. Filter mappings by selected tier pair:
```typescript
const filteredMappings = mappings.filter(
  (m) => m.source_tier === sourceTier && m.target_tier === targetTier
);
```

4. Add tier selector dropdowns in the Mapping Selector panel, before the mapping dropdown. Insert two `<label>` elements with `<select>` dropdowns for Source Tier and Target Tier, using the same styling as existing selectors. Add `data-tour="mapping-tier-source"` and `data-tour="mapping-tier-target"` attributes.

5. When creating a new mapping, pre-fill `source_tier` and `target_tier` from the current tier selector values:
```typescript
const startNew = () => {
  setSelected({
    ...emptyMapping(),
    source_tier: sourceTier,
    target_tier: targetTier,
  });
  // ... rest unchanged
};
```

6. Use `filteredMappings` instead of `mappings` in the mapping dropdown options.

7. When tier pair changes, clear the current selection if the selected mapping does not match the new tier pair.

**Step 2: Add data-tour and data-trace attributes**

- Add `data-tour="mapping-tier-source"` to the Source Tier dropdown.
- Add `data-tour="mapping-tier-target"` to the Target Tier dropdown.
- Keep all existing `data-trace` attributes unchanged — the tier selectors live inside the existing `mapping-studio.mapping-selector` traced section.

**Step 3: Verify backward compatibility**

The default tier values are `bronze`/`silver`, matching the existing 3 mappings. When the page loads, the user sees the same Bronze-to-Silver mappings as before. Silver-to-Gold mappings only appear when the user changes the tier selectors.

**Step 4: Build frontend**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

**Step 5: Playwright verification**

1. Navigate to /mappings
2. Verify default view shows Bronze-to-Silver mappings (3 mappings: execution_bronze_silver, order_bronze_silver, product_bronze_silver)
3. Change Source Tier to "silver", Target Tier to "gold"
4. Verify silver_to_gold_calcs mapping appears
5. Select it — verify 16 field mappings load
6. Screenshot both themes

**Step 6: Commit**

```bash
git add frontend/src/views/MappingStudio/index.tsx
git commit -m "feat(mapping): add tier selectors to MappingStudio for Silver-to-Gold mappings (M201)"
```

---

## Task 7: PipelineMonitor Overhaul — True DAG + Medallion Stages (M202)

**Files:**
- Modify: `frontend/src/views/PipelineMonitor/PipelineDAG.tsx`
- Modify: `frontend/src/views/PipelineMonitor/index.tsx`
- Modify: `frontend/src/stores/pipelineStore.ts`

This is the largest frontend task. The PipelineDAG currently chains nodes linearly by array index — this task fixes it to use actual `depends_on` edges, adds medallion stage grouping, includes detection model steps, shows contract validation status, and adds a "Run Stage" action.

**Step 1: Update PipelineStep type to include depends_on**

Edit `frontend/src/stores/pipelineStore.ts` — add `depends_on` to the `PipelineStep` interface:

```typescript
export interface PipelineStep {
  calc_id: string;
  name: string;
  layer: string;
  status: "pending" | "running" | "done" | "error";
  duration_ms?: number;
  row_count?: number;
  error?: string;
  depends_on?: string[];
}
```

Add a `MedallionStage` interface and stage-related state:

```typescript
export interface MedallionStage {
  stage_id: string;
  name: string;
  tier_from: string | null;
  tier_to: string;
  order: number;
  depends_on: string[];
  entities: string[];
  transformation_id: string;
  contract_id: string;
}

export interface StageRunResult {
  stage_id: string;
  status: string;
  duration_ms: number;
  steps: { step: string; status: string; rows?: number; alerts?: number; fired?: number; error?: string }[];
  contract_validation: {
    passed: boolean;
    quality_score: number;
    rule_results: { rule: string; field: string; passed: boolean; violation_count: number; details: string }[];
  } | null;
  error: string;
}
```

Add to the store:
```typescript
stages: MedallionStage[];
stageResult: StageRunResult | null;
stageRunning: boolean;
fetchStages: () => Promise<void>;
runStage: (stageId: string) => Promise<void>;
```

Implement:
```typescript
stages: [],
stageResult: null,
stageRunning: false,

fetchStages: async () => {
  try {
    const data = await api.get<MedallionStage[]>("/pipeline/stages");
    set({ stages: data });
  } catch {}
},

runStage: async (stageId: string) => {
  set({ stageRunning: true, stageResult: null, error: null });
  try {
    const data = await api.post<StageRunResult>(`/pipeline/stages/${stageId}/run`);
    set({ stageResult: data, stageRunning: false });
  } catch (e) {
    set({ error: String(e), stageRunning: false });
  }
},
```

**Step 2: Fix PipelineDAG to use actual depends_on edges**

Edit `frontend/src/views/PipelineMonitor/PipelineDAG.tsx`:

Replace the linear edge chain in `layoutSteps()`:

```typescript
// BEFORE (linear chain — bug):
for (let i = 1; i < steps.length; i++) {
  g.setEdge(steps[i - 1].calc_id, steps[i].calc_id);
}

// AFTER (actual dependency edges):
const stepIds = new Set(steps.map((s) => s.calc_id));
for (const step of steps) {
  if (step.depends_on) {
    for (const dep of step.depends_on) {
      if (stepIds.has(dep)) {
        g.setEdge(dep, step.calc_id);
      }
    }
  }
}
// Fallback: if a step has no incoming edges and is not the first, connect from the previous step
// (handles cases where depends_on is empty for some steps)
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const hasIncoming = steps.some(
    (s) => s.depends_on?.includes(step.calc_id) === false && step.depends_on?.length === 0 && i > 0
  );
  if (i > 0 && (!step.depends_on || step.depends_on.length === 0)) {
    // Root calculations without explicit deps: connect based on layer ordering
    const prevLayerSteps = steps.filter(
      (s, j) => j < i && s.layer !== step.layer
    );
    if (prevLayerSteps.length > 0) {
      g.setEdge(prevLayerSteps[prevLayerSteps.length - 1].calc_id, step.calc_id);
    }
  }
}
```

Also update the edge rendering to use the correct source/target from dependency info instead of sequential indices.

**Step 3: Add Medallion Stage Progress Bar to PipelineMonitor**

Edit `frontend/src/views/PipelineMonitor/index.tsx` — add a horizontal progress bar above the DAG showing pipeline stages:

```tsx
{/* Medallion Stage Progress Bar */}
<Panel
  title="Pipeline Stages"
  dataTour="pipeline-stages"
  dataTrace="pipeline.medallion-stages"
  tooltip="Medallion pipeline stages from metadata"
>
  <div className="flex items-center gap-2 overflow-x-auto py-1">
    {stages.map((s, i) => (
      <div key={s.stage_id} className="flex items-center gap-2">
        {i > 0 && (
          <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        <button
          onClick={() => { void runStage(s.stage_id); }}
          disabled={stageRunning}
          className={`px-3 py-1.5 text-xs rounded border transition-colors whitespace-nowrap ${
            stageResult?.stage_id === s.stage_id
              ? stageResult.status === "completed"
                ? "border-success text-success bg-success/10"
                : "border-destructive text-destructive bg-destructive/10"
              : "border-border text-muted hover:border-accent hover:text-accent"
          }`}
          title={`Run ${s.name}`}
        >
          {s.name}
        </button>
      </div>
    ))}
  </div>
</Panel>
```

Add `useEffect` to fetch stages on mount:
```typescript
const { stages, stageResult, stageRunning, fetchStages, runStage } = usePipelineStore();

useEffect(() => {
  fetchStages();
}, [fetchStages]);
```

**Step 4: Add Contract Validation Panel**

When a stage run completes with contract validation results, show a panel below the stages:

```tsx
{stageResult?.contract_validation && (
  <Panel
    title={`Contract Validation — ${stageResult.stage_id}`}
    dataTrace="pipeline.contract-validation"
  >
    <div className="flex items-center gap-3 mb-2">
      <StatusBadge
        label={stageResult.contract_validation.passed ? "PASSED" : "FAILED"}
        variant={stageResult.contract_validation.passed ? "success" : "error"}
      />
      <span className="text-xs text-muted">
        Quality Score: {stageResult.contract_validation.quality_score}%
      </span>
    </div>
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted border-b border-border">
          <th className="pb-1">Rule</th>
          <th className="pb-1">Field</th>
          <th className="pb-1">Status</th>
          <th className="pb-1">Violations</th>
          <th className="pb-1">Details</th>
        </tr>
      </thead>
      <tbody>
        {stageResult.contract_validation.rule_results.map((r, i) => (
          <tr key={i} className="border-b border-border/50">
            <td className="py-1">{r.rule}</td>
            <td className="py-1 font-mono">{r.field}</td>
            <td className="py-1">
              <span className={r.passed ? "text-success" : "text-destructive"}>
                {r.passed ? "pass" : "fail"}
              </span>
            </td>
            <td className="py-1 font-mono">{r.violation_count}</td>
            <td className="py-1 text-muted">{r.details}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Panel>
)}
```

**Step 5: Import StatusBadge**

Add `import StatusBadge from "../../components/StatusBadge.tsx";` to PipelineMonitor's imports (if not already present).

**Step 6: Build frontend**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

**Step 7: Playwright verification**

1. Navigate to /pipeline
2. Verify medallion stage progress bar appears (5 stages)
3. Click "Run Pipeline" — verify DAG shows actual dependency edges (fan-in pattern for value_calc → adjusted_direction, not a straight line)
4. Click a stage button (e.g., "Silver to Gold") — verify stage runs and result shows
5. If contract validation data returns, verify the contract validation panel appears
6. Screenshot in both themes

**Step 8: Commit**

```bash
git add frontend/src/views/PipelineMonitor/index.tsx frontend/src/views/PipelineMonitor/PipelineDAG.tsx frontend/src/stores/pipelineStore.ts
git commit -m "feat(pipeline): overhaul PipelineMonitor with true DAG + medallion stages (M202)"
```

---

## Task 8: MedallionOverview Execution Status + Run Stage Action (M203)

**Files:**
- Modify: `frontend/src/views/MedallionOverview/index.tsx`

This task adds execution status indicators to tier nodes and a "Run Stage" action button in the tier detail panel.

**Step 1: Add execution state**

Add state for stage execution tracking:

```typescript
const [stageStatus, setStageStatus] = useState<Record<string, { status: string; duration_ms: number; quality_score: number | null }>>({});
const [runningStage, setRunningStage] = useState<string | null>(null);
```

**Step 2: Add "Run Stage" function**

```typescript
const handleRunStage = useCallback(async (stageId: string) => {
  setRunningStage(stageId);
  try {
    const result = await api.post<{
      stage_id: string;
      status: string;
      duration_ms: number;
      contract_validation: { quality_score: number } | null;
    }>(`/pipeline/stages/${stageId}/run`);
    setStageStatus((prev) => ({
      ...prev,
      [result.stage_id]: {
        status: result.status,
        duration_ms: result.duration_ms,
        quality_score: result.contract_validation?.quality_score ?? null,
      },
    }));
  } catch {
    setStageStatus((prev) => ({
      ...prev,
      [stageId]: { status: "failed", duration_ms: 0, quality_score: null },
    }));
  } finally {
    setRunningStage(null);
  }
}, []);
```

**Step 3: Add status indicator to tier nodes**

In the `buildGraph` function (or after it), modify the node style to include a status indicator. Use a small colored dot (green/red/gray) in the node label based on whether a stage targeting this tier has been run:

```typescript
// After building nodes, overlay execution status
const nodesWithStatus = nodes.map((n) => {
  const tierStage = stages.find((s) => s.tier_to === n.id || s.tier_from === n.id);
  const execStatus = tierStage ? stageStatus[tierStage.stage_id] : undefined;
  const statusIcon = execStatus
    ? execStatus.status === "completed" ? " [OK]" : " [FAIL]"
    : "";
  return {
    ...n,
    data: {
      ...n.data,
      label: n.data.label + statusIcon,
    },
    style: {
      ...n.style,
      borderWidth: execStatus ? 3 : 2,
    },
  };
});
```

**Step 4: Add "Run Stage" button in tier detail panel**

Inside the tier detail panel's `tierStages` section, add a "Run Stage" button for each stage:

```tsx
{tierStages.map((s) => (
  <div key={s.stage_id} className="border border-border rounded p-2 mb-1">
    <div className="flex items-center justify-between">
      <p className="font-medium">{s.name}</p>
      <button
        onClick={() => handleRunStage(s.stage_id)}
        disabled={runningStage === s.stage_id}
        className="px-2 py-0.5 text-[10px] rounded border border-accent text-accent hover:bg-accent/10 disabled:opacity-50"
        data-tour="medallion-run-stage"
        data-trace="medallion.run-stage"
      >
        {runningStage === s.stage_id ? "Running..." : "Run Stage"}
      </button>
    </div>
    <p className="text-muted">
      {s.tier_from ?? "source"} → {s.tier_to}
    </p>
    <p className="text-muted">
      {s.entities.length} entities
      {s.parallel ? " (parallel)" : " (sequential)"}
    </p>
    {/* Show execution result if available */}
    {stageStatus[s.stage_id] && (
      <div className="mt-1 pt-1 border-t border-border/50">
        <StatusBadge
          label={stageStatus[s.stage_id].status}
          variant={stageStatus[s.stage_id].status === "completed" ? "success" : "error"}
        />
        <span className="text-[10px] text-muted ml-2">
          {stageStatus[s.stage_id].duration_ms}ms
        </span>
        {stageStatus[s.stage_id].quality_score !== null && (
          <span className="text-[10px] text-muted ml-2">
            Quality: {stageStatus[s.stage_id].quality_score}%
          </span>
        )}
      </div>
    )}
  </div>
))}
```

**Step 5: Build frontend**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

**Step 6: Playwright verification**

1. Navigate to /medallion
2. Verify tier nodes render (no visual regression from existing behavior)
3. Click a tier (e.g., Gold) — verify detail panel shows pipeline stages
4. Click "Run Stage" on Silver-to-Gold — verify it executes and status updates
5. Verify the tier node label updates with status indicator
6. Screenshot in both themes

**Step 7: Commit**

```bash
git add frontend/src/views/MedallionOverview/index.tsx
git commit -m "feat(medallion): add execution status + Run Stage action to MedallionOverview (M203)"
```

---

## Task 9: Tours, Scenarios, Operations, Architecture Registry (M204)

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts`
- Modify: `frontend/src/data/scenarioDefinitions.ts`
- Modify: `frontend/src/data/operationScripts.ts`
- Modify: `frontend/src/data/architectureRegistry.ts`
- Modify: `workspace/metadata/tours/registry.json`

**Step 1: Update tours**

In `frontend/src/data/tourDefinitions.ts`:

Update the `mappings` tour — add 2 new steps for tier selectors:

```typescript
{
  target: "[data-tour='mapping-tier-source']",
  title: "Source Tier Selector",
  content: "Filter mappings by source tier. The default is Bronze — change to Silver to see Silver-to-Gold mappings for calculation inputs.",
  placement: "bottom",
},
{
  target: "[data-tour='mapping-tier-target']",
  title: "Target Tier Selector",
  content: "Filter by target tier. Set Source to Silver and Target to Gold to view the calculation input mappings.",
  placement: "bottom",
},
```

Update the `pipeline` tour — add steps for medallion stages and contract validation:

```typescript
{
  target: "[data-tour='pipeline-stages']",
  title: "Medallion Pipeline Stages",
  content: "The pipeline stages progress bar shows all medallion tier-to-tier stages loaded from metadata. Click any stage button to execute it individually.",
  placement: "bottom",
},
```

Update the `medallion` tour — add step for Run Stage action:

```typescript
{
  target: "[data-tour='medallion-run-stage']",
  title: "Run Pipeline Stage",
  content: "Execute a pipeline stage directly from the tier detail panel. The orchestrator reads stage metadata to dispatch the correct transformation — calculation DAG, detection models, or SQL template.",
  placement: "left",
},
```

**Step 2: Add S30 scenario**

In `frontend/src/data/scenarioDefinitions.ts`, add a new scenario:

```typescript
const S30_PIPELINE_ORCHESTRATION: ScenarioDefinition = {
  id: "s30_pipeline_orchestration",
  name: "Pipeline Orchestration",
  description:
    "Run the Silver-to-Gold pipeline stage, observe calculation DAG execution, detection model evaluation, and contract validation — all driven by metadata.",
  category: "pipeline",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='pipeline-stages']",
      title: "Pipeline Stages",
      content: "The medallion pipeline stages are loaded from pipeline_stages.json metadata. Each stage defines a tier-to-tier transformation with dependencies, entities, and optional contract validation.",
      placement: "bottom",
      route: "/pipeline",
      action: "navigate",
      actionTarget: "[data-tour='pipeline-stages']",
      hint: "Navigate to the Pipeline Monitor view.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Execution DAG",
      content: "The DAG visualization now shows true dependency edges from the depends_on field in calculation metadata — not a linear chain. Fan-in and fan-out patterns are visible.",
      placement: "bottom",
      action: "wait",
      hint: "Observe the DAG panel. After running the pipeline, you will see the actual dependency structure.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-run']",
      title: "Run the Pipeline",
      content: "Click Run Pipeline to execute the full calculation DAG with SettingsResolver parameter substitution. Each calculation resolves its settings, executes SQL, and writes Parquet results.",
      placement: "left",
      action: "click",
      actionTarget: "[data-tour='pipeline-run']",
      hint: "Click the Run Pipeline button to execute all calculations.",
      delay: 5000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Observe DAG Execution",
      content: "Watch the DAG nodes update with status colors: green for completed, red for errors. Each node shows the calculation name and execution time.",
      placement: "bottom",
      action: "wait",
      hint: "Watch the DAG panel as calculations execute.",
      delay: 4000,
    },
    {
      target: "[data-tour='medallion-graph']",
      title: "Medallion Architecture",
      content: "Navigate to the Medallion Overview to see the 11-tier architecture. Tier nodes now show execution status indicators from the last pipeline run.",
      placement: "bottom",
      route: "/medallion",
      action: "navigate",
      actionTarget: "[data-tour='medallion-graph']",
      hint: "Navigate to the Medallion Architecture view.",
      delay: 3000,
    },
    {
      target: "[data-tour='medallion-tier-detail']",
      title: "Tier Detail + Run Stage",
      content: "Click the Gold tier to see its data contracts, pipeline stages, and a Run Stage button. Running a stage from here uses the Pipeline Orchestrator — it reads stage metadata to dispatch the correct transformation.",
      placement: "left",
      action: "wait",
      hint: "Click on the Gold tier node, then look at the detail panel on the right.",
      delay: 4000,
    },
  ],
};
```

Add to the exported `SCENARIOS` array. Update the comment header count.

**Step 3: Update operation scripts**

In `frontend/src/data/operationScripts.ts`:

Add to the `pipeline` view operations:

```typescript
{
  id: "run_medallion_stage",
  name: "Run Medallion Stage",
  description:
    "Execute a specific pipeline stage (e.g., Silver-to-Gold) using the metadata-driven orchestrator. The orchestrator reads pipeline_stages.json to dispatch calculations, detection models, and contract validation.",
  scenarioId: "s30_pipeline_orchestration",
},
{
  id: "view_contract_validation",
  name: "View Contract Validation",
  description:
    "After running a pipeline stage, review the contract validation results showing quality rule pass/fail status and overall quality score.",
},
```

Add to the `medallion` view operations:

```typescript
{
  id: "run_stage_from_tier",
  name: "Run Stage from Tier Detail",
  description:
    "Execute a pipeline stage directly from the Medallion Overview tier detail panel. The result shows execution status, duration, and quality score.",
},
```

Add to the `mappings` view operations:

```typescript
{
  id: "select_tier_pair",
  name: "Select Tier Pair",
  description:
    "Use the Source Tier and Target Tier dropdowns to filter mappings by medallion tier pair. Switch from Bronze-to-Silver (default) to Silver-to-Gold to see calculation input mappings.",
},
```

**Step 4: Update architecture registry**

In `frontend/src/data/architectureRegistry.ts`:

Update the `pipeline-monitor` view — modify existing section and add new sections:

Update `pipeline.execution-dag`:
```typescript
description: "True dependency DAG visualization using depends_on edges from calculation metadata. Nodes are laid out with dagre, edges follow actual data dependencies (not linear chain). Each node shows calculation name, status color, and execution time.",
metadataMaturity: "fully-metadata-driven" as const,
```

Add new section `pipeline.medallion-stages`:
```typescript
{
  id: "pipeline.medallion-stages",
  displayName: "Medallion Stage Progress",
  viewId: "pipeline",
  description: "Horizontal progress bar showing all medallion pipeline stages loaded from pipeline_stages.json metadata. Each stage button triggers the Pipeline Orchestrator which reads transformation metadata to dispatch execution.",
  files: [
    { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Renders stage progress bar" },
    { path: "backend/services/pipeline_orchestrator.py", role: "Metadata-driven stage dispatcher" },
    { path: "backend/api/pipeline.py", role: "Stage execution API endpoints" },
  ],
  stores: [
    { name: "pipelineStore", path: "frontend/src/stores/pipelineStore.ts", role: "Fetches stages and runs stage execution" },
  ],
  apis: [
    { method: "GET", path: "/api/pipeline/stages", role: "List pipeline stages from metadata", routerFile: "backend/api/pipeline.py" },
    { method: "POST", path: "/api/pipeline/stages/{stage_id}/run", role: "Execute a single pipeline stage", routerFile: "backend/api/pipeline.py" },
  ],
  dataSources: [
    { type: "metadata", path: "workspace/metadata/medallion/pipeline_stages.json", role: "Pipeline stage definitions" },
    { type: "metadata", path: "workspace/metadata/medallion/transformations/", role: "Transformation definitions" },
  ],
  technologies: ["React 19", "FastAPI", "DuckDB", "Pydantic v2"],
  metadataMaturity: "fully-metadata-driven" as const,
  maturityNotes: "Pipeline stages, transformations, and dispatch logic all driven by metadata JSON.",
},
```

Add new section `pipeline.contract-validation`:
```typescript
{
  id: "pipeline.contract-validation",
  displayName: "Contract Validation Status",
  viewId: "pipeline",
  description: "Shows data contract validation results after running a pipeline stage. Quality rules (not_null, range_check, enum_check, unique) from contract metadata are evaluated against DuckDB tables, producing pass/fail and quality score.",
  files: [
    { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Renders contract validation table" },
    { path: "backend/services/contract_validator.py", role: "Evaluates quality rules against DuckDB" },
  ],
  stores: [
    { name: "pipelineStore", path: "frontend/src/stores/pipelineStore.ts", role: "Stores stage run result with contract validation" },
  ],
  apis: [
    { method: "POST", path: "/api/pipeline/stages/{stage_id}/run", role: "Returns contract validation in response", routerFile: "backend/api/pipeline.py" },
  ],
  dataSources: [
    { type: "metadata", path: "workspace/metadata/medallion/contracts/", role: "Data contract definitions with quality rules" },
  ],
  technologies: ["React 19", "FastAPI", "DuckDB"],
  metadataMaturity: "fully-metadata-driven" as const,
  maturityNotes: "Contract rules, field mappings, and SLA thresholds all from metadata JSON.",
},
```

Update `medallion.tier-detail` to include execution status and Run Stage action in description.

Update `mapping-studio.mapping-selector` to mention tier pair selectors in description.

Update the file header comment with the new section count: should be 83+ sections.

**Step 5: Update tour registry**

Edit `workspace/metadata/tours/registry.json` — update the tour count and add the new scenario reference.

**Step 6: Build frontend**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

**Step 7: Commit**

```bash
git add frontend/src/data/tourDefinitions.ts frontend/src/data/scenarioDefinitions.ts frontend/src/data/operationScripts.ts frontend/src/data/architectureRegistry.ts workspace/metadata/tours/registry.json
git commit -m "feat(pipeline): update tours, scenarios, operations, architecture registry (M204)"
```

---

## Task 10: Full Test Suite + Playwright Verification (M204 continued)

**Step 1: Run all backend tests**

```bash
uv run pytest tests/ --ignore=tests/e2e -v
```

Expected: 562 + ~22 new (12 contract_validator + 8 orchestrator + 4 API + 2 mapping + 2 medallion) = 584+ passed.

Fix any failures before proceeding.

**Step 2: Build frontend**

```bash
cd frontend && npm run build
```

Expected: 0 errors, count the module output.

**Step 3: Playwright visual verification — full sweep**

Use the Playwright MCP browser to verify all changed views:

1. **MappingStudio (backward compatibility)**:
   - Navigate to /mappings
   - Default view shows Bronze-to-Silver (3 mappings)
   - Change tiers to Silver → Gold
   - silver_to_gold_calcs mapping appears with 16 field mappings
   - Screenshot both themes

2. **PipelineMonitor (DAG + stages)**:
   - Navigate to /pipeline
   - Medallion stage progress bar visible (5 stages)
   - Click "Run Pipeline" — verify DAG shows fan-in/fan-out edges, not a linear chain
   - Click a stage button — verify stage result displays
   - If contract validation returns, verify table renders
   - Screenshot both themes

3. **MedallionOverview (execution status)**:
   - Navigate to /medallion
   - Click Gold tier — detail panel shows pipeline stages
   - Click "Run Stage" — execution runs and status indicator updates
   - Screenshot both themes

4. **Tours**:
   - Verify Mappings tour works (includes tier selector steps)
   - Verify Pipeline tour works (includes stage steps)
   - Verify Medallion tour works (includes Run Stage step)

5. **Scenarios**:
   - Verify S29 still works (backward compatibility)
   - Verify S30 works in Watch mode (navigates pipeline → medallion)

6. **Trace mode**:
   - Enable trace mode on PipelineMonitor — verify new trace icons visible for medallion-stages and contract-validation sections

**Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix(pipeline): visual verification fixes from Playwright sweep (M204)"
```

---

## Task 11: Run Phase D of the Development Workflow Protocol

Per `docs/development-workflow-protocol.md`, execute the 3-tier Milestone Completion Protocol.

**Tier 1 (per-task updates):**

1. **`docs/progress.md`** — add M197-M204 entries:
   - M197: Contract Validator + Pipeline Orchestrator — backend services for data contract validation and metadata-driven stage execution
   - M198: Pipeline API overhaul — fix SettingsResolver gap, add stage execution endpoints (GET /stages, POST /stages/{id}/run)
   - M199: Silver-to-Gold mapping metadata — formal calc input registry with 16 field mappings
   - M200: Silver-to-Gold data contracts — calc results contract with quality rules
   - M201: MappingStudio tier selectors — filter by tier pair, Silver-to-Gold tab
   - M202: PipelineMonitor overhaul — true DAG edges, medallion stage bar, contract validation panel
   - M203: MedallionOverview execution status — Run Stage action, status indicators
   - M204: Tours/scenarios/operations/architecture — S30 scenario, 3+ new arch sections, operations

2. **`docs/demo-guide.md`** — update MappingStudio, PipelineMonitor, MedallionOverview sections with new capabilities

3. **`docs/architecture-traceability.md`** — recalculate maturity percentage with new sections

**Tier 2 (test count sync):**

Get actual counts by running:
```bash
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -1
cd frontend && npm run build 2>&1 | grep "modules transformed"
grep -c "metadataMaturity:" frontend/src/data/architectureRegistry.ts
```

Update ALL locations in the Test Count Sync Registry with actual values:
- `CLAUDE.md` (lines 4, 9, 11, 22)
- `README.md` (lines 31, 192, 199, 209)
- `docs/progress.md` (line 5)
- `docs/feature-development-checklist.md` (lines 5, 28, 61, 295)
- `docs/development-workflow-protocol.md` (sync registry entries)
- `docs/plans/2026-02-24-comprehensive-roadmap.md` (lines 19, 802-804)

Sync counts:
- Backend tests: actual count (expected ~584)
- E2E tests: 210 (unchanged)
- Total tests: actual count (expected ~794)
- Frontend modules: actual build output
- Views: 18 (unchanged)
- Scenarios: 30 (was 29)
- Architecture sections: actual count (expected ~83)
- Operations: actual count (expected ~108)
- Milestone range: M0-M204

**Tier 3 (push/merge):**

1. Run full test suite:
```bash
uv run pytest tests/ --ignore=tests/e2e -v
cd frontend && npm run build
```

2. Update `~/.claude/projects/-Users-mosheashkenazi-projects-gitHubProjects-analytics-platform-demo/memory/MEMORY.md`:
   - Current state: Phase 17 complete (M197-M204)
   - Test counts: actual values
   - New key files: `backend/services/contract_validator.py`, `backend/services/pipeline_orchestrator.py`
   - Phase 17 summary

3. Update project `CLAUDE.md`:
   - Test counts
   - Views, scenarios, architecture sections

4. Update `README.md`:
   - Test counts, module count
   - Add Phase 17 to completed phases list

5. Update roadmap (`docs/plans/2026-02-24-comprehensive-roadmap.md`):
   - Mark Phase 17 as COMPLETE

6. Playwright visual verification complete (from Task 10)

7. Commit all doc updates:
```bash
git add -u
git commit -m "docs: Phase 17 complete — update all counts and documentation (M204)"
```

8. Push branch, create PR:
```bash
git push -u origin feature/pipeline/silver-to-gold-orchestration
gh pr create --title "feat: Silver-to-Gold Pipeline Orchestration (M197-M204)" --body "$(cat <<'EOF'
## Summary
- Contract Validator service for data quality rule evaluation against DuckDB tables
- Pipeline Orchestrator that reads medallion stage metadata to dispatch tier-to-tier transformations
- Fixed SettingsResolver gap in Pipeline API + added stage execution endpoints
- Silver-to-Gold mapping metadata (16 calc input field mappings) + data contract
- MappingStudio tier selectors for Silver-to-Gold view
- PipelineMonitor overhaul: true DAG edges, medallion stage bar, contract validation panel
- MedallionOverview execution status with Run Stage action
- S30 scenario, 3+ new architecture sections, updated tours/operations

## Related Issues
Closes Phase 17 (M197-M204) of the comprehensive roadmap

## Test Plan
- [x] Backend tests: XXX passed (XXX new)
- [x] Frontend build: 0 errors, XXX modules
- [x] Playwright visual verification: all 3 changed views in both themes
- [x] Backward compatibility: existing S1-S29 scenarios, Bronze-to-Silver mappings
- [x] Tour verification: updated Mappings, Pipeline, Medallion tours
EOF
)"
```

9. Squash merge to main after review
10. Clean up feature branch

---

## Dependencies

```
Task 1 (ContractValidator) → Task 2 (Orchestrator uses ContractValidator)
Task 2 (Orchestrator) → Task 3 (API uses Orchestrator)
Task 3 (API) → Task 7 (PipelineMonitor calls API)
Task 4 (Mapping metadata) → Task 6 (MappingStudio shows mapping)
Task 5 (Contracts) → Task 7 (Contract validation display)
Task 6 (MappingStudio) — independent of Tasks 7-8
Task 7 (PipelineMonitor) → Task 8 (MedallionOverview can reuse patterns)
Tasks 6+7+8 → Task 9 (Tours/Scenarios/Ops/Arch)
Task 9 → Task 10 (Full verification)
Task 10 → Task 11 (Docs/PR — Phase D)
```

```
T1 ──→ T2 ──→ T3 ──→ T7 ──→ T8 ──┐
                                     ├──→ T9 ──→ T10 ──→ T11
T4 ──→ T6 ──────────────────────────┘
T5 ──→ T7
```

---

## Verification Plan

```bash
# Backend tests — expect ALL PASS
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -1

# Frontend build — expect 0 errors
cd frontend && npm run build 2>&1 | grep "modules transformed"

# Mapping API — Silver-to-Gold mapping exists
curl http://localhost:8000/api/mappings/silver_to_gold_calcs
# Expected: JSON with source_tier=silver, target_tier=gold, 16 field_mappings

# Pipeline stages endpoint
curl http://localhost:8000/api/pipeline/stages
# Expected: JSON array of 5 pipeline stages

# Run Silver-to-Gold stage
curl -X POST http://localhost:8000/api/pipeline/stages/silver_to_gold/run
# Expected: JSON with status=completed, steps array

# Contract validation in response
curl -X POST http://localhost:8000/api/pipeline/stages/silver_to_gold/run | python3 -m json.tool | grep quality_score
# Expected: quality_score value if contract validation ran

# Architecture sections count
grep -c "metadataMaturity:" frontend/src/data/architectureRegistry.ts
# Expected: 83+ (was 80)

# Scenario count
grep -c "^const S[0-9]" frontend/src/data/scenarioDefinitions.ts
# Expected: 30 (was 29)

# Pipeline DAG — no more linear chain
grep -c "depends_on" frontend/src/stores/pipelineStore.ts
# Expected: >= 1 (depends_on field exists)

# No :has-text remaining
grep -c "has-text" frontend/src/data/scenarioDefinitions.ts
# Expected: 0
```
