# Calculation Schemas

All calculation definitions organized by layer. Each calculation is a JSON file in `workspace/metadata/calculations/{layer}/`.

Calculations execute in dependency order via topological sort. Each produces a DuckDB table and Parquet file.

---

## Layer 1: Transaction

Per-execution calculations that enrich individual trade records.

### value_calc (Value Calculation)

Computes the monetary value of each execution, handling different instrument types.

| Property | Value |
|----------|-------|
| Output Table | `calc_value` |
| Dependencies | None |
| Input | execution entity |

**Logic:**
- Stock: `price * quantity`
- Option: `price * contract_size * quantity`
- Future: `price * contract_size * quantity`
- Default: `price * quantity`

**Output Fields:** execution_id, product_id, account_id, trader_id, side, price, quantity, instrument_type, asset_class, execution_date, execution_time, `calculated_value`

---

### adjusted_direction (Adjusted Direction)

Determines the effective buy/sell direction, accounting for short instruments (puts, short calls).

| Property | Value |
|----------|-------|
| Output Table | `calc_adjusted_direction` |
| Dependencies | value_calc |
| Input | calc_value + execution (for option_type) |

**Logic:**
- Buy put or sell call → effectively `SELL`
- Sell put or buy call → effectively `BUY`
- Non-option instruments → original side preserved

**Output Fields:** execution_id, product_id, account_id, trader_id, original_side, `adjusted_side`, instrument_type, asset_class, price, quantity, calculated_value, execution_date, execution_time

---

## Layer 2: Time Window

Temporal segmentation calculations that define analysis windows.

### business_date_window (Business Date Window)

Assigns each execution to a business date based on configurable cutoff time.

| Property | Value |
|----------|-------|
| Output Table | `calc_business_date_window` |
| Dependencies | adjusted_direction |
| Settings Used | business_date_cutoff |

**Logic:** Executions after cutoff time roll to the next business date. Cutoff varies by exchange, timezone, and asset class (resolved via settings).

**Output Fields:** execution_id, product_id, account_id, `business_date`, window_start, window_end + all adjusted_direction fields

---

### trend_window (Trend Window)

Detects up/down price trends from intraday market data.

| Property | Value |
|----------|-------|
| Output Table | `calc_trend_window` |
| Dependencies | None |
| Settings Used | trend_sensitivity |
| Input | md_intraday entity |

**Logic:** Identifies trends when price moves beyond a sensitivity threshold (std dev multiplier) from local min/max. Returns trend type, timing, and magnitude.

**Output Fields:** trend_id, product_id, `trend_type` (up/down), window_start, window_end, start_price, end_price, `price_change_pct`

---

### market_event_window (Market Event Window)

Detects significant price changes or volume spikes used for insider dealing detection.

| Property | Value |
|----------|-------|
| Output Table | `calc_market_event_window` |
| Dependencies | None |
| Settings Used | insider_lookback_days |
| Input | md_eod entity |

**Logic:**
- Price surge: >5% price increase day-over-day
- Price drop: >5% price decrease day-over-day
- Volume spike: >3x previous volume

Defines lookback window (configurable days before event) and lookforward window.

**Output Fields:** event_id, product_id, `event_type`, event_date, `price_change_pct`, lookback_start, lookforward_end

---

### cancellation_pattern (Cancellation Pattern)

Detects order cancellation bursts for spoofing/layering detection.

| Property | Value |
|----------|-------|
| Output Table | `calc_cancellation_pattern` |
| Dependencies | None |
| Settings Used | cancel_count_threshold |
| Input | order entity |

**Logic:** Identifies clusters of 3+ order cancellations for the same product+account within a short time window on the same side.

**Output Fields:** pattern_id, product_id, account_id, `cancel_side`, `cancel_count`, cancel_quantity, window_start, window_end, pattern_date

---

## Layer 3: Aggregation

Group-by aggregations across time windows.

### trading_activity_aggregation (Trading Activity)

Aggregates buy/sell/net values and quantities per product+account+business_date.

| Property | Value |
|----------|-------|
| Output Table | `calc_trading_activity` |
| Dependencies | business_date_window |

**Output Fields:** product_id, account_id, business_date, `buy_value`, `sell_value`, `net_value`, `buy_qty`, `sell_qty`, `total_trades`, `same_side_pct`

---

### vwap_calc (VWAP Calculation)

Volume-Weighted Average Price per account/product/business_date with proximity metric.

| Property | Value |
|----------|-------|
| Output Table | `calc_vwap` |
| Dependencies | business_date_window |

**Logic:**
- `vwap_buy = sum(price * quantity) / sum(quantity)` for buy side
- `vwap_sell = sum(price * quantity) / sum(quantity)` for sell side
- `vwap_spread = abs(vwap_buy - vwap_sell)`
- `vwap_proximity` = normalized spread (lower = buy/sell prices closer = more suspicious)

**Output Fields:** product_id, account_id, business_date, `vwap_buy`, `vwap_sell`, `vwap_spread`, `vwap_proximity`

---

## Layer 3.5: Derived

Cross-calculation derivations that apply thresholds and flag candidates.

### large_trading_activity (Large Trading Activity)

Flags activity as "large" when total value exceeds a configurable threshold.

| Property | Value |
|----------|-------|
| Output Table | `calc_large_trading_activity` |
| Dependencies | trading_activity_aggregation |
| Settings Used | large_activity_multiplier |

**Logic:** `is_large = total_value > (average_daily_value * multiplier)`. Multiplier varies by asset class (equity: 1.5, fx: 3.0, commodity: 2.5).

**Output Fields:** product_id, account_id, business_date, total_value, `is_large`, threshold_used + all trading_activity fields

---

### wash_detection (Wash Detection)

Combines quantity matching and VWAP proximity to identify wash trading candidates.

| Property | Value |
|----------|-------|
| Output Table | `calc_wash_detection` |
| Dependencies | large_trading_activity, vwap_calc |
| Settings Used | wash_vwap_threshold |

**Logic:**
- `qty_match_ratio = min(buy_qty, sell_qty) / max(buy_qty, sell_qty)`
- `is_wash_candidate = qty_match_ratio > 0.5 AND vwap_proximity < threshold`

**Output Fields:** product_id, account_id, business_date, `qty_match_ratio`, `vwap_proximity`, `is_wash_candidate` + all large_trading fields

---

## Calculation Dependency Graph

```
execution ─→ value_calc ─→ adjusted_direction ─→ business_date_window ─┬→ trading_activity ─→ large_trading_activity ─→ wash_detection
                                                                       └→ vwap_calc ─────────────────────────────────↗

md_intraday ─→ trend_window
md_eod ──────→ market_event_window
order ───────→ cancellation_pattern
```
