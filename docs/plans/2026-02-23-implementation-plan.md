# Analytics Platform Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a metadata-driven trade surveillance platform demo with a Bloomberg-style Risk Case Manager UI, showing end-to-end flow from raw data to alert investigation.

**Architecture:** Python FastAPI + embedded DuckDB + Parquet/JSON files + React SPA. Single process, single command launch. All metadata as JSON on disk, data as CSV (editable) + Parquet (engine), calculation results queryable via SQL.

**Tech Stack:**
- Backend: Python 3.11+, FastAPI, DuckDB, PyArrow, Pydantic v2, watchfiles
- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, AG Grid, TradingView Lightweight Charts, React Flow, Monaco Editor, react-grid-layout, dnd-kit, Zustand, Recharts
- Package Management: uv (Python), npm (Node)

**Reference:** See `docs/plans/2026-02-23-analytics-platform-demo-design.md` for full design document.

---

## Milestones Overview

| # | Milestone | Description | Dependencies |
|---|---|---|---|
| M0 | Project Scaffolding | Git, deps, folder structure, CI basics | None |
| M1 | Backend Foundation | FastAPI app, DuckDB, metadata service, data loader | M0 |
| M2 | Calculation Engine | DAG executor, Layer 1-3.5 calculations | M1 |
| M3 | Settings Resolution | Hierarchy + multi-dim matching + fallback | M1 |
| M4 | Detection & Alerts | Detection models, alert generation, trace | M2, M3 |
| M5 | Frontend Foundation | React app, theme, layout, navigation, shared components | M0 |
| M6 | Configuration Views | Entity Designer, Metadata Explorer, Settings Manager, Mapping Studio | M1, M5 |
| M7 | Operations Views | Pipeline Monitor, Schema Explorer, SQL Console | M2, M5 |
| M8 | Compose Views | Model Composer, Data Manager | M4, M5 |
| M9 | Risk Case Manager | Alert Summary, Alert Detail (full drill-down) | M4, M5 |
| M10 | AI Query Assistant | LLM integration (live + mock mode) | M7, M8 |
| M11 | Demo Controls | State machine, snapshots, reset/resume/skip | M4 |
| M12 | Synthetic Data | Data generation, demo scenarios, Act 1-2-3 | M4, M11 |
| M13 | Polish & Docs | READMEs, demo guide, final integration | All |

**Critical Path:** M0 → M1 → M2+M3 (parallel) → M4 → M9 + M11 (parallel) → M12 → M13

**Parallel Tracks:**
- Track A (Backend): M0 → M1 → M2 → M3 → M4 → M11
- Track B (Frontend): M0 → M5 → M6 → M7 → M8 → M9 → M10

---

## Milestone 0: Project Scaffolding

### Task 0.1: Initialize Python Backend

**Files:**
- Create: `pyproject.toml`
- Create: `backend/__init__.py`
- Create: `backend/main.py`
- Create: `backend/config.py`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "analytics-platform-demo"
version = "0.1.0"
description = "Metadata-driven trade surveillance analytics platform demo"
requires-python = ">=3.11"
dependencies = [
    "fastapi[standard]>=0.115.0",
    "duckdb>=1.2.0",
    "pyarrow>=18.0.0",
    "watchfiles>=1.0.0",
    "pydantic>=2.10.0",
    "anthropic>=0.42.0",
]

[project.scripts]
serve = "uvicorn backend.main:app --host 0.0.0.0 --port 8000"
```

**Step 2: Create backend entry point**

```python
# backend/main.py
"""Analytics Platform Demo — FastAPI entry point."""
from fastapi import FastAPI

app = FastAPI(title="Analytics Platform Demo", version="0.1.0")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
```

**Step 3: Create config module**

```python
# backend/config.py
"""Application configuration via environment variables."""
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    workspace_dir: Path = Path("workspace")
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-4-6"

settings = Settings()
```

**Step 4: Install dependencies and verify**

Run: `uv sync`
Run: `uv run uvicorn backend.main:app --port 8000`
Expected: Server starts, `GET /api/health` returns `{"status": "ok"}`

**Step 5: Commit**

```bash
git add pyproject.toml backend/
git commit -m "feat(scaffold): initialize python backend with FastAPI"
```

---

### Task 0.2: Initialize React Frontend

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Modify: `frontend/package.json` (add dependencies)

**Step 1: Scaffold React app with Vite + TypeScript**

Run: `npm create vite@latest frontend -- --template react-ts`

**Step 2: Install all frontend dependencies**

```bash
cd frontend && npm install \
  ag-grid-react ag-grid-community \
  lightweight-charts recharts \
  react-grid-layout @types/react-grid-layout \
  @monaco-editor/react \
  @xyflow/react @dagrejs/dagre \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  zustand \
  react-router-dom \
  tailwindcss @tailwindcss/vite \
  clsx tailwind-merge
```

**Step 3: Configure Tailwind CSS 4**

Create `frontend/src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-muted: #94a3b8;
  --color-accent: #0ea5e9;
  --color-destructive: #ef4444;
  --color-success: #10b981;
  --color-warning: #f59e0b;
}
```

**Step 4: Verify frontend builds**

Run: `cd frontend && npm run dev`
Expected: Vite dev server starts on port 5173

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(scaffold): initialize React frontend with Vite + TypeScript"
```

---

### Task 0.3: Create Workspace Directory Structure

**Files:**
- Create: all `workspace/` directories and placeholder README files

**Step 1: Create workspace structure**

```bash
mkdir -p workspace/metadata/{entities,calculations/{transaction,time_windows,aggregations,derived},settings/thresholds,detection_models,mappings,related_products}
mkdir -p workspace/data/{csv,parquet}
mkdir -p workspace/results/{transaction,time_windows,aggregations,derived}
mkdir -p workspace/alerts/traces
mkdir -p workspace/snapshots/{pristine,act1_complete,act2_complete,final}
```

**Step 2: Create workspace README**

Create `workspace/README.md` describing each directory's purpose and file format expectations.

**Step 3: Create start.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "=== Analytics Platform Demo ==="
# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    (cd frontend && npm install && npm run build)
fi
echo "Starting on http://localhost:8000"
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Step 4: Commit**

```bash
chmod +x start.sh
git add workspace/ start.sh
git commit -m "feat(scaffold): create workspace directory structure and launch script"
```

---

## Milestone 1: Backend Foundation

### Task 1.1: DuckDB Connection Manager

**Files:**
- Create: `backend/db.py`
- Test: `tests/test_db.py`

**Step 1: Write failing test**

```python
# tests/test_db.py
from backend.db import DuckDBManager

def test_connect_and_query():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    cursor = mgr.cursor()
    result = cursor.execute("SELECT 42 AS answer").fetchone()
    assert result[0] == 42
    cursor.close()
    mgr.close()
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_db.py -v`
Expected: FAIL — module not found

**Step 3: Implement DuckDBManager**

```python
# backend/db.py
"""DuckDB connection management with thread-safe cursor creation."""
import duckdb
from contextlib import asynccontextmanager
from threading import Lock
from fastapi import FastAPI

class DuckDBManager:
    def __init__(self):
        self._conn = None
        self._lock = Lock()

    def connect(self, db_path: str = ":memory:") -> None:
        self._conn = duckdb.connect(db_path, read_only=False)
        self._conn.execute("SET threads TO 4")
        self._conn.execute("SET memory_limit = '2GB'")

    def cursor(self) -> duckdb.DuckDBPyConnection:
        if self._conn is None:
            raise RuntimeError("DuckDB not connected")
        with self._lock:
            return self._conn.cursor()

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

db_manager = DuckDBManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_manager.connect("workspace/analytics.duckdb")
    yield
    db_manager.close()
```

**Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_db.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/db.py tests/test_db.py
git commit -m "feat(backend): add DuckDB connection manager with thread-safe cursors"
```

---

### Task 1.2: Pydantic Metadata Models

**Files:**
- Create: `backend/models/__init__.py`
- Create: `backend/models/entities.py`
- Create: `backend/models/calculations.py`
- Create: `backend/models/settings.py`
- Create: `backend/models/detection.py`
- Create: `backend/models/alerts.py`
- Test: `tests/test_models.py`

**Step 1: Write failing tests for entity and calculation models**

```python
# tests/test_models.py
import json
from backend.models.calculations import CalculationDefinition, CalculationLayer
from backend.models.settings import SettingDefinition
from backend.models.entities import EntityDefinition

def test_calculation_definition_valid():
    calc = CalculationDefinition(
        calc_id="value_calc",
        name="Value Calculation",
        layer=CalculationLayer.TRANSACTION,
        description="Calculates transaction value by instrument type",
        inputs=[{"source_type": "entity", "entity_id": "execution", "fields": ["price", "quantity"]}],
        output={"table_name": "calc_value", "fields": [{"name": "calculated_value", "type": "decimal"}]},
    )
    assert calc.calc_id == "value_calc"

def test_calculation_no_self_dependency():
    import pytest
    with pytest.raises(ValueError):
        CalculationDefinition(
            calc_id="loop",
            name="Loop",
            layer=CalculationLayer.TRANSACTION,
            description="Bad",
            inputs=[],
            output={"table_name": "x", "fields": []},
            depends_on=["loop"],
        )

def test_setting_definition_with_overrides():
    setting = SettingDefinition(
        setting_id="vwap_threshold",
        name="VWAP Threshold",
        description="Proximity threshold for wash detection",
        value_type="decimal",
        default=0.02,
        match_type="hierarchy",
        overrides=[
            {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
            {"match": {"product_id": "AAPL"}, "value": 0.01, "priority": 100},
        ],
    )
    # Overrides should be sorted by priority descending
    assert setting.overrides[0].priority == 100
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_models.py -v`

**Step 3: Implement all Pydantic models**

Create models matching the metadata schemas defined in the design document (Section 4, 5, 6, 7). Each model validates its JSON structure and provides serialization.

Key models:
- `EntityDefinition` — canonical entity with fields, types, relationships
- `CalculationDefinition` — calc_id, layer, inputs, outputs, logic, parameters, display, storage
- `SettingDefinition` — setting_id, default, match_type, overrides with matching patterns; supports `type: "score_steps"` with array of `{min_value, max_value, score}` ranges
- `DetectionModelDefinition` — model_id, required_calculations (each with `strictness: MUST_PASS|OPTIONAL` and `score_steps_setting` reference), query, thresholds, `score_threshold_setting` reference, alert_template
- `AlertTrace` — alert_id, model, per-calculation scores with strictness tags, accumulated_score, score_threshold, trigger_path ("all_passed"|"score_based"), calculation_trace, settings_trace, related_entities

**Step 4: Run tests**

Run: `uv run pytest tests/test_models.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add backend/models/ tests/test_models.py
git commit -m "feat(models): add Pydantic schemas for entities, calculations, settings, detection models"
```

---

### Task 1.3: Metadata Service (JSON CRUD)

**Files:**
- Create: `backend/services/__init__.py`
- Create: `backend/services/metadata_service.py`
- Test: `tests/test_metadata_service.py`

Implements load/save/list operations for all JSON metadata files. Uses Pydantic `model_validate_json()` for validation on load.

---

### Task 1.4: Data Loader (CSV → Parquet → DuckDB)

**Files:**
- Create: `backend/engine/__init__.py`
- Create: `backend/engine/data_loader.py`
- Test: `tests/test_data_loader.py`

Implements:
- Read CSV files from `workspace/data/csv/`
- Convert to Parquet via PyArrow
- Register as DuckDB views
- Detect CSV modifications and regenerate Parquet
- Generate companion summary CSVs for Parquet result files

---

### Task 1.5: API Routes Structure

**Files:**
- Create: `backend/api/__init__.py`
- Create: `backend/api/metadata.py`
- Create: `backend/api/query.py`
- Create: `backend/api/pipeline.py`
- Create: `backend/api/alerts.py`
- Create: `backend/api/demo.py`
- Create: `backend/api/data.py`
- Create: `backend/api/ws.py`

Sets up all FastAPI routers with placeholder endpoints. Integrates with `main.py` lifespan and DuckDB. WebSocket endpoint for pipeline progress.

---

### Task 1.6: Query Service (SQL Interface to DuckDB)

**Files:**
- Create: `backend/services/query_service.py`
- Test: `tests/test_query_service.py`

Implements:
- Execute arbitrary SQL against DuckDB
- Return results as JSON
- List all tables and views (schema catalog)
- Get table schema (columns, types)
- Pre-defined illustrative queries stored as JSON

---

## Milestone 2: Calculation Engine

### Task 2.1: Calculation DAG Executor

**Files:**
- Create: `backend/engine/calculation_engine.py`
- Test: `tests/test_calculation_engine.py`

Implements:
- Load calculation definitions from metadata
- Build dependency graph (topological sort)
- Execute calculations layer by layer
- Write results to Parquet files
- Register results as DuckDB views
- Emit progress via WebSocket

---

### Task 2.2: Layer 1 — Value Calculation

**Files:**
- Create: `workspace/metadata/calculations/transaction/value_calc.json`
- Create: `workspace/metadata/calculations/transaction/adjusted_direction.json`
- Modify: `backend/engine/calculation_engine.py` (add L1 handlers)
- Test: `tests/test_layer1_calcs.py`

Implements:
- Value calculation based on instrument type (stock vs. option vs. derivative)
- Adjusted direction calculation (effective buy/sell considering short instruments)
- SQL templates that execute against DuckDB

---

### Task 2.3: Layer 2 — Time Window Calculations

**Files:**
- Create: `workspace/metadata/calculations/time_windows/business_date.json`
- Create: `workspace/metadata/calculations/time_windows/trend_window.json`
- Create: `workspace/metadata/calculations/time_windows/market_event.json`
- Create: `workspace/metadata/calculations/time_windows/cancellation_pattern.json`
- Test: `tests/test_layer2_calcs.py`

Implements:
- Business date window (cutoff-based, uses settings resolver)
- Trend window (up/down detection from intraday data)
- Market event window (significant price change detection with lookback/lookforward)
- Cancellation pattern window (X cancellations in Y seconds — for spoofing/layering)

---

### Task 2.4: Layer 3 — Aggregation Calculations

**Files:**
- Create: `workspace/metadata/calculations/aggregations/trading_activity.json`
- Create: `workspace/metadata/calculations/aggregations/vwap.json`
- Test: `tests/test_layer3_calcs.py`

Implements:
- Trading activity aggregation (buy/sell/net value+qty) for all granularity combos and time windows
- VWAP calculation per product/account/time window

---

### Task 2.5: Layer 3.5 — Derived Calculations

**Files:**
- Create: `workspace/metadata/calculations/derived/large_trading_activity.json`
- Create: `workspace/metadata/calculations/derived/wash_detection.json`
- Test: `tests/test_layer35_calcs.py`

Implements:
- Large trading activity flag (threshold-based, uses settings resolver)
- Wash detection (quantity cancellation + VWAP proximity)

---

## Milestone 3: Settings Resolution Engine

### Task 3.1: Settings Resolver Core

**Files:**
- Create: `backend/engine/settings_resolver.py`
- Test: `tests/test_settings_resolver.py`

Implements:
- Load setting definitions from JSON
- Resolve setting value for a given entity context
- Product-specific always wins
- Hierarchy match_type (most specific wins)
- Multi-dimensional match_type (most dimension matches wins)
- Default fallback (guaranteed resolution)
- Resolution trace recording (which override matched and why)
- **Score steps resolution**: Resolve graduated score step definitions per entity context (same matching engine as thresholds)
- **Score step evaluation**: Given a calculated value and resolved score steps, return the graduated score (lookup which range the value falls into)

This is a critical component — must have comprehensive tests:
- Test product-specific override
- Test hierarchy resolution
- Test multi-dimensional resolution
- Test tie-breaking
- Test default fallback
- Test resolution trace accuracy
- Test score steps resolution for different entity contexts (equity vs FX get different score ranges)
- Test score step evaluation (value → score lookup)

---

### Task 3.2: Setting Metadata Definitions

**Files:**
- Create: `workspace/metadata/settings/thresholds/wash_vwap_threshold.json`
- Create: `workspace/metadata/settings/thresholds/large_activity_multiplier.json`
- Create: `workspace/metadata/settings/thresholds/business_date_cutoff.json`
- Create: `workspace/metadata/settings/thresholds/insider_lookback_days.json`
- Create: `workspace/metadata/settings/thresholds/trend_sensitivity.json`
- Create: `workspace/metadata/settings/thresholds/cancel_count_threshold.json`
- Create: `workspace/metadata/settings/matching_patterns.json`
- Create: `workspace/metadata/settings/resolution_rules.json`
- Create: `workspace/metadata/settings/score_steps/large_activity_score_steps.json`
- Create: `workspace/metadata/settings/score_steps/vwap_proximity_score_steps.json`
- Create: `workspace/metadata/settings/score_steps/quantity_match_score_steps.json`
- Create: `workspace/metadata/settings/score_steps/same_side_pct_score_steps.json`
- Create: `workspace/metadata/settings/score_steps/market_event_score_steps.json`
- Create: `workspace/metadata/settings/score_thresholds/wash_score_threshold.json`
- Create: `workspace/metadata/settings/score_thresholds/mpr_score_threshold.json`
- Create: `workspace/metadata/settings/score_thresholds/insider_score_threshold.json`
- Create: `workspace/metadata/settings/score_thresholds/spoofing_score_threshold.json`

All settings for the 5 detection models, with overrides for different entity attribute combinations. Score step definitions use the same matching engine as thresholds (entity-attribute-dependent, resolved via settings resolver). Score thresholds per model are also entity-attribute-dependent.

---

## Milestone 4: Detection & Alerts

### Task 4.1: Detection Engine

**Files:**
- Create: `backend/engine/detection_engine.py`
- Test: `tests/test_detection_engine.py`

Implements:
- Load detection model definitions
- Evaluate model query against calculation results in DuckDB
- Match thresholds via settings resolver
- **Graduated scoring**: For each calculation in a model, resolve score steps via settings and compute the graduated score based on the actual value
- **MUST_PASS / OPTIONAL logic**: Each calculation tagged as MUST_PASS (gate condition) or OPTIONAL (score-only)
- **Alert trigger logic**: `alert_fires = must_pass_ok AND (all_passed OR score_ok)` where `score_ok = accumulated_score >= model.score_threshold`
- Score threshold resolved per entity context via settings engine
- Generate alerts with full trace including trigger path ("all_passed" or "score-based")

Tests must cover:
- All thresholds pass → alert fires via all_passed path
- MUST_PASS passes, OPTIONAL fails, score exceeds threshold → alert fires via score path
- MUST_PASS fails, even if score exceeds threshold → NO alert
- All calculations OPTIONAL → score is the only determinant
- Score threshold varies by entity context

---

### Task 4.2: Detection Model Definitions

**Files:**
- Create: `workspace/metadata/detection_models/wash_full_day.json`
- Create: `workspace/metadata/detection_models/wash_intraday.json`
- Create: `workspace/metadata/detection_models/market_price_ramping.json`
- Create: `workspace/metadata/detection_models/insider_dealing.json`
- Create: `workspace/metadata/detection_models/spoofing_layering.json`

Each contains: required_calculations (with MUST_PASS/OPTIONAL strictness per calculation), SQL query template, threshold references, score step references per calculation, model score_threshold setting reference, alert template.

---

### Task 4.3: Alert Generation & Trace

**Files:**
- Modify: `backend/engine/detection_engine.py`
- Create: `backend/services/alert_service.py`
- Test: `tests/test_alert_generation.py`

Implements:
- Generate alert JSON trace files (per-alert, in `workspace/alerts/traces/`)
- Include: calculation trace, settings resolution trace, entity context, per-calculation graduated score breakdown, MUST_PASS/OPTIONAL tags, trigger path ("all_passed" or "score-based"), accumulated score vs score threshold
- Score step resolution traces per calculation (which score step definition was used, which range matched)
- Save alert summary to Parquet (include accumulated_score, score_threshold, trigger_path columns)
- Register alerts in DuckDB for querying

---

## Milestone 5: Frontend Foundation

### Task 5.1: App Shell & Routing

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/layouts/AppLayout.tsx`
- Create: `frontend/src/layouts/Sidebar.tsx`
- Create: `frontend/src/routes.tsx`

Implements:
- React Router with routes for all 11 views
- Sidebar navigation grouped by: Define, Configure, Operate, Compose, Investigate
- Top toolbar with demo controls
- Dark/light theme toggle

---

### Task 5.2: Theme System

**Files:**
- Modify: `frontend/src/index.css`
- Create: `frontend/src/hooks/useTheme.ts`
- Create: `frontend/src/components/ThemeProvider.tsx`

Implements:
- CSS variable-based dark/light theme (Bloomberg-style dark default)
- Theme toggle persisted to localStorage
- All libraries configured for theme awareness (AG Grid, Monaco, React Flow, Lightweight Charts)

---

### Task 5.3: Shared Components

**Files:**
- Create: `frontend/src/components/Panel.tsx` (widget panel with title bar)
- Create: `frontend/src/components/DataGrid.tsx` (AG Grid wrapper with theme)
- Create: `frontend/src/components/LoadingSpinner.tsx`
- Create: `frontend/src/components/StatusBadge.tsx`

---

### Task 5.4: API Client & Stores

**Files:**
- Create: `frontend/src/api/client.ts` (fetch wrapper)
- Create: `frontend/src/api/websocket.ts` (WebSocket connection manager)
- Create: `frontend/src/stores/alertStore.ts`
- Create: `frontend/src/stores/pipelineStore.ts`
- Create: `frontend/src/stores/demoStore.ts`
- Create: `frontend/src/stores/metadataStore.ts`

Zustand stores for all domain state. WebSocket client for pipeline progress.

---

## Milestone 6: Configuration Views

### Task 6.1: Entity Designer

**Files:**
- Create: `frontend/src/views/EntityDesigner/index.tsx`
- Create: `frontend/src/views/EntityDesigner/EntityList.tsx`
- Create: `frontend/src/views/EntityDesigner/EntityDetail.tsx`
- Create: `frontend/src/views/EntityDesigner/RelationshipGraph.tsx`

Implements:
- List all canonical entities (from metadata)
- View entity attributes, types, subtypes
- View entity relationships via React Flow graph
- View/add domain values

---

### Task 6.2: Metadata Explorer

**Files:**
- Create: `frontend/src/views/MetadataExplorer/index.tsx`
- Create: `frontend/src/views/MetadataExplorer/CalculationList.tsx`
- Create: `frontend/src/views/MetadataExplorer/CalculationDetail.tsx`
- Create: `frontend/src/views/MetadataExplorer/CalculationDAG.tsx`

Implements:
- Browse calculation definitions by layer
- View calculation detail (inputs, outputs, logic, parameters, display, dependencies)
- Interactive calculation DAG using React Flow + dagre auto-layout
- Color-coded by layer

---

### Task 6.3: Settings Manager

**Files:**
- Create: `frontend/src/views/SettingsManager/index.tsx`
- Create: `frontend/src/views/SettingsManager/SettingsList.tsx`
- Create: `frontend/src/views/SettingsManager/SettingDetail.tsx`
- Create: `frontend/src/views/SettingsManager/OverrideEditor.tsx`

Implements:
- List all settings with their defaults
- View/edit overrides with matching patterns
- Visual resolution trace — show which override wins for a given entity context
- AG Grid for threshold tables

---

### Task 6.4: Mapping Studio

**Files:**
- Create: `frontend/src/views/MappingStudio/index.tsx`
- Create: `frontend/src/views/MappingStudio/SourcePreview.tsx`
- Create: `frontend/src/views/MappingStudio/CanonicalFields.tsx`
- Create: `frontend/src/views/MappingStudio/DragDropMapper.tsx`

Implements:
- Select a calculation to deploy
- Show required canonical fields (from calculation metadata)
- Preview source data (CSV columns)
- Drag-and-drop mapping using dnd-kit
- Validate mapping (completeness, type compatibility)
- Save mapping definition to JSON

---

## Milestone 7: Operations Views

### Task 7.1: Pipeline Monitor

**Files:**
- Create: `frontend/src/views/PipelineMonitor/index.tsx`
- Create: `frontend/src/views/PipelineMonitor/PipelineDAG.tsx`
- Create: `frontend/src/views/PipelineMonitor/ProgressBar.tsx`
- Create: `frontend/src/views/PipelineMonitor/LogViewer.tsx`

Implements:
- Animated calculation DAG showing execution progress (React Flow)
- Layer-by-layer progress bars
- Real-time log viewer
- WebSocket connection for live updates

---

### Task 7.2: Schema Explorer

**Files:**
- Create: `frontend/src/views/SchemaExplorer/index.tsx`
- Create: `frontend/src/views/SchemaExplorer/TableList.tsx`
- Create: `frontend/src/views/SchemaExplorer/ColumnDetail.tsx`

Implements:
- List all DuckDB tables and views
- Show columns, types, descriptions
- Row count per table
- ER diagram (React Flow) showing table relationships

---

### Task 7.3: SQL Console

**Files:**
- Create: `frontend/src/views/SQLConsole/index.tsx`
- Create: `frontend/src/views/SQLConsole/QueryEditor.tsx`
- Create: `frontend/src/views/SQLConsole/ResultsGrid.tsx`
- Create: `frontend/src/views/SQLConsole/PresetQueries.tsx`

Implements:
- Monaco Editor with SQL syntax highlighting
- Table name autocompletion from schema
- Run button (Ctrl+Enter)
- Results displayed in AG Grid
- Pre-defined illustrative queries for each demo step
- Query history

---

## Milestone 8: Compose Views

### Task 8.1: Model Composer

**Files:**
- Create: `frontend/src/views/ModelComposer/index.tsx`
- Create: `frontend/src/views/ModelComposer/CalculationPicker.tsx`
- Create: `frontend/src/views/ModelComposer/QueryBuilder.tsx`
- Create: `frontend/src/views/ModelComposer/ThresholdConfig.tsx`
- Create: `frontend/src/views/ModelComposer/ScoreConfig.tsx`
- Create: `frontend/src/views/ModelComposer/AlertTemplateEditor.tsx`

Implements:
- Select existing calculations as building blocks
- **Tag each calculation as MUST_PASS or OPTIONAL** (toggle per calculation)
- **Configure score steps per calculation** (select from settings or define custom graduated ranges)
- **Configure model score threshold** (select from settings, entity-attribute-dependent)
- Compose SQL query (Monaco Editor) or use drag-and-drop
- Configure thresholds (from settings or custom)
- Define alert template (description, sections)
- Deploy model → immediately generates alerts
- "Model as query" interface — easy, visual

---

### Task 8.2: Data Manager

**Files:**
- Create: `frontend/src/views/DataManager/index.tsx`
- Create: `frontend/src/views/DataManager/FileList.tsx`
- Create: `frontend/src/views/DataManager/DataPreview.tsx`
- Create: `frontend/src/views/DataManager/UploadDialog.tsx`

Implements:
- List all data files (CSV + Parquet)
- Preview data in AG Grid
- Edit CSV data inline
- Reload data (regenerate Parquet from modified CSV)
- Upload new data files

---

## Milestone 9: Risk Case Manager

### Task 9.1: Alert Summary

**Files:**
- Create: `frontend/src/views/RiskCaseManager/index.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertSummary.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertFilters.tsx`

Implements:
- AG Grid with all alerts: ID, model, score, severity, entity, product, status, timestamp
- Filtering by model, score range, entity, date
- Sorting by any column
- Click row → navigate to Alert Detail
- Color-coded severity

---

### Task 9.2: Alert Detail — Layout & Widgets

**Files:**
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/index.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/BusinessDescription.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/EntityContext.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/WidgetManager.tsx`

Implements:
- react-grid-layout with configurable widget panels
- Bloomberg-style header bar (alert ID, model, score, severity)
- Widget add/remove capability
- Layout persistence to localStorage
- Dynamic structure based on detection model metadata

---

### Task 9.3: Alert Detail — Calculation Trace DAG

**Files:**
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/CalcTraceDag.tsx`

Implements:
- Interactive React Flow DAG showing the full calculation chain for this alert
- Each node shows: calculation name, formula, input values used, output value
- Click node → expand to see full detail
- Animated edges showing data flow
- Color-coded by layer

---

### Task 9.4: Alert Detail — Financial Charts

**Files:**
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/PriceVolumeChart.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/OrderTimeline.tsx`

Implements:
- TradingView Lightweight Charts for price + volume
- Markers overlaid for the account's trades
- Market event annotations
- Time window highlighting (lookback/lookforward shading)
- Order timeline showing individual orders with status (filled, cancelled)

---

### Task 9.5: Alert Detail — Settings Resolution & Score

**Files:**
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/SettingsTrace.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/ScoreBreakdown.tsx`
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/RelatedData.tsx`

Implements:
- Settings resolution trace: which setting was resolved, which override matched, what the default was (includes score step and score threshold resolution traces)
- **Graduated score breakdown**: recharts bar chart showing per-calculation scores with MUST_PASS/OPTIONAL visual tags, accumulated score vs score threshold gauge, trigger path indicator ("all_passed" or "score-based")
- Score steps detail: click a calculation score to see the graduated range definition and which range the actual value fell into
- Related orders/executions table (AG Grid)
- Links to logs, raw data, related alerts

---

## Milestone 10: AI Query Assistant

### Task 10.1: Backend AI Service

**Files:**
- Create: `backend/services/ai_assistant.py`
- Create: `workspace/metadata/ai_instructions.md`
- Create: `workspace/metadata/ai_mock_sequences.json`
- Test: `tests/test_ai_assistant.py`

Implements:
- **Live mode**: Call Claude API with auto-generated system context (entity schemas, DB schema, calc definitions, sample data, domain instructions)
- **Mock mode**: Pre-scripted conversation sequences that return canned SQL/model definitions
- Mode selection based on API key configuration
- Domain instructions file describing trade surveillance concepts

---

### Task 10.2: Frontend AI Chat Interface

**Files:**
- Create: `frontend/src/views/AIAssistant/index.tsx`
- Create: `frontend/src/views/AIAssistant/ChatPanel.tsx`
- Create: `frontend/src/views/AIAssistant/QueryPreview.tsx`
- Create: `frontend/src/views/AIAssistant/MockPlayer.tsx`

Implements:
- Chat-style interface for natural language input
- AI response rendering with SQL/JSON code blocks
- Action buttons: [Run Query], [Edit], [Save as Model]
- Mock mode: step through pre-scripted conversation on click
- Integrated into SQL Console and Model Composer as a panel

---

## Milestone 11: Demo Controls & State Machine

### Task 11.1: Demo Controller Backend

**Files:**
- Create: `backend/services/demo_controller.py`
- Test: `tests/test_demo_controller.py`

Implements:
- State machine with all checkpoints (PRISTINE → ... → COMPLETE)
- Save checkpoint: snapshot current workspace state
- Restore checkpoint: copy snapshot over workspace
- Reset: restore pristine snapshot
- Skip-to-end: restore final snapshot
- Step: advance one checkpoint
- Jump to act: restore act start snapshot
- `demo_state.json` persistence

---

### Task 11.2: Demo Controls Frontend

**Files:**
- Create: `frontend/src/components/DemoToolbar.tsx`

Implements:
- Persistent toolbar: [Reset] [Resume] [Skip to End] [Step ▶] [Jump to Act 1/2/3]
- Current state indicator
- Progress bar showing position in demo flow
- Confirmation dialogs for destructive actions (reset)

---

## Milestone 12: Synthetic Data & Demo Scenarios

### Task 12.1: Data Generation Guidelines

**Files:**
- Create: `docs/data-guidelines.md`

**Requires:** Dedicated session with product owner to approve data guidelines. Document:
- Entity counts (how many products, accounts, traders, etc.)
- Date range for demo data
- Known patterns embedded for each detection model
- Market event scenarios
- Realistic but synthetic naming conventions

---

### Task 12.2: Data Generation Script

**Files:**
- Create: `scripts/generate_data.py`
- Test: `tests/test_data_generation.py`

Implements:
- Generate all CSV files based on approved guidelines
- Embed known patterns for each detection model:
  - Wash trading: account with offsetting buy/sell in same product
  - MPR: aggressive same-direction trading during detected trend
  - Insider dealing: related-product buying before embedded market event
  - Spoofing: cancellation pattern with opposite-side execution
- Generate realistic market data (EOD, intraday, quotes)

---

### Task 12.3: Demo Scenario Snapshots

**Files:**
- Create: `scripts/generate_snapshots.py`

Implements:
- Run pipeline through each demo checkpoint
- Save workspace state at each checkpoint to snapshots/
- Verify each snapshot is independently loadable
- Create pristine, act1_complete, act2_complete, and final snapshots

---

## Milestone 13: Polish & Documentation

### Task 13.1: README Files

**Files:**
- Create: `README.md` (root)
- Create: `backend/README.md`
- Create: `frontend/README.md`
- Create: `workspace/README.md`

---

### Task 13.2: Demo Guide

**Files:**
- Create: `docs/demo-guide.md`

Step-by-step walkthrough of Act 1, 2, 3 with:
- What to click at each step
- What to say / explain
- Expected state at each checkpoint
- Troubleshooting

---

### Task 13.3: Data Dictionary

**Files:**
- Create: `docs/schemas/data-dictionary.md`
- Create: `docs/schemas/entity-schemas.md`
- Create: `docs/schemas/calculation-schemas.md`

All entity definitions, field descriptions, types, relationships documented.

---

### Task 13.4: Integration Testing & Polish

- End-to-end test: start.sh → load data → run pipeline → generate alerts → verify UI
- Cross-browser testing (Chrome, Firefox, Safari)
- Responsive layout checks
- Performance check: all queries < 500ms

---

### Task 13.5: Serve React Build from FastAPI

**Files:**
- Modify: `backend/main.py`

Implement SPAStaticFiles class to serve the React production build from FastAPI, with index.html fallback for client-side routing. Ensure all `/api/*` routes take priority.

---

## Execution Strategy

This plan has ~35 tasks across 14 milestones. Recommended execution:

**Phase 1 (Foundation):** M0 → M1 → M3 (Tasks 0.1-0.3, 1.1-1.6, 3.1-3.2)
**Phase 2 (Engine):** M2 → M4 (Tasks 2.1-2.5, 4.1-4.3)
**Phase 3 (UI Foundation):** M5 (Tasks 5.1-5.4)
**Phase 4 (UI Views):** M6 → M7 → M8 → M9 (Tasks 6.1-9.5) — can parallelize some
**Phase 5 (Integration):** M10 → M11 → M12 → M13

Backend and frontend tracks can run in parallel after M0.
