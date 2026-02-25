# Phase 7 Completion + Metadata UX & Guided Demo — Design Document

**Date:** 2026-02-25
**Status:** Approved
**Priority:** P0 — Next implementation priority
**Depends on:** Phases 1-6, Phase 12 (all complete)

---

## Executive Summary

This design covers four interconnected workstreams:

1. **Gap Fixes (G1-G3):** Complete Phase 7 by migrating calculation SQL to use `$param` placeholders, fixing TimeRangeSelector date defaults, and adding missing settings overrides for `fixed_income` and `index` asset classes.

2. **Domain Value Suggestion System:** A unified backend API + frontend component system that powers autocomplete/dropdown suggestions across all metadata forms — settings overrides, model composition, calculation editing, entity design.

3. **Reusable Pattern Libraries:** Match Pattern Bank (reusable override criteria) and Score Step Template Bank (reusable scoring tiers), plus a Use Case Studio for building, validating, and submitting custom detection scenarios.

4. **Comprehensive Guided Tour & Demo System:** 25+ interactive scenarios covering every E2E business workflow, with dual-mode execution (narrated auto-play + interactive try-it-yourself), per-screen operation scripts, and contextual help.

---

## 1. Gap Fixes (G1, G2, G3)

### G1: Migrate Calculation SQL to $param Placeholders

**Problem:** All 10 calculation JSONs contain hardcoded threshold values in their SQL `logic` field (e.g., `0.02`, `1.5`, `17:00:00`). The `$param_name` substitution framework exists in `calculation_engine.py` (lines 164-210) but no calculation uses it. This means settings changes have no effect on detection results.

**Solution:** Update all 10 calculation JSONs to:
1. Replace hardcoded values in SQL with `$param_name` placeholders
2. Add structured `parameters` entries: `{"source": "setting", "setting_id": "...", "default": ...}`
3. Verify detection results are identical before and after migration (regression test)

**Files to modify:**
- `workspace/metadata/calculations/transaction/value_calc.json`
- `workspace/metadata/calculations/transaction/adjusted_direction.json`
- `workspace/metadata/calculations/time_windows/business_date_window.json`
- `workspace/metadata/calculations/time_windows/cancellation_pattern.json`
- `workspace/metadata/calculations/time_windows/market_event_window.json`
- `workspace/metadata/calculations/time_windows/trend_window.json`
- `workspace/metadata/calculations/aggregations/trading_activity_aggregation.json`
- `workspace/metadata/calculations/aggregations/vwap_calc.json`
- `workspace/metadata/calculations/derived/large_trading_activity.json`
- `workspace/metadata/calculations/derived/wash_detection.json`
- `tests/test_calculation_engine.py` — add regression tests
- `tests/test_detection_engine.py` — verify alert output unchanged

**Specific migrations (per calculation):**

| Calculation | Hardcoded Value | Parameter Name | Setting ID |
|---|---|---|---|
| `business_date_window` | `17:00:00` (cutoff time) | `$cutoff_time` | `business_date_cutoff` |
| `cancellation_pattern` | `>= 3` (cancel threshold) | `$cancel_threshold` | `cancel_count_threshold` |
| `trend_window` | `* 1.5` (trend multiplier) | `$trend_multiplier` | `trend_sensitivity` |
| `market_event_window` | `0.05` (event threshold) | `$event_threshold` | `market_event_threshold` |
| `vwap_calc` | `0.02` (vwap proximity) | `$vwap_threshold` | `wash_vwap_threshold` |
| `large_trading_activity` | `* 2.0` (activity multiplier) | `$activity_multiplier` | `large_activity_multiplier` |
| `wash_detection` | Various thresholds | `$wash_qty_threshold`, `$wash_time_threshold` | Corresponding settings |
| `trading_activity_aggregation` | Possible hardcoded values | Audit and parameterize | — |
| `value_calc` | None expected (pure calculation) | Audit | — |
| `adjusted_direction` | None expected (pure logic) | Audit | — |

**Verification:** Run full detection pipeline before and after. Alert count, alert IDs, and scores must be identical.

### G2: Fix TimeRangeSelector Date Defaults

**Problem:** `frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx` (lines 28-36) uses `new Date()` to compute date ranges. Demo data has fixed historical dates (2024-2025), so time filters produce empty results.

**Solution:**
1. Add backend endpoint: `GET /api/data/date-range/{entity}` — returns `{min_date, max_date}` from actual data
2. Frontend `TimeRangeSelector` seeds ranges from the max date in market data, not from `new Date()`
3. Store the date range in metadata store for reuse across components

**Files to modify:**
- Create: `backend/api/data.py` — new data info endpoints (or add to existing router)
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx`
- Modify: `frontend/src/stores/metadataStore.ts` — add date range state

### G3: Add Missing Settings Overrides

**Problem:** Products with `asset_class` values `fixed_income` and `index` have zero overrides across all 15 settings files, falling back to defaults silently.

**Solution:**
1. Add appropriate overrides for `fixed_income` and `index` to relevant settings files
2. Use domain-appropriate values (e.g., lower thresholds for fixed income due to less volatile markets)
3. Create match patterns for these asset classes (feeds into Section 3 below)

**Files to modify:**
- `workspace/metadata/settings/thresholds/wash_vwap_threshold.json`
- `workspace/metadata/settings/thresholds/cancel_count_threshold.json`
- `workspace/metadata/settings/score_thresholds/wash_score_threshold.json`
- `workspace/metadata/settings/score_thresholds/mpr_score_threshold.json`
- `workspace/metadata/settings/score_thresholds/spoofing_score_threshold.json`
- `workspace/metadata/settings/model_params/trend_sensitivity.json`
- `workspace/metadata/settings/model_params/large_activity_multiplier.json`
- `workspace/metadata/settings/model_params/insider_lookback_days.json`
- Additional settings as appropriate

**Overrides to add per asset class:**

| Setting | fixed_income | index | Rationale |
|---|---|---|---|
| wash_vwap_threshold | 0.01 (tighter, less volatile) | 0.015 | Bond markets have tighter spreads; index less volatile than single stocks |
| cancel_count_threshold | 5 (higher, more cancellations normal) | 4 | Bond trading has more legitimate cancellations |
| trend_sensitivity | 1.2 (lower, slower moving) | 1.3 | Fixed income trends are slower |
| large_activity_multiplier | 2.5 (higher, lower volumes) | 2.0 | Bond trades are larger but less frequent |
| insider_lookback_days | 14 (longer, slower info propagation) | 10 | Fixed income insider info takes longer to manifest |

---

## 2. Domain Value Suggestion System

### 2.1 Backend: Domain Values API

**New endpoint group:** `/api/metadata/domain-values/`

#### `GET /api/metadata/domain-values/{entity_id}/{field_name}`

Returns suggestions for a specific entity field.

**Query parameters:**
- `search` (optional): filter values by substring match (ILIKE)
- `limit` (optional, default 50): max values returned

**Response:**
```json
{
  "entity_id": "product",
  "field_name": "asset_class",
  "total_count": 5,
  "metadata_values": ["equity", "fx", "commodity", "fixed_income", "index"],
  "data_values": ["equity", "fx", "commodity", "fixed_income", "index"],
  "combined": ["equity", "fx", "commodity", "fixed_income", "index"],
  "cardinality": "small"
}
```

**Cardinality tiers:**
- `small` (≤50): all values returned, suitable for full dropdown
- `medium` (51-500): all values returned, suitable for searchable dropdown
- `large` (500+): only `search` results returned, requires server-side search

**Implementation:**
- `metadata_values`: read from entity JSON `domain_values` array
- `data_values`: `SELECT DISTINCT {field} FROM {table} ORDER BY {field} LIMIT {limit}` (with optional `WHERE {field} ILIKE '%{search}%'`)
- `combined`: merge, deduplicate, metadata values first
- `total_count`: `SELECT COUNT(DISTINCT {field}) FROM {table}` (cached)

#### `GET /api/metadata/domain-values/match-keys`

Returns all entity fields usable as match pattern keys.

**Response:**
```json
{
  "match_keys": [
    {
      "key": "asset_class",
      "entity": "product",
      "type": "string",
      "cardinality": "small",
      "domain_values": ["equity", "fx", "commodity", "fixed_income", "index"],
      "description": "Product asset classification"
    },
    {
      "key": "exchange_mic",
      "entity": "venue",
      "type": "string",
      "cardinality": "small",
      "domain_values": ["XNYS", "XNAS", "XLON", "XJPX", "XHKG", "XFRA"],
      "description": "Venue ISO 10383 MIC code"
    },
    {
      "key": "product_id",
      "entity": "product",
      "type": "string",
      "cardinality": "medium",
      "domain_values": null,
      "description": "Product identifier (ISIN)"
    }
  ]
}
```

#### `GET /api/metadata/domain-values/setting-ids`

Returns setting IDs, filterable by value_type.

**Query parameters:**
- `value_type` (optional): filter by `decimal`, `integer`, `score_steps`, etc.

**Response:**
```json
{
  "settings": [
    {"setting_id": "wash_score_threshold", "name": "Wash Score Threshold", "value_type": "decimal", "default": 7},
    {"setting_id": "large_activity_score_steps", "name": "Large Activity Score Steps", "value_type": "score_steps"}
  ]
}
```

#### `GET /api/metadata/domain-values/calculation-ids`

Returns calculation IDs with metadata, filterable by layer.

**Query parameters:**
- `layer` (optional): filter by `transaction`, `time_windows`, `aggregation`, `derived`

**Response:**
```json
{
  "calculations": [
    {"calc_id": "vwap_calc", "name": "VWAP Calculation", "layer": "aggregation", "value_field": "vwap_proximity", "description": "..."}
  ]
}
```

### 2.2 Backend Implementation

**Files to create/modify:**
- Create: `backend/api/domain_values.py` — new router with all endpoints above
- Modify: `backend/main.py` — register domain values router
- Modify: `backend/services/metadata_service.py` — add methods for domain value queries
- Modify: `backend/db.py` — add helper for distinct value queries with caching

**Caching strategy:**
- Domain values change infrequently — cache for 60 seconds
- Cache key: `{entity}:{field}:{search}:{limit}`
- Invalidate on entity/data reload

### 2.3 Frontend: SuggestionInput Component

**New component:** `frontend/src/components/SuggestionInput.tsx`

A reusable input component that replaces plain `<input>` elements across all forms.

**Props:**
```typescript
interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  entityId?: string;            // For domain value lookup
  fieldName?: string;           // For domain value lookup
  suggestions?: string[];       // Static suggestions (alternative to entity/field lookup)
  placeholder?: string;
  label?: string;
  tooltip?: string;             // Help text on hover
  allowFreeform?: boolean;      // Default true — allows typing values not in list
  freeformWarning?: string;     // Warning shown for freeform values
  multiSelect?: boolean;        // For context_fields, granularity
  groupLabels?: {metadata: string; data: string};  // Custom group headers
}
```

**Behavior by cardinality:**
- **Small (≤50):** Full dropdown on focus, filter on type
- **Medium (51-500):** Searchable dropdown, all values loaded on first focus
- **Large (500+):** "Type to search..." placeholder, server-side search with 300ms debounce, shows "Showing 20 of 50,000" count

**Visual design:**
- Dropdown appears below input on focus
- Two groups with headers: "Defined Values" (from metadata) and "Found in Data" (from DuckDB)
- Currently typed text highlights matching portion in dropdown items
- Freeform value shows amber warning badge: "Value not in known list"
- Selected values in multi-select mode shown as removable badges

### 2.4 Frontend: useDomainValues Hook

**New hook:** `frontend/src/hooks/useDomainValues.ts`

```typescript
function useDomainValues(entityId: string, fieldName: string, search?: string) {
  // Returns: { metadataValues, dataValues, combined, cardinality, totalCount, isLoading }
  // Caches results in memory, debounces search queries
}
```

### 2.5 Integration Points

Replace plain `<input>` elements with `<SuggestionInput>` in:

| View | Field | Entity/Field Lookup |
|---|---|---|
| Settings Manager (SettingForm) | Override match key | `domain-values/match-keys` |
| Settings Manager (SettingForm) | Override match value | `domain-values/{entity}/{field}` based on selected key |
| Settings Manager (OverrideEditor) | Resolution test context keys | `domain-values/match-keys` |
| Settings Manager (OverrideEditor) | Resolution test context values | `domain-values/{entity}/{field}` |
| Model Composer (ModelCreateForm) | score_threshold_setting | `domain-values/setting-ids?value_type=decimal` |
| Model Composer (ModelCreateForm) | Per-calc threshold_setting | `domain-values/setting-ids?value_type=decimal` |
| Model Composer (ModelCreateForm) | Per-calc score_steps_setting | `domain-values/setting-ids?value_type=score_steps` |
| Model Composer (ModelCreateForm) | Context fields | Multi-select from entity field names |
| Metadata Explorer (CalculationForm) | Dependencies | `domain-values/calculation-ids` |
| Entity Designer (EntityForm) | Relationship target_entity | Static list of entity IDs |
| Metadata Editor (all sub-editors) | All corresponding fields as above |

---

## 3. Reusable Pattern Libraries

### 3.1 Match Pattern Bank

**New metadata type:** `workspace/metadata/match_patterns/`

**Schema:**
```json
{
  "pattern_id": "fixed_income_bonds",
  "label": "Fixed Income Bonds",
  "description": "All fixed income bond instruments across all venues",
  "match": {
    "asset_class": "fixed_income",
    "instrument_type": "bond"
  },
  "created_at": "2026-02-25T10:00:00Z",
  "layer": "oob"
}
```

**Key properties:**
- Patterns are **value-free** — they define WHAT to match (the criteria dict), not the override value
- Auto-discovery: when saving a setting override, the system checks if the match dict already exists as a saved pattern. If not, offers "Save as reusable pattern?"
- Usage tracking: API returns usage count (how many settings reference each pattern's match criteria)

**Backend endpoints:**
- `GET /api/metadata/match-patterns` — list all with usage count
- `GET /api/metadata/match-patterns/{pattern_id}` — get one
- `PUT /api/metadata/match-patterns/{pattern_id}` — create/update
- `DELETE /api/metadata/match-patterns/{pattern_id}` — delete (warn if in use)

**Backend implementation:**
- Modify: `backend/services/metadata_service.py` — add match pattern CRUD + usage count query (scan all settings for matching `match` dicts)
- Create: `backend/api/match_patterns.py` — new router (or extend `metadata.py`)
- Modify: `backend/models/` — add `MatchPattern` Pydantic model

**Frontend component:** `<MatchPatternPicker>`

**Appears in:** Override editor (Settings Manager + Metadata Editor)

**UX flow for adding an override:**
1. User clicks "Add Override"
2. Two options appear: **"Use existing pattern"** and **"Create new match"**
3. **Use existing pattern:** Opens searchable list of saved patterns, each showing label + match preview as badges + usage count. Click to apply.
4. **Create new match:** Opens key/value editor with `<SuggestionInput>` for both key (from match-keys) and value (from domain values). After saving, prompt: "Save as reusable pattern?"

**Preview integration:** When a pattern is selected, show: "This pattern matches X products, Y accounts" (computed from data query).

**OOB patterns to pre-create:**

| Pattern ID | Label | Match Criteria |
|---|---|---|
| `equity_stocks` | Equity Stocks | `{asset_class: "equity"}` |
| `fx_instruments` | FX Instruments | `{asset_class: "fx"}` |
| `commodity_instruments` | Commodity Instruments | `{asset_class: "commodity"}` |
| `fixed_income_all` | Fixed Income (All) | `{asset_class: "fixed_income"}` |
| `fixed_income_bonds` | Fixed Income Bonds | `{asset_class: "fixed_income", instrument_type: "bond"}` |
| `index_instruments` | Index Instruments | `{asset_class: "index"}` |
| `nyse_listed` | NYSE Listed | `{exchange_mic: "XNYS"}` |
| `nasdaq_listed` | NASDAQ Listed | `{exchange_mic: "XNAS"}` |
| `equity_nyse` | Equity on NYSE | `{asset_class: "equity", exchange_mic: "XNYS"}` |

### 3.2 Score Step Template Bank

**New metadata type:** `workspace/metadata/score_templates/`

**Schema:**
```json
{
  "template_id": "high_volume_equity_tiers",
  "label": "High Volume Equity Tiers",
  "description": "Standard scoring tiers for equity volume-based calculations",
  "value_category": "volume",
  "steps": [
    {"min_value": 0, "max_value": 10000, "score": 1},
    {"min_value": 10000, "max_value": 100000, "score": 3},
    {"min_value": 100000, "max_value": 1000000, "score": 7},
    {"min_value": 1000000, "max_value": null, "score": 10}
  ],
  "created_at": "2026-02-25T10:00:00Z",
  "layer": "oob"
}
```

**Key properties:**
- Templates are **value-included** — the tiers ARE the value (unlike match patterns which are value-free)
- `value_category` is a semantic tag: `volume`, `ratio`, `count`, `percentage`, `currency_amount`, `time_duration`, `score`
- When building score steps, templates with matching `value_category` appear first in suggestions
- User can apply template then customize values

**Backend endpoints:**
- `GET /api/metadata/score-templates` — list all with usage count, filterable by `value_category`
- `GET /api/metadata/score-templates/{template_id}` — get one
- `PUT /api/metadata/score-templates/{template_id}` — create/update
- `DELETE /api/metadata/score-templates/{template_id}` — delete

**Frontend integration with Score Step Builder:**
- Toolbar button "Templates" opens template picker
- Templates grouped by `value_category`
- Preview shows the range bar visualization
- "Apply" copies steps into the builder for customization
- After saving custom steps, prompt: "Save as reusable score template?"

**OOB templates to pre-create:**

| Template ID | Label | Category | Tiers |
|---|---|---|---|
| `volume_standard` | Standard Volume Tiers | volume | 0-10K(1), 10K-100K(3), 100K-1M(7), 1M+(10) |
| `volume_fx` | FX Volume Tiers | volume | 0-100K(1), 100K-1M(3), 1M-10M(7), 10M+(10) |
| `ratio_binary` | Binary Ratio Check | ratio | 0-0.5(0), 0.5-1.0(10) |
| `ratio_graduated` | Graduated Ratio Scoring | ratio | 0-0.25(1), 0.25-0.5(3), 0.5-0.75(7), 0.75-1.0(10) |
| `count_low` | Low Count Alerts | count | 0-2(0), 3-5(3), 5-10(7), 10+(10) |
| `count_high` | High Count Alerts | count | 0-10(1), 10-50(3), 50-100(7), 100+(10) |
| `percentage_standard` | Standard Percentage Tiers | percentage | 0-5%(1), 5-15%(3), 15-30%(7), 30%+(10) |

---

## 4. Visual Score Step Builder

### 4.1 Component: `<ScoreStepBuilder>`

**New file:** `frontend/src/components/ScoreStepBuilder.tsx`

**Props:**
```typescript
interface ScoreStepBuilderProps {
  value: ScoreStep[];
  onChange: (steps: ScoreStep[]) => void;
  valueCategory?: string;       // For template suggestions
  readOnly?: boolean;
}

interface ScoreStep {
  min_value: number;
  max_value: number | null;     // null = unbounded upper
  score: number;
}
```

**Visual layout (top to bottom):**

1. **Template toolbar:** "Templates" button + "Save as template" button
2. **Range bar visualization:** Horizontal bar showing all tiers as colored segments
   - Color scale: green (low score) → yellow → orange → red (high score)
   - Each segment labeled with score value
   - Gaps shown as striped/hatched regions with warning icon
   - Overlaps highlighted in red
   - Hover shows tooltip: "Range 10,000 - 100,000 → Score: 3"
3. **Editable table:**
   - Columns: Drag handle | Min Value | Max Value | Score | Delete (x)
   - Inline number inputs with appropriate step values
   - Drag handles for reordering (react-beautiful-dnd or native drag)
   - "Add Tier" button at bottom
4. **Validation summary line:**
   - "5 tiers covering 0 to ∞ | Max score: 10 | No gaps ✓"
   - Or: "4 tiers covering 0 to 10,000 | Max score: 7 | 1 gap: 5,000-7,500 ⚠"
5. **Validation warnings (if any):**
   - Gap: "⚠ Values between 5,000 and 7,500 will receive no score"
   - Overlap: "⚠ Values between 100 and 200 are matched by tiers 1 and 2"
   - Non-monotonic: "ℹ Score decreases from tier 3 (7) to tier 4 (5) — is this intentional?"

### 4.2 Integration Points

| Location | Current State | New State |
|---|---|---|
| SettingForm (Settings Manager) | Raw text input for score_steps default | `<ScoreStepBuilder>` when `value_type === "score_steps"` |
| SettingDetail (Settings Manager) | HTML table rendering | `<ScoreStepBuilder readOnly>` with range bar |
| SettingsEditor (Metadata Editor) | Text input | `<ScoreStepBuilder>` |
| Override value (when setting is score_steps) | Raw text input | `<ScoreStepBuilder>` per override |

---

## 5. Enhanced Model Composer

### 5.1 Unified Model Creation Form

Bring `ModelCreateForm.tsx` to full parity with `DetectionModelEditor.tsx`, enhanced with suggestions, preview, and validation.

**Form sections (wizard-style with progress bar):**

#### Step 1: Define (Identity + Scope)
- **Name:** text input with auto-generated model_id
- **Description:** textarea
- **Time Window:** dropdown populated from time_windows layer calculations, with tooltip explaining each option
- **Granularity:** checkboxes for `product_id`, `account_id`, `trader_id` with tooltips
- **Context Fields:** multi-select `<SuggestionInput>` populated from entity field names

#### Step 2: Select Calculations
- Existing click-to-select pattern from "Available Calculations" panel
- Enhanced with: description, layer badge, value_field, dependency info per calculation
- Tooltip on each calc: "This calculation computes {description}. Layer: {layer}. Depends on: {depends_on}."

#### Step 3: Configure Scoring
Each selected calculation expands to show:
- **Strictness:** toggle MUST_PASS / OPTIONAL with explanation tooltip
- **Threshold Setting:** `<SuggestionInput>` dropdown of settings (filtered to decimal/integer)
- **Score Steps Setting:** `<SuggestionInput>` dropdown of settings (filtered to score_steps)
- **Value Field:** auto-populated from calc metadata, editable
- **Inline preview:** shows current resolved threshold value and score step tiers (using `<ScoreStepBuilder readOnly>`)

**Alert Threshold section:**
- **Score Threshold Setting:** `<SuggestionInput>` dropdown of score threshold settings
- **Preview:** "Current threshold: 7 (default) | equity override: 6 | fx override: 8"

#### Step 4: Write Query
- **Monaco editor** with SQL syntax highlighting (replace textarea)
- **"Generate from selections"** button — auto-builds a JOIN query from selected calculations and entity tables
- **Table/column autocomplete** from entity metadata (if Monaco supports it, or tooltip reference panel)
- **SQL reference panel:** collapsible panel showing available tables and columns

#### Step 5: Review & Validate
- **Summary card** showing all configuration decisions
- **Validation panel** (runs automatically — see 5.2)
- **Dependencies mini-DAG**
- **Regulatory coverage** (optional)

#### Step 6: Test Run
- **Dry run** against current data (see 5.4)
- Preview results without saving

#### Step 7: Deploy
- Confirmation dialog with impact summary
- Save + optional immediate pipeline run

**Navigation:** Progress bar at top, Back/Next buttons with validation gates.

### 5.2 Validation & Best Practices Engine

Runs continuously as the user builds, displayed in a sidebar panel.

**Completeness checks:**
- ✓ / ✗ "At least 1 calculation selected"
- ✓ / ✗ "At least 1 MUST_PASS calculation"
- ✓ / ✗ "Score threshold setting assigned"
- ✓ / ✗ "Detection query defined"
- ✓ / ✗ "Time window selected"
- ✓ / ⚠ "Context fields defined" (warning if empty — will use defaults)

**Best practice suggestions:**
- "Consider adding trader_id to granularity — enables per-trader alerting"
- "Model has {N} calculations but no time_window filter — results may span all dates"
- "{N} of {M} calculations are OPTIONAL — consider making at least 2 MUST_PASS for stronger signal"
- "Selected calculations span {N} layers — ensure pipeline execution order covers all layers"

**Industry patterns (collapsible):**
- "See how similar models are configured" — shows OOB models as reference
- "Wash Trading (Full Day): 4 calcs, 2 MUST_PASS, threshold 7"
- "Spoofing/Layering: 2 calcs, 1 MUST_PASS, threshold 6"

**Regulatory coverage check:**
- "This model covers: MAR Art. 12(1)(a)"
- "Missing coverage for: MiFID II Art. 16(2) — consider adding large_trading_activity calc"

### 5.3 Live Preview & Explainability Panel

A right-side panel that updates as the user builds:

**Score Simulation:**
- Shows a mock alert with sample data
- As user adds/removes calculations, preview recalculates
- "With these 3 calcs, sample product AAPL would score 8/10 → Alert generated (threshold: 7)"

**Sensitivity Analysis:**
- Mini chart showing score distribution across all products
- "23 products would trigger alerts, 27 would not"
- "Top scorer: AAPL (9), lowest alert: MSFT (7)"

**Calculation Contribution Breakdown:**
- Stacked bar showing which calc contributes how much to total score
- "large_trading_activity: 4pts, wash_vwap_proximity: 3pts, wash_qty_match: 2pts"

**Data Coverage Check:**
- "This model uses 3 calculations requiring: execution, product, md_eod tables"
- "All 3 tables loaded. ✓ 509 executions, 50 products, 2,150 EOD records available"

### 5.4 Dependency & Impact Awareness

**Dependencies tab:**
- **Upstream:** Visual mini-DAG: Entity tables → Calculations → This Model (clickable nodes)
- **Settings:** List of all settings this model uses with current resolved values and override counts
- **Downstream:** "This model feeds into: RiskCaseManager alerts, Dashboard alert count, Pipeline Monitor status"
- **Missing dependency warnings:** "⚠ wash_detection depends on vwap_calc (aggregation layer) — ensure pipeline runs in order"

### 5.5 Test Run & Dry Run

**Before deploying:**
- Runs model against current data WITHOUT saving alerts
- Shows results in preview grid: "12 alerts would be generated"
- Each preview alert expandable with full explainability trace:
  - SQL executed
  - Scores breakdown per calculation
  - Settings resolved with override chain
  - Raw data rows that triggered the alert
- **Comparison mode (for edits):** Side-by-side: "Current: 15 alerts | Modified: 12 alerts | Diff: -3 (BOND1, BOND2, FX003 removed; 0 new)"

**Backend endpoint:**
- `POST /api/detection-models/{model_id}/dry-run` — runs detection without persisting, returns preview results

### 5.6 Example & Use Case Library

**Examples drawer** accessible from model creation form:

**Pre-built annotated examples:**
- "Wash Trading Detection" — complete model with inline annotations on every field
- "Insider Dealing" — different pattern, explains differences from wash trading
- "Spoofing/Layering" — shows how strictness and calc selection differ
- "Custom: High-Frequency Spoofing" — hypothetical example showing novel calc combinations

**Each example has:**
- Annotated JSON with inline comments explaining every decision
- Decision rationale: "We chose MUST_PASS for cancel_pattern because..."
- "Use as starting point" button — copies into the creation form
- Visual DAG of the model's calculation flow

**For settings:** Examples like "How to set different thresholds per asset class"
**For calculations:** Examples like "Building a new ratio calculation" with SQL patterns

---

## 6. Use Case Studio & AI-Assisted Calculation Builder

### 6.1 Use Case Studio

A new workspace area where users create, save, and refine custom detection scenarios.

**Storage:** `workspace/use_cases/{use_case_id}/`

**Use case definition:**
```json
{
  "use_case_id": "high_freq_fx_manipulation",
  "label": "High-Frequency FX Manipulation",
  "description": "Detect rapid-fire FX trades that manipulate mid-rates",
  "author": "user",
  "created_at": "2026-02-25T14:00:00Z",
  "updated_at": "2026-02-25T15:30:00Z",
  "status": "draft",
  "components": {
    "calculations": ["fx_spread_calc", "rapid_trade_frequency"],
    "detection_models": ["fx_manipulation_v1"],
    "settings": ["fx_spread_threshold", "fx_rapid_trade_window"],
    "match_patterns": ["fx_spot_instruments"],
    "score_templates": ["fx_volume_tiers"]
  },
  "sample_data": {
    "files": ["sample_executions.csv", "sample_products.csv"],
    "row_counts": {"execution": 50, "product": 5}
  },
  "expected_results": {
    "alert_count": 5,
    "products_affected": ["FX001", "FX002", "FX003"],
    "min_score": 6,
    "max_score": 9
  },
  "narrative": "A trader submits 40 FX spot trades in 2 minutes, alternating between buy and sell with progressively increasing volumes..."
}
```

**Use Case Builder wizard:**

1. **Describe:** Name, narrative (what behavior to detect), business justification
2. **Select or create components:** Pick existing calcs/models or create new ones inline (links to AI-assisted builder)
3. **Add sample data:**
   - Upload CSV
   - Paste rows into inline AG Grid editor
   - Generate synthetic data with AI: "Generate 20 FX trades that would trigger this model"
   - Schema validation on import: column names, types, FK references
4. **Define expected outcomes:** Expected alert count, affected products, score ranges
5. **Run & validate:** Execute full pipeline on sample data, compare to expectations
6. **Save:** Becomes available in the Examples library under "My Use Cases"

**Data isolation:**
- Custom data stored in `workspace/use_cases/{id}/data/`
- Flagged as `source: "use_case"` — not mixed into main dataset
- User chooses: merge into main dataset or keep isolated

**Backend endpoints:**
- `GET /api/use-cases` — list all use cases with status
- `GET /api/use-cases/{id}` — get full use case
- `PUT /api/use-cases/{id}` — create/update
- `DELETE /api/use-cases/{id}` — delete
- `POST /api/use-cases/{id}/run` — execute pipeline on use case data
- `POST /api/use-cases/{id}/generate-data` — AI-assisted data generation

### 6.2 AI-Assisted Calculation Builder

**Entry point:** "+ Create Custom Calculation with AI" button in any calc-selection context.

**Workflow:**

**Step 1: Describe Intent**
- User types natural language: "Detect when a trader's buy volume in the last hour exceeds 5x the average daily volume"
- AI receives full metadata context: entity schemas, existing calcs, settings, relationships

**Step 2: AI Analysis & Proposal**
- AI returns:
  - Proposed SQL logic with syntax highlighting
  - Required input entities and fields
  - Suggested `value_field`, layer, dependencies
  - Suggested parameters with settings references (`$param_name` syntax)
  - Natural language explanation of approach
  - Potential issues or limitations

**Step 3: Review & Refine**
- Split view: left = proposed calculation JSON, right = AI explanation with annotations
- User can ask follow-up: "Also factor in bid-ask spread" → AI refines
- Iterative until user is satisfied

**Step 4: Validate (see 6.3)**

**Step 5: Save**
- Saved to user layer (`workspace/metadata/user/calculations/`)
- Never touches OOB layer

**Backend:**
- Modify: `backend/services/ai_service.py` — add calculation generation with metadata context
- Create: `backend/services/ai_context_builder.py` — builds system context for LLM (entity schemas, existing calcs, settings, relationships)
- Modify: `backend/api/ai.py` — add calculation suggestion endpoint

### 6.3 Sandbox Validation Engine

Before ANY custom calculation is saved, it goes through 5 validation layers:

**Layer 1 — Static Analysis:**
- SQL syntax check via DuckDB parser (`EXPLAIN` without executing)
- All referenced tables exist in entity metadata
- All referenced columns exist in correct tables
- No DDL/DML (SELECT only)
- No unbounded queries (must have WHERE or JOIN constraints)
- Output produces declared `value_field`

**Layer 2 — Schema Compatibility:**
- Input entities match declared `inputs`
- Output schema matches declared `output` fields
- Dependencies exist and are in correct layer order
- No circular dependencies introduced
- Parameters reference valid settings

**Layer 3 — Sandbox Execution:**
- Run SQL in read-only DuckDB transaction (BEGIN + ROLLBACK)
- Verify produces rows with expected columns
- Check row count: not 0 (empty), not cartesian explosion (>100x input)
- Measure execution time, warn if >2 seconds
- Sample output: "Produced 487 rows with columns: product_id, account_id, business_date, volume_ratio. 340ms."

**Layer 4 — Impact Analysis:**
- "This calculation will be available for detection models"
- "It does NOT affect any existing model" (new calcs can't affect existing models)
- If added to an existing model: "Would change scores for 12 of 50 products"
- **Isolation guarantee:** User-layer calcs stored separately from OOB. If a user calc fails at runtime, it is skipped with a logged warning — never blocks OOB execution.

**Layer 5 — Regression Safety:**
- Run ALL existing detection models before and after
- Compare alert sets: "0 existing alerts changed. 0 existing models affected."
- Full diff shown if anything changes (shouldn't for new calcs, but guards against shared dependency edge cases)
- User must acknowledge any changes

**Backend:**
- Create: `backend/services/validation_service.py` — implements all 5 layers
- Modify: `backend/api/metadata.py` — validation endpoint enhanced with sandbox execution
- Modify: `backend/engine/calculation_engine.py` — add sandbox mode (execute in transaction, rollback)
- Modify: `backend/engine/detection_engine.py` — add comparison mode (run with/without new calc)

### 6.4 Use Case Submission & Review Pipeline

**Submission workflow:**

After building and validating a use case, user clicks "Submit for Review":

**Submission package captures:**
```json
{
  "submission_id": "SUB-2026-0042",
  "status": "pending_review",
  "submitted_by": "analyst_jane",
  "submitted_at": "2026-02-25T14:30:00Z",
  "title": "High-Frequency FX Spread Manipulation",
  "business_justification": "Recent FCA regulatory guidance requires...",
  "change_type": "new_use_case",
  "parent_ref": null,
  "package": {
    "calculations": [{ "...full calc JSON..." }],
    "detection_models": [{ "...full model JSON..." }],
    "settings": [{ "...full setting JSON..." }],
    "match_patterns": [{ "...patterns..." }],
    "score_templates": [{ "...templates..." }],
    "sample_data": [{ "entity": "execution", "rows": ["..."] }],
    "expected_results": { "alert_count": 5, "products_affected": ["..."] }
  },
  "validation_report": { "...auto-generated from 6.3..." },
  "system_recommendations": { "...auto-generated from 6.5..." }
}
```

**Storage:** `workspace/submissions/{submission_id}/`

**Status lifecycle:** `draft` → `pending_review` → `under_review` → `approved` / `rejected` / `needs_revision` → `implemented`

**Backend endpoints:**
- `GET /api/submissions` — list all with status, filterable
- `GET /api/submissions/{id}` — get full submission
- `POST /api/submissions` — create from use case
- `PUT /api/submissions/{id}/status` — update status (review actions)
- `POST /api/submissions/{id}/implement` — one-click implementation of approved submission

### 6.5 System Recommendations Engine

Auto-generated at submission time:

**Change classification:**
- **"Entirely new"** — no overlap with existing. Recommendation: "Add as new calculation + model."
- **"Variant of existing"** — significant overlap. Recommendation: "Consider as v2 of `wash_full_day` or separate model sharing 3 of 4 calcs."
- **"Enhancement"** — adds to existing model. Recommendation: "Could integrate into `insider_dealing` as OPTIONAL calc. Impact: +2 alerts."
- **"Threshold refinement only"** — no new logic. Recommendation: "Implement as setting overrides. No code/model changes needed."

**Specific recommendations:**
- Similarity analysis: "Submitted SQL is 85% similar to existing `vwap_calc`. Consider extending with parameter."
- Consistency check: "Score steps use 0-1000 range. Existing use 0-10000. Normalizing improves consistency."
- Pattern suggestions: "Match pattern `{asset_class: fx, instrument_type: spot}` doesn't exist. Creating it would benefit 2 other settings."

### 6.6 Review Queue UI

**New panel or view: Submissions**

**Queue view (AG Grid):**
- Columns: ID, Title, Type, Submitter, Date, Status, Readiness Score, Reviewer
- Status badges with color coding
- Filter by status, type, date range

**Review detail view:**
- **Summary tab:** Business justification, change type, parent reference
- **Components tab:** Every calculation, model, setting — with diff view against existing if variant
- **Validation tab:** Full validation report
- **Recommendations tab:** System recommendations with accept/dismiss
- **Impact tab:** Before/after alert comparison
- **Sample run tab:** Run submitted model, inspect results
- **Discussion thread:** Comments, change requests

**Review actions:**
- **Approve** → status `approved`, "Implement" button available
- **Request revision** → sends back with feedback, version history preserved
- **Reject** → with reason, archived
- **Promote to OOB** → copies to OOB layer with version bump

### 6.7 Version Management

For variants/enhancements of existing:
- Version tracking: `wash_full_day_v1` (OOB) → `wash_full_day_v2` (submitted)
- Side-by-side diff of all fields
- A/B comparison: run both against same data
- Rollback: one-click revert to previous version
- Version history timeline: who changed what and why

### 6.8 Safety Architecture

```
OOB Layer (immutable)          User Layer (customizable)       Use Case Layer (isolated)
├── calculations/              ├── calculations/               ├── use_case_1/
│   └── vwap_calc.json        │   └── fx_spread_calc.json     │   ├── definition.json
├── detection_models/          ├── detection_models/            │   ├── sample_data/
│   └── wash_full_day.json    │   └── fx_manipulation.json    │   └── expected_results.json
├── settings/                  ├── settings/                   └── use_case_2/
│   └── wash_threshold.json   │   └── fx_threshold.json
├── match_patterns/            ├── match_patterns/
├── score_templates/           ├── score_templates/
└── (never modified by user)   └── (user owns, validated)

Submissions Layer (review queue)
├── SUB-2026-0042/
│   ├── submission.json
│   ├── validation_report.json
│   ├── recommendations.json
│   └── package/  (full component copies)
```

**Runtime isolation:**
- If a user-layer calculation fails, engine logs it, skips it, continues with OOB
- OOB model results are never affected by user-layer failures
- Use case data only loaded when the use case is active
- Submissions don't affect anything until explicitly implemented

---

## 7. Comprehensive Guided Tour & Demo System

### 7.1 Tour Engine Upgrade

**Current state:** 16 simple tours with step-based highlighting. Orientation-only, no creation walkthroughs.

**New system:** Scenario Engine with dual-mode execution.

**Key features:**
- **Dual mode per scenario:**
  - "Watch Demo" (narrated auto-play) — system fills values and explains
  - "Try It Yourself" (interactive with hints) — tour highlights fields, shows hints, user acts
- **Mode selection flow:**
  1. Before starting: "Would you like to watch this demo, or try it yourself?" (default: Watch Demo)
  2. After narrated mode: "Want to try it yourself now?" → switches to interactive
  3. After interactive: "Move to next scenario?" or "Replay this one?"
- **Replay/Reset** available at any time within a scenario
- **Per-scenario progress** — completion checkmarks, can resume where left off
- **Scenario categories** — grouped by topic in a persistent selector

### 7.2 Per-Screen Operation Scripts

Every view gets a contextual help system:

**Help button (?)** in every view header, opens a panel showing:
- **"What can I do here?"** — list of all operations available on this screen
- Each operation is a mini-guide (3-5 steps) that can launch as interactive tour
- **Quick actions** — common operations as buttons: "Create new...", "Edit selected..."
- **Related scenarios** — links to full scenarios from the library
- **Tips & best practices** — contextual advice for this view

### 7.3 Scenario Library (25 scenarios, full E2E coverage)

#### Category 1: Settings & Thresholds (6 scenarios)

**S1: Create a New Threshold Setting**
- Navigate to Settings Manager → Click "New Setting"
- Fill: name="FX Spread Threshold", type=decimal, match_type=hierarchy
- Set default value: 0.03
- Add override: select "FX Instruments" from pattern bank, value=0.02, priority=1
- Add override: create new match {exchange_mic: XLON}, value=0.025, priority=2
- Save → verify in list → test resolution with context {asset_class: fx}
- **Learning points:** Setting types, match patterns, priority system, resolution logic

**S2: Reuse Match Patterns Across Settings**
- Open Settings Manager → select existing setting
- Edit → Add Override → "Use existing pattern" → select "Fixed Income Bonds"
- Set value → Save
- Open a different setting → Add Override → same pattern
- Show usage count increasing
- **Learning points:** Pattern reuse, consistency across settings

**S3: Build Score Steps Visually**
- Open a score_steps setting → Edit
- Open Score Step Builder → Add 4 tiers using the visual builder
- Show range bar updating in real-time
- Introduce a gap deliberately → see warning
- Fix the gap → verify coverage
- **Learning points:** Score step structure, range coverage, gap detection

**S4: Apply and Customize a Score Template**
- Open score_steps setting → Edit → "Templates" button
- Browse templates by category → select "Standard Volume Tiers"
- Apply → customize values for specific use case
- Save as new template: "Custom FX Volume Tiers"
- **Learning points:** Template reuse, customization, template creation

**S5: Test Settings Resolution End-to-End**
- Open Settings Manager → select a setting with multiple overrides
- Open Resolution Tester
- Test with different contexts: equity → see override match → explain why
- Test with fx → see different override → explain priority
- Test with fixed_income → see new override from G3
- Test with unknown value → see default fallback
- **Learning points:** Resolution logic, override priority, context matching

**S6: Add Overrides for a New Asset Class**
- Create match pattern "Index ETFs" → {asset_class: index, instrument_type: etf}
- Apply across 5 settings with appropriate values
- Verify all resolutions work correctly
- **Learning points:** Systematic override creation, pattern-first workflow

#### Category 2: Calculations (4 scenarios)

**S7: Explore the Calculation DAG**
- Open Metadata Explorer → view the full DAG
- Click through layers: transaction → time_windows → aggregation → derived
- Click nodes → see dependencies → understand data flow
- Filter by layer → see subgraphs
- **Learning points:** Calculation layers, dependencies, data flow

**S8: Create a Custom Calculation Manually**
- Open Metadata Explorer → "New Calculation"
- Define: name, layer (aggregation), SQL logic
- Set value_field, dependencies (select from autocomplete)
- Add parameters linked to settings ($param syntax)
- Validate → test run on sample data → review output
- Save → verify in DAG
- **Learning points:** SQL authoring, parameterization, dependency management

**S9: AI-Assisted Calculation Creation**
- Click "+ Create Custom Calculation with AI"
- Type: "Detect when volume exceeds 3x daily average"
- Review AI proposal → refine: "Add bid-ask spread filter"
- Review updated proposal → approve
- Validate through all 5 layers → save
- **Learning points:** AI assistance, iterative refinement, validation pipeline

**S10: Parameterize a Calculation with Settings**
- Open existing calculation → identify hardcoded values
- Replace with $param_name placeholders
- Link parameters to settings
- Test: change setting value → re-run calc → see different results
- **Learning points:** Settings integration, dynamic behavior, $param syntax

#### Category 3: Detection Models (4 scenarios)

**S11: Build a Detection Model from Scratch (Full Wizard)**
- Step 1: Define → name, description, time_window, granularity
- Step 2: Select calculations → choose 3 from available list
- Step 3: Configure scoring → set strictness, thresholds, score steps per calc
- Step 4: Write query → use "Generate from selections" → customize
- Step 5: Review → check validation panel → address warnings
- Step 6: Test run → inspect preview alerts → verify scores
- Step 7: Deploy → confirm → view in Pipeline Monitor
- **Learning points:** End-to-end model creation, all configuration options

**S12: Clone and Modify an Existing Model**
- Open Model Composer → select "Wash Trading (Full Day)"
- Click "Use as starting point" → opens pre-filled form
- Modify: add a calculation, change threshold, adjust strictness
- Compare: side-by-side results vs original
- Save as "Wash Trading Enhanced"
- **Learning points:** Variant creation, comparison, incremental improvement

**S13: Add a Calculation to an Existing Model**
- Select model → Edit → go to Step 2
- Add new calculation from available list
- Configure its strictness and scoring (Step 3)
- Test impact: "Before: 15 alerts, After: 18 alerts (+3 new)"
- Deploy update
- **Learning points:** Model evolution, impact analysis

**S14: Review Model Best Practices**
- Open Model Composer → create intentionally incomplete model
- Watch validation panel flag issues in real-time
- Walk through each suggestion → apply fixes
- Compare: initial (3 warnings) → final (0 warnings, all best practices met)
- **Learning points:** Validation engine, best practices, model quality

#### Category 4: Use Cases & Submissions (4 scenarios)

**S15: Create a Complete Use Case**
- Open Use Case Studio → "New Use Case"
- Write narrative: describe the suspicious behavior to detect
- Assemble components: pick/create calcs, models, settings
- Add sample data: upload CSV or generate with AI
- Define expected outcomes: 5 alerts, specific products
- Run pipeline → compare results to expectations
- Save
- **Learning points:** Use case structure, component assembly, validation

**S16: Submit a Use Case for Review**
- Open completed use case → "Submit for Review"
- Review auto-generated validation report
- Read system recommendations
- Add business justification
- Submit → verify in queue
- **Learning points:** Submission workflow, validation report, recommendations

**S17: Review a Submitted Use Case**
- Open Submissions queue → select pending submission
- Inspect components, validation, recommendations
- Run sample data → verify results
- Add reviewer comments
- Approve / Request revision
- **Learning points:** Review process, quality gates, collaboration

**S18: Implement an Approved Submission**
- Open approved submission → "Implement"
- System copies components to user layer
- Runs regression check
- Verify: new model appears in Model Composer
- Run pipeline → see new alerts
- **Learning points:** Implementation workflow, regression safety, activation

#### Category 5: Entities & Data (2 scenarios)

**S19: Explore Entity Relationships**
- Open Entity Designer → view entity list
- Click through entities → see fields, types, relationships
- View relationship graph → click edges → see join fields
- Understand: how product links to execution links to order
- **Learning points:** Data model understanding, relationships, navigation

**S20: Add Sample Data for a Use Case**
- Open Use Case Studio → select a use case
- Click "Add Sample Data" → choose entity (execution)
- Upload CSV → see schema validation results
- Fix column name mismatch → re-upload → success
- Preview data in AG Grid
- **Learning points:** Data import, schema validation, data management

#### Category 6: Investigation & Analysis (3 scenarios)

**S21: Investigate an Alert End-to-End**
- Open Risk Case Manager → select an alert
- View alert summary → severity, model, product, score
- Drill into score breakdown → see each calc's contribution
- Click a calculation → see SQL executed, rows matched, settings resolved
- View settings resolution chain → understand override hierarchy
- View raw market data chart → see the suspicious pattern visually
- **Learning points:** Alert investigation, explainability, drill-down

**S22: Compare Model Versions**
- Open two model versions (v1 and v2)
- Run side-by-side comparison
- Review: added alerts, removed alerts, score changes
- Decide: keep v2 or rollback to v1
- **Learning points:** Version comparison, A/B testing, decision-making

**S23: Analyze Alert Distribution**
- Open Dashboard → review alert charts
- Identify pattern: most alerts from equity sector
- Drill into distribution: by model, by product, by score
- Hypothesis: threshold too sensitive → adjust via settings
- Re-run → compare distribution
- **Learning points:** Distribution analysis, threshold tuning, impact assessment

#### Category 7: System Administration (2 scenarios)

**S24: Review OOB vs Custom Differences**
- Open Metadata Editor → OOB panel
- See all customizations highlighted
- Select a setting → view diff (OOB vs current)
- "Reset to OOB" on one setting → confirm → verify
- **Learning points:** OOB layer, customization tracking, reset workflow

**S25: Run the Full Pipeline End-to-End**
- Open Pipeline Monitor → click "Run All"
- Watch progress: data load → calculations (layer by layer) → detection → alerts
- Review results: new alerts generated, execution time
- Open Dashboard → see updated metrics
- **Learning points:** Pipeline execution, monitoring, result verification

### 7.4 Tour Data & Implementation

**Tour definitions file:** Extend `frontend/src/data/tourDefinitions.ts`

**Per scenario:**
```typescript
interface ScenarioDefinition {
  id: string;
  category: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  prerequisites: string[];  // Other scenario IDs
  steps: ScenarioStep[];
  learningPoints: string[];
}

interface ScenarioStep {
  target: string;            // CSS selector or element ID
  title: string;
  content: string;           // Markdown-supported explanation
  action?: {
    type: 'click' | 'type' | 'select' | 'navigate' | 'wait';
    target?: string;
    value?: string;
  };
  validation?: {
    type: 'element_exists' | 'value_equals' | 'element_visible';
    target: string;
    expected?: string;
  };
  hint?: string;             // Shown in interactive mode if user pauses
  autoFillDelay?: number;    // Seconds before auto-fill in interactive mode
}
```

**Tour engine component:** `frontend/src/components/TourEngine/`
- `ScenarioRunner.tsx` — manages scenario execution (dual mode)
- `ScenarioSelector.tsx` — category-grouped scenario browser with progress
- `StepOverlay.tsx` — highlight + tooltip + action hints
- `OperationScripts.tsx` — per-screen help panel

---

## 8. Testing & Verification Plan

### 8.1 Unit Tests (Backend)

| Test File | What It Covers | Est. Tests |
|---|---|---|
| `tests/test_domain_values.py` | Domain value API, cardinality tiers, search, caching | 15 |
| `tests/test_match_patterns.py` | CRUD, usage count, pattern matching | 10 |
| `tests/test_score_templates.py` | CRUD, category filtering, usage count | 8 |
| `tests/test_validation_service.py` | All 5 validation layers, sandbox execution | 20 |
| `tests/test_use_cases.py` | Use case CRUD, pipeline execution, data isolation | 12 |
| `tests/test_submissions.py` | Submission workflow, status transitions, implementation | 10 |
| `tests/test_recommendations.py` | Change classification, similarity analysis | 8 |
| `tests/test_param_migration.py` | $param substitution regression — alerts identical pre/post | 10 |
| `tests/test_date_range.py` | Date range API, TimeRangeSelector integration | 5 |
| **Total** | | **~98 new tests** |

### 8.2 E2E Playwright Tests

| Test File | What It Covers | Est. Tests |
|---|---|---|
| `tests/e2e/test_domain_suggestions.py` | SuggestionInput dropdown, search, freeform warning | 8 |
| `tests/e2e/test_match_patterns.py` | Pattern bank CRUD, reuse in overrides | 6 |
| `tests/e2e/test_score_builder.py` | Visual builder, range bar, gap detection, templates | 8 |
| `tests/e2e/test_model_wizard.py` | Full 7-step model creation wizard | 10 |
| `tests/e2e/test_use_case_studio.py` | Use case creation, data upload, pipeline run | 8 |
| `tests/e2e/test_submissions.py` | Submit, review, approve, implement flow | 6 |
| `tests/e2e/test_guided_tours.py` | Tour engine, dual mode, scenario navigation | 10 |
| `tests/e2e/test_gap_fixes.py` | Param migration results, date range, settings overrides | 5 |
| **Total** | | **~61 new E2E tests** |

### 8.3 BDD Scenarios

New BDD feature files:

**Feature: Domain Value Suggestions**
```gherkin
Scenario: User sees domain values when adding override match key
  Given I am editing a threshold setting
  When I click on the override match key field
  Then I see a dropdown with entity field names
  And each field shows its entity, type, and cardinality

Scenario: User searches large cardinality field
  Given I am entering a product_id in match value
  When I type "AAP"
  Then I see server-side search results matching "AAP"
  And I see "Showing 3 of 50 products"

Scenario: User enters freeform value not in list
  Given I am entering an asset_class value
  When I type "cryptocurrency"
  Then I see an amber warning "Value not in known list"
  And I can still save the value
```

**Feature: Match Pattern Reuse**
```gherkin
Scenario: User applies saved pattern to override
  Given I am adding an override to a setting
  When I click "Use existing pattern"
  Then I see the pattern library with labels and usage counts
  When I select "Fixed Income Bonds"
  Then the match criteria auto-fills with {asset_class: fixed_income, instrument_type: bond}

Scenario: User saves new match criteria as pattern
  Given I created a new override with match {asset_class: equity, exchange_mic: XNYS}
  When I save the override
  Then I see a prompt "Save as reusable pattern?"
  When I enter label "Equity NYSE" and save
  Then the pattern appears in the pattern library
```

**Feature: Score Step Builder**
```gherkin
Scenario: User builds score steps visually
  Given I am editing a score_steps setting
  When I add 4 tiers using the visual builder
  Then the range bar shows 4 colored segments
  And the summary line shows "4 tiers covering 0 to ∞ | Max score: 10"

Scenario: Gap detection warns user
  Given I have score steps with ranges 0-100 and 200-500
  Then I see a striped gap region on the range bar at 100-200
  And I see warning "Values 100-200 will receive no score"
```

**Feature: Model Creation Wizard**
```gherkin
Scenario: User creates detection model end-to-end
  Given I open Model Composer and click "New Model"
  When I complete Step 1 (Define) with name and scope
  And I complete Step 2 (Select) with 3 calculations
  And I complete Step 3 (Scoring) with strictness and thresholds
  And I complete Step 4 (Query) using auto-generate
  And I complete Step 5 (Review) with 0 validation warnings
  And I complete Step 6 (Test Run) showing 12 preview alerts
  And I complete Step 7 (Deploy)
  Then the model appears in the model list
  And the pipeline can be run successfully

Scenario: Validation catches incomplete model
  Given I am at Step 5 (Review) without selecting any calculations
  Then I see validation error "At least 1 calculation required"
  And the Next button is disabled
```

**Feature: Use Case Submission**
```gherkin
Scenario: User submits use case for review
  Given I have a validated use case with all components
  When I click "Submit for Review"
  Then the system generates a validation report
  And the system generates recommendations
  And the submission appears in the review queue with status "Pending Review"

Scenario: Reviewer approves and implements submission
  Given there is a pending submission in the queue
  When I review and approve it
  And I click "Implement"
  Then components are copied to the user layer
  And a regression check runs successfully
  And the new model is available in Model Composer
```

**Feature: Guided Tours**
```gherkin
Scenario: User watches narrated demo
  Given I start scenario "Build a Detection Model"
  When I select "Watch Demo" mode
  Then the tour auto-fills values at each step
  And explanations appear at each step
  When the tour completes
  Then I see "Want to try it yourself now?"

Scenario: User tries interactive mode
  Given I start scenario "Create a New Threshold Setting" in interactive mode
  When I reach the "Set default value" step
  Then I see a highlighted field with hint "Enter a decimal value like 0.03"
  When I type "0.03"
  Then the tour advances to the next step
```

### 8.4 Demo Walkthrough Updates

Update `docs/demo-guide.md` with new acts:

**Act 4: Metadata Configuration Mastery**
- Scene 1: Create a threshold with pattern reuse (S1 + S2)
- Scene 2: Build score steps visually (S3 + S4)
- Scene 3: Test settings resolution (S5)

**Act 5: Detection Model Building**
- Scene 1: Full model creation wizard (S11)
- Scene 2: Clone and customize (S12)
- Scene 3: Best practices review (S14)

**Act 6: Custom Detection Logic**
- Scene 1: AI-assisted calculation (S9)
- Scene 2: Build a use case (S15)
- Scene 3: Submit for review (S16 + S17 + S18)

**Act 7: Investigation & Analysis**
- Scene 1: Alert deep-dive (S21)
- Scene 2: Version comparison (S22)
- Scene 3: Distribution analysis (S23)

---

## 9. Files Summary

### New Files to Create

**Backend:**
- `backend/api/domain_values.py` — domain values router
- `backend/api/match_patterns.py` — match patterns router
- `backend/api/score_templates.py` — score templates router
- `backend/api/use_cases.py` — use cases router
- `backend/api/submissions.py` — submissions router
- `backend/services/validation_service.py` — 5-layer validation engine
- `backend/services/ai_context_builder.py` — LLM context builder
- `backend/services/recommendation_service.py` — change classification + suggestions
- `backend/models/match_patterns.py` — MatchPattern Pydantic model
- `backend/models/score_templates.py` — ScoreTemplate Pydantic model
- `backend/models/use_cases.py` — UseCase, Submission Pydantic models

**Frontend:**
- `frontend/src/components/SuggestionInput.tsx` — domain value autocomplete
- `frontend/src/components/MatchPatternPicker.tsx` — pattern bank UI
- `frontend/src/components/ScoreStepBuilder.tsx` — visual score builder
- `frontend/src/components/ScoreTemplatePicker.tsx` — template picker UI
- `frontend/src/components/ValidationPanel.tsx` — real-time validation sidebar
- `frontend/src/components/PreviewPanel.tsx` — live score simulation
- `frontend/src/components/DependencyGraph.tsx` — mini-DAG for model dependencies
- `frontend/src/components/TourEngine/ScenarioRunner.tsx` — tour execution engine
- `frontend/src/components/TourEngine/ScenarioSelector.tsx` — scenario browser
- `frontend/src/components/TourEngine/StepOverlay.tsx` — step highlight/tooltip
- `frontend/src/components/TourEngine/OperationScripts.tsx` — per-screen help
- `frontend/src/hooks/useDomainValues.ts` — domain value fetch hook
- `frontend/src/views/UseCaseStudio/index.tsx` — use case builder view
- `frontend/src/views/Submissions/index.tsx` — submission review queue view
- `frontend/src/data/scenarioDefinitions.ts` — all 25 scenario definitions
- `frontend/src/data/operationScripts.ts` — per-screen operation scripts

**Metadata:**
- `workspace/metadata/match_patterns/*.json` — OOB match patterns (9)
- `workspace/metadata/score_templates/*.json` — OOB score templates (7)
- `workspace/use_cases/` — use case storage directory
- `workspace/submissions/` — submission storage directory

**Tests:**
- `tests/test_domain_values.py`
- `tests/test_match_patterns.py`
- `tests/test_score_templates.py`
- `tests/test_validation_service.py`
- `tests/test_use_cases.py`
- `tests/test_submissions.py`
- `tests/test_recommendations.py`
- `tests/test_param_migration.py`
- `tests/test_date_range.py`
- `tests/e2e/test_domain_suggestions.py`
- `tests/e2e/test_match_patterns.py`
- `tests/e2e/test_score_builder.py`
- `tests/e2e/test_model_wizard.py`
- `tests/e2e/test_use_case_studio.py`
- `tests/e2e/test_submissions.py`
- `tests/e2e/test_guided_tours.py`
- `tests/e2e/test_gap_fixes.py`

### Existing Files to Modify

**Backend:**
- `backend/main.py` — register new routers
- `backend/services/metadata_service.py` — add match pattern/score template CRUD
- `backend/services/ai_service.py` — add calculation generation context
- `backend/engine/calculation_engine.py` — sandbox mode
- `backend/engine/detection_engine.py` — comparison mode, dry run
- `backend/api/metadata.py` — enhanced validation
- `backend/db.py` — distinct value query helpers

**Frontend:**
- `frontend/src/views/SettingsManager/SettingForm.tsx` — SuggestionInput, ScoreStepBuilder
- `frontend/src/views/SettingsManager/SettingDetail.tsx` — enhanced score display
- `frontend/src/views/SettingsManager/OverrideEditor.tsx` — dynamic context fields
- `frontend/src/views/ModelComposer/ModelCreateForm.tsx` — full wizard upgrade
- `frontend/src/views/ModelComposer/index.tsx` — preview panel, validation panel
- `frontend/src/views/MetadataExplorer/CalculationForm.tsx` — SuggestionInput for dependencies
- `frontend/src/views/EntityDesigner/EntityForm.tsx` — SuggestionInput for relationships
- `frontend/src/views/MetadataEditor/SettingsEditor.tsx` — ScoreStepBuilder, patterns
- `frontend/src/views/MetadataEditor/DetectionModelEditor.tsx` — SuggestionInput
- `frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx` — data-driven dates
- `frontend/src/stores/metadataStore.ts` — domain values, patterns, templates state
- `frontend/src/data/tourDefinitions.ts` — expanded with scenarios
- `frontend/src/App.tsx` — new routes for UseCaseStudio, Submissions

**Metadata:**
- All 10 calculation JSONs — $param migration (G1)
- 8+ settings JSONs — fixed_income/index overrides (G3)

**Docs:**
- `docs/demo-guide.md` — new Acts 4-7
- `docs/progress.md` — new milestones
- `docs/plans/2026-02-24-comprehensive-roadmap.md` — add new phase priority

---

## 10. Implementation Order (Suggested)

Phase 7B (this design) should be implemented in this order:

1. **G1-G3 gap fixes** — foundation, no UX dependency
2. **Backend: domain values API** — needed by all frontend components
3. **Backend: match patterns + score templates** — needed by frontend components
4. **Frontend: SuggestionInput + useDomainValues** — reusable component, used everywhere
5. **Frontend: MatchPatternPicker** — used in settings forms
6. **Frontend: ScoreStepBuilder + ScoreTemplatePicker** — used in settings forms
7. **Frontend: Settings Manager form upgrades** — wire in new components
8. **Frontend: Model Composer wizard upgrade** — the big form enhancement
9. **Frontend: Preview + Validation + Dependency panels** — model composer enrichment
10. **Backend: validation service + sandbox** — needed for use cases
11. **Backend: use cases + submissions** — new workflow
12. **Frontend: Use Case Studio + Submissions view** — new views
13. **Backend: AI context builder + calc generation** — AI features
14. **Backend: recommendations engine** — submission analysis
15. **Frontend: Tour engine + scenarios** — guided demo system
16. **Testing: unit + E2E + BDD** — throughout, but final pass here
17. **Docs: demo guide, progress, roadmap updates** — final documentation

*Estimated: ~25-30 milestones across all workstreams.*
