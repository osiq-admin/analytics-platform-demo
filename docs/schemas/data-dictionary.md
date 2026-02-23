# Data Dictionary

Complete reference for all data structures in the Analytics Platform Demo.

See also:
- [Entity Schemas](entity-schemas.md) — canonical entity definitions
- [Calculation Schemas](calculation-schemas.md) — calculation layer definitions

---

## Source Data Tables

| Table | Rows | Source | Description |
|-------|------|--------|-------------|
| execution | 519 | CSV | Trade executions across 50 products, 220 accounts, 50 traders |
| "order" | 532 | CSV | Orders including fills and cancellations (quote in SQL — reserved word) |
| md_intraday | 26,890 | CSV | Intraday price snapshots (5-min intervals) |
| md_eod | 2,150 | CSV | End-of-day close prices and volumes |

## Calculation Result Tables

| Table | Layer | Rows | Description |
|-------|-------|------|-------------|
| calc_value | Transaction | 519 | Monetary value per execution (instrument-type aware) |
| calc_adjusted_direction | Transaction | 519 | Effective buy/sell direction (adjusts for short instruments) |
| calc_business_date_window | Time Window | 519 | Business date assignment with cutoff logic |
| calc_trend_window | Time Window | ~389 | Detected up/down price trends from intraday data |
| calc_market_event_window | Time Window | ~11 | Significant price events with lookback/lookforward windows |
| calc_cancellation_pattern | Time Window | ~3 | Order cancellation burst clusters |
| calc_trading_activity | Aggregation | ~471 | Buy/sell/net values and quantities per account/product/date |
| calc_vwap | Aggregation | ~471 | Volume-weighted average price with proximity metric |
| calc_large_trading_activity | Derived | ~471 | Large activity flag based on threshold |
| calc_wash_detection | Derived | ~471 | Wash trading candidate flag (qty match + VWAP proximity) |

## Alert Tables

| Table | Description |
|-------|-------------|
| alerts_summary | All fired alerts with model_id, scores, trigger path, entity context |

---

## Detection Models

| Model ID | Detects | Key Indicators | Calculations |
|----------|---------|----------------|-------------|
| wash_full_day | Wash trading (daily) | Offsetting buy/sell, matching quantities, close VWAP | large_activity (MUST_PASS), qty_match (OPTIONAL), vwap_proximity (OPTIONAL) |
| wash_intraday | Wash trading (intraday) | Same as above, within trend windows | Same as wash_full_day |
| market_price_ramping | Market price ramping | Aggressive same-direction trading during trend | trend_detection (MUST_PASS), large_activity (OPTIONAL), same_side_ratio (OPTIONAL) |
| insider_dealing | Insider dealing | Trading before material market events | market_event (MUST_PASS), large_activity (OPTIONAL) |
| spoofing_layering | Spoofing/layering | Cancellation burst + opposite-side execution | cancel_pattern (MUST_PASS), opposite_execution (OPTIONAL) |

### Alert Trigger Logic

```
alert_fires = must_pass_ok AND (all_passed OR score_ok)

where:
  must_pass_ok  = all MUST_PASS calculations pass
  all_passed    = all calculations (MUST_PASS + OPTIONAL) pass
  score_ok      = accumulated_score >= score_threshold (entity-context-dependent)
```

### Trigger Path

| Path | Meaning |
|------|---------|
| `all_passed` | Every calculation threshold was met |
| `score_based` | Some thresholds missed, but accumulated graduated score exceeded threshold |
| `none` | Alert did not fire |

---

## Settings

### Thresholds

| Setting ID | Default | Description | Override Examples |
|------------|---------|-------------|-------------------|
| large_activity_multiplier | 2.0 | Multiplier for "large" activity flag | equity: 1.5, fx: 3.0, commodity: 2.5 |
| business_date_cutoff | "17:00" | UTC cutoff for business date rollover | NYSE: "21:00", fx: "21:00" |
| cancel_count_threshold | 5 | Min cancellations for spoofing detection | equity: 3, option: 8 |
| insider_lookback_days | 30 | Days before event for insider detection | equity: 20, option: 10 |
| wash_vwap_threshold | 0.02 | VWAP proximity threshold for wash detection | equity: 0.015, AAPL: 0.01 |
| trend_sensitivity | 1.5 | Std dev multiplier for trend detection | equity: 1.2, fx: 2.0 |

### Score Steps (Graduated Scoring)

Each score step definition maps calculated values to graduated scores.

| Setting ID | Purpose | Bands |
|------------|---------|-------|
| large_activity_score_steps | Activity value tiers | 0-10K→0, 10K-100K→3, 100K-500K→7, 500K+→10 |
| quantity_match_score_steps | Buy/sell qty match ratio | 0-0.5→0, 0.5-0.8→3, 0.8-0.95→7, 0.95+→10 |
| vwap_proximity_score_steps | VWAP buy/sell proximity | 0-0.005→10, 0.005-0.01→7, 0.01-0.02→3, 0.02+→0 |
| same_side_pct_score_steps | Same-direction trading % | 0-0.6→0, 0.6-0.75→3, 0.75-0.9→7, 0.9+→10 |
| market_event_score_steps | Trading vs. market event | 0-1.5→0, 1.5-3.0→3, 3.0-5.0→7, 5.0+→10 |

### Score Thresholds (Alert Triggering)

| Setting ID | Default | Description | Override Examples |
|------------|---------|-------------|-------------------|
| wash_score_threshold | 10 | Min score to fire wash alert | equity: 8, fx: 12 |
| mpr_score_threshold | 12 | Min score to fire MPR alert | equity: 10 |
| insider_score_threshold | 10 | Min score to fire insider alert | — |
| spoofing_score_threshold | 12 | Min score to fire spoofing alert | equity: 10 |

---

## Synthetic Data: Embedded Detection Patterns

The generated data contains 13 embedded patterns for testing:

| Pattern Type | Count | What's Embedded |
|-------------|-------|-----------------|
| Wash Trading | 4 | Accounts with offsetting buy/sell in same product, matching quantities, close VWAP |
| Market Price Ramping | 3 | Aggressive same-direction trading during detected price trends |
| Insider Dealing | 3 | Trading in lookback window before embedded market events |
| Spoofing/Layering | 3 | Cancellation bursts with opposite-side execution |

**Data Profile:** 50 products (25 equities, 6 FX, 8 commodities, 6 options, 5 futures), 220 accounts, 50 traders, date range 2024-01-02 to 2024-02-29.
