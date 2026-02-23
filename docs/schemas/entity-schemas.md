# Entity Schemas

Canonical entity definitions for the Analytics Platform Demo. Each entity is defined as a JSON file in `workspace/metadata/entities/`.

---

## execution (Trade Execution)

Individual trade executions (fills) across all instrument types.

| Field | Type | Nullable | Key | Description |
|-------|------|----------|-----|-------------|
| execution_id | string | No | PK | Unique execution identifier |
| product_id | string | No | | Product/instrument identifier (e.g., AAPL, EURUSD) |
| account_id | string | No | | Trading account identifier |
| trader_id | string | No | | Trader who executed the trade |
| side | string | No | | Trade direction: `BUY` or `SELL` |
| price | decimal | No | | Execution price per unit |
| quantity | decimal | No | | Number of units traded |
| instrument_type | string | No | | `stock`, `option`, `future` |
| asset_class | string | No | | `equity`, `fx`, `commodity` |
| execution_date | date | No | | Trade date (YYYY-MM-DD) |
| execution_time | string | No | | Trade time (HH:MM:SS) |
| contract_size | decimal | Yes | | Contract multiplier (options/futures only) |
| option_type | string | Yes | | `call` or `put` (options only) |

**Relationships:** order (many-to-one via product_id, account_id), md_eod (many-to-one via product_id)

**Sample Data:** 519 rows, 50 products, 220 accounts, 50 traders, date range 2024-01-02 to 2024-02-29

---

## order (Order)

Order records including fills, cancellations, and pending orders. Used for spoofing/layering detection.

| Field | Type | Nullable | Key | Description |
|-------|------|----------|-----|-------------|
| order_id | string | No | PK | Unique order identifier |
| product_id | string | No | | Product/instrument identifier |
| account_id | string | No | | Trading account identifier |
| side | string | No | | Order direction: `BUY` or `SELL` |
| order_time | string | No | | Order submission time (HH:MM:SS) |
| status | string | No | | `FILLED`, `CANCELLED`, or `PENDING` |
| quantity | decimal | No | | Order quantity |
| order_date | date | No | | Order date (YYYY-MM-DD) |

**Note:** The table name `order` is a SQL reserved word — always quote as `"order"` in DuckDB queries.

**Sample Data:** 532 rows, includes cancellation bursts for spoofing pattern detection

---

## md_intraday (Intraday Market Data)

Intraday trade-level market data used for trend detection and VWAP analysis.

| Field | Type | Nullable | Key | Description |
|-------|------|----------|-----|-------------|
| product_id | string | No | | Product identifier |
| trade_date | date | No | | Trading date (YYYY-MM-DD) |
| trade_time | string | No | | Trade time (HH:MM:SS) |
| trade_price | decimal | No | | Trade price |
| trade_quantity | integer | No | | Number of units traded |

**Sample Data:** 26,890 rows across 50 products, ~41 business days

---

## md_eod (End-of-Day Market Data)

Daily close prices and volumes used for market event detection and trend analysis.

| Field | Type | Nullable | Key | Description |
|-------|------|----------|-----|-------------|
| product_id | string | No | | Product identifier |
| trade_date | date | No | | Trading date (YYYY-MM-DD) |
| close_price | decimal | No | | Closing price for the day |
| volume | integer | No | | Total daily trading volume |

**Sample Data:** 2,150 rows (50 products x ~43 trading days)
