# Settings Resolution Patterns

**Document**: 12 of the Data Modeling Design Considerations series
**Audience**: Data Engineers, Configuration Administrators
**Last updated**: 2026-03-10

---

## 1. Current Implementation

The settings resolution engine lives in `backend/engine/settings_resolver.py`. It resolves parameterized values --- thresholds, score step matrices, and score thresholds --- to the correct override for a given entity context. The engine uses a Strategy pattern with a pluggable registry: new resolution strategies can be added without modifying the `SettingsResolver` class.

### 1.1 Data Model (`backend/models/settings.py`)

Three Pydantic models define the settings data structure:

**`ScoreStep`** --- one tier in a graduated scoring matrix:

```python
class ScoreStep(BaseModel):
    min_value: float | None = None
    max_value: float | None = None
    score: float
```

**`SettingOverride`** --- one context-specific override within a setting:

```python
class SettingOverride(BaseModel):
    match: dict[str, str]       # flat key-value context to match
    value: Any                  # the override value (scalar, list, etc.)
    priority: int = Field(ge=0) # integer priority for tie-breaking
```

**`SettingDefinition`** --- a complete setting with default value and override list:

```python
class SettingDefinition(BaseModel):
    setting_id: str
    name: str
    description: str = ""
    value_type: str = Field(description="decimal, integer, string, boolean, score_steps, list")
    default: Any
    match_type: str = Field(default="hierarchy", description="hierarchy or multi_dimensional")
    overrides: list[SettingOverride] = Field(default_factory=list)
    metadata_layer: str = Field(default="oob", exclude=True)

    @model_validator(mode="after")
    def sort_overrides_by_priority(self):
        self.overrides = sorted(self.overrides, key=lambda o: o.priority, reverse=True)
        return self
```

The `sort_overrides_by_priority` model validator ensures overrides are always sorted by descending priority on load. This means the highest-priority override is first in the list, but the strategies do not rely on this ordering --- they perform their own sorting by specificity and priority.

### 1.2 Module-Level Helpers

Two helper functions provide the matching logic used by both strategies:

**`_all_keys_match(match, context) -> bool`**

Returns `True` if and only if every key in the override's `match` dict exists in the `context` dict with the same value. A single mismatched or missing key causes the entire override to be rejected.

```python
def _all_keys_match(match: dict[str, str], context: dict[str, str]) -> bool:
    return all(context.get(k) == v for k, v in match.items())
```

**`_count_matching_dimensions(match, context) -> int`**

Counts how many dimensions (key-value pairs) in `match` are present with the same value in `context`. Critically, the count is returned only if ALL dimensions match. If even one dimension does not match, the function returns 0.

```python
def _count_matching_dimensions(match: dict[str, str], context: dict[str, str]) -> int:
    count = sum(1 for k, v in match.items() if context.get(k) == v)
    if count == len(match):
        return count
    return 0
```

This all-or-nothing behavior is important: a 3-dimension override with 2 matching dimensions scores 0 (rejected), not 2 (partially matched). Partial matches are never used.

### 1.3 ResolutionStrategy Protocol

The `ResolutionStrategy` Protocol defines the interface all strategies must implement:

```python
class ResolutionStrategy(Protocol):
    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None: ...
```

The protocol takes the full list of overrides and a context dictionary. It returns the single best-matching `SettingOverride`, or `None` if no override matches.

### 1.4 HierarchyStrategy

The `HierarchyStrategy` implements a specificity-first resolution:

```python
class HierarchyStrategy:
    def resolve(self, overrides, context):
        candidates = []
        for ov in overrides:
            if _all_keys_match(ov.match, context):
                candidates.append(ov)

        if not candidates:
            return None

        candidates.sort(key=lambda o: (len(o.match), o.priority), reverse=True)
        return candidates[0]
```

**Algorithm:**
1. Filter: keep only overrides where ALL match keys are present in context with the correct values (via `_all_keys_match`).
2. Sort candidates by two criteria (both descending): first by number of match keys (specificity), then by `priority` (integer tie-breaker).
3. Return the top candidate.

**Resolution cascade example** for `wash_vwap_threshold` with context `{"asset_class": "equity", "exchange_mic": "XNYS"}`:

| Override | Match | Keys | Priority | Matches? | Rank |
|---|---|---|---|---|---|
| `product=AAPL` | `{"product": "AAPL"}` | 1 | 100 | No (`product` not in context) | -- |
| `equity+XNYS` | `{"asset_class": "equity", "exchange_mic": "XNYS"}` | 2 | 2 | Yes | 1st (2 keys) |
| `equity` | `{"asset_class": "equity"}` | 1 | 1 | Yes | 2nd (1 key) |
| `fixed_income` | `{"asset_class": "fixed_income"}` | 1 | 1 | No | -- |

Winner: `equity+XNYS` override with value `0.012`.

### 1.5 MultiDimensionalStrategy

The `MultiDimensionalStrategy` also requires all dimensions to match, but uses match count as the primary sort key instead of key count:

```python
class MultiDimensionalStrategy:
    def resolve(self, overrides, context):
        candidates = []
        for ov in overrides:
            match_count = _count_matching_dimensions(ov.match, context)
            if match_count > 0:
                candidates.append((match_count, ov))

        if not candidates:
            return None

        candidates.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
        return candidates[0][1]
```

**Algorithm:**
1. Filter: keep only overrides where `_count_matching_dimensions` returns > 0 (meaning ALL dimensions match).
2. Sort candidates by two criteria (both descending): first by match count, then by `priority`.
3. Return the top candidate (extracting the override from the `(count, override)` tuple).

**Behavioral equivalence with HierarchyStrategy:** Because both strategies require all dimensions to match (all-or-nothing), and both sort by number of matched keys descending then by priority descending, the two strategies produce identical results for settings where all overrides have distinct match key sets. The difference between the strategies is a design-intent signal: `hierarchy` connotes a tree of scopes (global > asset class > asset class + exchange), while `multi_dimensional` connotes a flat set of dimension filters.

### 1.6 Strategy Registry

Both strategies are instantiated once and registered in a module-level dictionary:

```python
RESOLUTION_STRATEGIES: dict[str, ResolutionStrategy] = {
    "hierarchy": HierarchyStrategy(),
    "multi_dimensional": MultiDimensionalStrategy(),
}
```

The registry is the extension point. To add a new strategy:
1. Define a class that implements the `ResolutionStrategy` Protocol (a `resolve` method with the correct signature).
2. Add an entry to `RESOLUTION_STRATEGIES`.

No changes to `SettingsResolver` are required.

### 1.7 SettingsResolver Class

The `SettingsResolver` class is the main entry point:

```python
class SettingsResolver:
    def resolve(self, setting: SettingDefinition, context: dict[str, str]) -> ResolutionResult:
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
```

**Resolution flow:**

```
Input: SettingDefinition + context dict
  |
  v
1. Look up strategy by setting.match_type in RESOLUTION_STRATEGIES
  |
  v
2. Call strategy.resolve(setting.overrides, context)
  |
  +-- matched != None ---> ResolutionResult(value=matched.value, why="Matched override: ...")
  |
  +-- matched == None ---> ResolutionResult(value=setting.default, why="No matching override; using default value")
```

The `ResolutionResult` dataclass carries the resolved value, the matched override (if any), and a human-readable `why` trace explaining the resolution:

```python
@dataclass
class ResolutionResult:
    setting_id: str = ""
    value: Any = None
    matched_override: SettingOverride | None = None
    why: str = ""
```

### 1.8 Score Evaluation

The `evaluate_score` method maps a numeric value to a graduated score using score step definitions:

```python
def evaluate_score(self, steps: list[ScoreStep], value: float) -> float:
    for step in steps:
        min_v = step.min_value if step.min_value is not None else float("-inf")
        max_v = step.max_value if step.max_value is not None else float("inf")
        if min_v <= value < max_v:
            return step.score
        if max_v == float("inf") and value >= min_v:
            return step.score
    return 0.0
```

**Behavior:**
- Each step defines a half-open interval `[min_value, max_value)`.
- `None` for `min_value` is treated as negative infinity; `None` for `max_value` is treated as positive infinity.
- The unbounded upper range (`max_value = None`) gets special handling: any value >= `min_value` matches.
- If no step matches (should not happen with well-configured steps), returns `0.0`.

**Example** --- `vwap_proximity_score_steps` default with input value `0.008`:

| Step | Range | Score | Match? |
|---|---|---|---|
| 1 | [0, 0.005) | 10 | No |
| 2 | [0.005, 0.01) | 7 | Yes --- returns 7 |
| 3 | [0.01, 0.02) | 3 | -- |
| 4 | [0.02, inf) | 0 | -- |

---

## 2. Current Settings Inventory

The platform defines 15 settings across three categories, stored in `workspace/metadata/settings/`. All settings currently use the `hierarchy` match type.

### 2.1 Thresholds (6 settings)

Thresholds are scalar values (string, integer, or decimal) that define cutoff points or multipliers used by detection calculations.

#### `business_date_cutoff`

| Property | Value |
|---|---|
| **Description** | Business date cutoff hour in UTC. Trades after this time are attributed to the next business date. |
| **Value Type** | `string` |
| **Match Type** | `hierarchy` |
| **Default** | `"17:00"` |
| **Overrides** | 3 |

Overrides:

| Match | Value | Priority |
|---|---|---|
| `{"exchange_mic": "XNYS"}` | `"21:00"` | 1 |
| `{"exchange_mic": "XLON"}` | `"16:30"` | 1 |
| `{"asset_class": "fx"}` | `"21:00"` | 1 |

All overrides have a single match key and equal priority. No ambiguity arises because each targets a different dimension value.

#### `cancel_count_threshold`

| Property | Value |
|---|---|
| **Description** | Minimum number of order cancellations within a time window to trigger spoofing/layering detection. |
| **Value Type** | `integer` |
| **Match Type** | `hierarchy` |
| **Default** | `5` |
| **Overrides** | 5 |

Overrides:

| Match | Value | Priority | Description |
|---|---|---|---|
| `{"asset_class": "equity"}` | `3` | 1 | Equities cancel more frequently |
| `{"instrument_type": "call_option"}` | `8` | 1 | Higher threshold for options |
| `{"instrument_type": "put_option"}` | `8` | 1 | Higher threshold for options |
| `{"asset_class": "fixed_income"}` | `5` | 1 | Lower cancellation frequency |
| `{"asset_class": "index"}` | `4` | 1 | Moderate threshold for index instruments |

Note: `instrument_type` and `asset_class` overrides have equal priority with equal key count. For a call option that is also an equity (context: `{"asset_class": "equity", "instrument_type": "call_option"}`), both the equity override and the call_option override match. The hierarchy strategy sorts by key count (both have 1), then by priority (both have 1), so the result depends on sort stability. In practice this ambiguity does not arise because instrument_type and asset_class are distinct dimensions in the context.

#### `insider_lookback_days`

| Property | Value |
|---|---|
| **Description** | Number of days to look back when evaluating trading activity around material events for insider dealing detection. |
| **Value Type** | `integer` |
| **Match Type** | `hierarchy` |
| **Default** | `30` |
| **Overrides** | 5 |

Overrides:

| Match | Value | Priority | Description |
|---|---|---|---|
| `{"asset_class": "equity"}` | `20` | 1 | -- |
| `{"instrument_type": "call_option"}` | `10` | 1 | -- |
| `{"instrument_type": "put_option"}` | `10` | 1 | -- |
| `{"asset_class": "fixed_income"}` | `14` | 1 | Extended lookback --- slower information diffusion |
| `{"asset_class": "index"}` | `10` | 1 | Moderate lookback for index instruments |

#### `large_activity_multiplier`

| Property | Value |
|---|---|
| **Description** | Multiplier applied to average daily volume to determine large trading activity threshold. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `2.0` |
| **Overrides** | 5 |

Overrides:

| Match | Value | Priority | Description |
|---|---|---|---|
| `{"asset_class": "equity"}` | `2.5` | 1 | Higher multiplier --- reduces false positives from normal volume |
| `{"asset_class": "fx"}` | `3.0` | 1 | -- |
| `{"asset_class": "commodity"}` | `2.5` | 1 | -- |
| `{"asset_class": "fixed_income"}` | `2.5` | 1 | Lower baseline volumes |
| `{"asset_class": "index"}` | `2.0` | 1 | Standard multiplier for index instruments |

#### `trend_sensitivity`

| Property | Value |
|---|---|
| **Description** | Standard deviation multiplier for trend detection sensitivity. Lower values detect more subtle trends. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `3.5` |
| **Overrides** | 4 |

Overrides:

| Match | Value | Priority | Description |
|---|---|---|---|
| `{"asset_class": "equity"}` | `2.5` | 1 | Reduces noise from normal daily moves |
| `{"asset_class": "fx"}` | `2.0` | 1 | -- |
| `{"asset_class": "fixed_income"}` | `1.2` | 1 | Detect subtle rate movements |
| `{"asset_class": "index"}` | `1.3` | 1 | Moderate sensitivity |

#### `wash_vwap_threshold`

| Property | Value |
|---|---|
| **Description** | VWAP proximity threshold for wash trading detection. Trades within this percentage of VWAP are considered suspicious. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `0.02` |
| **Overrides** | 5 |

Overrides:

| Match | Value | Priority | Description |
|---|---|---|---|
| `{"asset_class": "equity"}` | `0.015` | 1 | -- |
| `{"asset_class": "equity", "exchange_mic": "XNYS"}` | `0.012` | 2 | 2-key override --- more specific than single-key |
| `{"product": "AAPL"}` | `0.01` | 100 | Product-specific override --- highest priority |
| `{"asset_class": "fixed_income"}` | `0.01` | 1 | Tighter threshold --- less volatile markets |
| `{"asset_class": "index"}` | `0.015` | 1 | Slightly tighter threshold |

This is the most complex setting in the current inventory. It demonstrates the full resolution hierarchy: product-specific (priority 100) > multi-key asset class + exchange (priority 2, 2 keys) > single-key asset class (priority 1, 1 key) > default.

### 2.2 Score Steps (5 settings)

Score step settings define graduated scoring matrices. The `value_type` is `score_steps` and the default value is an array of `ScoreStep` objects.

#### `market_event_score_steps`

| Property | Value |
|---|---|
| **Description** | Graduated scoring for trading volume relative to a market event in insider dealing detection. |
| **Match Type** | `hierarchy` |
| **Default Steps** | `[0, 1.5) -> 0`, `[1.5, 3.0) -> 3`, `[3.0, 5.0) -> 7`, `[5.0, inf) -> 10` |
| **Overrides** | 0 |

No overrides. The same score matrix applies to all asset classes.

#### `quantity_match_score_steps`

| Property | Value |
|---|---|
| **Description** | Graduated scoring for buy/sell quantity match ratio in wash trading detection. |
| **Match Type** | `hierarchy` |
| **Default Steps** | `[0, 0.5) -> 0`, `[0.5, 0.8) -> 3`, `[0.8, 0.95) -> 7`, `[0.95, inf) -> 10` |
| **Overrides** | 0 |

No overrides. Higher quantity match ratio (closer to 1.0) = higher suspicion score.

#### `vwap_proximity_score_steps`

| Property | Value |
|---|---|
| **Description** | Graduated scoring for VWAP proximity in wash trading detection. Lower proximity (closer to VWAP) yields higher scores. |
| **Match Type** | `hierarchy` |
| **Default Steps** | `[0, 0.005) -> 10`, `[0.005, 0.01) -> 7`, `[0.01, 0.02) -> 3`, `[0.02, inf) -> 0` |
| **Overrides** | 0 |

No overrides. Note the inverted scale: values closer to zero (closer to VWAP) receive higher scores.

#### `large_activity_score_steps`

| Property | Value |
|---|---|
| **Description** | Graduated scoring tiers for large trading activity based on notional value. |
| **Match Type** | `hierarchy` |
| **Default Steps** | `[0, 10000) -> 0`, `[10000, 100000) -> 3`, `[100000, 500000) -> 7`, `[500000, inf) -> 10` |
| **Overrides** | 1 |

Override:

| Match | Priority | Description |
|---|---|---|
| `{"asset_class": "equity"}` | 1 | Higher thresholds for equity --- normal equity volume is high |

Equity-specific score steps:

| Range | Score |
|---|---|
| `[0, 25000)` | 0 |
| `[25000, 100000)` | 3 |
| `[100000, 500000)` | 7 |
| `[500000, inf)` | 10 |

The equity override raises the minimum notional from `10,000` to `25,000` before scoring begins, reflecting higher baseline trading volumes in equity markets.

#### `same_side_pct_score_steps`

| Property | Value |
|---|---|
| **Description** | Graduated scoring for same-side trading percentage in Market Price Ramping detection. |
| **Match Type** | `hierarchy` |
| **Default Steps** | `[0, 0.75) -> 0`, `[0.75, 0.85) -> 3`, `[0.85, 0.95) -> 7`, `[0.95, inf) -> 10` |
| **Overrides** | 0 |

No overrides. Higher same-side percentage = higher suspicion of price ramping.

### 2.3 Score Thresholds (4 settings)

Score thresholds define the minimum accumulated score required to generate an alert for each detection model.

#### `insider_score_threshold`

| Property | Value |
|---|---|
| **Description** | Minimum accumulated score required to generate an insider dealing alert. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `10` |
| **Overrides** | 0 |

No overrides. The same threshold applies across all asset classes.

#### `spoofing_score_threshold`

| Property | Value |
|---|---|
| **Description** | Minimum accumulated score required to generate a spoofing/layering alert. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `12` |
| **Overrides** | 3 |

Overrides:

| Match | Value | Priority |
|---|---|---|
| `{"asset_class": "equity"}` | `10` | 1 |
| `{"asset_class": "fixed_income"}` | `7` | 1 |
| `{"asset_class": "index"}` | `6` | 1 |

#### `wash_score_threshold`

| Property | Value |
|---|---|
| **Description** | Minimum accumulated score required to generate a wash trading alert. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `10` |
| **Overrides** | 4 |

Overrides:

| Match | Value | Priority |
|---|---|---|
| `{"asset_class": "equity"}` | `8` | 1 |
| `{"asset_class": "fx"}` | `12` | 1 |
| `{"asset_class": "fixed_income"}` | `8` | 1 |
| `{"asset_class": "index"}` | `7` | 1 |

#### `mpr_score_threshold`

| Property | Value |
|---|---|
| **Description** | Minimum accumulated score required to generate a Market Price Ramping alert. |
| **Value Type** | `decimal` |
| **Match Type** | `hierarchy` |
| **Default** | `18` |
| **Overrides** | 4 |

Overrides:

| Match | Value | Priority | Description |
|---|---|---|---|
| `{"asset_class": "equity"}` | `16` | 1 | High normal volume creates noise |
| `{"asset_class": "commodity"}` | `14` | 1 | Moderate threshold for commodity instruments |
| `{"asset_class": "fixed_income"}` | `7` | 1 | Price movements more significant |
| `{"asset_class": "index"}` | `6` | 1 | Moderate threshold for index instruments |

The MPR score threshold has the widest range across asset classes (6--18), illustrating why per-asset-class tuning is necessary: a single hardcoded threshold would either flood analysts with low-value fixed income alerts or miss significant equity manipulations.

### 2.4 Summary Table

| Category | Setting ID | Value Type | Match Type | Default | Overrides |
|---|---|---|---|---|---|
| Threshold | `business_date_cutoff` | string | hierarchy | `"17:00"` | 3 |
| Threshold | `cancel_count_threshold` | integer | hierarchy | `5` | 5 |
| Threshold | `insider_lookback_days` | integer | hierarchy | `30` | 5 |
| Threshold | `large_activity_multiplier` | decimal | hierarchy | `2.0` | 5 |
| Threshold | `trend_sensitivity` | decimal | hierarchy | `3.5` | 4 |
| Threshold | `wash_vwap_threshold` | decimal | hierarchy | `0.02` | 5 |
| Score Steps | `market_event_score_steps` | score_steps | hierarchy | 4 steps | 0 |
| Score Steps | `quantity_match_score_steps` | score_steps | hierarchy | 4 steps | 0 |
| Score Steps | `vwap_proximity_score_steps` | score_steps | hierarchy | 4 steps | 0 |
| Score Steps | `large_activity_score_steps` | score_steps | hierarchy | 4 steps | 1 |
| Score Steps | `same_side_pct_score_steps` | score_steps | hierarchy | 4 steps | 0 |
| Score Threshold | `insider_score_threshold` | decimal | hierarchy | `10` | 0 |
| Score Threshold | `spoofing_score_threshold` | decimal | hierarchy | `12` | 3 |
| Score Threshold | `wash_score_threshold` | decimal | hierarchy | `10` | 4 |
| Score Threshold | `mpr_score_threshold` | decimal | hierarchy | `18` | 4 |
| | | | | **Total** | **44 overrides** |

---

## 3. Current Match Patterns

The platform defines 9 match patterns in `workspace/metadata/match_patterns/`. Each is a JSON file with a `pattern_id`, `label`, `description`, `match` object, `created_at` timestamp, and `layer` (all are `oob` --- out-of-box).

These patterns are the named, reusable building blocks that the proposed evolution (Section 4) uses to replace the inline `match` objects currently embedded in each setting override.

### 3.1 Single-Attribute Patterns (7 patterns)

These patterns match on exactly one attribute --- one dimension of the entity graph.

#### `equity_stocks`

```json
{
  "pattern_id": "equity_stocks",
  "label": "Equity Stocks",
  "match": {"asset_class": "equity"}
}
```

**Used by**: `cancel_count_threshold`, `insider_lookback_days`, `large_activity_multiplier`, `trend_sensitivity`, `wash_vwap_threshold`, `large_activity_score_steps`, `spoofing_score_threshold`, `wash_score_threshold`, `mpr_score_threshold` (9 settings).

The most widely referenced pattern. Equity is the largest asset class in the platform (the majority of the 50 products).

#### `fx_instruments`

```json
{
  "pattern_id": "fx_instruments",
  "label": "FX Instruments",
  "match": {"asset_class": "fx"}
}
```

**Used by**: `business_date_cutoff`, `large_activity_multiplier`, `trend_sensitivity`, `wash_score_threshold` (4 settings).

#### `fixed_income_all`

```json
{
  "pattern_id": "fixed_income_all",
  "label": "Fixed Income (All)",
  "match": {"asset_class": "fixed_income"}
}
```

**Used by**: `cancel_count_threshold`, `insider_lookback_days`, `large_activity_multiplier`, `trend_sensitivity`, `wash_vwap_threshold`, `spoofing_score_threshold`, `wash_score_threshold`, `mpr_score_threshold` (8 settings).

#### `commodity_instruments`

```json
{
  "pattern_id": "commodity_instruments",
  "label": "Commodity Instruments",
  "match": {"asset_class": "commodity"}
}
```

**Used by**: `large_activity_multiplier`, `mpr_score_threshold` (2 settings).

#### `index_instruments`

```json
{
  "pattern_id": "index_instruments",
  "label": "Index Instruments",
  "match": {"asset_class": "index"}
}
```

**Used by**: `cancel_count_threshold`, `insider_lookback_days`, `large_activity_multiplier`, `trend_sensitivity`, `wash_vwap_threshold`, `spoofing_score_threshold`, `wash_score_threshold`, `mpr_score_threshold` (8 settings).

#### `nasdaq_listed`

```json
{
  "pattern_id": "nasdaq_listed",
  "label": "NASDAQ Listed",
  "match": {"exchange_mic": "XNAS"}
}
```

**Used by**: No settings currently reference this pattern directly. It exists as a reusable building block for future configuration.

#### `nyse_listed`

```json
{
  "pattern_id": "nyse_listed",
  "label": "NYSE Listed",
  "match": {"exchange_mic": "XNYS"}
}
```

**Used by**: `business_date_cutoff` (via the inline override `{"exchange_mic": "XNYS"}`). Not yet formally linked by `pattern_id`, but semantically equivalent.

### 3.2 Multi-Attribute Patterns (2 patterns)

These patterns match on two attributes --- creating a more specific match than single-attribute patterns.

#### `equity_nyse`

```json
{
  "pattern_id": "equity_nyse",
  "label": "Equity on NYSE",
  "match": {"asset_class": "equity", "exchange_mic": "XNYS"}
}
```

**Used by**: `wash_vwap_threshold` (via the inline override `{"asset_class": "equity", "exchange_mic": "XNYS"}` with priority 2). This is the only multi-key override in the current settings inventory.

#### `fixed_income_bonds`

```json
{
  "pattern_id": "fixed_income_bonds",
  "label": "Fixed Income Bonds",
  "match": {"asset_class": "fixed_income", "instrument_type": "bond"}
}
```

**Used by**: No settings currently use this exact 2-attribute combination. Available for future refinement of fixed income thresholds by instrument type.

### 3.3 Pattern Usage Summary

| Pattern | Attributes | Asset Class | Additional Attribute | Settings Using It |
|---|---|---|---|---|
| `equity_stocks` | 1 | equity | -- | 9 |
| `fixed_income_all` | 1 | fixed_income | -- | 8 |
| `index_instruments` | 1 | index | -- | 8 |
| `fx_instruments` | 1 | fx | -- | 4 |
| `commodity_instruments` | 1 | commodity | -- | 2 |
| `nyse_listed` | 1 | -- | `exchange_mic=XNYS` | 1 |
| `nasdaq_listed` | 1 | -- | `exchange_mic=XNAS` | 0 |
| `equity_nyse` | 2 | equity | `exchange_mic=XNYS` | 1 |
| `fixed_income_bonds` | 2 | fixed_income | `instrument_type=bond` | 0 |

Two patterns (`nasdaq_listed`, `fixed_income_bonds`) are currently unused by settings but exist as reusable components for future configuration.

---

## 4. Proposed Evolution

The current settings resolver works correctly but has structural limitations that become problematic at scale:

1. **Inline match objects** --- each override embeds its own `match` dictionary, duplicating pattern definitions across settings. The same `{"asset_class": "equity"}` pattern appears in 9 different settings.
2. **Manual priority integers** --- administrators must assign priority numbers (1, 2, 100) by hand, with no system-enforced consistency.
3. **No entity awareness** --- the flat `match` keys do not record which entity owns each attribute (is `asset_class` from the product entity or from a derived table?).
4. **No cross-entity conditions** --- the flat structure cannot express "equity instruments traded by high-risk accounts" as a single match.
5. **Values tangled with definitions** --- the current `SettingDefinition` Pydantic model carries both the definition metadata AND concrete values (default + overrides). This conflation means settings cannot be defined independently of the calculations that consume them.

The proposed evolution addresses all five limitations by separating settings into **pure definitions** (metadata only) and moving all **concrete values** to the calculation instance level.

### 4.1 Settings as Pure Definitions

A setting definition becomes pure metadata --- it declares *what kind of parameter* this is, without specifying any concrete values:

```
setting_definitions:
  setting_id     PK
  name           VARCHAR       -- 'VWAP Proximity Threshold'
  description    TEXT          -- 'VWAP proximity threshold for wash trading detection...'
  value_type     VARCHAR       -- 'decimal', 'integer', 'string', 'boolean', 'score_steps'
  version        VARCHAR       -- '1.0.0'
  examples       JSON          -- optional illustrative examples (not operational)
```

**What's NOT here:** No `default` value. No `overrides` array. No `match_type`. These were artifacts of the old model where settings carried their own values. In the proposed model, a setting definition is a template --- it says "this parameter is a decimal called VWAP Proximity Threshold" but does not say what the decimal's value is. Values are supplied at the calculation instance level (see document 05).

**Why this matters:**

- **Reusability**: The same setting definition (`wash_vwap_threshold`) can be referenced by multiple calculations without duplicating value configurations. Each calculation instance supplies its own values.
- **Separation of concerns**: Data stewards define *what* parameters exist. Calculation authors declare *which* parameters their formulas require. Instance configurators set *what values* to use in each context.
- **Clean versioning**: Setting definitions version independently of the values assigned to them. Changing a setting's description or adding a new valid type does not affect any calculation instance.

### 4.2 Match Pattern Types Replace Flat Match Objects

Instead of each override embedding its own `{"asset_class": "equity"}` dictionary, match patterns are independently-defined, reusable typed predicates that reference the `match_patterns` / `match_pattern_attributes` tables.

Current inline override:
```json
{
  "match": {"asset_class": "equity", "exchange_mic": "XNYS"},
  "value": 0.012,
  "priority": 2
}
```

Proposed pattern reference:
```
match_patterns:
  pattern_id:  equity_nyse
  pattern_type: setting

match_pattern_attributes:
  pattern_id  | entity  | entity_attribute | attribute_value
  ------------|---------|------------------|----------------
  equity_nyse | product | asset_class      | equity
  equity_nyse | product | exchange_mic     | XNYS
```

Match patterns carry NO values --- they are pure predicates. Values are assigned when a calculation instance composes a definition with a pattern (see document 05, Section 6).

### 4.3 Granularity-Based Priority Replaces Integer Priority

The current system uses manually assigned priority integers (1, 2, 100). The proposed system computes priority automatically from pattern specificity, following the granularity pyramid described in the design series:

```
Priority Level               Example                         Auto-Priority
---------------------------------------------------------------------------
Entity key (highest)          product_id = "AAPL"             Highest
Multi-attribute (N keys)      asset_class + exchange_mic      Higher (N attributes)
Single-attribute (1 key)      asset_class = "equity"          Medium (1 attribute)
Default (0 keys)              (no pattern --- match all)      Lowest (0 attributes)
```

The resolution algorithm counts the number of attribute rows in the pattern. More rows = more specific = higher priority. No manual assignment required.

This is equivalent to the current `HierarchyStrategy`'s `len(o.match)` sort key, but formalized: the priority is an intrinsic property of the pattern, not a field on the override.

### 4.4 Where Values Live: The Calculation Instance

In the proposed model, concrete parameter values are assigned at the **calculation instance** level --- the composition point where a calculation definition meets its match pattern(s).

The `instance_setting_values` table stores every concrete value:

```
instance_setting_values:
  instance_id      FK -> calc_instances
  setting_id       FK -> setting_definitions
  param_name       VARCHAR  -- placeholder name in formula
  pattern_id       FK -> match_patterns  -- per-value granularity
  param_value      JSON     -- the actual concrete value
  PK (instance_id, setting_id, param_name, pattern_id)
```

**Per-value pattern matching:** The `pattern_id` column enables different settings within the same instance to reference match patterns at different granularity levels. For example, the equity instance (`inst_wash_equity`) might have `wash_vwap_threshold` varying by instrument type (`pat_equity_call` = 0.018, `pat_equity_etf` = 0.012, `pat_equity` = 0.015 as fallback) while `large_activity_score_steps` stays at the asset-class level (`pat_equity`). The resolution engine selects the best-matching `pattern_id` for each setting independently, providing fine-grained control without requiring separate instances for every combination.

This table replaces both the current `SettingDefinition.default` and `SettingDefinition.overrides[]` --- every value, whether it was previously a "default" or an "override," is now an explicit row in `instance_setting_values` associated with a specific calculation instance.

**Resolution example for `wash_vwap_threshold` with equity context:**

| Source (current) | Target (proposed) |
|---|---|
| `setting.default = 0.02` | `instance_setting_values` row on the "default" instance (zero-attribute pattern) |
| `override {asset_class: equity} = 0.015` | `instance_setting_values` row on the "equity" instance |
| `override {asset_class: equity, exchange_mic: XNYS} = 0.012` | `instance_setting_values` row on the "equity_nyse" instance |
| `override {product: AAPL} = 0.01` | `instance_setting_values` row on the "aapl" instance |

See document 05, Section 6 for the complete table structures and worked examples.

#### Within-Instance Resolution: Two-Level Selection

When a candidate row arrives with context `{asset_class: "equity", instrument_type: "call_option"}`, the resolution engine performs two levels of selection:

**Level 1 — Instance selection:** Select the best-matching calculation instance based on the instance's `pattern_id` (from `calc_instances`). The equity instance (`inst_wash_equity` with `pat_equity`) matches.

**Level 2 — Per-value pattern selection:** For each required setting within the selected instance, find the best-matching `pattern_id` from `instance_setting_values`:

| Setting | Available pattern_ids in instance | Context match | Selected | Value |
|---|---|---|---|---|
| `wash_vwap_threshold` | `pat_equity` (1 attr), `pat_equity_call` (2 attrs), `pat_equity_etf` (2 attrs) | `pat_equity_call` matches (2 attrs) | `pat_equity_call` | `0.018` |
| `large_activity_score_steps` | `pat_equity` (1 attr) | `pat_equity` matches (1 attr) | `pat_equity` | `[{min:0,max:25000,...}]` |

For a common stock (context `{asset_class: "equity", instrument_type: "common_stock"}`):

| Setting | Available pattern_ids in instance | Context match | Selected | Value |
|---|---|---|---|---|
| `wash_vwap_threshold` | `pat_equity` (1 attr), `pat_equity_call` (2 attrs), `pat_equity_etf` (2 attrs) | Only `pat_equity` matches | `pat_equity` | `0.015` |
| `large_activity_score_steps` | `pat_equity` (1 attr) | `pat_equity` matches | `pat_equity` | `[{min:0,max:25000,...}]` |

The call option gets a wider VWAP threshold (0.018) reflecting options' inherent price deviation from underlying VWAP, while the common stock gets the standard equity threshold (0.015). Both share the same equity-level score steps.

---

## 5. Migration Path

### 5.1 General Mapping

The mapping from current JSON settings to the proposed separated model follows a consistent pattern:

| Current Concept | Proposed Concept |
|---|---|
| `SettingDefinition` (name, description, value_type) | `setting_definitions` row (pure metadata, no values) |
| `SettingDefinition.default` | `instance_setting_values` row on a calc instance with zero-attribute (universal) pattern |
| `SettingDefinition.overrides[].match` | `match_patterns` / `match_pattern_attributes` rows (reused across settings) |
| `SettingDefinition.overrides[].value` | `instance_setting_values.param_value` on the corresponding calc instance |
| `SettingDefinition.overrides[].priority` | Computed from `match_pattern_attributes` row count (eliminated as explicit field) |
| `SettingDefinition.match_type` | Eliminated --- a single resolution algorithm handles all settings |
| `calc_settings` table (Section 4.3 of previous version) | Replaced by `calc_required_settings` (declares which settings a calc needs) + `instance_setting_values` (supplies concrete values per instance) |
| Multiple overrides at different granularity within same asset class | Multiple `instance_setting_values` rows with different `pattern_id` within the same instance |

### 5.2 Example Migration: `wash_vwap_threshold`

**Current JSON** (`workspace/metadata/settings/thresholds/wash_vwap_threshold.json`):

```json
{
  "setting_id": "wash_vwap_threshold",
  "name": "VWAP Proximity Threshold",
  "description": "VWAP proximity threshold for wash trading detection...",
  "value_type": "decimal",
  "default": 0.02,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    {"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012, "priority": 2},
    {"match": {"product": "AAPL"}, "value": 0.01, "priority": 100},
    {"match": {"asset_class": "fixed_income"}, "value": 0.01, "priority": 1},
    {"match": {"asset_class": "index"}, "value": 0.015, "priority": 1}
  ]
}
```

**Step 1 --- Extract the pure definition:**

```
setting_definitions:
  setting_id:  wash_vwap_threshold
  name:        VWAP Proximity Threshold
  description: VWAP proximity threshold for wash trading detection...
  value_type:  decimal
  version:     1.0.0
  examples:    {"typical_range": "0.01 to 0.02", "unit": "ratio"}
```

No `default`, no `overrides`, no `match_type`.

**Step 2 --- Declare the requirement in the calculation:**

```
calc_required_settings:
  calc_id:     wash_detection
  setting_id:  wash_vwap_threshold
  param_name:  vwap_threshold
```

This says: "The `wash_detection` calculation requires a setting called `wash_vwap_threshold` and uses it as the `$vwap_threshold` placeholder."

**Step 3 --- Create instances with values:**

| Instance | calc_id | pattern_id | window_id |
|---|---|---|---|
| `inst_wash_default` | `wash_detection` | `pat_default` | NULL |
| `inst_wash_equity` | `wash_detection` | `pat_equity` | NULL |
| `inst_wash_equity_nyse` | `wash_detection` | `pat_equity_nyse` | NULL |
| `inst_wash_aapl` | `wash_detection` | `pat_aapl` | NULL |
| `inst_wash_fixed_income` | `wash_detection` | `pat_fixed_income` | NULL |
| `inst_wash_index` | `wash_detection` | `pat_index` | NULL |

**Step 4 --- Assign values per instance:**

| instance_id | setting_id | param_name | pattern_id | param_value |
|---|---|---|---|---|
| `inst_wash_default` | `wash_vwap_threshold` | `vwap_threshold` | `pat_default` | `0.02` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity` | `0.015` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_call` | `0.018` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_etf` | `0.012` |
| `inst_wash_equity_nyse` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_nyse` | `0.012` |
| `inst_wash_aapl` | `wash_vwap_threshold` | `vwap_threshold` | `pat_aapl` | `0.01` |
| `inst_wash_fixed_income` | `wash_vwap_threshold` | `vwap_threshold` | `pat_fixed_income` | `0.01` |
| `inst_wash_index` | `wash_vwap_threshold` | `vwap_threshold` | `pat_index` | `0.015` |

**Resolution for context `{product.asset_class: "equity", product.exchange_mic: "XNYS"}`:**

```
inst_wash_aapl          → pattern has 1 attribute (product_id=AAPL)   → does NOT match → skip
inst_wash_equity_nyse   → pattern has 2 attributes                    → matches → priority = 2 → WINNER
inst_wash_equity        → pattern has 1 attribute                     → matches → priority = 1
inst_wash_fixed_income  → pattern has 1 attribute                     → does NOT match → skip
inst_wash_index         → pattern has 1 attribute                     → does NOT match → skip
inst_wash_default       → pattern has 0 attributes                    → matches → priority = 0

Result: 0.012 (from inst_wash_equity_nyse)
```

### 5.3 Migration Phases

**Phase 1 --- Create pure definitions.** Extract `setting_id`, `name`, `description`, `value_type` from each existing JSON setting file into `setting_definitions` rows. Discard `default`, `overrides`, `match_type`.

**Phase 2 --- Create `calc_required_settings` rows.** For each calculation definition that references a setting (via `parameters[].source == "setting"`), create a row linking `calc_id` to `setting_id` with the `param_name`.

**Phase 3 --- Create calculation instances.** For each unique combination of (calculation, match pattern) that currently exists as an override context, create a `calc_instances` row.

**Phase 4 --- Populate `instance_setting_values`.** Map each current default and override value to the corresponding `instance_setting_values` row.

**Phase 5 --- Validate equivalence.** Run the full detection pipeline with the new model and verify that every calculation produces identical results to the current system.

---

## 6. Backwards Compatibility

### 6.1 Coexistence Strategy

The current `HierarchyStrategy`, `MultiDimensionalStrategy`, and `SettingsResolver` can coexist with the proposed instance-based value resolution. Migration does not require a big-bang cutover.

**Phase 1 --- New settings use pure definitions.** Any new setting added to the platform is authored as a `setting_definitions` row (metadata only). Its values are assigned through `instance_setting_values` on the corresponding calculation instances.

**Phase 2 --- Old settings continue working.** Existing JSON setting files (`workspace/metadata/settings/**/*.json`) continue to load through the current `SettingDefinition` model and resolve through `HierarchyStrategy` or `MultiDimensionalStrategy`. No changes required.

**Phase 3 --- Incremental migration.** Individual settings can be migrated from JSON files to the pure-definition + instance-values model one at a time. A dual-lookup mechanism checks `instance_setting_values` first; if no row exists for the requested instance + setting, it falls back to the JSON-based resolver.

### 6.2 Equivalence Between Current and Proposed Resolution

The current `HierarchyStrategy` and the proposed granularity-based priority produce the same result for well-configured settings. The proof is straightforward:

**HierarchyStrategy sorting:** `(len(o.match), o.priority)` descending.

**Proposed sorting:** count of `match_pattern_attributes` rows on the instance's pattern, descending.

For settings where all overrides use the same `priority` value (which is true for 14 of the 15 current settings), the sort orders are identical: both rank by number of match keys, descending.

The one setting with non-uniform priorities (`wash_vwap_threshold`) uses:
- Priority 100 for the product-specific override (1 match key)
- Priority 2 for the 2-key equity+NYSE override
- Priority 1 for single-key overrides

Under the proposed system, the product-specific pattern would have 1 attribute row (`product.product_id = AAPL`), and the equity+NYSE pattern would have 2 attribute rows. However, an entity-key match (matching on a primary key like `product_id`) receives automatic highest priority in the granularity pyramid, outranking any multi-attribute category match. This preserves the intent of the `priority: 100` convention currently used for product-specific overrides.

### 6.3 What Changes, What Does Not

| Aspect | Changes | Does Not Change |
|---|---|---|
| **Setting definition** | Pure metadata (no default, no overrides) | Setting names, descriptions, types |
| **Value storage** | `instance_setting_values` rows per calc instance | The matching semantics (all keys must match) |
| **Value resolution** | Instance-level lookup (instance → values) | The ranking logic (more specific wins) |
| **Priority assignment** | Explicit integers → computed from attribute count | -- |
| **Resolution API** | `SettingsResolver.resolve(setting, context)` signature | Return type (`ResolutionResult`) |
| **Score evaluation** | -- | `evaluate_score(steps, value)` is unchanged |
| **Strategy registry** | A new `InstanceStrategy` joins the registry | Existing strategies remain, handle legacy settings |

### 6.4 Risk Mitigation

**Regression testing:** The current test suite (1517 backend tests) includes extensive settings resolution tests. Any migration step can be validated by running the existing tests against the new resolution path and comparing results.

**Audit trail continuity:** The `ResolutionResult.why` trace string format is preserved. Instead of `"Matched override: {asset_class=equity} (priority 1)"`, the new format would be `"Matched instance: inst_wash_equity (pattern: equity_stocks, 1 attribute)"`. Both provide human-readable resolution explanations.

**Rollback path:** Because old and new resolution coexist, any migrated setting can be rolled back by deleting its `instance_setting_values` rows and re-enabling the JSON file. The dual-lookup mechanism falls back automatically.

---

## Cross-References

| Document | Relationship to This Document |
|---|---|
| 02 Current State Analysis | Describes the current settings resolver, entities, and calculations that this document extends |
| 04 Match Pattern Architecture | Defines the 3-column pattern structure this document proposes for settings resolution |
| 05 Calculation Instance Model | Calculation instances are the composition point where setting values are assigned; `calc_required_settings` declares requirements, `instance_setting_values` supplies values |
| 08 Resolution Priority Rules | Defines the granularity pyramid that replaces manual priority integers |
| 10 Scoring and Alerting Pipeline | Score step resolution uses `evaluate_score` documented in Section 1.8 |
| 15 UX Configuration Experience | The configuration wizard abstracts pattern authoring for settings administrators |
| 18 Glossary | Defines "entity-key override," "granularity-based priority," and related terms |
| Appendix A | Full DDL for `setting_definitions`, `calc_required_settings`, `instance_setting_values` and related tables |
| Appendix C | Complete mapping from all 15 current JSON settings to proposed table rows |
| Appendix E | Comprehensive worked examples showing per-value pattern matching and the full composition model |
