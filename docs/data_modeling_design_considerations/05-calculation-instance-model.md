# Calculation Instance Model

**Document**: 05 of the Data Modeling Design Considerations series
**Audience**: Data Engineers, Financial Modelers, Product
**Last updated**: 2026-03-10

---

## 1. Concept

A **Calculation Instance** is the runtime-resolved unit of execution in the surveillance engine. It is the product of two independently-defined metadata objects:

```
Calculation Instance = Calculation Definition + Match Pattern + Setting Values [+ Time Window] --> Parameterized Calculation
```

A **Calculation Definition** declares *what* to compute: the formula (which may be SQL, procedural code, or a streaming expression like Flink), its input dependencies, its output schema, and a set of named parameter placeholders (e.g., `$cutoff_time`, `$trend_multiplier`, `$vwap_threshold`). It does not contain concrete threshold values --- it declares which settings it requires (by reference via `calc_required_settings`) and provides a formula type discriminator (`sql`, `code`, `flink`) so the engine knows which executor to invoke.

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
                     |  Definition (metadata only) |
                     +----------------------------+
                                   |
                                   |  setting: wash_vwap_threshold
                                   |  value_type: decimal
                                   |  (no default, no overrides ---
                                   |   pure definition)
                                   |
                                   v
                     +----------------------------+
                     |  Step 2b: Load Required     |
                     |  Settings Declaration       |
                     +----------------------------+
                                   |
                                   |  calc_required_settings:
                                   |    calc_id: wash_detection
                                   |    setting_id: wash_vwap_threshold
                                   |    param_name: vwap_threshold
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
          | Instance    |  | Instance    |  | Instance    |
          | Value       |  | Value       |  | Value       |
          | Lookup      |  | Lookup      |  | Lookup      |
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

2. **Load the setting definition.** For each setting-sourced parameter, the engine calls `MetadataService.load_setting(setting_id)` to retrieve the setting definition — pure metadata containing name, description, and value_type. The definition carries no default value and no overrides; it describes *what kind of parameter* this is.

2b. **Look up the required settings declaration.** The engine queries `calc_required_settings` for the current `calc_id` to confirm which settings the calculation expects and what `param_name` each maps to.

3. **Construct the entity context.** The match pattern provides the context dictionary -- for example, `{"asset_class": "equity"}` or `{"asset_class": "equity", "exchange_mic": "XNYS"}`. In the proposed model, this context comes from the `calc_pattern_bindings` table. In the current implementation, the context is passed as an empty dictionary `{}`.

4. **Look up instance setting values.** The engine queries `instance_setting_values` for the current `instance_id` and `setting_id` to retrieve the concrete `param_value`. Each calculation instance has its own set of values — the instance for `{asset_class: "equity"}` provides `vwap_threshold = 0.015`, the instance for `{asset_class: "fx"}` provides `vwap_threshold = 0.02`. No override resolution is needed because the correct value was assigned to the instance at configuration time.

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

### `setting_definitions`

Pure metadata — defines what a setting IS, not what its value is.

```sql
CREATE TABLE setting_definitions (
  setting_id     VARCHAR PRIMARY KEY,
  name           VARCHAR NOT NULL,
  description    TEXT,
  value_type     VARCHAR NOT NULL,  -- 'decimal', 'integer', 'string', 'boolean', 'score_steps'
  version        VARCHAR NOT NULL DEFAULT '1.0.0',
  examples       JSON               -- optional illustrative examples (not operational)
);
```

**What's absent:** No `default` column, no `overrides` array, no `match_type`. The definition describes the parameter's identity and type. Concrete values live in `instance_setting_values`.

### `calc_definitions`

Runtime-agnostic calculation definitions. The `formula_type` discriminator tells the engine which executor to invoke.

```sql
CREATE TABLE calc_definitions (
  calc_id          VARCHAR PRIMARY KEY,
  name             VARCHAR NOT NULL,
  description      TEXT,
  layer            VARCHAR NOT NULL,    -- 'transaction', 'time_window', 'aggregation', 'derived'
  formula_type     VARCHAR NOT NULL,    -- 'sql', 'code', 'flink'
  formula          TEXT NOT NULL,       -- SQL template, code reference, or Flink job spec
  output_schema    JSON,                -- describes output columns and types
  display_config   JSON,                -- UI rendering hints (labels, formats)
  depends_on       VARCHAR[],           -- DAG edges (array of calc_ids)
  version          VARCHAR NOT NULL DEFAULT '1.0.0'
);
```

**Key changes from current `calc_definitions`:**
- `logic_sql` → `formula` (runtime-agnostic name)
- Added `formula_type` discriminator (`sql`, `code`, `flink`)
- Added `output_schema` (structured output column descriptions, replaces `output_fields`)
- Added `display_config` (UI hints, replaces `value_labels`)
- Added `version` for change tracking
- Removed `output_table` (superseded by `calc_results` unified table)
- Removed `parameters` JSON (replaced by `calc_required_settings` junction table)

### `calc_required_settings`

Junction table declaring which settings a calculation requires. This replaces the `parameters` JSON blob on `calc_definitions` for setting-sourced parameters.

```sql
CREATE TABLE calc_required_settings (
  calc_id          VARCHAR NOT NULL,    -- FK → calc_definitions
  setting_id       VARCHAR NOT NULL,    -- FK → setting_definitions
  param_name       VARCHAR NOT NULL,    -- placeholder name in formula (e.g., 'vwap_threshold')
  PRIMARY KEY (calc_id, param_name)
);
```

**Example data:**

| calc_id | setting_id | param_name |
|---|---|---|
| `wash_detection` | `wash_vwap_threshold` | `vwap_threshold` |
| `trend_window` | `trend_sensitivity` | `trend_multiplier` |
| `business_date_window` | `business_date_cutoff` | `cutoff_time` |
| `large_trading_activity` | `large_activity_multiplier` | `activity_multiplier` |

This says: "The `wash_detection` calculation requires the `wash_vwap_threshold` setting and uses it as the `$vwap_threshold` placeholder in its formula."

Literal parameters (like `qty_threshold = 0.5` in `wash_detection`) are NOT in this table — they remain inline in the formula or in a separate `calc_literal_params` structure. Only setting-sourced parameters that vary by context appear here.

### `calc_instances` (the composition point)

This is WHERE everything comes together. A calculation instance is the product of a calculation definition, a match pattern, an optional time window, and concrete setting values.

```sql
CREATE TABLE calc_instances (
  instance_id      VARCHAR PRIMARY KEY,
  calc_id          VARCHAR NOT NULL,    -- FK → calc_definitions
  pattern_id       VARCHAR NOT NULL,    -- FK → match_patterns
  window_id        VARCHAR,             -- FK → time_windows (nullable)
  version          VARCHAR NOT NULL DEFAULT '1.0.0',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Example data:**

| instance_id | calc_id | pattern_id | window_id | version |
|---|---|---|---|---|
| `inst_wash_default` | `wash_detection` | `pat_default` | NULL | `1.0.0` |
| `inst_wash_equity` | `wash_detection` | `pat_equity` | NULL | `1.0.0` |
| `inst_wash_equity_nyse` | `wash_detection` | `pat_equity_nyse` | NULL | `1.0.0` |
| `inst_wash_aapl` | `wash_detection` | `pat_aapl` | NULL | `1.0.0` |
| `inst_wash_fixed_income` | `wash_detection` | `pat_fixed_income` | NULL | `1.0.0` |
| `inst_wash_index` | `wash_detection` | `pat_index` | NULL | `1.0.0` |

Multiple instances can exist per calculation definition — one per context. The `pat_default` instance (zero-attribute pattern) serves as the fallback when no more specific pattern matches.

### `instance_setting_values` (values live HERE)

The actual concrete values for each parameter, per instance. This is the ONLY place in the system where parameter values are stored.

```sql
CREATE TABLE instance_setting_values (
  instance_id      VARCHAR NOT NULL,    -- FK → calc_instances
  setting_id       VARCHAR NOT NULL,    -- FK → setting_definitions
  param_name       VARCHAR NOT NULL,    -- matches calc_required_settings.param_name
  pattern_id       VARCHAR NOT NULL,    -- FK → match_patterns (per-value granularity)
  param_value      JSON NOT NULL,       -- the actual concrete value
  PRIMARY KEY (instance_id, setting_id, param_name, pattern_id)
);
```

**Per-value pattern matching:** Within a single calculation instance, different settings can reference match patterns at different granularity levels. For example, the equity instance (`inst_wash_equity`) might have `wash_vwap_threshold` values varying by instrument type (using patterns `pat_equity_call`, `pat_equity_etf`) while `large_activity_score_steps` stays at the asset-class level (using pattern `pat_equity`). The `pattern_id` column enables this per-value granularity — the resolution engine selects the best-matching pattern for each setting independently.

**Example data for `wash_detection` instances:**

| instance_id | setting_id | param_name | pattern_id | param_value |
|---|---|---|---|---|
| `inst_wash_default` | `wash_vwap_threshold` | `vwap_threshold` | `pat_default` | `0.02` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity` | `0.015` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_call` | `0.018` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_etf` | `0.012` |
| `inst_wash_equity` | `large_activity_score_steps` | `score_steps` | `pat_equity` | `[{"min":0,"max":25000,"score":0},...]` |
| `inst_wash_equity_nyse` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_nyse` | `0.012` |
| `inst_wash_aapl` | `wash_vwap_threshold` | `vwap_threshold` | `pat_aapl` | `0.01` |
| `inst_wash_fixed_income` | `wash_vwap_threshold` | `vwap_threshold` | `pat_fixed_income` | `0.01` |
| `inst_wash_index` | `wash_vwap_threshold` | `vwap_threshold` | `pat_index` | `0.015` |

**What was previously the `default` value** (`0.02`) is now an explicit row on `inst_wash_default` with `pattern_id = pat_default` — the instance with a zero-attribute match pattern.

**What were previously `overrides`** are now rows on context-specific instances with their own `pattern_id`. There is no "override" concept — every value is a first-class row associated with a specific instance and a specific match pattern. Note how `inst_wash_equity` has multiple rows for `wash_vwap_threshold` at different pattern granularities (asset-class, instrument-type), while `large_activity_score_steps` stays at the `pat_equity` level.

### Composition Query

To fully resolve a calculation instance with all its setting values:

```sql
SELECT
    ci.instance_id,
    ci.calc_id,
    cd.formula_type,
    cd.formula,
    mp.pattern_id    AS instance_pattern,
    isv.pattern_id   AS value_pattern,
    isv.param_name,
    isv.param_value
FROM calc_instances ci
JOIN calc_definitions cd ON ci.calc_id = cd.calc_id
JOIN match_patterns mp ON ci.pattern_id = mp.pattern_id
JOIN instance_setting_values isv ON ci.instance_id = isv.instance_id
WHERE ci.calc_id = 'wash_detection'
  AND ci.pattern_id = 'pat_equity';

-- Result (multiple rows — per-value pattern granularity):
-- instance_id      | calc_id        | ... | instance_pattern | value_pattern    | param_name      | param_value
-- inst_wash_equity | wash_detection | ... | pat_equity       | pat_equity       | vwap_threshold  | 0.015
-- inst_wash_equity | wash_detection | ... | pat_equity       | pat_equity_call  | vwap_threshold  | 0.018
-- inst_wash_equity | wash_detection | ... | pat_equity       | pat_equity_etf   | vwap_threshold  | 0.012
-- inst_wash_equity | wash_detection | ... | pat_equity       | pat_equity       | score_steps     | [{"min":0,...}]
```

### FK Relationship Diagram

```
setting_definitions ←──── calc_required_settings ────→ calc_definitions
        ↑                                                      ↑
        │                                                      │
instance_setting_values ────→ calc_instances ────→ match_patterns
        │                                                ↑
        └────────────────────────────────────────────────┘
        (per-value pattern_id FK)       │
                                        └──→ time_windows (nullable)
```

### `match_patterns` + `match_pattern_attributes` (unchanged)

These tables are unchanged from document 04. Match patterns remain pure typed predicates with no values.

### `time_windows` (unchanged)

Time windows remain independently defined temporal scopes, unchanged from document 06.

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
def _resolve_parameters(
    self,
    calc: CalculationDefinition,
    instance: CalcInstance,
    context: dict[str, str],
) -> dict[str, Any]:
    """Resolve all parameters for a calculation instance.

    Each setting is resolved independently: the engine loads ALL pattern-level
    values for the setting within this instance, then selects the best match
    for the current entity context. This enables per-value pattern granularity —
    different settings within the same instance can resolve at different
    specificity levels.
    """
    resolved: dict[str, Any] = {}

    # Load required settings for this calculation
    required = self._metadata.load_required_settings(calc.calc_id)

    for req in required:
        # Load ALL pattern-level values for this setting within the instance
        pattern_values = self._metadata.load_instance_values_by_pattern(
            instance.instance_id, req.setting_id, req.param_name
        )
        # pattern_values: list of (pattern_id, param_value) tuples

        if pattern_values:
            # Select the best-matching pattern for the current context
            best_value = self._select_best_pattern_value(pattern_values, context)
            if best_value is not None:
                resolved[req.param_name] = best_value
                continue

        # Fallback: check the default instance (zero-attribute pattern)
        default_value = self._metadata.load_default_instance_value(
            calc.calc_id, req.setting_id, req.param_name
        )
        resolved[req.param_name] = default_value

    # Literal parameters are resolved from the formula spec directly
    for name, spec in calc.literal_params.items():
        resolved[name] = spec.get("value")

    return resolved

def _select_best_pattern_value(
    self,
    pattern_values: list[tuple[str, Any]],
    context: dict[str, str],
) -> Any | None:
    """Select the best-matching pattern value for the given context.

    Ranks by pattern specificity (number of matching attributes, descending).
    Returns the value from the most specific matching pattern, or None if
    no pattern matches the context.
    """
    candidates = []
    for pattern_id, value in pattern_values:
        attrs = self._metadata.load_pattern_attributes(pattern_id)
        if all(context.get(a.entity_attribute) == a.attribute_value for a in attrs):
            candidates.append((len(attrs), value))

    if not candidates:
        return None

    # Most specific (highest attribute count) wins
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]
```

### Backwards Compatibility

The migration is fully backwards compatible:

| Scenario | Current Behavior | Proposed Behavior |
|---|---|---|
| Calculation with no parameters (e.g., `value_calc`, `adjusted_direction`, `trading_activity_aggregation`, `vwap_calc`) | Executes as-is, no resolution | Unchanged -- no parameters to resolve |
| Calculation with literal-only parameters (e.g., `market_event_window` has `price_change_threshold: 0.05`) | Literal value used directly | Unchanged -- literal values bypass resolution |
| Calculation with setting-sourced parameters, no instance | Resolves to default | Resolves to default instance values (zero-attribute pattern) |
| Calculation with setting-sourced parameters, with instance | Resolves to default | Resolves to instance-specific values from `instance_setting_values` |

Calculations that have no `calc_instances` rows continue to use the default instance (zero-attribute pattern) and resolve to default values -- identical to current behavior. Only calculations with context-specific instances gain context-aware resolution.

### Migration Steps

1. **Create `setting_definitions` table.** Extract pure metadata from existing JSON setting files.
2. **Create `calc_required_settings` table.** Populate from the `parameters` JSON in current `calc_definitions` (one row per `source: "setting"` entry).
3. **Create `calc_instances` table.** One instance per (calculation, match pattern) combination currently represented by existing overrides.
4. **Create `instance_setting_values` table.** Populate from existing setting defaults and overrides, mapping each value to the appropriate instance.
5. **Update `_resolve_parameters()`** to accept a `CalcInstance` and look up values from `instance_setting_values` (code change shown above).
6. **Update `_execute()`** to select the appropriate instance based on the current entity context and pass it to `_resolve_parameters()`.
7. **Validate**: run the full calculation DAG with and without instances; verify that unbound calculations (default instances) produce identical results, and bound calculations produce the expected per-context results.

No existing API endpoints or detection models require changes. Setting definitions are simplified (metadata only). The migration adds four new tables (`setting_definitions`, `calc_required_settings`, `calc_instances`, `instance_setting_values`) and modifies one method signature.
