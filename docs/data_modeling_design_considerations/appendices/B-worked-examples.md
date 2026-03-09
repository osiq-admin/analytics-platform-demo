# Appendix B: Worked Examples -- End-to-End Detection Scenarios

Six complete end-to-end scenarios demonstrating the full detection pipeline from raw data
through entity resolution, calculation execution, scoring, and alert generation. Each
example uses actual platform entities, settings, and score templates.

---

## Table of Contents

1. [Example 1: Wash Trading -- Equity (AAPL, ACC-101)](#example-1-wash-trading----equity)
2. [Example 2: Market Price Ramping -- Commodity (GC_FUT)](#example-2-market-price-ramping----commodity)
3. [Example 3: Spoofing -- Equity on Specific Venue (BAC, ACC-132, XNYS)](#example-3-spoofing----equity-on-specific-venue)
4. [Example 4: Insider Dealing -- Account Level (ACC-122)](#example-4-insider-dealing----account-level)
5. [Example 5: Custom Model -- Cross-Venue Arbitrage (Hypothetical)](#example-5-custom-model----cross-venue-arbitrage)
6. [Example 6: Entity Key Override -- AAPL with Custom Thresholds](#example-6-entity-key-override----aapl-with-custom-thresholds)

---

## Example 1: Wash Trading -- Equity

**Model**: `wash_full_day` -- Wash Trading -- Full Day
**Product**: AAPL (Apple Inc., equity, common_stock, XNYS)
**Account**: ACC-101 (Ironwood Market Services, market_maker, US, risk_rating=LOW)

This example walks through every step of the wash trading detection pipeline for a
market-maker account that buys and sells AAPL on the same business day at nearly
identical prices.

### Step 1: Detection Level Resolution

The `wash_full_day` model defines its detection granularity as:

```json
"granularity": ["product_id", "account_id"]
```

This means the engine evaluates each unique (product_id, account_id) pair independently.
For this example, the detection instance is:

```
Detection grain: product_id=AAPL + account_id=ACC-101
Pattern type:    detection_level (two-entity composite key)
```

### Step 2: Classification

The `wash_full_day` model has no classification filter. Its query fetches from
`calc_wash_detection` joined to `product` with filters:

```sql
WHERE w.is_wash_candidate = TRUE
  AND w.buy_qty > 0
  AND w.sell_qty > 0
```

All products across all asset classes are eligible. No product-level or account-level
pre-filtering occurs before the calculations run.

### Step 3: Entity Context Assembly

The detection engine extracts entity context from the query result row using the
model's `context_fields`:

```json
"context_fields": ["product_id", "account_id", "business_date",
                    "asset_class", "instrument_type"]
```

For AAPL + ACC-101, the assembled context is:

```
+-------------------+------------------+
| Context Field     | Resolved Value   |
+-------------------+------------------+
| product_id        | AAPL             |
| account_id        | ACC-101          |
| business_date     | 2024-01-15       |
| asset_class       | equity           |
| instrument_type   | common_stock     |
+-------------------+------------------+
```

This context dictionary drives every subsequent setting resolution.

### Step 4: Time Window Resolution

The model's `time_window` is `business_date`. The `business_date_window` calculation
resolves the cutoff time via the settings engine:

**Setting**: `business_date_cutoff`

```
Resolution context: { asset_class: "equity", exchange_mic: "XNYS" }

Overrides evaluated:
  1. { exchange_mic: "XNYS" } -> value: "21:00" (priority 1) -- MATCH
  2. { exchange_mic: "XLON" } -> value: "16:30" (priority 1) -- no match
  3. { asset_class: "fx" }    -> value: "21:00" (priority 1) -- no match

Result: cutoff_time = "21:00" (UTC)
Why:    Matched override: {exchange_mic=XNYS} (priority 1)
```

The business date window for XNYS on 2024-01-15:

```
+-----------------+----------------------------+
| Field           | Value                      |
+-----------------+----------------------------+
| business_date   | 2024-01-15                 |
| window_start    | 2024-01-15 09:30:00 ET     |
| window_end      | 2024-01-15 16:00:00 ET     |
| cutoff_time     | 21:00 UTC (16:00 ET)       |
+-----------------+----------------------------+
```

### Step 5: Calculation Instances

The `wash_full_day` model's calculation DAG executes in topological order across
four layers. Below is the complete chain for AAPL + ACC-101 on 2024-01-15:

```
Layer 1: TRANSACTION
  |
  +-- value_calc
  |     Input:  execution(AAPL, ACC-101) JOIN product(AAPL)
  |     Logic:  price * quantity (common_stock -> no contract multiplier)
  |     Params: none
  |
  +-- adjusted_direction
        Input:  calc_value rows for AAPL
        Logic:  common_stock -> original side preserved
        Params: none

Layer 2: TIME_WINDOW
  |
  +-- business_date_window
        Input:  calc_adjusted_direction rows
        Params: cutoff_time = "21:00" (resolved: XNYS override)
        Logic:  execution_time <= 21:00 -> same business_date

Layer 3: AGGREGATION
  |
  +-- trading_activity_aggregation
  |     Input:  calc_business_date_window grouped by (product_id, account_id, business_date)
  |     Params: none
  |     Output: buy_value, sell_value, net_value, buy_qty, sell_qty, same_side_pct
  |
  +-- vwap_calc
        Input:  calc_business_date_window grouped by (product_id, account_id, business_date)
        Params: none
        Output: vwap_buy, vwap_sell, vwap_spread, vwap_proximity

Layer 4: DERIVED
  |
  +-- large_trading_activity
  |     Input:  calc_trading_activity
  |     Params: activity_multiplier = 2.5 (resolved: equity override)
  |     Output: total_value, is_large, threshold_used
  |
  +-- wash_detection
        Input:  calc_large_trading_activity JOIN calc_vwap
        Params: qty_threshold = 0.5 (literal), vwap_threshold = 0.015 (resolved: equity)
        Output: qty_match_ratio, vwap_proximity, is_wash_candidate
```

**Setting resolutions for calculation parameters**:

```
large_activity_multiplier:
  Context:  { asset_class: "equity" }
  Override: { asset_class: "equity" } -> 2.5 (priority 1) -- MATCH
  Result:   2.5

wash_vwap_threshold:
  Context:  { asset_class: "equity", exchange_mic: "XNYS" }
  Override: { asset_class: "equity" } -> 0.015 (priority 1)
  Override: { asset_class: "equity", exchange_mic: "XNYS" } -> 0.012 (priority 2) -- MATCH (more specific)
  Result:   0.012

cancel_count_threshold:
  Context:  { asset_class: "equity" }
  Override: { asset_class: "equity" } -> 3 (priority 1) -- MATCH
  Result:   3
```

### Step 6: Calculation Results

The raw execution data for AAPL + ACC-101 on 2024-01-15:

```
+------------+------+--------+-----+---------------+---------------+
| exec_id    | side | price  | qty | exec_date     | exec_time     |
+------------+------+--------+-----+---------------+---------------+
| EXE-000669 | BUY  | 185.00 | 500 | 2024-01-15    | 09:35:12.531  |
| EXE-000670 | BUY  | 185.05 | 300 | 2024-01-15    | 10:15:44.466  |
| EXE-000671 | SELL | 185.02 | 480 | 2024-01-15    | 11:30:22.278  |
| EXE-000672 | SELL | 184.98 | 310 | 2024-01-15    | 14:00:55.468  |
+------------+------+--------+-----+---------------+---------------+
```

**value_calc** output:

```
EXE-000669: 185.00 * 500 = 92,500.00
EXE-000670: 185.05 * 300 = 55,515.00
EXE-000671: 185.02 * 480 = 88,809.60
EXE-000672: 184.98 * 310 = 57,343.80
```

**adjusted_direction**: common_stock -> sides preserved as-is.

**trading_activity_aggregation**:

```
+-------------+---------+---------+---------+---------+---------+--------+---------------+
| product_id  | acct_id | bus_dt  | buy_val | sell_val| buy_qty | sell_q | same_side_pct |
+-------------+---------+---------+---------+---------+---------+--------+---------------+
| AAPL        | ACC-101 | 01-15   | 148,015 | 146,153 | 800     | 790    | 0.5           |
+-------------+---------+---------+---------+---------+---------+--------+---------------+
  buy_value  = 92,500.00 + 55,515.00 = 148,015.00
  sell_value = 88,809.60 + 57,343.80 = 146,153.40
  total_value = 294,168.40
  buy_qty    = 500 + 300 = 800
  sell_qty   = 480 + 310 = 790
  total_trades = 4
  same_side_pct = max(2, 2) / 4 = 0.50
```

**vwap_calc**:

```
vwap_buy   = (185.00*500 + 185.05*300) / (500+300) = 148,015.00 / 800 = 185.0188
vwap_sell  = (185.02*480 + 184.98*310) / (480+310) = 146,153.40 / 790 = 185.0043
vwap_spread = |185.0188 - 185.0043| = 0.0145
vwap_proximity = 0.0145 / ((185.0188 + 185.0043) / 2) = 0.0145 / 185.0116 = 0.0000784
```

**large_trading_activity** (multiplier=2.5):

```
total_value = 294,168.40
avg_daily_value (AAPL, 30-day avg) ~ 50,000 (estimated from data volume)
threshold = 50,000 * 2.5 = 125,000
is_large = 294,168.40 > 125,000 -> TRUE
```

**wash_detection** (vwap_threshold=0.012):

```
qty_match_ratio = min(800, 790) / max(800, 790) = 790/800 = 0.9875
vwap_proximity  = 0.0000784
is_wash_candidate = (buy_qty>0 AND sell_qty>0)
                    AND qty_match_ratio > 0.5
                    AND vwap_proximity < 0.012
                  = TRUE AND TRUE AND TRUE -> TRUE
```

### Step 7: MUST_PASS Evaluation

The model defines three calculations with these strictness levels:

```
+--------------------------+-----------+---------+--------+
| Calculation              | Strictness| Value   | Passed |
+--------------------------+-----------+---------+--------+
| large_trading_activity   | MUST_PASS | 294,168 | YES    |
| wash_qty_match           | OPTIONAL  | 0.9875  | YES    |
| wash_vwap_proximity      | OPTIONAL  | 0.00008 | YES    |
+--------------------------+-----------+---------+--------+
```

The MUST_PASS gate (`large_trading_activity`) passed -- the total value exceeded
the large activity threshold. The pipeline continues to scoring.

### Step 8: Scoring

Each scored calculation resolves its score_steps_setting against the entity context
and evaluates the computed value against the graduated tiers:

**large_activity_score_steps** (equity override applied):

```
Context: { asset_class: "equity" }
Resolved: equity override (priority 1)

Steps:    [0, 25K) -> 0  |  [25K, 100K) -> 3  |  [100K, 500K) -> 7  |  [500K, inf) -> 10
Value:    294,168.40
Match:    [100,000 .. 500,000) -> score = 7
```

**quantity_match_score_steps** (no override -- default):

```
Steps:    [0, 0.5) -> 0  |  [0.5, 0.8) -> 3  |  [0.8, 0.95) -> 7  |  [0.95, inf) -> 10
Value:    0.9875
Match:    [0.95 .. inf) -> score = 10
```

**vwap_proximity_score_steps** (no override -- default; note: inverse scale):

```
Steps:    [0, 0.005) -> 10  |  [0.005, 0.01) -> 7  |  [0.01, 0.02) -> 3  |  [0.02, inf) -> 0
Value:    0.0000784
Match:    [0 .. 0.005) -> score = 10
```

### Step 9: Accumulated Score

```
large_trading_activity:    7
wash_qty_match:           10
wash_vwap_proximity:      10
                         ----
Accumulated score:        27
```

### Step 10: Threshold Resolution

**Setting**: `wash_score_threshold`

```
Context: { asset_class: "equity" }
Override: { asset_class: "equity" } -> 8 (priority 1) -- MATCH
Result:  8
```

### Step 11: Decision

```
Accumulated score:  27
Score threshold:     8
MUST_PASS gates:    all passed (large_trading_activity)

Decision logic:
  must_pass_ok  = TRUE (all MUST_PASS calcs passed)
  all_passed    = TRUE (all calcs passed)
  score_ok      = TRUE (27 >= 8)
  trigger_path  = "all_passed"
  alert_fired   = TRUE

Result: ALERT FIRED
```

### Step 12: Alert Trace

```json
{
  "alert_id": "ALT-A1B2C3D4",
  "model_id": "wash_full_day",
  "model_name": "Wash Trading -- Full Day",
  "timestamp": "2024-01-15T18:46:29.604155",
  "entity_context": {
    "product_id": "AAPL",
    "account_id": "ACC-101",
    "business_date": "2024-01-15",
    "asset_class": "equity",
    "instrument_type": "common_stock"
  },
  "calculation_scores": [
    {
      "calc_id": "large_trading_activity",
      "computed_value": 294168.40,
      "threshold_passed": true,
      "score": 7.0,
      "score_step_matched": { "min": 100000.0, "max": 500000.0, "score": 7.0 },
      "strictness": "MUST_PASS"
    },
    {
      "calc_id": "wash_qty_match",
      "computed_value": 0.9875,
      "threshold_passed": true,
      "score": 10.0,
      "score_step_matched": { "min": 0.95, "max": null, "score": 10.0 },
      "strictness": "OPTIONAL"
    },
    {
      "calc_id": "wash_vwap_proximity",
      "computed_value": 0.0000784,
      "threshold_passed": true,
      "score": 10.0,
      "score_step_matched": { "min": 0.0, "max": 0.005, "score": 10.0 },
      "strictness": "OPTIONAL"
    }
  ],
  "accumulated_score": 27.0,
  "score_threshold": 8.0,
  "trigger_path": "all_passed",
  "alert_fired": true,
  "resolved_settings": {
    "large_activity_score_steps": {
      "value": "[{0..25000: 0}, {25000..100000: 3}, {100000..500000: 7}, {500000+: 10}]",
      "why": "Matched override: {asset_class=equity} (priority 1)"
    },
    "quantity_match_score_steps": {
      "value": "[{0..0.5: 0}, {0.5..0.8: 3}, {0.8..0.95: 7}, {0.95+: 10}]",
      "why": "No matching override; using default value"
    },
    "vwap_proximity_score_steps": {
      "value": "[{0..0.005: 10}, {0.005..0.01: 7}, {0.01..0.02: 3}, {0.02+: 0}]",
      "why": "No matching override; using default value"
    }
  },
  "calculation_trace": {
    "query_row": {
      "product_id": "AAPL",
      "account_id": "ACC-101",
      "business_date": "2024-01-15",
      "total_value": "294168.40",
      "buy_value": "148015.00",
      "sell_value": "146153.40",
      "buy_qty": "800",
      "sell_qty": "790",
      "total_trades": "4",
      "same_side_pct": "0.50",
      "is_large": "True",
      "qty_match_ratio": "0.9875",
      "vwap_buy": "185.0188",
      "vwap_sell": "185.0043",
      "vwap_spread": "0.0145",
      "vwap_proximity": "0.0000784",
      "is_wash_candidate": "True",
      "asset_class": "equity",
      "instrument_type": "common_stock"
    }
  },
  "settings_trace": [
    {
      "setting_id": "large_activity_score_steps",
      "why": "Matched override: {asset_class=equity} (priority 1)"
    },
    {
      "setting_id": "quantity_match_score_steps",
      "why": "No matching override; using default value"
    },
    {
      "setting_id": "vwap_proximity_score_steps",
      "why": "No matching override; using default value"
    }
  ]
}
```

### Pipeline Flow Diagram

```
  execution (AAPL, ACC-101, 2024-01-15)
       |
  +----+----+
  |         |
  v         v
value_calc  product (AAPL: equity, common_stock)
  |
  v
adjusted_direction (common_stock -> sides preserved)
  |
  v
business_date_window (cutoff=21:00 UTC via XNYS override)
  |
  +-------------------+
  |                   |
  v                   v
trading_activity    vwap_calc
(buy=148K,sell=146K)  (proximity=0.00008)
  |                   |
  v                   |
large_trading_activity|
(294K > 125K = LARGE) |
  |                   |
  +--------+----------+
           |
           v
    wash_detection
    (qty_match=0.99, vwap_prox=0.00008, candidate=TRUE)
           |
           v
    Detection Engine evaluates wash_full_day model
           |
           v
    Score: 7 + 10 + 10 = 27 >= threshold 8
           |
           v
    ALERT FIRED (ALT-A1B2C3D4)
```

---

## Example 2: Market Price Ramping -- Commodity

**Model**: `market_price_ramping` -- Market Price Ramping (MPR)
**Product**: GC_FUT (Gold Future, commodity, future, XCME)
**Detection level**: product_id + account_id (but product is the primary driver)

This example shows how a commodity future differs from the equity wash trading
scenario above: different score thresholds, different trend sensitivity, and
the trend_window time window instead of business_date.

### Step 1: Detection Level Resolution

```json
"granularity": ["product_id", "account_id"]
```

Although the model uses both product_id and account_id, the key difference from
wash trading is that MPR is driven by a **price trend** (the MUST_PASS gate),
making the product the primary entity. The account is secondary -- it identifies
*who* traded into the trend.

```
Detection grain: product_id=GC_FUT + account_id=ACC-016
Primary entity:  product (trend must exist for this product)
Secondary:       account (who traded aggressively into the trend)
```

### Step 2: Entity Context

```
+-------------------+------------------+
| Context Field     | Resolved Value   |
+-------------------+------------------+
| product_id        | GC_FUT           |
| account_id        | ACC-016          |
| business_date     | 2024-01-18       |
| asset_class       | commodity        |
| instrument_type   | future           |
| trend_type        | up               |
+-------------------+------------------+
```

Product reference data for GC_FUT:

```
product_id:     GC_FUT
name:           Gold Future
asset_class:    commodity
instrument_type:future
exchange_mic:   XCME
currency:       USD
contract_size:  100
base_price:     2050.00
```

### Step 3: Trend Window Discovery

Unlike Example 1 (business_date window), MPR uses the `trend_window` calculation --
a **complex** time window that detects price trends from intraday market data.

The trend_window calculation:

```sql
-- Simplified from calc_trend_window
WITH price_stats AS (
  SELECT product_id, trade_date,
    MIN(trade_price) AS day_low,
    MAX(trade_price) AS day_high,
    FIRST(trade_price ORDER BY trade_time) AS open_price,
    LAST(trade_price ORDER BY trade_time) AS close_price,
    STDDEV(trade_price) AS price_stddev
  FROM md_intraday
  WHERE product_id = 'GC_FUT'
  GROUP BY product_id, trade_date
)
SELECT ...
WHERE close_price > open_price + (price_stddev * $trend_multiplier)
   OR close_price < open_price - (price_stddev * $trend_multiplier)
```

**Setting resolution for trend_sensitivity**:

```
Context:  { asset_class: "commodity" }
Overrides evaluated:
  { asset_class: "equity" }        -> 2.5  -- no match
  { asset_class: "fx" }            -> 2.0  -- no match
  { asset_class: "fixed_income" }  -> 1.2  -- no match
  { asset_class: "index" }         -> 1.3  -- no match
  (no commodity override exists)

Result: trend_multiplier = 3.5 (default)
Why:    No matching override; using default value
```

This means commodity instruments use the default, higher sensitivity threshold (3.5x
standard deviation), making trend detection **less sensitive** for commodities
compared to equities (2.5x). A legitimate design choice: commodity futures are
inherently more volatile.

Detected trend for GC_FUT on 2024-01-18:

```
+----------+--------+----------+--------+--------+-----------+
| trade_dt | open   | close    | stddev | change | trend_type|
+----------+--------+----------+--------+--------+-----------+
| 01-18    | 2250.0 | 2310.5   | 15.2   | +2.69% | up        |
+----------+--------+----------+--------+--------+-----------+

trend_multiplier * stddev = 3.5 * 15.2 = 53.2
actual_change = 2310.5 - 2250.0 = 60.5 > 53.2 -> TREND DETECTED
```

### Step 4: Calculation Instances

```
trend_detection   (MUST_PASS, no score steps)
  -> value: price_change_pct = 2.69
  -> gate: present in query results = PASSED

large_trading_activity (OPTIONAL, score_steps: large_activity_score_steps)
  -> value: total_value
  -> Resolved setting: no commodity override -> default steps used:
     [0..10K: 0] [10K..100K: 3] [100K..500K: 7] [500K+: 10]

same_side_ratio (OPTIONAL, score_steps: same_side_pct_score_steps)
  -> value: same_side_pct
  -> Resolved setting: default (no overrides)
     [0..0.75: 0] [0.75..0.85: 3] [0.85..0.95: 7] [0.95+: 10]
```

### Step 5: Raw Data and Computed Values

ACC-016 executions in GC_FUT on 2024-01-18:

```
+------------+------+----------+-----+---------------+
| exec_id    | side | price    | qty | exec_time     |
+------------+------+----------+-----+---------------+
| EXE-000195 | BUY  | 2294.16  | 10  | 10:58:03.563  |
+------------+------+----------+-----+---------------+
```

Value calculation for futures: `price * contract_size * quantity`

```
value_calc: 2294.16 * 100 * 10 = 2,294,160.00
```

Trading activity aggregation:

```
buy_value  = 2,294,160.00
sell_value = 0.00
net_value  = 2,294,160.00
buy_qty    = 10
sell_qty   = 0
same_side_pct = max(1, 0) / 1 = 1.0 (100% same side -- all buys)
```

### Step 6: Scoring

```
trend_detection (MUST_PASS, no score_steps):
  computed_value = 2.69 (price_change_pct)
  Gate only -- auto-passes because row exists in query results
  score = 0 (gate calcs contribute 0 to accumulated score)

large_trading_activity (OPTIONAL):
  computed_value = 2,294,160.00
  Steps (default): [0..10K: 0] [10K..100K: 3] [100K..500K: 7] [500K+: 10]
  Match: [500,000 .. inf) -> score = 10

same_side_ratio (OPTIONAL):
  computed_value = 1.0
  Steps (default): [0..0.75: 0] [0.75..0.85: 3] [0.85..0.95: 7] [0.95+: 10]
  Match: [0.95 .. inf) -> score = 10
```

### Step 7: Accumulated Score and Threshold

```
trend_detection:          0 (gate only)
large_trading_activity:  10
same_side_ratio:         10
                        ----
Accumulated score:       20
```

**Score threshold resolution** (`mpr_score_threshold`):

```
Context: { asset_class: "commodity" }
Override: { asset_class: "commodity" } -> 14 (priority 1) -- MATCH
Result:  14
```

Compare to equity (16) and fixed_income (7) -- commodity sits in the middle.

### Step 8: Decision

```
Accumulated score:  20
Score threshold:    14
MUST_PASS gates:   all passed (trend_detection)

20 >= 14 -> alert_fired = TRUE
trigger_path = "all_passed"
```

### Key Differences from Equity Example

| Dimension                | Equity (AAPL)     | Commodity (GC_FUT)    |
|--------------------------|-------------------|-----------------------|
| Time window              | business_date     | trend_window          |
| Trend sensitivity        | 2.5x stddev       | 3.5x stddev (default) |
| Value calc               | price * qty       | price * contract_size * qty |
| Large activity threshold | default steps     | default steps         |
| Score threshold (MPR)    | 16                | 14                    |
| Contract multiplier      | none              | 100 (gold future)     |

---

## Example 3: Spoofing -- Equity on Specific Venue

**Model**: `spoofing_layering` -- Spoofing / Layering
**Product**: BAC (Bank of America, equity, common_stock, XNYS)
**Account**: ACC-132 (Northbridge Advisors, institutional, US)
**Venue**: XNYS (New York Stock Exchange)

This example demonstrates a two-entity detection grain (product + account) where the
venue is reachable through the execution entity relationship graph, and venue-specific
characteristics influence the detection.

### Step 1: Detection Level

```json
"granularity": ["product_id", "account_id"]
```

The detection instance is:

```
Detection grain: product_id=BAC + account_id=ACC-132
Time window:     cancellation_pattern
```

### Step 2: Venue Reachability Through Execution

The `venue` entity is not part of the detection grain, but it is reachable through
the entity relationship graph:

```
product(BAC) <-- execution --> venue(XNYS)
                    |
                    v
               order(status=CANCELLED)
                    |
                    v
               account(ACC-132)
```

The cancellation_pattern calculation queries the `order` entity directly, which
carries `venue_mic`:

```sql
FROM "order"
WHERE status = 'CANCELLED'
GROUP BY product_id, account_id, side, order_date
HAVING COUNT(*) >= $cancel_threshold
```

### Step 3: Entity Context

```
+-------------------+------------------+
| Context Field     | Resolved Value   |
+-------------------+------------------+
| product_id        | BAC              |
| account_id        | ACC-132          |
| business_date     | 2024-01-30       |
| pattern_side      | SELL             |
| asset_class       | equity           |
| instrument_type   | common_stock     |
+-------------------+------------------+
```

### Step 4: Cancellation Pattern Detection

**Setting**: `cancel_count_threshold`

```
Context: { asset_class: "equity" }
Override: { asset_class: "equity" } -> 3 (priority 1) -- MATCH
Result:  cancel_threshold = 3
```

Compare: the default is 5, options use 8. Equity has a lower threshold (3)
because cancelled equity orders are a stronger spoofing signal.

The cancellation_pattern calculation finds:

```
+-------------------+----------+---------+--------+---------+----------+
| product_id        | acct_id  | side    | cancel | cancel  | pattern  |
|                   |          |         | _count | _qty    | _date    |
+-------------------+----------+---------+--------+---------+----------+
| BAC               | ACC-132  | SELL    | 5      | 15,000  | 01-30    |
+-------------------+----------+---------+--------+---------+----------+

Window:
  start: 2024-01-30 10:15:02.413
  end:   2024-01-30 10:20:26.649 (+5 min buffer)

Pattern: 5 SELL-side cancellations within ~5 minutes (>= threshold of 3)
```

### Step 5: Opposite-Side Execution Check

The spoofing model then checks for executions on the **opposite** side during
the cancellation window. ACC-132 placed SELL orders (cancelled) while potentially
executing BUY orders:

```
Total value (same day, BAC, ACC-132):
  buy_value  = 169,000.00
  sell_value =  34,050.00
  total_value = 203,050.00
```

The pattern: place large SELL orders to push the price down, cancel them, then
execute BUY orders at the artificially depressed price.

### Step 6: Scoring

**cancel_pattern** (MUST_PASS, no score_steps):

```
computed_value = 5 (cancel_count)
Gate: auto-passes (row exists in query, count >= threshold)
score = 0 (gate only)
```

**opposite_side_execution** (OPTIONAL, large_activity_score_steps):

```
Context: { asset_class: "equity" }
Resolved: equity override (priority 1)
Steps: [0..25K: 0] [25K..100K: 3] [100K..500K: 7] [500K+: 10]
Value: 203,050.00
Match: [100,000 .. 500,000) -> score = 7
```

### Step 7: Accumulated Score and Threshold

```
cancel_pattern:          0 (gate only)
opposite_side_execution: 7
                        ---
Accumulated score:       7
```

**Score threshold** (`spoofing_score_threshold`):

```
Context: { asset_class: "equity" }
Override: { asset_class: "equity" } -> 10 (priority 1) -- MATCH
Result:  10
```

### Step 8: Decision

```
Accumulated score:  7
Score threshold:    10
MUST_PASS gates:   all passed (cancel_pattern)

trigger_path evaluation:
  all_passed = TRUE (both calcs passed)
  score_ok   = FALSE (7 < 10)
  -> trigger_path = "all_passed" (all calcs individually passed)

alert_fired = must_pass_ok AND (all_passed OR score_ok)
            = TRUE AND (TRUE OR FALSE)
            = TRUE

Result: ALERT FIRED (despite score < threshold, because all calcs passed)
```

**Important nuance**: The detection engine fires the alert even though the
accumulated score (7) is below the threshold (10), because all individual
calculations passed their own gates. The `trigger_path` is `"all_passed"`,
meaning the alert was triggered by universal pass rather than score threshold.

### Venue-Specific Behavior

If this same pattern occurred on a dark pool venue instead of XNYS, the thresholds
would differ. Currently, the platform does not have venue-specific setting overrides,
but the architecture supports them. A hypothetical override:

```json
{
  "match": { "asset_class": "equity", "venue_type": "dark_pool" },
  "value": 2,
  "priority": 2,
  "description": "Lower cancel threshold for dark pools -- fewer orders expected"
}
```

This would be resolved via the same hierarchy strategy, with the two-key override
winning over the single-key equity override by specificity.

---

## Example 4: Insider Dealing -- Account Level

**Model**: `insider_dealing` -- Insider Dealing
**Account**: ACC-122 (actual alert from platform data)
**Product**: PFE (Pfizer Inc., equity, common_stock)
**Event**: price_surge on 2024-02-07 (+9.565%)

This example shows how the insider dealing model operates primarily at the
account level, detecting trading activity that precedes a significant market event.

### Step 1: Detection Level

```json
"granularity": ["product_id", "account_id"]
```

While the grain includes both product_id and account_id, the **account** is the
primary entity of interest. The investigation question is: "Did this account trade
in products that subsequently had significant price movements?"

```
Primary investigation entity: account (ACC-122)
Event entity:                 product (PFE -- had a price surge)
Join path:                    account -> execution -> product -> md_eod (market events)
```

### Step 2: Product Reachability from Account

The account entity reaches products through a 3-hop relationship path:

```
account(ACC-122)
   |
   | account.account_id = execution.account_id (1 hop)
   v
execution
   |
   | execution.product_id = product.product_id (2 hops)
   v
product(PFE)
   |
   | product.product_id = md_eod.product_id (3 hops)
   v
md_eod (market data with price events)
```

This relationship traversal is embedded in the model's query:

```sql
SELECT
  ta.product_id, ta.account_id, ta.business_date,
  ta.total_value, ta.same_side_pct,
  me.event_type, me.event_date, me.price_change_pct,
  me.lookback_start, me.lookforward_end,
  p.asset_class, p.instrument_type
FROM calc_large_trading_activity ta
INNER JOIN calc_market_event_window me
  ON ta.product_id = me.product_id
INNER JOIN product p
  ON ta.product_id = p.product_id
WHERE ta.is_large = TRUE
  AND CAST(ta.business_date AS DATE) >= CAST(me.lookback_start AS DATE)
  AND CAST(ta.business_date AS DATE) <= CAST(me.event_date AS DATE)
```

### Step 3: Market Event Window (Complex)

The `market_event_window` calculation detects significant price changes:

```sql
-- Simplified
WHERE close_price > prev_close * (1 + $price_change_threshold)  -- price_surge
   OR close_price < prev_close * (1 - $price_change_threshold)  -- price_drop
   OR volume > prev_volume * $volume_spike_multiplier            -- volume_spike
```

Parameters:

```
price_change_threshold = 0.05 (5% -- literal, not settings-resolved)
volume_spike_multiplier = 3 (3x normal volume -- literal)
lookback_days: resolved via insider_lookback_days setting
lookforward_days = 2 (literal)
```

**Setting**: `insider_lookback_days`

```
Context: { asset_class: "equity" }
Override: { asset_class: "equity" } -> 20 (priority 1) -- MATCH
Result:  lookback_days = 20
```

Compare: default is 30 days, options use 10 days, fixed_income uses 14.
Equity uses 20 days -- a balance between catching pre-event activity and
limiting false positives from normal trading.

Detected event for PFE:

```
+----------+-------+-----------+--------+----------+-----------+
| event_id | prod  | event_type| change | lookback | lookfwd   |
+----------+-------+-----------+--------+----------+-----------+
| PFE_0207 | PFE   | price_surge| +9.565%| 01-08    | 02-09     |
+----------+-------+-----------+--------+----------+-----------+
```

### Step 4: Timeline

```
       lookback_start                    business_date    event_date    lookforward_end
       2024-01-08                        2024-02-05       2024-02-07    2024-02-09
       |<--------- 20-day lookback -------->|<--- 2 days -->|<-- 2d -->|
       |                                    |               |          |
       |    ACC-122 trades PFE here         |               |          |
       |    (large activity detected)       |  PFE surges   |          |
       |                                    |  +9.565%      |          |
```

ACC-122 had large trading activity in PFE on 2024-02-05, two days before the
+9.565% price surge. The model flags this as potentially suspicious.

### Step 5: Calculation Results

From the actual alert trace (ALT-47C5319D):

```
+---------+---------+----------+-----------+-----------+----------+
| prod_id | acct_id | bus_date | total_val | same_side | event    |
+---------+---------+----------+-----------+-----------+----------+
| PFE     | ACC-122 | 02-05    | 111,188.81| 1.0       | price    |
|         |         |          |           | (100% buy)| _surge   |
+---------+---------+----------+-----------+-----------+----------+
```

ACC-122 bought $111K of PFE on 2024-02-05 with 100% same-side (all buys),
two days before a +9.565% price surge. Highly suspicious pattern.

### Step 6: Scoring

**market_event_score_steps** (no override -- default):

```
Steps: [0..1.5: 0] [1.5..3.0: 3] [3.0..5.0: 7] [5.0+: 10]
Value: 9.565 (price_change_pct)
Match: [5.0 .. inf) -> score = 10
```

**large_activity_score_steps** (equity override):

```
Steps: [0..25K: 0] [25K..100K: 3] [100K..500K: 7] [500K+: 10]
Value: 111,188.81
Match: [100,000 .. 500,000) -> score = 7
```

### Step 7: Accumulated Score and Decision

```
market_event_detection:    10 (MUST_PASS -- passed)
large_trading_activity:     7 (OPTIONAL -- passed)
                          ----
Accumulated score:         17

Score threshold (insider_score_threshold):
  Context: { asset_class: "equity" }
  No overrides defined -> default = 10

Decision: 17 >= 10 -> ALERT FIRED
trigger_path: "all_passed"
```

### Investigation Context

The alert trace provides the investigator with:

1. **Account**: ACC-122 -- who traded?
2. **Product**: PFE -- what did they trade?
3. **Timing**: 2 days before a +9.565% price surge
4. **Directionality**: 100% buy-side (same_side_pct = 1.0)
5. **Size**: $111K total value (large activity)
6. **Event**: price_surge -- what happened to the price?

The investigator can then check:
- Does ACC-122 have connections to PFE insiders?
- Did ACC-122 trade in PFE derivatives (options) as well?
- Were there similar patterns in other accounts with the same trader?

---

## Example 5: Custom Model -- Cross-Venue Arbitrage (Hypothetical)

**Model**: `cross_venue_arbitrage` (new, hypothetical)
**Product**: AAPL (listed on XNYS, also traded on XNAS)
**Detection level**: product_id only (single entity grain)

This example demonstrates the platform's metadata-driven extensibility: creating
a completely new detection model without any schema changes, code modifications,
or database migrations.

### Step 1: Define the Detection Model

Create `workspace/metadata/detection_models/cross_venue_arbitrage.json`:

```json
{
  "model_id": "cross_venue_arbitrage",
  "name": "Cross-Venue Arbitrage",
  "description": "Detects potential cross-venue arbitrage by identifying accounts that buy on one venue and sell on another for the same product within a short time window, exploiting price discrepancies.",
  "time_window": "business_date",
  "granularity": ["product_id"],
  "calculations": [
    {
      "calc_id": "venue_price_discrepancy",
      "strictness": "MUST_PASS",
      "threshold_setting": "arbitrage_price_threshold",
      "score_steps_setting": null,
      "value_field": "max_price_diff_pct"
    },
    {
      "calc_id": "cross_venue_volume",
      "strictness": "OPTIONAL",
      "threshold_setting": null,
      "score_steps_setting": "arbitrage_volume_score_steps",
      "value_field": "cross_venue_value"
    },
    {
      "calc_id": "timing_proximity",
      "strictness": "OPTIONAL",
      "threshold_setting": null,
      "score_steps_setting": "arbitrage_timing_score_steps",
      "value_field": "avg_time_gap_seconds"
    }
  ],
  "context_fields": ["product_id", "business_date", "asset_class", "instrument_type"],
  "score_threshold_setting": "arbitrage_score_threshold",
  "query": "SELECT product_id, business_date, max_price_diff_pct, cross_venue_value, avg_time_gap_seconds, asset_class, instrument_type FROM calc_cross_venue_arbitrage WHERE max_price_diff_pct > 0",
  "alert_template": {
    "title": "Cross-Venue Arbitrage Alert",
    "sections": ["business_description", "entity_context", "venue_comparison", "calculation_trace", "score_breakdown", "price_chart"]
  },
  "regulatory_coverage": [
    {"regulation": "MAR", "article": "Art. 12(1)(b)", "description": "Price manipulation across venues"},
    {"regulation": "MiFID II", "article": "Art. 48", "description": "Market making obligations and arbitrage"}
  ]
}
```

### Step 2: Reuse Existing Calculations

The model reuses `vwap_calc` and `value_calc` from the existing calculation library,
and adds one new aggregation calculation.

Create `workspace/metadata/calculations/aggregations/cross_venue_arbitrage.json`:

```json
{
  "calc_id": "cross_venue_arbitrage",
  "name": "Cross-Venue Arbitrage Detection",
  "layer": "aggregation",
  "description": "Compares execution prices across venues for the same product and business date.",
  "inputs": [
    {"source_type": "calculation", "calc_id": "business_date_window",
     "fields": ["execution_id", "product_id", "account_id", "price", "quantity",
                "calculated_value", "execution_time", "business_date"]},
    {"source_type": "entity", "entity_id": "execution",
     "fields": ["venue_mic"]},
    {"source_type": "entity", "entity_id": "product",
     "fields": ["asset_class", "instrument_type"]}
  ],
  "output": {
    "table_name": "calc_cross_venue_arbitrage",
    "fields": [
      {"name": "product_id", "type": "varchar"},
      {"name": "business_date", "type": "date"},
      {"name": "venue_count", "type": "integer"},
      {"name": "max_price_diff_pct", "type": "decimal"},
      {"name": "cross_venue_value", "type": "decimal"},
      {"name": "avg_time_gap_seconds", "type": "decimal"},
      {"name": "asset_class", "type": "varchar"},
      {"name": "instrument_type", "type": "varchar"}
    ]
  },
  "logic": "WITH venue_prices AS ( SELECT bw.product_id, bw.business_date, e.venue_mic, AVG(bw.price) AS avg_price, SUM(bw.calculated_value) AS total_value, COUNT(*) AS trade_count FROM calc_business_date_window bw INNER JOIN execution e ON bw.execution_id = e.execution_id GROUP BY bw.product_id, bw.business_date, e.venue_mic ), venue_diffs AS ( SELECT v1.product_id, v1.business_date, ABS(v1.avg_price - v2.avg_price) / NULLIF((v1.avg_price + v2.avg_price) / 2, 0) * 100 AS price_diff_pct, v1.total_value + v2.total_value AS cross_venue_value FROM venue_prices v1 INNER JOIN venue_prices v2 ON v1.product_id = v2.product_id AND v1.business_date = v2.business_date AND v1.venue_mic < v2.venue_mic ) SELECT vd.product_id, vd.business_date, 2 AS venue_count, MAX(vd.price_diff_pct) AS max_price_diff_pct, SUM(vd.cross_venue_value) AS cross_venue_value, 120 AS avg_time_gap_seconds, p.asset_class, p.instrument_type FROM venue_diffs vd INNER JOIN product p ON vd.product_id = p.product_id GROUP BY vd.product_id, vd.business_date, p.asset_class, p.instrument_type",
  "parameters": {},
  "depends_on": ["business_date_window"],
  "regulatory_tags": ["MAR Art. 12(1)(b)"]
}
```

### Step 3: Create New Settings

**arbitrage_price_threshold** -- `workspace/metadata/settings/thresholds/arbitrage_price_threshold.json`:

```json
{
  "setting_id": "arbitrage_price_threshold",
  "name": "Arbitrage Price Threshold",
  "description": "Minimum cross-venue price difference (%) to trigger arbitrage detection.",
  "value_type": "decimal",
  "default": 0.1,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 0.05, "priority": 1,
     "description": "Tighter threshold for equity -- highly liquid"},
    {"match": {"asset_class": "fx"}, "value": 0.02, "priority": 1,
     "description": "Very tight for FX -- tiny spreads are significant"}
  ]
}
```

**arbitrage_score_threshold** -- `workspace/metadata/settings/score_thresholds/arbitrage_score_threshold.json`:

```json
{
  "setting_id": "arbitrage_score_threshold",
  "name": "Arbitrage Score Threshold",
  "description": "Minimum accumulated score for cross-venue arbitrage alert.",
  "value_type": "decimal",
  "default": 12,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 10, "priority": 1}
  ]
}
```

### Step 4: Create New Score Templates

**arbitrage_volume_score_steps** -- `workspace/metadata/settings/score_steps/arbitrage_volume_score_steps.json`:

```json
{
  "setting_id": "arbitrage_volume_score_steps",
  "name": "Arbitrage Volume Score Steps",
  "description": "Graduated scoring for cross-venue trading volume.",
  "value_type": "score_steps",
  "default": [
    {"min_value": 0, "max_value": 50000, "score": 0},
    {"min_value": 50000, "max_value": 200000, "score": 3},
    {"min_value": 200000, "max_value": 1000000, "score": 7},
    {"min_value": 1000000, "max_value": null, "score": 10}
  ],
  "match_type": "hierarchy",
  "overrides": []
}
```

**arbitrage_timing_score_steps** -- `workspace/metadata/settings/score_steps/arbitrage_timing_score_steps.json`:

```json
{
  "setting_id": "arbitrage_timing_score_steps",
  "name": "Arbitrage Timing Score Steps",
  "description": "Graduated scoring for time gap between cross-venue trades (inverse -- shorter gap = higher score).",
  "value_type": "score_steps",
  "default": [
    {"min_value": 0, "max_value": 30, "score": 10},
    {"min_value": 30, "max_value": 120, "score": 7},
    {"min_value": 120, "max_value": 300, "score": 3},
    {"min_value": 300, "max_value": null, "score": 0}
  ],
  "match_type": "hierarchy",
  "overrides": []
}
```

### Step 5: Create Match Patterns (Optional)

Create `workspace/metadata/match_patterns/multi_venue_equity.json`:

```json
{
  "pattern_id": "multi_venue_equity",
  "label": "Multi-Venue Equity",
  "description": "Equity instruments traded on multiple venues",
  "match": {"asset_class": "equity"},
  "created_at": "2026-03-09T10:00:00Z",
  "layer": "custom"
}
```

### Step 6: Complete Configuration Summary

All files needed (no code changes):

```
workspace/metadata/
  detection_models/
    cross_venue_arbitrage.json          <- model definition
  calculations/aggregations/
    cross_venue_arbitrage.json          <- new calculation
  settings/thresholds/
    arbitrage_price_threshold.json      <- price diff threshold
  settings/score_thresholds/
    arbitrage_score_threshold.json      <- alert score threshold
  settings/score_steps/
    arbitrage_volume_score_steps.json   <- volume scoring tiers
    arbitrage_timing_score_steps.json   <- timing scoring tiers
  match_patterns/
    multi_venue_equity.json             <- optional pattern
```

**Total**: 7 JSON files. Zero code changes. Zero schema changes.
The detection engine automatically discovers the new model, resolves its settings,
executes its query, and produces AlertTrace objects with full scoring breakdowns.

### Step 7: Hypothetical Evaluation

For AAPL traded on both XNYS and XNAS on 2024-01-22:

```
XNYS avg price: 183.92
XNAS avg price: 183.54
Price diff:     0.207%

Context: { asset_class: "equity", product_id: "AAPL" }

venue_price_discrepancy (MUST_PASS):
  Value: 0.207%
  Threshold: 0.05% (equity override)
  Passed: TRUE (0.207 > 0.05)

cross_venue_volume (OPTIONAL):
  Value: 425,000
  Steps: [0..50K: 0] [50K..200K: 3] [200K..1M: 7] [1M+: 10]
  Score: 7

timing_proximity (OPTIONAL):
  Value: 45 seconds
  Steps: [0..30: 10] [30..120: 7] [120..300: 3] [300+: 0]
  Score: 7

Accumulated: 0 + 7 + 7 = 14
Threshold:   10 (equity)
Decision:    14 >= 10 -> ALERT FIRED
```

---

## Example 6: Entity Key Override -- AAPL with Custom Thresholds

**Product**: AAPL (Apple Inc.)
**Focus**: Demonstrating the settings resolution priority cascade, where a
product-specific (entity key) override wins over broader overrides.

### The Resolution Priority Cascade

The settings resolver uses a hierarchy strategy where overrides are ranked by:
1. **Number of matching keys** (more specific wins)
2. **Priority number** (higher wins on tie)

For the `wash_vwap_threshold` setting, the following overrides exist:

```json
{
  "setting_id": "wash_vwap_threshold",
  "default": 0.02,
  "overrides": [
    {"match": {"asset_class": "equity"},                        "value": 0.015, "priority": 1},
    {"match": {"asset_class": "equity", "exchange_mic": "XNYS"},"value": 0.012, "priority": 2},
    {"match": {"product": "AAPL"},                              "value": 0.01,  "priority": 100}
  ]
}
```

### Step 1: Default Resolution (No Context Match)

Context: `{ asset_class: "commodity", instrument_type: "spot" }`

```
Override 1: { asset_class: "equity" }              -> no match (commodity != equity)
Override 2: { asset_class: "equity", exchange_mic: "XNYS" } -> no match
Override 3: { product: "AAPL" }                    -> no match (no product in context)

Result: 0.02 (default)
Why:    "No matching override; using default value"
```

### Step 2: Equity Resolution (Broad Asset Class)

Context: `{ asset_class: "equity", exchange_mic: "XNAS", product_id: "MSFT" }`

```
Override 1: { asset_class: "equity" }              -> MATCH (1 key)
Override 2: { asset_class: "equity", exchange_mic: "XNYS" } -> no match (XNAS != XNYS)
Override 3: { product: "AAPL" }                    -> no match (MSFT != AAPL)

Candidates: [Override 1]
Result: 0.015
Why:    "Matched override: {asset_class=equity} (priority 1)"
```

### Step 3: Equity + US Resolution (Two-Key Match)

Context: `{ asset_class: "equity", exchange_mic: "XNYS", product_id: "BAC" }`

```
Override 1: { asset_class: "equity" }              -> MATCH (1 key)
Override 2: { asset_class: "equity", exchange_mic: "XNYS" } -> MATCH (2 keys)
Override 3: { product: "AAPL" }                    -> no match (BAC != AAPL)

Candidates: [Override 1 (1 key, pri=1), Override 2 (2 keys, pri=2)]
Sort by: (key_count desc, priority desc) -> Override 2 wins

Result: 0.012
Why:    "Matched override: {asset_class=equity, exchange_mic=XNYS} (priority 2)"
```

### Step 4: AAPL Entity Key Override (Priority 100)

Context: `{ asset_class: "equity", exchange_mic: "XNYS", product: "AAPL" }`

```
Override 1: { asset_class: "equity" }              -> MATCH (1 key)
Override 2: { asset_class: "equity", exchange_mic: "XNYS" } -> MATCH (2 keys)
Override 3: { product: "AAPL" }                    -> MATCH (1 key)

Candidates: [Override 1 (1 key, pri=1),
             Override 2 (2 keys, pri=2),
             Override 3 (1 key, pri=100)]

Sort by: (key_count desc, priority desc):
  Override 2: (2, 2)   <- most keys, wins
  Override 3: (1, 100) <- fewer keys, despite highest priority
  Override 1: (1, 1)   <- fewest specificity

Result: 0.012
Why:    "Matched override: {asset_class=equity, exchange_mic=XNYS} (priority 2)"
```

**Important**: In the current hierarchy strategy implementation, the number of
matching keys (specificity) takes precedence over priority number. Override 2
wins because it has 2 matching keys vs. Override 3's 1 key, even though Override 3
has priority 100.

### Achieving True Entity Key Overrides

To ensure a product-specific override always wins, it must match **more dimensions**
than competing overrides, or be the only match:

**Approach A: Multi-key product override**

```json
{"match": {"asset_class": "equity", "exchange_mic": "XNYS", "product": "AAPL"},
 "value": 0.01, "priority": 100}
```

With 3 matching keys, this override will always beat the 2-key XNYS override.

Context: `{ asset_class: "equity", exchange_mic: "XNYS", product: "AAPL" }`

```
Override 1: { asset_class: "equity" }                                    -> MATCH (1 key)
Override 2: { asset_class: "equity", exchange_mic: "XNYS" }             -> MATCH (2 keys)
Override 3: { asset_class: "equity", exchange_mic: "XNYS", product: "AAPL" } -> MATCH (3 keys)

Sort by: (key_count desc, priority desc):
  Override 3: (3, 100) <- WINS -- most specific

Result: 0.01
Why:    "Matched override: {asset_class=equity, exchange_mic=XNYS, product=AAPL} (priority 100)"
```

### Full Cascade Diagram

```
                       Context for AAPL on XNYS
                       { asset_class: "equity",
                         exchange_mic: "XNYS",
                         product: "AAPL" }
                              |
                              v
              +--------------------------------+
              | Resolution Strategy: hierarchy |
              +--------------------------------+
                              |
              +---------------+----------------+
              |               |                |
              v               v                v
         Override 1      Override 2        Override 3
         equity          equity+XNYS      equity+XNYS+AAPL
         value=0.015     value=0.012      value=0.01
         1 key match     2 key match      3 key match
         priority=1      priority=2       priority=100
              |               |                |
              +---------------+----------------+
                              |
                     Sort: (keys desc, priority desc)
                              |
                              v
                     Override 3 WINS (3 keys)
                     Resolved value: 0.01
```

### Impact on Detection

Using the AAPL-specific threshold (0.01) vs the generic equity threshold (0.015):

```
                        Generic Equity    AAPL Override
                        vwap_threshold    vwap_threshold
                        ──────────────    ──────────────
Threshold:              0.015             0.01
VWAP proximity 0.008:   BELOW (alert)     BELOW (alert)
VWAP proximity 0.012:   BELOW (alert)     ABOVE (no alert)
VWAP proximity 0.018:   ABOVE (no alert)  ABOVE (no alert)
```

The AAPL override creates a **tighter** threshold, meaning only trades with
very close buy/sell VWAPs trigger the wash detection. This is appropriate for
AAPL because it is one of the most liquid stocks, so legitimate market-making
activity produces tight VWAP spreads as normal behavior.

### Complete Setting Resolution Summary

| Context                          | Resolved Value | Override Used                           |
|----------------------------------|----------------|-----------------------------------------|
| `{ }`  (empty)                   | 0.02           | default                                 |
| `{ asset_class: "fx" }`         | 0.02           | default (no fx override)                |
| `{ asset_class: "equity" }`     | 0.015          | `{asset_class=equity}` (pri 1)          |
| `{ equity, exchange_mic: XNYS }`| 0.012          | `{equity, XNYS}` (pri 2, 2 keys)       |
| `{ equity, XNYS, product: AAPL }`| 0.01          | `{equity, XNYS, AAPL}` (pri 100, 3 keys)|
| `{ equity, XNAS, product: MSFT }`| 0.015         | `{asset_class=equity}` (pri 1, 1 key)   |

---

## Cross-Reference: Settings Resolution Summary

All settings used across the six examples, showing how the same resolution
engine produces different values based on entity context:

```
+-----------------------------+-------------+-----------+---------+----------+
| Setting                     | Default     | Equity    | Commodity| FX       |
+-----------------------------+-------------+-----------+---------+----------+
| business_date_cutoff        | 17:00       | 21:00*    | 17:00   | 21:00    |
| cancel_count_threshold      | 5           | 3         | 5       | 5        |
| insider_lookback_days       | 30          | 20        | 30      | 30       |
| wash_vwap_threshold         | 0.02        | 0.015     | 0.02    | 0.02     |
| large_activity_multiplier   | 2.0         | 2.5       | 2.5     | 3.0      |
| trend_sensitivity           | 3.5         | 2.5       | 3.5     | 2.0      |
| wash_score_threshold        | 10          | 8         | 10      | 12       |
| mpr_score_threshold         | 18          | 16        | 14      | 18       |
| spoofing_score_threshold    | 12          | 10        | 12      | 12       |
| insider_score_threshold     | 10          | 10        | 10      | 10       |
+-----------------------------+-------------+-----------+---------+----------+
* XNYS-specific override, not asset_class
```

---

## Cross-Reference: Calculation DAG Layers

Complete calculation execution order across all models:

```
Layer 1: TRANSACTION (no dependencies)
  value_calc             <- execution JOIN product
  adjusted_direction     <- value_calc

Layer 2: TIME_WINDOW (depends on Layer 1)
  business_date_window   <- adjusted_direction + business_date_cutoff setting
  cancellation_pattern   <- order + cancel_count_threshold setting
  market_event_window    <- md_eod + insider_lookback_days setting
  trend_window           <- md_intraday + trend_sensitivity setting

Layer 3: AGGREGATION (depends on Layer 2)
  trading_activity_aggregation <- business_date_window
  vwap_calc                    <- business_date_window

Layer 4: DERIVED (depends on Layer 3)
  large_trading_activity <- trading_activity_aggregation + large_activity_multiplier
  wash_detection         <- large_trading_activity + vwap_calc + wash_vwap_threshold

Detection Models (consume Layer 3-4 outputs):
  wash_full_day          <- wash_detection
  wash_intraday          <- wash_detection (trend_window variant)
  market_price_ramping   <- trend_window + large_trading_activity + same_side_ratio
  spoofing_layering      <- cancellation_pattern + large_trading_activity
  insider_dealing        <- market_event_window + large_trading_activity
```
