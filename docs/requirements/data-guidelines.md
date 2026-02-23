# Synthetic Data Generation Guidelines

**Status**: Approved
**Date**: 2026-02-23

---

## 1. General Principles

- **Real products and companies**: Use real company names, real ticker symbols, real exchanges. Research FIX/Refinitiv data structures for schemas.
- **Synthetic trading data**: All orders, executions, accounts, traders are fictional.
- **Deterministic by default**: Same data every run. Predictable demo.
- **Versioned generation**: Support `--version N` flag to generate a new data set with refined requirements. Each version is a complete, self-contained dataset.
- **Guaranteed alert triggers**: Data MUST be engineered to trigger specific detection models. The generation script understands the calculation logic and creates patterns that match.
- **Codes + display names**: All entities have both internal IDs (TRD-001, ACC-042) and human-readable display names (J. Smith, Global Equity Fund).

---

## 2. Date Range

- **2 months** of data (~44 business days)
- Suggested range: 2024-11-01 to 2024-12-31 (or similar — use real business calendar)
- Include proper business day handling (skip weekends, US holidays)

---

## 3. Products (50+ instruments)

### Asset Class Distribution

| Asset Class | Base Products | Derivatives | Total | Examples |
|---|---|---|---|---|
| **US Equities** | 20 stocks | 40+ options | ~60 | AAPL, MSFT, GOOGL, AMZN, TSLA, JPM, BAC, GS, XOM, CVX... |
| **FX** | 8 currency pairs | 4 FX forwards | ~12 | EUR/USD, GBP/USD, USD/JPY, USD/ILS, ILS/USD (reverse pair)... |
| **Fixed Income** | 5 bonds | 3 bond futures | ~8 | US 10Y Treasury, US 2Y, Corporate bonds... |
| **Commodities** | 3 futures | — | ~3 | Gold, Crude Oil, Natural Gas |

**Total: ~80+ instruments**

### Dual-Listed Companies
Include 2-3 companies listed on multiple exchanges:
- e.g., HSBC (NYSE + LSE), SAP (NYSE + XETRA), BHP (NYSE + ASX)

### Related Products (must be pre-defined)
- **Underlying**: Each option/future → its base stock/commodity
- **Index membership**: e.g., AAPL, MSFT, GOOGL → S&P 500 ETF (SPY)
- **FX reverse pairs**: USD/ILS ≡ ILS/USD
- **Sector peers**: e.g., AAPL + MSFT + GOOGL (tech), JPM + BAC + GS (banking)
- **Issuer**: Corporate bond → issuing company's stock

### Exchanges
- **NYSE** (New York Stock Exchange)
- **NASDAQ**
- **CME** (Chicago Mercantile Exchange — futures)
- **CBOE** (Chicago Board Options Exchange — options)
- **LSE** (London Stock Exchange — dual-listed)
- **XETRA** (Deutsche Börse — dual-listed)
- Add more as needed for FX (no specific exchange, OTC)

### Trading Sessions (per exchange)

| Exchange | Pre-Market | Regular Session | Post-Market | Timezone |
|---|---|---|---|---|
| NYSE | 04:00-09:30 | 09:30-16:00 | 16:00-20:00 | ET |
| NASDAQ | 04:00-09:30 | 09:30-16:00 | 16:00-20:00 | ET |
| CME | — | Varies by product | — | CT |
| CBOE | — | 09:30-16:00 | — | ET |
| LSE | — | 08:00-16:30 | — | GMT |
| XETRA | — | 09:00-17:30 | — | CET |
| FX (OTC) | — | 24/5 (Sun 17:00 - Fri 17:00 ET) | — | ET |

Session types to define: OPEN, CLOSE, REGULAR, PRE_MARKET, POST_MARKET, AUCTION

---

## 4. Organizational Structure (5+ BUs, 15+ desks)

### Business Units

| BU ID | Name | Focus |
|---|---|---|
| BU-EQ | Global Equities | US + International equity trading |
| BU-FI | Fixed Income | Government + corporate bonds |
| BU-FX | Foreign Exchange | Spot, forwards, swaps |
| BU-CM | Commodities | Metals, energy |
| BU-DV | Derivatives | Cross-asset derivatives |
| BU-WM | Wealth Management | Client advisory |

### Desks (15+)

| Desk ID | Name | BU | Focus |
|---|---|---|---|
| DSK-EQ-US | US Equity Flow | BU-EQ | US stock execution |
| DSK-EQ-EU | European Equity | BU-EQ | LSE, XETRA trading |
| DSK-EQ-OPT | Equity Options | BU-EQ | Listed options |
| DSK-EQ-PROP | Proprietary Trading | BU-EQ | Prop desk |
| DSK-FI-GOV | Government Bonds | BU-FI | Treasuries |
| DSK-FI-CORP | Corporate Bonds | BU-FI | IG + HY bonds |
| DSK-FI-RATE | Rates Trading | BU-FI | Interest rate products |
| DSK-FX-SPOT | FX Spot | BU-FX | Spot currency trading |
| DSK-FX-FWD | FX Forwards | BU-FX | Forward contracts |
| DSK-CM-MET | Metals | BU-CM | Gold, silver |
| DSK-CM-ENR | Energy | BU-CM | Oil, gas |
| DSK-DV-STR | Structured Products | BU-DV | Multi-leg, swaps |
| DSK-DV-VOL | Volatility Trading | BU-DV | Vol strategies |
| DSK-WM-HNW | High Net Worth | BU-WM | HNW client accounts |
| DSK-WM-INST | Institutional | BU-WM | Institutional clients |

---

## 5. Accounts & Traders (200+)

### Account Types
- **Proprietary** (prop desk) — ~20 accounts
- **Institutional** (pension funds, asset managers) — ~80 accounts
- **Corporate** (company treasury) — ~30 accounts
- **Client Advisory** (wealth management) — ~50 accounts
- **Market Making** — ~10 accounts
- **Algorithmic** — ~15 accounts

### Traders
- ~50 traders across all desks
- Each trader manages multiple accounts
- Codes: TRD-001 through TRD-050
- Display names: realistic fictional names (diverse international names)
- Each trader assigned to one desk

### Suspicious Accounts (10-15)

| # | Account | Pattern | Model(s) | Description |
|---|---|---|---|---|
| 1 | ACC-042 | Insider Dealing | IND | Bought AAPL options before earnings surprise |
| 2 | ACC-087 | Insider Dealing | IND | Accumulated bond positions before rate announcement |
| 3 | ACC-123 | Wash Trading | WASH | Offsetting buy/sell in same stock, same day |
| 4 | ACC-156 | Wash Trading | WASH | Cross-account wash (2 accounts, same trader) |
| 5 | ACC-034 | MPR | MPR | Aggressive buying during AAPL uptrend |
| 6 | ACC-078 | MPR + Trend | MPR | Bought puts during downtrend (adjusted direction = sell) |
| 7 | ACC-201 | Spoofing | SPOOF | Cancellation pattern with opposite-side fills |
| 8 | ACC-145 | Insider + Wash | IND, WASH | Insider accumulation + partial wash on some positions |
| 9 | ACC-099 | MPR + Large Activity | MPR | Dominated volume during trend in small-cap stock |
| 10 | ACC-167 | Spoofing + Layering | SPOOF | Layered orders within spread, cancelled post-fill |
| 11 | ACC-055 | Borderline Wash | — | VWAP proximity close to threshold but below (no alert) |
| 12 | ACC-189 | Borderline IND | — | Traded before event but volume not large enough |
| 13 | ACC-210 | Large Activity Only | — | Large trades but no manipulative pattern |

---

## 6. Order Data Model

### Order Version Structure

| Field | Type | Description |
|---|---|---|
| order_version_key | string | Composite: `{order_version_id}-{version_index}` (unique per version) |
| order_version_id | string | Lifecycle ID (constant across amendments) |
| version_index | integer | 0=new, 1=first amend, 2=second amend or cancel... |
| instruction | enum | NEW, AMEND, CANCEL |
| timestamp | timestamp | Microsecond precision |
| account_id | string | FK to accounts |
| trader_id | string | FK to traders |
| product_id | string | FK to products |
| exchange_id | string | FK to exchanges |
| side | enum | BUY, SELL |
| order_type | enum | MARKET, LIMIT, STOP, STOP_LIMIT, IOC, FOK |
| price | decimal | Order price (null for MARKET orders) |
| quantity | decimal | Order quantity |
| filled_quantity | decimal | Accumulated executed quantity at this version |
| remaining_quantity | decimal | quantity - filled_quantity |
| status | enum | NEW, PARTIALLY_FILLED, FILLED, CANCELLED, AMENDED, REJECTED |
| time_in_force | enum | DAY, GTC, IOC, FOK, GTD |

### Order Lifecycle Example

```
Order Version ID: ORD-10001
  Version 0: NEW    | BUY 1000 AAPL @ 185.50 | 10:30:01.123456 | filled: 0
  → Execution EXC-20001 fills 300 @ 185.50 (references ORD-10001-0)
  Version 1: AMEND  | BUY 1000 AAPL @ 186.00 | 10:32:15.789012 | filled: 300
  → Execution EXC-20002 fills 200 @ 186.00 (references ORD-10001-1)
  Version 2: CANCEL | BUY 1000 AAPL @ 186.00 | 10:35:44.321654 | filled: 500
  → No more executions
```

### Execution Structure

| Field | Type | Description |
|---|---|---|
| execution_id | string | Unique execution identifier |
| order_version_key | string | FK to the specific order version |
| order_version_id | string | FK to the order lifecycle |
| timestamp | timestamp | Microsecond precision |
| account_id | string | FK to accounts |
| trader_id | string | FK to traders |
| product_id | string | FK to products |
| exchange_id | string | FK to exchanges |
| side | enum | BUY, SELL |
| price | decimal | Execution price |
| quantity | decimal | Executed quantity |
| execution_type | enum | FILL, PARTIAL_FILL |

---

## 7. Market Data

### MD EOD (1 row per product per business day)

| Field | Type |
|---|---|
| product_id | string |
| exchange_id | string |
| business_date | date |
| open_price | decimal |
| high_price | decimal |
| low_price | decimal |
| close_price | decimal |
| volume | integer |
| value | decimal |
| num_trades | integer |

**Row estimate**: ~80 products × 44 days = ~3,520 rows

### MD Intraday — Public Trades (1 per product per minute during trading sessions)

| Field | Type |
|---|---|
| product_id | string |
| exchange_id | string |
| timestamp | timestamp (minute precision) |
| price | decimal |
| quantity | integer |
| value | decimal |
| session_type | enum (REGULAR, PRE_MARKET, POST_MARKET) |

**Row estimate**: ~50 traded products × ~390 min/day × 44 days = ~858,000 rows

### MD Quotes — Order Book (variable granularity)

| Field | Type |
|---|---|
| product_id | string |
| exchange_id | string |
| timestamp | timestamp |
| depth_level | integer (1, 2, 3) |
| bid_price | decimal |
| bid_quantity | integer |
| ask_price | decimal |
| ask_quantity | integer |
| spread | decimal |

**Granularity**:
- Weeks 1-7: 1 quote snapshot per product per minute during trading session
- Week 8 (last week): 3-10 random snapshots per product per minute (for spoofing/layering analysis)

**Row estimate**:
- Weeks 1-7: ~50 products × 390 min × 37 days × 3 depth levels = ~2.2M rows
- Week 8: ~50 products × 390 min × 5 days × ~6 avg × 3 depth levels = ~1.8M rows
- Total: ~4M rows (largest table — DuckDB handles easily in Parquet)

### News Feed (for market events)

| Field | Type |
|---|---|
| news_id | string |
| timestamp | timestamp |
| headline | string |
| product_id | string (nullable — may be about a company, not a specific product) |
| company_name | string |
| event_type | enum (EARNINGS, M_AND_A, MANAGEMENT_CHANGE, REGULATORY, PRODUCT_LAUNCH, BANKRUPTCY, OTHER) |
| significance | enum (HIGH, MEDIUM, LOW) |
| source | string |

Use real historical news events for chosen companies (approximate dates).

---

## 8. Domain Values

### Asset Classes
EQUITY, FIXED_INCOME, FX, COMMODITIES, DERIVATIVES

### Instrument Types
STOCK, BOND, OPTION, FUTURE, FORWARD, SWAP, ETF, CURRENCY_PAIR, FX_FORWARD

### Instrument Subtypes
- Options: CALL, PUT, AMERICAN, EUROPEAN
- Bonds: GOVERNMENT, CORPORATE, MUNICIPAL
- Futures: COMMODITY, INDEX, INTEREST_RATE

### Order Types
MARKET, LIMIT, STOP, STOP_LIMIT, IOC (Immediate or Cancel), FOK (Fill or Kill)

### Order Instructions
NEW, AMEND, CANCEL

### Order Status
NEW, PARTIALLY_FILLED, FILLED, CANCELLED, AMENDED, REJECTED

### Execution Types
FILL, PARTIAL_FILL

### Account Types
PROPRIETARY, INSTITUTIONAL, CORPORATE, CLIENT_ADVISORY, MARKET_MAKING, ALGORITHMIC

### Session Types
PRE_MARKET, REGULAR, POST_MARKET, AUCTION_OPEN, AUCTION_CLOSE

### Relationship Types
UNDERLYING, COMPOSITE_INDEX, FX_REVERSE_PAIR, SWAP_LEG, SECTOR_PEER, ISSUER, USER_DEFINED

---

## 9. Embedded Alert Patterns (Guaranteed Triggers)

### Pattern 1: Insider Dealing — AAPL Earnings (ACC-042)
- **Market event**: AAPL earnings surprise on ~2024-12-15 (5%+ price jump)
- **Lookback**: 5 days (setting for equity)
- **ACC-042 behavior**: Buys AAPL call options (AAPL-C150, AAPL-C155) on Dec 10-13
- **Volume**: Significantly above normal for this account
- **Related products**: Options are related to AAPL via "underlying" relationship
- **Expected alert**: Insider dealing — unusual related-product buying before market event

### Pattern 2: Insider Dealing — Bond Rate Event (ACC-087)
- **Market event**: Rate announcement impacting US Treasury prices on ~2024-12-20
- **ACC-087 behavior**: Accumulates Treasury positions over 2 weeks before announcement
- **Expected alert**: Insider dealing — accumulation before market event

### Pattern 3: Wash Trading — Full Day (ACC-123)
- **Date**: 2024-12-05
- **ACC-123 behavior**: Buys 5,000 MSFT at VWAP ~$420.50, then sells 5,000 MSFT at VWAP ~$420.30
- **VWAP proximity**: $0.20 / $420.50 = 0.0005 (well within 0.02 threshold)
- **Expected alert**: Wash trading — buy/sell cancellation + VWAP similarity

### Pattern 4: Wash Trading — Cross Account (ACC-156 + related account)
- **Same trader controls both accounts**
- **Account A buys, Account B sells** — same product, same day, similar volumes
- **Expected alert**: Wash trading at trader level aggregation

### Pattern 5: Market Price Ramping — AAPL Uptrend (ACC-034)
- **Detected uptrend**: AAPL 10:00-11:30 on 2024-12-10
- **ACC-034 behavior**: 15 buy orders during the uptrend, 0 sells
- **Volume**: Represents 20%+ of market volume during the trend
- **Expected alert**: MPR — 100% same-side trading during trend, large volume

### Pattern 6: MPR with Put Options (ACC-078)
- **Detected downtrend**: GOOGL 14:00-15:30 on 2024-12-08
- **ACC-078 behavior**: Buys GOOGL put options during the downtrend
- **Adjusted direction**: Buying puts = effectively selling = same side as downtrend
- **Expected alert**: MPR with adjusted direction

### Pattern 7: Spoofing (ACC-201) — Last Week Only
- **Date**: During last week of data (when granular quotes available)
- **ACC-201 behavior**:
  - Places 8 buy orders at ascending prices above market
  - Cancels 7 of them within 30 seconds
  - Simultaneously has a large sell order that gets filled at an inflated price
  - Cancelled orders were within the spread
- **Expected alert**: Spoofing — cancellation pattern + opposite-side execution

### Pattern 8: Layering (ACC-167) — Last Week Only
- **Similar to spoofing but with layered book depth**
- **Multiple price levels of fake orders**
- **Cancelled orders outside the spread but creating pressure**
- **Expected alert**: Layering

### Pattern 9: Multi-Model (ACC-145)
- **Insider accumulation of stock** + some wash-like patterns during the accumulation (buy-sell-buy to manage position risk)
- **Expected alerts**: Both insider dealing AND wash trading

### Borderline Cases (NO alert expected)
- **ACC-055**: VWAP proximity of 0.019 (threshold is 0.02) — just under, no wash alert
- **ACC-189**: Traded before market event but volume only 1.5x normal (threshold is 2x) — no insider alert
- **ACC-210**: Large volume trades but no pattern (all buys, no offsetting sells, no trend, no event) — no alert

---

## 10. Data Generation Script Requirements

```
scripts/generate_data.py [--version N] [--seed S] [--output-dir DIR]
```

- **Default**: Deterministic output (same data every time)
- **--version N**: Generate version N of the dataset with potentially different parameters
- **--seed S**: Override random seed for reproducibility
- **--output-dir**: Where to write CSV files (default: workspace/data/csv/)

### Generation Order
1. Reference data (exchanges, sessions, asset classes, instrument types, domain values)
2. Products (real companies, real tickers, real exchanges)
3. Related products (underlying, index, FX reverse, sector peers)
4. Organizational structure (BUs, desks)
5. Traders (assigned to desks)
6. Accounts (assigned to traders, typed)
7. MD EOD (2 months, based on realistic price movements)
8. MD Intraday (1/min during sessions, following EOD trends)
9. MD Quotes (variable granularity, aligned with intraday)
10. News feed (real events for chosen companies)
11. Normal orders + executions (200+ accounts, realistic distribution)
12. Suspicious orders + executions (10-15 accounts, engineered patterns)

### Validation
After generation, the script should:
- Verify all FK references are valid
- Verify order version chains are consistent
- Verify execution quantities don't exceed order quantities
- Verify timestamps are within trading sessions
- Print summary statistics (row counts per table, pattern counts)
