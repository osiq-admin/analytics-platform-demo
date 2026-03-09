# 11 --- Entity Relationship Graph

**Audience**: Data Engineers, Database Architects

This document provides the complete entity relationship graph for the Risk Case Manager trade surveillance platform. It covers all 8 entities, their primary keys, key business fields, relationships with cardinality, domain value catalogs, ISO/FIX standards alignment, and reachability analysis. It serves as the canonical reference for understanding how data flows between entities and which attributes are available at each level of the entity graph.

---

## 1. Complete Entity Graph

### 1.1 product (50 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `product` |
| **Name** | Product (Instrument) |
| **Description** | Financial instruments with ISO standard identifiers, derivative fields, and trading parameters. Master dimension referenced by execution, order, and market data entities via product_id. |
| **Primary Key** | `product_id` |
| **Total Fields** | 17 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `product_id` | string | No | Unique product identifier (ticker/symbol) |
| `isin` | string | Yes | ISO 6166 International Securities Identification Number |
| `sedol` | string | Yes | Stock Exchange Daily Official List number |
| `ticker` | string | No | Exchange ticker symbol (= product_id) |
| `name` | string | No | Product display name |
| `asset_class` | string | No | Asset class category |
| `instrument_type` | string | No | ISO 10962 instrument classification |
| `cfi_code` | string | No | ISO 10962 Classification of Financial Instruments code |
| `underlying_product_id` | string | Yes | Product ID of the underlying instrument (derivatives only) |
| `strike_price` | decimal | Yes | Option strike price |
| `expiry_date` | date | Yes | Contract expiry date |
| `exchange_mic` | string | No | ISO 10383 Market Identifier Code of primary exchange |
| `currency` | string | No | ISO 4217 quotation currency |
| `regulatory_scope` | string | No | Primary regulatory jurisdiction for this product |

**Domain Values:**

| Field | Values |
|---|---|
| `asset_class` | `equity`, `fx`, `commodity`, `index`, `fixed_income` |
| `instrument_type` | `common_stock`, `call_option`, `put_option`, `future`, `spot` |
| `regulatory_scope` | `EU`, `US`, `UK`, `APAC`, `MULTI` |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `execution` | `product_id` | `product_id` | 1:M |
| `order` | `product_id` | `product_id` | 1:M |
| `md_intraday` | `product_id` | `product_id` | 1:M |
| `md_eod` | `product_id` | `product_id` | 1:M |
| `venue` | `exchange_mic` | `mic` | M:1 |

---

### 1.2 execution (761 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `execution` |
| **Name** | Trade Execution |
| **Description** | Individual trade executions (fills) across all instrument types, with order linkage, venue routing, and capacity classification. |
| **Primary Key** | `execution_id` |
| **Total Fields** | 13 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `execution_id` | string | No | Unique execution identifier |
| `order_id` | string | No | Originating order identifier (FK to order) |
| `product_id` | string | No | Product/instrument identifier (FK to product) |
| `account_id` | string | No | Trading account identifier (FK to account) |
| `trader_id` | string | No | Trader who executed the trade (FK to trader) |
| `side` | string | No | Trade direction |
| `price` | decimal | No | Execution price per unit |
| `quantity` | decimal | No | Number of units traded |
| `execution_date` | date | No | Date of execution |
| `execution_time` | string | No | Time of execution with milliseconds |
| `venue_mic` | string | No | ISO 10383 MIC code of the execution venue (FK to venue) |
| `exec_type` | string | No | Execution type classification |
| `capacity` | string | No | Broker capacity |

**Domain Values:**

| Field | Values |
|---|---|
| `side` | `BUY`, `SELL` |
| `exec_type` | `FILL`, `PARTIAL_FILL` |
| `capacity` | `AGENCY`, `PRINCIPAL` |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `order` | `order_id` | `order_id` | M:1 |
| `product` | `product_id` | `product_id` | M:1 |
| `account` | `account_id` | `account_id` | M:1 |
| `trader` | `trader_id` | `trader_id` | M:1 |
| `venue` | `venue_mic` | `mic` | M:1 |
| `md_eod` | `product_id`, `execution_date` | `product_id`, `trade_date` | M:1 |

---

### 1.3 order (786 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `order` |
| **Name** | Order |
| **Description** | Order records with FIX Protocol fields including order type, fill status, time-in-force, execution linkage, and venue routing. |
| **Primary Key** | `order_id` |
| **Total Fields** | 14 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `order_id` | string | No | Unique order identifier |
| `product_id` | string | No | Product/instrument identifier |
| `account_id` | string | No | Trading account identifier |
| `trader_id` | string | No | Trader who placed the order |
| `side` | string | No | Order direction |
| `order_type` | string | No | FIX OrdType: MARKET or LIMIT |
| `limit_price` | decimal | Yes | Limit price for LIMIT orders |
| `quantity` | decimal | No | Original order quantity |
| `filled_quantity` | decimal | No | Quantity filled so far |
| `status` | string | No | Order status (FIX OrdStatus) |
| `time_in_force` | string | No | FIX TimeInForce instruction |
| `execution_id` | string | Yes | Linked execution/fill identifier (FK to execution) |
| `venue_mic` | string | Yes | ISO 10383 MIC of the routing venue |

**Domain Values:**

| Field | Values |
|---|---|
| `side` | `BUY`, `SELL` |
| `order_type` | `MARKET`, `LIMIT` |
| `status` | `NEW`, `FILLED`, `PARTIALLY_FILLED`, `CANCELLED`, `REJECTED` |
| `time_in_force` | `DAY`, `GTC`, `IOC`, `FOK` |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `product` | `product_id` | `product_id` | M:1 |
| `account` | `account_id` | `account_id` | M:1 |
| `trader` | `trader_id` | `trader_id` | M:1 |
| `execution` | `execution_id` | `execution_id` | M:1 |
| `venue` | `venue_mic` | `mic` | M:1 |

---

### 1.4 md_eod (2,150 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `md_eod` |
| **Name** | End-of-Day Market Data |
| **Description** | Daily OHLCV market data with previous close, trade count, and VWAP for all products. |
| **Primary Key** | Composite: `product_id` + `trade_date` |
| **Total Fields** | 9 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `product_id` | string | No | Product identifier |
| `trade_date` | date | No | Trading date |
| `open_price` | decimal | No | Day open price |
| `high_price` | decimal | No | Intraday high price |
| `low_price` | decimal | No | Intraday low price |
| `close_price` | decimal | No | Day closing price |
| `volume` | integer | No | Total daily volume |
| `prev_close` | decimal | Yes | Previous trading day close price |
| `vwap` | decimal | Yes | Volume-weighted average price |

**Domain Values:** None.

**Relationships:** None declared outbound. Reachable inbound from `product` (1:M) and from `execution` (M:1 composite join on `product_id` + `trade_date`).

---

### 1.5 md_intraday (32,000 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `md_intraday` |
| **Name** | Intraday Market Data |
| **Description** | Intraday trade-level tick data with bid/ask quotes and trade conditions. Covers equities, FX pairs, and key futures. |
| **Primary Key** | Composite: `product_id` + `trade_date` + `trade_time` |
| **Total Fields** | 8 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `product_id` | string | No | Product identifier (FK to product) |
| `trade_date` | date | No | Trade date |
| `trade_time` | string | No | Trade time with milliseconds |
| `trade_price` | decimal | No | Trade execution price |
| `trade_quantity` | integer | No | Number of units traded |
| `bid_price` | decimal | Yes | Best bid price at trade time |
| `ask_price` | decimal | Yes | Best ask price at trade time |
| `trade_condition` | string | Yes | Trade condition code |

**Domain Values:**

| Field | Values |
|---|---|
| `trade_condition` | `@` (regular trade) |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `product` | `product_id` | `product_id` | M:1 |

---

### 1.6 venue (6 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `venue` |
| **Name** | Venue |
| **Description** | Reference data for trading venues with ISO MIC codes, trading hours, and friendly display names. |
| **Primary Key** | `mic` |
| **Total Fields** | 8 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `mic` | string | No | ISO 10383 Market Identifier Code |
| `name` | string | No | Display name |
| `short_name` | string | No | Abbreviated name for UI |
| `country` | string | No | ISO 3166-1 alpha-2 country code |
| `timezone` | string | No | IANA timezone |
| `open_time` | string | No | Regular session open (local time) |
| `close_time` | string | No | Regular session close (local time) |
| `asset_classes` | string | No | Supported asset classes (comma-separated) |

**Domain Values:**

| Field | Values |
|---|---|
| `asset_classes` | `equity`, `option`, `index`, `commodity`, `fixed_income`, `fx` |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `product` | `mic` | `exchange_mic` | 1:M |
| `order` | `mic` | `venue_mic` | 1:M |
| `execution` | `mic` | `venue_mic` | 1:M |

---

### 1.7 account (220 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `account` |
| **Name** | Account |
| **Description** | Trading accounts with type classification, registration jurisdiction, risk rating, and trader linkage. Referenced by execution and order entities via account_id. |
| **Primary Key** | `account_id` |
| **Total Fields** | 10 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `account_id` | string | No | Unique account identifier |
| `account_name` | string | No | Display name of the account |
| `account_type` | string | No | Account classification |
| `registration_country` | string | No | ISO 3166-1 alpha-2 country of registration |
| `primary_trader_id` | string | Yes | Default trader assigned to the account (FK to trader) |
| `status` | string | No | Account status |
| `risk_rating` | string | Yes | Internal risk tier based on account type |
| `onboarding_date` | date | Yes | Date the account was opened |
| `mifid_client_category` | string | Yes | MiFID II client classification |
| `compliance_status` | string | Yes | Account compliance review status |

**Domain Values:**

| Field | Values |
|---|---|
| `account_type` | `institutional`, `retail`, `hedge_fund`, `market_maker` |
| `status` | `ACTIVE` |
| `risk_rating` | `LOW`, `MEDIUM`, `HIGH` |
| `mifid_client_category` | `retail`, `professional`, `eligible_counterparty` |
| `compliance_status` | `active`, `under_review`, `restricted`, `suspended` |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `execution` | `account_id` | `account_id` | 1:M |
| `order` | `account_id` | `account_id` | 1:M |

---

### 1.8 trader (50 records)

| Attribute | Value |
|---|---|
| **Entity ID** | `trader` |
| **Name** | Trader |
| **Description** | Trader dimension with desk assignment and role classification. Each trader manages multiple accounts and is referenced by execution and order via trader_id. |
| **Primary Key** | `trader_id` |
| **Total Fields** | 6 |

**Key Business Fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `trader_id` | string | No | Unique trader identifier |
| `trader_name` | string | No | Full name of the trader |
| `desk` | string | No | Trading desk assignment |
| `trader_type` | string | No | Trader role type |
| `hire_date` | date | Yes | Trader start date |
| `status` | string | No | Trader status |

**Domain Values:**

| Field | Values |
|---|---|
| `desk` | `Equity Flow`, `Derivatives`, `FX Spot`, `Commodities` |
| `trader_type` | `execution`, `portfolio`, `algorithmic` |
| `status` | `ACTIVE` |

**Relationships:**

| Target Entity | Source Field(s) | Target Field(s) | Cardinality |
|---|---|---|---|
| `execution` | `trader_id` | `trader_id` | 1:M |
| `order` | `trader_id` | `trader_id` | 1:M |
| `account` | `trader_id` | `primary_trader_id` | 1:M |

---

## 2. ASCII Relationship Diagram

The following diagram shows all 8 entities and their relationships. Arrows point from the "many" side to the "one" side (FK direction). Cardinality is marked on each edge.

```
                                 ┌─────────────────────┐
                                 │       venue          │
                                 │       (6 rows)       │
                                 │  PK: mic             │
                                 └──┬──────┬────────┬───┘
                          1:M ┌────┘  1:M  │        └────┐ 1:M
                              │            │             │
                              ▼            ▼             ▼
  ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
  │     product      │   │    execution       │   │       order          │
  │    (50 rows)     │   │    (761 rows)      │   │     (786 rows)       │
  │  PK: product_id  │   │  PK: execution_id  │   │  PK: order_id        │
  └──┬───┬───┬───┬───┘   └──┬───┬───┬───┬────┘   └──┬───┬───┬───┬──────┘
     │   │   │   │           │   │   │   │           │   │   │   │
     │   │   │   └───────────┼───┼───┼───┼───────────┼───┼───┼───┘
     │   │   │          M:1  │   │   │   │ M:1       │   │   │
     │   │   │    ┌──────────┘   │   │   └────┐      │   │   │
     │   │   │    │              │   │         │      │   │   │
     │   │   │    │   execution  │   │  order  │      │   │   │
     │   │   │    │   has FK to: │   │  has FK │      │   │   │
     │   │   │    │   - order    │   │  to:    │      │   │   │
     │   │   │    │   - product  │   │  -product      │   │
     │   │   │    │   - account  │   │  -account      │   │
     │   │   │    │   - trader   │   │  -trader │      │   │
     │   │   │    │   - venue    │   │  -venue  │      │   │
     │   │   │    │   - md_eod   │   │  -exec   │     │   │
     │   │   │    │              │   │          │      │   │
```

The above is simplified. The precise relationship topology is better understood as a hub-and-spoke model centered on the two **fact entities** (`execution` and `order`) surrounded by **dimension entities** (`product`, `account`, `trader`, `venue`) and **market data entities** (`md_eod`, `md_intraday`).

Below is a cleaner structural view:

```
                                   ┌───────────┐
                                   │   venue   │
                                   │   (6)     │
                                   │ PK: mic   │
                                   └─────┬─────┘
                                    1:M  │  1:M         1:M
                          ┌──────────────┼──────────────────┐
                          │              │                  │
                          ▼              │                  ▼
   ┌─────────────┐   ┌────────────┐     │          ┌─────────────┐
   │  md_intraday│   │  product   │     │          │             │
   │   (32K)     │   │   (50)     │     │          │             │
   │ PK: comp.   │   │PK:product_id     │          │             │
   └──────┬──────┘   └──┬────┬───┘     │          │             │
     M:1  │        1:M  │    │  1:M     │          │             │
          │      ┌──────┘    └──────┐   │          │             │
          │      │                  │   │          │             │
          │      ▼                  ▼   ▼          │             │
          │  ┌──────────┐    ┌──────────────┐      │             │
          │  │  md_eod  │    │  execution   │◄─────┘             │
          │  │  (2,150) │    │   (761)      │                    │
          │  │PK: comp. │    │PK:execution_id                    │
          │  └──────────┘    └───┬──┬───┬───┘                    │
          │                M:1  │  │   │ M:1                     │
          │              ┌──────┘  │   └──────┐                  │
          │              │         │          │                   │
          │              ▼         │          ▼                   │
          │     ┌──────────────┐   │   ┌───────────┐             │
          │     │    order     │◄──┘   │           │             │
          │     │   (786)     │◄───────┼───────────┘             │
          │     │ PK: order_id│        │                         │
          │     └──┬──────┬───┘        │                         │
          │   M:1  │      │ M:1        │                         │
          │  ┌─────┘      └─────┐      │                         │
          │  │                  │      │                         │
          │  ▼                  ▼      │                         │
          │ ┌────────────┐ ┌──────────┐│                         │
          │ │  account   │ │  trader  ││                         │
          │ │  (220)     │ │  (50)    ││                         │
          │ │PK:account_id │PK:trader_id                         │
          │ └────────────┘ └──────────┘│                         │
          │                       1:M  │                         │
          └────────────────────────────┘                         │
                                                                 │
  Note: venue connects to product (exchange_mic), execution      │
  (venue_mic), and order (venue_mic) ◄───────────────────────────┘
```

### Simplified Topology Summary

```
                            ┌─────────┐
                            │  venue  │
                            │  (6)    │
                            └────┬────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │ 1:M             │ 1:M              │ 1:M
               ▼                 ▼                  ▼
         ┌──────────┐     ┌───────────┐      ┌──────────┐
         │ product  │     │ execution │      │  order   │
         │  (50)    │     │  (761)    │      │  (786)   │
         └──┬──┬────┘     └─┬──┬──┬──┘      └─┬──┬──┬──┘
        1:M │  │ 1:M    M:1 │  │  │ M:1   M:1 │  │  │ M:1
            │  │       ┌─────┘  │  └────┐ ┌────┘  │  └───┐
            │  │       │        │       │ │       │      │
            ▼  ▼       ▼        ▼       ▼ ▼       ▼      ▼
     ┌────────┐┌────────┐┌─────────┐┌─────────┐┌─────────┐
     │md_eod  ││md_intra││ account ││ trader  ││(shared) │
     │(2,150) ││ (32K)  ││  (220)  ││  (50)   ││         │
     └────────┘└────────┘└─────────┘└─────────┘└─────────┘

     KEY:
       execution.order_id       ──M:1──▶ order.order_id
       execution.product_id     ──M:1──▶ product.product_id
       execution.account_id     ──M:1──▶ account.account_id
       execution.trader_id      ──M:1──▶ trader.trader_id
       execution.venue_mic      ──M:1──▶ venue.mic
       execution.(product_id,
         execution_date)        ──M:1──▶ md_eod.(product_id, trade_date)
       order.product_id         ──M:1──▶ product.product_id
       order.account_id         ──M:1──▶ account.account_id
       order.trader_id          ──M:1──▶ trader.trader_id
       order.execution_id       ──M:1──▶ execution.execution_id
       order.venue_mic          ──M:1──▶ venue.mic
       product.exchange_mic     ──M:1──▶ venue.mic
       md_intraday.product_id   ──M:1──▶ product.product_id
       trader.trader_id         ──1:M──▶ account.primary_trader_id
```

### Relationship Edge List (All 18 Declared Relationships)

| # | From Entity | To Entity | From Field(s) | To Field(s) | Type |
|---|---|---|---|---|---|
| 1 | product | execution | product_id | product_id | 1:M |
| 2 | product | order | product_id | product_id | 1:M |
| 3 | product | md_intraday | product_id | product_id | 1:M |
| 4 | product | md_eod | product_id | product_id | 1:M |
| 5 | product | venue | exchange_mic | mic | M:1 |
| 6 | execution | order | order_id | order_id | M:1 |
| 7 | execution | product | product_id | product_id | M:1 |
| 8 | execution | account | account_id | account_id | M:1 |
| 9 | execution | trader | trader_id | trader_id | M:1 |
| 10 | execution | venue | venue_mic | mic | M:1 |
| 11 | execution | md_eod | product_id, execution_date | product_id, trade_date | M:1 |
| 12 | order | product | product_id | product_id | M:1 |
| 13 | order | account | account_id | account_id | M:1 |
| 14 | order | trader | trader_id | trader_id | M:1 |
| 15 | order | execution | execution_id | execution_id | M:1 |
| 16 | order | venue | venue_mic | mic | M:1 |
| 17 | md_intraday | product | product_id | product_id | M:1 |
| 18 | trader | account | trader_id | primary_trader_id | 1:M |
| 19 | venue | product | mic | exchange_mic | 1:M |
| 20 | venue | order | mic | venue_mic | 1:M |
| 21 | venue | execution | mic | venue_mic | 1:M |
| 22 | account | execution | account_id | account_id | 1:M |
| 23 | account | order | account_id | account_id | 1:M |

> **Note:** Relationships 1--17 are unique logical edges. Rows 18--23 are the inverse declarations of edges already captured (e.g., `venue -> product` is the inverse of `product -> venue`). The entity metadata files declare relationships from both sides for convenience, resulting in 23 total declarations covering 13 unique logical edges.

---

## 3. Reachability Matrix

This matrix shows all meaningful traversal paths between entities, the join path, hop count, and effective cardinality. Cardinality notation: `1:M:1` means "one-to-many then many-to-one" requiring fan-out then collapse.

### 3.1 From product

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| product | execution | product -> execution | 1 | 1:M |
| product | order | product -> order | 1 | 1:M |
| product | md_eod | product -> md_eod | 1 | 1:M |
| product | md_intraday | product -> md_intraday | 1 | 1:M |
| product | venue | product -> venue (via exchange_mic) | 1 | M:1 |
| product | account | product -> execution -> account | 2 | 1:M:1 (fan-out then collapse) |
| product | account | product -> order -> account | 2 | 1:M:1 (fan-out then collapse) |
| product | trader | product -> execution -> trader | 2 | 1:M:1 (fan-out then collapse) |
| product | trader | product -> order -> trader | 2 | 1:M:1 (fan-out then collapse) |

### 3.2 From execution

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| execution | order | execution -> order | 1 | M:1 |
| execution | product | execution -> product | 1 | M:1 |
| execution | account | execution -> account | 1 | M:1 |
| execution | trader | execution -> trader | 1 | M:1 |
| execution | venue | execution -> venue | 1 | M:1 |
| execution | md_eod | execution -> md_eod (composite) | 1 | M:1 |
| execution | md_intraday | execution -> product -> md_intraday | 2 | M:1:M (fan-out on product) |

### 3.3 From order

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| order | product | order -> product | 1 | M:1 |
| order | account | order -> account | 1 | M:1 |
| order | trader | order -> trader | 1 | M:1 |
| order | execution | order -> execution | 1 | M:1 |
| order | venue | order -> venue | 1 | M:1 |
| order | md_eod | order -> product -> md_eod | 2 | M:1:M (fan-out on product) |
| order | md_intraday | order -> product -> md_intraday | 2 | M:1:M (fan-out on product) |

### 3.4 From account

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| account | execution | account -> execution | 1 | 1:M |
| account | order | account -> order | 1 | 1:M |
| account | product | account -> execution -> product | 2 | 1:M:1 (fan-out then collapse) |
| account | product | account -> order -> product | 2 | 1:M:1 (fan-out then collapse) |
| account | trader | account -> execution -> trader | 2 | 1:M:1 (fan-out then collapse) |
| account | trader | account -> order -> trader | 2 | 1:M:1 (fan-out then collapse) |
| account | venue | account -> execution -> venue | 2 | 1:M:1 (fan-out then collapse) |
| account | venue | account -> order -> venue | 2 | 1:M:1 (fan-out then collapse) |
| account | md_eod | account -> execution -> md_eod | 2 | 1:M:1 (fan-out then collapse) |
| account | md_intraday | account -> execution -> product -> md_intraday | 3 | 1:M:1:M (double fan-out) |

### 3.5 From trader

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| trader | execution | trader -> execution | 1 | 1:M |
| trader | order | trader -> order | 1 | 1:M |
| trader | account | trader -> account (via primary_trader_id) | 1 | 1:M |
| trader | product | trader -> execution -> product | 2 | 1:M:1 (fan-out then collapse) |
| trader | product | trader -> order -> product | 2 | 1:M:1 (fan-out then collapse) |
| trader | venue | trader -> execution -> venue | 2 | 1:M:1 (fan-out then collapse) |
| trader | venue | trader -> order -> venue | 2 | 1:M:1 (fan-out then collapse) |
| trader | md_eod | trader -> execution -> md_eod | 2 | 1:M:1 (fan-out then collapse) |
| trader | md_intraday | trader -> execution -> product -> md_intraday | 3 | 1:M:1:M (double fan-out) |

### 3.6 From venue

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| venue | product | venue -> product | 1 | 1:M |
| venue | execution | venue -> execution | 1 | 1:M |
| venue | order | venue -> order | 1 | 1:M |
| venue | account | venue -> execution -> account | 2 | 1:M:1 (fan-out then collapse) |
| venue | account | venue -> order -> account | 2 | 1:M:1 (fan-out then collapse) |
| venue | trader | venue -> execution -> trader | 2 | 1:M:1 (fan-out then collapse) |
| venue | trader | venue -> order -> trader | 2 | 1:M:1 (fan-out then collapse) |
| venue | md_eod | venue -> product -> md_eod | 2 | 1:M:M (fan-out on product) |
| venue | md_intraday | venue -> product -> md_intraday | 2 | 1:M:M (fan-out on product) |

### 3.7 From md_eod

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| md_eod | product | md_eod -> (inferred via product_id) -> product | 1 | M:1 (implicit) |
| md_eod | execution | md_eod -> (implicit via product_id) -> product -> execution | 2 | M:1:M |
| md_eod | order | md_eod -> (implicit) -> product -> order | 2 | M:1:M |
| md_eod | venue | md_eod -> (implicit) -> product -> venue | 2 | M:1:1 (collapse) |
| md_eod | account | md_eod -> product -> execution -> account | 3 | M:1:M:1 |
| md_eod | trader | md_eod -> product -> execution -> trader | 3 | M:1:M:1 |

> **Note:** `md_eod` does not declare outbound relationships in its metadata. It is reachable via `product_id` which acts as an implicit FK to `product`. The `execution` entity declares a composite join to `md_eod` on `(product_id, execution_date)` -> `(product_id, trade_date)`.

### 3.8 From md_intraday

| From | To | Path | Hops | Cardinality |
|---|---|---|---|---|
| md_intraday | product | md_intraday -> product | 1 | M:1 |
| md_intraday | execution | md_intraday -> product -> execution | 2 | M:1:M |
| md_intraday | order | md_intraday -> product -> order | 2 | M:1:M |
| md_intraday | venue | md_intraday -> product -> venue | 2 | M:1:1 (collapse) |
| md_intraday | account | md_intraday -> product -> execution -> account | 3 | M:1:M:1 |
| md_intraday | trader | md_intraday -> product -> execution -> trader | 3 | M:1:M:1 |
| md_intraday | md_eod | md_intraday -> product -> md_eod | 2 | M:1:M |

### 3.9 Reachability Summary

Every entity can reach every other entity within a maximum of 3 hops. The `execution` entity is the most connected node (6 direct relationships), making it the natural hub for cross-entity queries.

| Entity | Direct Neighbors | Max Hops to Any Entity |
|---|---|---|
| execution | 6 (order, product, account, trader, venue, md_eod) | 2 |
| order | 5 (product, account, trader, execution, venue) | 2 |
| product | 5 (execution, order, md_intraday, md_eod, venue) | 2 |
| venue | 3 (product, execution, order) | 2 |
| trader | 3 (execution, order, account) | 2 |
| account | 2 (execution, order) | 2 |
| md_intraday | 1 (product) | 3 |
| md_eod | 0 declared (1 implicit via product_id) | 3 |

---

## 4. Domain Values Catalog

This catalog lists all entity attributes that have explicitly declared domain values. These are the attributes available for match pattern classification in the detection system.

### 4.1 product

| Attribute | Domain Values | Count |
|---|---|---|
| `asset_class` | `equity`, `fx`, `commodity`, `index`, `fixed_income` | 5 |
| `instrument_type` | `common_stock`, `call_option`, `put_option`, `future`, `spot` | 5 |
| `regulatory_scope` | `EU`, `US`, `UK`, `APAC`, `MULTI` | 5 |

### 4.2 execution

| Attribute | Domain Values | Count |
|---|---|---|
| `side` | `BUY`, `SELL` | 2 |
| `exec_type` | `FILL`, `PARTIAL_FILL` | 2 |
| `capacity` | `AGENCY`, `PRINCIPAL` | 2 |

### 4.3 order

| Attribute | Domain Values | Count |
|---|---|---|
| `side` | `BUY`, `SELL` | 2 |
| `order_type` | `MARKET`, `LIMIT` | 2 |
| `status` | `NEW`, `FILLED`, `PARTIALLY_FILLED`, `CANCELLED`, `REJECTED` | 5 |
| `time_in_force` | `DAY`, `GTC`, `IOC`, `FOK` | 4 |

### 4.4 account

| Attribute | Domain Values | Count |
|---|---|---|
| `account_type` | `institutional`, `retail`, `hedge_fund`, `market_maker` | 4 |
| `status` | `ACTIVE` | 1 |
| `risk_rating` | `LOW`, `MEDIUM`, `HIGH` | 3 |
| `mifid_client_category` | `retail`, `professional`, `eligible_counterparty` | 3 |
| `compliance_status` | `active`, `under_review`, `restricted`, `suspended` | 4 |

### 4.5 trader

| Attribute | Domain Values | Count |
|---|---|---|
| `desk` | `Equity Flow`, `Derivatives`, `FX Spot`, `Commodities` | 4 |
| `trader_type` | `execution`, `portfolio`, `algorithmic` | 3 |
| `status` | `ACTIVE` | 1 |

### 4.6 venue

| Attribute | Domain Values | Count |
|---|---|---|
| `asset_classes` | `equity`, `option`, `index`, `commodity`, `fixed_income`, `fx` | 6 |

### 4.7 md_intraday

| Attribute | Domain Values | Count |
|---|---|---|
| `trade_condition` | `@` | 1 |

### 4.8 md_eod

No attributes with declared domain values.

### 4.9 Domain Value Summary

| Entity | Attributes with Domain Values | Total Distinct Values |
|---|---|---|
| product | 3 | 15 |
| execution | 3 | 6 |
| order | 4 | 13 |
| account | 5 | 15 |
| trader | 3 | 8 |
| venue | 1 | 6 |
| md_intraday | 1 | 1 |
| md_eod | 0 | 0 |
| **Total** | **20** | **64** |

---

## 5. ISO/FIX Standards Alignment

The entity model is aligned with international financial standards for interoperability and regulatory compliance.

### 5.1 ISO Standards

| Entity | Field | Standard | Standard Name | Description |
|---|---|---|---|---|
| product | `isin` | ISO 6166 | Securities Identification | International Securities Identification Number (12-char alphanumeric) |
| product | `cfi_code` | ISO 10962 | Classification of Financial Instruments | 6-character instrument classification code |
| product | `instrument_type` | ISO 10962 | Classification of Financial Instruments | Derived instrument type from CFI classification |
| product | `exchange_mic` | ISO 10383 | Market Identifier Codes | Primary listing venue MIC |
| product | `currency` | ISO 4217 | Currency Codes | 3-letter currency code for price quotation |
| product | `sedol` | -- | SEDOL (London Stock Exchange) | Stock Exchange Daily Official List number |
| venue | `mic` | ISO 10383 | Market Identifier Codes | Venue Market Identifier Code (primary key) |
| venue | `country` | ISO 3166-1 | Country Codes | Alpha-2 country code of venue jurisdiction |
| account | `registration_country` | ISO 3166-1 | Country Codes | Alpha-2 country code of account registration |
| execution | `venue_mic` | ISO 10383 | Market Identifier Codes | Execution venue MIC |
| order | `venue_mic` | ISO 10383 | Market Identifier Codes | Order routing venue MIC |
| execution | `execution_time` | ISO 8601 | Date and Time | Timestamp with millisecond precision (HH:MM:SS.fff) |
| execution | `execution_date` | ISO 8601 | Date and Time | Date format YYYY-MM-DD |
| order | `order_date` | ISO 8601 | Date and Time | Date format YYYY-MM-DD |
| order | `order_time` | ISO 8601 | Date and Time | Timestamp with millisecond precision |
| md_eod | `trade_date` | ISO 8601 | Date and Time | Date format YYYY-MM-DD |
| md_intraday | `trade_date` | ISO 8601 | Date and Time | Date format YYYY-MM-DD |
| md_intraday | `trade_time` | ISO 8601 | Date and Time | Timestamp with millisecond precision |

### 5.2 FIX Protocol Fields

| Entity | Field | FIX Tag | FIX Field Name | Description |
|---|---|---|---|---|
| execution | `exec_type` | Tag 150 | ExecType | Execution report type (`FILL`, `PARTIAL_FILL`) |
| execution | `side` | Tag 54 | Side | Trade direction (`BUY` = 1, `SELL` = 2) |
| execution | `capacity` | Tag 47 | OrderCapacity | Broker capacity (`AGENCY` = A, `PRINCIPAL` = P) |
| execution | `price` | Tag 31 | LastPx | Last executed price |
| execution | `quantity` | Tag 32 | LastQty | Last executed quantity |
| order | `order_type` | Tag 40 | OrdType | Order type (`MARKET` = 1, `LIMIT` = 2) |
| order | `side` | Tag 54 | Side | Order direction (`BUY` = 1, `SELL` = 2) |
| order | `time_in_force` | Tag 59 | TimeInForce | `DAY` = 0, `GTC` = 1, `IOC` = 3, `FOK` = 4 |
| order | `status` | Tag 39 | OrdStatus | `NEW` = 0, `FILLED` = 2, `PARTIALLY_FILLED` = 1, `CANCELLED` = 4, `REJECTED` = 8 |
| order | `limit_price` | Tag 44 | Price | Limit price for LIMIT orders |
| order | `quantity` | Tag 38 | OrderQty | Original order quantity |
| order | `filled_quantity` | Tag 14 | CumQty | Cumulative filled quantity |

### 5.3 Regulatory Framework Alignment

| Entity | Field | Regulation | Requirement |
|---|---|---|---|
| product | `regulatory_scope` | MAR/MiFID II/Dodd-Frank | Jurisdiction-specific surveillance rules |
| account | `mifid_client_category` | MiFID II (Directive 2014/65/EU Annex II) | Client classification for suitability/appropriateness |
| account | `risk_rating` | BCBS 239 / AML Directives | Risk-based account monitoring intensity |
| account | `compliance_status` | MAR / FINRA | Account-level restriction and review status |
| execution | `capacity` | MiFID II RTS 25 | Agency vs principal reporting obligation |

---

## 6. Implications for Match Patterns

This section connects the entity graph to the match pattern system described in [Document 04 --- Match Pattern Architecture](04-match-pattern-architecture.md).

### 6.1 Attribute Eligibility for Match Pattern Classification

Only attributes with declared domain values can be used in match pattern classification. From the domain values catalog above, the system has **20 classifiable attributes** across 7 of the 8 entities (all except `md_eod`).

**High-value classification attributes** (attributes most commonly used in detection model configuration):

| Attribute | Entity | Why It Matters |
|---|---|---|
| `asset_class` | product | Different surveillance rules per asset class (equity vs FX vs derivatives) |
| `instrument_type` | product | Options/futures require different thresholds than equities |
| `account_type` | account | Institutional vs retail accounts have different risk profiles |
| `risk_rating` | account | HIGH-risk accounts get lower alert thresholds |
| `desk` | trader | Desk-level parameter tuning for detection models |
| `trader_type` | trader | Algorithmic traders generate different patterns than manual traders |
| `capacity` | execution | Agency vs principal executions have different regulatory implications |
| `order_type` | order | MARKET vs LIMIT orders produce different surveillance signals |
| `regulatory_scope` | product | Jurisdiction determines which regulations apply |

### 6.2 Entity Key Overrides

Entity keys (primary keys) can be used for entity key overrides --- the highest-priority settings that apply to a specific entity instance:

| Entity | Key Field | Override Example |
|---|---|---|
| product | `product_id` | "For AAPL specifically, set wash trade window to 30 minutes" |
| execution | `execution_id` | Rarely used for overrides (too granular) |
| order | `order_id` | Rarely used for overrides (too granular) |
| account | `account_id` | "For account ACC-001, set max order size to 10,000" |
| trader | `trader_id` | "For trader T-005, set insider trading lookback to 90 days" |
| venue | `mic` | "For XNYS, set market manipulation window to 5 minutes" |

### 6.3 Cross-Entity Attribute Access via Reachability

When a detection model runs at a particular detection level (e.g., `execution`-level), it can access attributes from related entities by walking the relationship graph. The reachability matrix in Section 3 determines which attributes are available.

**Example: Detection model running at execution level**

| Hop | Reachable Entity | Available Attributes for Classification |
|---|---|---|
| 0 | execution | `side`, `exec_type`, `capacity` |
| 1 | product | `asset_class`, `instrument_type`, `regulatory_scope` |
| 1 | account | `account_type`, `risk_rating`, `mifid_client_category`, `compliance_status` |
| 1 | trader | `desk`, `trader_type` |
| 1 | venue | `asset_classes` |
| 1 | order | `order_type`, `time_in_force`, `status` |
| 1 | md_eod | (no domain values --- numeric data only) |

All 19 classifiable domain-valued attributes (excluding `md_intraday.trade_condition`) are reachable within 1 hop from `execution`, making it the ideal hub entity for detection models.

### 6.4 Cardinality Considerations

When traversing relationships for attribute resolution, cardinality determines whether a collapse operation is needed:

| Direction | Cardinality | Behavior |
|---|---|---|
| M:1 (many-to-one) | Safe | Each fact row maps to exactly one dimension value. No ambiguity. |
| 1:M (one-to-many) | Requires collapse | One dimension value maps to many fact rows. Must aggregate (COUNT, DISTINCT, ARRAY_AGG) or filter. |
| M:M (many-to-many) | Requires special handling | Fan-out on both sides. Needs intermediate aggregation. |

**Collapse strategies for 1:M traversals:**

- **DISTINCT**: Collect unique values (e.g., "all asset classes traded by this account")
- **MODE**: Take the most frequent value (e.g., "primary desk for this account")
- **FIRST**: Take the first value encountered (non-deterministic without ORDER BY)
- **ARRAY_AGG**: Collect all values as an array for multi-value matching

### 6.5 Graph Walk Algorithm

The entity graph walk for attribute resolution follows this algorithm:

1. **Start** at the detection level entity (e.g., `execution`)
2. **Enumerate** all direct relationships (hop 1)
3. For each M:1 relationship, the target attribute is **directly available** (no collapse needed)
4. For each 1:M relationship, the target attribute requires a **collapse strategy**
5. If the target attribute is not found at hop 1, **extend** to hop 2 via the M:1 neighbors
6. Repeat up to the configured **max hop depth** (default: 3)
7. If multiple paths exist to the same target, prefer the **shortest path** and then the path with the **fewest fan-out edges**

---

## Cross-References

- [04 --- Match Pattern Architecture](04-match-pattern-architecture.md): The universal 3-column match pattern system that consumes entity attributes
- [05 --- Calculation Instance Model](05-calculation-instance-model.md): How match patterns combine with calculations
- [07 --- Detection Level Design](07-detection-level-design.md): How detection levels use entity graph reachability
- [08 --- Resolution Priority Rules](08-resolution-priority-rules.md): Priority ordering for entity key vs attribute-based overrides
- [09 --- Unified Results Schema](09-unified-results-schema.md): How entity keys appear in the calc_results star schema
- [12 --- Settings Resolution Patterns](12-settings-resolution-patterns.md): Hierarchy strategy that walks entity relationships
- [Appendix A --- Complete Table Schemas](appendices/A-complete-table-schemas.md): DDL for entity dimension tables
- [Appendix B --- Worked Examples](appendices/B-worked-examples.md): End-to-end scenarios showing entity graph traversal
