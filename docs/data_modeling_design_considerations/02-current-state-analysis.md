# 02 -- Current State Analysis

> Factual documentation of the platform's data model as it exists today.
> All data sourced from `workspace/metadata/` JSON files.

---

## 1. Entity Model

The platform defines 8 entities in `workspace/metadata/entities/`. Each entity is a JSON file specifying fields (with types, nullability, domain values) and relationships to other entities.

### 1.1 Entity Inventory

| Entity | File | Fields | Key Field | Records | Domain |
|--------|------|--------|-----------|---------|--------|
| **product** | `entities/product.json` | 18 | `product_id` | 50 | Instruments -- equities, options, futures, FX, fixed income |
| **execution** | `entities/execution.json` | 13 | `execution_id` | 761 | Trade fills with venue, capacity, direction |
| **order** | `entities/order.json` | 15 | `order_id` | 786 | Orders with FIX protocol fields |
| **md_eod** | `entities/md_eod.json` | 10 | _(composite: product_id + trade_date)_ | 2,150 | Daily OHLCV market data |
| **md_intraday** | `entities/md_intraday.json` | 8 | _(composite: product_id + trade_date + trade_time)_ | ~32,000 | Tick-level intraday quotes/trades |
| **venue** | `entities/venue.json` | 8 | `mic` | 6 | Trading venues (ISO 10383 MIC) |
| **account** | `entities/account.json` | 10 | `account_id` | 220 | Trading accounts with risk rating |
| **trader** | `entities/trader.json` | 6 | `trader_id` | 50 | Traders with desk/role assignment |

### 1.2 Entity Detail

**product** (18 fields)
- Key: `product_id`
- ISO identifiers: `isin` (ISO 6166), `cfi_code` (ISO 10962), `exchange_mic` (ISO 10383), `currency` (ISO 4217)
- Domain values:
  - `asset_class`: equity, fx, commodity, index, fixed_income
  - `instrument_type`: common_stock, call_option, put_option, future, spot
  - `regulatory_scope`: EU, US, UK, APAC, MULTI
- Derivative fields: `underlying_product_id`, `contract_size`, `strike_price`, `expiry_date`
- Trading params: `tick_size`, `lot_size`, `base_price`

**execution** (13 fields)
- Key: `execution_id`
- Foreign keys: `order_id` -> order, `product_id` -> product, `account_id` -> account, `trader_id` -> trader, `venue_mic` -> venue
- Domain values:
  - `side`: BUY, SELL
  - `exec_type`: FILL, PARTIAL_FILL
  - `capacity`: AGENCY, PRINCIPAL
- Timestamp: `execution_date` (date) + `execution_time` (HH:MM:SS.fff)

**order** (15 fields)
- Key: `order_id`
- Foreign keys: `product_id` -> product, `account_id` -> account, `trader_id` -> trader, `execution_id` -> execution, `venue_mic` -> venue
- Domain values:
  - `side`: BUY, SELL
  - `order_type`: MARKET, LIMIT (FIX OrdType)
  - `status`: NEW, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED (FIX OrdStatus)
  - `time_in_force`: DAY, GTC, IOC, FOK (FIX TimeInForce)
- `limit_price` nullable (empty for MARKET orders)
- `filled_quantity` tracks partial fill progress

**md_eod** (10 fields)
- No explicit key field (`is_key` not set); effectively keyed by product_id + trade_date
- OHLCV: `open_price`, `high_price`, `low_price`, `close_price`, `volume`
- Derived: `prev_close`, `num_trades`, `vwap`
- No declared relationships (referenced by execution via composite join)

**md_intraday** (8 fields)
- No explicit key field; effectively keyed by product_id + trade_date + trade_time
- Tick data: `trade_price`, `trade_quantity`, `bid_price`, `ask_price`
- `trade_condition` domain: `@` (regular trade)
- Relationship: many_to_one -> product

**venue** (8 fields)
- Key: `mic` (ISO 10383 Market Identifier Code)
- Operational: `timezone` (IANA), `open_time`, `close_time`
- `asset_classes`: comma-separated string (equity, option, index, commodity, fixed_income, fx)
- `country`: ISO 3166-1 alpha-2

**account** (10 fields)
- Key: `account_id`
- Domain values:
  - `account_type`: institutional, retail, hedge_fund, market_maker
  - `risk_rating`: LOW, MEDIUM, HIGH
  - `mifid_client_category`: retail, professional, eligible_counterparty
  - `compliance_status`: active, under_review, restricted, suspended
  - `status`: ACTIVE
- Foreign key: `primary_trader_id` -> trader
- Regulatory: `registration_country` (ISO 3166-1 alpha-2), `mifid_client_category` (Directive 2014/65/EU Annex II)

**trader** (6 fields)
- Key: `trader_id`
- Domain values:
  - `desk`: Equity Flow, Derivatives, FX Spot, Commodities
  - `trader_type`: execution, portfolio, algorithmic
  - `status`: ACTIVE

### 1.3 Entity Relationship Diagram

```
                                    ┌──────────┐
                                    │  venue   │
                                    │ (mic)    │
                                    └────┬─────┘
                          ┌──────────────┼──────────────┐
                          │              │              │
                     1:M  │         1:M  │         1:M  │
                          ▼              ▼              ▼
┌──────────┐  1:M   ┌──────────┐  M:1  ┌──────────┐   │
│ product  │◄───────│execution │──────►│  order   │   │
│(product_ │  1:M   │(execution│  M:1  │(order_id)│   │
│  id)     │◄───────│  _id)    │       └─────┬────┘   │
│          │        └────┬─────┘             │        │
│          │             │                   │        │
│          │        M:1  │              M:1  │        │
│          │             ▼                   ▼        │
│          │        ┌──────────┐        ┌──────────┐  │
│          │        │ trader   │  1:M   │ account  │  │
│          │        │(trader_  │───────►│(account_ │  │
│          │        │  id)     │        │  id)     │  │
│          │        └──────────┘        └──────────┘  │
│          │                                          │
│  1:M     │  1:M                                     │
│          ▼                                          │
│   ┌────────────┐                                    │
│   │md_intraday │                                    │
│   │(product_id │                                    │
│   │+trade_date │                                    │
│   │+trade_time)│                                    │
│   └────────────┘                                    │
│          │                                          │
│  1:M     ▼                                          │
│   ┌────────────┐                                    │
│   │  md_eod    │                                    │
│   │(product_id │                                    │
│   │+trade_date)│                                    │
│   └────────────┘                                    │
└─────────────────────────────────────────────────────┘

Relationship summary:
  product  --1:M--> execution, order, md_intraday, md_eod
  product  --M:1--> venue (via exchange_mic = mic)
  execution --M:1--> order, product, account, trader, venue
  execution --M:1--> md_eod (via product_id + execution_date = trade_date)
  order    --M:1--> product, account, trader, execution, venue
  trader   --1:M--> execution, order, account (via primary_trader_id)
  account  --1:M--> execution, order
  venue    --1:M--> product, execution, order
  md_intraday --M:1--> product
  md_eod   -- (no declared relationships; joined via product_id + trade_date)
```

### 1.4 ISO/FIX Standards Alignment

| Standard | Entity | Fields |
|----------|--------|--------|
| ISO 6166 (ISIN) | product | `isin` |
| ISO 10962 (CFI) | product | `cfi_code`, `instrument_type` |
| ISO 10383 (MIC) | product, execution, order, venue | `exchange_mic`, `venue_mic`, `mic` |
| ISO 4217 (Currency) | product | `currency` |
| ISO 3166-1 (Country) | venue, account | `country`, `registration_country` |
| FIX OrdType | order | `order_type` (MARKET, LIMIT) |
| FIX OrdStatus | order | `status` (NEW, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED) |
| FIX TimeInForce | order | `time_in_force` (DAY, GTC, IOC, FOK) |
| FIX ExecType | execution | `exec_type` (FILL, PARTIAL_FILL) |
| FIX Side | execution, order | `side` (BUY, SELL) |
| MiFID II Annex II | account | `mifid_client_category` (retail, professional, eligible_counterparty) |

---

## 2. Calculation DAG

Calculations are organized into 4 layers across `workspace/metadata/calculations/`:
- `transaction/` -- 2 calculations
- `time_windows/` -- 4 calculations
- `aggregations/` -- 2 calculations
- `derived/` -- 2 calculations

### 2.1 Calculation Inventory

| calc_id | Layer | depends_on | Output Table | Parameters | Regulatory Tags |
|---------|-------|------------|--------------|------------|-----------------|
| `value_calc` | transaction | _(none -- reads entity tables)_ | `calc_value` | _(none)_ | MAR Art. 16, MiFID II Art. 16(2) |
| `adjusted_direction` | transaction | `value_calc` | `calc_adjusted_direction` | _(none)_ | MAR Art. 16, MiFID II Art. 16(2) |
| `business_date_window` | time_window | `adjusted_direction` | `calc_business_date_window` | `$cutoff_time` -> `business_date_cutoff` | MAR Art. 16 |
| `trend_window` | time_window | _(reads md_intraday)_ | `calc_trend_window` | `$trend_multiplier` -> `trend_sensitivity` | MAR Art. 12(1)(b), MAR Art. 16 |
| `cancellation_pattern` | time_window | _(reads order)_ | `calc_cancellation_pattern` | `$cancel_threshold` -> `cancel_count_threshold` | MAR Art. 12(1)(c), Dodd-Frank S747 |
| `market_event_window` | time_window | _(reads md_eod)_ | `calc_market_event_window` | `$lookback_days` -> `insider_lookback_days`; `$price_change_threshold` = 0.05 (literal); `$volume_spike_multiplier` = 3 (literal); `$lookforward_days` = 2 (literal) | MAR Art. 14, MAR Art. 16 |
| `trading_activity_aggregation` | aggregation | `business_date_window` | `calc_trading_activity` | _(none)_ | MAR Art. 12, MAR Art. 16, MiFID II Art. 16(2) |
| `vwap_calc` | aggregation | `business_date_window` | `calc_vwap` | _(none)_ | MAR Art. 12(1)(a), MiFID II Art. 16(2) |
| `large_trading_activity` | derived | `trading_activity_aggregation` | `calc_large_trading_activity` | `$activity_multiplier` -> `large_activity_multiplier` | MAR Art. 12, MAR Art. 16 |
| `wash_detection` | derived | `large_trading_activity`, `vwap_calc` | `calc_wash_detection` | `$qty_threshold` = 0.5 (literal); `$vwap_threshold` -> `wash_vwap_threshold` | MAR Art. 12(1)(a), MiFID II Art. 16(2) |

### 2.2 Dependency Chain

```
 LAYER 1: Transaction
 ────────────────────
  entity:execution ──┐
  entity:product ────┤
                     ▼
               ┌─────────────┐
               │  value_calc  │ --> calc_value
               └──────┬──────┘
                      │
                      ▼
               ┌──────────────────┐
               │adjusted_direction│ --> calc_adjusted_direction
               └──────┬───────────┘
                      │
 LAYER 2: Time Windows│
 ─────────────────────┤
                      ▼
         ┌────────────────────────┐
         │ business_date_window   │ --> calc_business_date_window
         │ ($cutoff_time)         │
         └────────────┬───────────┘
                      │
                      │  (parallel time windows from raw entities)
                      │
  entity:md_intraday ─┤──►  ┌──────────────┐
                      │     │ trend_window  │ --> calc_trend_window
                      │     │($trend_mult.) │
                      │     └──────────────┘
                      │
  entity:order ───────┤──►  ┌─────────────────────┐
                      │     │cancellation_pattern  │ --> calc_cancellation_pattern
                      │     │($cancel_threshold)   │
                      │     └─────────────────────┘
                      │
  entity:md_eod ──────┤──►  ┌─────────────────────┐
                      │     │market_event_window   │ --> calc_market_event_window
                      │     │($lookback_days)      │
                      │     └─────────────────────┘
                      │
 LAYER 3: Aggregation │
 ─────────────────────┤
                      ▼
         ┌────────────────────────────────┐
         │ trading_activity_aggregation   │ --> calc_trading_activity
         └────────────┬───────────────────┘
                      │
         ┌────────────┴───────────────────┐
         │       vwap_calc                │ --> calc_vwap
         └────────────┬───────────────────┘
                      │
 LAYER 4: Derived     │
 ─────────────────────┤
                      ▼
         ┌────────────────────────────────┐
         │  large_trading_activity        │ --> calc_large_trading_activity
         │  ($activity_multiplier)        │
         └────────────┬───────────────────┘
                      │
         ┌────────────┴───────────────────┐
         │  wash_detection                │ --> calc_wash_detection
         │  ($vwap_threshold)             │      (also reads calc_vwap)
         └────────────────────────────────┘
```

### 2.3 Parameter Resolution Pattern

Calculations reference settings via the `parameters` object. Each parameter has a `source` field:

- **`"source": "setting"`** -- resolved at runtime via the settings engine. The `setting_id` references a file in `workspace/metadata/settings/`. The `default` provides a fallback if no override matches.
- **`"source": "literal"`** -- hardcoded constant in the calculation definition, not overridable.

Example from `business_date_window`:
```json
"parameters": {
  "cutoff_time": {
    "source": "setting",
    "setting_id": "business_date_cutoff",
    "default": "17:00:00"
  }
}
```

Example from `market_event_window` (mixed):
```json
"parameters": {
  "price_change_threshold": {"source": "literal", "value": 0.05},
  "volume_spike_multiplier": {"source": "literal", "value": 3},
  "lookback_days": {"source": "setting", "setting_id": "insider_lookback_days", "default": 5},
  "lookforward_days": {"source": "literal", "value": 2}
}
```

The `$param` placeholders in SQL logic strings (e.g., `$cutoff_time`, `$cancel_threshold`) are substituted at execution time with the resolved value.

### 2.4 Output Tables

Each calculation produces a dedicated output table. There is no unified results table -- each calculation writes to its own `calc_*` table:

| Output Table | Primary Grain | Key Fields |
|---|---|---|
| `calc_value` | execution | execution_id, product_id, account_id |
| `calc_adjusted_direction` | execution | execution_id, product_id, account_id |
| `calc_business_date_window` | execution | execution_id, product_id, account_id, business_date |
| `calc_trend_window` | product + date | trend_id, product_id |
| `calc_cancellation_pattern` | product + account + date | pattern_id, product_id, account_id |
| `calc_market_event_window` | product + date | event_id, product_id |
| `calc_trading_activity` | product + account + date | product_id, account_id, business_date |
| `calc_vwap` | product + account + date | product_id, account_id, business_date |
| `calc_large_trading_activity` | product + account + date | product_id, account_id, business_date |
| `calc_wash_detection` | product + account + date | product_id, account_id, business_date |

---

## 3. Detection Models

Five detection models are defined in `workspace/metadata/detection_models/`. Each model references calculations, defines strictness levels, specifies granularity, and maps to regulatory coverage.

### 3.1 Model Inventory

| model_id | Name | Time Window | Granularity | Score Threshold Setting | Calculations |
|----------|------|-------------|-------------|------------------------|-------------|
| `wash_full_day` | Wash Trading -- Full Day | `business_date` | product_id, account_id | `wash_score_threshold` | 3 |
| `wash_intraday` | Wash Trading -- Intraday | `trend_window` | product_id, account_id | `wash_score_threshold` | 3 |
| `market_price_ramping` | Market Price Ramping (MPR) | `trend_window` | product_id, account_id | `mpr_score_threshold` | 3 |
| `spoofing_layering` | Spoofing / Layering | `cancellation_pattern` | product_id, account_id | `spoofing_score_threshold` | 2 |
| `insider_dealing` | Insider Dealing | `market_event_window` | product_id, account_id | `insider_score_threshold` | 2 |

### 3.2 Model Detail

**wash_full_day** -- Wash Trading -- Full Day
- Calculations:
  - `large_trading_activity` -- **MUST_PASS** -- threshold: `large_activity_multiplier`, score_steps: `large_activity_score_steps`, value_field: `total_value`
  - `wash_qty_match` -- OPTIONAL -- score_steps: `quantity_match_score_steps`, value_field: `qty_match_ratio`
  - `wash_vwap_proximity` -- OPTIONAL -- score_steps: `vwap_proximity_score_steps`, value_field: `vwap_proximity`
- Context fields: product_id, account_id, business_date, asset_class, instrument_type
- Alert layout emphasis: scores, marketData
- Market data config: candlestick chart with trade overlay

**wash_intraday** -- Wash Trading -- Intraday
- Calculations:
  - `large_trading_activity` -- **MUST_PASS** -- threshold: `large_activity_multiplier`, score_steps: `large_activity_score_steps`, value_field: `total_value`
  - `wash_qty_match` -- OPTIONAL -- score_steps: `quantity_match_score_steps`, value_field: `qty_match_ratio`
  - `wash_vwap_proximity` -- OPTIONAL -- score_steps: `vwap_proximity_score_steps`, value_field: `vwap_proximity`
- Context fields: product_id, account_id, business_date, asset_class, instrument_type
- Alert layout emphasis: scores, relatedOrders
- Market data config: candlestick chart with trade overlay

**market_price_ramping** -- Market Price Ramping (MPR)
- Calculations:
  - `trend_detection` -- **MUST_PASS** -- threshold: `trend_sensitivity`, score_steps: _(null)_, value_field: `price_change_pct`
  - `large_trading_activity` -- OPTIONAL -- threshold: `large_activity_multiplier`, score_steps: `large_activity_score_steps`, value_field: `total_value`
  - `same_side_ratio` -- OPTIONAL -- score_steps: `same_side_pct_score_steps`, value_field: `same_side_pct`
- Context fields: product_id, account_id, business_date, asset_class, instrument_type, trend_type
- Alert layout emphasis: marketData, scores
- Market data config: candlestick chart with trade overlay

**spoofing_layering** -- Spoofing / Layering
- Calculations:
  - `cancel_pattern` -- **MUST_PASS** -- threshold: `cancel_count_threshold`, score_steps: _(null)_, value_field: `cancel_count`
  - `opposite_side_execution` -- OPTIONAL -- score_steps: `large_activity_score_steps`, value_field: `total_value`
- Context fields: product_id, account_id, business_date, asset_class, instrument_type, pattern_side
- Alert layout emphasis: relatedOrders, scores
- Market data config: candlestick chart, no trade overlay

**insider_dealing** -- Insider Dealing
- Calculations:
  - `market_event_detection` -- **MUST_PASS** -- threshold: `insider_lookback_days`, score_steps: `market_event_score_steps`, value_field: `price_change_pct`
  - `large_trading_activity` -- OPTIONAL -- threshold: `large_activity_multiplier`, score_steps: `large_activity_score_steps`, value_field: `total_value`
- Context fields: product_id, account_id, business_date, asset_class, instrument_type, event_type, event_date
- Alert layout emphasis: entity, scores
- Market data config: line chart, no trade overlay

### 3.3 Trigger Logic

Each detection model uses a two-phase trigger:

1. **MUST_PASS gate**: All calculations with `"strictness": "MUST_PASS"` must pass their threshold check. If any MUST_PASS calculation fails, the model does not fire for that granularity row.

2. **Score accumulation**: For rows that pass the gate, each calculation's value is evaluated against its `score_steps_setting` (graduated steps). The scores from all calculations (both MUST_PASS and OPTIONAL) are summed. An alert is generated when the accumulated score meets or exceeds the model's `score_threshold_setting`.

The score threshold is itself a setting resolved through the settings engine, allowing per-asset-class tuning:
- `wash_score_threshold`: default 10, equity 8, fx 12, fixed_income 8, index 7
- `mpr_score_threshold`: default 18, equity 16, commodity 14, fixed_income 7, index 6
- `spoofing_score_threshold`: default 12, equity 10, fixed_income 7, index 6
- `insider_score_threshold`: default 10 (no overrides)

### 3.4 Regulatory Coverage

| Model | MAR | MiFID II | Dodd-Frank | FINRA | SEC |
|-------|-----|----------|------------|-------|-----|
| wash_full_day | Art. 12(1)(a) | Art. 16(2), RTS 25 | -- | -- | S9(a)(2) |
| wash_intraday | Art. 12(1)(a) | Art. 16(2) | -- | -- | S9(a)(2) |
| market_price_ramping | Art. 12(1)(b) | -- | S747 | Rule 5210 | -- |
| spoofing_layering | Art. 12(1)(c) | RTS 25 | S747 | -- | -- |
| insider_dealing | Art. 14, Art. 16 | Art. 16(2) | -- | -- | Rule 10b-5 |

---

## 4. Settings Resolution

Settings are stored in three subdirectories of `workspace/metadata/settings/`:

### 4.1 Settings Count

| Category | Directory | Count | Files |
|----------|-----------|-------|-------|
| Thresholds | `settings/thresholds/` | 6 | business_date_cutoff, cancel_count_threshold, insider_lookback_days, large_activity_multiplier, trend_sensitivity, wash_vwap_threshold |
| Score Steps | `settings/score_steps/` | 5 | large_activity_score_steps, market_event_score_steps, quantity_match_score_steps, same_side_pct_score_steps, vwap_proximity_score_steps |
| Score Thresholds | `settings/score_thresholds/` | 4 | insider_score_threshold, mpr_score_threshold, spoofing_score_threshold, wash_score_threshold |
| **Total** | | **15** | |

### 4.2 Settings Structure

Every setting follows the same schema:

```json
{
  "setting_id": "<unique_id>",
  "name": "<display_name>",
  "description": "<what_it_controls>",
  "value_type": "string | integer | decimal | score_steps",
  "default": <value>,
  "match_type": "hierarchy",
  "overrides": [
    {
      "match": { "<field>": "<value>", ... },
      "value": <override_value>,
      "priority": <integer>,
      "description": "<optional_rationale>"
    }
  ]
}
```

Key characteristics:
- **`match_type`**: All 15 settings use `"hierarchy"` as the match type.
- **`match` object**: An untyped bag of key-value pairs. Keys are entity field names (e.g., `asset_class`, `exchange_mic`, `instrument_type`, `product`). No schema enforces which keys are valid.
- **`priority`**: Integer field on each override. Higher priority wins when multiple overrides match. Current values used: 1 (broad), 2 (narrower), 100 (product-specific).
- **`default`**: Fallback value when no override matches.

### 4.3 Override Examples

**wash_vwap_threshold** -- demonstrates the priority cascade:

| Override | Match | Value | Priority |
|----------|-------|-------|----------|
| Default | _(none)_ | 0.02 | -- |
| Equity (broad) | `{"asset_class": "equity"}` | 0.015 | 1 |
| Equity + NYSE (narrower) | `{"asset_class": "equity", "exchange_mic": "XNYS"}` | 0.012 | 2 |
| AAPL (product-specific) | `{"product": "AAPL"}` | 0.01 | 100 |
| Fixed income | `{"asset_class": "fixed_income"}` | 0.01 | 1 |
| Index | `{"asset_class": "index"}` | 0.015 | 1 |

Resolution order: product-specific (priority 100) > asset_class + exchange_mic (priority 2) > asset_class (priority 1) > default.

**large_activity_score_steps** -- demonstrates override with complex value:

The default is an array of 4 score step objects. The equity override replaces the entire array:
```json
"overrides": [
  {
    "match": {"asset_class": "equity"},
    "value": [
      {"min_value": 0, "max_value": 25000, "score": 0},
      {"min_value": 25000, "max_value": 100000, "score": 3},
      {"min_value": 100000, "max_value": 500000, "score": 7},
      {"min_value": 500000, "max_value": null, "score": 10}
    ],
    "priority": 1
  }
]
```

### 4.4 Match Patterns

Nine reusable match patterns are defined in `workspace/metadata/match_patterns/`:

| pattern_id | Label | Match Object | Layer |
|------------|-------|-------------|-------|
| `commodity_instruments` | Commodity Instruments | `{"asset_class": "commodity"}` | oob |
| `equity_nyse` | Equity on NYSE | `{"asset_class": "equity", "exchange_mic": "XNYS"}` | oob |
| `equity_stocks` | Equity Stocks | `{"asset_class": "equity"}` | oob |
| `fixed_income_all` | Fixed Income (All) | `{"asset_class": "fixed_income"}` | oob |
| `fixed_income_bonds` | Fixed Income Bonds | `{"asset_class": "fixed_income", "instrument_type": "bond"}` | oob |
| `fx_instruments` | FX Instruments | `{"asset_class": "fx"}` | oob |
| `index_instruments` | Index Instruments | `{"asset_class": "index"}` | oob |
| `nasdaq_listed` | NASDAQ Listed | `{"exchange_mic": "XNAS"}` | oob |
| `nyse_listed` | NYSE Listed | `{"exchange_mic": "XNYS"}` | oob |

All patterns have `"layer": "oob"` (out-of-box). Match keys used across patterns: `asset_class`, `exchange_mic`, `instrument_type`. Patterns are not referenced directly by settings overrides -- the `match` objects in overrides duplicate the same key-value pairs rather than referencing pattern IDs.

---

## 5. Score Templates

Seven reusable score templates are defined in `workspace/metadata/score_templates/`:

### 5.1 Template Inventory

| template_id | Label | Category | Steps | Score Range |
|-------------|-------|----------|-------|-------------|
| `volume_standard` | Standard Volume Tiers | volume | 4 | 0-10K: 1, 10K-100K: 3, 100K-1M: 7, 1M+: 10 |
| `volume_fx` | FX Volume Tiers | volume | 4 | 0-100K: 1, 100K-1M: 3, 1M-10M: 7, 10M+: 10 |
| `ratio_binary` | Binary Ratio Check | ratio | 2 | 0-0.5: 0, 0.5-1.0: 10 |
| `ratio_graduated` | Graduated Ratio Scoring | ratio | 4 | 0-0.25: 1, 0.25-0.5: 3, 0.5-0.75: 7, 0.75-1.0: 10 |
| `percentage_standard` | Standard Percentage Tiers | percentage | 4 | 0-5%: 1, 5-15%: 3, 15-30%: 7, 30%+: 10 |
| `count_high` | High Count Alerts | count | 4 | 0-10: 1, 10-50: 3, 50-100: 7, 100+: 10 |
| `count_low` | Low Count Alerts | count | 4 | 0-2: 0, 3-5: 3, 5-10: 7, 10+: 10 |

### 5.2 Template Categories

- **volume** (2 templates): Standard and FX-specific volume tiers. FX thresholds are 10x higher than standard (reflecting the typical FX notional scale).
- **ratio** (2 templates): Binary (pass/fail at 0.5) and graduated (4-tier progressive). Both operate on 0-1.0 range.
- **percentage** (1 template): Standard percentage tiers from 0-30%+.
- **count** (2 templates): High-frequency (10-100+ range) and low-frequency (2-10+ range) event counts.

All templates produce scores in the 0-10 range. Each step defines a `min_value`/`max_value` band and a fixed `score` for values in that band. The last step in each template uses `"max_value": null` to capture unbounded upper values.

All templates have `"layer": "oob"` (out-of-box) and were created at `2026-02-25T10:00:00Z`.

Note: These templates exist as reusable building blocks but are **not directly referenced** by the current detection model or score_steps settings. The score_steps settings define their own inline step arrays rather than referencing template IDs.

---

## 6. Summary of Limitations

The following are factual limitations of the current architecture, based on the metadata structures documented above:

- **No unified results table**: Each calculation writes to its own `calc_*` table (10 separate tables). Detection model queries must JOIN across multiple tables. There is no single table where all calculation results for a given granularity row are consolidated.

- **Hardcoded detection granularity**: All 5 detection models use the same granularity fields: `["product_id", "account_id"]`. This is specified per-model but there is no mechanism to vary granularity at the calculation level or create cross-entity granularity (e.g., trader-level, desk-level, account-group-level detection).

- **Manual integer priority on overrides**: Override precedence is controlled by a manually-assigned `priority` integer (1, 2, 100 in current data). There is no automatic specificity calculation -- a more specific match does not automatically win over a broader match unless the author manually assigns a higher priority number.

- **No formal calculation instance concept**: When two detection models reference the same calculation (e.g., `large_trading_activity` is used by wash_full_day, wash_intraday, market_price_ramping, and insider_dealing), the calculation always runs identically. There is no way to parameterize the same calculation differently per model invocation.

- **No entity graph reachability**: Entity relationships are declared as pairwise join fields, but there is no graph traversal capability. Queries like "all accounts connected to a trader through any path" require manually chaining joins. The relationship model supports `one_to_many` and `many_to_one` but has no transitive closure.

- **Match patterns not typed**: The `match` object in both settings overrides and match patterns is an untyped JSON dictionary. Any key can be used. There is no schema validating that match keys correspond to actual entity fields, and no enforcement that match pattern definitions and settings override matches use the same vocabulary.

- **Time windows not first-class objects**: Three of the four time window calculations (`trend_window`, `cancellation_pattern`, `market_event_window`) read directly from entity tables rather than from upstream calculations. They are structurally parallel to each other but there is no shared time window abstraction. Each defines its own window_start/window_end semantics independently.

- **Score templates disconnected from score_steps settings**: The 7 score templates in `score_templates/` and the 5 score_steps settings in `settings/score_steps/` are independent -- score_steps settings define their own inline step arrays rather than referencing template IDs. Templates exist as UI building blocks but are not wired into the resolution chain.

- **Literal parameters not overridable**: Calculations that use `"source": "literal"` parameters (e.g., `price_change_threshold: 0.05` in market_event_window, `qty_threshold: 0.5` in wash_detection) have hardcoded values that cannot be tuned per asset class or venue without modifying the calculation JSON itself.
