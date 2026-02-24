# Phase 6: Data Model Deep Refinement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the platform's data model with industry standards (FIX Protocol, ISO identifiers, exchange data models) to make it credible for domain experts while maintaining demo usability.

**Architecture:** Full-stack changes across 4 layers: (1) entity definitions & data generation, (2) calculation SQL, (3) detection models, (4) frontend display. All changes flow through `scripts/generate_data.py` → CSV → DuckDB → API → frontend.

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript (frontend). No new dependencies.

---

## Context

Phase 5 (M34-M48) delivered a working platform with 5 entities (product, execution, order, md_intraday, md_eod), 10 calculations, 5 detection models, and a dashboard. However, a domain expert review revealed significant data modeling gaps:

- **Product classification errors**: FX pairs classified as `instrument_type: "stock"`, futures classified under `asset_class: "equity"`
- **Missing standard identifiers**: No ISIN, no CFI code, no MIC codes, no underlying product references for derivatives
- **Thin order model**: No order type, limit price, time-in-force, trader link, or proper lifecycle statuses
- **Incomplete market data**: EOD missing Open/High/Low, intraday missing bid/ask, only generated for equities
- **Missing dimension entities**: Account, Trader, and Venue exist only as opaque ID strings with no backing entity

This phase corrects all of the above to align with FIX Protocol, ISO 10962/6166/10383/4217, and surveillance requirements (MiFID II, FINRA CAT).

---

## Milestones Overview

| # | Milestone | Area | Deps |
|---|-----------|------|------|
| M49 | Save plan & update progress | Docs | — |
| M50 | Venue entity (new, 6 rows) | Entity | M49 |
| M51 | Product entity overhaul | Entity | M50 |
| M52 | Account entity (new, 220 rows) | Entity | M49 |
| M53 | Trader entity (new, 50 rows) | Entity | M49 |
| M54 | Order entity overhaul | Entity | M51,M52,M53 |
| M55 | Execution entity overhaul | Entity | M54 |
| M56 | MD_EOD overhaul (OHLCV) | Entity | M51 |
| M57 | MD_Intraday overhaul (bid/ask, expanded coverage) | Entity | M51 |
| M58 | Update calculation SQL | Calcs | M55,M56,M57 |
| M59 | Update detection model SQL | Models | M58 |
| M60 | Update tests | Tests | M59 |
| M61 | Regenerate data & snapshots | Data | M60 |
| M62 | Frontend: entity display updates | Frontend | M61 |
| M63 | Frontend: dashboard & alert detail updates | Frontend | M62 |
| M64 | Build, test, verify | Verify | M63 |
| M65 | Documentation | Docs | M64 |

**Critical Path:** M49→M50→M51→M54→M55→M58→M59→M60→M61→M62→M64→M65

**Parallel after M49:** M50, M52, M53 can run in parallel (independent new entities)

---

## Entity Specifications

### E1: Venue (NEW — 6 rows)

Purpose: Reference data for trading venues with ISO MIC codes, trading hours, and friendly display names.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| mic | VARCHAR(4) | NO | PK | ISO 10383 Market Identifier Code | `XNYS` |
| name | VARCHAR | NO | — | Display name | `New York Stock Exchange` |
| short_name | VARCHAR | NO | — | Abbreviated name for UI | `NYSE` |
| country | VARCHAR(2) | NO | — | ISO 3166-1 alpha-2 | `US` |
| timezone | VARCHAR | NO | — | IANA timezone | `America/New_York` |
| open_time | VARCHAR | NO | — | Regular session open (local) | `09:30:00` |
| close_time | VARCHAR | NO | — | Regular session close (local) | `16:00:00` |
| asset_classes | VARCHAR | NO | — | Supported asset classes (comma-sep) | `equity,option` |

**Static data (6 rows):**

| mic | name | short_name | country | timezone | open | close | asset_classes |
|-----|------|-----------|---------|----------|------|-------|---------------|
| XNYS | New York Stock Exchange | NYSE | US | America/New_York | 09:30:00 | 16:00:00 | equity |
| XNAS | Nasdaq Stock Market | NASDAQ | US | America/New_York | 09:30:00 | 16:00:00 | equity |
| XCBO | Cboe Options Exchange | CBOE | US | America/Chicago | 08:30:00 | 15:00:00 | equity,option |
| XCME | Chicago Mercantile Exchange | CME | US | America/Chicago | 17:00:00 | 16:00:00 | index,commodity,fixed_income |
| XNYM | New York Mercantile Exchange | NYMEX | US | America/New_York | 18:00:00 | 17:00:00 | commodity |
| XXXX | Off-Exchange / OTC | OTC | — | UTC | 00:00:00 | 23:59:59 | fx,commodity |

---

### E2: Product (OVERHAUL — 50 rows)

Purpose: Master dimension for all tradeable instruments with ISO identifiers, proper classification, underlying relationships, and display-friendly fields.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| product_id | VARCHAR | NO | PK | Internal ticker/symbol | `AAPL` |
| isin | VARCHAR(12) | YES | — | ISO 6166 (null for FX spot, some commodities) | `US0378331005` |
| sedol | VARCHAR(7) | YES | — | SEDOL code (optional, for demo breadth) | `2046251` |
| ticker | VARCHAR | NO | — | Display ticker (same as product_id for most) | `AAPL` |
| name | VARCHAR | NO | — | Full display name | `Apple Inc.` |
| asset_class | VARCHAR | NO | — | Corrected taxonomy | `equity`, `fx`, `commodity`, `fixed_income`, `index` |
| instrument_type | VARCHAR | NO | — | Specific type within class | `common_stock`, `spot`, `future`, `call_option`, `put_option`, `government_bond` |
| cfi_code | VARCHAR(6) | YES | — | ISO 10962 Classification code | `ESXXXX`, `OCAFXX`, `FXXXXX` |
| underlying_product_id | VARCHAR | YES | FK→product | For derivatives: underlying product | `AAPL` (for AAPL_C150) |
| contract_size | DECIMAL | YES | — | Multiplier (options/futures) | `100`, `1000` |
| strike_price | DECIMAL | YES | — | Strike for options | `150.00` |
| expiry_date | DATE | YES | — | Expiry/maturity date | `2024-03-15` |
| exchange_mic | VARCHAR(4) | NO | FK→venue | Primary listing venue (ISO 10383) | `XNYS` |
| currency | VARCHAR(3) | NO | — | ISO 4217 quotation currency | `USD` |
| tick_size | DECIMAL | YES | — | Minimum price increment | `0.01` |
| lot_size | INTEGER | YES | — | Standard lot size | `100` |
| base_price | DECIMAL | YES | — | Reference price for data generation | `185.00` |

**Asset Class Correction Map:**

| Products | Old asset_class | Old instrument_type | New asset_class | New instrument_type |
|----------|----------------|--------------------|-----------------|--------------------|
| AAPL, MSFT, etc. (25) | equity | stock | equity | common_stock |
| EURUSD, GBPUSD, etc. (6) | fx | stock | fx | spot |
| GOLD, SILVER, etc. (8) | commodity | stock | commodity | spot |
| AAPL_C150, TSLA_C250, NVDA_C500, AMZN_C180 | equity | option | equity | call_option |
| AAPL_P140, TSLA_P200 | equity | option | equity | put_option |
| ES_FUT, NQ_FUT | equity | future | index | future |
| CL_FUT | equity | future | commodity | future |
| GC_FUT | equity | future | commodity | future |
| ZB_FUT | equity | future | fixed_income | future |

**Underlying Relationships:**

| Derivative | underlying_product_id |
|-----------|----------------------|
| AAPL_C150, AAPL_P140 | AAPL |
| TSLA_C250, TSLA_P200 | TSLA |
| NVDA_C500 | NVDA |
| AMZN_C180 | AMZN |
| ES_FUT, NQ_FUT | null (index — no tradeable underlying in demo) |
| CL_FUT | null (commodity — no spot product for oil in product table) |
| GC_FUT | GOLD |
| ZB_FUT | null (bond — no underlying bond in product table) |

**ISIN examples (real for equities):**

| product_id | isin |
|-----------|------|
| AAPL | US0378331005 |
| MSFT | US5949181045 |
| GOOGL | US02079K3059 |
| AMZN | US0231351067 |
| TSLA | US88160R1014 |
| JPM | US46625H1005 |
| (FX/commodity) | null |

**CFI Code mapping:**

| instrument_type | cfi_code |
|----------------|----------|
| common_stock | ESXXXX |
| call_option | OCAFXX |
| put_option | OPAFXX |
| future | FXXXXX |
| spot (FX) | MRCXXX |
| spot (commodity) | TCXXXX |

---

### E3: Account (NEW — 220 rows)

Purpose: Trading account dimension with type classification, country, and risk rating. Already built in memory by the generator — this persists it.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| account_id | VARCHAR | NO | PK | Unique account ID | `ACC-101` |
| account_name | VARCHAR | NO | — | Display name | `Apex Capital Growth Fund` |
| account_type | VARCHAR | NO | — | Classification | `institutional`, `retail`, `hedge_fund`, `market_maker` |
| registration_country | VARCHAR(2) | NO | — | ISO 3166-1 alpha-2 | `US`, `GB`, `KY` |
| primary_trader_id | VARCHAR | YES | FK→trader | Default trader | `TRD-026` |
| status | VARCHAR | NO | — | Account status | `ACTIVE` |
| risk_rating | VARCHAR | YES | — | Internal risk tier | `LOW`, `MEDIUM`, `HIGH` |
| onboarding_date | DATE | YES | — | Date opened | `2023-06-15` |

---

### E4: Trader (NEW — 50 rows)

Purpose: Trader dimension. Already built in memory by the generator — this persists it.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| trader_id | VARCHAR | NO | PK | Unique trader ID | `TRD-026` |
| trader_name | VARCHAR | NO | — | Full name | `James Smith` |
| desk | VARCHAR | NO | — | Trading desk | `Equity Flow`, `FX Spot`, `Derivatives` |
| trader_type | VARCHAR | NO | — | Role type | `execution`, `portfolio`, `algorithmic` |
| hire_date | DATE | YES | — | Start date | `2022-03-15` |
| status | VARCHAR | NO | — | Status | `ACTIVE` |

---

### E5: Order (OVERHAUL — ~25K rows)

Purpose: Full order lifecycle with type, limit price, time-in-force, trader link, execution link, and FIX-aligned statuses.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| order_id | VARCHAR | NO | PK | Unique order ID | `ORD-000001` |
| product_id | VARCHAR | NO | FK→product | Instrument | `AAPL` |
| account_id | VARCHAR | NO | FK→account | Trading account | `ACC-101` |
| trader_id | VARCHAR | NO | FK→trader | Trader (NEW) | `TRD-026` |
| side | VARCHAR | NO | — | BUY / SELL | `BUY` |
| order_type | VARCHAR | NO | — | FIX OrdType (NEW) | `MARKET`, `LIMIT` |
| limit_price | DECIMAL | YES | — | Price for LIMIT orders (NEW) | `185.00` |
| quantity | DECIMAL | NO | — | Original qty | `500` |
| filled_quantity | DECIMAL | NO | — | Qty filled (NEW, default 0) | `500` or `0` |
| order_date | DATE | NO | — | Placement date | `2024-01-15` |
| order_time | VARCHAR | NO | — | Placement time (HH:MM:SS.fff) | `09:35:12.456` |
| status | VARCHAR | NO | — | FIX OrdStatus (expanded) | `NEW`, `FILLED`, `PARTIALLY_FILLED`, `CANCELLED`, `REJECTED` |
| time_in_force | VARCHAR | NO | — | FIX TimeInForce (NEW) | `DAY`, `GTC`, `IOC`, `FOK` |
| execution_id | VARCHAR | YES | FK→execution | Link to fill (NEW) | `EXE-000001` or null |
| venue_mic | VARCHAR(4) | YES | — | Routing venue (NEW) | `XNYS` |

**Key changes:** `PENDING` → `NEW`, added trader_id, order_type, limit_price, filled_quantity, time_in_force, execution_id FK, venue_mic.

**Generation rules by pattern:**
- Normal trades: `order_type=MARKET`, `status=FILLED`, `filled_quantity=quantity`, `time_in_force=DAY`
- Spoofing cancelled: `order_type=LIMIT`, `limit_price=near_market`, `status=CANCELLED`, `filled_quantity=0`, `time_in_force=IOC`
- Wash trades: `order_type=LIMIT`, `limit_price=near_vwap`, `status=FILLED`, `time_in_force=DAY`
- MPR trades: `order_type=MARKET`, `status=FILLED`, `time_in_force=DAY`
- Insider trades: `order_type=LIMIT`, `status=FILLED`, `time_in_force=GTC`

---

### E6: Execution (OVERHAUL — ~25K rows)

Purpose: Trade execution with order link, venue, exec type, and capacity.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| execution_id | VARCHAR | NO | PK | Unique execution ID | `EXE-000001` |
| order_id | VARCHAR | NO | FK→order | Originating order (NEW) | `ORD-000001` |
| product_id | VARCHAR | NO | FK→product | Instrument | `AAPL` |
| account_id | VARCHAR | NO | FK→account | Account | `ACC-101` |
| trader_id | VARCHAR | NO | FK→trader | Trader | `TRD-026` |
| side | VARCHAR | NO | — | BUY / SELL | `BUY` |
| price | DECIMAL | NO | — | Execution price | `185.02` |
| quantity | DECIMAL | NO | — | Executed qty | `500` |
| execution_date | DATE | NO | — | Trade date | `2024-01-15` |
| execution_time | VARCHAR | NO | — | Time with ms (NEW) | `09:35:12.345` |
| venue_mic | VARCHAR(4) | NO | — | Execution venue (NEW) | `XNYS` |
| exec_type | VARCHAR | NO | — | FIX ExecType (NEW) | `FILL`, `PARTIAL_FILL` |
| capacity | VARCHAR | NO | — | Principal/Agency (NEW) | `AGENCY`, `PRINCIPAL` |

---

### E7: MD_EOD (OVERHAUL — ~2,500 rows)

Purpose: Full OHLCV daily bars for all products.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| product_id | VARCHAR | NO | PK* | Product | `AAPL` |
| trade_date | DATE | NO | PK* | Trading date | `2024-01-15` |
| open_price | DECIMAL | NO | — | Day open (NEW) | `184.50` |
| high_price | DECIMAL | NO | — | Intraday high (NEW) | `186.20` |
| low_price | DECIMAL | NO | — | Intraday low (NEW) | `183.80` |
| close_price | DECIMAL | NO | — | Day close | `185.00` |
| volume | BIGINT | NO | — | Total daily volume | `42376319` |
| prev_close | DECIMAL | YES | — | Previous close (NEW) | `184.65` |
| num_trades | INTEGER | YES | — | Trade count (NEW) | `1247` |
| vwap | DECIMAL | YES | — | Volume-weighted avg (NEW) | `184.92` |

---

### E8: MD_Intraday (OVERHAUL — ~36K rows, expanded to FX + futures)

Purpose: Tick-level trade data with Level 1 bid/ask for all liquid products.

| Field | Type | Nullable | Key | Description | Sample |
|-------|------|----------|-----|-------------|--------|
| product_id | VARCHAR | NO | — | Product | `AAPL` |
| trade_date | DATE | NO | — | Trade date | `2024-01-15` |
| trade_time | VARCHAR | NO | — | Time with ms (enhanced) | `09:35:12.456` |
| trade_price | DECIMAL | NO | — | Trade price | `185.02` |
| trade_quantity | INTEGER | NO | — | Trade size | `972` |
| bid_price | DECIMAL | YES | — | Best bid at trade time (NEW) | `185.00` |
| ask_price | DECIMAL | YES | — | Best ask at trade time (NEW) | `185.04` |
| trade_condition | VARCHAR | YES | — | Condition code (NEW) | `@` (regular) |

**Coverage expansion:** Currently equities only. Add intraday for: 6 FX pairs + ES_FUT, NQ_FUT, CL_FUT, GC_FUT (~10-15 ticks/day per product).

---

## Milestone Details

### M49: Save Plan & Update Progress

**Files:** `docs/plans/2026-02-24-phase6-data-model-plan.md`, `docs/progress.md`

1. Save this plan to `docs/plans/`
2. Update `docs/progress.md` with Phase 6 milestones M49-M65
3. Commit

---

### M50: Venue Entity

**Files:**
- Create: `workspace/metadata/entities/venue.json`
- Modify: `scripts/generate_data.py` — add `_write_venue_csv()`

1. Create venue entity definition JSON with all fields and domain values
2. Add `_write_venue_csv()` method to generator — writes the 6 static rows
3. Call it from `_write_csvs()`
4. Run `uv run python -m scripts.generate_data` and verify `workspace/data/csv/venue.csv`
5. Run tests: `uv run pytest tests/ -v`
6. Commit

---

### M51: Product Entity Overhaul

**Files:**
- Modify: `workspace/metadata/entities/product.json`
- Modify: `scripts/generate_data.py` — `_build_product_catalog()`, `_write_product_csv()`, `_write_entity_definitions()`

1. Update `_build_product_catalog()`:
   - Fix instrument_type: stock→common_stock, FX stock→spot, commodity stock→spot
   - Fix asset_class: ES_FUT/NQ_FUT→index, CL_FUT→commodity, GC_FUT→commodity, ZB_FUT→fixed_income
   - Merge option_type into instrument_type: call_option, put_option (keep option_type field too for backward compat)
   - Add exchange_mic mapping: NYSE→XNYS, CBOE→XCBO, CME→XCME, OTC→XXXX
   - Add underlying_product_id for all derivatives
   - Add strike_price extracted from option names
   - Add expiry_date (2024-03-15 for options, 2024-03-29 for futures)
   - Add isin (real ISINs for 25 equities, null for others)
   - Add sedol (null for demo — placeholder field)
   - Add ticker (= product_id)
   - Add cfi_code per instrument_type
   - Add tick_size and lot_size per instrument_type
   - Add base_price (already exists internally, just expose)

2. Update `_write_product_csv()` with new fieldnames
3. Update product.json entity definition with all new fields
4. Run generator, verify product.csv has correct values
5. Run tests
6. Commit

---

### M52: Account Entity

**Files:**
- Create: `workspace/metadata/entities/account.json`
- Modify: `scripts/generate_data.py` — add `_write_account_csv()`

1. Create account entity definition JSON
2. Enhance `_build_accounts()` to add: account_name (generated), registration_country (US default, KY for hedge funds), status (ACTIVE), risk_rating (based on type), onboarding_date
3. Add `_write_account_csv()` method
4. Call from `_write_csvs()`
5. Run generator, verify account.csv
6. Run tests
7. Commit

---

### M53: Trader Entity

**Files:**
- Create: `workspace/metadata/entities/trader.json`
- Modify: `scripts/generate_data.py` — add `_write_trader_csv()`

1. Create trader entity definition JSON
2. Enhance `_build_traders()` to add: desk (based on assigned products), trader_type, hire_date, status
3. Add `_write_trader_csv()` method
4. Call from `_write_csvs()`
5. Run generator, verify trader.csv
6. Run tests
7. Commit

---

### M54: Order Entity Overhaul

**Files:**
- Modify: `workspace/metadata/entities/order.json` (was `execution.json` for order)
- Modify: `scripts/generate_data.py` — all order generation sites

1. Update order generation across ALL pattern sites:
   - Normal trading: add trader_id, order_type=MARKET, filled_quantity=quantity, time_in_force=DAY, execution_id=matching exec, venue_mic=product exchange_mic
   - Wash patterns: order_type=LIMIT, limit_price=trade price, time_in_force=DAY
   - MPR patterns: order_type=MARKET, time_in_force=DAY
   - Insider patterns: order_type=LIMIT, limit_price=trade price, time_in_force=GTC
   - Spoofing patterns: cancelled orders get order_type=LIMIT, limit_price=near market, time_in_force=IOC, filled_quantity=0
2. Rename status PENDING→NEW
3. Update order.json entity definition
4. Update CSV fieldnames
5. Run generator, verify order.csv
6. Run tests
7. Commit

---

### M55: Execution Entity Overhaul

**Files:**
- Modify: `workspace/metadata/entities/execution.json`
- Modify: `scripts/generate_data.py` — all execution generation sites

1. Update execution generation across ALL sites:
   - Add order_id: generate matching ORD-XXXXXX for each execution
   - Add venue_mic: product's exchange_mic
   - Add exec_type: FILL for all (PARTIAL_FILL not used in demo)
   - Add capacity: AGENCY for institutional/retail/hedge_fund, PRINCIPAL for market_maker
   - Add milliseconds to execution_time: `.{rng.randint(0,999):03d}`
2. Update execution.json entity definition
3. Update CSV fieldnames
4. Run generator, verify execution.csv
5. Run tests
6. Commit

---

### M56: MD_EOD Overhaul

**Files:**
- Modify: `workspace/metadata/entities/md_eod.json`
- Modify: `scripts/generate_data.py` — `_generate_eod_data()`

1. Update EOD generation:
   - Track open_price (first price of day, slight offset from prev_close)
   - Track high_price (max of open/close + daily volatility)
   - Track low_price (min of open/close - daily volatility)
   - Add prev_close (lag from previous day)
   - Add num_trades (random 500-3000 based on volume tier)
   - Add vwap (weighted average between low and high, biased toward close)
2. For equities with intraday data: derive OHLC from intraday ticks (open=first tick, high=max, low=min, close=last tick)
3. Update md_eod.json entity definition
4. Update CSV fieldnames
5. Run generator, verify md_eod.csv has all 10 columns
6. Run tests
7. Commit

---

### M57: MD_Intraday Overhaul

**Files:**
- Modify: `workspace/metadata/entities/md_intraday.json`
- Modify: `scripts/generate_data.py` — `_generate_intraday_data()`

1. Expand coverage: add FX pairs (EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD) and key futures (ES_FUT, NQ_FUT, CL_FUT, GC_FUT) with ~10-15 ticks/day
2. Add bid_price/ask_price: derived from trade_price ± spread/2 (spread varies by product type: equity 0.01-0.05, FX 0.0001-0.0005, futures 0.25-1.00)
3. Add trade_condition: `@` for regular trades
4. Add milliseconds to trade_time
5. Update md_intraday.json entity definition
6. Update CSV fieldnames
7. Run generator, verify expanded intraday data
8. Run tests
9. Commit

---

### M58: Update Calculation SQL

**Files:** All files in `workspace/metadata/calculations/`

Review and update each calculation's SQL:

1. **value_calc.json**: Verify CASE on instrument_type still works (it matches `option`/`future` explicitly, catches rest in ELSE → still works with `common_stock`/`spot`). BUT: now `call_option`/`put_option` instead of `option`. **Must update** CASE to match `'call_option'` OR `'call_option'` instead of `'option'`.
2. **adjusted_direction.json**: Same — must match `call_option`/`put_option` instead of `'option'`.
3. **trend_window.json**: No change needed (reads trade_price from intraday, ignoring new columns). But will now detect trends on FX and futures too.
4. **market_event_window.json**: Reads close_price and volume from md_eod. Can optionally use `prev_close` instead of LAG(). No breaking change.
5. **cancellation_pattern.json**: Reads from order table. No field rename issues (status=CANCELLED unchanged).
6. **All aggregation/derived calcs**: No entity direct references. No changes.
7. Run all calc tests
8. Commit

---

### M59: Update Detection Model SQL

**Files:** All 5 files in `workspace/metadata/detection_models/`

1. **All models**: Currently JOIN `product p` and SELECT `p.asset_class, p.instrument_type`. Values change but the SQL doesn't filter by them — they pass through to entity_context. **No SQL changes needed** — but verify entity_context in alerts now contains corrected values.
2. Review settings overrides that match on `asset_class`: any override for `asset_class=equity` won't match ES_FUT/NQ_FUT anymore (now `index`). Check `workspace/metadata/settings/` for overrides that need updating.
3. Run detection tests
4. Commit

---

### M60: Update Tests

**Files:** All test files in `tests/`

1. Update test fixtures that create execution/order data with old schema (add new columns)
2. Update product test fixtures (instrument_type values, new fields)
3. Add tests for new entities: account.csv, trader.csv, venue.csv generation
4. Update assertion values (instrument_type `stock` → `common_stock`, etc.)
5. Run full suite: `uv run pytest tests/ -v`
6. Commit

---

### M61: Regenerate Data & Snapshots

1. Run: `uv run python -m scripts.generate_data`
2. Verify all CSVs: product.csv (50 rows, new fields), venue.csv (6 rows), account.csv (220 rows), trader.csv (50 rows), execution.csv (new fields), order.csv (new fields), md_eod.csv (OHLCV), md_intraday.csv (expanded)
3. Run: `uv run python -m scripts.generate_snapshots`
4. Run full tests
5. Commit

---

### M62: Frontend Entity Display Updates

**Files:**
- Modify: `frontend/src/views/EntityDesigner/index.tsx` — entity detail rendering
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/EntityContext.tsx` — entity context display
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/RelatedOrders.tsx` — order grid columns

1. EntityDesigner: Verify new entities (venue, account, trader) auto-load and display correctly
2. RelatedOrders: Add columns for new execution fields (venue_mic, exec_type, capacity) and update order columns if the orders view is visible
3. EntityContext: Ensure new entity context fields display properly (corrected asset_class, instrument_type values)
4. Product display: Show ticker as primary display, with ISIN/CFI available on hover or in detail view
5. Venue display: Show short_name (NYSE) as primary, with MIC code (XNYS) available
6. Build frontend
7. Commit

---

### M63: Frontend Dashboard & Alert Detail Updates

**Files:**
- Modify: `frontend/src/views/Dashboard/index.tsx` — dashboard charts
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/MarketDataChart.tsx` — OHLC chart
- Modify: `frontend/src/stores/dashboardStore.ts` — if API response shape changes

1. Dashboard: Update "Alerts by Asset Class" pie chart to handle new asset classes (index)
2. MarketDataChart: Update to display OHLC candlesticks instead of line chart (TradingView supports CandlestickSeries)
3. Alert Detail: If order detail is shown, add order_type, limit_price, time_in_force display
4. Build frontend
5. Commit

---

### M64: Build, Test & Verify

1. Frontend build: `cd frontend && npm run build`
2. Full test suite: `uv run pytest tests/ -v`
3. Start server, Playwright verification:
   - Entity Designer: verify all 8 entities visible, product shows ISIN/CFI/MIC fields
   - Entity Designer: verify venue entity with MIC codes and friendly names
   - Entity Designer: verify account, trader entities
   - SQL Console: `SELECT * FROM product LIMIT 5` — verify new fields
   - SQL Console: `SELECT * FROM venue` — verify 6 rows
   - SQL Console: `SELECT * FROM account LIMIT 5` — verify account entity
   - SQL Console: `SELECT * FROM "order" LIMIT 5` — verify order_type, limit_price, time_in_force
   - SQL Console: `SELECT * FROM execution LIMIT 5` — verify venue_mic, exec_type
   - SQL Console: `SELECT * FROM md_eod LIMIT 5` — verify OHLCV columns
   - Dashboard: verify asset class chart shows index as separate slice
   - Alert Detail: verify entity context shows corrected asset_class/instrument_type
4. Fix any issues
5. Commit

---

### M65: Documentation

**Files:** `docs/progress.md`, `docs/demo-guide.md`

1. Update progress tracker with M49-M65
2. Update demo guide with data model changes
3. Commit

---

## Verification Checklist

1. `npm run build` — no TypeScript errors
2. `uv run pytest -v` — all tests pass
3. Product entity: 50 rows, 17 fields, correct asset_class/instrument_type for all products
4. Product: ISINs on equities, CFI codes on all, MIC codes instead of names
5. Venue: 6 rows with MIC, friendly name, and trading hours
6. Account: 220 rows with type, country, risk rating
7. Trader: 50 rows with desk, type, status
8. Order: order_type, limit_price, time_in_force, trader_id, execution_id FK
9. Execution: order_id FK, venue_mic, exec_type, capacity, millisecond times
10. MD_EOD: OHLCV (Open + High + Low + Close + Volume) for all products
11. MD_Intraday: bid/ask prices, expanded to FX + futures
12. Calculations: value_calc handles call_option/put_option correctly
13. Detection models: entity_context contains corrected taxonomy values
14. Dashboard: asset class chart reflects new classes (index, etc.)
15. Alert Detail: OHLC candlestick chart (if implemented)
16. All demo checkpoints still work (regression)

## Critical Files

- `scripts/generate_data.py` — ALL entity data generation (primary change target)
- `workspace/metadata/entities/*.json` — All 8 entity definitions
- `workspace/metadata/calculations/transaction/value_calc.json` — instrument_type CASE logic
- `workspace/metadata/calculations/transaction/adjusted_direction.json` — option type CASE logic
- `workspace/metadata/detection_models/*.json` — 5 model queries
- `workspace/metadata/settings/` — override values that match on asset_class
- `backend/engine/detection_engine.py` — entity_context extraction
- `backend/services/alert_service.py` — alert summary persistence
- `tests/` — ~11 test files need fixture updates
- `frontend/src/views/Dashboard/index.tsx` — asset class chart
- `frontend/src/views/RiskCaseManager/AlertDetail/` — order display, market chart
