# Bidirectional Gap Analysis: Current Implementation vs. Proposed Architecture

**Document**: 03 of the Data Modeling Design Considerations series
**Audience**: All -- this document is referenced by every subsequent concept document
**Last updated**: 2026-03-09

---

## How to Read This Document

Each section below covers one proposed architectural concept. For each concept, you will find:

- **Proposed**: What the target architecture describes
- **Current State**: What the codebase does today, with file paths and code references
- **Gap Assessment**: A single checkbox indicating whether the concept fully exists, partially exists, or does not exist
- **Gap Details**: A table breaking down each aspect of the concept
- **Dependencies**: Which other concepts in this series must land first
- **Migration Risk**: What existing functionality breaks, what is backwards-compatible

All file paths are relative to the repository root. All code references point to specific classes, methods, or JSON structures in the current codebase.

---

## 1. Match Pattern Architecture

### Proposed

A universal 3-column match pattern structure (`entity`, `entity_attribute`, `attribute_value`) with a `pattern_type` discriminator that categorizes every pattern into one of six types: `detection_level`, `classification`, `threshold`, `score`, `setting`, `time_window`. Match patterns are first-class metadata objects -- stored in their own table, referenceable by ID, composable, stackable, and shared across detection models, settings overrides, and scoring rules.

The proposed schema for a match pattern row:

```
pattern_id | pattern_type | entity | entity_attribute | attribute_value
```

Example: `"P-EQ-NYSE" | "threshold" | "product" | "asset_class" | "equity"` combined with `"P-EQ-NYSE" | "threshold" | "product" | "exchange_mic" | "XNYS"`.

### Current State

Match patterns exist today in two separate forms:

**1. Flat `{key: value}` match objects on settings overrides**

Every settings JSON file in `workspace/metadata/settings/` uses a `match` dictionary on each override. The match is a flat object where keys are attribute names and values are the required attribute values. There is no entity reference -- the keys are bare attribute names that float without explicit entity binding.

File: `workspace/metadata/settings/thresholds/wash_vwap_threshold.json`
```json
{
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    {"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012, "priority": 2},
    {"match": {"product": "AAPL"}, "value": 0.01, "priority": 100}
  ]
}
```

The Pydantic model that validates this structure:

File: `backend/models/settings.py`
```python
class SettingOverride(BaseModel):
    match: dict[str, str]
    value: Any
    priority: int = Field(ge=0)
```

The `match` field is `dict[str, str]` -- completely untyped. There is no validation that the keys correspond to actual entity attributes, no entity reference, and no pattern_type discriminator.

**2. Standalone match pattern files**

There are 9 match pattern files in `workspace/metadata/match_patterns/`:
- `commodity_instruments.json`, `equity_nyse.json`, `equity_stocks.json`, `fixed_income_all.json`, `fixed_income_bonds.json`, `fx_instruments.json`, `index_instruments.json`, `nasdaq_listed.json`, `nyse_listed.json`

Each file has a consistent structure:
```json
{
  "pattern_id": "equity_nyse",
  "label": "Equity on NYSE",
  "description": "Equity instruments listed on New York Stock Exchange",
  "match": {"asset_class": "equity", "exchange_mic": "XNYS"},
  "created_at": "2026-02-25T10:00:00Z",
  "layer": "oob"
}
```

These patterns use the same flat `{key: value}` structure as settings overrides. They have a `pattern_id` and human-readable label, but they are **not referenced by any settings override**. The settings overrides inline their match criteria; the standalone match patterns are a parallel concept that is not yet connected.

**3. How matches are evaluated at runtime**

File: `backend/engine/settings_resolver.py`

```python
def _all_keys_match(match: dict[str, str], context: dict[str, str]) -> bool:
    return all(context.get(k) == v for k, v in match.items())
```

The context dictionary is built from query result columns in the detection engine:

File: `backend/engine/detection_engine.py`, lines 123-126
```python
entity_context = {
    k: str(v) for k, v in row.items()
    if k in model.context_fields and v is not None
}
```

The context keys (`asset_class`, `instrument_type`, `exchange_mic`, etc.) come from SQL query result columns. There is no entity graph traversal -- all attributes must be pre-joined into the query result for matching to work.

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Pattern structure | Flat `{key: value}` dict -- keys are bare attribute names with no entity binding | 3-column table (`entity`, `entity_attribute`, `attribute_value`) with explicit entity reference | Redesign | M |
| Pattern types | No type discriminator -- all match objects serve the same undifferentiated purpose | 6 pattern types (`detection_level`, `classification`, `threshold`, `score`, `setting`, `time_window`) driving different behaviors | Missing | M |
| Pattern storage | Dual: inline on settings overrides + standalone JSON files (disconnected) | Single `match_patterns` table/collection with `pattern_id` as foreign key everywhere | Redesign | M |
| Pattern reuse | Settings overrides inline their criteria; patterns in `match_patterns/` are not referenced by overrides | All settings overrides reference patterns by `pattern_id` instead of inlining criteria | Missing | S |
| Pattern stacking | Single match object per override; multi-dimensional matching counts matched keys | Multiple pattern rows per `pattern_id` build up a composite match; AND semantics within a pattern | Partial | S |
| Entity awareness | Match keys (`asset_class`, `exchange_mic`) are bare strings -- no validation against entity field definitions | Each match row specifies the `entity` the attribute belongs to, validated against entity metadata | Missing | M |
| Pattern validation | `dict[str, str]` -- no compile-time or load-time validation that keys are real attributes | Schema validation ensures `entity` + `entity_attribute` exist in entity metadata | Missing | S |

### Dependencies

- **Entity Graph Reachability (Section 8)** -- entity-aware match patterns require knowing which entity owns which attribute
- **Resolution Priority (Section 5)** -- the proposed granularity-based priority replaces the current manual `priority` integer, which changes how match patterns are ranked

### Migration Risk

**What breaks**: Settings overrides currently use inline `match` objects. Changing to `pattern_id` references requires migrating all 14 settings files and updating the `SettingOverride` Pydantic model. The `HierarchyStrategy` and `MultiDimensionalStrategy` classes in `settings_resolver.py` compare `match` dictionaries directly -- they would need to resolve pattern IDs to match criteria first.

**What is backwards-compatible**: The standalone match pattern files in `workspace/metadata/match_patterns/` already have `pattern_id` fields and a compatible structure. These can serve as the seed data for the new match pattern table. The `_all_keys_match()` function logic is preserved -- the comparison semantics do not change, only how the match criteria are sourced.

**Recommended migration path**: Support both inline `match` and `pattern_id` reference during a transition period. Add a `pattern_ref` field to `SettingOverride` alongside the existing `match` field; when `pattern_ref` is present, resolve it to match criteria from the pattern store. This allows incremental migration of settings files.

---

## 2. Calculation Instance

### Proposed

A **calculation instance** is the cross-product of a calculation definition and a match pattern, producing a fully resolved, parameterized computation. The instance formalizes what today is an implicit relationship: a calculation's `$param` placeholders are resolved via settings, and those settings are resolved via match patterns. The proposed architecture makes this relationship explicit and trackable:

```
calc_instance_id | calc_id | match_pattern_id | resolved_params | status
```

Each instance represents a specific execution context -- for example, "VWAP calculation for equity instruments on NYSE" with all thresholds and parameters resolved for that specific market segment.

### Current State

Calculations are defined as JSON files in `workspace/metadata/calculations/` organized by layer (transaction, time_window, aggregation, derived). Each calculation has a `parameters` block that references settings or literal values.

File: `workspace/metadata/calculations/time_windows/business_date_window.json`
```json
{
  "parameters": {
    "cutoff_time": {
      "source": "setting",
      "setting_id": "business_date_cutoff",
      "default": "17:00:00"
    }
  }
}
```

At runtime, the `CalculationEngine._resolve_parameters()` method resolves these references:

File: `backend/engine/calculation_engine.py`, lines 161-187
```python
def _resolve_parameters(self, calc: CalculationDefinition) -> dict[str, Any]:
    resolved: dict[str, Any] = {}
    for name, spec in calc.parameters.items():
        if not isinstance(spec, dict) or "source" not in spec:
            continue
        if spec["source"] == "setting" and self._resolver is not None:
            setting_id = spec.get("setting_id", "")
            setting = self._metadata.load_setting(setting_id)
            if setting is not None:
                result = self._resolver.resolve(setting, {})  # empty context!
                resolved[name] = result.value
            else:
                resolved[name] = spec.get("default")
        elif spec["source"] == "literal":
            resolved[name] = spec.get("value")
    return resolved
```

**Critical observation**: On line 178, the resolver is called with an **empty context** `{}`. This means the settings resolver always falls through to the default value -- it never resolves context-specific overrides during calculation execution. The asset-class-specific overrides on settings (e.g., "equity gets cutoff 21:00") are never activated during calculation parameter resolution because no entity context is passed.

The context-aware resolution only happens in the detection engine, where `_evaluate_calculation()` passes `entity_context` to the resolver (detection_engine.py, line 192). But this is for score step resolution, not for calculation parameter resolution.

After resolution, `$param` placeholders in SQL are replaced via string substitution:

File: `backend/engine/calculation_engine.py`, lines 189-211
```python
@staticmethod
def _substitute_parameters(sql: str, params: dict[str, Any]) -> str:
    for name, value in params.items():
        placeholder = f"${name}"
        if placeholder not in sql:
            continue
        # ... safe value formatting ...
        sql = sql.replace(placeholder, formatted)
    return sql
```

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Calc parameterization | `$param` placeholders in SQL resolved via `_resolve_parameters()` with string substitution | Same mechanism, but resolution happens per-instance with full entity context | Partial | S |
| Parameter sources | Two sources: `"setting"` (resolved via settings engine) and `"literal"` (hardcoded value) | Same two sources, plus `"match_pattern"` for pattern-derived parameters | Partial | S |
| Context at resolution | `_resolve_parameters()` passes empty context `{}` -- overrides never fire for calc parameters | Each instance carries a match pattern that provides the resolution context | Missing | M |
| Calc reuse across models | Calculations are shared via `depends_on` references and SQL table names; 5 models share 10 calcs | Same reuse, but each model-calc combination is a formalized instance with its own resolved params | Missing | M |
| Instance identity | No concept -- a calculation is run once globally, producing one result table for all contexts | Each instance has a `calc_instance_id`, enabling per-context result tracking and audit | Missing | M |
| Instance tracking | No instance registry -- calc execution is fire-and-forget with Parquet output | Instance registry tracks resolved params, execution status, timestamps, row counts | Missing | L |
| Instance reuse | Same calc runs identically regardless of context (because context is empty) | Instances with identical resolved params can be deduplicated; changed params trigger re-execution | Missing | M |

### Dependencies

- **Match Pattern Architecture (Section 1)** -- instances are defined as calc x match_pattern; patterns must exist first
- **Resolution Priority (Section 5)** -- parameter resolution needs the proposed priority rules to select the right override

### Migration Risk

**What breaks**: The current calculation engine runs each calculation exactly once and materializes it as a single DuckDB table (`calc_value`, `calc_trading_activity`, etc.). Multiple detection models then query the same table. If calculations are instantiated per-context, either (a) each instance produces a separate table (table proliferation), or (b) the unified results schema (Section 6) must land first to receive all instance results.

**What is backwards-compatible**: The `$param` substitution mechanism, the DAG topological sort, and the Parquet output are all preserved. The `CalculationDefinition` model does not need structural changes -- instances wrap it rather than replace it. The `depends_on` graph remains valid.

**Key risk**: Passing entity context to `_resolve_parameters()` changes calculation output. Today, `business_date_cutoff` always resolves to the default `"17:00"` for all executions. If context-aware resolution is enabled, NYSE executions would get `"21:00"` and London executions would get `"16:30"`. This changes calculation results and downstream alert counts. The change is semantically correct (the overrides exist for a reason), but it is a **behavioral change** that affects alert volumes and requires validation against known-good results.

---

## 3. Time Window

### Proposed

Time windows become a first-class result table (`time_windows`) that is registered, queryable, and joinable with calculation results. Windows are categorized as:

- **Simple** (precomputable): fixed windows like "business date" or "calendar week" that can be materialized once
- **Complex** (on-the-fly): event-driven windows like "cancellation pattern" or "market event" that depend on data conditions

Each window is registered with its grain (which entities it applies to), its temporal boundaries (`window_start`, `window_end`), and its type.

### Current State

Time windows are implemented as calculations in the `time_window` layer. There are 4 time window calculations:

| Calc ID | File | Type (proposed) | Grain |
|---------|------|-----------------|-------|
| `business_date_window` | `workspace/metadata/calculations/time_windows/business_date_window.json` | Simple | execution_id |
| `cancellation_pattern` | `workspace/metadata/calculations/time_windows/cancellation_pattern.json` | Complex | product_id + account_id + date + side |
| `market_event_window` | `workspace/metadata/calculations/time_windows/market_event_window.json` | Complex | product_id |
| `trend_window` | `workspace/metadata/calculations/time_windows/trend_window.json` | Complex | product_id |

Each produces a separate DuckDB table:
- `calc_business_date_window` -- adds `business_date`, `window_start`, `window_end` to each execution
- `calc_cancellation_pattern` -- creates pattern windows with `window_start`, `window_end`, `pattern_date`
- `calc_market_event_window` -- creates event windows with `lookback_start`, `lookforward_end`
- `calc_trend_window` -- creates trend windows with `window_start`, `window_end`

Detection models reference time windows by name in their `time_window` field:

File: `workspace/metadata/detection_models/wash_full_day.json`
```json
{
  "time_window": "business_date"
}
```

File: `workspace/metadata/detection_models/market_price_ramping.json`
```json
{
  "time_window": "trend_window"
}
```

However, this `time_window` field is **documentation only** -- the detection engine does not use it to join or filter results. The actual join between calculations and time windows happens entirely within the detection model's SQL `query` field. For example, the market price ramping model's query manually joins `calc_large_trading_activity ta INNER JOIN calc_trend_window tw ON ta.product_id = tw.product_id`.

The calculation engine processes time window calculations in the `TIME_WINDOW` layer between `TRANSACTION` and `AGGREGATION`:

File: `backend/engine/calculation_engine.py`, lines 19-24
```python
LAYER_ORDER = [
    CalculationLayer.TRANSACTION,
    CalculationLayer.TIME_WINDOW,
    CalculationLayer.AGGREGATION,
    CalculationLayer.DERIVED,
]
```

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Time window definition | 4 calculations in `time_window` layer, each with SQL logic and output schema | First-class `time_windows` result table with standardized schema (`window_id`, `window_type`, `window_start`, `window_end`, dimension keys) | Partial | M |
| Simple vs complex | No categorization -- all 4 are treated identically as calculations | Explicit `simple` vs `complex` flag determining precomputation strategy | Missing | S |
| Window registration | Each window is a separate DuckDB table (`calc_business_date_window`, `calc_trend_window`, etc.) | Single `time_windows` table with `window_type` discriminator; all windows registered in one place | Redesign | M |
| Join with calculations | Manual SQL joins in detection model `query` fields; the `time_window` model field is documentation-only | Engine automatically joins calculations to their time window based on registration metadata | Missing | L |
| Window output schema | Each window has its own bespoke output schema (different column names for start/end boundaries) | Standardized columns: `window_id`, `window_type`, `window_start`, `window_end`, plus dimension keys | Partial | M |
| Window parameterization | Windows use `$param` placeholders resolved via settings (e.g., `$cutoff_time`, `$lookback_days`) | Same mechanism, enhanced with per-instance context resolution | Partial | S |
| Window reuse | Windows are implicitly reused when multiple models join to the same table | Explicit registration enables models to declare which window types they consume | Missing | S |

### Dependencies

- **Calculation Instance (Section 2)** -- time windows are a specialized type of calculation instance
- **Unified Results Schema (Section 6)** -- a unified `time_windows` table is part of the same schema unification effort

### Migration Risk

**What breaks**: Consolidating 4 separate tables into one `time_windows` table changes the SQL that detection model queries use. Every detection model's `query` field references specific table names (`calc_trend_window`, `calc_cancellation_pattern`, etc.). These queries would need rewriting to join against the unified `time_windows` table with a `WHERE window_type = '...'` filter.

**What is backwards-compatible**: The calculation DAG layer ordering (`TRANSACTION -> TIME_WINDOW -> AGGREGATION -> DERIVED`) already treats time windows as a distinct concept. The `CalculationLayer.TIME_WINDOW` enum value exists. The temporal boundary columns (`window_start`, `window_end`) are already present in all 4 window calculations.

**Recommended migration path**: Phase 1 -- add a `window_type` field to existing time window calculations and standardize output column names. Phase 2 -- create a unified `time_windows` view that UNION ALLs the individual tables. Phase 3 -- migrate detection model queries to use the view. This preserves the existing tables throughout migration.

---

## 4. Detection Level

### Proposed

Detection levels become a match pattern type (`pattern_type = 'detection_level'`) that configures the analysis grain per model. Instead of hardcoding `granularity: ["product_id", "account_id"]`, the grain is driven by metadata: a detection_level pattern specifies which entity keys define the GROUP BY dimensions for that model's analysis.

Different detection levels enable the same model to run at different grains -- for example, "per-trader-day" vs. "per-account-product-day" -- without code changes, controlled by which detection_level pattern is assigned.

### Current State

Detection levels are defined as a static `granularity` array in each detection model JSON:

File: `workspace/metadata/detection_models/wash_full_day.json`
```json
{
  "granularity": ["product_id", "account_id"]
}
```

All 5 detection models use the same granularity:
- `insider_dealing`: `["product_id", "account_id"]`
- `market_price_ramping`: `["product_id", "account_id"]`
- `spoofing_layering`: `["product_id", "account_id"]`
- `wash_full_day`: `["product_id", "account_id"]`
- `wash_intraday`: `["product_id", "account_id"]`

The Pydantic model that validates this:

File: `backend/models/detection.py`, line 32
```python
class DetectionModelDefinition(BaseModel):
    granularity: list[str] = Field(description="Grouping dimensions, e.g. ['product_id', 'account_id']")
```

The `granularity` field is a simple `list[str]` with no validation against entity metadata. The field names are SQL column names, not entity-qualified attribute references.

**How granularity is actually used**: The `granularity` field is not directly consumed by the detection engine at runtime. The actual grouping happens in the detection model's `query` SQL -- for example, `calc_trading_activity` already aggregates by `product_id, account_id, business_date` in its SQL (defined in `workspace/metadata/calculations/aggregations/trading_activity_aggregation.json`). The `granularity` field on the model is declarative metadata for documentation and UI display, not an engine-enforced constraint.

The detection engine iterates over query result rows, evaluating each row as a candidate:

File: `backend/engine/detection_engine.py`, lines 37-46
```python
candidates = self._execute_query(model.query)
for row in candidates:
    alert = self._evaluate_candidate(model, row, len(candidates))
    alerts.append(alert)
```

There is no runtime GROUP BY driven by the `granularity` array -- the grouping is baked into the SQL.

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Grain definition | Static `list[str]` on model JSON (`["product_id", "account_id"]`) | Match pattern of `type=detection_level` specifying grain per model + market segment | Partial | M |
| Flexible grain | All 5 models use identical grain (`product_id + account_id`); changing requires editing model JSON | Different detection_level patterns assign different grains per asset class or venue; no code change | Missing | L |
| Entity graph reachability | Grain keys are bare column names; `product_id` implies nothing about which entity it belongs to | Grain keys reference entity-qualified attributes; the engine resolves them via the entity graph | Missing | L |
| Downstream constraint | Grain is documentation-only; actual grouping is in SQL queries, not enforced by engine | Engine uses detection_level grain to validate/generate GROUP BY clauses and constraint aggregation queries | Missing | L |
| Runtime enforcement | Detection engine processes each query row independently; `granularity` is not used at runtime | Engine groups candidates by detection_level grain before scoring, ensuring one alert per grain combination | Missing | M |
| Grain per market segment | Single global grain per model; no per-asset-class variation | Different detection_level patterns can assign different grains to the same model for different markets | Missing | M |

### Dependencies

- **Match Pattern Architecture (Section 1)** -- detection_level is a pattern type; pattern infrastructure must exist first
- **Entity Graph Reachability (Section 8)** -- entity-qualified grain keys require graph walking to resolve attributes across entity boundaries

### Migration Risk

**What breaks**: If the engine starts enforcing granularity at runtime (generating GROUP BY clauses or validating query output), the existing detection model SQL queries must produce results that align with the declared grain. Currently, the `query` SQL and the `granularity` field are independent -- they could potentially disagree. Enforcement would surface any such disagreements as runtime errors.

**What is backwards-compatible**: The `granularity` field already exists on all 5 models and contains the correct values. Moving from `list[str]` to a `pattern_id` reference is an additive change -- the existing field can remain as a fallback while the pattern-based approach is built out.

**Key risk**: Flexible grain changes the fundamental unit of analysis. If a model switches from `(product_id, account_id)` to `(trader_id)`, the same trading activity produces a different number of alerts with different entity contexts. This is a feature, not a bug, but it requires careful validation because alert volumes will change.

---

## 5. Resolution Priority

### Proposed

Priority is determined automatically by the granularity (specificity) of the match pattern, eliminating the need for manual `priority` integers:

1. **Entity key match** (e.g., `product_id = 'AAPL'`) -- highest priority. A direct entity key is the most specific possible match.
2. **Most attribute matches** -- more matched attributes means more specific context. `{asset_class: "equity", exchange_mic: "XNYS"}` (2 attributes) beats `{asset_class: "equity"}` (1 attribute).
3. **Fewer attribute matches** -- broader patterns with fewer attributes rank lower.
4. **Default** -- no match pattern at all; the setting's `default` value is used.

Tiebreaking within the same specificity level uses a deterministic rule (e.g., alphabetical pattern_id) rather than a manual priority number.

### Current State

The settings resolver uses a two-part priority system:

**1. Strategy pattern in `SettingsResolver`**

File: `backend/engine/settings_resolver.py`, lines 89-118
```python
class SettingsResolver:
    def resolve(self, setting: SettingDefinition, context: dict[str, str]) -> ResolutionResult:
        strategy = RESOLUTION_STRATEGIES.get(setting.match_type)
        matched = strategy.resolve(setting.overrides, context)
        if matched is not None:
            return ResolutionResult(
                setting_id=setting.setting_id,
                value=matched.value,
                matched_override=matched,
                why=f"Matched override: {{{match_desc}}} (priority {matched.priority})",
            )
        return ResolutionResult(
            setting_id=setting.setting_id,
            value=setting.default,
            why="No matching override; using default value",
        )
```

**2. Two resolution strategies**

`HierarchyStrategy` (lines 40-54): All match keys must be present in context. Sorts by `(len(match), priority)` descending -- most specific wins, then highest priority wins.

```python
class HierarchyStrategy:
    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None:
        candidates = []
        for ov in overrides:
            if _all_keys_match(ov.match, context):
                candidates.append(ov)
        candidates.sort(key=lambda o: (len(o.match), o.priority), reverse=True)
        return candidates[0]
```

`MultiDimensionalStrategy` (lines 57-72): Count how many dimensions match. Sorts by `(match_count, priority)` descending.

```python
class MultiDimensionalStrategy:
    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None:
        candidates = []
        for ov in overrides:
            match_count = _count_matching_dimensions(ov.match, context)
            if match_count > 0:
                candidates.append((match_count, ov))
        candidates.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
        return candidates[0][1]
```

**3. Manual priority integers**

Each override carries an integer `priority` field (Pydantic: `priority: int = Field(ge=0)`). Higher priority wins within the same specificity level. The `SettingDefinition` model pre-sorts overrides by priority descending at load time:

File: `backend/models/settings.py`, lines 29-32
```python
@model_validator(mode="after")
def sort_overrides_by_priority(self):
    self.overrides = sorted(self.overrides, key=lambda o: o.priority, reverse=True)
    return self
```

In practice, the priority values used across all 14 settings files are:
- `priority: 1` -- standard overrides (e.g., per-asset-class)
- `priority: 2` -- more specific multi-key overrides (e.g., `{asset_class + exchange_mic}`)
- `priority: 100` -- product-specific overrides (e.g., `{product: "AAPL"}`)

**4. Strategy registry**

File: `backend/engine/settings_resolver.py`, lines 79-82
```python
RESOLUTION_STRATEGIES: dict[str, ResolutionStrategy] = {
    "hierarchy": HierarchyStrategy(),
    "multi_dimensional": MultiDimensionalStrategy(),
}
```

All 14 current settings use `"match_type": "hierarchy"`. The `multi_dimensional` strategy exists but is not used by any production setting.

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Priority mechanism | Manual `priority: int` on each override + `len(match)` specificity sort | Automatic: entity key > most attributes > fewer attributes > default; no manual numbers | Partial | M |
| Entity key overrides | Convention-based: `priority: 100` for product-specific overrides | Structural: entity key matches are recognized by type (the match key is a primary key of an entity) | Missing | M |
| Default handling | Explicit `default` field on `SettingDefinition`; used when no override matches | Same semantics, lowest priority tier; no change needed | Fully exists | - |
| Tiebreaking | Within same `(len, priority)`: undefined (depends on list ordering from JSON parse) | Deterministic: alphabetical pattern_id, or newest-created-wins, or explicit precedence | Partial | S |
| Strategy consolidation | Two strategies (`hierarchy`, `multi_dimensional`) with different semantics | Single unified resolution algorithm that subsumes both strategies | Partial | M |
| Specificity detection | `len(match)` counts keys; no distinction between entity key match vs. attribute match | Entity key matches (primary keys) are structurally distinct from attribute matches | Missing | M |
| Backwards compatibility | `priority` field on every override in all 14 settings files | Priority field becomes optional/ignored; specificity determines ranking | Partial | S |

### Dependencies

- **Match Pattern Architecture (Section 1)** -- entity-aware patterns are needed to distinguish entity key matches from attribute matches
- **Entity Graph Reachability (Section 8)** -- determining whether a match key is a primary key requires entity metadata traversal

### Migration Risk

**What breaks**: Removing or ignoring the `priority` field changes resolution order. The current system has `{product: "AAPL"}` at `priority: 100` explicitly beating `{asset_class: "equity"}` at `priority: 1`. Under the proposed system, the same ranking holds (entity key > attribute match), but the mechanism is different. The risk is in edge cases where the current priority assignments do not align with the proposed specificity hierarchy.

**What is backwards-compatible**: The `HierarchyStrategy` already uses `len(match)` as the primary sort key, with `priority` as a tiebreaker. The proposed system keeps the same primary sort (specificity = number of matched attributes) and simply removes the secondary sort (manual priority). For all current settings, the two systems produce identical results because more-specific overrides already have higher or equal priority.

**Validation approach**: Run the settings resolver with both old and new priority logic on all 14 settings files with all possible context combinations from the 5 detection models. Any divergence in resolved values flags a migration issue.

---

## 6. Unified Results Schema

### Proposed

All calculation results flow into a single `calc_results` fact table with a star schema design:

```
calc_results:
  result_id | calc_id | calc_instance_id | model_id
  product_id | account_id | trader_id | business_date
  value_field | computed_value
  window_id (FK to time_windows)
  ... sparse dimension columns ...
```

There is no per-calculation table. All detection models query the same `calc_results` table, filtered by `calc_id` and dimension keys. This eliminates table proliferation and standardizes downstream queries.

### Current State

Each calculation produces its own DuckDB table with a bespoke schema:

| Calculation | Table Name | Key Columns |
|-------------|-----------|-------------|
| `value_calc` | `calc_value` | `execution_id`, `calculated_value` |
| `adjusted_direction` | `calc_adjusted_direction` | `execution_id`, `adjusted_side` |
| `business_date_window` | `calc_business_date_window` | `execution_id`, `business_date` |
| `cancellation_pattern` | `calc_cancellation_pattern` | `pattern_id`, `cancel_count` |
| `market_event_window` | `calc_market_event_window` | `event_id`, `price_change_pct` |
| `trend_window` | `calc_trend_window` | `trend_id`, `price_change_pct` |
| `trading_activity_aggregation` | `calc_trading_activity` | `product_id`, `account_id`, `net_value` |
| `vwap_calc` | `calc_vwap` | `product_id`, `account_id`, `vwap_proximity` |
| `large_trading_activity` | `calc_large_trading_activity` | `product_id`, `account_id`, `total_value` |
| `wash_detection` | `calc_wash_detection` | `product_id`, `account_id`, `qty_match_ratio` |

Table names are derived from the calculation's `output.table_name` field:

File: `backend/engine/calculation_engine.py`, line 120
```python
table_name = calc.output.get("table_name", f"calc_{calc.calc_id}")
```

Tables are created via `CREATE TABLE AS`:

File: `backend/engine/calculation_engine.py`, line 150
```python
cursor.execute(f'CREATE TABLE "{table_name}" AS {sql}')
```

Each table has different columns, different data types, and different key structures. The only common pattern is that most include `product_id` and `account_id` as dimensions.

Results are also persisted as Parquet files organized by layer:

File: `backend/engine/calculation_engine.py`, lines 213-223
```python
def _write_parquet(self, calc, table_name, sql):
    layer_dir = self._workspace / "results" / calc.layer.value
    layer_dir.mkdir(parents=True, exist_ok=True)
    parquet_path = layer_dir / f"{table_name}.parquet"
    arrow_table = cursor.execute(f'SELECT * FROM "{table_name}"').fetch_arrow_table()
    pq.write_table(arrow_table, parquet_path)
```

The Parquet output directory structure is:
```
workspace/results/
  transaction/calc_value.parquet
  transaction/calc_adjusted_direction.parquet
  time_window/calc_business_date_window.parquet
  time_window/calc_trend_window.parquet
  aggregation/calc_trading_activity.parquet
  aggregation/calc_vwap.parquet
  derived/calc_large_trading_activity.parquet
  derived/calc_wash_detection.parquet
```

### Gap Assessment

- [x] Does not exist (new implementation)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Result storage | 10 separate DuckDB tables, each with bespoke schema | Single `calc_results` fact table with standardized columns | Redesign | L |
| Result schema | Each table has different columns; no standardized value column convention (some use `calculated_value`, others `total_value`, `qty_match_ratio`, `vwap_proximity`) | Standardized: `calc_id`, `value_field`, `computed_value` as universal columns, plus dimension keys | Redesign | L |
| Dimension keys | Dimension columns vary per table; `product_id` is common but not universal | Fixed set of dimension columns (sparse -- NULLable when not applicable) on every result row | Redesign | M |
| Star schema | No dimension tables; entity data is denormalized into calculation SQL via JOINs | Dimension tables for product, account, trader, venue; fact table references by FK | Missing | L |
| Cross-calc queries | Requires multi-table JOINs in detection model SQL; each model hand-writes its joins | Single-table queries with WHERE filters on `calc_id`; no cross-table joins needed | Missing | L |
| Parquet output | Per-calc Parquet files in layer-organized directories | Single `calc_results.parquet` or partitioned by `calc_id` + `business_date` | Redesign | M |
| DuckDB table lifecycle | Tables are DROP'd and recreated on each engine run | Incremental upsert with deduplication by `result_id` | Missing | M |

### Dependencies

- **Calculation Instance (Section 2)** -- the `calc_instance_id` column on `calc_results` requires the instance model
- **Time Window (Section 3)** -- the `window_id` FK requires the unified time_windows table

### Migration Risk

**What breaks**: Every detection model's `query` SQL references specific table names (`calc_wash_detection`, `calc_large_trading_activity`, etc.) with specific column names. Moving to a single `calc_results` table requires rewriting all 5 detection model queries. The calculation engine's `_execute()` method creates tables by name, and the detection engine's `_execute_query()` runs arbitrary SQL -- both would need changes.

**What is backwards-compatible**: The Parquet output can coexist -- new `calc_results.parquet` alongside existing per-calc files. The `value_field` convention already exists on calculation definitions (`"value_field": "calculated_value"`, `"value_field": "qty_match_ratio"`, etc.), which maps directly to the proposed `value_field` column.

**This is the highest-effort gap in the entire analysis.** It touches the core data flow of both engines and all detection model queries. A phased approach is essential: create the unified table as a VIEW that UNION ALLs existing tables, then incrementally migrate queries to use the view, then consolidate storage.

---

## 7. Scoring Pipeline

### Proposed

Score steps are resolved via match patterns of `type=score`, enabling multi-axis scoring where different contexts (asset class, venue, instrument type) get different score step definitions. Additionally, scoring becomes two-dimensional: **context** (which score steps to use) x **magnitude** (how the computed value maps to a score within those steps).

Score templates (predefined scoring curves like `volume_standard`, `ratio_graduated`) provide reusable baselines that match patterns can override for specific market segments.

### Current State

Scoring is implemented across two files:

**Score step resolution in the detection engine:**

File: `backend/engine/detection_engine.py`, lines 176-229
```python
def _evaluate_calculation(self, mc, row, context):
    value_column = mc.value_field or mc.calc_id
    computed_value = float(row.get(value_column, 0) or 0)

    if mc.score_steps_setting:
        setting = self._metadata.load_setting(mc.score_steps_setting)
        if setting:
            resolution = self._resolver.resolve(setting, context)
            steps = self._parse_score_steps(resolution.value)
            score = self._resolver.evaluate_score(steps, computed_value)
```

**Score evaluation in the settings resolver:**

File: `backend/engine/settings_resolver.py`, lines 120-130
```python
def evaluate_score(self, steps: list[ScoreStep], value: float) -> float:
    for step in steps:
        min_v = step.min_value if step.min_value is not None else float("-inf")
        max_v = step.max_value if step.max_value is not None else float("inf")
        if min_v <= value < max_v:
            return step.score
    return 0.0
```

**Score steps in settings metadata:**

There are 5 score step settings, each with graduated ranges:
- `market_event_score_steps` -- 4 tiers (0, 3, 7, 10) based on price change percentage
- `quantity_match_score_steps` -- 4 tiers based on buy/sell quantity match ratio
- `vwap_proximity_score_steps` -- 4 tiers (inverse: closer to VWAP = higher score)
- `large_activity_score_steps` -- 4 tiers based on notional value (with equity-specific override)
- `same_side_pct_score_steps` -- 4 tiers based on same-side trading percentage

**Score templates:**

There are 7 score template files in `workspace/metadata/score_templates/`:
- `count_high.json`, `count_low.json`, `percentage_standard.json`, `ratio_binary.json`, `ratio_graduated.json`, `volume_fx.json`, `volume_standard.json`

Each template has a `value_category` (count, percentage, ratio, volume) and pre-defined `steps`. These templates exist as reference data but are **not currently referenced by any detection model or settings file**. They are disconnected seed data for a future UI-driven scoring configuration experience.

**Detection model calculation references:**

File: `workspace/metadata/detection_models/wash_full_day.json`
```json
{
  "calculations": [
    {"calc_id": "large_trading_activity", "strictness": "MUST_PASS",
     "score_steps_setting": "large_activity_score_steps", "value_field": "total_value"},
    {"calc_id": "wash_qty_match", "strictness": "OPTIONAL",
     "score_steps_setting": "quantity_match_score_steps", "value_field": "qty_match_ratio"},
    {"calc_id": "wash_vwap_proximity", "strictness": "OPTIONAL",
     "score_steps_setting": "vwap_proximity_score_steps", "value_field": "vwap_proximity"}
  ]
}
```

Each `ModelCalculation` references a `score_steps_setting` by setting_id. The setting is resolved with entity context, and the resolved value (a list of score step dicts) is parsed and evaluated.

**Score accumulation and thresholds:**

File: `backend/engine/detection_engine.py`, lines 136-154
```python
accumulated_score = 0.0
for mc in model.calculations:
    cs, traces = self._evaluate_calculation(mc, row, entity_context)
    accumulated_score += cs.score

trigger_path, alert_fired = self._determine_trigger(
    calc_scores, model.calculations, accumulated_score, score_threshold,
)
```

The `_determine_trigger` method implements a dual-path trigger:
1. **all_passed**: every calculation's threshold is met
2. **score_based**: accumulated score >= model's score threshold (even if not all passed)

Both require all MUST_PASS calculations to pass.

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Score context | Score steps resolved via settings with entity context (asset_class, etc.) using `HierarchyStrategy` | Score steps resolved via match patterns of `type=score`, providing finer-grained context selection | Partial | M |
| Context-aware steps | `large_activity_score_steps` has one equity-specific override; other score steps have no overrides | Multiple match patterns per score setting, covering asset class, venue, instrument type combinations | Partial | S |
| Score step storage | Score steps stored as `value` field (list of dicts) on settings overrides | Score steps reference score templates by ID; templates are the single source of truth for step definitions | Missing | M |
| Score templates | 7 templates exist in `workspace/metadata/score_templates/` but are not referenced by any model or setting | Templates become the reusable building blocks; settings overrides reference templates by `template_id` | Missing | M |
| Multi-axis scoring | Single score per calculation: `computed_value` maps to one score via one set of steps | Context axis (which steps) x magnitude axis (value within steps); potentially different weighting per context | Missing | L |
| Score weighting | All calculations contribute equally to `accumulated_score` (simple addition) | Weighted contributions per calculation, potentially varying by context | Missing | M |
| MUST_PASS + OPTIONAL model | Implemented: `Strictness` enum, `_determine_trigger()` dual-path logic | Preserved and extended: same semantics, match-pattern-driven strictness overrides | Fully exists | - |

### Dependencies

- **Match Pattern Architecture (Section 1)** -- score-type patterns require the pattern infrastructure
- **Calculation Instance (Section 2)** -- per-instance scoring requires instances to exist
- **Resolution Priority (Section 5)** -- score step resolution uses the priority system

### Migration Risk

**What breaks**: If score templates become the canonical source and settings stop inlining step definitions, all 5 score step settings files need migration. The `_parse_score_steps()` method in the detection engine expects a list of dicts -- it would need to handle template references.

**What is backwards-compatible**: The scoring evaluation logic (`evaluate_score()`) is unchanged. The `ScoreStep` model (`min_value`, `max_value`, `score`) is the same structure used by score templates. The `MUST_PASS` / `OPTIONAL` strictness model and the dual-path trigger logic (`all_passed` or `score_based`) are fully preserved.

---

## 8. Entity Graph Reachability

### Proposed

The entity relationship graph becomes an active computational resource. Given a starting entity and a target attribute, the engine walks the relationship graph to resolve attributes across entity boundaries. For example, when evaluating a detection model with context `{product_id: "AAPL"}`, the engine can automatically resolve `asset_class` from the `product` entity, `registration_country` from the `account` entity (via execution -> account join), and `desk` from the `trader` entity (via execution -> trader join).

The graph walker is **cardinality-aware**: it knows that `execution -> product` is `many_to_one` (safe to resolve a single attribute) while `product -> execution` is `one_to_many` (requires a collapse strategy -- e.g., most frequent, any, all).

### Current State

Entity relationships are defined in every entity JSON file:

File: `workspace/metadata/entities/execution.json`
```json
{
  "relationships": [
    {"target_entity": "order", "join_fields": {"order_id": "order_id"}, "relationship_type": "many_to_one"},
    {"target_entity": "product", "join_fields": {"product_id": "product_id"}, "relationship_type": "many_to_one"},
    {"target_entity": "account", "join_fields": {"account_id": "account_id"}, "relationship_type": "many_to_one"},
    {"target_entity": "trader", "join_fields": {"trader_id": "trader_id"}, "relationship_type": "many_to_one"},
    {"target_entity": "venue", "join_fields": {"venue_mic": "mic"}, "relationship_type": "many_to_one"},
    {"target_entity": "md_eod", "join_fields": {"product_id": "product_id", "execution_date": "trade_date"}, "relationship_type": "many_to_one"}
  ]
}
```

The relationship metadata includes:
- `target_entity` -- which entity is on the other side
- `join_fields` -- the join key mapping (`{local_field: remote_field}`)
- `relationship_type` -- `one_to_many` or `many_to_one`

**These relationships are not actively traversed at runtime.** They serve three purposes today:
1. **UI display**: The Entity Designer view renders a relationship graph using React Flow
2. **Schema documentation**: Entity relationships are shown in the Schema Explorer
3. **SQL query construction**: Detection model SQL queries manually join entities using the same fields defined in the relationship metadata -- but the join is hand-written in the `query` string, not generated from the metadata

The 8 entities form this relationship graph:

```
product (50) ----1:N----> execution (761) <----N:1---- order (786)
   |                          |     |     |
   1:N                       N:1   N:1   N:1
   |                          |     |     |
md_eod (2150)            account  trader  venue
md_intraday (32K)         (220)   (50)    (6)
```

All current attribute resolution is done by pre-joining entities in SQL. For example, the detection model queries join `product p ON ta.product_id = p.product_id` to access `p.asset_class` and `p.instrument_type`. If a new attribute is needed (e.g., `trader.desk`), the SQL query must be manually updated to add the join.

### Gap Assessment

- [~] Partially exists (extension needed)

### Gap Details

| Aspect | Current | Proposed | Gap Type | Effort |
|--------|---------|----------|----------|--------|
| Relationship definitions | Defined in entity JSON with `target_entity`, `join_fields`, `relationship_type` for all 8 entities | Same definitions, consumed by a graph walker at runtime | Partial | S |
| Cardinality tracking | `relationship_type` field (`one_to_many`, `many_to_one`) on every relationship | Same data, used by graph walker to determine safe traversal direction and collapse strategy | Partial | M |
| Reachability computation | No runtime reachability -- all joins are hand-written in SQL queries | Graph walker computes reachable attributes from any starting entity; auto-generates JOIN paths | Missing | L |
| Attribute resolution | Attributes must be pre-joined into query results; context extraction happens from flat row dicts | Engine resolves attributes by walking the graph; context is built dynamically from entity relationships | Missing | L |
| Collapse strategies | Not applicable -- only many_to_one joins are used in current queries | One_to_many traversals require collapse: `most_frequent`, `any`, `all`, `count` | Missing | M |
| Join path generation | Detection model `query` SQL manually specifies all JOINs | Engine generates JOIN SQL from relationship metadata for context attribute resolution | Missing | L |
| Cross-entity matching | Settings match keys (`asset_class`, `exchange_mic`) must all be columns in the query result | Match patterns can reference attributes on any reachable entity; engine resolves the join path | Missing | L |
| Cycle detection | Not needed -- current graph has no cycles | Graph walker must detect and handle cycles (e.g., product -> execution -> order -> product via product_id) | Missing | S |

### Dependencies

- **Match Pattern Architecture (Section 1)** -- entity-aware patterns drive the need for graph traversal
- **Detection Level (Section 4)** -- entity-qualified grain keys require graph resolution

### Migration Risk

**What breaks**: Nothing breaks in a direct sense -- this is purely additive. However, auto-generated JOINs could produce different results than hand-written SQL if the join semantics differ (e.g., LEFT JOIN vs INNER JOIN, or if the graph walker traverses a different path than the hand-written query).

**What is backwards-compatible**: All relationship metadata already exists and is structurally correct. The entity definitions do not need changes. Hand-written SQL queries in detection models can remain -- the graph walker is an optimization that can coexist with explicit SQL.

**Key risk**: One-to-many traversals with collapse strategies introduce aggregation that changes the grain of the data. If the graph walker resolves `trader.desk` for an account (via account -> execution -> trader, which is a one_to_many -> many_to_one path), it must handle the fact that one account may have executions by multiple traders on different desks. The collapse strategy determines whether this returns "Equity Flow" (most frequent), "Equity Flow, Derivatives" (all), or an error (ambiguous). The choice of strategy affects match pattern evaluation.

---

## 9. Overall Effort Summary

| # | Concept | Gap Type | Current Code Exists | Effort | Risk |
|---|---------|----------|-------------------|--------|------|
| 1 | Match Pattern Architecture | Partial | `SettingOverride.match`, `match_patterns/*.json`, `settings_resolver.py` | **M** | Medium -- core data structure change, but migration path is clear |
| 2 | Calculation Instance | Partial | `_resolve_parameters()`, `$param` substitution, but no context and no instance identity | **M** | Medium -- behavioral change (context-aware params change calc output) |
| 3 | Time Window | Partial | 4 time_window calculations with temporal boundaries, but not unified | **M** | Low -- additive schema standardization; existing tables can coexist |
| 4 | Detection Level | Partial | `granularity` field on all 5 models, but documentation-only, not enforced | **L** | High -- runtime enforcement changes alert volumes and grouping |
| 5 | Resolution Priority | Partial | `HierarchyStrategy` already sorts by specificity; `priority` field exists | **M** | Low -- current priorities already align with proposed specificity rules |
| 6 | Unified Results Schema | Does not exist | 10 separate tables with bespoke schemas | **L** | High -- touches core data flow of both engines and all model queries |
| 7 | Scoring Pipeline | Partial | Score steps, evaluate_score(), MUST_PASS/OPTIONAL, dual-path trigger all exist | **M** | Medium -- score templates exist but are disconnected; wiring them in is additive |
| 8 | Entity Graph Reachability | Partial | Relationship metadata exists on all 8 entities; not traversed at runtime | **L** | Medium -- additive capability, but collapse strategies introduce complexity |

**Total effort distribution:**
- **Small (S)**: 0 concepts (none are purely small)
- **Medium (M)**: 5 concepts (match patterns, calc instances, time windows, resolution priority, scoring)
- **Large (L)**: 3 concepts (detection level, unified results, entity graph)

**Recommended implementation order:**

1. **Match Pattern Architecture** (Section 1) -- foundational; everything else references patterns
2. **Resolution Priority** (Section 5) -- closely coupled with match patterns; implement together
3. **Entity Graph Reachability** (Section 8) -- enables entity-aware patterns and detection levels
4. **Time Window** (Section 3) -- relatively independent; can proceed in parallel with #3
5. **Calculation Instance** (Section 2) -- requires patterns + priority + graph
6. **Scoring Pipeline** (Section 7) -- requires patterns + instances
7. **Detection Level** (Section 4) -- requires patterns + graph + instances
8. **Unified Results Schema** (Section 6) -- requires instances + time windows; highest effort, implement last

---

## 10. What Already Works Well (Preserve These)

The following capabilities are proven, tested, and should be preserved through any architectural evolution. Each represents a design decision that has been validated through 1517 backend tests, 296 E2E tests, and 82 generated alerts across 5 detection models.

### Calculation DAG with Topological Sort

File: `backend/engine/calculation_engine.py`, method `build_dag()`

The topological sort correctly orders 10 calculations across 4 layers, detects cycles, and handles transitive dependencies. The layer ordering (`TRANSACTION -> TIME_WINDOW -> AGGREGATION -> DERIVED`) is clean and well-tested. The DAG supports both `run_all()` (full pipeline) and `run_one()` (single calc with dependency resolution).

**Preserve**: The DAG algorithm, the `depends_on` declaration model, the `CalculationLayer` enum, and the topological sort. These are the backbone of the execution engine and should be extended, not replaced.

### Settings Resolver Strategy Pattern

File: `backend/engine/settings_resolver.py`

The `ResolutionStrategy` protocol, the `RESOLUTION_STRATEGIES` registry, and the two concrete strategies (`HierarchyStrategy`, `MultiDimensionalStrategy`) form a clean, extensible architecture. Adding a new resolution strategy requires zero changes to the `SettingsResolver` class -- just register a new strategy in the dictionary.

**Preserve**: The protocol-based strategy pattern, the registry lookup, and the separation between strategy selection (on `SettingDefinition.match_type`) and strategy execution. New match pattern resolution can be added as a new strategy.

### Score Step Evaluation

File: `backend/engine/settings_resolver.py`, method `evaluate_score()`

The graduated scoring with `min_value` / `max_value` / `score` ranges is simple, correct, and easy to reason about. The half-open interval semantics (`min_v <= value < max_v`) handle boundary cases cleanly. The unbounded upper range (`max_value: null` -> `float("inf")`) is properly handled.

**Preserve**: The `ScoreStep` model, the `evaluate_score()` method, and the half-open interval semantics. Score templates use the same structure, confirming that this model is the right abstraction.

### MUST_PASS + OPTIONAL Strictness Model

Files: `backend/models/detection.py` (enum), `backend/engine/detection_engine.py` (`_determine_trigger()`)

The dual-path trigger logic -- "all_passed OR (accumulated_score >= threshold), BUT only if all MUST_PASS calcs passed" -- is the correct operational model for trade surveillance. MUST_PASS calcs are gates (pre-conditions that must be true); OPTIONAL calcs contribute to a graduated score.

**Preserve**: The `Strictness` enum, the `_determine_trigger()` method, the dual-path logic (`all_passed` vs `score_based`), and the MUST_PASS gate semantics. This is battle-tested logic that correctly handles the real-world pattern of "this condition must exist, and then we score how severe it is."

### Alert Trace Explainability

File: `backend/models/alerts.py`

The `AlertTrace` model provides complete traceability: from `alert_id` to `model_id` to `entity_context` to `calculation_scores` (per-calc value, threshold, score, step matched) to `settings_trace` (setting_id, resolved value, why) to `executed_sql` and `sql_row_count`. This is a compliance-grade audit trail.

**Preserve**: The full `AlertTrace` model, the `CalculationTraceEntry` and `SettingsTraceEntry` sub-models, the `scoring_breakdown` list, and the `entity_context_source` mapping. Every detection decision is documented and reproducible. This explainability chain is a key regulatory differentiator.

### Pydantic Model Validation

Files: `backend/models/settings.py`, `backend/models/detection.py`, `backend/models/calculations.py`

Strong typing with Pydantic v2 catches malformed metadata at load time, not at runtime. Model validators (e.g., `sort_overrides_by_priority`, `no_self_dependency`) enforce invariants declaratively. The `CalculationLayer` and `Strictness` enums prevent typo-driven bugs.

**Preserve**: All Pydantic models, all model validators, all enum types. Extend these for new concepts (e.g., `MatchPatternType` enum, `CalcInstanceStatus` enum) rather than replacing the Pydantic-based validation approach.

### Dual Storage (DuckDB + Parquet + JSON)

File: `backend/engine/calculation_engine.py`, method `_write_parquet()`

Calculation results exist in three forms: (1) DuckDB in-memory tables for fast SQL queries, (2) Parquet files for persistent storage and external tool access, (3) JSON metadata definitions for human-readable configuration. This triple representation serves different access patterns without data duplication at the logical level.

**Preserve**: The DuckDB in-memory execution, the Parquet persistence, and the JSON metadata authoring pattern. The unified results schema (Section 6) should maintain all three representations, just with a unified structure instead of per-calc files.

### Metadata-Driven Approach

The core philosophy -- that detection models, calculations, settings, time windows, and scoring rules are all expressed as metadata rather than code -- is exactly what the proposed architecture extends. The 10 calculation JSON files, 5 detection model JSON files, and 14 settings JSON files demonstrate that the approach works at scale.

**Preserve**: The metadata-first philosophy, the JSON-on-disk authoring model, the `MetadataService` as the single point of metadata access, and the separation between metadata definitions (what to do) and engine code (how to do it). The proposed architecture deepens this philosophy by making match patterns, detection levels, and calculation instances first-class metadata objects rather than implicit runtime constructs.

---

*This gap analysis is the most referenced document in the suite. Every concept document (04-17) begins by citing the relevant gap assessment from this file and builds its detailed design to close the identified gaps.*
