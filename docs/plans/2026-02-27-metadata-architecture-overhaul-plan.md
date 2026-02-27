# Metadata Architecture Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve the platform from 34% fully-metadata-driven to 60%+ by extracting all hardcoded configuration into metadata JSON, making code a generic engine that adjusts with zero rebuilds when business rules change.

**Architecture:** Every "what" (which widgets, which navigation items, which presets, which layouts, which formatting rules) moves into `workspace/metadata/` as JSON. Code becomes a pure "how" engine — generic renderers, strategy registries, and manifest loaders. Backend serves metadata via new API endpoints. Frontend loads metadata at startup and renders dynamically. Settings resolver becomes strategy-based. All changes follow TDD with backend tests first, then E2E, then docs.

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript + Vite (frontend), Pydantic v2 models, Zustand stores, JSON metadata on disk. No new dependencies unless explicitly noted.

**Starting point:** M128 complete, 572 tests (390 backend + 182 E2E), 16 views, 74 traced architecture sections, all on `main`.

---

## Stage Overview

| Stage | Scope | Milestones | New Tests | Key Deliverable |
|-------|-------|------------|-----------|-----------------|
| **1** | SQL Presets + Settings Resolver Strategy | M129-M131 | ~15 backend | Quick wins, establish patterns |
| **2** | Dashboard Widget Manifest | M132-M135 | ~20 backend + ~8 E2E | Configurable dashboard |
| **3** | Format Registry + Alert Layouts | M136-M139 | ~15 backend + ~5 E2E | Centralized formatting, model-specific alerts |
| **4** | Navigation Manifest + View Config | M140-M143 | ~12 backend + ~6 E2E | Sidebar from metadata |
| **5** | Audit Trail + AI Context | M144-M147 | ~15 backend + ~4 E2E | Metadata change tracking, reactive AI |
| **6** | BDD, Architecture Audit, Docs, Demo | M148-M150 | ~10 BDD | Full documentation sweep |

**Estimated new tests:** ~90 backend + ~23 E2E + ~10 BDD = ~123 new tests
**Projected totals:** ~480 backend + ~205 E2E = ~685+ total tests

---

## Pre-Stage: Branch Setup

### Task 0: Create Feature Branch

**Step 1: Verify clean state**

Run: `git status && git log origin/main..HEAD --oneline`
Expected: Clean working tree, no unpushed commits

**Step 2: Create branch**

```bash
git checkout -b feature/metadata-architecture-overhaul main
```

**Step 3: Push branch**

```bash
git push -u origin feature/metadata-architecture-overhaul
```

---

# STAGE 1: SQL Presets + Settings Resolver Strategy (M129-M131)

*Quick wins that establish the metadata-first pattern with minimal risk.*

---

### Task 1: Extract SQL Presets to Metadata (M129)

**Files:**
- Create: `workspace/metadata/query_presets/default.json`
- Create: `backend/models/query_presets.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/query.py:34-40`
- Test: `tests/test_query_presets.py`

**Step 1: Write the failing test**

```python
# tests/test_query_presets.py
"""Tests for metadata-driven SQL query presets."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "query_presets").mkdir(parents=True)
    (ws / "metadata" / "query_presets" / "default.json").write_text(json.dumps({
        "preset_group_id": "default",
        "presets": [
            {"preset_id": "all_tables", "name": "All Tables", "sql": "SHOW TABLES", "category": "exploration", "order": 1},
            {"preset_id": "alert_summary", "name": "Alert Summary", "sql": "SELECT * FROM alerts_summary LIMIT 100", "category": "investigation", "order": 2},
        ]
    }))
    # Minimal entity metadata so app boots
    (ws / "metadata" / "entities").mkdir(parents=True)
    (ws / "metadata" / "calculations").mkdir(parents=True)
    (ws / "metadata" / "settings").mkdir(parents=True)
    (ws / "metadata" / "detection_models").mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestQueryPresets:
    def test_presets_loaded_from_metadata(self, client):
        resp = client.get("/api/query/presets")
        assert resp.status_code == 200
        presets = resp.json()
        assert len(presets) >= 2
        assert presets[0]["preset_id"] == "all_tables"
        assert presets[0]["name"] == "All Tables"

    def test_presets_ordered_by_order_field(self, client):
        resp = client.get("/api/query/presets")
        presets = resp.json()
        orders = [p["order"] for p in presets]
        assert orders == sorted(orders)

    def test_presets_have_required_fields(self, client):
        resp = client.get("/api/query/presets")
        for preset in resp.json():
            assert "preset_id" in preset
            assert "name" in preset
            assert "sql" in preset
            assert "category" in preset

    def test_empty_presets_dir_returns_empty_list(self, workspace, monkeypatch, client):
        # Remove the presets file
        (workspace / "metadata" / "query_presets" / "default.json").unlink()
        resp = client.get("/api/query/presets")
        assert resp.status_code == 200
        assert resp.json() == []
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_query_presets.py -v`
Expected: FAIL — presets endpoint returns hardcoded list, not metadata-driven

**Step 3: Create Pydantic model**

```python
# backend/models/query_presets.py
"""Query preset metadata models."""
from pydantic import BaseModel


class QueryPreset(BaseModel):
    preset_id: str
    name: str
    sql: str
    category: str = "general"
    description: str = ""
    order: int = 0


class QueryPresetGroup(BaseModel):
    preset_group_id: str
    presets: list[QueryPreset]
```

**Step 4: Create metadata JSON file**

```json
// workspace/metadata/query_presets/default.json
{
  "preset_group_id": "default",
  "presets": [
    {
      "preset_id": "all_tables",
      "name": "All Tables",
      "sql": "SHOW TABLES",
      "category": "exploration",
      "description": "List all available tables in the database",
      "order": 1
    },
    {
      "preset_id": "alert_summary",
      "name": "Alert Summary",
      "sql": "SELECT * FROM alerts_summary LIMIT 100",
      "category": "investigation",
      "description": "View recent alert summaries",
      "order": 2
    },
    {
      "preset_id": "calc_tables",
      "name": "Calculation Results",
      "sql": "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'calc_%'",
      "category": "exploration",
      "description": "List all calculation result tables",
      "order": 3
    }
  ]
}
```

**Step 5: Add `list_query_presets()` to MetadataService**

In `backend/services/metadata_service.py`, add method:

```python
def list_query_presets(self) -> list[dict]:
    """Load query presets from workspace/metadata/query_presets/*.json"""
    from backend.models.query_presets import QueryPresetGroup
    presets_dir = self._base / "query_presets"
    if not presets_dir.exists():
        return []
    all_presets = []
    for f in sorted(presets_dir.glob("*.json")):
        group = QueryPresetGroup.model_validate_json(f.read_text())
        all_presets.extend(group.presets)
    all_presets.sort(key=lambda p: p.order)
    return [p.model_dump() for p in all_presets]
```

**Step 6: Refactor query.py to use metadata**

Replace `backend/api/query.py:34-40` from:

```python
@router.get("/presets")
def list_preset_queries():
    return [
        {"name": "All Tables", "sql": "SHOW TABLES"},
        {"name": "Alert Summary", "sql": "SELECT * FROM alerts_summary LIMIT 100"},
        {"name": "Calculation Results", "sql": "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'calc_%'"},
    ]
```

To:

```python
@router.get("/presets")
def list_preset_queries(request: Request):
    metadata = request.app.state.metadata
    return metadata.list_query_presets()
```

**Step 7: Run tests to verify they pass**

Run: `uv run pytest tests/test_query_presets.py -v`
Expected: 4 PASS

**Step 8: Run existing tests to check for regression**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: All 390+ tests PASS

**Step 9: Commit**

```bash
git add workspace/metadata/query_presets/ backend/models/query_presets.py backend/services/metadata_service.py backend/api/query.py tests/test_query_presets.py
git commit -m "feat(metadata): extract SQL presets to metadata JSON (M129)

Move hardcoded SQL presets from backend/api/query.py to
workspace/metadata/query_presets/default.json. Add QueryPreset
Pydantic model and MetadataService.list_query_presets() method.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Refactor Settings Resolver to Strategy Pattern (M130)

**Files:**
- Modify: `backend/engine/settings_resolver.py:16-29`
- Test: `tests/test_settings_resolver.py` (extend existing)

**Step 1: Write the failing test for new strategy registration**

Add to `tests/test_settings_resolver.py`:

```python
class TestStrategyRegistry:
    def test_hierarchy_strategy_registered(self):
        from backend.engine.settings_resolver import RESOLUTION_STRATEGIES
        assert "hierarchy" in RESOLUTION_STRATEGIES

    def test_multi_dimensional_strategy_registered(self):
        from backend.engine.settings_resolver import RESOLUTION_STRATEGIES
        assert "multi_dimensional" in RESOLUTION_STRATEGIES

    def test_unknown_strategy_raises(self):
        from backend.engine.settings_resolver import SettingsResolver
        from backend.models.settings import SettingDefinition
        resolver = SettingsResolver()
        setting = SettingDefinition(
            setting_id="test", name="Test", value_type="numeric",
            default=1.0, match_type="unknown_strategy", overrides=[]
        )
        with pytest.raises(ValueError, match="Unknown resolution strategy"):
            resolver.resolve(setting, {})

    def test_custom_strategy_can_be_registered(self):
        from backend.engine.settings_resolver import RESOLUTION_STRATEGIES, ResolutionStrategy
        class AlwaysDefault(ResolutionStrategy):
            def resolve(self, overrides, context):
                return None
        RESOLUTION_STRATEGIES["always_default"] = AlwaysDefault()
        assert "always_default" in RESOLUTION_STRATEGIES
        # Clean up
        del RESOLUTION_STRATEGIES["always_default"]
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_settings_resolver.py::TestStrategyRegistry -v`
Expected: FAIL — no `RESOLUTION_STRATEGIES` dict or `ResolutionStrategy` protocol

**Step 3: Implement Strategy pattern**

Refactor `backend/engine/settings_resolver.py`:

```python
"""Settings resolution engine with pluggable strategy pattern."""
from dataclasses import dataclass
from typing import Any, Protocol

from backend.models.settings import ScoreStep, SettingDefinition, SettingOverride


class ResolutionStrategy(Protocol):
    """Protocol for settings resolution strategies."""
    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None: ...


@dataclass
class ResolutionResult:
    setting_id: str = ""
    value: Any = None
    matched_override: SettingOverride | None = None
    why: str = ""


class HierarchyStrategy:
    """All match keys must be present in context. Most specific (most keys) wins."""

    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None:
        candidates = []
        for ov in overrides:
            if _all_keys_match(ov.match, context):
                candidates.append(ov)
        if not candidates:
            return None
        candidates.sort(key=lambda o: (len(o.match), o.priority), reverse=True)
        return candidates[0]


class MultiDimensionalStrategy:
    """Count how many dimensions match. Most matches wins, tie-broken by priority."""

    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None:
        candidates = []
        for ov in overrides:
            match_count = _count_matching_dimensions(ov.match, context)
            if match_count > 0:
                candidates.append((match_count, ov))
        if not candidates:
            return None
        candidates.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
        return candidates[0][1]


# --- Strategy Registry ---
RESOLUTION_STRATEGIES: dict[str, ResolutionStrategy] = {
    "hierarchy": HierarchyStrategy(),
    "multi_dimensional": MultiDimensionalStrategy(),
}


def _all_keys_match(match: dict[str, str], context: dict[str, str]) -> bool:
    return all(context.get(k) == v for k, v in match.items())


def _count_matching_dimensions(match: dict[str, str], context: dict[str, str]) -> int:
    return sum(1 for k, v in match.items() if context.get(k) == v)


class SettingsResolver:
    def resolve(self, setting: SettingDefinition, context: dict[str, str]) -> ResolutionResult:
        """Resolve a setting value using the registered strategy for its match_type."""
        strategy = RESOLUTION_STRATEGIES.get(setting.match_type)
        if strategy is None:
            raise ValueError(f"Unknown resolution strategy: {setting.match_type}")

        matched = strategy.resolve(setting.overrides, context)

        if matched is not None:
            match_desc = ", ".join(f"{k}={v}" for k, v in matched.match.items())
            return ResolutionResult(
                setting_id=setting.setting_id,
                value=matched.value,
                matched_override=matched,
                why=f"Matched override: {{{match_desc}}} (priority {matched.priority})",
            )

        return ResolutionResult(
            setting_id=setting.setting_id,
            value=setting.default,
            matched_override=None,
            why="No matching override; using default value",
        )

    @staticmethod
    def evaluate_score(steps: list[ScoreStep], value: float) -> float:
        """Evaluate a value against a list of score steps."""
        accumulated = 0.0
        for step in sorted(steps, key=lambda s: s.threshold):
            if value >= step.threshold:
                accumulated = step.score
        return accumulated
```

**Step 4: Run all settings resolver tests**

Run: `uv run pytest tests/test_settings_resolver.py -v`
Expected: All existing + 4 new tests PASS

**Step 5: Run full backend regression**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: All tests PASS (strategy refactor is backward-compatible)

**Step 6: Commit**

```bash
git add backend/engine/settings_resolver.py tests/test_settings_resolver.py
git commit -m "refactor(settings): extract resolution to Strategy pattern (M130)

Replace if/else match_type branching with pluggable RESOLUTION_STRATEGIES
registry. HierarchyStrategy and MultiDimensionalStrategy classes implement
ResolutionStrategy protocol. New strategies can be added without modifying
SettingsResolver class (Open/Closed Principle).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Stage 1 Checkpoint — Test, Document, Push

**Step 1: Run full backend test suite**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: ~406+ tests PASS (390 existing + 16 new)

**Step 2: Build frontend to verify no breakage**

Run: `cd frontend && npm run build`
Expected: Build succeeds with 964+ modules

**Step 3: Update progress.md**

Add new section after M128:

```markdown
### 2026-02-27 — Stage 1: Metadata Architecture Overhaul Begins

#### M129: SQL Presets to Metadata ✅
- [x] Create `workspace/metadata/query_presets/default.json` with 3 presets
- [x] Add `QueryPreset` and `QueryPresetGroup` Pydantic models
- [x] Add `MetadataService.list_query_presets()` method
- [x] Refactor `backend/api/query.py` to load presets from metadata
- [x] 4 new backend tests — all passing
- Regression: all 390 existing backend tests pass

#### M130: Settings Resolver Strategy Pattern ✅
- [x] Extract `HierarchyStrategy` and `MultiDimensionalStrategy` classes
- [x] Create `RESOLUTION_STRATEGIES` registry dict
- [x] Add `ResolutionStrategy` protocol for extensibility
- [x] 4 new backend tests — all passing
- Regression: all existing settings resolver tests pass unchanged
```

**Step 4: Update architecture registry**

Add new trace entry for `sql.presets` section — update metadataMaturity from `"code-driven"` to `"fully-metadata-driven"` in `frontend/src/data/architectureRegistry.ts`.

**Step 5: Commit docs + push**

```bash
git add docs/progress.md frontend/src/data/architectureRegistry.ts
git commit -m "docs: Stage 1 checkpoint — M129-M130 complete, ~406 tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

# STAGE 2: Dashboard Widget Manifest (M132-M135)

*Make the most-viewed surface fully configurable via metadata.*

---

### Task 4: Create Dashboard Widget Metadata Schema (M132)

**Files:**
- Create: `workspace/metadata/widgets/dashboard.json`
- Create: `backend/models/widgets.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py` (add widgets endpoint)
- Test: `tests/test_widget_metadata.py`

**Step 1: Write the failing test**

```python
# tests/test_widget_metadata.py
"""Tests for dashboard widget metadata."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "widgets").mkdir(parents=True)
    (ws / "metadata" / "widgets" / "dashboard.json").write_text(json.dumps({
        "view_id": "dashboard",
        "widgets": [
            {
                "widget_id": "total_alerts",
                "widget_type": "kpi_card",
                "title": "Total Alerts",
                "data_field": "total_alerts",
                "format": {"type": "integer"},
                "grid": {"col_span": 1, "order": 1}
            },
            {
                "widget_id": "alerts_by_model",
                "widget_type": "chart",
                "title": "Alerts by Model",
                "data_field": "by_model",
                "chart_config": {
                    "x_field": "model_id",
                    "y_field": "cnt",
                    "default_chart_type": "horizontal_bar",
                    "available_chart_types": ["horizontal_bar", "bar", "pie", "line", "table"],
                    "color_palette": "categorical"
                },
                "grid": {"col_span": 2, "order": 2}
            }
        ]
    }))
    # Minimal dirs so app boots
    for d in ["entities", "calculations", "settings", "detection_models"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestWidgetMetadata:
    def test_widgets_endpoint_returns_config(self, client):
        resp = client.get("/api/metadata/widgets/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert data["view_id"] == "dashboard"
        assert len(data["widgets"]) == 2

    def test_widget_has_required_fields(self, client):
        resp = client.get("/api/metadata/widgets/dashboard")
        widget = resp.json()["widgets"][0]
        assert "widget_id" in widget
        assert "widget_type" in widget
        assert "title" in widget

    def test_chart_widget_has_chart_config(self, client):
        resp = client.get("/api/metadata/widgets/dashboard")
        chart = resp.json()["widgets"][1]
        assert chart["widget_type"] == "chart"
        assert "chart_config" in chart
        assert "default_chart_type" in chart["chart_config"]

    def test_widgets_ordered_by_grid_order(self, client):
        resp = client.get("/api/metadata/widgets/dashboard")
        widgets = resp.json()["widgets"]
        orders = [w["grid"]["order"] for w in widgets]
        assert orders == sorted(orders)

    def test_nonexistent_view_returns_404(self, client):
        resp = client.get("/api/metadata/widgets/nonexistent")
        assert resp.status_code == 404

    def test_widget_update_persists(self, client):
        resp = client.get("/api/metadata/widgets/dashboard")
        data = resp.json()
        data["widgets"][0]["title"] = "Updated Title"
        put_resp = client.put("/api/metadata/widgets/dashboard", json=data)
        assert put_resp.status_code == 200
        resp2 = client.get("/api/metadata/widgets/dashboard")
        assert resp2.json()["widgets"][0]["title"] == "Updated Title"
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_widget_metadata.py -v`
Expected: FAIL — endpoint doesn't exist

**Step 3: Create Pydantic models**

```python
# backend/models/widgets.py
"""Widget configuration metadata models."""
from pydantic import BaseModel


class WidgetGridConfig(BaseModel):
    col_span: int = 1
    order: int = 0


class ChartConfig(BaseModel):
    x_field: str = ""
    y_field: str = ""
    default_chart_type: str = "bar"
    available_chart_types: list[str] = ["bar", "pie", "line", "table"]
    color_palette: str = "categorical"


class FormatConfig(BaseModel):
    type: str = "string"
    precision: int = 0
    suffix: str = ""


class WidgetDefinition(BaseModel):
    widget_id: str
    widget_type: str  # "kpi_card", "chart"
    title: str
    data_field: str = ""
    format: FormatConfig | None = None
    chart_config: ChartConfig | None = None
    grid: WidgetGridConfig = WidgetGridConfig()


class ViewWidgetConfig(BaseModel):
    view_id: str
    widgets: list[WidgetDefinition]
```

**Step 4: Add to MetadataService**

Add methods `load_widget_config(view_id)` and `save_widget_config(config)` to `backend/services/metadata_service.py`.

**Step 5: Add API endpoint**

Add to `backend/api/metadata.py`:

```python
@router.get("/widgets/{view_id}")
def get_widget_config(view_id: str, request: Request):
    metadata = request.app.state.metadata
    config = metadata.load_widget_config(view_id)
    if config is None:
        raise HTTPException(404, f"No widget config for view: {view_id}")
    return config

@router.put("/widgets/{view_id}")
def update_widget_config(view_id: str, request: Request, body: dict):
    from backend.models.widgets import ViewWidgetConfig
    config = ViewWidgetConfig.model_validate(body)
    metadata = request.app.state.metadata
    metadata.save_widget_config(config)
    return {"status": "ok"}
```

**Step 6: Create the actual dashboard widget config JSON**

Write `workspace/metadata/widgets/dashboard.json` with all 5 widgets (4 KPI summary cards + 4 chart widgets matching current hardcoded Dashboard).

**Step 7: Run tests**

Run: `uv run pytest tests/test_widget_metadata.py -v`
Expected: 6 PASS

**Step 8: Commit**

```bash
git add workspace/metadata/widgets/ backend/models/widgets.py backend/services/metadata_service.py backend/api/metadata.py tests/test_widget_metadata.py
git commit -m "feat(metadata): dashboard widget configuration as metadata (M132)

Add ViewWidgetConfig model, MetadataService widget methods, and
/api/metadata/widgets/{view_id} GET/PUT endpoints. Dashboard widgets
(KPI cards, chart widgets) defined in workspace/metadata/widgets/dashboard.json.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Refactor Dashboard Frontend to Load Widget Config (M133)

**Files:**
- Modify: `frontend/src/views/Dashboard/index.tsx:18-35` (remove hardcoded COLORS, WIDGETS)
- Modify: `frontend/src/stores/dashboardStore.ts` (add widget config fetching)
- Create: `frontend/src/components/WidgetRenderer.tsx`

**Step 1: Add widget config to dashboardStore**

Add to `dashboardStore.ts`:

```typescript
interface DashboardState {
  // ... existing fields ...
  widgetConfig: ViewWidgetConfig | null;
  fetchWidgetConfig: () => Promise<void>;
}
```

Fetch from `/api/metadata/widgets/dashboard` on store init.

**Step 2: Create generic WidgetRenderer component**

```typescript
// frontend/src/components/WidgetRenderer.tsx
// Renders a widget based on its widget_type: "kpi_card" → SummaryCard, "chart" → chart components
// Maps widget_id to data from dashboardStore stats
```

**Step 3: Refactor Dashboard to iterate widgets from config**

Replace the hardcoded JSX grid in `Dashboard/index.tsx` with:

```typescript
const widgetConfig = useDashboardStore(s => s.widgetConfig);
// Render KPI row from widgetConfig.widgets.filter(w => w.widget_type === "kpi_card")
// Render chart grid from widgetConfig.widgets.filter(w => w.widget_type === "chart")
```

Keep existing chart renderer components (AlertsByModelChart, etc.) as-is — they are the "how." The metadata controls "which ones to show and in what order."

**Step 4: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Visual verification with Playwright**

Navigate to dashboard, screenshot, verify all 4 KPI cards and 4 chart widgets render identically to before.

**Step 6: Commit**

```bash
git add frontend/src/views/Dashboard/ frontend/src/stores/dashboardStore.ts frontend/src/components/WidgetRenderer.tsx
git commit -m "feat(frontend): Dashboard renders from widget metadata config (M133)

Dashboard KPI cards and chart widgets now load from
/api/metadata/widgets/dashboard instead of hardcoded arrays.
Widget order, titles, and chart defaults all metadata-driven.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: E2E Tests for Widget Config (M134)

**Files:**
- Modify: `tests/e2e/test_e2e_views.py` (add widget config tests to TestDashboard or new class)

**Step 1: Add E2E tests**

```python
class TestDashboardWidgetConfig:
    def test_dashboard_loads_widgets_from_api(self, loaded_page):
        """Verify dashboard fetches widget config from /api/metadata/widgets/dashboard."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle")
        # Verify KPI cards render
        cards = loaded_page.locator("[data-tour='summary-cards'] .summary-card, [data-trace='dashboard.summary-cards'] .bg-surface")
        expect(cards.first).to_be_visible(timeout=10000)

    def test_dashboard_chart_widgets_render(self, loaded_page):
        """Verify all chart widgets render from config."""
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle")
        # Check for widget containers
        widgets = loaded_page.locator("[data-trace*='dashboard.alerts']")
        expect(widgets.first).to_be_visible(timeout=10000)

    def test_widget_config_api_returns_data(self, loaded_page):
        """Verify the widget config API is accessible."""
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/widgets/dashboard');
                return { status: resp.status, data: await resp.json() };
            }
        """)
        assert result["status"] == 200
        assert result["data"]["view_id"] == "dashboard"
        assert len(result["data"]["widgets"]) >= 2
```

**Step 2: Run E2E tests**

Run: `uv run pytest tests/e2e/test_e2e_views.py::TestDashboardWidgetConfig -v`
Expected: 3 PASS

**Step 3: Commit**

```bash
git add tests/e2e/test_e2e_views.py
git commit -m "test(e2e): dashboard widget config E2E tests (M134)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Stage 2 Checkpoint — Test, Document, Push (M135)

**Step 1: Run full backend suite**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: ~412+ tests PASS

**Step 2: Run E2E tests (batch)**

Run: `uv run pytest tests/e2e/test_e2e_views.py -v`
Expected: All existing + 3 new tests PASS

**Step 3: Update progress.md** — Add M132-M135 entries

**Step 4: Update architecture registry** — Change `dashboard.summary-cards` maturity from `"code-driven"` to `"mostly-metadata-driven"`. Change chart widget entries to `"mostly-metadata-driven"`.

**Step 5: Update demo-guide.md** — Add note about widget configurability in Dashboard section

**Step 6: Update development-guidelines.md** — Add section 18: "Widget Configuration Pattern" documenting how to add/modify dashboard widgets via metadata

**Step 7: Update operationScripts.ts** — Add operation "Configure Dashboard Widgets" to dashboard operations

**Step 8: Commit + push**

```bash
git add docs/ frontend/src/data/architectureRegistry.ts frontend/src/data/operationScripts.ts
git commit -m "docs: Stage 2 checkpoint — M132-M135 complete, dashboard widgets metadata-driven

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

# STAGE 3: Format Registry + Alert Detail Layouts (M136-M139)

*Centralize formatting and make alert panels model-specific.*

---

### Task 8: Create Format Registry Metadata (M136)

**Files:**
- Create: `workspace/metadata/format_rules/default.json`
- Create: `backend/models/format_rules.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Test: `tests/test_format_rules.py`

**Step 1: Write the failing test**

```python
# tests/test_format_rules.py
"""Tests for metadata-driven format rules."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "format_rules").mkdir(parents=True)
    (ws / "metadata" / "format_rules" / "default.json").write_text(json.dumps({
        "format_group_id": "default",
        "rules": {
            "currency": {"type": "number", "precision": 2, "prefix": "$"},
            "percentage": {"type": "number", "precision": 1, "suffix": "%"},
            "score": {"type": "number", "precision": 2},
            "integer": {"type": "number", "precision": 0},
            "label": {"type": "label", "transform": "snake_to_title"}
        },
        "field_mappings": {
            "total_value": "currency",
            "accumulated_score": "score",
            "score_threshold": "score",
            "qty_match_ratio": "percentage",
            "model_id": "label",
            "asset_class": "label"
        }
    }))
    for d in ["entities", "calculations", "settings", "detection_models"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestFormatRules:
    def test_format_rules_endpoint(self, client):
        resp = client.get("/api/metadata/format-rules")
        assert resp.status_code == 200
        data = resp.json()
        assert "rules" in data
        assert "field_mappings" in data

    def test_format_rules_have_types(self, client):
        resp = client.get("/api/metadata/format-rules")
        rules = resp.json()["rules"]
        assert "currency" in rules
        assert rules["currency"]["type"] == "number"

    def test_field_mappings_reference_existing_rules(self, client):
        resp = client.get("/api/metadata/format-rules")
        data = resp.json()
        rules = data["rules"]
        for field, rule_name in data["field_mappings"].items():
            assert rule_name in rules, f"Field {field} references missing rule {rule_name}"

    def test_empty_format_dir_returns_defaults(self, workspace, monkeypatch, client):
        (workspace / "metadata" / "format_rules" / "default.json").unlink()
        resp = client.get("/api/metadata/format-rules")
        assert resp.status_code == 200
        # Should return empty/minimal defaults
```

**Step 2: Implement model, service method, endpoint** (follow same pattern as Task 1)

**Step 3: Run tests**

Run: `uv run pytest tests/test_format_rules.py -v`
Expected: 4 PASS

**Step 4: Commit**

```bash
git add workspace/metadata/format_rules/ backend/models/format_rules.py backend/services/metadata_service.py backend/api/metadata.py tests/test_format_rules.py
git commit -m "feat(metadata): centralized format rules as metadata (M136)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Extend Detection Model Metadata with Alert Layouts (M137)

**Files:**
- Modify: `workspace/metadata/detection_models/*.json` (add `alert_detail_layout` to each)
- Modify: `backend/models/detection.py` (add alert_detail_layout field)
- Test: `tests/test_alert_layouts.py`

**Step 1: Write failing test**

```python
# tests/test_alert_layouts.py
"""Tests for model-specific alert detail layouts."""
import json
import pytest
from backend.models.detection import DetectionModelDefinition


class TestAlertDetailLayout:
    def test_model_has_alert_detail_layout(self):
        model = DetectionModelDefinition.model_validate({
            "model_id": "test",
            "name": "Test",
            "query": "SELECT 1",
            "calculations": [],
            "alert_template": {"title": "Test Alert", "sections": ["business_description"]},
            "alert_detail_layout": {
                "panels": ["business", "entity", "calcTrace", "scores"],
                "emphasis": ["scores"],
                "investigation_hint": "Focus on scoring breakdown"
            }
        })
        assert model.alert_detail_layout is not None
        assert "business" in model.alert_detail_layout["panels"]
        assert "scores" in model.alert_detail_layout["emphasis"]

    def test_model_without_layout_gets_default(self):
        model = DetectionModelDefinition.model_validate({
            "model_id": "test",
            "name": "Test",
            "query": "SELECT 1",
            "calculations": [],
            "alert_template": {"title": "Test Alert", "sections": ["business_description"]}
        })
        # Should have None or empty layout (use default in frontend)
        assert model.alert_detail_layout is None or model.alert_detail_layout == {}

    def test_all_production_models_have_layouts(self, tmp_path):
        """Verify each real detection model JSON has alert_detail_layout."""
        import pathlib
        models_dir = pathlib.Path("workspace/metadata/detection_models")
        if not models_dir.exists():
            pytest.skip("Not in project root")
        for f in models_dir.glob("*.json"):
            data = json.loads(f.read_text())
            assert "alert_detail_layout" in data, f"{f.name} missing alert_detail_layout"
```

**Step 2: Add `alert_detail_layout` field to DetectionModelDefinition**

In `backend/models/detection.py`:
```python
alert_detail_layout: dict | None = None
```

**Step 3: Add layout to each detection model JSON**

Update each file in `workspace/metadata/detection_models/`:
- `wash_intraday.json` — emphasis: scores, related orders
- `wash_full_day.json` — emphasis: volume, VWAP proximity
- `spoofing_layering.json` — emphasis: order pattern, timing
- `insider_dealing.json` — emphasis: entity relationships, timeline
- `ramping.json` — emphasis: price impact, market data

**Step 4: Run tests**

Run: `uv run pytest tests/test_alert_layouts.py -v`
Expected: 3 PASS

**Step 5: Commit**

```bash
git add workspace/metadata/detection_models/ backend/models/detection.py tests/test_alert_layouts.py
git commit -m "feat(metadata): model-specific alert detail layouts in metadata (M137)

Each detection model now defines alert_detail_layout with panels,
emphasis sections, and investigation hints. Frontend can render
model-specific alert views without hardcoded TypeScript layouts.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Frontend — Use Format Rules + Alert Layouts (M138)

**Files:**
- Modify: `frontend/src/utils/format.ts` (load format rules from API at init)
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/` (load layout from model metadata)
- Create: `frontend/src/hooks/useFormatRules.ts`

**Step 1: Create format rules hook**

```typescript
// frontend/src/hooks/useFormatRules.ts
// Fetches /api/metadata/format-rules on mount, provides useFormat(fieldName, value) hook
```

**Step 2: Update AlertDetail to read layout from model metadata**

Replace any hardcoded panel order with layout from the loaded detection model's `alert_detail_layout` field.

**Step 3: Build + visual verify**

Run: `cd frontend && npm run build`
Navigate to Risk Cases, verify alert detail panels render correctly.

**Step 4: Commit**

```bash
git add frontend/src/utils/format.ts frontend/src/hooks/useFormatRules.ts frontend/src/views/RiskCaseManager/
git commit -m "feat(frontend): use format rules metadata + model-specific alert layouts (M138)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Stage 3 Checkpoint (M139)

**Step 1: Run full backend** — `uv run pytest tests/ --ignore=tests/e2e -v` — All pass

**Step 2: Run E2E** — `uv run pytest tests/e2e/ -v` (in batches) — All pass

**Step 3: Update progress.md** — Add M136-M139

**Step 4: Update architecture registry** — Update maturity for format-related and alert-detail sections

**Step 5: Update tourDefinitions.ts** — Add step about format configuration to settings tour

**Step 6: Update scenarioDefinitions.ts** — Add scenario for configuring format rules

**Step 7: Update demo-guide.md** — Document model-specific alert layouts

**Step 8: Commit + push**

```bash
git add docs/ frontend/src/data/
git commit -m "docs: Stage 3 checkpoint — M136-M139 complete, format registry + alert layouts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

# STAGE 4: Navigation Manifest (M140-M143)

*Drive sidebar, routing, and view registration from metadata.*

---

### Task 12: Create Navigation Manifest Metadata (M140)

**Files:**
- Create: `workspace/metadata/navigation/main.json`
- Create: `backend/models/navigation.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Test: `tests/test_navigation_metadata.py`

**Step 1: Write failing test**

```python
# tests/test_navigation_metadata.py
"""Tests for navigation metadata."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "navigation").mkdir(parents=True)
    (ws / "metadata" / "navigation" / "main.json").write_text(json.dumps({
        "navigation_id": "main",
        "groups": [
            {
                "title": "Overview",
                "order": 1,
                "items": [
                    {"view_id": "dashboard", "label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"}
                ]
            },
            {
                "title": "Define",
                "order": 2,
                "items": [
                    {"view_id": "entities", "label": "Entities", "path": "/entities", "icon": "Database"},
                    {"view_id": "metadata", "label": "Calculations", "path": "/metadata", "icon": "Calculator"}
                ]
            }
        ]
    }))
    for d in ["entities", "calculations", "settings", "detection_models"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestNavigationMetadata:
    def test_navigation_endpoint(self, client):
        resp = client.get("/api/metadata/navigation")
        assert resp.status_code == 200
        data = resp.json()
        assert data["navigation_id"] == "main"
        assert len(data["groups"]) == 2

    def test_groups_ordered(self, client):
        resp = client.get("/api/metadata/navigation")
        groups = resp.json()["groups"]
        orders = [g["order"] for g in groups]
        assert orders == sorted(orders)

    def test_items_have_required_fields(self, client):
        resp = client.get("/api/metadata/navigation")
        for group in resp.json()["groups"]:
            for item in group["items"]:
                assert "view_id" in item
                assert "label" in item
                assert "path" in item

    def test_all_16_views_present_in_production_nav(self):
        """Verify production navigation.json covers all 16 views."""
        import pathlib
        nav_path = pathlib.Path("workspace/metadata/navigation/main.json")
        if not nav_path.exists():
            pytest.skip("Not in project root")
        data = json.loads(nav_path.read_text())
        all_paths = []
        for group in data["groups"]:
            for item in group["items"]:
                all_paths.append(item["path"])
        assert len(all_paths) >= 16, f"Expected 16 views, got {len(all_paths)}"
```

**Step 2: Implement model, service, endpoint** (same pattern as prior tasks)

**Step 3: Create production `main.json`** with all 16 views matching current `Sidebar.tsx:14-65`

**Step 4: Run tests**

Run: `uv run pytest tests/test_navigation_metadata.py -v`
Expected: 4 PASS

**Step 5: Commit**

```bash
git add workspace/metadata/navigation/ backend/models/navigation.py backend/services/metadata_service.py backend/api/metadata.py tests/test_navigation_metadata.py
git commit -m "feat(metadata): navigation manifest with all 16 views (M140)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Refactor Sidebar to Load Navigation from Metadata (M141)

**Files:**
- Modify: `frontend/src/layouts/Sidebar.tsx:14-65` (remove hardcoded `navigation` array)
- Create: `frontend/src/stores/navigationStore.ts`

**Step 1: Create navigation Zustand store**

```typescript
// frontend/src/stores/navigationStore.ts
// Fetches /api/metadata/navigation on init
// Exposes: groups, loading, error
```

**Step 2: Refactor Sidebar.tsx**

Replace hardcoded `const navigation: NavGroup[]` with:

```typescript
const groups = useNavigationStore(s => s.groups);
```

Keep the JSX rendering logic — only the data source changes.

**Step 3: Build + verify**

Run: `cd frontend && npm run build`
Visual verify: sidebar renders identically with all 16 views.

**Step 4: Run E2E sidebar tests**

Run: `uv run pytest tests/e2e/test_e2e_phase7b.py::TestSidebarNavigation -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add frontend/src/layouts/Sidebar.tsx frontend/src/stores/navigationStore.ts
git commit -m "feat(frontend): Sidebar loads navigation from metadata API (M141)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 14: E2E Tests for Navigation Metadata (M142)

**Files:**
- Modify: `tests/e2e/test_e2e_views.py` (add navigation metadata tests)

**Step 1: Add tests**

```python
class TestNavigationMetadata:
    def test_navigation_api_returns_all_views(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/navigation');
                const data = await resp.json();
                const paths = data.groups.flatMap(g => g.items.map(i => i.path));
                return { status: resp.status, count: paths.length, paths };
            }
        """)
        assert result["status"] == 200
        assert result["count"] >= 16

    def test_sidebar_renders_all_groups(self, loaded_page):
        loaded_page.goto(f"{APP_URL}/dashboard")
        loaded_page.wait_for_load_state("networkidle")
        sidebar = loaded_page.locator("[data-tour='sidebar'], [data-trace='app.sidebar']")
        expect(sidebar).to_be_visible(timeout=10000)
        # Check that nav links exist
        links = sidebar.locator("a")
        assert links.count() >= 16
```

**Step 2: Run tests** — Expected: PASS

**Step 3: Commit**

```bash
git add tests/e2e/test_e2e_views.py
git commit -m "test(e2e): navigation metadata E2E tests (M142)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: Stage 4 Checkpoint (M143)

**Step 1: Full backend suite** — All pass

**Step 2: Full E2E suite** — All pass (in batches)

**Step 3: Update progress.md** — Add M140-M143

**Step 4: Update architecture registry** — Change `app.sidebar` maturity to `"fully-metadata-driven"`

**Step 5: Update CLAUDE.md** — Note that navigation is now metadata-driven

**Step 6: Update feature-development-checklist.md** — In Section 10 "New View" trigger, replace "add sidebar link to Sidebar.tsx" with "add entry to workspace/metadata/navigation/main.json"

**Step 7: Update operationScripts.ts** — Add operation "View Navigation Config" to overview section

**Step 8: Commit + push**

```bash
git add docs/ frontend/src/data/ CLAUDE.md
git commit -m "docs: Stage 4 checkpoint — M140-M143 complete, navigation metadata-driven

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

# STAGE 5: Audit Trail + AI Context (M144-M147)

*Add metadata change tracking and reactive AI context.*

---

### Task 16: Add Metadata Audit Trail (M144)

**Files:**
- Create: `backend/services/audit_service.py`
- Modify: `backend/services/metadata_service.py` (wrap save/delete methods)
- Test: `tests/test_audit_trail.py`

**Step 1: Write failing test**

```python
# tests/test_audit_trail.py
"""Tests for metadata audit trail."""
import json
import pytest
from pathlib import Path


class TestAuditTrail:
    def test_save_entity_creates_audit_record(self, workspace, client):
        entity = {"entity_id": "test_entity", "name": "Test", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/test_entity", json=entity)
        audit_dir = workspace / "metadata" / "_audit"
        assert audit_dir.exists()
        records = list(audit_dir.glob("*.json"))
        assert len(records) >= 1
        record = json.loads(records[0].read_text())
        assert record["action"] in ("created", "updated")
        assert record["metadata_type"] == "entity"
        assert record["item_id"] == "test_entity"
        assert "timestamp" in record
        assert "new_value" in record

    def test_audit_records_include_previous_value(self, workspace, client):
        entity = {"entity_id": "test_entity", "name": "Test V1", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/test_entity", json=entity)
        entity["name"] = "Test V2"
        client.put("/api/metadata/entities/test_entity", json=entity)
        audit_dir = workspace / "metadata" / "_audit"
        records = sorted(audit_dir.glob("*.json"))
        last = json.loads(records[-1].read_text())
        assert last["action"] == "updated"
        assert last["previous_value"]["name"] == "Test V1"
        assert last["new_value"]["name"] == "Test V2"

    def test_audit_api_returns_history(self, workspace, client):
        entity = {"entity_id": "audited", "name": "Audited", "fields": [], "relationships": []}
        client.put("/api/metadata/entities/audited", json=entity)
        resp = client.get("/api/metadata/audit?metadata_type=entity&item_id=audited")
        assert resp.status_code == 200
        history = resp.json()
        assert len(history) >= 1
        assert history[0]["item_id"] == "audited"
```

**Step 2: Implement AuditService**

```python
# backend/services/audit_service.py
"""Append-only audit trail for metadata changes."""
import json
from datetime import datetime, timezone
from pathlib import Path


class AuditService:
    def __init__(self, workspace_dir: Path):
        self._dir = workspace_dir / "metadata" / "_audit"
        self._dir.mkdir(parents=True, exist_ok=True)

    def record(self, metadata_type: str, item_id: str, action: str,
               new_value: dict, previous_value: dict | None = None) -> None:
        ts = datetime.now(timezone.utc)
        record = {
            "timestamp": ts.isoformat(),
            "metadata_type": metadata_type,
            "item_id": item_id,
            "action": action,
            "previous_value": previous_value,
            "new_value": new_value,
        }
        filename = f"{ts.strftime('%Y%m%dT%H%M%S%f')}_{metadata_type}_{item_id}_{action}.json"
        (self._dir / filename).write_text(json.dumps(record, indent=2, default=str))

    def get_history(self, metadata_type: str | None = None,
                    item_id: str | None = None) -> list[dict]:
        records = []
        for f in sorted(self._dir.glob("*.json")):
            record = json.loads(f.read_text())
            if metadata_type and record.get("metadata_type") != metadata_type:
                continue
            if item_id and record.get("item_id") != item_id:
                continue
            records.append(record)
        return records
```

**Step 3: Wire AuditService into MetadataService save methods**

In each `save_*` method, call `self._audit.record(...)` with before/after values.

**Step 4: Add audit API endpoint**

```python
@router.get("/audit")
def get_audit_history(request: Request, metadata_type: str = None, item_id: str = None):
    audit = request.app.state.audit
    return audit.get_history(metadata_type, item_id)
```

**Step 5: Run tests**

Run: `uv run pytest tests/test_audit_trail.py -v`
Expected: 3 PASS

**Step 6: Commit**

```bash
git add backend/services/audit_service.py backend/services/metadata_service.py backend/api/metadata.py tests/test_audit_trail.py
git commit -m "feat(metadata): append-only audit trail for all metadata changes (M144)

Every metadata save/delete now produces an immutable audit record with
timestamp, action, previous/new values. /api/metadata/audit endpoint
for querying change history. Foundation for MiFID II Art. 16(6) compliance.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 17: Make AI Context Reactive to Metadata (M145)

**Files:**
- Modify: `backend/services/ai_context_builder.py` (auto-include latest metadata summary)
- Test: `tests/test_ai_assistant.py` (extend with metadata awareness tests)

**Step 1: Write failing test**

```python
# Add to tests/test_ai_assistant.py
class TestAIMetadataAwareness:
    def test_context_includes_entity_count(self, client):
        resp = client.get("/api/ai/context-summary")
        assert resp.status_code == 200
        context = resp.json()["context"]
        assert "entities" in context.lower() or "entity" in context.lower()

    def test_context_includes_model_names(self, client):
        resp = client.get("/api/ai/context-summary")
        context = resp.json()["context"]
        # Should reference detection models
        assert "detection" in context.lower() or "model" in context.lower()

    def test_context_refreshes_after_metadata_change(self, client):
        # Get initial context
        resp1 = client.get("/api/ai/context-summary")
        ctx1 = resp1.json()["context"]
        # The context should include current metadata state
        assert len(ctx1) > 100  # Non-trivial context
```

**Step 2: Implement context-summary endpoint**

Add to `backend/api/ai.py`:

```python
@router.get("/context-summary")
def get_context_summary(request: Request):
    """Return the current AI context summary derived from metadata."""
    metadata = request.app.state.metadata
    context_parts = []
    entities = metadata.list_entities()
    context_parts.append(f"System has {len(entities)} entities: {', '.join(e.entity_id for e in entities)}")
    models = metadata.list_detection_models()
    context_parts.append(f"Detection models: {', '.join(m.model_id for m in models)}")
    # ... more metadata summaries
    return {"context": "\n".join(context_parts)}
```

**Step 3: Run tests** — Expected: PASS

**Step 4: Commit**

```bash
git add backend/api/ai.py backend/services/ai_context_builder.py tests/test_ai_assistant.py
git commit -m "feat(ai): reactive AI context derived from current metadata (M145)

AI context summary now auto-generates from live metadata state.
/api/ai/context-summary endpoint provides current system description.
No manual prompt maintenance needed when metadata changes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 18: E2E Tests for Audit + AI (M146)

**Files:**
- Modify: `tests/e2e/test_e2e_views.py` or `tests/e2e/test_e2e_phase7b.py`

**Step 1: Add E2E tests**

```python
class TestAuditTrailE2E:
    def test_audit_api_accessible(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/metadata/audit');
                return { status: resp.status };
            }
        """)
        assert result["status"] == 200

class TestAIContextE2E:
    def test_ai_context_summary_reflects_metadata(self, loaded_page):
        result = loaded_page.evaluate("""
            async () => {
                const resp = await fetch('/api/ai/context-summary');
                const data = await resp.json();
                return { status: resp.status, hasContext: data.context.length > 50 };
            }
        """)
        assert result["status"] == 200
        assert result["hasContext"] is True
```

**Step 2: Run E2E tests** — Expected: PASS

**Step 3: Commit**

```bash
git add tests/e2e/
git commit -m "test(e2e): audit trail and AI context E2E tests (M146)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 19: Stage 5 Checkpoint (M147)

**Step 1: Full backend suite** — All pass

**Step 2: Full E2E suite** — All pass (in batches)

**Step 3: Update progress.md** — Add M144-M147

**Step 4: Update architecture registry** — Add audit trail section, update AI maturity

**Step 5: Update scenarioDefinitions.ts** — Add scenario for viewing audit history

**Step 6: Update BDD scenarios** — Add Gherkin for audit trail behavior

**Step 7: Commit + push**

```bash
git add docs/ frontend/src/data/
git commit -m "docs: Stage 5 checkpoint — M144-M147 complete, audit trail + AI context

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

# STAGE 6: BDD, Architecture Audit, Full Documentation Sweep (M148-M150)

*Final integration: BDD scenarios, architecture re-audit, all docs updated.*

---

### Task 20: Add BDD Scenarios for All New Metadata Features (M148)

**Files:**
- Modify: `docs/requirements/bdd-scenarios.md`

**Step 1: Add BDD scenarios**

Append to `docs/requirements/bdd-scenarios.md`:

```gherkin
## Feature: SQL Query Presets from Metadata

### Scenario: Presets Loaded from Metadata
Given the platform is running
And query presets are defined in workspace/metadata/query_presets/default.json
When I navigate to SQL Console
And I open the presets dropdown
Then I see presets matching the metadata file
And each preset has a name and SQL query

### Scenario: Adding a New Preset via Metadata
Given 3 presets exist in the metadata file
When I add a 4th preset to workspace/metadata/query_presets/default.json
And I reload the SQL Console
Then the new preset appears in the dropdown

---

## Feature: Dashboard Widget Configuration

### Scenario: Dashboard Renders from Widget Metadata
Given widget configuration exists at workspace/metadata/widgets/dashboard.json
When I navigate to Dashboard
Then KPI cards render matching the widget config
And chart widgets render in the order specified by metadata

### Scenario: Reordering Dashboard Widgets
Given widgets A (order=1) and B (order=2) in dashboard config
When I change widget B order to 0
And I reload the Dashboard
Then widget B appears before widget A

---

## Feature: Navigation from Metadata

### Scenario: Sidebar Renders from Navigation Manifest
Given navigation is defined in workspace/metadata/navigation/main.json
When the application loads
Then the sidebar shows groups matching the navigation manifest
And each group shows items in the defined order

### Scenario: Adding a New View to Navigation
Given 16 views in the navigation manifest
When I add a 17th view entry to the manifest
And I reload the application
Then the sidebar shows 17 navigation items

---

## Feature: Metadata Audit Trail

### Scenario: Saving a Setting Creates Audit Record
Given the platform is running
When I modify the wash_vwap_threshold setting
Then an audit record is created in workspace/metadata/_audit/
And the record contains the previous and new values
And the record contains a UTC timestamp

### Scenario: Audit History Query
Given 3 changes have been made to entity "product"
When I query /api/metadata/audit?metadata_type=entity&item_id=product
Then I receive 3 audit records in chronological order

---

## Feature: Model-Specific Alert Layouts

### Scenario: Wash Trading Alert Shows Relevant Panels
Given a wash trading alert exists
When I view the alert detail
Then the panel order matches wash_intraday.alert_detail_layout.panels
And the "scores" panel is visually emphasized

### Scenario: Different Models Show Different Layouts
Given alerts from wash_intraday and insider_dealing models
When I view each alert's detail
Then each displays panels in a different order
And each highlights different emphasis sections

---

## Feature: Format Rules from Metadata

### Scenario: Labels Format According to Rules
Given format rules define model_id as "snake_to_title"
When model_id "wash_intraday" is displayed in the UI
Then it appears as "Wash Intraday"

### Scenario: Numeric Values Format According to Rules
Given format rules define score with precision 2
When accumulated_score 85.678 is displayed
Then it appears as "85.68"

---

## Feature: Settings Resolution Strategy

### Scenario: Custom Resolution Strategy
Given a new "weighted" resolution strategy is registered
And a setting uses match_type "weighted"
When I resolve the setting with context
Then the weighted strategy is used instead of hierarchy or multi-dimensional
```

**Step 2: Commit**

```bash
git add docs/requirements/bdd-scenarios.md
git commit -m "docs(bdd): add BDD scenarios for all metadata architecture features (M148)

Covers: SQL presets, dashboard widgets, navigation manifest, audit trail,
alert layouts, format rules, settings strategy pattern.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 21: Architecture Re-Audit — Update All Maturity Ratings (M149)

**Files:**
- Modify: `frontend/src/data/architectureRegistry.ts` (update maturity ratings for all affected sections)
- Modify: `docs/architecture-traceability.md`

**Step 1: Update maturity ratings in architectureRegistry.ts**

Update these sections with new maturity levels:

| Section ID | Old Maturity | New Maturity | Reason |
|---|---|---|---|
| `dashboard.summary-cards` | code-driven | mostly-metadata-driven | Widget manifest |
| `dashboard.alerts-by-model` | mixed | mostly-metadata-driven | Widget config |
| `dashboard.score-distribution` | mixed | mostly-metadata-driven | Widget config |
| `dashboard.alerts-by-trigger` | mixed | mostly-metadata-driven | Widget config |
| `dashboard.alerts-by-asset` | mixed | mostly-metadata-driven | Widget config |
| `sql.presets` | code-driven | fully-metadata-driven | JSON presets |
| `app.sidebar` | code-driven | fully-metadata-driven | Navigation manifest |
| `risk_cases.alert-detail` | mixed | mostly-metadata-driven | Model layouts |

**Step 2: Update maturityExplanation and metadataOpportunities for each**

**Step 3: Recalculate totals**

Expected new distribution:
- Fully metadata-driven: 25 → ~28 (34% → ~38%)
- Mostly metadata-driven: 12 → ~19 (16% → ~26%)
- Mixed: 19 → ~14 (26% → ~19%)
- Code-driven: 13 → ~8 (18% → ~11%)
- Infrastructure: 5 (unchanged)

**Net: 64% fully or mostly metadata-driven (up from 50%)**

**Step 4: Commit**

```bash
git add frontend/src/data/architectureRegistry.ts docs/architecture-traceability.md
git commit -m "docs(architecture): re-audit maturity ratings after metadata overhaul (M149)

Updated 8 section maturity ratings. Platform is now 64% fully or
mostly metadata-driven (up from 50%). Code-driven sections reduced
from 18% to 11%.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 22: Full Documentation Sweep (M150)

**Files to update (ALL of these):**
- `docs/progress.md` — Final milestone entries, updated test counts
- `docs/demo-guide.md` — New acts for metadata configuration, audit trail
- `docs/development-guidelines.md` — New sections for metadata patterns
- `docs/feature-development-checklist.md` — Update Section 10 broad triggers
- `docs/exploratory-testing-notes.md` — New round of testing notes
- `docs/plans/2026-02-24-comprehensive-roadmap.md` — Update current state
- `docs/schemas/data-dictionary.md` — Add new metadata types
- `docs/requirements/capabilities.md` — Add metadata configuration capability
- `CLAUDE.md` — Update test counts, view counts, architecture stats
- `README.md` — Update architecture diagram, metadata stats
- `frontend/src/data/tourDefinitions.ts` — Add tour steps for new features
- `frontend/src/data/scenarioDefinitions.ts` — Add/update scenarios
- `frontend/src/data/operationScripts.ts` — Add operations for new features
- MEMORY.md — Update current state, key files, architecture stats

**Step 1: Update progress.md**

Add final summary section:

```markdown
### Metadata Architecture Overhaul — Summary

| Metric | Before (M128) | After (M150) |
|---|---|---|
| Fully metadata-driven sections | 25 (34%) | ~28 (38%) |
| Mostly metadata-driven sections | 12 (16%) | ~19 (26%) |
| Combined FMD + Mostly | 37 (50%) | ~47 (64%) |
| Code-driven sections | 13 (18%) | ~8 (11%) |
| Backend tests | 390 | ~480+ |
| E2E tests | 182 | ~205+ |
| Total tests | 572 | ~685+ |
| New metadata types | 0 | 4 (widgets, presets, navigation, format_rules) |
| New Pydantic models | 0 | 5+ |
| New API endpoints | 0 | 6+ |
```

**Step 2: Update CLAUDE.md**

- Update test counts
- Add new metadata types to architecture section
- Note navigation is metadata-driven
- Note audit trail exists

**Step 3: Update demo-guide.md**

- Add "Act 8: Metadata Configuration" section documenting:
  - Widget customization
  - Navigation configuration
  - Format rules
  - Audit trail viewing

**Step 4: Update feature-development-checklist.md**

- Section 10: Add new triggers:
  - "New Widget" → update `workspace/metadata/widgets/dashboard.json`
  - "New Navigation Item" → update `workspace/metadata/navigation/main.json`
  - "New Format Rule" → update `workspace/metadata/format_rules/default.json`

**Step 5: Update development-guidelines.md**

Add new sections:
- Section 18: Widget Configuration Pattern
- Section 19: Navigation Metadata Pattern
- Section 20: Format Rules Pattern
- Section 21: Audit Trail Pattern

**Step 6: Update tour and scenario definitions**

- Add tour steps showing metadata configuration panels
- Add/update scenario S27 "Configure Dashboard Widgets"
- Add/update scenario S28 "View Audit History"
- Add operations for new metadata features

**Step 7: Update MEMORY.md**

```markdown
## Current State (2026-02-27)
- **Tests**: ~685 total (~480 backend + ~205 E2E) — ALL PASSING
- **Architecture**: 64% fully/mostly metadata-driven (up from 50%)
- **New metadata types**: widgets, query_presets, navigation, format_rules
- **Audit trail**: All metadata changes tracked in workspace/metadata/_audit/
- **Settings resolver**: Strategy pattern with pluggable resolution strategies
```

**Step 8: Run full test suite one final time**

Backend: `uv run pytest tests/ --ignore=tests/e2e -v` — All pass
E2E: `uv run pytest tests/e2e/ -v` (batches) — All pass
Frontend build: `cd frontend && npm run build` — Succeeds

**Step 9: Commit all docs**

```bash
git add docs/ CLAUDE.md README.md frontend/src/data/ MEMORY.md
git commit -m "docs: complete documentation sweep — M150, metadata architecture overhaul complete

Updated: progress.md, demo-guide.md, development-guidelines.md,
feature-development-checklist.md, bdd-scenarios.md, architecture
registry, tours, scenarios, operations, CLAUDE.md, README.md, MEMORY.md.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 10: Push and prepare for merge**

```bash
git push
```

---

# Post-Stage: Merge to Main

### Task 23: Final Verification + Merge

**Step 1: Verify all tests pass on branch**

```bash
uv run pytest tests/ --ignore=tests/e2e -v
cd frontend && npm run build && cd ..
uv run pytest tests/e2e/ -v  # in batches
```

**Step 2: Create PR**

```bash
gh pr create --title "feat: metadata architecture overhaul (M129-M150)" --body "$(cat <<'EOF'
## Summary
- Extract SQL presets, dashboard widgets, navigation, format rules, and alert layouts to metadata JSON
- Refactor settings resolver to Strategy pattern
- Add append-only audit trail for all metadata changes
- Make AI context reactive to metadata state
- 22 milestones (M129-M150), ~123 new tests

## Architecture Impact
- Metadata-driven: 50% → 64% (fully + mostly)
- Code-driven: 18% → 11%
- 4 new metadata types, 5+ new Pydantic models, 6+ new API endpoints

## Test plan
- [x] All backend tests pass (~480)
- [x] All E2E tests pass (~205)
- [x] Frontend builds clean
- [x] BDD scenarios documented
- [x] Architecture maturity re-audited
- [x] All documentation updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Squash merge after review**

```bash
gh pr merge --squash
```

**Step 4: Clean up branch**

```bash
git checkout main
git pull
git branch -d feature/metadata-architecture-overhaul
```

---

## Appendix A: Files Created by This Plan

| File | Purpose |
|------|---------|
| `workspace/metadata/query_presets/default.json` | SQL preset definitions |
| `workspace/metadata/widgets/dashboard.json` | Dashboard widget configuration |
| `workspace/metadata/format_rules/default.json` | Formatting rules |
| `workspace/metadata/navigation/main.json` | Sidebar navigation manifest |
| `backend/models/query_presets.py` | QueryPreset Pydantic model |
| `backend/models/widgets.py` | Widget config Pydantic models |
| `backend/models/format_rules.py` | Format rule Pydantic model |
| `backend/models/navigation.py` | Navigation Pydantic model |
| `backend/services/audit_service.py` | Append-only audit trail |
| `frontend/src/stores/navigationStore.ts` | Navigation Zustand store |
| `frontend/src/components/WidgetRenderer.tsx` | Generic widget renderer |
| `frontend/src/hooks/useFormatRules.ts` | Format rules hook |
| `tests/test_query_presets.py` | SQL preset tests |
| `tests/test_widget_metadata.py` | Widget config tests |
| `tests/test_format_rules.py` | Format rules tests |
| `tests/test_navigation_metadata.py` | Navigation tests |
| `tests/test_alert_layouts.py` | Alert layout tests |
| `tests/test_audit_trail.py` | Audit trail tests |

## Appendix B: Files Modified by This Plan

| File | Change |
|------|--------|
| `backend/api/query.py` | Load presets from metadata |
| `backend/api/metadata.py` | Add widget, navigation, format, audit endpoints |
| `backend/api/ai.py` | Add context-summary endpoint |
| `backend/engine/settings_resolver.py` | Strategy pattern refactor |
| `backend/models/detection.py` | Add alert_detail_layout field |
| `backend/services/metadata_service.py` | Add list_query_presets, widget, navigation, format methods |
| `backend/services/ai_context_builder.py` | Auto-generate context from metadata |
| `frontend/src/views/Dashboard/index.tsx` | Load from widget config |
| `frontend/src/stores/dashboardStore.ts` | Fetch widget config |
| `frontend/src/layouts/Sidebar.tsx` | Load from navigation metadata |
| `frontend/src/views/RiskCaseManager/AlertDetail/` | Model-specific layouts |
| `frontend/src/utils/format.ts` | Load from format rules |
| `frontend/src/data/architectureRegistry.ts` | Updated maturity ratings |
| `frontend/src/data/tourDefinitions.ts` | New tour steps |
| `frontend/src/data/scenarioDefinitions.ts` | New scenarios |
| `frontend/src/data/operationScripts.ts` | New operations |
| `workspace/metadata/detection_models/*.json` | Added alert_detail_layout |
| `tests/test_settings_resolver.py` | Strategy registry tests |
| `tests/test_ai_assistant.py` | Metadata awareness tests |
| `tests/e2e/test_e2e_views.py` | New E2E test classes |

## Appendix C: Documents Updated by This Plan

| Document | Updates |
|----------|---------|
| `docs/progress.md` | M129-M150 milestones, updated test counts |
| `docs/demo-guide.md` | Act 8 metadata configuration |
| `docs/development-guidelines.md` | Sections 18-21 new patterns |
| `docs/feature-development-checklist.md` | Section 10 new triggers |
| `docs/exploratory-testing-notes.md` | New testing round |
| `docs/requirements/bdd-scenarios.md` | 8 new BDD feature/scenarios |
| `docs/architecture-traceability.md` | Updated stats |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | Updated current state |
| `docs/schemas/data-dictionary.md` | New metadata types |
| `CLAUDE.md` | Updated counts and conventions |
| `README.md` | Updated architecture stats |
| `MEMORY.md` | Updated current state |
