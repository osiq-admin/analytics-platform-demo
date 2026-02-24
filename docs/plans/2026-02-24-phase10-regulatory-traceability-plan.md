# Phase 10: Regulatory Traceability & Model Tagging — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add regulatory tags to all calculations and detection models, build an interactive traceability view mapping Regulations → Detection Models → Calculations → Entities, and create a coverage analysis engine that identifies regulatory gaps and suggests improvements.

**Architecture:** Extend existing Pydantic models with `regulatory_tags` (calculations) and `regulatory_coverage` (detection models) fields. Enhance the existing dependency graph API to include regulatory metadata. Build a new RegulatoryMap frontend view using React Flow for interactive graph visualization. Add a backend coverage analysis service that compares model coverage against a known regulation registry.

**Tech Stack:** Python FastAPI + Pydantic v2 (backend), React 19 + TypeScript + React Flow + dagre + Zustand (frontend), existing MetadataService patterns.

**Important:** Do NOT modify any existing plan files in `docs/plans/`. Only create new files and append rows to `docs/progress.md`.

---

## Milestones Overview

| # | Milestone | Description | Dependencies |
|---|---|---|---|
| M79 | Regulatory Tags on Backend Models | Add `regulatory_tags` to CalculationDefinition, `regulatory_coverage` to DetectionModelDefinition, update all JSONs | None |
| M80 | Regulatory Traceability API | Enhanced dependency graph with regulatory data, coverage analysis endpoint, regulation registry | M79 |
| M81 | Frontend RegulatoryMap View | Interactive React Flow graph: Regulations → Models → Calculations → Entities | M80 |
| M82 | Coverage Analysis & Suggestion Engine | Backend gap analysis, improvement suggestions, frontend suggestion panel | M80 |
| M83 | E2E Tests, Tours & Documentation | Playwright tests, guided tour, progress tracker, demo guide | M81, M82 |

---

## Regulatory Domain Reference

These are the real-world regulations relevant to the 5 existing detection models:

| Regulation | Article | Description | Models |
|---|---|---|---|
| MAR (EU 596/2014) | Art. 12(1)(a) | Wash trading / fictitious transactions | wash_full_day, wash_intraday |
| MAR | Art. 12(1)(b) | Price manipulation / market price ramping | market_price_ramping |
| MAR | Art. 12(1)(c) | Spoofing / layering / quote stuffing | spoofing_layering |
| MAR | Art. 14 | Insider dealing prohibition | insider_dealing |
| MAR | Art. 16 | Surveillance obligation (detect & report) | All models |
| MiFID II | Art. 16(2) | Organisational requirement for surveillance | All models |
| MiFID II | RTS 25 | Order record keeping | wash_full_day, spoofing_layering |
| Dodd-Frank | §747 | Anti-manipulation (US) | spoofing_layering, market_price_ramping |
| FINRA | Rule 5210 | Marking the close (related) | market_price_ramping |

---

## M79: Regulatory Tags on Backend Models

### Task 79.1: Add `regulatory_tags` to CalculationDefinition

**Files:**
- Modify: `backend/models/calculations.py:33-51`
- Test: `tests/test_metadata_service.py`

**Step 1:** Add the field to the Pydantic model. Open `backend/models/calculations.py` and add `regulatory_tags` after `depends_on`:

```python
class CalculationDefinition(BaseModel):
    calc_id: str
    name: str
    layer: CalculationLayer
    description: str = ""
    inputs: list[dict[str, Any]] = []
    output: dict[str, Any] = {}
    logic: str = ""
    parameters: dict[str, Any] = {}
    display: dict[str, Any] = {}
    storage: str = ""
    value_field: str = ""
    depends_on: list[str] = []
    regulatory_tags: list[str] = []  # e.g. ["MAR Art. 12(1)(a)", "MiFID II Art. 16(2)"]
```

**Step 2:** Run tests to verify nothing breaks:

```bash
uv run pytest tests/test_metadata_service.py -v
```

Expected: All existing tests pass (new field has default `[]`).

**Step 3:** Commit:

```bash
git add backend/models/calculations.py
git commit -m "feat(phase10): add regulatory_tags field to CalculationDefinition (M79)"
```

### Task 79.2: Add `regulatory_coverage` to DetectionModelDefinition

**Files:**
- Modify: `backend/models/detection.py:21-34`
- Test: `tests/test_detection_engine.py`

**Step 1:** Add a `RegulatoryCoverage` model and the field to `DetectionModelDefinition`. Open `backend/models/detection.py` and add before the `ModelCalculation` class:

```python
class RegulatoryCoverage(BaseModel):
    regulation: str      # e.g. "MAR", "MiFID II", "Dodd-Frank"
    article: str         # e.g. "Art. 12(1)(a)"
    description: str = ""  # e.g. "Wash trading prohibition"
```

Then add to `DetectionModelDefinition` after `alert_template`:

```python
    regulatory_coverage: list[RegulatoryCoverage] = []
```

**Step 2:** Run tests:

```bash
uv run pytest tests/test_detection_engine.py -v
```

Expected: All pass (new field has default `[]`).

**Step 3:** Commit:

```bash
git add backend/models/detection.py
git commit -m "feat(phase10): add RegulatoryCoverage model and field to DetectionModelDefinition (M79)"
```

### Task 79.3: Update all 10 calculation JSON files with regulatory tags

**Files:**
- Modify: `workspace/metadata/calculations/transaction/value_calc.json`
- Modify: `workspace/metadata/calculations/transaction/adjusted_direction.json`
- Modify: `workspace/metadata/calculations/time_window/business_date_window.json`
- Modify: `workspace/metadata/calculations/time_window/trend_detection.json`
- Modify: `workspace/metadata/calculations/time_window/market_event_detection.json`
- Modify: `workspace/metadata/calculations/time_window/cancel_pattern.json`
- Modify: `workspace/metadata/calculations/aggregation/trading_activity_aggregation.json`
- Modify: `workspace/metadata/calculations/aggregation/vwap_calc.json`
- Modify: `workspace/metadata/calculations/derived/large_trading_activity.json`
- Modify: `workspace/metadata/calculations/derived/wash_detection.json`

**Step 1:** Add `regulatory_tags` to each calculation JSON. Use these exact values:

| Calculation | regulatory_tags |
|---|---|
| `value_calc` | `["MAR Art. 16", "MiFID II Art. 16(2)"]` |
| `adjusted_direction` | `["MAR Art. 16", "MiFID II Art. 16(2)"]` |
| `business_date_window` | `["MAR Art. 16"]` |
| `trend_detection` | `["MAR Art. 12(1)(b)", "MAR Art. 16"]` |
| `market_event_detection` | `["MAR Art. 14", "MAR Art. 16"]` |
| `cancel_pattern` | `["MAR Art. 12(1)(c)", "Dodd-Frank §747"]` |
| `trading_activity_aggregation` | `["MAR Art. 12", "MAR Art. 16", "MiFID II Art. 16(2)"]` |
| `vwap_calc` | `["MAR Art. 12(1)(a)", "MiFID II Art. 16(2)"]` |
| `large_trading_activity` | `["MAR Art. 12", "MAR Art. 16"]` |
| `wash_detection` | `["MAR Art. 12(1)(a)", "MiFID II Art. 16(2)"]` |

For each JSON file, add `"regulatory_tags": [...]` as a top-level field (after `depends_on` if present, otherwise at the end before the closing brace).

**Step 2:** Verify all JSONs parse correctly:

```bash
uv run python -c "
from backend.services.metadata_service import MetadataService
from backend import config
ms = MetadataService(config.settings.workspace_dir)
calcs = ms.list_calculations()
for c in calcs:
    assert isinstance(c.regulatory_tags, list), f'{c.calc_id} missing regulatory_tags'
    print(f'{c.calc_id}: {c.regulatory_tags}')
print(f'All {len(calcs)} calculations have regulatory_tags')
"
```

Expected: All 10 calculations print their tags with no assertion errors.

**Step 3:** Commit:

```bash
git add workspace/metadata/calculations/
git commit -m "feat(phase10): add regulatory tags to all 10 calculation JSONs (M79)"
```

### Task 79.4: Update all 5 detection model JSON files with regulatory coverage

**Files:**
- Modify: `workspace/metadata/detection_models/wash_full_day.json`
- Modify: `workspace/metadata/detection_models/wash_intraday.json`
- Modify: `workspace/metadata/detection_models/market_price_ramping.json`
- Modify: `workspace/metadata/detection_models/insider_dealing.json`
- Modify: `workspace/metadata/detection_models/spoofing_layering.json`

**Step 1:** Add `"regulatory_coverage"` to each model JSON. Use these exact values:

**wash_full_day.json:**
```json
"regulatory_coverage": [
  {"regulation": "MAR", "article": "Art. 12(1)(a)", "description": "Wash trading — fictitious transactions that give misleading signals"},
  {"regulation": "MiFID II", "article": "Art. 16(2)", "description": "Organisational requirement — effective surveillance systems"},
  {"regulation": "MiFID II", "article": "RTS 25", "description": "Order record keeping — cross-reference execution records"}
]
```

**wash_intraday.json:**
```json
"regulatory_coverage": [
  {"regulation": "MAR", "article": "Art. 12(1)(a)", "description": "Wash trading — intraday fictitious transactions"},
  {"regulation": "MiFID II", "article": "Art. 16(2)", "description": "Organisational requirement — effective surveillance systems"}
]
```

**market_price_ramping.json:**
```json
"regulatory_coverage": [
  {"regulation": "MAR", "article": "Art. 12(1)(b)", "description": "Price manipulation — securing price at abnormal or artificial level"},
  {"regulation": "Dodd-Frank", "article": "§747", "description": "Anti-manipulation provisions"},
  {"regulation": "FINRA", "article": "Rule 5210", "description": "Marking the close — trading activity near market close"}
]
```

**insider_dealing.json:**
```json
"regulatory_coverage": [
  {"regulation": "MAR", "article": "Art. 14", "description": "Insider dealing — trading on inside information"},
  {"regulation": "MAR", "article": "Art. 16", "description": "Surveillance obligation — detect and report suspicious orders"},
  {"regulation": "MiFID II", "article": "Art. 16(2)", "description": "Organisational requirement — effective surveillance systems"}
]
```

**spoofing_layering.json:**
```json
"regulatory_coverage": [
  {"regulation": "MAR", "article": "Art. 12(1)(c)", "description": "Spoofing — orders with no intention to execute"},
  {"regulation": "Dodd-Frank", "article": "§747", "description": "Anti-manipulation — spoofing prohibition"},
  {"regulation": "MiFID II", "article": "RTS 25", "description": "Order record keeping — cancellation pattern analysis"}
]
```

Add the `"regulatory_coverage"` array after `"alert_template"` in each file.

**Step 2:** Verify all model JSONs parse correctly:

```bash
uv run python -c "
from backend.services.metadata_service import MetadataService
from backend import config
ms = MetadataService(config.settings.workspace_dir)
models = ms.list_detection_models()
for m in models:
    assert isinstance(m.regulatory_coverage, list), f'{m.model_id} missing regulatory_coverage'
    assert len(m.regulatory_coverage) > 0, f'{m.model_id} has empty regulatory_coverage'
    for rc in m.regulatory_coverage:
        assert rc.regulation, f'{m.model_id} has empty regulation'
        assert rc.article, f'{m.model_id} has empty article'
    print(f'{m.model_id}: {len(m.regulatory_coverage)} regulations')
print(f'All {len(models)} models have regulatory_coverage')
"
```

Expected: All 5 models print their coverage counts.

**Step 3:** Commit:

```bash
git add workspace/metadata/detection_models/
git commit -m "feat(phase10): add regulatory coverage to all 5 detection model JSONs (M79)"
```

### Task 79.5: Expand TypeScript interfaces

**Files:**
- Modify: `frontend/src/stores/metadataStore.ts:28-41` (CalculationDef)
- Modify: `frontend/src/stores/metadataStore.ts:67-78` (DetectionModelDef)

**Step 1:** Add `RegulatoryCoverage` interface and `regulatory_tags` to `CalculationDef`:

```typescript
export interface RegulatoryCoverage {
  regulation: string;
  article: string;
  description?: string;
}
```

Add after the existing interfaces (before `MetadataState`), then add to `CalculationDef`:

```typescript
export interface CalculationDef {
  // ... existing fields ...
  depends_on: string[];
  regulatory_tags: string[];  // Add this line
}
```

**Step 2:** Add `regulatory_coverage` to `DetectionModelDef`:

```typescript
export interface DetectionModelDef {
  // ... existing fields ...
  alert_template?: Record<string, unknown>;
  regulatory_coverage?: RegulatoryCoverage[];  // Add this line
}
```

**Step 3:** Build to verify:

```bash
cd frontend && npm run build
```

Expected: Clean build, no TypeScript errors.

**Step 4:** Commit:

```bash
git add frontend/src/stores/metadataStore.ts
git commit -m "feat(phase10): expand TS interfaces with regulatory fields (M79)"
```

### Task 79.6: Regenerate snapshots with new metadata fields

**Files:**
- Modify: `workspace/snapshots/` (auto-generated)

**Step 1:** Regenerate all snapshots to include the new regulatory fields:

```bash
uv run python -m scripts.generate_snapshots
```

**Step 2:** Verify a snapshot includes the new fields:

```bash
uv run python -c "
import json
from pathlib import Path
# Check final snapshot has regulatory fields
model_path = Path('workspace/snapshots/final/metadata/detection_models/wash_full_day.json')
model = json.loads(model_path.read_text())
assert 'regulatory_coverage' in model, 'Missing regulatory_coverage in snapshot'
print(f'wash_full_day regulatory_coverage: {len(model[\"regulatory_coverage\"])} entries')

calc_path = list(Path('workspace/snapshots/final/metadata/calculations').rglob('wash_detection.json'))[0]
calc = json.loads(calc_path.read_text())
assert 'regulatory_tags' in calc, 'Missing regulatory_tags in snapshot'
print(f'wash_detection regulatory_tags: {calc[\"regulatory_tags\"]}')
print('Snapshots verified!')
"
```

**Step 3:** Run full test suite:

```bash
uv run pytest tests/ -v
```

Expected: All ~294 tests pass (no regressions from new optional fields).

**Step 4:** Commit:

```bash
git add workspace/snapshots/
git commit -m "feat(phase10): regenerate snapshots with regulatory metadata (M79)"
```

---

## M80: Regulatory Traceability API

### Task 80.1: Create regulation registry

**Files:**
- Create: `workspace/metadata/regulations/registry.json`

**Step 1:** Create the directory and registry file:

```bash
mkdir -p workspace/metadata/regulations
```

**Step 2:** Write `workspace/metadata/regulations/registry.json` with the full regulation registry:

```json
{
  "regulations": [
    {
      "id": "mar",
      "name": "Market Abuse Regulation",
      "full_name": "EU Regulation 596/2014 (MAR)",
      "jurisdiction": "EU",
      "articles": [
        {
          "id": "mar_12_1_a",
          "article": "Art. 12(1)(a)",
          "title": "Wash Trading",
          "description": "Transactions which give, or are likely to give, false or misleading signals as to the supply of, demand for, or price of a financial instrument",
          "detection_pattern": "wash_trading"
        },
        {
          "id": "mar_12_1_b",
          "article": "Art. 12(1)(b)",
          "title": "Price Manipulation",
          "description": "Transactions which secure, or are likely to secure, the price of one or several financial instruments at an abnormal or artificial level",
          "detection_pattern": "price_manipulation"
        },
        {
          "id": "mar_12_1_c",
          "article": "Art. 12(1)(c)",
          "title": "Spoofing / Layering",
          "description": "Orders to trade which employ a fictitious device or any other form of deception or contrivance",
          "detection_pattern": "spoofing"
        },
        {
          "id": "mar_14",
          "article": "Art. 14",
          "title": "Insider Dealing",
          "description": "Prohibition of insider dealing and of unlawful disclosure of inside information",
          "detection_pattern": "insider_dealing"
        },
        {
          "id": "mar_16",
          "article": "Art. 16",
          "title": "Surveillance Obligation",
          "description": "Obligation to detect and report suspicious orders and transactions",
          "detection_pattern": "general_surveillance"
        }
      ]
    },
    {
      "id": "mifid2",
      "name": "MiFID II",
      "full_name": "EU Directive 2014/65/EU (MiFID II)",
      "jurisdiction": "EU",
      "articles": [
        {
          "id": "mifid2_16_2",
          "article": "Art. 16(2)",
          "title": "Organisational Requirements",
          "description": "Investment firms shall establish adequate policies and procedures to ensure compliance, including effective surveillance systems",
          "detection_pattern": "general_surveillance"
        },
        {
          "id": "mifid2_rts25",
          "article": "RTS 25",
          "title": "Order Record Keeping",
          "description": "Clock synchronisation and order record keeping obligations",
          "detection_pattern": "record_keeping"
        }
      ]
    },
    {
      "id": "dodd_frank",
      "name": "Dodd-Frank Act",
      "full_name": "Dodd-Frank Wall Street Reform and Consumer Protection Act",
      "jurisdiction": "US",
      "articles": [
        {
          "id": "df_747",
          "article": "§747",
          "title": "Anti-Manipulation",
          "description": "Prohibition of spoofing, market manipulation, and disruptive trading practices",
          "detection_pattern": "spoofing"
        }
      ]
    },
    {
      "id": "finra",
      "name": "FINRA Rules",
      "full_name": "Financial Industry Regulatory Authority Rules",
      "jurisdiction": "US",
      "articles": [
        {
          "id": "finra_5210",
          "article": "Rule 5210",
          "title": "Marking the Close",
          "description": "Prohibition of trading activity designed to influence the closing price",
          "detection_pattern": "price_manipulation"
        }
      ]
    }
  ]
}
```

**Step 3:** Commit:

```bash
git add workspace/metadata/regulations/
git commit -m "feat(phase10): add regulation registry with MAR, MiFID II, Dodd-Frank, FINRA (M80)"
```

### Task 80.2: Add regulation loading to MetadataService

**Files:**
- Modify: `backend/services/metadata_service.py`
- Test: `tests/test_metadata_service.py`

**Step 1:** Add regulation loading methods to `MetadataService`. Add these methods after the existing `list_detection_models` method:

```python
def load_regulation_registry(self) -> dict:
    """Load the regulation registry from JSON."""
    path = self.workspace / "metadata" / "regulations" / "registry.json"
    if not path.exists():
        return {"regulations": []}
    return json.loads(path.read_text())

def get_regulatory_coverage_map(self) -> dict:
    """Build a map of regulation → articles → detection models → calculations.

    Returns a structure suitable for the traceability graph:
    {
        "regulations": [...],
        "models_by_regulation": {"MAR Art. 12(1)(a)": ["wash_full_day", ...]},
        "calcs_by_model": {"wash_full_day": ["large_trading_activity", ...]},
        "coverage_summary": {"covered": [...], "uncovered": [...]}
    }
    """
    registry = self.load_regulation_registry()
    models = self.list_detection_models()
    calcs = self.list_calculations()

    # Build reverse index: regulation article → model IDs
    models_by_article: dict[str, list[str]] = {}
    for model in models:
        for rc in model.regulatory_coverage:
            key = f"{rc.regulation} {rc.article}"
            if key not in models_by_article:
                models_by_article[key] = []
            models_by_article[key].append(model.model_id)

    # Build model → calc mapping
    calcs_by_model: dict[str, list[str]] = {}
    for model in models:
        calcs_by_model[model.model_id] = [mc.calc_id for mc in model.calculations]

    # Build calc → entity mapping (from inputs)
    entities_by_calc: dict[str, list[str]] = {}
    for calc in calcs:
        entity_inputs = set()
        for inp in calc.inputs:
            if inp.get("source_type") == "entity":
                entity_inputs.add(inp.get("entity_id", ""))
        # Also extract from SQL logic (tables referenced)
        entities_by_calc[calc.calc_id] = list(entity_inputs) if entity_inputs else []

    # Coverage analysis: which articles have models, which don't
    all_articles = []
    for reg in registry.get("regulations", []):
        for art in reg.get("articles", []):
            article_key = f"{reg['name']} {art['article']}"
            all_articles.append({
                "regulation": reg["name"],
                "article": art["article"],
                "title": art["title"],
                "description": art["description"],
                "key": article_key,
                "covered": article_key in models_by_article,
                "model_count": len(models_by_article.get(article_key, []))
            })

    covered = [a for a in all_articles if a["covered"]]
    uncovered = [a for a in all_articles if not a["covered"]]

    return {
        "regulations": registry.get("regulations", []),
        "models_by_article": models_by_article,
        "calcs_by_model": calcs_by_model,
        "entities_by_calc": entities_by_calc,
        "coverage_summary": {
            "total_articles": len(all_articles),
            "covered": len(covered),
            "uncovered": len(uncovered),
            "coverage_pct": round(len(covered) / max(len(all_articles), 1) * 100, 1),
            "covered_articles": covered,
            "uncovered_articles": uncovered
        }
    }
```

**Step 2:** Add a test for the coverage map. Add to `tests/test_metadata_service.py`:

```python
def test_regulatory_coverage_map(workspace_with_metadata):
    """Test that regulatory coverage map builds correctly."""
    ms = MetadataService(workspace_with_metadata)
    coverage = ms.get_regulatory_coverage_map()
    assert "regulations" in coverage
    assert "models_by_article" in coverage
    assert "calcs_by_model" in coverage
    assert "coverage_summary" in coverage
    summary = coverage["coverage_summary"]
    assert "total_articles" in summary
    assert "covered" in summary
    assert "coverage_pct" in summary
```

**Step 3:** Run tests:

```bash
uv run pytest tests/test_metadata_service.py -v
```

Expected: All pass including the new test.

**Step 4:** Commit:

```bash
git add backend/services/metadata_service.py tests/test_metadata_service.py
git commit -m "feat(phase10): add regulation loading and coverage map to MetadataService (M80)"
```

### Task 80.3: Add regulatory traceability API endpoints

**Files:**
- Modify: `backend/api/metadata.py`
- Create: `tests/test_regulatory_api.py`

**Step 1:** Add new endpoints to `backend/api/metadata.py`. Add after the existing dependency-graph endpoint:

```python
@router.get("/regulatory/registry")
def get_regulation_registry(request: Request):
    """Return the full regulation registry."""
    meta: MetadataService = request.app.state.metadata_service
    return meta.load_regulation_registry()


@router.get("/regulatory/coverage")
def get_regulatory_coverage(request: Request):
    """Return the regulatory coverage analysis map."""
    meta: MetadataService = request.app.state.metadata_service
    return meta.get_regulatory_coverage_map()


@router.get("/regulatory/traceability-graph")
def get_traceability_graph(request: Request):
    """Return a graph structure for the regulatory traceability view.

    Nodes: regulations, articles, detection_models, calculations, entities
    Edges: article→model, model→calculation, calculation→entity
    """
    meta: MetadataService = request.app.state.metadata_service
    coverage = meta.get_regulatory_coverage_map()
    models = meta.list_detection_models()
    calcs = meta.list_calculations()

    nodes = []
    edges = []
    node_ids = set()

    # Regulation nodes
    for reg in coverage.get("regulations", []):
        reg_node_id = f"reg_{reg['id']}"
        if reg_node_id not in node_ids:
            nodes.append({
                "id": reg_node_id,
                "type": "regulation",
                "label": reg["name"],
                "data": {"full_name": reg["full_name"], "jurisdiction": reg["jurisdiction"]}
            })
            node_ids.add(reg_node_id)

        # Article nodes
        for art in reg.get("articles", []):
            art_node_id = f"art_{art['id']}"
            article_key = f"{reg['name']} {art['article']}"
            model_ids = coverage["models_by_article"].get(article_key, [])
            nodes.append({
                "id": art_node_id,
                "type": "article",
                "label": art["article"],
                "data": {
                    "title": art["title"],
                    "description": art["description"],
                    "covered": len(model_ids) > 0,
                    "model_count": len(model_ids)
                }
            })
            node_ids.add(art_node_id)
            edges.append({"source": reg_node_id, "target": art_node_id, "type": "contains"})

            # Edges from articles to models
            for mid in model_ids:
                model_node_id = f"model_{mid}"
                edges.append({"source": art_node_id, "target": model_node_id, "type": "detected_by"})

    # Detection model nodes
    for model in models:
        model_node_id = f"model_{model.model_id}"
        if model_node_id not in node_ids:
            nodes.append({
                "id": model_node_id,
                "type": "detection_model",
                "label": model.name,
                "data": {"model_id": model.model_id, "description": model.description}
            })
            node_ids.add(model_node_id)

        # Edges from models to calculations
        for mc in model.calculations:
            calc_node_id = f"calc_{mc.calc_id}"
            edges.append({"source": model_node_id, "target": calc_node_id, "type": "uses_calc"})

    # Calculation nodes
    for calc in calcs:
        calc_node_id = f"calc_{calc.calc_id}"
        if calc_node_id not in node_ids:
            nodes.append({
                "id": calc_node_id,
                "type": "calculation",
                "label": calc.name,
                "data": {
                    "calc_id": calc.calc_id,
                    "layer": calc.layer.value if hasattr(calc.layer, 'value') else str(calc.layer),
                    "regulatory_tags": calc.regulatory_tags
                }
            })
            node_ids.add(calc_node_id)

    # Deduplicate edges
    seen_edges = set()
    unique_edges = []
    for e in edges:
        key = f"{e['source']}→{e['target']}"
        if key not in seen_edges:
            unique_edges.append(e)
            seen_edges.add(key)

    return {
        "nodes": nodes,
        "edges": unique_edges,
        "summary": coverage["coverage_summary"]
    }
```

**Step 2:** Create test file `tests/test_regulatory_api.py`:

```python
"""Tests for regulatory traceability API endpoints."""
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend import config
from backend.services.metadata_service import MetadataService
from backend.db import DuckDBManager


@pytest.fixture
def reg_workspace(tmp_path):
    """Workspace with metadata + regulations for testing."""
    # Create directory structure
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/calculations/derived",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/detection_models",
        "metadata/regulations",
        "data", "results", "alerts",
    ]:
        (tmp_path / d).mkdir(parents=True, exist_ok=True)

    # Write a minimal regulation registry
    registry = {
        "regulations": [
            {
                "id": "mar",
                "name": "MAR",
                "full_name": "EU Regulation 596/2014",
                "jurisdiction": "EU",
                "articles": [
                    {"id": "mar_12_1_a", "article": "Art. 12(1)(a)", "title": "Wash Trading",
                     "description": "Fictitious transactions", "detection_pattern": "wash_trading"},
                    {"id": "mar_14", "article": "Art. 14", "title": "Insider Dealing",
                     "description": "Inside information", "detection_pattern": "insider_dealing"},
                ]
            }
        ]
    }
    (tmp_path / "metadata" / "regulations" / "registry.json").write_text(json.dumps(registry, indent=2))

    # Write a minimal calculation
    calc = {
        "calc_id": "test_calc",
        "name": "Test Calculation",
        "layer": "transaction",
        "description": "Test",
        "logic": "SELECT 1",
        "depends_on": [],
        "regulatory_tags": ["MAR Art. 12(1)(a)"],
        "value_field": "val"
    }
    (tmp_path / "metadata" / "calculations" / "transaction" / "test_calc.json").write_text(json.dumps(calc, indent=2))

    # Write a minimal detection model
    model = {
        "model_id": "test_model",
        "name": "Test Model",
        "description": "Test detection model",
        "time_window": "business_date",
        "granularity": ["product_id"],
        "calculations": [{"calc_id": "test_calc", "strictness": "MUST_PASS", "value_field": "val"}],
        "score_threshold_setting": "test_threshold",
        "context_fields": ["product_id"],
        "query": "SELECT 1",
        "alert_template": {},
        "regulatory_coverage": [
            {"regulation": "MAR", "article": "Art. 12(1)(a)", "description": "Wash trading"}
        ]
    }
    (tmp_path / "metadata" / "detection_models" / "test_model.json").write_text(json.dumps(model, indent=2))

    return tmp_path


@pytest.fixture
def reg_client(reg_workspace, monkeypatch):
    """TestClient with regulatory workspace."""
    monkeypatch.setattr(config.settings, "workspace_dir", reg_workspace)
    db = DuckDBManager(":memory:")
    meta = MetadataService(reg_workspace)
    app.state.db = db
    app.state.metadata_service = meta
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc
    db.close()


class TestRegulationRegistry:
    def test_get_registry(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/registry")
        assert resp.status_code == 200
        data = resp.json()
        assert "regulations" in data
        assert len(data["regulations"]) == 1
        assert data["regulations"][0]["id"] == "mar"

    def test_registry_has_articles(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/registry")
        articles = resp.json()["regulations"][0]["articles"]
        assert len(articles) == 2
        assert articles[0]["article"] == "Art. 12(1)(a)"


class TestRegulatoryCoverage:
    def test_coverage_endpoint(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/coverage")
        assert resp.status_code == 200
        data = resp.json()
        assert "coverage_summary" in data
        assert "models_by_article" in data
        assert "calcs_by_model" in data

    def test_coverage_summary(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/coverage")
        summary = resp.json()["coverage_summary"]
        assert summary["total_articles"] == 2
        assert summary["covered"] == 1  # Only Art. 12(1)(a) has a model
        assert summary["uncovered"] == 1  # Art. 14 has no model
        assert summary["coverage_pct"] == 50.0

    def test_models_by_article(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/coverage")
        mba = resp.json()["models_by_article"]
        assert "MAR Art. 12(1)(a)" in mba
        assert "test_model" in mba["MAR Art. 12(1)(a)"]


class TestTraceabilityGraph:
    def test_graph_endpoint(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data
        assert "summary" in data

    def test_graph_has_all_node_types(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        nodes = resp.json()["nodes"]
        types = {n["type"] for n in nodes}
        assert "regulation" in types
        assert "article" in types
        assert "detection_model" in types
        assert "calculation" in types

    def test_graph_edges_connect_layers(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        edges = resp.json()["edges"]
        edge_types = {e["type"] for e in edges}
        assert "contains" in edge_types  # regulation → article
        assert "detected_by" in edge_types  # article → model
        assert "uses_calc" in edge_types  # model → calculation

    def test_uncovered_article_flagged(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/traceability-graph")
        nodes = resp.json()["nodes"]
        art_nodes = [n for n in nodes if n["type"] == "article"]
        uncovered = [n for n in art_nodes if not n["data"]["covered"]]
        assert len(uncovered) == 1
        assert uncovered[0]["label"] == "Art. 14"
```

**Step 3:** Run the new tests:

```bash
uv run pytest tests/test_regulatory_api.py -v
```

Expected: All 9 tests pass.

**Step 4:** Run full test suite:

```bash
uv run pytest tests/ -v --ignore=tests/e2e
```

Expected: All backend tests pass.

**Step 5:** Commit:

```bash
git add backend/api/metadata.py tests/test_regulatory_api.py
git commit -m "feat(phase10): add regulatory traceability API endpoints — 9 new tests (M80)"
```

---

## M81: Frontend RegulatoryMap View

### Task 81.1: Add regulatoryStore

**Files:**
- Create: `frontend/src/stores/regulatoryStore.ts`

**Step 1:** Create a Zustand store for regulatory data:

```typescript
import { create } from "zustand";
import { api } from "../api/client.ts";

export interface RegulationArticle {
  id: string;
  article: string;
  title: string;
  description: string;
  detection_pattern: string;
}

export interface Regulation {
  id: string;
  name: string;
  full_name: string;
  jurisdiction: string;
  articles: RegulationArticle[];
}

export interface CoverageSummary {
  total_articles: number;
  covered: number;
  uncovered: number;
  coverage_pct: number;
  covered_articles: Array<{
    regulation: string;
    article: string;
    title: string;
    key: string;
    covered: boolean;
    model_count: number;
  }>;
  uncovered_articles: Array<{
    regulation: string;
    article: string;
    title: string;
    key: string;
    covered: boolean;
  }>;
}

export interface TraceabilityNode {
  id: string;
  type: "regulation" | "article" | "detection_model" | "calculation";
  label: string;
  data: Record<string, unknown>;
}

export interface TraceabilityEdge {
  source: string;
  target: string;
  type: "contains" | "detected_by" | "uses_calc";
}

interface RegulatoryState {
  regulations: Regulation[];
  coverage: CoverageSummary | null;
  graphNodes: TraceabilityNode[];
  graphEdges: TraceabilityEdge[];
  loading: boolean;
  error: string | null;
  fetchRegistry: () => Promise<void>;
  fetchCoverage: () => Promise<void>;
  fetchTraceabilityGraph: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useRegulatoryStore = create<RegulatoryState>((set) => ({
  regulations: [],
  coverage: null,
  graphNodes: [],
  graphEdges: [],
  loading: false,
  error: null,

  fetchRegistry: async () => {
    try {
      const data = await api.get("/metadata/regulatory/registry");
      set({ regulations: data.regulations ?? [] });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchCoverage: async () => {
    try {
      const data = await api.get("/metadata/regulatory/coverage");
      set({ coverage: data.coverage_summary ?? null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchTraceabilityGraph: async () => {
    try {
      const data = await api.get("/metadata/regulatory/traceability-graph");
      set({
        graphNodes: data.nodes ?? [],
        graphEdges: data.edges ?? [],
        coverage: data.summary ?? null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [registryData, graphData] = await Promise.all([
        api.get("/metadata/regulatory/registry"),
        api.get("/metadata/regulatory/traceability-graph"),
      ]);
      set({
        regulations: registryData.regulations ?? [],
        graphNodes: graphData.nodes ?? [],
        graphEdges: graphData.edges ?? [],
        coverage: graphData.summary ?? null,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
```

**Step 2:** Build:

```bash
cd frontend && npm run build
```

Expected: Clean build.

**Step 3:** Commit:

```bash
git add frontend/src/stores/regulatoryStore.ts
git commit -m "feat(phase10): add regulatoryStore for traceability data (M81)"
```

### Task 81.2: Create RegulatoryMap view with React Flow

**Files:**
- Create: `frontend/src/views/RegulatoryMap/index.tsx`

**Step 1:** Create the RegulatoryMap view. This is the main view with:
- Top: Coverage summary cards (total articles, covered %, uncovered count)
- Center: React Flow interactive graph with 4 node types (regulation, article, model, calculation)
- Right sidebar: Detail panel when a node is selected
- Color coding: green=covered, red=uncovered, blue=regulation, orange=model, purple=calculation

```typescript
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Position,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import {
  useRegulatoryStore,
  type TraceabilityNode,
  type TraceabilityEdge,
} from "../../stores/regulatoryStore.ts";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

// Color mapping by node type
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  regulation: { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd" },
  article: { bg: "#1a3328", border: "#22c55e", text: "#86efac" },
  detection_model: { bg: "#3b2510", border: "#f97316", text: "#fdba74" },
  calculation: { bg: "#2d1b4e", border: "#a855f7", text: "#d8b4fe" },
};

// Uncovered article gets red
const UNCOVERED_COLORS = { bg: "#3b1010", border: "#ef4444", text: "#fca5a5" };

function buildDagreLayout(
  apiNodes: TraceabilityNode[],
  apiEdges: TraceabilityEdge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 120 });

  apiNodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  apiEdges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  const nodes: Node[] = apiNodes.map((n) => {
    const pos = g.node(n.id);
    const isUncovered = n.type === "article" && !n.data?.covered;
    const colors = isUncovered ? UNCOVERED_COLORS : NODE_COLORS[n.type] ?? NODE_COLORS.calculation;
    return {
      id: n.id,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        label: n.label,
        ...n.data,
        nodeType: n.type,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: colors.text,
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "12px",
        fontWeight: 500,
        width: NODE_WIDTH,
        textAlign: "center" as const,
      },
    };
  });

  const edges: Edge[] = apiEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: e.type === "detected_by",
    style: {
      stroke:
        e.type === "contains"
          ? "#3b82f6"
          : e.type === "detected_by"
            ? "#22c55e"
            : "#a855f7",
      strokeWidth: 1.5,
    },
  }));

  return { nodes, edges };
}

function CoverageCards({ coverage }: { coverage: { total_articles: number; covered: number; uncovered: number; coverage_pct: number } | null }) {
  if (!coverage) return null;
  return (
    <div className="flex gap-3 mb-3" data-tour="regulatory-cards">
      <div className="flex-1 rounded-lg border border-border bg-surface p-3">
        <div className="text-xs text-muted">Total Requirements</div>
        <div className="text-2xl font-bold text-foreground">{coverage.total_articles}</div>
      </div>
      <div className="flex-1 rounded-lg border border-border bg-surface p-3">
        <div className="text-xs text-muted">Covered</div>
        <div className="text-2xl font-bold text-green-400">{coverage.covered}</div>
      </div>
      <div className="flex-1 rounded-lg border border-border bg-surface p-3">
        <div className="text-xs text-muted">Uncovered</div>
        <div className="text-2xl font-bold text-red-400">{coverage.uncovered}</div>
      </div>
      <div className="flex-1 rounded-lg border border-border bg-surface p-3">
        <div className="text-xs text-muted">Coverage</div>
        <div className="text-2xl font-bold text-accent">{coverage.coverage_pct}%</div>
      </div>
    </div>
  );
}

function NodeDetail({ node }: { node: TraceabilityNode | null }) {
  if (!node) {
    return (
      <div className="text-xs text-muted p-4">Click a node to see details</div>
    );
  }

  const colors = NODE_COLORS[node.type] ?? NODE_COLORS.calculation;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
        >
          {node.type.replace("_", " ")}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{node.label}</h3>
      {node.data && (
        <div className="space-y-1.5">
          {Object.entries(node.data).map(([key, value]) => {
            if (key === "nodeType") return null;
            return (
              <div key={key} className="text-xs">
                <span className="text-muted">{key.replace(/_/g, " ")}:</span>{" "}
                <span className="text-foreground">
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RegulatoryMap() {
  const { graphNodes, graphEdges, coverage, loading, fetchAll } = useRegulatoryStore();
  const [selectedNode, setSelectedNode] = useState<TraceabilityNode | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildDagreLayout(graphNodes, graphEdges),
    [graphNodes, graphEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const apiNode = graphNodes.find((n) => n.id === node.id) ?? null;
      setSelectedNode(apiNode);
    },
    [graphNodes]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <h2 className="text-lg font-semibold">Regulatory Traceability</h2>
      <CoverageCards coverage={coverage} />

      <div className="flex gap-3 flex-1 min-h-0">
        <Panel title="Traceability Graph" className="flex-[3] min-w-0" noPadding dataTour="regulatory-graph">
          <div className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              minZoom={0.3}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  const type = n.data?.nodeType as string;
                  return NODE_COLORS[type]?.border ?? "#666";
                }}
              />
            </ReactFlow>
          </div>
        </Panel>

        <Panel title="Details" className="w-72 shrink-0 overflow-auto" dataTour="regulatory-detail">
          <NodeDetail node={selectedNode} />

          {/* Legend */}
          <div className="mt-6 pt-3 border-t border-border">
            <div className="text-[10px] text-muted uppercase font-semibold mb-2">Legend</div>
            <div className="space-y-1.5">
              {Object.entries(NODE_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: colors.border }}
                  />
                  <span className="text-foreground capitalize">{type.replace("_", " ")}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ background: UNCOVERED_COLORS.border }} />
                <span className="text-foreground">Uncovered (gap)</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
```

**Step 2:** Build:

```bash
cd frontend && npm run build
```

Expected: Clean build.

**Step 3:** Commit:

```bash
git add frontend/src/views/RegulatoryMap/index.tsx
git commit -m "feat(phase10): add RegulatoryMap view with React Flow traceability graph (M81)"
```

### Task 81.3: Add route and sidebar entry

**Files:**
- Modify: `frontend/src/routes.tsx`
- Modify: `frontend/src/layouts/Sidebar.tsx`

**Step 1:** Add the route. In `frontend/src/routes.tsx`, add a lazy import and route:

```typescript
const RegulatoryMap = lazy(() => import("./views/RegulatoryMap/index.tsx"));
```

Add the route element inside the AppLayout children, after the `editor` route:

```typescript
{ path: "regulatory", element: <RegulatoryMap /> },
```

**Step 2:** Add the sidebar entry. In `frontend/src/layouts/Sidebar.tsx`, add a new "Governance" nav group after "Compose":

```typescript
{
  label: "Governance",
  items: [
    { label: "Regulatory Map", path: "/regulatory", icon: "shield" },
  ],
}
```

Use the existing pattern for icons — check what icon set the sidebar uses and pick an appropriate one. If using simple text/emoji icons, use a shield or scale icon. If using SVG icons, reuse the pattern from existing items.

**Step 3:** Build:

```bash
cd frontend && npm run build
```

Expected: Clean build, no errors.

**Step 4:** Commit:

```bash
git add frontend/src/routes.tsx frontend/src/layouts/Sidebar.tsx
git commit -m "feat(phase10): add RegulatoryMap route and Governance sidebar group (M81)"
```

---

## M82: Coverage Analysis & Suggestion Engine

### Task 82.1: Add suggestion service

**Files:**
- Create: `backend/services/suggestion_service.py`

**Step 1:** Create the suggestion service that analyzes coverage gaps and suggests improvements:

```python
"""Suggestion service for regulatory coverage analysis."""
from __future__ import annotations

from backend.services.metadata_service import MetadataService


class SuggestionService:
    """Analyzes regulatory coverage and suggests improvements."""

    def __init__(self, metadata_service: MetadataService):
        self.meta = metadata_service

    def analyze_gaps(self) -> dict:
        """Analyze regulatory coverage gaps and return suggestions.

        Returns:
            {
                "gaps": [{"regulation": str, "article": str, "title": str, "suggestion": str}],
                "improvements": [{"model_id": str, "suggestion": str, "impact": str}],
                "unused_calcs": [{"calc_id": str, "name": str, "regulatory_tags": [...]}],
                "summary": {"gap_count": int, "improvement_count": int}
            }
        """
        coverage = self.meta.get_regulatory_coverage_map()
        models = self.meta.list_detection_models()
        calcs = self.meta.list_calculations()

        gaps = []
        improvements = []

        # 1. Find uncovered regulatory articles
        for article in coverage["coverage_summary"].get("uncovered_articles", []):
            suggestion = self._suggest_for_article(article, calcs, models)
            gaps.append({
                "regulation": article["regulation"],
                "article": article["article"],
                "title": article["title"],
                "description": article.get("description", ""),
                "suggestion": suggestion,
            })

        # 2. Find models with few calculations (could be strengthened)
        for model in models:
            if len(model.calculations) < 2:
                relevant_calcs = self._find_relevant_calcs(model, calcs)
                if relevant_calcs:
                    improvements.append({
                        "model_id": model.model_id,
                        "model_name": model.name,
                        "current_calc_count": len(model.calculations),
                        "suggestion": f"Consider adding calculations: {', '.join(c.name for c in relevant_calcs)}",
                        "suggested_calcs": [c.calc_id for c in relevant_calcs],
                        "impact": "Improved detection precision with additional signal dimensions",
                    })

        # 3. Find calculations not used by any model
        used_calc_ids = set()
        for model in models:
            for mc in model.calculations:
                used_calc_ids.add(mc.calc_id)

        unused = []
        for calc in calcs:
            if calc.calc_id not in used_calc_ids:
                unused.append({
                    "calc_id": calc.calc_id,
                    "name": calc.name,
                    "layer": calc.layer.value if hasattr(calc.layer, "value") else str(calc.layer),
                    "regulatory_tags": calc.regulatory_tags,
                })

        return {
            "gaps": gaps,
            "improvements": improvements,
            "unused_calcs": unused,
            "summary": {
                "gap_count": len(gaps),
                "improvement_count": len(improvements),
                "unused_calc_count": len(unused),
                "total_suggestions": len(gaps) + len(improvements),
            },
        }

    def _suggest_for_article(self, article: dict, calcs: list, models: list) -> str:
        """Generate a suggestion for covering an uncovered article."""
        article_key = f"{article['regulation']} {article['article']}"
        title = article.get("title", "")

        # Check if any existing calculations have tags matching this article
        matching_calcs = [c for c in calcs if article_key in c.regulatory_tags]
        if matching_calcs:
            calc_names = ", ".join(c.name for c in matching_calcs)
            return (
                f"Existing calculations ({calc_names}) have regulatory tags for {article_key}. "
                f"Create a new detection model using these calculations to cover {title}."
            )

        return (
            f"No existing calculations tagged for {article_key} ({title}). "
            f"Define new calculations targeting this regulation, then create a detection model."
        )

    def _find_relevant_calcs(self, model, calcs: list) -> list:
        """Find calculations that could strengthen a model based on shared regulatory tags."""
        model_tags = set()
        for rc in model.regulatory_coverage:
            model_tags.add(f"{rc.regulation} {rc.article}")

        current_calc_ids = {mc.calc_id for mc in model.calculations}
        relevant = []
        for calc in calcs:
            if calc.calc_id in current_calc_ids:
                continue
            # Check tag overlap
            if any(tag in model_tags for tag in calc.regulatory_tags):
                relevant.append(calc)

        return relevant
```

**Step 2:** Commit:

```bash
git add backend/services/suggestion_service.py
git commit -m "feat(phase10): add SuggestionService for coverage gap analysis (M82)"
```

### Task 82.2: Add suggestion API endpoint

**Files:**
- Modify: `backend/api/metadata.py`
- Modify: `tests/test_regulatory_api.py`

**Step 1:** Add the suggestion endpoint to `backend/api/metadata.py`:

```python
@router.get("/regulatory/suggestions")
def get_regulatory_suggestions(request: Request):
    """Analyze regulatory coverage and return improvement suggestions."""
    from backend.services.suggestion_service import SuggestionService
    meta: MetadataService = request.app.state.metadata_service
    svc = SuggestionService(meta)
    return svc.analyze_gaps()
```

**Step 2:** Add tests to `tests/test_regulatory_api.py`:

```python
class TestSuggestions:
    def test_suggestions_endpoint(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        assert resp.status_code == 200
        data = resp.json()
        assert "gaps" in data
        assert "improvements" in data
        assert "unused_calcs" in data
        assert "summary" in data

    def test_uncovered_article_appears_as_gap(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        gaps = resp.json()["gaps"]
        # Art. 14 (Insider Dealing) is uncovered in our test fixture
        assert any(g["article"] == "Art. 14" for g in gaps)

    def test_gap_has_suggestion_text(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        gaps = resp.json()["gaps"]
        for gap in gaps:
            assert "suggestion" in gap
            assert len(gap["suggestion"]) > 10  # Non-trivial suggestion

    def test_summary_counts(self, reg_client):
        resp = reg_client.get("/api/metadata/regulatory/suggestions")
        summary = resp.json()["summary"]
        assert summary["gap_count"] == 1  # One uncovered article
        assert isinstance(summary["total_suggestions"], int)
```

**Step 3:** Run tests:

```bash
uv run pytest tests/test_regulatory_api.py -v
```

Expected: All 13 tests pass (9 previous + 4 new).

**Step 4:** Commit:

```bash
git add backend/api/metadata.py tests/test_regulatory_api.py
git commit -m "feat(phase10): add regulatory suggestions endpoint — 4 new tests (M82)"
```

### Task 82.3: Add suggestion panel to RegulatoryMap view

**Files:**
- Modify: `frontend/src/views/RegulatoryMap/index.tsx`
- Modify: `frontend/src/stores/regulatoryStore.ts`

**Step 1:** Add suggestions to the regulatory store. In `frontend/src/stores/regulatoryStore.ts`, add types and a fetch method:

```typescript
export interface Gap {
  regulation: string;
  article: string;
  title: string;
  description: string;
  suggestion: string;
}

export interface Improvement {
  model_id: string;
  model_name: string;
  current_calc_count: number;
  suggestion: string;
  suggested_calcs: string[];
  impact: string;
}

export interface SuggestionData {
  gaps: Gap[];
  improvements: Improvement[];
  unused_calcs: Array<{ calc_id: string; name: string; layer: string; regulatory_tags: string[] }>;
  summary: { gap_count: number; improvement_count: number; unused_calc_count: number; total_suggestions: number };
}
```

Add to the state interface:

```typescript
  suggestions: SuggestionData | null;
  fetchSuggestions: () => Promise<void>;
```

Add to the store defaults:

```typescript
  suggestions: null,
```

Add the fetch method:

```typescript
  fetchSuggestions: async () => {
    try {
      const data = await api.get("/metadata/regulatory/suggestions");
      set({ suggestions: data });
    } catch (e) {
      set({ error: String(e) });
    }
  },
```

Update `fetchAll` to also fetch suggestions:

```typescript
  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [registryData, graphData, suggestionsData] = await Promise.all([
        api.get("/metadata/regulatory/registry"),
        api.get("/metadata/regulatory/traceability-graph"),
        api.get("/metadata/regulatory/suggestions"),
      ]);
      set({
        regulations: registryData.regulations ?? [],
        graphNodes: graphData.nodes ?? [],
        graphEdges: graphData.edges ?? [],
        coverage: graphData.summary ?? null,
        suggestions: suggestionsData ?? null,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
```

**Step 2:** Add a collapsible suggestions panel at the bottom of `RegulatoryMap/index.tsx`. Add a `SuggestionsPanel` component and render it below the graph:

```typescript
function SuggestionsPanel({ suggestions }: { suggestions: SuggestionData | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!suggestions || suggestions.summary.total_suggestions === 0) return null;

  return (
    <Panel title="" className="mt-0" dataTour="regulatory-suggestions">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-foreground"
      >
        <span>
          Suggestions ({suggestions.summary.total_suggestions})
          {suggestions.summary.gap_count > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">
              {suggestions.summary.gap_count} gaps
            </span>
          )}
          {suggestions.summary.improvement_count > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">
              {suggestions.summary.improvement_count} improvements
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {suggestions.gaps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-400 uppercase mb-1.5">Coverage Gaps</h4>
              {suggestions.gaps.map((gap, i) => (
                <div key={i} className="p-2 rounded border border-red-500/20 bg-red-500/5 mb-1.5">
                  <div className="text-xs font-medium text-foreground">
                    {gap.regulation} {gap.article} — {gap.title}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">{gap.suggestion}</div>
                </div>
              ))}
            </div>
          )}
          {suggestions.improvements.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-400 uppercase mb-1.5">Model Improvements</h4>
              {suggestions.improvements.map((imp, i) => (
                <div key={i} className="p-2 rounded border border-amber-500/20 bg-amber-500/5 mb-1.5">
                  <div className="text-xs font-medium text-foreground">{imp.model_name}</div>
                  <div className="text-[11px] text-muted mt-0.5">{imp.suggestion}</div>
                  <div className="text-[10px] text-muted mt-0.5 italic">{imp.impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
```

Then in the main component JSX, add after the graph/detail flex container and before the closing `</div>`:

```tsx
<SuggestionsPanel suggestions={suggestions} />
```

Make sure to destructure `suggestions` from the store alongside the other fields.

**Step 3:** Build:

```bash
cd frontend && npm run build
```

Expected: Clean build.

**Step 4:** Commit:

```bash
git add frontend/src/stores/regulatoryStore.ts frontend/src/views/RegulatoryMap/index.tsx
git commit -m "feat(phase10): add suggestions panel to RegulatoryMap view (M82)"
```

---

## M83: E2E Tests, Tours & Documentation

### Task 83.1: Add E2E tests for RegulatoryMap

**Files:**
- Modify: `tests/e2e/test_e2e_views.py`

**Step 1:** Add `/regulatory` to the `NAV_ROUTES` list and the no-console-errors route list.

**Step 2:** Add a new test class:

```python
class TestRegulatoryMap:
    """Tests for the Regulatory Map view."""

    def test_regulatory_map_loads(self, loaded_page):
        """RegulatoryMap loads with coverage cards."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "regulatory traceability" in body.lower()

    def test_coverage_cards_visible(self, loaded_page):
        """Coverage summary cards are visible."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "total requirements" in body.lower()
        assert "covered" in body.lower()

    def test_graph_renders(self, loaded_page):
        """React Flow graph container renders."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # React Flow renders its container
        graph = loaded_page.locator(".react-flow")
        assert graph.is_visible(timeout=10000)

    def test_suggestions_section(self, loaded_page):
        """Suggestions section appears."""
        loaded_page.goto(f"{APP_URL}/regulatory")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        body = loaded_page.locator("main").inner_text()
        assert "suggestions" in body.lower()
```

**Step 3:** Run E2E tests (kill any running server on 8000 first):

```bash
lsof -ti:8000 | xargs kill 2>/dev/null; sleep 1
uv run pytest tests/e2e/test_e2e_views.py -v -k "TestRegulatoryMap"
```

Expected: All 4 new tests pass.

**Step 4:** Commit:

```bash
git add tests/e2e/test_e2e_views.py
git commit -m "test(phase10): add E2E tests for RegulatoryMap — 4 new tests (M83)"
```

### Task 83.2: Add guided tour for RegulatoryMap

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts`
- Modify: `frontend/src/views/RegulatoryMap/index.tsx` (data-tour attributes already added in Task 81.2)

**Step 1:** Add the `regulatory` tour to `tourDefinitions.ts`:

```typescript
regulatory: {
  id: "regulatory",
  name: "Regulatory Traceability Tour",
  description: "Explore the regulatory coverage map and gap analysis.",
  steps: [
    {
      target: "[data-tour='regulatory-cards']",
      title: "Coverage Summary",
      content: "At a glance: how many regulatory requirements are covered by detection models, and how many have gaps.",
      placement: "bottom",
      route: "/regulatory",
    },
    {
      target: "[data-tour='regulatory-graph']",
      title: "Traceability Graph",
      content: "Interactive graph showing the full chain: Regulations → Articles → Detection Models → Calculations. Red nodes indicate coverage gaps.",
      placement: "bottom",
    },
    {
      target: "[data-tour='regulatory-detail']",
      title: "Node Details",
      content: "Click any node in the graph to see its details — regulation info, model parameters, or calculation metadata.",
      placement: "left",
    },
    {
      target: "[data-tour='regulatory-suggestions']",
      title: "Suggestions & Gap Analysis",
      content: "Automated suggestions for improving regulatory coverage — coverage gaps that need new models, and existing models that could be strengthened.",
      placement: "top",
    },
  ],
},
```

**Step 2:** Build:

```bash
cd frontend && npm run build
```

Expected: Clean build.

**Step 3:** Commit:

```bash
git add frontend/src/data/tourDefinitions.ts
git commit -m "feat(phase10): add guided tour for RegulatoryMap view (M83)"
```

### Task 83.3: Update demo guide

**Files:**
- Modify: `docs/demo-guide.md`

**Step 1:** Add a new section after the "Metadata Editor" section and before "Act 2: Model Composition":

```markdown
## Regulatory Traceability (Governance → Regulatory Map) — Phase 10

The Regulatory Map provides end-to-end traceability from regulatory requirements to detection logic.

### Key Points
- **Coverage Summary Cards**: Total requirements, covered count, uncovered count, coverage percentage
- **Interactive Traceability Graph**: React Flow visualization showing Regulations → Articles → Detection Models → Calculations
  - Blue nodes = Regulations (MAR, MiFID II, Dodd-Frank, FINRA)
  - Green nodes = Covered regulatory articles
  - Red nodes = Uncovered regulatory articles (gaps)
  - Orange nodes = Detection models
  - Purple nodes = Calculations
- **Node Detail Panel**: Click any node to see full metadata — regulation descriptions, model parameters, calculation tags
- **Suggestions Panel**: Automated gap analysis with actionable recommendations

### Interactive: Explore the Traceability Chain
1. Navigate to **Governance → Regulatory Map**
2. See 4 coverage summary cards at the top
3. In the graph, find a **red node** — this is an uncovered regulatory requirement
4. Click the red node to see why it's uncovered
5. Trace from a **blue regulation node** → green articles → orange models → purple calculations
6. Expand the **Suggestions** panel at the bottom
7. Key takeaway: "Every detection model is traceable to the regulations it covers"

### Interactive: Review Coverage Gaps
1. Expand the **Suggestions** panel
2. See **Coverage Gaps** (red) — regulatory articles without detection models
3. See **Model Improvements** (amber) — models that could be strengthened with additional calculations
4. Key takeaway: "The system identifies exactly where regulatory coverage is weak and suggests improvements"
```

**Step 2:** Commit:

```bash
git add docs/demo-guide.md
git commit -m "docs(phase10): add RegulatoryMap section to demo guide (M83)"
```

### Task 83.4: Update progress tracker

**Files:**
- Modify: `docs/progress.md`

**Step 1:** Add Phase 10 row to the Overall Status table:

```markdown
| Regulatory Traceability (Phase 10) | COMPLETE | M79-M83: Regulatory tags, traceability graph, coverage analysis, suggestions — N tests |
```

**Step 2:** Add M79-M83 rows to the Milestone Progress table:

```markdown
| M79 | Regulatory Tags on Backend Models | COMPLETE | 6 | 6 | regulatory_tags on calcs, regulatory_coverage on models, TS types, snapshot regen |
| M80 | Regulatory Traceability API | COMPLETE | 3 | 3 | Regulation registry, coverage map, traceability graph endpoint — 9 tests |
| M81 | Frontend RegulatoryMap View | COMPLETE | 3 | 3 | React Flow graph, regulatoryStore, route + sidebar entry |
| M82 | Coverage Analysis & Suggestions | COMPLETE | 3 | 3 | SuggestionService, API endpoint, frontend suggestions panel — 4 tests |
| M83 | E2E Tests, Tours & Documentation | COMPLETE | 4 | 4 | 4 E2E tests, guided tour, demo guide, progress tracker |
```

**Step 3:** Add a "What Was Done" section for Phase 10.

**Step 4:** Run full test suite to get final test count:

```bash
uv run pytest tests/ -v --ignore=tests/e2e
```

Update the test count in the progress tracker.

**Step 5:** Commit:

```bash
git add docs/progress.md
git commit -m "docs(phase10): update progress tracker for Phase 10 completion (M83)"
```

---

## File Inventory

### New Files (4)
| File | Milestone |
|------|-----------|
| `workspace/metadata/regulations/registry.json` | M80 |
| `backend/services/suggestion_service.py` | M82 |
| `frontend/src/stores/regulatoryStore.ts` | M81 |
| `frontend/src/views/RegulatoryMap/index.tsx` | M81 |

### Modified Files (12)
| File | Milestone |
|------|-----------|
| `backend/models/calculations.py` | M79 |
| `backend/models/detection.py` | M79 |
| `backend/services/metadata_service.py` | M80 |
| `backend/api/metadata.py` | M80, M82 |
| `frontend/src/stores/metadataStore.ts` | M79 |
| `frontend/src/routes.tsx` | M81 |
| `frontend/src/layouts/Sidebar.tsx` | M81 |
| `frontend/src/data/tourDefinitions.ts` | M83 |
| `tests/e2e/test_e2e_views.py` | M83 |
| `docs/demo-guide.md` | M83 |
| `docs/progress.md` | M83 |
| `workspace/snapshots/*` | M79 (regenerated) |

### New Test Files (1)
| File | Tests | Milestone |
|------|-------|-----------|
| `tests/test_regulatory_api.py` | 13 | M80, M82 |

### NOT Modified
- All existing plan files in `docs/plans/` — untouched
- All existing views — untouched
- All existing detection model SQL — untouched

---

## Key Patterns Reused

| Pattern | Source File | Used In |
|---------|------------|---------|
| React Flow + dagre DAG layout | `AlertDetail/CalculationTrace.tsx` | RegulatoryMap graph |
| Zustand store with async fetch | `regulatoryStore.ts` pattern from `metadataStore.ts` | regulatoryStore |
| Panel component with dataTour | `components/Panel.tsx` | RegulatoryMap layout |
| API test fixture pattern | `tests/test_metadata_crud_api.py` | test_regulatory_api.py |
| MetadataService CRUD methods | `services/metadata_service.py` | regulation loading + coverage map |
| Tour definitions | `data/tourDefinitions.ts` | regulatory tour |
| Coverage summary cards | `views/Dashboard/index.tsx` SummaryCard pattern | CoverageCards |
| Sidebar navigation groups | `layouts/Sidebar.tsx` | "Governance" group |

---

## Verification

After all milestones:
1. `uv run pytest tests/ -v --ignore=tests/e2e` — all backend tests pass (previous + 13 new)
2. `cd frontend && npm run build` — clean build, no TS errors
3. `uv run pytest tests/e2e/test_e2e_views.py -v` — all E2E tests pass (previous + 4 new)
4. Manual smoke test: Navigate to Regulatory Map → see coverage cards + graph
5. Manual smoke test: Click nodes in graph → detail panel updates
6. Manual smoke test: Expand suggestions → see gaps and improvements
7. Manual smoke test: Tour button → guided tour for regulatory view works
8. Manual smoke test: Existing views still work (entities, models, alerts, dashboard)
9. Verify regulation registry loads: all 4 regulations, 9 articles
10. Verify detection model JSONs have regulatory_coverage populated
11. Verify calculation JSONs have regulatory_tags populated
