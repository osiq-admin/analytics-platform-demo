# Calculation Instance Model

**Document**: 05 of the Data Modeling Design Considerations series
**Audience**: Data Engineers, Financial Modelers, Product
**Last updated**: 2026-03-09

---

## 1. Concept

A **Calculation Instance** is the runtime-resolved unit of execution in the surveillance engine. It is the product of two independently-defined metadata objects:

```
Calculation Instance = Calculation Definition x Match Pattern (type: setting) --> Parameterized Calculation
```

A **Calculation Definition** declares *what* to compute: the SQL template, its input dependencies, its output schema, and a set of named parameter placeholders (e.g., `$cutoff_time`, `$trend_multiplier`, `$vwap_threshold`). It does not contain concrete threshold values -- it contains references to where those values come from.

A **Match Pattern** (of type `setting`) declares *for whom* the calculation applies: a set of entity-attribute predicates such as `{asset_class: "equity"}` or `{asset_class: "equity", exchange_mic: "XNYS"}`. When paired with a settings override, it supplies the concrete parameter values that fill the calculation's placeholders.

The combination of these two objects -- the generic formula plus the context-specific parameter values -- produces a **parameterized calculation instance** that is:

- **Trackable**: every alert can trace back to the exact instance that produced it.
- **Auditable**: the resolved parameters, the match pattern that selected them, and the reason for selection are all recorded.
- **Cacheable**: the same `(calc_id, pattern_id, resolved_params)` tuple always produces the same SQL. If two detection models share the same instance, the engine executes it once.
- **Deterministic**: given the same input data and settings state, the instance produces identical output.

### Why This Matters

The current platform has 10 calculation definitions. Without the instance model, each definition executes once with a single set of default parameters. With the instance model, each definition can spawn multiple instances -- one per applicable match pattern -- producing context-specific results. The `wash_detection` calculation, for example, would produce separate instances for equities (VWAP threshold 0.015), FX (threshold 0.02), and fixed income (threshold 0.01), each with the correct sensitivity for that market's price behavior.

This is the mechanism that enables "one engine, every market" -- the calculation definition is written once, but its parameterization varies by context.

---

## 2. Resolution Flow

The resolution flow describes how a generic calculation definition becomes a concrete, executable instance.

```
                         CALCULATION DEFINITION
                         (calc_id: wash_detection)
                                   |
                                   |  parameters:
                                   |    $vwap_threshold:
                                   |      source: "setting"
                                   |      setting_id: "wash_vwap_threshold"
                                   |      default: 0.02
                                   |
                                   v
                     +----------------------------+
                     |  Step 1: Identify Params   |
                     |  that source from settings  |
                     +----------------------------+
                                   |
                                   | param: $vwap_threshold
                                   | setting_id: wash_vwap_threshold
                                   |
                                   v
                     +----------------------------+
                     |  Step 2: Load Setting       |
                     |  Definition from metadata   |
                     +----------------------------+
                                   |
                                   |  setting: wash_vwap_threshold
                                   |  default: 0.02
                                   |  overrides:
                                   |    {asset_class: equity}      -> 0.015
                                   |    {asset_class: equity,
                                   |     exchange_mic: XNYS}       -> 0.012
                                   |    {product: AAPL}            -> 0.01
                                   |    {asset_class: fixed_income}-> 0.01
                                   |    {asset_class: index}       -> 0.015
                                   |
                                   v
                     +----------------------------+
                     |  Step 3: Apply Match        |
                     |  Pattern as Context          |
                     +----------------------------+
                                   |
                   +---------------+---------------+
                   |               |               |
                   v               v               v
          context:          context:          context:
          {asset_class:     {asset_class:     {asset_class:
           "equity"}         "fx"}             "fixed_income"}
                   |               |               |
                   v               v               v
          +-------------+  +-------------+  +-------------+
          | Step 4:     |  | Step 4:     |  | Step 4:     |
          | Settings    |  | Settings    |  | Settings    |
          | Resolver    |  | Resolver    |  | Resolver    |
          | (hierarchy) |  | (hierarchy) |  | (hierarchy) |
          +-------------+  +-------------+  +-------------+
                   |               |               |
                   v               v               v
          matched:          no match:        matched:
          0.015             default 0.02     0.01
                   |               |               |
                   v               v               v
          +-------------+  +-------------+  +-------------+
          | Step 5:     |  | Step 5:     |  | Step 5:     |
          | Substitute  |  | Substitute  |  | Substitute  |
          | into SQL    |  | into SQL    |  | into SQL    |
          +-------------+  +-------------+  +-------------+
                   |               |               |
                   v               v               v
          INSTANCE A        INSTANCE B        INSTANCE C
          wash_detection    wash_detection    wash_detection
          equity            fx                fixed_income
          vwap < 0.015      vwap < 0.02       vwap < 0.01
```

### Step-by-Step Detail

1. **Identify parameterized placeholders.** The engine reads `calc.parameters` and filters for entries where `source == "setting"`. Each such entry names a `setting_id` and a `default` fallback. Parameters with `source == "literal"` are resolved immediately to their static `value` and do not participate in context-dependent resolution.

2. **Load the setting definition.** For each setting-sourced parameter, the engine calls `MetadataService.load_setting(setting_id)` to retrieve the full setting definition, including its default value, `match_type` (hierarchy or multi-dimensional), and list of overrides.

3. **Construct the entity context.** The match pattern provides the context dictionary -- for example, `{"asset_class": "equity"}` or `{"asset_class": "equity", "exchange_mic": "XNYS"}`. In the proposed model, this context comes from the `calc_pattern_bindings` table. In the current implementation, the context is passed as an empty dictionary `{}`.

4. **Resolve via SettingsResolver.** The `SettingsResolver.resolve(setting, context)` method applies the configured resolution strategy:
   - **Hierarchy strategy**: all match keys in an override must be present in the context. The override with the most matching keys wins, tie-broken by `priority`. For context `{asset_class: "equity"}`, the override `{asset_class: "equity"} -> 0.015` matches with 1 key. The override `{asset_class: "equity", exchange_mic: "XNYS"} -> 0.012` does not match (context lacks `exchange_mic`). Result: `0.015`.
   - **Multi-dimensional strategy**: count how many dimensions match. Most matches wins, tie-broken by `priority`.
   - **Product-specific overrides** (priority >= 100) always win when context matches.
   - If no override matches, the setting's `default` value is returned.

5. **Substitute parameters into SQL.** The engine calls `_substitute_parameters(sql, resolved_params)`, which performs string replacement of `$param_name` placeholders with formatted values. Numeric values are substituted directly; strings are single-quoted with SQL escaping; `None` becomes `NULL`.

The output of this flow is a concrete SQL statement with all placeholders resolved -- the calculation instance is ready to execute.

---

## 3. Examples Using Actual Calculations

### 3.1 `business_date_window` -- Exchange-Specific Cutoffs

The `business_date_window` calculation determines which business date an execution belongs to based on a configurable cutoff time. Different exchanges close at different times.

**Calculation parameter spec** (from `business_date_window.json`):

```json
{
  "cutoff_time": {
    "source": "setting",
    "setting_id": "business_date_cutoff",
    "default": "17:00:00"
  }
}
```

**Setting definition** (from `business_date_cutoff.json`):

```json
{
  "setting_id": "business_date_cutoff",
  "default": "17:00",
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"exchange_mic": "XNYS"}, "value": "21:00", "priority": 1},
    {"match": {"exchange_mic": "XLON"}, "value": "16:30", "priority": 1},
    {"match": {"asset_class": "fx"},    "value": "21:00", "priority": 1}
  ]
}
```

**Instance A -- NYSE context** `{exchange_mic: "XNYS"}`:

| Step | Detail |
|------|--------|
| Match | Override `{exchange_mic: "XNYS"} -> "21:00"` matches (1 key, priority 1) |
| Resolved value | `"21:00"` |

```sql
-- Before substitution (template):
CASE WHEN execution_time > $cutoff_time
     THEN CAST(execution_date AS DATE) + INTERVAL 1 DAY
     ELSE CAST(execution_date AS DATE) END AS business_date

-- After substitution (instance):
CASE WHEN execution_time > '21:00'
     THEN CAST(execution_date AS DATE) + INTERVAL 1 DAY
     ELSE CAST(execution_date AS DATE) END AS business_date
```

NYSE closes at 16:00 ET (21:00 UTC). Executions after 21:00 UTC roll to the next business date.

**Instance B -- London context** `{exchange_mic: "XLON"}`:

| Step | Detail |
|------|--------|
| Match | Override `{exchange_mic: "XLON"} -> "16:30"` matches |
| Resolved value | `"16:30"` |

```sql
-- After substitution:
CASE WHEN execution_time > '16:30'
     THEN CAST(execution_date AS DATE) + INTERVAL 1 DAY
     ELSE CAST(execution_date AS DATE) END AS business_date
```

LSE closes at 16:30 local time. The cutoff reflects this earlier close.

**Instance C -- FX context** `{asset_class: "fx"}`:

| Step | Detail |
|------|--------|
| Match | Override `{asset_class: "fx"} -> "21:00"` matches |
| Resolved value | `"21:00"` |

FX markets trade 24 hours. The 21:00 UTC cutoff aligns with the standard FX "New York close" convention.

**Instance D -- No match** `{asset_class: "commodity"}`:

| Step | Detail |
|------|--------|
| Match | No override matches `{asset_class: "commodity"}` |
| Resolved value | Default `"17:00"` |

---

### 3.2 `trend_window` -- Equity Sensitivity vs. FX Sensitivity

The `trend_window` calculation detects price trends using a standard deviation multiplier. Higher multipliers require larger moves to register as a trend, reducing false positives in volatile markets.

**Calculation parameter spec** (from `trend_window.json`):

```json
{
  "trend_multiplier": {
    "source": "setting",
    "setting_id": "trend_sensitivity",
    "default": 1.5
  }
}
```

**Setting definition** (from `trend_sensitivity.json`):

```json
{
  "setting_id": "trend_sensitivity",
  "default": 3.5,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"},       "value": 2.5, "priority": 1},
    {"match": {"asset_class": "fx"},           "value": 2.0, "priority": 1},
    {"match": {"asset_class": "fixed_income"}, "value": 1.2, "priority": 1},
    {"match": {"asset_class": "index"},        "value": 1.3, "priority": 1}
  ]
}
```

**Instance A -- Equity** `{asset_class: "equity"}`:

```sql
-- Template:
CASE WHEN close_price > open_price + (price_stddev * $trend_multiplier) THEN 'up'
     WHEN close_price < open_price - (price_stddev * $trend_multiplier) THEN 'down'
     ELSE NULL END AS trend_type

-- Resolved (equity, multiplier = 2.5):
CASE WHEN close_price > open_price + (price_stddev * 2.5) THEN 'up'
     WHEN close_price < open_price - (price_stddev * 2.5) THEN 'down'
     ELSE NULL END AS trend_type
```

Equities are relatively volatile. A 2.5x standard deviation threshold means only significant intraday moves register as trends, filtering out normal daily noise.

**Instance B -- FX** `{asset_class: "fx"}`:

```sql
-- Resolved (FX, multiplier = 2.0):
CASE WHEN close_price > open_price + (price_stddev * 2.0) THEN 'up'
     WHEN close_price < open_price - (price_stddev * 2.0) THEN 'down'
     ELSE NULL END AS trend_type
```

FX spot rates move in smaller increments than equities. A lower multiplier (2.0) ensures the engine captures meaningful FX trends that would be invisible at equity thresholds.

**Instance C -- Fixed Income** `{asset_class: "fixed_income"}`:

```sql
-- Resolved (fixed income, multiplier = 1.2):
CASE WHEN close_price > open_price + (price_stddev * 1.2) THEN 'up'
     WHEN close_price < open_price - (price_stddev * 1.2) THEN 'down'
     ELSE NULL END AS trend_type
```

Fixed income instruments move in basis points. Even small directional moves are significant and may indicate manipulation. The 1.2x multiplier provides the highest sensitivity of any asset class.

---

### 3.3 `wash_detection` -- Different Thresholds per Asset Class

The `wash_detection` calculation identifies potential wash trades by checking VWAP proximity (how close buy and sell prices are) and quantity match ratio (how closely buy and sell volumes match).

**Calculation parameter spec** (from `wash_detection.json`):

```json
{
  "qty_threshold": {"source": "literal", "value": 0.5},
  "vwap_threshold": {
    "source": "setting",
    "setting_id": "wash_vwap_threshold",
    "default": 0.02
  }
}
```

Note: `qty_threshold` is a literal (0.5) -- it does not vary by context. Only `vwap_threshold` participates in instance resolution.

**Setting definition** (from `wash_vwap_threshold.json`):

```json
{
  "setting_id": "wash_vwap_threshold",
  "default": 0.02,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"},                       "value": 0.015, "priority": 1},
    {"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012, "priority": 2},
    {"match": {"product": "AAPL"},                             "value": 0.01,  "priority": 100},
    {"match": {"asset_class": "fixed_income"},                 "value": 0.01,  "priority": 1},
    {"match": {"asset_class": "index"},                        "value": 0.015, "priority": 1}
  ]
}
```

**Instance A -- Generic equity** `{asset_class: "equity"}`:

```sql
-- Resolved:
CASE WHEN ... AND LEAST(buy_qty, sell_qty) / GREATEST(buy_qty, sell_qty) > 0.5
         AND COALESCE(v.vwap_proximity, 1.0) < 0.015
     THEN TRUE ELSE FALSE END AS is_wash_candidate
```

**Instance B -- Equity on NYSE** `{asset_class: "equity", exchange_mic: "XNYS"}`:

```sql
-- Resolved:
CASE WHEN ... AND LEAST(buy_qty, sell_qty) / GREATEST(buy_qty, sell_qty) > 0.5
         AND COALESCE(v.vwap_proximity, 1.0) < 0.012
     THEN TRUE ELSE FALSE END AS is_wash_candidate
```

The NYSE-specific override (priority 2) wins over the generic equity override (priority 1) because it has more matching keys (2 vs 1) and higher priority. This reflects NYSE's tighter spread environment where a 1.2% VWAP proximity threshold is more appropriate than the generic equity 1.5%.

**Instance C -- AAPL product-specific** `{product: "AAPL"}`:

```sql
-- Resolved:
CASE WHEN ... AND LEAST(buy_qty, sell_qty) / GREATEST(buy_qty, sell_qty) > 0.5
         AND COALESCE(v.vwap_proximity, 1.0) < 0.01
     THEN TRUE ELSE FALSE END AS is_wash_candidate
```

AAPL is the highest-volume equity. Its narrow spreads mean even tighter VWAP proximity is normal. The product-specific override (priority 100) takes precedence over all other overrides.

**Instance D -- Fixed income** `{asset_class: "fixed_income"}`:

```sql
-- Resolved:
CASE WHEN ... AND LEAST(buy_qty, sell_qty) / GREATEST(buy_qty, sell_qty) > 0.5
         AND COALESCE(v.vwap_proximity, 1.0) < 0.01
     THEN TRUE ELSE FALSE END AS is_wash_candidate
```

Fixed income markets are less volatile. A tighter 1.0% threshold reduces false positives from normal bond trading activity.

---

### 3.4 `large_trading_activity` -- Activity Multiplier by Market

**Calculation parameter spec** (from `large_trading_activity.json`):

```json
{
  "activity_multiplier": {
    "source": "setting",
    "setting_id": "large_activity_multiplier",
    "default": 2.0
  }
}
```

**Setting definition** (from `large_activity_multiplier.json`):

```json
{
  "setting_id": "large_activity_multiplier",
  "default": 2.0,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"},       "value": 2.5, "priority": 1},
    {"match": {"asset_class": "fx"},           "value": 3.0, "priority": 1},
    {"match": {"asset_class": "commodity"},    "value": 2.5, "priority": 1},
    {"match": {"asset_class": "fixed_income"}, "value": 2.5, "priority": 1},
    {"match": {"asset_class": "index"},        "value": 2.0, "priority": 1}
  ]
}
```

| Context | Resolved Multiplier | Rationale |
|---------|---------------------|-----------|
| `{asset_class: "equity"}` | 2.5x | Normal equity volume is high; require 2.5x average to flag |
| `{asset_class: "fx"}` | 3.0x | FX notional values are enormous; 3.0x reduces noise |
| `{asset_class: "fixed_income"}` | 2.5x | Lower baseline volumes; 2.5x is sufficiently discriminating |
| `{asset_class: "commodity"}` | 2.5x | Moderate volume; aligned with equity threshold |
| `{asset_class: "index"}` | 2.0x | Standard multiplier |
| `{}` (no context) | 2.0x (default) | Fallback when no asset class is known |

The same `large_trading_activity` SQL template -- `CASE WHEN total_value > avg_daily_value * $activity_multiplier THEN TRUE` -- produces different flagging behavior for each market segment, without any code changes.

---

## 4. Reusability

### One Definition, Many Models

Calculation definitions are designed to be reused across detection models. The formula is defined once in the calculation JSON. Each detection model declares which calculations it depends on, and the engine ensures they are executed (in DAG order) before the model's query runs.

**Current reuse across the 5 detection models:**

| Calculation | Layer | wash_full_day | wash_intraday | market_price_ramping | insider_dealing | spoofing_layering |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `value_calc` | transaction | * | * | * | * | -- |
| `adjusted_direction` | transaction | * | * | * | * | -- |
| `business_date_window` | time_window | * | * | * | * | -- |
| `cancellation_pattern` | time_window | -- | -- | -- | -- | * |
| `trend_window` | time_window | -- | * | * | -- | -- |
| `market_event_window` | time_window | -- | -- | -- | * | -- |
| `trading_activity_aggregation` | aggregation | * | * | * | * | -- |
| `vwap_calc` | aggregation | * | * | -- | -- | -- |
| `large_trading_activity` | derived | * | * | * | * | -- |
| `wash_detection` | derived | * | * | -- | -- | -- |

**Key observations:**

- `large_trading_activity` is used by 4 of 5 models. It is the most reused calculation.
- `value_calc`, `adjusted_direction`, `business_date_window`, and `trading_activity_aggregation` form a shared foundation used by 4 models.
- `vwap_calc` is used exclusively by the two wash trading models -- its buy/sell VWAP spread is a wash-specific indicator.
- `cancellation_pattern` and `market_event_window` are used by exactly one model each (spoofing and insider dealing, respectively) -- they are domain-specific time window calculations.
- `wash_detection` is a derived calculation that composes `large_trading_activity` and `vwap_calc`, used by both wash trading models (full day and intraday).

### The Multiplication Effect

Without the instance model, the platform executes 10 calculations. With the instance model and the current 9 match patterns, the calculation space expands:

- 6 calculations with setting-sourced parameters x 5+ applicable match patterns = 30+ distinct instances
- 4 calculations with no parameters or literal-only parameters = 4 unchanged instances
- Total: 34+ instances from 10 definitions

When a new asset class is onboarded (e.g., structured products), adding a single match pattern `{asset_class: "structured"}` and its corresponding setting overrides instantly creates new instances for every parameterized calculation -- without touching any calculation definition or detection model.

---

## 5. Instance Identity

### Unique Identification

Each calculation instance is uniquely identified by the tuple:

```
(calc_id, pattern_id, resolved_params_hash)
```

| Component | Source | Example |
|---|---|---|
| `calc_id` | Calculation definition | `wash_detection` |
| `pattern_id` | Match pattern that supplied context | `equity_stocks` |
| `resolved_params_hash` | SHA-256 of sorted resolved parameter key-value pairs | `a3f8c2...` (hash of `{qty_threshold: 0.5, vwap_threshold: 0.015}`) |

The `resolved_params_hash` is necessary because two different match patterns could resolve to the same parameter values (e.g., `equity_stocks` and `index_instruments` both resolve `trend_sensitivity` to similar multipliers in a hypothetical scenario). The hash ensures deduplication: if two patterns produce identical resolved parameters for the same calculation, only one instance is executed.

### Instance Caching

Instances are cached per engine run. The cache key is `(calc_id, resolved_params_hash)`:

```
Instance Cache (per run)
------------------------------------------------------
Key                                    | Status
------------------------------------------------------
(wash_detection, a3f8c2...)            | executed, 14 rows
(wash_detection, b7d1e9...)            | executed, 3 rows
(business_date_window, c4a2f1...)      | executed, 761 rows
(business_date_window, d8b3c7...)      | executed, 761 rows
(trend_window, e2f9a4...)              | executed, 42 rows
------------------------------------------------------
```

If multiple detection models reference the same calculation with the same resolved parameters, the engine skips re-execution and reuses the cached result.

### What Instance Tracking Enables

**Alert traceability -- "Why did this alert fire?"**

Every alert stores the `instance_id` of the calculation that produced it. An analyst investigating an alert can trace:
- `alert.instance_id` --> `calc_pattern_binding` --> exact calculation + match pattern
- `calc_pattern_binding.pattern_id` --> match pattern conditions (`{asset_class: "equity"}`)
- Resolved parameters --> the exact thresholds used (`vwap_threshold: 0.015`)
- Setting overrides --> *why* that value was chosen (override `{asset_class: "equity"} -> 0.015, priority 1`)

**Impact analysis -- "What would change if we update this setting?"**

When a compliance officer proposes changing `wash_vwap_threshold` for equities from 0.015 to 0.012:
1. Query `calc_pattern_bindings` for all bindings referencing `wash_vwap_threshold`.
2. Identify affected instances: `wash_detection` x `equity_stocks`, `wash_detection` x `equity_nyse`.
3. Identify affected models: `wash_full_day`, `wash_intraday`.
4. Run backtesting with the proposed value to preview alert volume changes.

**Dependency analysis -- "Which models share this calculation?"**

```sql
SELECT DISTINCT m.model_id, m.name
FROM   calc_pattern_bindings b
JOIN   detection_models m ON b.model_id = m.model_id
WHERE  b.calc_id = 'large_trading_activity';

-- Result:
-- wash_full_day       | Wash Trading -- Full Day
-- wash_intraday       | Wash Trading -- Intraday
-- market_price_ramping| Market Price Ramping (MPR)
-- insider_dealing     | Insider Dealing
```

This query answers: if `large_trading_activity` is modified, which models are affected? Today, the answer is 4 of 5.

---

## 6. Proposed Table Structure

### `calc_pattern_bindings`

This table records the explicit relationship between a calculation, a match pattern, and (optionally) a detection model. It is the core join table of the instance model.

```sql
CREATE TABLE calc_pattern_bindings (
  binding_id   VARCHAR PRIMARY KEY,    -- e.g., 'wash_detection__equity_stocks__setting'
  calc_id      VARCHAR NOT NULL,       -- FK --> calc_definitions.calc_id
  pattern_id   VARCHAR NOT NULL,       -- FK --> match_patterns.pattern_id (type: setting)
  model_id     VARCHAR,                -- FK --> detection_models.model_id (NULL = shared)
  binding_type VARCHAR NOT NULL,       -- 'setting', 'threshold', 'score'
  UNIQUE (calc_id, pattern_id, binding_type)
);
```

**Column semantics:**

| Column | Purpose |
|---|---|
| `binding_id` | Human-readable composite key: `{calc_id}__{pattern_id}__{binding_type}` |
| `calc_id` | Which calculation definition this binding parameterizes |
| `pattern_id` | Which match pattern supplies the entity context for settings resolution |
| `model_id` | Which detection model uses this binding. `NULL` means the binding is shared (any model may use it) |
| `binding_type` | Discriminator for what the binding controls: `'setting'` (parameter values), `'threshold'` (alert trigger thresholds), `'score'` (graduated score step overrides) |

**Example data:**

```
binding_id                                     | calc_id                      | pattern_id         | model_id              | binding_type
-----------------------------------------------|------------------------------|--------------------|-----------------------|-------------
wash_detection__equity_stocks__setting         | wash_detection               | equity_stocks      | NULL                  | setting
wash_detection__fx_instruments__setting        | wash_detection               | fx_instruments     | NULL                  | setting
wash_detection__fixed_income_all__setting      | wash_detection               | fixed_income_all   | NULL                  | setting
business_date_window__nyse_listed__setting     | business_date_window         | nyse_listed        | NULL                  | setting
business_date_window__fx_instruments__setting  | business_date_window         | fx_instruments     | NULL                  | setting
trend_window__equity_stocks__setting           | trend_window                 | equity_stocks      | market_price_ramping  | setting
trend_window__fx_instruments__setting          | trend_window                 | fx_instruments     | market_price_ramping  | setting
large_trading_activity__equity_stocks__threshold| large_trading_activity       | equity_stocks      | wash_full_day         | threshold
cancellation_pattern__equity_stocks__setting   | cancellation_pattern         | equity_stocks      | spoofing_layering     | setting
market_event_window__equity_stocks__setting    | market_event_window          | equity_stocks      | insider_dealing       | setting
```

### `calc_instances` (runtime, per-run)

This table is populated at execution time and records each resolved instance for auditability.

```sql
CREATE TABLE calc_instances (
  instance_id         VARCHAR PRIMARY KEY,  -- UUID or composite
  run_id              VARCHAR NOT NULL,     -- FK --> engine_runs.run_id
  calc_id             VARCHAR NOT NULL,     -- FK --> calc_definitions.calc_id
  pattern_id          VARCHAR NOT NULL,     -- FK --> match_patterns.pattern_id
  resolved_params     JSON NOT NULL,        -- {"vwap_threshold": 0.015, "qty_threshold": 0.5}
  resolved_params_hash VARCHAR NOT NULL,    -- SHA-256 of sorted params
  result_table        VARCHAR NOT NULL,     -- DuckDB table name holding results
  row_count           INTEGER NOT NULL,     -- Number of rows produced
  executed_at         TIMESTAMP NOT NULL,   -- Execution timestamp
  cached              BOOLEAN NOT NULL,     -- TRUE if result was reused from cache
  resolution_trace    JSON                  -- Per-param resolution audit trail
);
```

**Example `resolution_trace` for a `wash_detection` equity instance:**

```json
{
  "vwap_threshold": {
    "setting_id": "wash_vwap_threshold",
    "context": {"asset_class": "equity"},
    "matched_override": {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    "resolved_value": 0.015,
    "why": "Matched override: {asset_class=equity} (priority 1)"
  },
  "qty_threshold": {
    "source": "literal",
    "resolved_value": 0.5,
    "why": "Literal parameter -- no resolution needed"
  }
}
```

---

## 7. Migration from Current System

### Current Behavior

The current implementation in `calculation_engine.py` resolves all parameters with an empty context dictionary:

```python
# backend/engine/calculation_engine.py, line 178
result = self._resolver.resolve(setting, {})
```

This means:
- Every setting-sourced parameter resolves to its **default value** (no override ever matches an empty context).
- `wash_vwap_threshold` always resolves to `0.02` regardless of asset class.
- `trend_sensitivity` always resolves to `3.5` (the setting default) rather than the calculation-level default of `1.5`.
- `business_date_cutoff` always resolves to `"17:00"` -- NYSE and London executions get the same cutoff.
- Each calculation produces one result set: one-size-fits-all for every asset class.

The setting overrides exist in metadata but are never activated at the calculation layer -- they only take effect when the Settings Manager UI is used to preview resolution or when the detection engine scores alerts.

### Proposed Change

Pass entity context from the match pattern through to the settings resolver:

```python
# PROPOSED: calculation_engine.py
def _resolve_parameters(self, calc: CalculationDefinition, context: dict[str, str]) -> dict[str, Any]:
    resolved: dict[str, Any] = {}
    for name, spec in calc.parameters.items():
        if not isinstance(spec, dict) or "source" not in spec:
            continue

        if spec["source"] == "setting" and self._resolver is not None:
            setting_id = spec.get("setting_id", "")
            setting = self._metadata.load_setting(setting_id)
            if setting is not None:
                result = self._resolver.resolve(setting, context)  # <-- context, not {}
                resolved[name] = result.value
            else:
                resolved[name] = spec.get("default")
        elif spec["source"] == "literal":
            resolved[name] = spec.get("value")
        elif spec["source"] == "setting" and self._resolver is None:
            resolved[name] = spec.get("default")

    return resolved
```

The only change is on the `self._resolver.resolve(setting, context)` call -- the second argument changes from `{}` to the context dictionary derived from the match pattern.

### Backwards Compatibility

The migration is fully backwards compatible:

| Scenario | Current Behavior | Proposed Behavior |
|---|---|---|
| Calculation with no parameters (e.g., `value_calc`, `adjusted_direction`, `trading_activity_aggregation`, `vwap_calc`) | Executes as-is, no resolution | Unchanged -- no parameters to resolve |
| Calculation with literal-only parameters (e.g., `market_event_window` has `price_change_threshold: 0.05`) | Literal value used directly | Unchanged -- literal values bypass resolution |
| Calculation with setting-sourced parameters, no binding | Resolves to default | Resolves to default (empty context matches no overrides) |
| Calculation with setting-sourced parameters, with binding | Resolves to default | Resolves to override value (context enables matching) |

Calculations that have no `calc_pattern_bindings` rows continue to receive an empty context `{}` and resolve to defaults -- identical to current behavior. Only calculations with explicit bindings gain context-aware resolution.

### Migration Steps

1. **Create the `calc_pattern_bindings` table** (DDL in Section 6). No existing tables are modified.
2. **Populate initial bindings** from the existing calculation x setting x match pattern metadata. The data already exists across three JSON directories -- the migration is a JOIN, not an invention.
3. **Update `_resolve_parameters()`** to accept and forward context (one-line change shown above).
4. **Update `_execute()`** to look up the binding for the current calculation and pass its match pattern as context.
5. **Add `calc_instances` table** for runtime tracking (optional, can be deferred).
6. **Validate**: run the full calculation DAG with and without bindings; verify that unbound calculations produce identical results, and bound calculations produce the expected per-context results.

No existing API endpoints, detection models, or settings definitions require changes. The migration adds a new table and modifies one method signature.
