# Phase 14: Medallion Architecture Core — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the foundational metadata schema for an 11-tier medallion data architecture with tier definitions, data contracts, transformations, pipeline stages, API endpoints, and a React Flow overview view.

**Architecture:** All medallion metadata is JSON-on-disk under `workspace/metadata/medallion/`. Pydantic models define the schema, MetadataService handles I/O, a dedicated API router serves CRUD + lineage endpoints, and a new MedallionOverview view visualizes the tier graph with React Flow and Dagre layout. This follows the exact same metadata-driven patterns as detection_models, workflows, and grid configs.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, DuckDB, React 19, TypeScript, @xyflow/react, @dagrejs/dagre, Tailwind CSS 4, Zustand

---

## Task 1: Pydantic Models for Medallion Metadata

**Files:**
- Create: `backend/models/medallion.py`
- Test: `tests/test_medallion.py`

**Step 1: Write the failing test**

```python
# tests/test_medallion.py
"""Tests for medallion architecture metadata."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace with medallion metadata."""
    ws = tmp_path / "workspace"
    # Required base dirs for app startup
    for d in ["entities", "calculations/transaction", "calculations/time_windows",
              "calculations/derived", "calculations/aggregations",
              "settings/thresholds", "settings/score_steps", "settings/score_thresholds",
              "detection_models", "navigation", "widgets", "format_rules",
              "query_presets", "grids", "view_config", "theme", "workflows",
              "demo", "tours", "standards/iso", "standards/fix", "standards/compliance",
              "mappings", "regulations", "match_patterns", "score_templates"]:
        (ws / "metadata" / d).mkdir(parents=True, exist_ok=True)

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(json.dumps({
        "navigation_id": "main", "groups": []
    }))

    # Medallion tiers
    (ws / "metadata" / "medallion").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "medallion" / "tiers.json").write_text(json.dumps({
        "tiers": [
            {
                "tier_id": "landing",
                "tier_number": 1,
                "name": "Landing/Staging",
                "purpose": "Raw ingestion zone",
                "data_state": "raw",
                "storage_format": "original",
                "retention_policy": "7_days",
                "quality_gate": "schema_detection",
                "access_level": "data_engineering",
                "mutable": False,
                "append_only": True
            },
            {
                "tier_id": "bronze",
                "tier_number": 2,
                "name": "Bronze",
                "purpose": "Typed, deduplicated, timestamped",
                "data_state": "typed",
                "storage_format": "parquet",
                "retention_policy": "30_days",
                "quality_gate": "type_validation",
                "access_level": "data_engineering",
                "mutable": False,
                "append_only": True
            }
        ]
    }))

    # Contracts dir
    (ws / "metadata" / "medallion" / "contracts").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "medallion" / "contracts" / "bronze_to_silver_execution.json").write_text(json.dumps({
        "contract_id": "bronze_to_silver_execution",
        "source_tier": "bronze",
        "target_tier": "silver",
        "entity": "execution",
        "description": "Transform raw executions to canonical schema",
        "field_mappings": [
            {"source": "exec_id", "target": "execution_id", "transform": "rename"},
            {"source": "trade_ts", "target": "trade_timestamp", "transform": "parse_iso8601"}
        ],
        "quality_rules": [
            {"rule": "not_null", "fields": ["execution_id", "order_id"]},
            {"rule": "referential_integrity", "field": "order_id", "reference": "order.order_id"}
        ],
        "sla": {"freshness_minutes": 15, "completeness_pct": 99.5},
        "owner": "data-engineering",
        "classification": "confidential"
    }))

    # Transformations dir
    (ws / "metadata" / "medallion" / "transformations").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "medallion" / "transformations" / "landing_to_bronze_execution.json").write_text(json.dumps({
        "transformation_id": "landing_to_bronze_execution",
        "source_tier": "landing",
        "target_tier": "bronze",
        "entity": "execution",
        "description": "Type-cast and deduplicate raw executions",
        "sql_template": "SELECT DISTINCT CAST(exec_id AS VARCHAR) AS execution_id, CAST(quantity AS DECIMAL) AS quantity FROM landing_execution",
        "parameters": {},
        "quality_checks": ["row_count_nonzero", "no_null_keys"],
        "error_handling": "quarantine"
    }))

    # Pipeline stages
    (ws / "metadata" / "medallion" / "pipeline_stages.json").write_text(json.dumps({
        "stages": [
            {
                "stage_id": "ingest_landing",
                "name": "Ingest to Landing",
                "tier_from": None,
                "tier_to": "landing",
                "order": 1,
                "depends_on": [],
                "entities": ["execution", "order", "product"],
                "parallel": True
            },
            {
                "stage_id": "landing_to_bronze",
                "name": "Landing to Bronze",
                "tier_from": "landing",
                "tier_to": "bronze",
                "order": 2,
                "depends_on": ["ingest_landing"],
                "entities": ["execution", "order", "product"],
                "parallel": True
            }
        ]
    }))

    # Required data dirs
    (ws / "data" / "csv").mkdir(parents=True, exist_ok=True)
    (ws / "data" / "parquet").mkdir(parents=True, exist_ok=True)
    (ws / "results").mkdir(parents=True, exist_ok=True)
    (ws / "alerts" / "traces").mkdir(parents=True, exist_ok=True)

    return ws


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TestMedallionModels:
    def test_tier_model_parses(self):
        from backend.models.medallion import TierDefinition
        tier = TierDefinition(
            tier_id="landing", tier_number=1, name="Landing",
            purpose="Raw zone", data_state="raw", storage_format="original",
            retention_policy="7_days", quality_gate="schema_detection",
            access_level="data_engineering",
        )
        assert tier.tier_id == "landing"
        assert tier.mutable is False

    def test_data_contract_parses(self):
        from backend.models.medallion import DataContract
        contract = DataContract(
            contract_id="test", source_tier="bronze", target_tier="silver",
            entity="execution", description="Test contract",
        )
        assert contract.contract_id == "test"
        assert contract.quality_rules == []

    def test_transformation_parses(self):
        from backend.models.medallion import TransformationStep
        t = TransformationStep(
            transformation_id="test", source_tier="landing", target_tier="bronze",
            entity="execution", description="Test",
            sql_template="SELECT * FROM x",
        )
        assert t.transformation_id == "test"

    def test_pipeline_stage_parses(self):
        from backend.models.medallion import PipelineStage
        s = PipelineStage(
            stage_id="test", name="Test", tier_to="landing", order=1,
        )
        assert s.stage_id == "test"
        assert s.depends_on == []
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_medallion.py::TestMedallionModels -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backend.models.medallion'`

**Step 3: Write minimal implementation**

```python
# backend/models/medallion.py
"""Pydantic models for the 11-tier medallion data architecture."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TierDefinition(BaseModel):
    """A single tier in the medallion architecture."""
    tier_id: str
    tier_number: int
    name: str
    purpose: str = ""
    data_state: str = ""
    storage_format: str = ""
    retention_policy: str = ""
    quality_gate: str = ""
    access_level: str = ""
    mutable: bool = False
    append_only: bool = True


class FieldMapping(BaseModel):
    """Maps a source field to a target field with optional transformation."""
    source: str
    target: str
    transform: str = "passthrough"


class QualityRule(BaseModel):
    """A single data quality rule within a contract."""
    rule: str
    fields: list[str] = Field(default_factory=list)
    field: str | None = None
    reference: str | None = None
    min: float | None = None
    max: float | None = None
    values: list[str] = Field(default_factory=list)


class SLA(BaseModel):
    """Service-level agreement for a data contract."""
    freshness_minutes: int = 60
    completeness_pct: float = 99.0


class DataContract(BaseModel):
    """Defines the agreement between two tiers for a specific entity."""
    contract_id: str
    source_tier: str
    target_tier: str
    entity: str
    description: str = ""
    field_mappings: list[FieldMapping] = Field(default_factory=list)
    quality_rules: list[QualityRule] = Field(default_factory=list)
    sla: SLA = Field(default_factory=SLA)
    owner: str = ""
    classification: str = "internal"


class TransformationStep(BaseModel):
    """A metadata-driven tier-to-tier transformation."""
    transformation_id: str
    source_tier: str
    target_tier: str
    entity: str
    description: str = ""
    sql_template: str = ""
    parameters: dict[str, object] = Field(default_factory=dict)
    quality_checks: list[str] = Field(default_factory=list)
    error_handling: str = "quarantine"


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


class MedallionConfig(BaseModel):
    """Top-level wrapper for tier definitions."""
    tiers: list[TierDefinition] = Field(default_factory=list)


class PipelineConfig(BaseModel):
    """Top-level wrapper for pipeline stages."""
    stages: list[PipelineStage] = Field(default_factory=list)
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_medallion.py::TestMedallionModels -v`
Expected: 4 PASS

**Step 5: Commit**

```bash
git add backend/models/medallion.py tests/test_medallion.py
git commit -m "feat(medallion): add Pydantic models for medallion architecture (M175)"
```

---

## Task 2: Medallion Metadata Files (11 Tiers, Contracts, Transformations, Pipeline)

**Files:**
- Create: `workspace/metadata/medallion/tiers.json`
- Create: `workspace/metadata/medallion/contracts/landing_to_bronze_execution.json`
- Create: `workspace/metadata/medallion/contracts/landing_to_bronze_order.json`
- Create: `workspace/metadata/medallion/contracts/landing_to_bronze_product.json`
- Create: `workspace/metadata/medallion/contracts/bronze_to_silver_execution.json`
- Create: `workspace/metadata/medallion/contracts/bronze_to_silver_order.json`
- Create: `workspace/metadata/medallion/contracts/silver_to_gold_alerts.json`
- Create: `workspace/metadata/medallion/transformations/landing_to_bronze_execution.json`
- Create: `workspace/metadata/medallion/transformations/landing_to_bronze_order.json`
- Create: `workspace/metadata/medallion/transformations/bronze_to_silver_execution.json`
- Create: `workspace/metadata/medallion/transformations/bronze_to_silver_order.json`
- Create: `workspace/metadata/medallion/transformations/silver_to_gold_alerts.json`
- Create: `workspace/metadata/medallion/pipeline_stages.json`

**Step 1: Create tiers.json with all 11 tiers**

Create `workspace/metadata/medallion/tiers.json`:
```json
{
  "tiers": [
    {
      "tier_id": "landing",
      "tier_number": 1,
      "name": "Landing/Staging",
      "purpose": "Raw ingestion zone — files, streams, APIs arrive as-is",
      "data_state": "raw",
      "storage_format": "original",
      "retention_policy": "7_days",
      "quality_gate": "schema_detection",
      "access_level": "data_engineering",
      "mutable": false,
      "append_only": true
    },
    {
      "tier_id": "bronze",
      "tier_number": 2,
      "name": "Bronze",
      "purpose": "Type-cast, deduplicated, timestamped — single version of truth for raw data",
      "data_state": "typed",
      "storage_format": "parquet",
      "retention_policy": "30_days",
      "quality_gate": "type_validation",
      "access_level": "data_engineering",
      "mutable": false,
      "append_only": true
    },
    {
      "tier_id": "quarantine",
      "tier_number": 3,
      "name": "Quarantine/Error",
      "purpose": "Failed validation records — flagged for investigation or reprocessing",
      "data_state": "invalid",
      "storage_format": "parquet",
      "retention_policy": "90_days",
      "quality_gate": "quarantine_reason",
      "access_level": "data_engineering",
      "mutable": true,
      "append_only": false
    },
    {
      "tier_id": "silver",
      "tier_number": 4,
      "name": "Silver",
      "purpose": "Canonical entities — mapped to standard entity model (ISO/FIX-aligned)",
      "data_state": "canonical",
      "storage_format": "parquet",
      "retention_policy": "365_days",
      "quality_gate": "referential_integrity",
      "access_level": "data_analyst",
      "mutable": false,
      "append_only": true
    },
    {
      "tier_id": "gold",
      "tier_number": 5,
      "name": "Gold",
      "purpose": "Business-ready aggregations — calculations, scores, detection results",
      "data_state": "aggregated",
      "storage_format": "parquet",
      "retention_policy": "365_days",
      "quality_gate": "calculation_validation",
      "access_level": "business_user",
      "mutable": false,
      "append_only": false
    },
    {
      "tier_id": "platinum",
      "tier_number": 6,
      "name": "Platinum/Diamond",
      "purpose": "Pre-built KPIs, executive dashboards, regulatory report datasets",
      "data_state": "kpi_ready",
      "storage_format": "parquet",
      "retention_policy": "365_days",
      "quality_gate": "completeness_sla",
      "access_level": "executive",
      "mutable": false,
      "append_only": false
    },
    {
      "tier_id": "reference",
      "tier_number": 7,
      "name": "Reference/MDM",
      "purpose": "Master data — golden records for products, venues, accounts, traders",
      "data_state": "master",
      "storage_format": "parquet",
      "retention_policy": "indefinite",
      "quality_gate": "cross_source_reconciliation",
      "access_level": "data_steward",
      "mutable": true,
      "append_only": false
    },
    {
      "tier_id": "sandbox",
      "tier_number": 8,
      "name": "Sandbox/Lab",
      "purpose": "Isolated testing — what-if analysis, threshold tuning, model backtesting",
      "data_state": "copy_on_write",
      "storage_format": "parquet",
      "retention_policy": "7_days",
      "quality_gate": "isolation_check",
      "access_level": "data_scientist",
      "mutable": true,
      "append_only": false
    },
    {
      "tier_id": "logging",
      "tier_number": 9,
      "name": "Logging/Audit",
      "purpose": "Pipeline execution logs, user actions, metadata changes, compliance audit trail",
      "data_state": "event_log",
      "storage_format": "parquet",
      "retention_policy": "2555_days",
      "quality_gate": "tamper_evident",
      "access_level": "compliance",
      "mutable": false,
      "append_only": true
    },
    {
      "tier_id": "metrics",
      "tier_number": 10,
      "name": "Metrics/Observability",
      "purpose": "Pipeline health, data quality scores, SLA compliance, drift detection",
      "data_state": "time_series",
      "storage_format": "parquet",
      "retention_policy": "90_days",
      "quality_gate": "anomaly_detection",
      "access_level": "platform_engineer",
      "mutable": false,
      "append_only": true
    },
    {
      "tier_id": "archive",
      "tier_number": 11,
      "name": "Archive/Cold",
      "purpose": "Regulatory retention — compressed, encrypted, immutable cold storage",
      "data_state": "archived",
      "storage_format": "compressed_parquet",
      "retention_policy": "2555_days",
      "quality_gate": "retention_compliance",
      "access_level": "compliance",
      "mutable": false,
      "append_only": true
    }
  ]
}
```

**Step 2: Create sample data contracts** (6 contracts for the core tier boundaries)

Create each contract JSON in `workspace/metadata/medallion/contracts/`. Each follows this pattern:
```json
{
  "contract_id": "<source>_to_<target>_<entity>",
  "source_tier": "<source>",
  "target_tier": "<target>",
  "entity": "<entity>",
  "description": "...",
  "field_mappings": [...],
  "quality_rules": [...],
  "sla": {"freshness_minutes": N, "completeness_pct": N},
  "owner": "data-engineering",
  "classification": "confidential"
}
```

**Step 3: Create sample transformations** (5 transformations matching the contracts)

Create each transformation JSON in `workspace/metadata/medallion/transformations/`. Each follows the `TransformationStep` model schema.

**Step 4: Create pipeline_stages.json**

Create `workspace/metadata/medallion/pipeline_stages.json` with 5 stages:
1. `ingest_landing` (order 1, no deps, parallel)
2. `landing_to_bronze` (order 2, depends on ingest_landing, parallel)
3. `bronze_to_silver` (order 3, depends on landing_to_bronze, parallel)
4. `silver_to_gold` (order 4, depends on bronze_to_silver, sequential)
5. `gold_to_platinum` (order 5, depends on silver_to_gold, sequential)

**Step 5: Commit**

```bash
git add workspace/metadata/medallion/
git commit -m "feat(medallion): add 11-tier metadata, contracts, transformations, pipeline stages (M175)"
```

---

## Task 3: MetadataService Methods for Medallion

**Files:**
- Modify: `backend/services/metadata_service.py`
- Test: `tests/test_medallion.py` (add API tests)

**Step 1: Write failing tests**

Add to `tests/test_medallion.py`:
```python
class TestMedallionAPI:
    def test_list_tiers(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/tiers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2  # landing + bronze from fixture
        assert data[0]["tier_id"] == "landing"

    def test_get_tier(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/tiers/landing")
        assert resp.status_code == 200
        assert resp.json()["tier_id"] == "landing"

    def test_get_tier_not_found(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/tiers/nonexistent")
        assert resp.status_code == 404

    def test_list_contracts(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/contracts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    def test_get_contract(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/contracts/bronze_to_silver_execution")
        assert resp.status_code == 200
        assert resp.json()["entity"] == "execution"

    def test_contract_not_found(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/contracts/nonexistent")
        assert resp.status_code == 404

    def test_list_transformations(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/transformations")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_get_transformation(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/transformations/landing_to_bronze_execution")
        assert resp.status_code == 200

    def test_transformation_not_found(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/transformations/nonexistent")
        assert resp.status_code == 404

    def test_list_pipeline_stages(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/pipeline-stages")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_lineage(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/lineage/execution")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data

    def test_lineage_unknown_entity(self, workspace):
        config.settings.workspace_dir = workspace
        client = TestClient(app)
        resp = client.get("/api/medallion/lineage/unknown_entity")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nodes"] == []
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_medallion.py::TestMedallionAPI -v`
Expected: FAIL (no `/api/medallion/` routes exist yet)

**Step 3: Add MetadataService methods**

Add these methods to `backend/services/metadata_service.py`:

```python
# --- Medallion Architecture ---

def load_medallion_tiers(self) -> "MedallionConfig":
    from backend.models.medallion import MedallionConfig
    path = self._base / "medallion" / "tiers.json"
    if not path.exists():
        return MedallionConfig()
    return MedallionConfig.model_validate_json(path.read_text())

def load_data_contract(self, contract_id: str) -> "DataContract | None":
    from backend.models.medallion import DataContract
    path = self._base / "medallion" / "contracts" / f"{contract_id}.json"
    if not path.exists():
        return None
    return DataContract.model_validate_json(path.read_text())

def list_data_contracts(self) -> "list[DataContract]":
    from backend.models.medallion import DataContract
    folder = self._base / "medallion" / "contracts"
    items: list[DataContract] = []
    if folder.exists():
        for f in sorted(folder.glob("*.json")):
            items.append(DataContract.model_validate_json(f.read_text()))
    return items

def load_transformation(self, transformation_id: str) -> "TransformationStep | None":
    from backend.models.medallion import TransformationStep
    path = self._base / "medallion" / "transformations" / f"{transformation_id}.json"
    if not path.exists():
        return None
    return TransformationStep.model_validate_json(path.read_text())

def list_transformations(self) -> "list[TransformationStep]":
    from backend.models.medallion import TransformationStep
    folder = self._base / "medallion" / "transformations"
    items: list[TransformationStep] = []
    if folder.exists():
        for f in sorted(folder.glob("*.json")):
            items.append(TransformationStep.model_validate_json(f.read_text()))
    return items

def load_pipeline_stages(self) -> "PipelineConfig":
    from backend.models.medallion import PipelineConfig
    path = self._base / "medallion" / "pipeline_stages.json"
    if not path.exists():
        return PipelineConfig()
    return PipelineConfig.model_validate_json(path.read_text())
```

**Step 4: Run tests — still fail (no API router yet)**

**Step 5: Commit MetadataService methods**

```bash
git add backend/services/metadata_service.py
git commit -m "feat(medallion): add MetadataService methods for medallion metadata (M175)"
```

---

## Task 4: Medallion API Router

**Files:**
- Create: `backend/api/medallion.py`
- Modify: `backend/main.py` (add `include_router`)

**Step 1: Create the API router**

```python
# backend/api/medallion.py
"""Medallion architecture metadata API."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/medallion", tags=["medallion"])


def _meta(request: Request):
    return request.app.state.metadata


@router.get("/tiers")
def list_tiers(request: Request):
    """List all medallion tier definitions."""
    config = _meta(request).load_medallion_tiers()
    return [t.model_dump() for t in config.tiers]


@router.get("/tiers/{tier_id}")
def get_tier(tier_id: str, request: Request):
    """Get a single tier by ID."""
    config = _meta(request).load_medallion_tiers()
    for t in config.tiers:
        if t.tier_id == tier_id:
            return t.model_dump()
    return JSONResponse({"error": "not found"}, status_code=404)


@router.get("/contracts")
def list_contracts(request: Request):
    """List all data contracts."""
    contracts = _meta(request).list_data_contracts()
    return [c.model_dump() for c in contracts]


@router.get("/contracts/{contract_id}")
def get_contract(contract_id: str, request: Request):
    """Get a single data contract."""
    contract = _meta(request).load_data_contract(contract_id)
    if contract is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return contract.model_dump()


@router.get("/transformations")
def list_transformations(request: Request):
    """List all tier-to-tier transformations."""
    items = _meta(request).list_transformations()
    return [t.model_dump() for t in items]


@router.get("/transformations/{transformation_id}")
def get_transformation(transformation_id: str, request: Request):
    """Get a single transformation."""
    t = _meta(request).load_transformation(transformation_id)
    if t is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return t.model_dump()


@router.get("/pipeline-stages")
def list_pipeline_stages(request: Request):
    """List pipeline stages in execution order."""
    config = _meta(request).load_pipeline_stages()
    return [s.model_dump() for s in sorted(config.stages, key=lambda s: s.order)]


@router.get("/lineage/{entity}")
def get_entity_lineage(entity: str, request: Request):
    """Get tier-to-tier lineage graph for an entity.

    Returns nodes (tiers that contain this entity) and edges (contracts/transformations).
    """
    meta = _meta(request)
    tiers_config = meta.load_medallion_tiers()
    contracts = meta.list_data_contracts()
    transformations = meta.list_transformations()

    # Find contracts involving this entity
    entity_contracts = [c for c in contracts if c.entity == entity]
    entity_transforms = [t for t in transformations if t.entity == entity]

    # Collect tier IDs involved
    tier_ids: set[str] = set()
    for c in entity_contracts:
        tier_ids.add(c.source_tier)
        tier_ids.add(c.target_tier)
    for t in entity_transforms:
        tier_ids.add(t.source_tier)
        tier_ids.add(t.target_tier)

    # Build nodes
    tier_map = {t.tier_id: t for t in tiers_config.tiers}
    nodes = []
    for tid in sorted(tier_ids):
        tier = tier_map.get(tid)
        if tier:
            nodes.append({"id": tid, "label": tier.name, "tier_number": tier.tier_number})

    # Build edges from contracts
    edges = []
    for c in entity_contracts:
        edges.append({
            "source": c.source_tier,
            "target": c.target_tier,
            "label": c.contract_id,
            "type": "contract",
        })

    return {"entity": entity, "nodes": nodes, "edges": edges}
```

**Step 2: Register router in main.py**

Add to `backend/main.py` imports:
```python
from backend.api import medallion
```
Add after the last `include_router` line:
```python
app.include_router(medallion.router)
```

**Step 3: Run tests**

Run: `uv run pytest tests/test_medallion.py -v`
Expected: ALL PASS (12 model tests + API tests)

**Step 4: Run full backend test suite**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: 506+ passed (no regressions + new medallion tests)

**Step 5: Commit**

```bash
git add backend/api/medallion.py backend/main.py tests/test_medallion.py
git commit -m "feat(medallion): add API router with CRUD + lineage endpoints (M175)"
```

---

## Task 5: Navigation & Route for MedallionOverview

**Files:**
- Modify: `workspace/metadata/navigation/main.json`
- Modify: `frontend/src/routes.tsx`

**Step 1: Add navigation entry**

Add a new item to the "Operate" group in `workspace/metadata/navigation/main.json`:
```json
{
  "view_id": "medallion",
  "label": "Medallion",
  "path": "/medallion",
  "icon": "Layers",
  "order": 3
}
```

Place it after the existing "Operate" group items (PipelineMonitor, DataManager, etc.).

**Step 2: Add route**

Add to `frontend/src/routes.tsx`:
- Import: `const MedallionOverview = lazy(() => import("./views/MedallionOverview/index.tsx"));`
- Route: `{ path: "medallion", element: <Suspense fallback={null}><MedallionOverview /></Suspense> }`

Place the route in the "Operate" section of the children array.

**Step 3: Commit**

```bash
git add workspace/metadata/navigation/main.json frontend/src/routes.tsx
git commit -m "feat(medallion): add navigation entry and route for MedallionOverview (M175)"
```

---

## Task 6: MedallionOverview Frontend View

**Files:**
- Create: `frontend/src/views/MedallionOverview/index.tsx`

**Step 1: Create the view**

This view shows a React Flow diagram of 11 tiers arranged left-to-right using Dagre layout. Clicking a tier shows its details (entity count, contracts, quality gate). Data contract edges connect the tiers.

```typescript
// frontend/src/views/MedallionOverview/index.tsx
import { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

// Types matching the API response
interface Tier {
  tier_id: string;
  tier_number: number;
  name: string;
  purpose: string;
  data_state: string;
  storage_format: string;
  retention_policy: string;
  quality_gate: string;
  access_level: string;
  mutable: boolean;
  append_only: boolean;
}

interface Contract {
  contract_id: string;
  source_tier: string;
  target_tier: string;
  entity: string;
  description: string;
  field_mappings: { source: string; target: string; transform: string }[];
  quality_rules: { rule: string; fields?: string[]; field?: string }[];
  sla: { freshness_minutes: number; completeness_pct: number };
  owner: string;
  classification: string;
}

interface PipelineStage {
  stage_id: string;
  name: string;
  tier_from: string | null;
  tier_to: string;
  order: number;
  depends_on: string[];
  entities: string[];
  parallel: boolean;
}

// --- Constants ---
const NODE_W = 180;
const NODE_H = 80;

const TIER_COLORS: Record<string, string> = {
  landing: "#6366f1",
  bronze: "#d97706",
  quarantine: "#ef4444",
  silver: "#a3a3a3",
  gold: "#eab308",
  platinum: "#8b5cf6",
  reference: "#06b6d4",
  sandbox: "#22c55e",
  logging: "#64748b",
  metrics: "#f97316",
  archive: "#78716c",
};

function buildGraph(tiers: Tier[], contracts: Contract[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 140 });

  for (const t of tiers) {
    g.setNode(t.tier_id, { width: NODE_W, height: NODE_H });
  }

  // Create edges from contracts
  const edgeSet = new Set<string>();
  for (const c of contracts) {
    const key = `${c.source_tier}->${c.target_tier}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      g.setEdge(c.source_tier, c.target_tier);
    }
  }

  // Add tier-number-based edges for tiers without contracts (so graph is connected)
  const sorted = [...tiers].sort((a, b) => a.tier_number - b.tier_number);
  // Core flow: landing -> bronze -> silver -> gold -> platinum
  const coreFlow = ["landing", "bronze", "silver", "gold", "platinum"];
  for (let i = 0; i < coreFlow.length - 1; i++) {
    const key = `${coreFlow[i]}->${coreFlow[i + 1]}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      g.setEdge(coreFlow[i], coreFlow[i + 1]);
    }
  }
  // Bronze -> quarantine side branch
  if (!edgeSet.has("bronze->quarantine")) {
    g.setEdge("bronze", "quarantine");
  }

  dagre.layout(g);

  const nodes: Node[] = tiers.map((t) => {
    const pos = g.node(t.tier_id);
    const color = TIER_COLORS[t.tier_id] ?? "var(--color-border)";
    return {
      id: t.tier_id,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: `T${t.tier_number}: ${t.name}`, tier: t },
      style: {
        background: "var(--color-surface-elevated)",
        border: `2px solid ${color}`,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        padding: "8px 10px",
        width: NODE_W,
        textAlign: "center" as const,
        cursor: "pointer",
        color: "var(--color-text)",
      },
    };
  });

  // Collect contract counts per edge
  const edgeCounts: Record<string, number> = {};
  for (const c of contracts) {
    const key = `${c.source_tier}->${c.target_tier}`;
    edgeCounts[key] = (edgeCounts[key] ?? 0) + 1;
  }

  const edges: Edge[] = [];
  for (const key of edgeSet) {
    const [source, target] = key.split("->");
    const count = edgeCounts[key];
    edges.push({
      id: key,
      source,
      target,
      label: count ? `${count} contract${count > 1 ? "s" : ""}` : "",
      style: { stroke: "var(--color-border)" },
      labelStyle: { fontSize: 9, fill: "var(--color-muted)" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    });
  }

  return { nodes, edges };
}

export default function MedallionOverview() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Tier[]>("/medallion/tiers"),
      api.get<Contract[]>("/medallion/contracts"),
      api.get<PipelineStage[]>("/medallion/pipeline-stages"),
    ])
      .then(([t, c, s]) => {
        setTiers(t);
        setContracts(c);
        setStages(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const tier = (node.data as { tier: Tier }).tier;
      setSelectedTier(tier);
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { nodes, edges } = buildGraph(tiers, contracts);
  const tierContracts = selectedTier
    ? contracts.filter(
        (c) =>
          c.source_tier === selectedTier.tier_id ||
          c.target_tier === selectedTier.tier_id
      )
    : [];
  const tierStages = selectedTier
    ? stages.filter(
        (s) =>
          s.tier_from === selectedTier.tier_id ||
          s.tier_to === selectedTier.tier_id
      )
    : [];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" data-trace="medallion.title">
          Medallion Architecture
        </h2>
        <StatusBadge label={`${tiers.length} tiers`} variant="info" />
        <StatusBadge label={`${contracts.length} contracts`} variant="default" />
        <StatusBadge label={`${stages.length} stages`} variant="default" />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Tier Graph */}
        <Panel
          title="Tier Architecture"
          className="flex-1"
          noPadding
          dataTour="medallion-graph"
          dataTrace="medallion.tier-graph"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={2}
              style={{ background: "var(--color-surface)" }}
            />
          </ReactFlow>
        </Panel>

        {/* Detail Panel */}
        <Panel
          title={selectedTier ? selectedTier.name : "Select a tier"}
          className="w-80 shrink-0 overflow-y-auto"
          dataTrace="medallion.tier-detail"
        >
          {selectedTier ? (
            <div className="flex flex-col gap-3 text-xs">
              <p className="text-muted">{selectedTier.purpose}</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted">Data State</span>
                  <p className="font-medium">{selectedTier.data_state}</p>
                </div>
                <div>
                  <span className="text-muted">Format</span>
                  <p className="font-medium">{selectedTier.storage_format}</p>
                </div>
                <div>
                  <span className="text-muted">Retention</span>
                  <p className="font-medium">{selectedTier.retention_policy}</p>
                </div>
                <div>
                  <span className="text-muted">Quality Gate</span>
                  <p className="font-medium">{selectedTier.quality_gate}</p>
                </div>
                <div>
                  <span className="text-muted">Access Level</span>
                  <p className="font-medium">{selectedTier.access_level}</p>
                </div>
                <div>
                  <span className="text-muted">Mutable</span>
                  <p className="font-medium">{selectedTier.mutable ? "Yes" : "No"}</p>
                </div>
              </div>

              {tierContracts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs mb-1">
                    Data Contracts ({tierContracts.length})
                  </h4>
                  {tierContracts.map((c) => (
                    <div
                      key={c.contract_id}
                      className="border border-border rounded p-2 mb-1"
                    >
                      <p className="font-medium">{c.entity}</p>
                      <p className="text-muted">
                        {c.source_tier} → {c.target_tier}
                      </p>
                      <p className="text-muted">
                        {c.field_mappings.length} mappings, {c.quality_rules.length} rules
                      </p>
                      <p className="text-muted">
                        SLA: {c.sla.freshness_minutes}min, {c.sla.completeness_pct}%
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {tierStages.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs mb-1">
                    Pipeline Stages ({tierStages.length})
                  </h4>
                  {tierStages.map((s) => (
                    <div
                      key={s.stage_id}
                      className="border border-border rounded p-2 mb-1"
                    >
                      <p className="font-medium">{s.name}</p>
                      <p className="text-muted">
                        {s.tier_from ?? "source"} → {s.tier_to}
                      </p>
                      <p className="text-muted">
                        {s.entities.length} entities
                        {s.parallel ? " (parallel)" : " (sequential)"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-xs">
              Click a tier in the graph to see its details, data contracts, and pipeline stages.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
```

**Step 2: Verify frontend build**

Run: `cd frontend && npm run build`
Expected: Clean build

**Step 3: Commit**

```bash
git add frontend/src/views/MedallionOverview/index.tsx
git commit -m "feat(medallion): add MedallionOverview view with React Flow tier graph (M175)"
```

---

## Task 7: Tour, Scenarios, Operation Scripts

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts`
- Modify: `frontend/src/layouts/AppLayout.tsx` (getTourIdForPath)
- Modify: `frontend/src/data/operationScripts.ts`
- Modify: `frontend/src/data/scenarioDefinitions.ts`

**Step 1: Add tour definition**

Add to `tourDefinitions.ts` a new `medallion` tour with steps targeting `[data-tour="medallion-graph"]`.

**Step 2: Add getTourIdForPath mapping**

Add to `getTourIdForPath` in `AppLayout.tsx`:
```typescript
case "/medallion": return "medallion";
```

**Step 3: Add operation scripts**

Add `medallion` operations to `operationScripts.ts` (3-5 operations for viewing tiers, contracts, selecting tiers, checking lineage).

**Step 4: Add scenario**

Add scenario S27 for medallion architecture walkthrough to `scenarioDefinitions.ts`.

**Step 5: Commit**

```bash
git add frontend/src/data/tourDefinitions.ts frontend/src/layouts/AppLayout.tsx frontend/src/data/operationScripts.ts frontend/src/data/scenarioDefinitions.ts
git commit -m "feat(medallion): add tour, scenarios, operation scripts for MedallionOverview (M175)"
```

---

## Task 8: Architecture Registry + Traceability

**Files:**
- Modify: `frontend/src/data/architectureRegistry.ts`

**Step 1: Add medallion sections to architecture registry**

Add entries for the MedallionOverview view sections:
- `medallion.title` — view header
- `medallion.tier-graph` — React Flow tier diagram (fully metadata-driven)
- `medallion.tier-detail` — tier detail panel (fully metadata-driven)

Each entry follows the existing pattern with `sectionId`, `viewId`, `label`, `maturity`, `metadataSource`, etc.

**Step 2: Commit**

```bash
git add frontend/src/data/architectureRegistry.ts
git commit -m "feat(medallion): add architecture registry entries for MedallionOverview (M175)"
```

---

## Task 9: Run Full Tests + Frontend Build

**Step 1: Run backend tests**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: 506+ passed (existing + new medallion tests)

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Clean build (969+ modules)

**Step 3: Fix any failures**

If tests fail, fix and re-run before proceeding.

**Step 4: Commit any fixes**

---

## Task 10: Playwright Visual Verification

**Step 1: Start the app**

```bash
./start.sh &
```

**Step 2: Navigate to MedallionOverview**

Use Playwright MCP to navigate to `http://localhost:8000/medallion` and screenshot.

**Step 3: Verify**

- 11 tiers visible in the graph
- Data contract edges connect tiers
- Clicking a tier shows detail panel
- Sidebar shows "Medallion" link

**Step 4: Take screenshots for evidence**

---

## Task 11: Documentation Sweep (Phase D — Development Workflow Protocol)

**Files:**
- Modify: `docs/progress.md` — add M175 milestone entry, update header
- Modify: `docs/exploratory-testing-notes.md` — add Phase 14 note (no new findings or new findings)
- Modify: `docs/plans/2026-02-24-comprehensive-roadmap.md` — mark Phase 14 COMPLETE
- Modify: `CLAUDE.md` — update milestone count (M174→M175), add 17th view, update metadata types
- Modify: `.claude/memory/MEMORY.md` — update current state
- Modify: context-level MEMORY.md — update current state
- Modify: `docs/demo-guide.md` — add MedallionOverview section
- Modify: `workspace/metadata/tours/registry.json` — add medallion tour entry

**Step 1: Update each file per Phase D Tier 1-3 of the Development Workflow Protocol**

**Step 2: Commit**

```bash
git add docs/ CLAUDE.md .claude/memory/MEMORY.md workspace/metadata/tours/registry.json
git commit -m "docs: Phase 14 completion — update all documentation (M175)"
```

---

## Task 12: Push, PR, Merge

**Step 1: Push branch**

```bash
git push -u origin feat/phase14-medallion-core
```

**Step 2: Create PR**

```bash
gh pr create --title "feat: Phase 14 — Medallion Architecture Core (M175)" --body "..."
```

**Step 3: Squash merge**

```bash
gh pr merge --squash --delete-branch
```

**Step 4: Switch to main + pull**

```bash
git checkout main && git pull
```

---

## Verification Checklist

- [ ] `uv run pytest tests/ --ignore=tests/e2e -v` — ALL PASS (506+ existing + ~16 new)
- [ ] `cd frontend && npm run build` — clean (969+ modules)
- [ ] `GET /api/medallion/tiers` returns 11 tiers
- [ ] `GET /api/medallion/contracts` returns 6 contracts
- [ ] `GET /api/medallion/transformations` returns 5 transformations
- [ ] `GET /api/medallion/pipeline-stages` returns 5 stages
- [ ] `GET /api/medallion/lineage/execution` returns nodes + edges
- [ ] MedallionOverview renders 11 tiers in React Flow graph
- [ ] Clicking a tier shows detail panel with contracts + stages
- [ ] Sidebar has "Medallion" entry under "Operate" group
- [ ] Tour, scenarios, operation scripts added
- [ ] Architecture registry updated (3 new sections)
- [ ] All documentation files updated per Phase D protocol
- [ ] PR merged to main
