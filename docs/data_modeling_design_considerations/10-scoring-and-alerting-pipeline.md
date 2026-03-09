# 10 -- Scoring and Alerting Pipeline

> Multi-dimensional score resolution, graduated scoring, MUST_PASS/OPTIONAL logic,
> and end-to-end alert generation with full explainability.

**Audience**: Financial Modelers, Compliance Officers, Data Engineers
**Last updated**: 2026-03-09

---

## 1. Multi-Dimensional Score Resolution

The scoring pipeline resolves scores along two independent axes. This separation is what allows the same detection model to produce calibrated alerts across fundamentally different markets without code changes.

### Axis 1: Context -- Which Score Matrix to Use

The first axis determines *which set of score step ranges* to apply. This is resolved from the **entity context** -- the set of attributes describing the candidate being evaluated (asset class, instrument type, venue, account type, etc.).

When the detection engine processes a candidate row, it extracts context fields defined by the model (e.g., `product_id`, `account_id`, `asset_class`, `instrument_type`). These context fields are then passed to the settings resolver, which matches them against score step setting overrides to select the appropriate score matrix.

For example, the `large_activity_score_steps` setting defines a default matrix plus asset-class-specific overrides:

```
Default matrix:        [0, 10K) -> 0    [10K, 100K) -> 3    [100K, 500K) -> 7    [500K, inf) -> 10
Equity override:       [0, 25K) -> 0    [25K, 100K) -> 3    [100K, 500K) -> 7    [500K, inf) -> 10
```

The equity override raises the zero-score floor from $10,000 to $25,000 because normal equity trading volumes are higher -- activity that would be notable in commodities is routine in equities.

### Axis 2: Magnitude -- Where the Value Falls in the Range

The second axis maps the **computed calculation value** to a score by finding which step range it falls within. This is a simple range lookup: for a given value `v`, find the step where `min_value <= v < max_value` and return the corresponding score.

### The Key Insight: Context-Aware Scoring

The same calculation result produces different scores depending on the entity context. This is the fundamental design principle that makes the platform work across asset classes:

| Scenario | Calculation | Computed Value | Context | Score Matrix Used | Score Awarded |
|----------|-------------|----------------|---------|-------------------|---------------|
| A | `large_trading_activity` | $75,000 | `asset_class=equity` | Equity override | **3** (falls in [25K, 100K)) |
| B | `large_trading_activity` | $75,000 | `asset_class=commodity` | Default | **3** (falls in [10K, 100K)) |
| C | `large_trading_activity` | $15,000 | `asset_class=equity` | Equity override | **0** (falls in [0, 25K)) |
| D | `large_trading_activity` | $15,000 | `asset_class=commodity` | Default | **3** (falls in [10K, 100K)) |

Scenarios C and D demonstrate the insight: $15,000 of trading activity is unremarkable for equities (score 0) but potentially significant for commodities (score 3). Without context-aware scoring, the platform would either generate excessive false positives in equity markets or miss genuine signals in lower-volume markets.

This same principle applies to every scored calculation. VWAP proximity, quantity match ratios, same-side percentages, and market event magnitudes all resolve their score matrices through the entity context. The compliance team configures these matrices through the Settings Manager UI; the detection engine applies them automatically at runtime.

---

## 2. Score Step Structure with Context

### Score Steps as Settings

Score steps are stored as **settings** with `value_type: "score_steps"`. This means they participate in the same override resolution system as all other settings: a default value, plus context-specific overrides selected by match patterns.

Each score step setting is referenced by a `ModelCalculation` via the `score_steps_setting` field. When the detection engine evaluates a calculation, it:

1. Loads the score step setting by ID
2. Passes the entity context to the settings resolver
3. Receives the resolved score step array (default or override)
4. Maps the computed value to a score via range lookup

### The `score_steps` Data Structure

Each score step array is a list of contiguous, non-overlapping ranges:

```json
[
  {"min_value": <lower_bound>, "max_value": <upper_bound>, "score": <points>},
  ...
]
```

Rules:
- Ranges are evaluated in order; the first match wins
- `min_value` is inclusive, `max_value` is exclusive (`min <= value < max`)
- `max_value: null` means unbounded upper range (effectively infinity)
- `min_value: null` means unbounded lower range (effectively negative infinity)
- Score values are typically 0, 3, 7, or 10 (four-tier graduated scale)
- A score of 0 means "value is within normal range for this context"

### The Seven Score Templates

The platform provides seven reusable score templates that serve as starting points for new score step configurations. These templates encode domain knowledge about what "normal" looks like for different value categories:

| Template | Category | Step Ranges | Use Case |
|----------|----------|-------------|----------|
| **volume_standard** | volume | [0, 10K) -> 1, [10K, 100K) -> 3, [100K, 1M) -> 7, [1M, inf) -> 10 | Standard notional value scoring for equities, commodities |
| **volume_fx** | volume | [0, 100K) -> 1, [100K, 1M) -> 3, [1M, 10M) -> 7, [10M, inf) -> 10 | FX volume scoring -- thresholds 10x higher due to FX market depth |
| **ratio_graduated** | ratio | [0, 0.25) -> 1, [0.25, 0.5) -> 3, [0.5, 0.75) -> 7, [0.75, 1.0) -> 10 | Progressive ratio scoring (e.g., cancel ratios, concentration metrics) |
| **ratio_binary** | ratio | [0, 0.5) -> 0, [0.5, 1.0) -> 10 | Simple pass/fail ratio check -- below 50% is clean, above is flagged |
| **percentage_standard** | percentage | [0, 5) -> 1, [5, 15) -> 3, [15, 30) -> 7, [30, inf) -> 10 | Price change percentages, deviation metrics |
| **count_high** | count | [0, 10) -> 1, [10, 50) -> 3, [50, 100) -> 7, [100, inf) -> 10 | High-frequency event counting (e.g., order amendments) |
| **count_low** | count | [0, 2) -> 0, [3, 5) -> 3, [5, 10) -> 7, [10, inf) -> 10 | Low-frequency event counting (e.g., cancellation clusters) |

**Why different asset classes need different score matrices:**

- **Equity**: High baseline volume, tight spreads, frequent trading. A $50,000 trade is routine; thresholds must be higher to avoid noise.
- **FX**: Extremely high baseline volume (trillions daily). The `volume_fx` template starts at $100,000 -- ten times the equity floor -- because anything below that is invisible in FX markets.
- **Fixed Income**: Lower trading frequency, larger individual trade sizes, wider spreads. Lower thresholds are appropriate because trading events themselves are rarer.
- **Commodity**: Moderate volumes with seasonal spikes. Standard thresholds work, but calendar-aware adjustments may be needed.

### Actual Score Step Settings in Use

The platform currently defines 5 score step settings used across 5 detection models:

**`large_activity_score_steps`** -- Notional value scoring
```
Default:          [0, 10K) -> 0     [10K, 100K) -> 3    [100K, 500K) -> 7    [500K, inf) -> 10
Equity override:  [0, 25K) -> 0     [25K, 100K) -> 3    [100K, 500K) -> 7    [500K, inf) -> 10
```
Used by: Wash Trading (Full Day), Wash Trading (Intraday), Market Price Ramping, Insider Dealing, Spoofing/Layering

**`quantity_match_score_steps`** -- Buy/sell quantity symmetry
```
Default:  [0, 0.5) -> 0    [0.5, 0.8) -> 3    [0.8, 0.95) -> 7    [0.95, inf) -> 10
```
Used by: Wash Trading (Full Day), Wash Trading (Intraday)

**`vwap_proximity_score_steps`** -- Price proximity to VWAP (inverse scoring)
```
Default:  [0, 0.005) -> 10    [0.005, 0.01) -> 7    [0.01, 0.02) -> 3    [0.02, inf) -> 0
```
Used by: Wash Trading (Full Day), Wash Trading (Intraday)
Note: This is an *inverse* scale -- closer to VWAP (lower proximity value) yields a *higher* score, because wash trades are characterized by buying and selling at nearly identical prices.

**`same_side_pct_score_steps`** -- Directional concentration
```
Default:  [0, 0.75) -> 0    [0.75, 0.85) -> 3    [0.85, 0.95) -> 7    [0.95, inf) -> 10
```
Used by: Market Price Ramping

**`market_event_score_steps`** -- Price change around material events
```
Default:  [0, 1.5) -> 0    [1.5, 3.0) -> 3    [3.0, 5.0) -> 7    [5.0, inf) -> 10
```
Used by: Insider Dealing

---

## 3. MUST_PASS + OPTIONAL Logic

The detection engine uses a two-tier evaluation system that separates **gate conditions** (prerequisites) from **scored signals** (evidence accumulation). This design is intentionally simple and should be preserved as-is.

### Strictness Levels

Each calculation in a detection model is assigned a strictness level:

| Strictness | Role | Has Score Steps? | Behavior |
|------------|------|------------------|----------|
| **MUST_PASS** | Gate / prerequisite | Sometimes | If the candidate row is present in query results, the gate passes. When score steps are present, the score contributes to the accumulated total. |
| **OPTIONAL** | Scored evidence | Always | The computed value is mapped to a score via score steps. `threshold_passed` is true when score > 0. |

### Gate Calculations (MUST_PASS)

Gate calculations enforce structural prerequisites -- conditions that *must* be true before scoring begins. They answer the question: "Is there even a pattern worth evaluating?"

Examples of gate conditions across the 5 detection models:

| Model | Gate Calculation | What It Checks |
|-------|-----------------|----------------|
| Market Price Ramping | `trend_detection` | A price trend must exist (up or down) |
| Spoofing/Layering | `cancel_pattern` | At least 3 order cancellations must be present |
| Wash Trading | `large_trading_activity` | Trading activity must exceed the volume threshold |
| Insider Dealing | `market_event_detection` | A significant market event must have occurred |

Gate calculations with no `score_steps_setting` (e.g., `trend_detection`, `cancel_pattern`) auto-pass when the candidate row is present in the query results. The query itself pre-filters for the required condition (`WHERE tw.trend_type IS NOT NULL`, `WHERE cp.cancel_count >= 3`). Gate calculations that *do* have `score_steps_setting` (e.g., `large_trading_activity` in wash trading, `market_event_detection` in insider dealing) both gate *and* contribute a score.

### Scored Calculations (OPTIONAL)

Scored calculations accumulate evidence. Each one independently maps its computed value to a graduated score, and these scores are summed into the `accumulated_score`. A scored calculation "passes" when its score is greater than zero (i.e., the value fell into a non-zero scoring range).

### Trigger Paths

After all calculations are evaluated, the engine determines the trigger path:

```
must_pass_ok = ALL MUST_PASS calculations passed
all_passed   = ALL calculations (MUST_PASS + OPTIONAL) passed
score_ok     = accumulated_score >= score_threshold

trigger_path:
  if all_passed      -> "all_passed"
  elif score_ok      -> "score_based"
  else               -> "none"

alert_fired = must_pass_ok AND (all_passed OR score_ok)
```

This yields three possible outcomes:

| Trigger Path | Meaning | Alert Fires? |
|--------------|---------|--------------|
| `all_passed` | Every calculation passed its threshold/range check | Yes (if must_pass_ok) |
| `score_based` | Some calculations did not individually pass, but the accumulated score exceeds the threshold | Yes (if must_pass_ok) |
| `none` | Neither all_passed nor score_ok | No |

**Why this design is elegant:**

1. **Gate logic prevents noise.** If there is no trend, no cancellation pattern, or no large trading activity, no alert fires -- regardless of how high the remaining scores might be.
2. **Score accumulation captures partial signals.** A candidate might not pass every individual calculation, but the combined weight of multiple moderate signals can still trigger an alert. This reflects how real-world manipulation often involves several weak-but-correlated indicators.
3. **The formula is deterministic and auditable.** `alert_fired = must_pass_ok AND (all_passed OR score_ok)` -- a single boolean expression that compliance can verify.

---

## 4. End-to-End Alert Generation Flow

The following numbered steps describe the complete path from detection model definition to fired alert:

```
 1. Load Model Definition
        |
        v
 2. Execute Detection Query
    (SQL joins calc tables + entity tables, applies WHERE filters)
        |
        v
 3. For each candidate row:
    +---------------------------------------------------+
    | a. Extract entity context from context_fields      |
    |    (product_id, account_id, asset_class, ...)     |
    |                                                    |
    | b. Resolve score threshold for this context        |
    |    (settings resolver: model.score_threshold_setting)|
    |                                                    |
    | c. For each ModelCalculation:                       |
    |    +----------------------------------------------+|
    |    | i.   Read computed value from query row        ||
    |    |      (using mc.value_field as column name)     ||
    |    |                                               ||
    |    | ii.  If score_steps_setting exists:            ||
    |    |      - Load setting definition                ||
    |    |      - Resolve via entity context              ||
    |    |        (may select asset-class override)       ||
    |    |      - Parse score steps from resolved value   ||
    |    |      - Map computed value to score             ||
    |    |      - Record matched step for trace           ||
    |    |      - threshold_passed = (score > 0)          ||
    |    |                                               ||
    |    | iii. If no score_steps_setting:                ||
    |    |      - Gate calc: threshold_passed = true      ||
    |    |        (query pre-filtered this row)           ||
    |    |      - score = 0                              ||
    |    |                                               ||
    |    | iv.  Accumulate score                         ||
    |    | v.   Record CalculationScore + traces          ||
    |    +----------------------------------------------+|
    |                                                    |
    | d. Determine trigger path                          |
    |    must_pass_ok = all MUST_PASS calcs passed       |
    |    all_passed   = all calcs passed                 |
    |    score_ok     = accumulated >= threshold         |
    |                                                    |
    | e. Fire alert if:                                  |
    |    must_pass_ok AND (all_passed OR score_ok)       |
    +---------------------------------------------------+
        |
        v
 4. Return AlertTrace with full audit trail
```

### ASCII Flow Diagram

```
                          +-------------------------+
                          |   Detection Model JSON  |
                          |   (wash_full_day, etc.)  |
                          +------------+------------+
                                       |
                          1. Load model definition
                                       |
                                       v
                          +-------------------------+
                          |   Execute model.query    |
                          |   (SQL against DuckDB)   |
                          |                         |
                          |   JOINs:                |
                          |   - calc_wash_detection  |
                          |   - product (for context)|
                          |   WHERE:                |
                          |   - is_wash_candidate    |
                          |   - buy_qty > 0          |
                          |   - sell_qty > 0         |
                          +------------+------------+
                                       |
                          2. Returns candidate rows
                                       |
                                       v
                          +-------------------------+
                          |   For each candidate     |
                          +------------+------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
          +--------------------+              +--------------------+
          | 3a. Build entity   |              | 3b. Resolve score  |
          |     context        |              |     threshold      |
          |                    |              |                    |
          | product_id=PRD-001 |              | Setting:           |
          | account_id=ACC-042 |              | wash_score_threshold|
          | asset_class=equity |              |                    |
          | instrument_type=   |              | Context: equity    |
          |   common_stock     |              | Resolved: 8        |
          +--------------------+              +--------------------+
                     |                                   |
                     +----------------+------------------+
                                      |
                                      v
                     +-------------------------------+
                     |  3c. Evaluate each calculation |
                     +-------------------------------+
                                      |
               +----------------------+----------------------+
               |                      |                      |
               v                      v                      v
     +-----------------+   +-----------------+   +-----------------+
     | large_trading   |   | wash_qty_match  |   | wash_vwap       |
     | _activity       |   |                 |   | _proximity      |
     | MUST_PASS       |   | OPTIONAL        |   | OPTIONAL        |
     |                 |   |                 |   |                 |
     | value: $125,000 |   | value: 0.92     |   | value: 0.004    |
     | steps: equity   |   | steps: default  |   | steps: default  |
     | score: 7        |   | score: 7        |   | score: 10       |
     | passed: YES     |   | passed: YES     |   | passed: YES     |
     +-----------------+   +-----------------+   +-----------------+
               |                      |                      |
               +----------------------+----------------------+
                                      |
                                      v
                     +-------------------------------+
                     | 3d. Determine trigger          |
                     |                               |
                     | must_pass_ok: true             |
                     | accumulated: 7+7+10 = 24       |
                     | threshold: 8                   |
                     | score_ok: 24 >= 8 -> true      |
                     | all_passed: true               |
                     | trigger_path: "all_passed"     |
                     | alert_fired: true              |
                     +-------------------------------+
                                      |
                                      v
                     +-------------------------------+
                     | 4. Generate AlertTrace         |
                     |                               |
                     | alert_id: ALT-A1B2C3D4        |
                     | model_id: wash_full_day        |
                     | entity_context: {...}          |
                     | calculation_scores: [3 entries] |
                     | accumulated_score: 24          |
                     | score_threshold: 8             |
                     | trigger_path: all_passed       |
                     | alert_fired: true              |
                     | scoring_breakdown: [...]       |
                     | settings_trace: [...]          |
                     | calculation_traces: [...]      |
                     +-------------------------------+
```

---

## 5. Score Threshold Resolution

The score threshold -- the minimum accumulated score required to generate an alert -- is itself a setting resolved through the standard settings engine. This means different entity contexts can have different alert sensitivity levels.

### How Threshold Resolution Works

Each detection model specifies a `score_threshold_setting` (e.g., `"wash_score_threshold"`). At evaluation time, the engine:

1. Loads the setting definition by ID
2. Passes the candidate's entity context to the settings resolver
3. The resolver selects the best-matching override (or falls back to the default)
4. Returns the resolved threshold as a float

From `detection_engine.py`:

```python
def _resolve_score_threshold(self, model, context):
    setting = self._metadata.load_setting(model.score_threshold_setting)
    if setting is None:
        return 0.0
    resolution = self._resolver.resolve(setting, context)
    return float(resolution.value)
```

### Score Thresholds Across Models and Asset Classes

| Model | Setting ID | Default | Equity | FX | Fixed Income | Index | Commodity |
|-------|-----------|---------|--------|-----|--------------|-------|-----------|
| Wash Trading | `wash_score_threshold` | 10 | **8** | **12** | **8** | **7** | 10 (default) |
| Market Price Ramping | `mpr_score_threshold` | 18 | **16** | 18 (default) | **7** | **6** | **14** |
| Insider Dealing | `insider_score_threshold` | 10 | 10 (default) | 10 (default) | 10 (default) | 10 (default) | 10 (default) |
| Spoofing/Layering | `spoofing_score_threshold` | 12 | **10** | 12 (default) | **7** | **6** | 12 (default) |

**Design rationale for per-asset-class thresholds:**

- **Equity (lower thresholds)**: Equity markets are heavily monitored by regulators. MAR, MiFID II, and SEC all impose specific equity surveillance requirements. Lower thresholds increase sensitivity.
- **FX (higher thresholds for wash trading)**: FX markets have enormous liquidity and are heavily used for hedging. Legitimate offsetting positions are common, so wash trading thresholds are raised to avoid false positives.
- **Fixed Income (lower thresholds)**: Fixed income instruments trade less frequently. When suspicious patterns do appear, they are more likely to be genuine, warranting lower thresholds.
- **Index (lowest thresholds)**: Index instruments can be used for cross-market manipulation strategies. Lower thresholds provide early warning.

---

## 6. Alert Trace Explainability

Every alert -- whether it fired or not -- carries a complete `AlertTrace` object that provides a full audit trail from raw data to alert decision. This is not optional; regulatory obligations under MAR Art. 16, MiFID II Art. 16(2), and SEC Rule 17a-4 require firms to demonstrate *why* an alert was raised (or why it was not).

### AlertTrace Structure

```
AlertTrace
  +-- alert_id               "ALT-A1B2C3D4"
  +-- model_id               "wash_full_day"
  +-- model_name              "Wash Trading -- Full Day"
  +-- timestamp               2026-03-09T14:32:17Z
  |
  +-- entity_context          Which entity combination triggered evaluation
  |   +-- product_id          "PRD-001"
  |   +-- account_id          "ACC-042"
  |   +-- asset_class          "equity"
  |   +-- instrument_type      "common_stock"
  |   +-- business_date        "2026-03-07"
  |
  +-- entity_context_source   Which query column provided each field
  |   +-- product_id          "product_id"
  |   +-- asset_class          "asset_class"   (from JOIN to product)
  |
  +-- calculation_scores[]    Per-calculation result (CalculationScore)
  |   +-- [0] calc_id          "large_trading_activity"
  |   |       computed_value   125000.0
  |   |       threshold        null
  |   |       threshold_passed true
  |   |       score            7.0
  |   |       score_step_matched {"min": 100000, "max": 500000, "score": 7}
  |   |       strictness       "MUST_PASS"
  |   +-- [1] calc_id          "wash_qty_match"
  |   |       computed_value   0.92
  |   |       score            7.0
  |   |       score_step_matched {"min": 0.8, "max": 0.95, "score": 7}
  |   |       strictness       "OPTIONAL"
  |   +-- [2] calc_id          "wash_vwap_proximity"
  |           computed_value   0.004
  |           score            10.0
  |           score_step_matched {"min": 0, "max": 0.005, "score": 10}
  |           strictness       "OPTIONAL"
  |
  +-- accumulated_score       24.0
  +-- score_threshold          8.0
  +-- trigger_path             "all_passed"
  +-- alert_fired              true
  |
  +-- calculation_traces[]    Extended per-calc trace (CalculationTraceEntry)
  |   +-- [0] calc_id          "large_trading_activity"
  |           value_field       "total_value"
  |           computed_value   125000.0
  |           threshold_setting_id  "large_activity_multiplier"
  |           score_steps_setting_id "large_activity_score_steps"
  |           score_awarded    7.0
  |           score_step_matched {"min": 100000, "max": 500000, "score": 7}
  |           passed           true
  |           strictness       "MUST_PASS"
  |
  +-- scoring_breakdown[]     Compact scoring summary
  |   +-- [0] {"calc_id": "large_trading_activity", "value_field": "total_value",
  |            "computed_value": 125000, "score": 7, "step_matched": {...}, "passed": true}
  |
  +-- settings_trace[]        Settings resolution audit (SettingsTraceEntry)
  |   +-- [0] setting_id       "large_activity_score_steps"
  |           setting_name      "Large Activity Score Steps"
  |           matched_override  {"match": {"asset_class": "equity"}, ...}
  |           resolved_value   "[{min: 0, max: 25000, score: 0}, ...]"
  |           why               "Matched override: {asset_class=equity} (priority 1)"
  |
  +-- resolved_settings       Setting ID -> value + reason lookup
  |   +-- "large_activity_score_steps": {value: [...], why: "Matched override..."}
  |
  +-- executed_sql             The full detection query that was run
  +-- sql_row_count            Number of candidate rows the query returned
  +-- calculation_trace        Raw query row data (legacy format)
      +-- query_row: {"product_id": "PRD-001", "total_value": "125000", ...}
```

### Explainability Questions This Enables

| Question | Where to Look in AlertTrace |
|----------|---------------------------|
| Why did this alert fire? | `trigger_path` + `alert_fired` + the boolean formula |
| What was the candidate's score? | `accumulated_score` vs `score_threshold` |
| Which calculation contributed most? | `scoring_breakdown` -- find the highest `score` |
| Why did equity get a different score? | `settings_trace` -- shows the matched override and `why` |
| What was the raw data? | `calculation_trace.query_row` -- the actual SQL row |
| Which score step range was matched? | `calculation_scores[n].score_step_matched` |
| What threshold setting was resolved? | `resolved_settings` -- keyed by setting ID |
| Could the alert have been avoided? | Recalculate with `score_threshold` = `accumulated_score + 1` |

### Proposed Enhancement: Match Pattern Trace

The current `AlertTrace` captures *settings resolution* traces but does not explicitly capture which match patterns drove each resolution. Adding a `match_pattern_trace` field would provide an additional layer of explainability:

```
match_pattern_trace:
  - step: "score_steps_resolution"
    setting_id: "large_activity_score_steps"
    context: {"asset_class": "equity"}
    matched_pattern: "equity_stocks"
    pattern_match: {"asset_class": "equity"}
    result: "Selected equity override (priority 1)"
  - step: "score_threshold_resolution"
    setting_id: "wash_score_threshold"
    context: {"asset_class": "equity"}
    matched_pattern: "equity_stocks"
    result: "Threshold = 8 (equity override)"
```

This would enable compliance to trace not just *which* setting value was used, but *which match pattern* caused it to be selected -- valuable for auditing pattern configurations and understanding why two similar-looking candidates received different scores.

---

## 7. Worked Example: Wash Trading Full Day

This section walks through a complete alert evaluation using the **Wash Trading -- Full Day** model with concrete values.

### Model Definition

```json
{
  "model_id": "wash_full_day",
  "name": "Wash Trading -- Full Day",
  "calculations": [
    {"calc_id": "large_trading_activity", "strictness": "MUST_PASS",
     "score_steps_setting": "large_activity_score_steps", "value_field": "total_value"},
    {"calc_id": "wash_qty_match", "strictness": "OPTIONAL",
     "score_steps_setting": "quantity_match_score_steps", "value_field": "qty_match_ratio"},
    {"calc_id": "wash_vwap_proximity", "strictness": "OPTIONAL",
     "score_steps_setting": "vwap_proximity_score_steps", "value_field": "vwap_proximity"}
  ],
  "score_threshold_setting": "wash_score_threshold",
  "context_fields": ["product_id", "account_id", "business_date", "asset_class", "instrument_type"]
}
```

### Step 1: Execute Detection Query

The model's query runs against DuckDB:

```sql
SELECT w.product_id, w.account_id, w.business_date, w.total_value,
       w.buy_value, w.sell_value, w.buy_qty, w.sell_qty,
       w.total_trades, w.same_side_pct, w.is_large,
       w.qty_match_ratio, w.vwap_buy, w.vwap_sell,
       w.vwap_spread, w.vwap_proximity, w.is_wash_candidate,
       p.asset_class, p.instrument_type
FROM calc_wash_detection w
INNER JOIN product p ON w.product_id = p.product_id
WHERE w.is_wash_candidate = TRUE
  AND w.buy_qty > 0
  AND w.sell_qty > 0
```

Among the returned rows, one candidate has:

| Column | Value |
|--------|-------|
| product_id | PRD-001 |
| account_id | ACC-042 |
| business_date | 2026-03-07 |
| total_value | 125,000 |
| buy_value | 63,200 |
| sell_value | 61,800 |
| buy_qty | 4,500 |
| sell_qty | 4,150 |
| qty_match_ratio | 0.9222 |
| vwap_buy | 14.0444 |
| vwap_sell | 14.0904 |
| vwap_proximity | 0.0033 |
| asset_class | equity |
| instrument_type | common_stock |

### Step 2: Build Entity Context

The engine extracts context fields from the row:

```python
entity_context = {
    "product_id": "PRD-001",
    "account_id": "ACC-042",
    "business_date": "2026-03-07",
    "asset_class": "equity",
    "instrument_type": "common_stock"
}
```

### Step 3: Resolve Score Threshold

Setting: `wash_score_threshold`

```json
{
  "setting_id": "wash_score_threshold",
  "default": 10,
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 8, "priority": 1},
    {"match": {"asset_class": "fx"}, "value": 12, "priority": 1},
    {"match": {"asset_class": "fixed_income"}, "value": 8, "priority": 1},
    {"match": {"asset_class": "index"}, "value": 7, "priority": 1}
  ]
}
```

Context has `asset_class=equity`. The hierarchy strategy matches the equity override.

**Resolved threshold: 8**

Trace: `"Matched override: {asset_class=equity} (priority 1)"`

### Step 4: Evaluate Calculation 1 -- `large_trading_activity` (MUST_PASS)

**Computed value**: `total_value = 125,000` (from query row)

**Score steps resolution**: Setting `large_activity_score_steps` with context `{asset_class: equity}`:

```
Equity override selected (priority 1):
  [0, 25,000)     -> score 0    "Normal equity volume"
  [25,000, 100,000)  -> score 3    "Elevated"
  [100,000, 500,000) -> score 7    "Significant"
  [500,000, inf)     -> score 10   "Extreme"
```

Range lookup: `100,000 <= 125,000 < 500,000` --> **score = 7**

```
threshold_passed = (score > 0) = true
score_step_matched = {"min": 100000, "max": 500000, "score": 7}
```

Note: If the default (non-equity) score steps had been used instead, the value $125,000 would still fall in the [100K, 500K) range with score 7. But for a value of $15,000, the result *would* differ: default gives score 3 (falls in [10K, 100K)) while equity gives score 0 (falls in [0, 25K)).

### Step 5: Evaluate Calculation 2 -- `wash_qty_match` (OPTIONAL)

**Computed value**: `qty_match_ratio = 0.9222` (from query row)

**Score steps resolution**: Setting `quantity_match_score_steps` with context `{asset_class: equity}`:

```
No equity override exists. Using default:
  [0, 0.5)      -> score 0     "Low match -- normal mixed trading"
  [0.5, 0.8)    -> score 3     "Moderate match"
  [0.8, 0.95)   -> score 7     "High match -- suspicious symmetry"
  [0.95, inf)   -> score 10    "Near-perfect match -- strong wash signal"
```

Range lookup: `0.8 <= 0.9222 < 0.95` --> **score = 7**

```
threshold_passed = (score > 0) = true
score_step_matched = {"min": 0.8, "max": 0.95, "score": 7}
```

Interpretation: The account bought 4,500 units and sold 4,150 units of the same product on the same day. The ratio min(4150, 4500)/max(4150, 4500) = 0.9222, meaning 92% of the volume was symmetrically offset. This is suspicious but not a perfect match (which would be 1.0).

### Step 6: Evaluate Calculation 3 -- `wash_vwap_proximity` (OPTIONAL)

**Computed value**: `vwap_proximity = 0.0033` (from query row)

**Score steps resolution**: Setting `vwap_proximity_score_steps` with context `{asset_class: equity}`:

```
No equity override exists. Using default (INVERSE scale):
  [0, 0.005)    -> score 10    "Extremely close to VWAP -- strong wash signal"
  [0.005, 0.01) -> score 7     "Very close"
  [0.01, 0.02)  -> score 3     "Moderately close"
  [0.02, inf)   -> score 0     "Far from VWAP -- legitimate spread"
```

Range lookup: `0 <= 0.0033 < 0.005` --> **score = 10**

```
threshold_passed = (score > 0) = true
score_step_matched = {"min": 0, "max": 0.005, "score": 10}
```

Interpretation: The buy VWAP ($14.0444) and sell VWAP ($14.0904) are separated by only 0.33% of the midpoint. The account bought and sold at nearly identical prices, a hallmark of wash trading.

### Step 7: Accumulate Scores

```
Calculation                  Strictness   Score   Passed
-----------------------------------------------------------
large_trading_activity       MUST_PASS      7      true
wash_qty_match               OPTIONAL       7      true
wash_vwap_proximity          OPTIONAL      10      true
-----------------------------------------------------------
Accumulated Score:                         24
Score Threshold (equity):                   8
```

### Step 8: Determine Trigger

```python
must_pass_ok = True    # large_trading_activity passed
all_passed   = True    # all 3 calculations passed
score_ok     = True    # 24 >= 8

trigger_path = "all_passed"   # all_passed takes priority in the if/elif
alert_fired  = True           # must_pass_ok AND (all_passed OR score_ok)
```

### Step 9: Generate AlertTrace

The engine constructs the complete `AlertTrace`:

```
AlertTrace:
  alert_id:          ALT-A1B2C3D4
  model_id:          wash_full_day
  model_name:        Wash Trading -- Full Day
  entity_context:    {product_id: PRD-001, account_id: ACC-042,
                      asset_class: equity, instrument_type: common_stock,
                      business_date: 2026-03-07}
  accumulated_score: 24.0
  score_threshold:   8.0
  trigger_path:      all_passed
  alert_fired:       true

  calculation_scores:
    [0] large_trading_activity  value=125000  score=7   passed=true  MUST_PASS
    [1] wash_qty_match          value=0.9222  score=7   passed=true  OPTIONAL
    [2] wash_vwap_proximity     value=0.0033  score=10  passed=true  OPTIONAL

  settings_trace:
    [0] large_activity_score_steps -> equity override
        why: "Matched override: {asset_class=equity} (priority 1)"
    [1] quantity_match_score_steps -> default
        why: "No matching override; using default value"
    [2] vwap_proximity_score_steps -> default
        why: "No matching override; using default value"
```

### What If the Context Were Different?

To illustrate context-aware scoring, consider the same calculation values evaluated with `asset_class=fx`:

| Calculation | Value | Equity Score | FX Score | Difference |
|-------------|-------|-------------|----------|------------|
| large_trading_activity | 125,000 | 7 (equity steps) | 7 (default steps) | Same (both in [100K, 500K)) |
| wash_qty_match | 0.9222 | 7 (default) | 7 (default) | Same (no FX override) |
| wash_vwap_proximity | 0.0033 | 10 (default) | 10 (default) | Same (no FX override) |
| **Accumulated** | | **24** | **24** | |
| **Threshold** | | **8** (equity) | **12** (FX) | **FX threshold is higher** |
| **Score excess** | | 24 - 8 = **16** | 24 - 12 = **12** | FX has narrower margin |

In this case, both contexts would fire an alert (24 exceeds both 8 and 12). But consider a candidate with accumulated score of 10: it would fire for equity (10 >= 8) but *not* for FX (10 < 12). The FX threshold is higher because legitimate offsetting positions are more common in foreign exchange -- hedging creates the same quantity-match and price-proximity patterns that wash trading does.

### Score-Based Trigger Path Example

Consider a variation where `wash_qty_match` has a lower value:

```
Calculation                  Strictness   Value    Score   Passed
--------------------------------------------------------------------
large_trading_activity       MUST_PASS    125,000    7      true
wash_qty_match               OPTIONAL     0.45       0      false   <-- below 0.5
wash_vwap_proximity          OPTIONAL     0.004     10      true
--------------------------------------------------------------------
Accumulated Score:                                  17
Score Threshold (equity):                            8
```

```python
must_pass_ok = True    # MUST_PASS calc passed
all_passed   = False   # wash_qty_match did NOT pass (score = 0)
score_ok     = True    # 17 >= 8

trigger_path = "score_based"  # not all_passed, but score_ok
alert_fired  = True           # must_pass_ok AND (False OR True) = True
```

The alert still fires via the `score_based` path. Even though the quantity match ratio is low (only 45% of volume was offsetting), the combination of significant trading value (score 7) and extremely close VWAP (score 10) provides enough accumulated evidence. This is the strength of graduated scoring: individual weak signals can combine to produce a compelling composite indicator.

---

## Summary

| Component | Design Principle | Current Implementation |
|-----------|-----------------|----------------------|
| Score resolution | Two-axis: context selects the matrix, magnitude selects the score | Settings resolver with hierarchy strategy |
| Score steps | Contiguous ranges with graduated 0/3/7/10 scoring | 5 score step settings, 7 reusable templates |
| Gate logic | MUST_PASS calcs are prerequisites; OPTIONAL calcs accumulate evidence | `strictness` enum on `ModelCalculation` |
| Trigger formula | `must_pass_ok AND (all_passed OR score_ok)` | `_determine_trigger()` in `detection_engine.py` |
| Threshold resolution | Score threshold is a setting, resolved per entity context | `_resolve_score_threshold()` with per-asset-class overrides |
| Explainability | Every alert carries a complete `AlertTrace` with full audit trail | `AlertTrace` Pydantic model with 15 fields |
| Context awareness | Same value, different score based on entity attributes | Settings override resolution via match patterns |

The scoring and alerting pipeline is the most operationally critical part of the platform. It transforms raw calculation outputs into actionable compliance signals while preserving complete traceability. The design is deliberately simple -- a single boolean formula, a small set of strictness levels, and graduated score steps -- because complexity in alert logic is a compliance risk. Every decision the engine makes is recorded, every score is traceable to a specific step range, and every threshold is auditable back to its configuration source.
