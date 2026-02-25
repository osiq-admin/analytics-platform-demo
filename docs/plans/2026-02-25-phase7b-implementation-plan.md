# Phase 7B: Metadata UX, Guided Demo & Use Case Studio — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Phase 7 gaps, add domain value suggestions across all forms, reusable match pattern and score template libraries, a visual score step builder, an enhanced model composer wizard with live preview/validation/explainability, a Use Case Studio with AI-assisted calculation building and submission review, and a 25-scenario guided tour system.

**Architecture:** Backend adds new API routers (domain_values, match_patterns, score_templates, use_cases, submissions) + services (validation, recommendation, ai_context_builder). Frontend adds reusable components (SuggestionInput, MatchPatternPicker, ScoreStepBuilder, ValidationPanel, TourEngine) and upgrades all metadata forms. Three-layer safety: OOB (immutable) → User (validated) → Use Case (isolated).

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript + Vite (frontend), Zustand stores, AG Grid, Monaco Editor, React Flow, Tailwind CSS 4.

**Design doc:** `docs/plans/2026-02-25-phase7-completion-metadata-ux-design.md`

---

## Plan Structure

This plan is organized into 7 workstreams executed sequentially (some with parallel sub-tasks):

1. **WS1: Gap Fixes (M93-M94)** — Foundation: $param migration, date range fix, settings overrides
2. **WS2: Backend APIs (M95-M96)** — Domain values, match patterns, score templates APIs
3. **WS3: Core Frontend Components (M97-M99)** — SuggestionInput, MatchPatternPicker, ScoreStepBuilder
4. **WS4: Form Upgrades (M100-M104)** — Settings Manager, Model Composer wizard, preview/validation
5. **WS5: Backend Services (M105-M107)** — Validation engine, use cases, submissions, recommendations
6. **WS6: Advanced Frontend (M108-M112)** — Use Case Studio, Submissions, AI calc builder, version mgmt
7. **WS7: Tour System (M113-M120)** — Tour engine, 25 scenarios, operation scripts, testing, docs

---

## WS1: Gap Fixes (M93-M94)

### Task M93: Migrate Calculation SQL to $param Placeholders

**Files:**
- Modify: `workspace/metadata/calculations/time_windows/business_date_window.json`
- Modify: `workspace/metadata/calculations/time_windows/cancellation_pattern.json`
- Modify: `workspace/metadata/calculations/time_windows/trend_window.json`
- Modify: `workspace/metadata/calculations/time_windows/market_event_window.json`
- Modify: `workspace/metadata/calculations/aggregations/vwap_calc.json`
- Modify: `workspace/metadata/calculations/derived/large_trading_activity.json`
- Modify: `workspace/metadata/calculations/derived/wash_detection.json`
- Modify: `workspace/metadata/calculations/aggregations/trading_activity_aggregation.json`
- Modify: `workspace/metadata/calculations/transaction/value_calc.json`
- Modify: `workspace/metadata/calculations/transaction/adjusted_direction.json`
- Test: `tests/test_param_migration.py`
- Test: `tests/test_calculation_engine.py`
- Test: `tests/test_detection_engine.py`

**Step 1: Capture baseline alert output**

Run the full pipeline and save alert results for regression comparison:

```bash
uv run python -c "
from backend.db import get_db
from backend.services.data_loader import DataLoader
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.detection_engine import DetectionEngine
from backend.services.metadata_service import MetadataService
from backend.services.settings_resolver import SettingsResolver
import json, pathlib

db = get_db()
ms = MetadataService()
dl = DataLoader(db, ms)
dl.load_all()
ce = CalculationEngine(db, ms)
ce.run_all()
sr = SettingsResolver(ms)
de = DetectionEngine(db, ms, sr)
results = de.run_all()
pathlib.Path('/tmp/baseline_alerts.json').write_text(json.dumps(results, default=str, indent=2))
print(f'Baseline: {sum(len(r.get(\"alerts\", [])) for r in results.values())} alerts')
"
```

**Step 2: Migrate `business_date_window.json`**

Current SQL contains hardcoded `'17:00:00'`. Replace with `$cutoff_time` and add structured parameter:

In `workspace/metadata/calculations/time_windows/business_date_window.json`:

Change in `logic` field:
- Replace: `execution_time > '17:00:00'`
- With: `execution_time > '$cutoff_time'`

Change `parameters` to:
```json
"parameters": {
  "cutoff_time": {
    "source": "setting",
    "setting_id": "business_date_cutoff",
    "default": "17:00:00"
  }
}
```

**Step 3: Migrate `cancellation_pattern.json`**

Current SQL contains hardcoded `>= 3`. Replace with `$cancel_threshold`:

In `logic` field:
- Replace: `HAVING COUNT(*) >= 3`
- With: `HAVING COUNT(*) >= $cancel_threshold`

Change `parameters` to:
```json
"parameters": {
  "cancel_threshold": {
    "source": "setting",
    "setting_id": "cancel_count_threshold",
    "default": 3
  }
}
```

**Step 4: Migrate `trend_window.json`**

Current SQL contains hardcoded `* 1.5` (twice). Replace with `$trend_multiplier`:

In `logic` field:
- Replace: `price_stddev * 1.5` (both occurrences)
- With: `price_stddev * $trend_multiplier`

Change `parameters` to:
```json
"parameters": {
  "trend_multiplier": {
    "source": "setting",
    "setting_id": "trend_sensitivity",
    "default": 1.5
  }
}
```

**Step 5: Migrate `market_event_window.json`**

Current SQL contains hardcoded `1.05`, `0.95`, `* 3`, `5 DAY`, `2 DAY`. Replace key ones:

In `logic` field:
- Replace: `prev_close * 1.05` → `prev_close * (1 + $price_change_threshold)`
- Replace: `prev_close * 0.95` → `prev_close * (1 - $price_change_threshold)`
- Replace: `prev_volume * 3` → `prev_volume * $volume_spike_multiplier`
- Replace: `INTERVAL 5 DAY` → `INTERVAL $lookback_days DAY`
- Replace: `INTERVAL 2 DAY` → `INTERVAL $lookforward_days DAY`

Change `parameters` to:
```json
"parameters": {
  "price_change_threshold": {
    "source": "literal",
    "value": 0.05
  },
  "volume_spike_multiplier": {
    "source": "literal",
    "value": 3
  },
  "lookback_days": {
    "source": "setting",
    "setting_id": "insider_lookback_days",
    "default": 5
  },
  "lookforward_days": {
    "source": "literal",
    "value": 2
  }
}
```

**Step 6: Migrate `large_trading_activity.json`**

Current SQL contains hardcoded `* 2.0`. Replace with `$activity_multiplier`:

In `logic` field:
- Replace: `* 2.0` (both occurrences)
- With: `* $activity_multiplier`

Change `parameters` to:
```json
"parameters": {
  "activity_multiplier": {
    "source": "setting",
    "setting_id": "large_activity_multiplier",
    "default": 2.0
  }
}
```

**Step 7: Migrate `wash_detection.json`**

Current SQL contains hardcoded `> 0.5` and `< 0.02`. Replace:

In `logic` field:
- Replace: `> 0.5` (the qty match ratio check)
- With: `> $qty_threshold`
- Replace: `< 0.02` (the vwap proximity check)
- With: `< $vwap_threshold`

Change `parameters` to:
```json
"parameters": {
  "qty_threshold": {
    "source": "literal",
    "value": 0.5
  },
  "vwap_threshold": {
    "source": "setting",
    "setting_id": "wash_vwap_threshold",
    "default": 0.02
  }
}
```

**Step 8: Audit remaining 3 calculations**

Read `trading_activity_aggregation.json`, `value_calc.json`, `adjusted_direction.json`. These are pure aggregation/transformation calculations with no threshold values — confirm they need no migration. If any hardcoded values are found, parameterize them.

**Step 9: Write regression test**

Create `tests/test_param_migration.py`:

```python
"""Verify that $param migration produces identical detection results."""
import json
import pytest
from pathlib import Path

from backend.db import get_db
from backend.services.data_loader import DataLoader
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.detection_engine import DetectionEngine
from backend.services.metadata_service import MetadataService
from backend.services.settings_resolver import SettingsResolver


@pytest.fixture(scope="module")
def pipeline_results():
    """Run full pipeline and return alert results."""
    db = get_db()
    ms = MetadataService()
    dl = DataLoader(db, ms)
    dl.load_all()
    ce = CalculationEngine(db, ms)
    ce.run_all()
    sr = SettingsResolver(ms)
    de = DetectionEngine(db, ms, sr)
    return de.run_all()


def test_param_substitution_produces_alerts(pipeline_results):
    """Pipeline with $param substitution still generates alerts."""
    total_alerts = sum(
        len(r.get("alerts", [])) for r in pipeline_results.values()
    )
    assert total_alerts > 0, "Pipeline should produce alerts after param migration"


def test_all_calculations_have_structured_params():
    """All calcs with settings inputs use structured param format."""
    ms = MetadataService()
    calcs = ms.get_all_calculations()
    for calc in calcs:
        for key, val in calc.parameters.items():
            if isinstance(val, dict) and "source" in val:
                assert val["source"] in ("setting", "literal", "context"), \
                    f"{calc.calc_id}.parameters.{key} has invalid source"
                if val["source"] == "setting":
                    assert "setting_id" in val, \
                        f"{calc.calc_id}.parameters.{key} missing setting_id"


def test_business_date_window_uses_param():
    """business_date_window SQL references $cutoff_time."""
    ms = MetadataService()
    calc = ms.get_calculation("business_date_window")
    assert "$cutoff_time" in calc.logic
    assert "17:00:00" not in calc.logic, "Hardcoded cutoff should be removed"


def test_cancellation_pattern_uses_param():
    """cancellation_pattern SQL references $cancel_threshold."""
    ms = MetadataService()
    calc = ms.get_calculation("cancellation_pattern")
    assert "$cancel_threshold" in calc.logic


def test_trend_window_uses_param():
    """trend_window SQL references $trend_multiplier."""
    ms = MetadataService()
    calc = ms.get_calculation("trend_window")
    assert "$trend_multiplier" in calc.logic
    assert "* 1.5" not in calc.logic, "Hardcoded multiplier should be removed"


def test_large_trading_activity_uses_param():
    """large_trading_activity SQL references $activity_multiplier."""
    ms = MetadataService()
    calc = ms.get_calculation("large_trading_activity")
    assert "$activity_multiplier" in calc.logic
    assert "* 2.0" not in calc.logic, "Hardcoded multiplier should be removed"


def test_wash_detection_uses_param():
    """wash_detection SQL references $vwap_threshold."""
    ms = MetadataService()
    calc = ms.get_calculation("wash_detection")
    assert "$vwap_threshold" in calc.logic
    assert "< 0.02" not in calc.logic, "Hardcoded threshold should be removed"


def test_market_event_uses_param():
    """market_event_window SQL references $lookback_days."""
    ms = MetadataService()
    calc = ms.get_calculation("market_event_window")
    assert "$lookback_days" in calc.logic


def test_alert_count_matches_baseline(pipeline_results):
    """Alert count after migration should be within expected range."""
    total = sum(len(r.get("alerts", [])) for r in pipeline_results.values())
    # Baseline is ~430 alerts. Allow small variance from parameter rounding
    assert 400 <= total <= 500, f"Expected ~430 alerts, got {total}"
```

**Step 10: Run regression tests**

```bash
uv run pytest tests/test_param_migration.py -v
uv run pytest tests/test_calculation_engine.py tests/test_detection_engine.py -v
```

Expected: ALL PASS. If alert count differs, investigate which parameter substitution changed behavior and fix.

**Step 11: Regenerate snapshots**

```bash
uv run python -m scripts.generate_snapshots
```

**Step 12: Commit**

```bash
git add workspace/metadata/calculations/ tests/test_param_migration.py
git commit -m "feat(phase7b): migrate calc SQL to \$param placeholders — M93"
```

---

### Task M94: Fix TimeRangeSelector + Add Missing Settings Overrides

**Files:**
- Create: `backend/api/data_info.py` — date range endpoint
- Modify: `backend/main.py:9,19` — register new router
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx`
- Modify: `frontend/src/stores/metadataStore.ts` — add date range state
- Modify: 8+ settings JSON files — add fixed_income/index overrides
- Test: `tests/test_date_range.py`

**Step 1: Create backend date range endpoint**

Create `backend/api/data_info.py`:

```python
"""Data info API — date ranges, cardinality, etc."""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/data", tags=["data-info"])


@router.get("/date-range/{entity_id}")
def get_date_range(entity_id: str, request: Request):
    """Return min/max dates for date fields in an entity."""
    db = request.app.state.db
    ms = request.app.state.metadata_service

    entity = ms.get_entity(entity_id)
    if not entity:
        return {"error": f"Entity {entity_id} not found"}

    # Find date/datetime fields
    date_fields = [
        f.name for f in (entity.fields or [])
        if f.type in ("date", "datetime")
    ]

    if not date_fields:
        return {"entity_id": entity_id, "date_ranges": {}}

    table_name = entity_id
    ranges = {}
    cursor = db.cursor()

    for field in date_fields:
        try:
            result = cursor.execute(
                f'SELECT MIN("{field}") as min_date, MAX("{field}") as max_date '
                f'FROM "{table_name}" WHERE "{field}" IS NOT NULL'
            )
            row = result.fetchone()
            if row and row[0]:
                ranges[field] = {
                    "min_date": str(row[0]),
                    "max_date": str(row[1]),
                }
        except Exception:
            pass

    cursor.close()
    return {"entity_id": entity_id, "date_ranges": ranges}
```

**Step 2: Register router in main.py**

In `backend/main.py`:
- Add to import line 9: `from backend.api import metadata, query, pipeline, alerts, demo, data, ws, ai, dashboard, trace, data_info`
- Add after line 23: `app.include_router(data_info.router)`

**Step 3: Write test for date range endpoint**

Create `tests/test_date_range.py`:

```python
"""Tests for data date range API."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_date_range_md_eod():
    """EOD market data should return trade_date range."""
    resp = client.get("/api/data/date-range/md_eod")
    assert resp.status_code == 200
    data = resp.json()
    assert "trade_date" in data["date_ranges"]
    assert "min_date" in data["date_ranges"]["trade_date"]
    assert "max_date" in data["date_ranges"]["trade_date"]


def test_date_range_execution():
    """Execution entity should return execution_date range."""
    resp = client.get("/api/data/date-range/execution")
    assert resp.status_code == 200
    data = resp.json()
    assert "execution_date" in data["date_ranges"]


def test_date_range_unknown_entity():
    """Unknown entity returns error."""
    resp = client.get("/api/data/date-range/nonexistent")
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data


def test_date_range_venue_no_dates():
    """Venue entity has no date fields."""
    resp = client.get("/api/data/date-range/venue")
    assert resp.status_code == 200
    data = resp.json()
    assert data["date_ranges"] == {}


def test_date_range_values_are_valid():
    """Date range min should be before max."""
    resp = client.get("/api/data/date-range/md_eod")
    data = resp.json()
    r = data["date_ranges"]["trade_date"]
    assert r["min_date"] <= r["max_date"]
```

**Step 4: Run test to verify**

```bash
uv run pytest tests/test_date_range.py -v
```

**Step 5: Update TimeRangeSelector frontend**

Modify `frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx`:

Replace the `rangeToStartDate` function to accept a `maxDate` parameter:

```typescript
export function rangeToStartDate(range: string, maxDate?: string): string | undefined {
  if (range === "All") return undefined;
  const base = maxDate ? new Date(maxDate) : new Date();
  const map: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180 };
  const days = map[range] ?? 60;
  base.setDate(base.getDate() - days);
  return base.toISOString().slice(0, 10);
}
```

Add a `useEffect` in the component to fetch the date range from the API:

```typescript
const [maxDate, setMaxDate] = useState<string | undefined>();

useEffect(() => {
  fetch("/api/data/date-range/md_eod")
    .then(r => r.json())
    .then(data => {
      const range = data.date_ranges?.trade_date;
      if (range?.max_date) setMaxDate(range.max_date);
    })
    .catch(() => {});
}, []);
```

Pass `maxDate` to `rangeToStartDate` calls.

**Step 6: Add settings overrides for fixed_income and index**

For each settings file below, add overrides. Example for `wash_vwap_threshold.json`:

Add to the `overrides` array:
```json
{
  "match": {"asset_class": "fixed_income"},
  "value": 0.01,
  "priority": 1,
  "description": "Tighter threshold for fixed income — less volatile markets"
},
{
  "match": {"asset_class": "index"},
  "value": 0.015,
  "priority": 1,
  "description": "Slightly tighter threshold for index instruments"
}
```

Repeat for all relevant settings files with values from the design doc:

| Setting | fixed_income value | index value |
|---|---|---|
| `wash_vwap_threshold` | 0.01 | 0.015 |
| `cancel_count_threshold` | 5 | 4 |
| `trend_sensitivity` | 1.2 | 1.3 |
| `large_activity_multiplier` | 2.5 | 2.0 |
| `insider_lookback_days` | 14 | 10 |
| `wash_score_threshold` | 8 | 7 |
| `mpr_score_threshold` | 7 | 6 |
| `spoofing_score_threshold` | 7 | 6 |

**Step 7: Regenerate snapshots and run full test suite**

```bash
uv run python -m scripts.generate_snapshots
uv run pytest tests/ -v
```

**Step 8: Commit**

```bash
git add backend/api/data_info.py backend/main.py tests/test_date_range.py \
  frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx \
  workspace/metadata/settings/
git commit -m "fix(phase7b): TimeRangeSelector date defaults + settings overrides — M94"
```

---

## WS2: Backend APIs (M95-M96)

### Task M95: Domain Values API

**Files:**
- Create: `backend/api/domain_values.py` — new router
- Modify: `backend/main.py` — register router
- Modify: `backend/services/metadata_service.py` — add domain value query methods
- Test: `tests/test_domain_values.py`

**Step 1: Write failing tests**

Create `tests/test_domain_values.py`:

```python
"""Tests for domain values API."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_domain_values_asset_class():
    """Returns domain values for product.asset_class."""
    resp = client.get("/api/metadata/domain-values/product/asset_class")
    assert resp.status_code == 200
    data = resp.json()
    assert "metadata_values" in data
    assert "data_values" in data
    assert "combined" in data
    assert "cardinality" in data
    assert "equity" in data["combined"]


def test_domain_values_cardinality_small():
    """asset_class has <=50 values — cardinality is 'small'."""
    resp = client.get("/api/metadata/domain-values/product/asset_class")
    data = resp.json()
    assert data["cardinality"] == "small"


def test_domain_values_search():
    """Search filter narrows results."""
    resp = client.get("/api/metadata/domain-values/product/product_id?search=AAPL")
    assert resp.status_code == 200
    data = resp.json()
    assert any("AAPL" in v for v in data["combined"])


def test_domain_values_limit():
    """Limit parameter caps results."""
    resp = client.get("/api/metadata/domain-values/product/product_id?limit=5")
    data = resp.json()
    assert len(data["combined"]) <= 5


def test_domain_values_total_count():
    """total_count reflects actual distinct values."""
    resp = client.get("/api/metadata/domain-values/product/product_id")
    data = resp.json()
    assert data["total_count"] == 50  # 50 products


def test_match_keys():
    """Returns usable match keys from entity fields."""
    resp = client.get("/api/metadata/domain-values/match-keys")
    assert resp.status_code == 200
    data = resp.json()
    keys = [k["key"] for k in data["match_keys"]]
    assert "asset_class" in keys
    assert "exchange_mic" in keys


def test_match_keys_include_domain_values():
    """Match keys include domain_values when available."""
    resp = client.get("/api/metadata/domain-values/match-keys")
    data = resp.json()
    ac_key = next(k for k in data["match_keys"] if k["key"] == "asset_class")
    assert ac_key["domain_values"] is not None
    assert "equity" in ac_key["domain_values"]


def test_setting_ids():
    """Returns setting IDs, filterable by value_type."""
    resp = client.get("/api/metadata/domain-values/setting-ids?value_type=decimal")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["settings"]) > 0
    for s in data["settings"]:
        assert s["value_type"] == "decimal"


def test_setting_ids_score_steps():
    """Returns score_steps settings."""
    resp = client.get("/api/metadata/domain-values/setting-ids?value_type=score_steps")
    data = resp.json()
    assert len(data["settings"]) > 0


def test_calculation_ids():
    """Returns calculation IDs with metadata."""
    resp = client.get("/api/metadata/domain-values/calculation-ids")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["calculations"]) == 10
    calc = data["calculations"][0]
    assert "calc_id" in calc
    assert "name" in calc
    assert "layer" in calc
    assert "value_field" in calc


def test_calculation_ids_filter_layer():
    """Filter calculations by layer."""
    resp = client.get("/api/metadata/domain-values/calculation-ids?layer=derived")
    data = resp.json()
    for c in data["calculations"]:
        assert c["layer"] == "derived"


def test_unknown_entity():
    """Unknown entity returns empty."""
    resp = client.get("/api/metadata/domain-values/nonexistent/field")
    assert resp.status_code == 200
    data = resp.json()
    assert data["combined"] == []


def test_unknown_field():
    """Unknown field returns empty with data from SQL fallback."""
    resp = client.get("/api/metadata/domain-values/product/nonexistent_field")
    assert resp.status_code == 200
    data = resp.json()
    assert data["metadata_values"] == []


def test_metadata_values_priority():
    """Metadata values appear before data values in combined."""
    resp = client.get("/api/metadata/domain-values/product/asset_class")
    data = resp.json()
    if data["metadata_values"] and data["combined"]:
        assert data["combined"][0] in data["metadata_values"]
```

**Step 2: Run tests — verify they fail**

```bash
uv run pytest tests/test_domain_values.py -v
```

Expected: FAIL (module not found)

**Step 3: Implement domain values service methods**

Add to `backend/services/metadata_service.py` — new methods:

```python
def get_domain_values(self, entity_id: str, field_name: str,
                      search: str | None = None, limit: int = 50) -> dict:
    """Get domain values for an entity field from metadata and live data."""
    entity = self.get_entity(entity_id)

    # Metadata values from entity definition domain_values
    metadata_values = []
    if entity:
        field_def = next(
            (f for f in (entity.fields or []) if f.name == field_name), None
        )
        if field_def and field_def.domain_values:
            metadata_values = list(field_def.domain_values)

    # Data values from DuckDB (if db available)
    data_values = []
    total_count = 0
    if self._db:
        data_values, total_count = self._query_distinct_values(
            entity_id, field_name, search, limit
        )

    # Combined: metadata first, then data-only values
    seen = set(metadata_values)
    combined = list(metadata_values)
    for v in data_values:
        if v not in seen:
            combined.append(v)
            seen.add(v)

    # Apply search filter to metadata values too
    if search:
        search_lower = search.lower()
        combined = [v for v in combined if search_lower in str(v).lower()]

    # Cardinality tier
    effective_count = total_count or len(combined)
    if effective_count <= 50:
        cardinality = "small"
    elif effective_count <= 500:
        cardinality = "medium"
    else:
        cardinality = "large"

    return {
        "entity_id": entity_id,
        "field_name": field_name,
        "metadata_values": metadata_values if not search else [
            v for v in metadata_values if search.lower() in str(v).lower()
        ],
        "data_values": data_values,
        "combined": combined[:limit],
        "total_count": effective_count,
        "cardinality": cardinality,
    }


def _query_distinct_values(self, table: str, field: str,
                           search: str | None, limit: int) -> tuple[list, int]:
    """Query distinct values from DuckDB."""
    try:
        cursor = self._db.cursor()

        # Count total distinct
        count_sql = f'SELECT COUNT(DISTINCT "{field}") FROM "{table}" WHERE "{field}" IS NOT NULL'
        total = cursor.execute(count_sql).fetchone()[0]

        # Fetch values with optional search
        sql = f'SELECT DISTINCT "{field}" FROM "{table}" WHERE "{field}" IS NOT NULL'
        if search:
            sql += f" AND CAST(\"{field}\" AS VARCHAR) ILIKE '%{search}%'"
        sql += f' ORDER BY "{field}" LIMIT {limit}'

        rows = cursor.execute(sql).fetchall()
        cursor.close()
        return [str(r[0]) for r in rows], total
    except Exception:
        return [], 0


def get_match_keys(self) -> list[dict]:
    """Get all entity fields usable as match keys."""
    keys = []
    for entity in self.get_all_entities():
        for field in (entity.fields or []):
            if field.type in ("string", "varchar"):
                keys.append({
                    "key": field.name,
                    "entity": entity.entity_id,
                    "type": field.type,
                    "domain_values": list(field.domain_values) if field.domain_values else None,
                    "description": field.description or f"{entity.entity_id}.{field.name}",
                })
    return keys


def get_setting_ids(self, value_type: str | None = None) -> list[dict]:
    """Get setting IDs with metadata, optionally filtered by value_type."""
    settings = self.get_all_settings()
    result = []
    for s in settings:
        if value_type and s.value_type != value_type:
            continue
        result.append({
            "setting_id": s.setting_id,
            "name": s.name,
            "value_type": s.value_type,
            "default": s.default,
        })
    return result


def get_calculation_ids(self, layer: str | None = None) -> list[dict]:
    """Get calculation IDs with metadata, optionally filtered by layer."""
    calcs = self.get_all_calculations()
    result = []
    for c in calcs:
        if layer and c.layer != layer:
            continue
        result.append({
            "calc_id": c.calc_id,
            "name": c.name,
            "layer": c.layer,
            "value_field": c.value_field,
            "description": c.description or "",
        })
    return result
```

**Step 4: Create the API router**

Create `backend/api/domain_values.py`:

```python
"""Domain values API — suggestions for form fields."""
from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/metadata/domain-values", tags=["domain-values"])


@router.get("/{entity_id}/{field_name}")
def get_domain_values(
    entity_id: str,
    field_name: str,
    request: Request,
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=1000),
):
    ms = request.app.state.metadata_service
    ms._db = request.app.state.db
    return ms.get_domain_values(entity_id, field_name, search, limit)


@router.get("/match-keys")
def get_match_keys(request: Request):
    ms = request.app.state.metadata_service
    return {"match_keys": ms.get_match_keys()}


@router.get("/setting-ids")
def get_setting_ids(
    request: Request,
    value_type: str | None = Query(None),
):
    ms = request.app.state.metadata_service
    return {"settings": ms.get_setting_ids(value_type)}


@router.get("/calculation-ids")
def get_calculation_ids(
    request: Request,
    layer: str | None = Query(None),
):
    ms = request.app.state.metadata_service
    return {"calculations": ms.get_calculation_ids(layer)}
```

**Step 5: Register in main.py**

Add `domain_values` to the import and `app.include_router(domain_values.router)`.

**Step 6: Run tests**

```bash
uv run pytest tests/test_domain_values.py -v
```

Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/api/domain_values.py backend/services/metadata_service.py \
  backend/main.py tests/test_domain_values.py
git commit -m "feat(phase7b): domain values API with cardinality tiers — M95"
```

---

### Task M96: Match Patterns + Score Templates Backend

**Files:**
- Create: `backend/models/match_patterns.py`
- Create: `backend/models/score_templates.py`
- Create: `backend/api/match_patterns.py`
- Create: `backend/api/score_templates.py`
- Modify: `backend/services/metadata_service.py` — CRUD methods
- Modify: `backend/main.py` — register routers
- Create: `workspace/metadata/match_patterns/` — 9 OOB patterns
- Create: `workspace/metadata/score_templates/` — 7 OOB templates
- Test: `tests/test_match_patterns.py`
- Test: `tests/test_score_templates.py`

**Step 1: Write tests for match patterns**

Create `tests/test_match_patterns.py` with tests for:
- List all patterns (should return 9 OOB)
- Get single pattern by ID
- Create new pattern (PUT)
- Delete pattern
- Usage count (patterns referenced by settings overrides)
- Pattern matching preview (how many products match)

**Step 2: Write tests for score templates**

Create `tests/test_score_templates.py` with tests for:
- List all templates (should return 7 OOB)
- Filter by value_category
- Get single template by ID
- Create new template (PUT)
- Delete template
- Usage count

**Step 3: Create Pydantic models**

`backend/models/match_patterns.py`:
```python
from pydantic import BaseModel, Field
from datetime import datetime


class MatchPattern(BaseModel):
    pattern_id: str
    label: str
    description: str = ""
    match: dict[str, str] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    layer: str = "user"
```

`backend/models/score_templates.py`:
```python
from pydantic import BaseModel, Field
from datetime import datetime


class ScoreStep(BaseModel):
    min_value: float
    max_value: float | None = None
    score: int


class ScoreTemplate(BaseModel):
    template_id: str
    label: str
    description: str = ""
    value_category: str = ""  # volume, ratio, count, percentage, etc.
    steps: list[ScoreStep] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    layer: str = "user"
```

**Step 4: Add CRUD methods to MetadataService**

Add load/save/delete/list methods for match_patterns and score_templates following the same pattern as existing entity/calculation CRUD. Storage at `workspace/metadata/match_patterns/{id}.json` and `workspace/metadata/score_templates/{id}.json`.

Add usage count methods that scan all settings files for matching `match` dicts (for patterns) or matching score_steps arrays (for templates).

**Step 5: Create API routers**

`backend/api/match_patterns.py` — GET list, GET one, PUT, DELETE
`backend/api/score_templates.py` — GET list (with `?value_category=` filter), GET one, PUT, DELETE

**Step 6: Create OOB match patterns**

Create 9 JSON files in `workspace/metadata/match_patterns/`:
- `equity_stocks.json`, `fx_instruments.json`, `commodity_instruments.json`
- `fixed_income_all.json`, `fixed_income_bonds.json`, `index_instruments.json`
- `nyse_listed.json`, `nasdaq_listed.json`, `equity_nyse.json`

(Full JSON content as specified in design doc Section 3.1)

**Step 7: Create OOB score templates**

Create 7 JSON files in `workspace/metadata/score_templates/`:
- `volume_standard.json`, `volume_fx.json`, `ratio_binary.json`
- `ratio_graduated.json`, `count_low.json`, `count_high.json`, `percentage_standard.json`

(Full JSON content as specified in design doc Section 3.2)

**Step 8: Register routers, run all tests**

```bash
uv run pytest tests/test_match_patterns.py tests/test_score_templates.py -v
uv run pytest tests/ -v  # Full suite
```

**Step 9: Commit**

```bash
git add backend/models/match_patterns.py backend/models/score_templates.py \
  backend/api/match_patterns.py backend/api/score_templates.py \
  backend/services/metadata_service.py backend/main.py \
  workspace/metadata/match_patterns/ workspace/metadata/score_templates/ \
  tests/test_match_patterns.py tests/test_score_templates.py
git commit -m "feat(phase7b): match pattern bank + score template library — M96"
```

---

## WS3: Core Frontend Components (M97-M99)

### Task M97: SuggestionInput + useDomainValues

**Files:**
- Create: `frontend/src/hooks/useDomainValues.ts`
- Create: `frontend/src/components/SuggestionInput.tsx`
- Modify: `frontend/src/stores/metadataStore.ts` — add domain value actions

**Step 1: Create useDomainValues hook**

Zustand-cached hook that calls `/api/metadata/domain-values/{entity}/{field}`.
Handles cardinality tiers: small=eager load, medium=load on focus, large=debounced search.
Returns `{ metadataValues, dataValues, combined, cardinality, totalCount, isLoading, search, setSearch }`.

**Step 2: Create SuggestionInput component**

A reusable dropdown/autocomplete input. Props: `value`, `onChange`, `entityId`, `fieldName`, `suggestions`, `placeholder`, `label`, `tooltip`, `allowFreeform`, `freeformWarning`, `multiSelect`, `groupLabels`.

Behavior:
- On focus: load suggestions (small/medium) or show "Type to search" (large)
- Dropdown with two groups: "Defined Values" / "Found in Data"
- Filter on type (client-side for small/medium, server-side for large with 300ms debounce)
- Freeform values show amber warning badge
- Multi-select mode shows selected values as removable chips

**Step 3: Build and verify**

```bash
cd frontend && npm run build
```

**Step 4: Commit**

```bash
git add frontend/src/hooks/useDomainValues.ts frontend/src/components/SuggestionInput.tsx \
  frontend/src/stores/metadataStore.ts
git commit -m "feat(phase7b): SuggestionInput component + useDomainValues hook — M97"
```

---

### Task M98: MatchPatternPicker

**Files:**
- Create: `frontend/src/components/MatchPatternPicker.tsx`
- Modify: `frontend/src/stores/metadataStore.ts` — add match pattern actions

**Step 1: Add store actions**

Add to metadataStore: `matchPatterns`, `fetchMatchPatterns()`, `saveMatchPattern()`, `deleteMatchPattern()`.

**Step 2: Create MatchPatternPicker component**

A modal/dropdown component that:
- Lists saved patterns with label, match criteria badges, usage count
- Searchable
- "Use this pattern" button that populates match fields
- "Create new match" option with SuggestionInput for key/value
- After saving new match: "Save as reusable pattern?" prompt

**Step 3: Build and verify**

```bash
cd frontend && npm run build
```

**Step 4: Commit**

```bash
git add frontend/src/components/MatchPatternPicker.tsx frontend/src/stores/metadataStore.ts
git commit -m "feat(phase7b): MatchPatternPicker component — M98"
```

---

### Task M99: ScoreStepBuilder + ScoreTemplatePicker

**Files:**
- Create: `frontend/src/components/ScoreStepBuilder.tsx`
- Create: `frontend/src/components/ScoreTemplatePicker.tsx`
- Modify: `frontend/src/stores/metadataStore.ts` — add score template actions

**Step 1: Add store actions**

Add to metadataStore: `scoreTemplates`, `fetchScoreTemplates()`, `saveScoreTemplate()`, `deleteScoreTemplate()`.

**Step 2: Create ScoreStepBuilder**

Visual component with:
- Horizontal range bar (colored segments, gap/overlap indicators)
- Editable table (drag handle, min, max, score, delete button per row)
- Add Tier button
- Validation summary line
- Gap/overlap/non-monotonic warnings
- "Templates" toolbar button

Props: `value: ScoreStep[]`, `onChange`, `valueCategory?`, `readOnly?`

**Step 3: Create ScoreTemplatePicker**

Modal showing templates grouped by value_category, with range bar preview. "Apply" copies steps. "Save as template" prompt after editing.

**Step 4: Build and verify**

```bash
cd frontend && npm run build
```

**Step 5: Commit**

```bash
git add frontend/src/components/ScoreStepBuilder.tsx \
  frontend/src/components/ScoreTemplatePicker.tsx \
  frontend/src/stores/metadataStore.ts
git commit -m "feat(phase7b): ScoreStepBuilder + ScoreTemplatePicker — M99"
```

---

## WS4: Form Upgrades (M100-M104)

### Task M100: Settings Manager Form Upgrades

**Files:**
- Modify: `frontend/src/views/SettingsManager/SettingForm.tsx`
- Modify: `frontend/src/views/SettingsManager/SettingDetail.tsx`
- Modify: `frontend/src/views/SettingsManager/OverrideEditor.tsx`
- Modify: `frontend/src/views/MetadataEditor/SettingsEditor.tsx`

**Changes:**
1. Replace override match key `<input>` with `<SuggestionInput entityId="..." fieldName="match-keys">`
2. Replace override match value `<input>` with `<SuggestionInput>` that dynamically loads values for selected key
3. Replace score_steps default value text input with `<ScoreStepBuilder>` when `value_type === "score_steps"`
4. Add `<MatchPatternPicker>` to override creation — "Use existing pattern" / "Create new match"
5. Replace hardcoded context fields in OverrideEditor with dynamic list from match-keys API
6. Add tooltips to all form labels
7. Apply same changes to `SettingsEditor.tsx` in Metadata Editor

**Build and test:**
```bash
cd frontend && npm run build
```

**Commit:**
```bash
git commit -m "feat(phase7b): Settings Manager form upgrades — SuggestionInput, ScoreStepBuilder, MatchPatternPicker — M100"
```

---

### Task M101: Model Composer Wizard Steps 1-3

**Files:**
- Modify: `frontend/src/views/ModelComposer/ModelCreateForm.tsx` — major rewrite to wizard
- Create: `frontend/src/views/ModelComposer/WizardProgress.tsx` — progress bar component
- Create: `frontend/src/views/ModelComposer/steps/DefineStep.tsx` — Step 1
- Create: `frontend/src/views/ModelComposer/steps/SelectCalcsStep.tsx` — Step 2
- Create: `frontend/src/views/ModelComposer/steps/ConfigureScoringStep.tsx` — Step 3

**Step 1 (Define):** Name, Description, Time Window dropdown (from time_window calcs), Granularity checkboxes, Context Fields multi-select SuggestionInput.

**Step 2 (Select Calculations):** Enhanced click-to-select with description, layer badge, value_field, dependency info per calc. Tooltip with details.

**Step 3 (Configure Scoring):** Per-calc: strictness toggle, threshold_setting SuggestionInput (filtered to decimal), score_steps_setting SuggestionInput (filtered to score_steps), value_field (auto-populated), inline ScoreStepBuilder preview. Alert threshold: score_threshold_setting SuggestionInput with preview.

**Build and test:**
```bash
cd frontend && npm run build
```

**Commit:**
```bash
git commit -m "feat(phase7b): Model Composer wizard Steps 1-3 — M101"
```

---

### Task M102: Model Composer Wizard Steps 4-7

**Files:**
- Create: `frontend/src/views/ModelComposer/steps/QueryStep.tsx` — Step 4 (Monaco SQL editor)
- Create: `frontend/src/views/ModelComposer/steps/ReviewStep.tsx` — Step 5
- Create: `frontend/src/views/ModelComposer/steps/TestRunStep.tsx` — Step 6
- Create: `frontend/src/views/ModelComposer/steps/DeployStep.tsx` — Step 7
- Create: `backend/api/detection_dry_run.py` — dry run endpoint
- Modify: `backend/main.py` — register dry run router

**Step 4 (Query):** Monaco editor with SQL highlighting, "Generate from selections" button, SQL reference panel.

**Step 5 (Review):** Summary card of all decisions. ValidationPanel integration (from M103).

**Step 6 (Test Run):** Calls `POST /api/detection-models/{id}/dry-run`. Shows preview alerts in AG Grid. Each alert expandable.

**Step 7 (Deploy):** Confirmation dialog with impact summary. Save + optional pipeline run.

**Dry run backend endpoint:**
```python
@router.post("/api/detection-models/{model_id}/dry-run")
def dry_run_model(model_id: str, request: Request):
    """Run detection model without persisting alerts."""
    # Run detection engine in preview mode
    # Return alert previews without saving
```

**Build, test, commit:**
```bash
cd frontend && npm run build
uv run pytest tests/ -v
git commit -m "feat(phase7b): Model Composer wizard Steps 4-7 + dry run — M102"
```

---

### Task M103: Preview, Validation, Dependencies Panels

**Files:**
- Create: `frontend/src/components/ValidationPanel.tsx`
- Create: `frontend/src/components/PreviewPanel.tsx`
- Create: `frontend/src/components/DependencyMiniDAG.tsx`
- Modify: `frontend/src/views/ModelComposer/index.tsx` — integrate panels

**ValidationPanel:** Real-time completeness checks, best practice suggestions, industry patterns, regulatory coverage. Runs continuously as user builds.

**PreviewPanel:** Score simulation on sample data, sensitivity analysis mini-chart, calculation contribution stacked bar, data coverage check.

**DependencyMiniDAG:** Small React Flow graph showing Entity → Calc → Model dependencies. Clickable nodes.

**Build and commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): Preview, Validation, Dependencies panels — M103"
```

---

### Task M104: Example & Use Case Library UI

**Files:**
- Create: `frontend/src/components/ExamplesDrawer.tsx`
- Create: `frontend/src/data/modelExamples.ts` — annotated OOB model examples
- Create: `frontend/src/data/settingsExamples.ts` — annotated settings examples
- Create: `frontend/src/data/calculationExamples.ts` — annotated calc examples

**ExamplesDrawer:** Slide-out panel with annotated examples. Each example shows: annotated JSON, decision rationale, "Use as starting point" button. Categories: Models, Settings, Calculations.

**Build and commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): Example & Use Case Library UI — M104"
```

---

## WS5: Backend Services (M105-M107)

### Task M105: Validation Service (5 Layers)

**Files:**
- Create: `backend/services/validation_service.py`
- Modify: `backend/engine/calculation_engine.py` — add sandbox mode
- Modify: `backend/engine/detection_engine.py` — add comparison mode
- Test: `tests/test_validation_service.py`

Implement all 5 validation layers:
1. Static analysis (SQL syntax via DuckDB EXPLAIN, table/column existence)
2. Schema compatibility (input/output matching, dependency order, no cycles)
3. Sandbox execution (read-only transaction, row count checks, timing)
4. Impact analysis (what models would be affected)
5. Regression safety (before/after alert comparison)

**Test, commit:**
```bash
uv run pytest tests/test_validation_service.py -v
git commit -m "feat(phase7b): 5-layer validation service — M105"
```

---

### Task M106: Use Cases API

**Files:**
- Create: `backend/models/use_cases.py`
- Create: `backend/api/use_cases.py`
- Create: `workspace/use_cases/` directory
- Modify: `backend/services/metadata_service.py` — use case CRUD
- Modify: `backend/main.py` — register router
- Test: `tests/test_use_cases.py`

Endpoints: GET list, GET one, PUT, DELETE, POST run (execute pipeline on use case data), POST generate-data (AI).

**Test, commit:**
```bash
uv run pytest tests/test_use_cases.py -v
git commit -m "feat(phase7b): Use Cases API — M106"
```

---

### Task M107: Submissions API + Recommendations

**Files:**
- Create: `backend/models/submissions.py`
- Create: `backend/api/submissions.py`
- Create: `backend/services/recommendation_service.py`
- Create: `workspace/submissions/` directory
- Modify: `backend/main.py` — register router
- Test: `tests/test_submissions.py`
- Test: `tests/test_recommendations.py`

Endpoints: GET list, GET one, POST create, PUT status, POST implement.
Recommendation engine: change classification, similarity analysis, consistency checks.

**Test, commit:**
```bash
uv run pytest tests/test_submissions.py tests/test_recommendations.py -v
git commit -m "feat(phase7b): Submissions API + recommendation engine — M107"
```

---

## WS6: Advanced Frontend (M108-M112)

### Task M108: Use Case Studio View

**Files:**
- Create: `frontend/src/views/UseCaseStudio/index.tsx`
- Create: `frontend/src/views/UseCaseStudio/UseCaseBuilder.tsx`
- Create: `frontend/src/views/UseCaseStudio/SampleDataEditor.tsx`
- Create: `frontend/src/views/UseCaseStudio/ExpectedResults.tsx`
- Create: `frontend/src/stores/useCaseStore.ts`
- Modify: `frontend/src/App.tsx` — add route

5-step wizard: Describe → Select/Create Components → Add Sample Data → Define Expected → Run & Validate.

**Build, commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): Use Case Studio view — M108"
```

---

### Task M109: Submissions Review Queue

**Files:**
- Create: `frontend/src/views/Submissions/index.tsx`
- Create: `frontend/src/views/Submissions/SubmissionDetail.tsx`
- Create: `frontend/src/views/Submissions/ReviewActions.tsx`
- Create: `frontend/src/stores/submissionStore.ts`
- Modify: `frontend/src/App.tsx` — add route

Queue AG Grid + detail view with tabs (Summary, Components, Validation, Recommendations, Impact, Sample Run, Discussion).

**Build, commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): Submissions review queue — M109"
```

---

### Task M110: AI Context Builder + Calc Generation Backend

**Files:**
- Create: `backend/services/ai_context_builder.py`
- Modify: `backend/services/ai_service.py` — add calc generation
- Modify: `backend/api/ai.py` — add calc suggestion endpoint
- Test: `tests/test_ai_calc_generation.py`

Build metadata context for LLM (entity schemas, existing calcs, settings). Add `POST /api/ai/suggest-calculation` endpoint.

**Test, commit:**
```bash
uv run pytest tests/test_ai_calc_generation.py -v
git commit -m "feat(phase7b): AI context builder + calc generation — M110"
```

---

### Task M111: AI Calculation Builder Frontend

**Files:**
- Create: `frontend/src/components/AICalcBuilder.tsx`
- Create: `frontend/src/components/AICalcReview.tsx`

Natural language input → AI proposal → split view (JSON left, explanation right) → refine → validate → save.

**Build, commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): AI Calculation Builder UI — M111"
```

---

### Task M112: Version Management + Comparison

**Files:**
- Create: `backend/services/version_service.py`
- Create: `backend/api/versions.py`
- Create: `frontend/src/components/VersionComparison.tsx`
- Test: `tests/test_version_management.py`

Version tracking, side-by-side diff, A/B alert comparison, rollback.

**Test, build, commit:**
```bash
uv run pytest tests/test_version_management.py -v
cd frontend && npm run build
git commit -m "feat(phase7b): version management + comparison — M112"
```

---

## WS7: Tour System (M113-M120)

### Task M113: Tour Engine Upgrade

**Files:**
- Create: `frontend/src/components/TourEngine/ScenarioRunner.tsx`
- Create: `frontend/src/components/TourEngine/ScenarioSelector.tsx`
- Create: `frontend/src/components/TourEngine/StepOverlay.tsx`
- Create: `frontend/src/components/TourEngine/OperationScripts.tsx`
- Modify: `frontend/src/stores/tourStore.ts` — add scenario state

Dual-mode engine: "Watch Demo" (auto-play with narration) + "Try It Yourself" (interactive with hints). Mode selector, replay/reset, scenario navigation.

**Build, commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): Tour engine upgrade — dual mode, scenarios — M113"
```

---

### Tasks M114-M118: Scenario Definitions

Create `frontend/src/data/scenarioDefinitions.ts` with all 25 scenarios organized in 7 categories. Each scenario has full step definitions with targets, content, actions, validation, hints, auto-fill data.

Split across milestones:
- **M114:** S1-S6 (Settings & Thresholds)
- **M115:** S7-S10 (Calculations)
- **M116:** S11-S14 (Detection Models)
- **M117:** S15-S18 (Use Cases & Submissions)
- **M118:** S19-S25 (Entities, Investigation, Admin)

**Commit per milestone.**

---

### Task M119: Per-Screen Operation Scripts

**Files:**
- Create: `frontend/src/data/operationScripts.ts`
- Modify all 14+ views to add help (?) button

Each view gets: "What can I do here?" panel, operation list (mini-guides), quick actions, related scenarios, tips.

**Build, commit:**
```bash
cd frontend && npm run build
git commit -m "feat(phase7b): per-screen operation scripts — M119"
```

---

### Task M120: Testing & Documentation

**Files:**
- Create: `tests/test_domain_values.py` (if not already from M95)
- Create: `tests/test_match_patterns.py` (if not already from M96)
- Create: `tests/test_score_templates.py` (if not already from M96)
- Create: `tests/test_validation_service.py` (if not already from M105)
- Create: `tests/test_use_cases.py` (if not already from M106)
- Create: `tests/test_submissions.py` (if not already from M107)
- Create: `tests/test_recommendations.py` (if not already from M107)
- Create: `tests/e2e/test_domain_suggestions.py`
- Create: `tests/e2e/test_match_patterns.py`
- Create: `tests/e2e/test_score_builder.py`
- Create: `tests/e2e/test_model_wizard.py`
- Create: `tests/e2e/test_use_case_studio.py`
- Create: `tests/e2e/test_submissions.py`
- Create: `tests/e2e/test_guided_tours.py`
- Create: `tests/e2e/test_gap_fixes.py`
- Modify: `docs/demo-guide.md` — add Acts 4-7
- Modify: `docs/progress.md` — update milestone statuses

**Step 1: Run full backend test suite**
```bash
uv run pytest tests/ -v
```
Target: ~310+ tests (214 existing + ~98 new)

**Step 2: Run E2E Playwright tests**
All new E2E tests with screenshots. Target: ~61 new E2E tests.

**Step 3: Frontend build verification**
```bash
cd frontend && npm run build
```
No TypeScript errors.

**Step 4: Update demo guide with Acts 4-7**

**Step 5: Update progress tracker with all completed milestones**

**Step 6: Regenerate snapshots**
```bash
uv run python -m scripts.generate_snapshots
```

**Step 7: Final commit**
```bash
git add -A
git commit -m "feat(phase7b): testing, E2E, documentation — M120"
```

---

## Verification Checklist

After all milestones complete:

- [ ] `uv run pytest tests/ -v` — all tests pass (310+)
- [ ] `cd frontend && npm run build` — no TypeScript errors
- [ ] Playwright E2E: all 12+ views work at 1440px and 1024px
- [ ] SuggestionInput: dropdown shows domain values, search works, freeform warning shows
- [ ] MatchPatternPicker: can browse/create/reuse patterns
- [ ] ScoreStepBuilder: range bar renders, drag reorder works, gap detection warns
- [ ] Model Composer wizard: all 7 steps navigable, validation gates work, dry run shows results
- [ ] Use Case Studio: can create/save/run use case
- [ ] Submissions: can submit/review/approve/implement
- [ ] AI Calc Builder: natural language → proposal → validate → save
- [ ] Guided tours: Watch Demo mode auto-plays, Try It Yourself mode highlights
- [ ] All 25 scenarios accessible from scenario selector
- [ ] Per-screen help (?) button shows operations
- [ ] Demo guide Acts 4-7 documented
- [ ] Progress tracker updated
- [ ] Snapshots regenerated
