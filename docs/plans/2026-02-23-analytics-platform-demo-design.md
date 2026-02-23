# Analytics Platform Demo — Design Document

**Date**: 2026-02-23
**Status**: Approved
**Author**: Product Owner + Claude (AI-assisted design)

---

## 1. Vision & Purpose

### What
A **metadata-driven trade surveillance and detection platform** that demonstrates an end-to-end data pipeline — from raw transaction data to alert investigation — where every component (entities, calculations, settings, detection models, display) is defined as metadata.

### Who
**Audience**: Product team pitch — demonstrating the E2E concepts and how the full process works.

### Why
Prove that a metadata-driven approach enables:
- Rapid creation of new detection models by composing existing calculations
- Full traceability from alert to source data
- Configurable settings that adapt per entity attributes
- A generic, system-agnostic architecture where definitions can drive flows in any downstream system

---

## 2. Architecture

### Approach: Embedded Everything

**Stack**: Python FastAPI + DuckDB (embedded OLAP) + Parquet/JSON files + React

**Launch**: Single command (`start.sh`) — single process, one port

**Why this approach**:
- ~99% launch reliability (no Docker, no containers, no networking)
- Near-instant query results (DuckDB is in-process)
- Files on disk are natively viewable — fulfills the artifact visibility requirement
- Fastest to develop and most portable
- The metadata-driven design IS the proof of production portability

**Production mapping** (one slide):

| Demo Component | Production Equivalent |
|---|---|
| FastAPI orchestrator | Apache Flink jobs |
| DuckDB | Apache Doris |
| Parquet files on disk | Apache Iceberg on MinIO |
| JSON metadata files | Metadata service (DB-backed) |
| WebSocket progress | Apache Kafka topics |
| File-based checkpoints | Kafka offsets |

### System Architecture Diagram

```
Single Command: ./start.sh (uvicorn main:app --port 8000)

┌──────────────────────────────────────────────────────────────┐
│                     React Frontend (SPA)                      │
│                                                               │
│  DEFINE:      [Entity Designer]  [Metadata Explorer]          │
│  CONFIGURE:   [Settings Manager] [Mapping Studio]             │
│  OPERATE:     [Pipeline Monitor] [Schema Explorer] [SQL Console]│
│  COMPOSE:     [Model Composer]   [Data Manager]               │
│  INVESTIGATE: [Risk Case Manager (Summary + Detail)]          │
│  AI:          [AI Query Assistant (Live + Mock mode)]         │
│  DEMO:        [Reset] [Resume] [Skip to End] [Step ▶]        │
│                                                               │
└────────────────────────┬─────────────────────────────────────┘
                         │  REST + WebSocket
┌────────────────────────┼─────────────────────────────────────┐
│                        ▼                                      │
│              Python FastAPI (single process)                   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  Metadata Service    — load/validate/resolve JSON      │   │
│  │  Calculation Engine  — DAG executor, layer-by-layer    │   │
│  │  Settings Resolver   — hierarchy + dimensions + fallback│   │
│  │  Detection Engine    — model conditions → alerts        │   │
│  │  Query Service       — SQL interface to DuckDB          │   │
│  │  Demo Controller     — state machine: reset/resume/skip │   │
│  │  Data Loader         — CSV → Parquet, with edit support │   │
│  │  AI Assistant Service— LLM integration (live + mock)    │   │
│  │  DuckDB (embedded)   — OLAP queries, schema catalog     │   │
│  └───────────────────────────────────────────────────────┘   │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       File System       │
              │  metadata/   → JSON     │
              │  data/csv/   → CSV      │
              │  data/parquet/ → Parquet │
              │  results/    → Parquet   │
              │  alerts/     → JSON+Parquet │
              │  snapshots/  → checkpoints │
              └─────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 Metadata-Driven Everything

Every component is defined as metadata (JSON files on disk):
- **Entity definitions** — canonical data model (fields, types, relationships)
- **Calculation definitions** — inputs, outputs, logic, parameters, display, storage
- **Settings definitions** — thresholds, matching patterns, resolution rules
- **Detection model definitions** — queries over calculation results with alert templates
- **Mapping definitions** — source data columns → canonical fields

### 3.2 Canonical Data Model

Source data is mapped to standardized canonical entities. Calculations operate exclusively on canonical fields — never on raw source data directly.

### 3.3 Calculation DAG (Directed Acyclic Graph)

Calculations form a dependency graph executed layer by layer:

```
Layer 1: Transaction Calculations (per execution/order)
    ↓
Layer 2: Time Window Calculations (detect windows)
    ↓
Layer 3: Aggregation Calculations (group by dimensions + windows)
    ↓
Layer 3.5: Derived Calculations (threshold-based flags, scores)
    ↓
Layer 4: Detection Models (queries over calculation results)
    ↓
Layer 5: Alerts (generated when model conditions match)
```

Calculations can depend on results from any earlier layer. New calculations can be added and immediately used by existing or new models.

### 3.4 Settings Resolution Engine

A cross-cutting mechanism that resolves "which threshold/setting applies here?" based on entity attributes.

**Resolution priority**:
1. Product-specific (always wins)
2. Configurable strategy: "hierarchy" (most specific wins) OR "multi-dimensional" (most dimension matches wins)
3. Default fallback (always present — guarantees no unmatched cases)

**Components**:
- **Setting Metadata** — defines WHAT (name, type, valid values)
- **Matching Pattern** — defines WHO (entity attribute combinations)
- **Setting Instance** = Pattern + Value → the resolved value
- **Resolution Trace** — records HOW a setting was resolved (for audit)

### 3.5 Composable Detection Models

Detection models are queries over pre-calculated results. Creating a new model requires:
1. Selecting which calculation results to query
2. Defining filter conditions and thresholds (from settings)
3. Defining the alert template (description, sections, display)

No new calculation code is needed if the building blocks exist. Models can be deployed instantly.

### 3.6 Full Traceability

Every alert can be traced back through:
- Which detection model triggered it
- Which calculation results matched
- What settings/thresholds were applied (and why — resolution trace)
- What source data was involved
- Processing logs

---

## 4. Entity Model

### 4.1 Core Trading Entities

| Entity | Description | Granularity |
|---|---|---|
| **Product** (Instrument) | Financial instrument (stock, bond, option, future, swap, etc.) | One per instrument |
| **Account** | Trading account | One per account |
| **Order** | Order placed by a trader | Per order |
| **Execution** | Execution of an order (proprietary — includes account, trader) | Per execution |
| **Trader** | Person executing trades | Per trader |
| **Desk** | Trading desk organizational unit | Per desk |
| **Business Unit** | Higher-level organizational unit | Per BU |

### 4.2 Market Data Entities

| Entity | Description | Granularity |
|---|---|---|
| **MD EOD** | End-of-day: OHLCV (open, high, low, close, volume, value, quantity) | Per product/day/exchange |
| **MD Intraday** | Public trades — no proprietary info (account, trader unknown) | Per public trade |
| **MD Quotes** | Order book: bid/ask with 3 levels depth | Per timestamp/product (very granular) |

### 4.3 Reference Data / Domain Values

| Domain Value | Examples |
|---|---|
| **Asset Classes** | Equity, FX, Fixed Income, Commodities |
| **Instrument Types** | Stock, Bond, Option, Forward, Future, Swap (with subtypes) |
| **Account Types** | Institutional, Proprietary, Client |
| **Order Types** | Market, Limit, Stop, etc. |
| **Execution Types** | Full fill, Partial fill, etc. |

Subtypes allow attribute extensions for specific instrument types or other entities.

### 4.4 Related Products

Products can be related through multiple relationship types:

| Relationship | Description | Example |
|---|---|---|
| **Underlying** | Derivative ↔ its underlying product | AAPL stock ↔ AAPL call option |
| **Composite/Index** | Product ↔ index/basket it belongs to | AAPL ↔ S&P 500 |
| **FX Reverse Pairs** | Currency pair ↔ its reverse (same pair, opposite direction) | ILS/USD ≡ USD/ILS |
| **Swap Legs** | Multi-leg instruments (anything-for-anything) | Interest rate swap legs |
| **Sector/Issuer Peers** | Same sector or issuer | AAPL ↔ MSFT (tech sector) |
| **User-defined Groups** | Manual explicit grouping | Custom surveillance groups |

FX reverse pair detection cascades to all FX products on those currency pairs.

---

## 5. Calculation Definitions

### 5.1 Layer 1 — Transaction Calculations

**Value Calculation** (`value_calc`)
- Determines the value of a transaction based on instrument type
- Stock: price × quantity
- Option: uses option valuation (premium × contract size × quantity)
- Different logic per instrument type
- Runs per execution/order

**Adjusted Direction** (`adjusted_direction`)
- Determines effective buy/sell direction considering "short" instruments
- Buying a put option = effectively selling (short direction)
- Selling a call option = effectively selling
- Used by downstream calculations for accurate buy/sell aggregation

### 5.2 Layer 2 — Time Window Calculations

**Business Date Window** (`business_date_window`)
- Determines business date based on cutoff settings
- Cutoff varies by: exchange, timezone, asset class, instrument type
- Settings matched via the resolution engine
- Result: window_start, window_end, business_date

**Trend Window** (`trend_window`)
- Detects up/down price trends from intraday public trade data
- Identifies trend start/end based on price movement patterns
- Result: trend_type (up/down), window_start, window_end, product_id

**Market Event Window** (`market_event_window`)
- Detects significant price changes or news events for a "base" product (stock, bond, company)
- Configurable lookback period (setting, matched per entity attributes)
- Optional look-forward period
- Result: event_type, event_date, lookback_start, lookforward_end, base_product_id

**Cancellation Pattern Window** (`cancellation_pattern`) — for Spoofing/Layering
- Detects: X cancellations within Y seconds, of orders not executed above threshold
- Registers events to an events table
- Determines lookback/lookforward in seconds/minutes around the event
- Analyzes: within/outside spread, opposite side of executed orders
- Result: pattern_event_id, window_start, window_end, cancel_count, cancel_ratio

### 5.3 Layer 3 — Aggregation Calculations

**Trading Activity Aggregation** (`trading_activity_aggregation`)
- Aggregates buy/sell/net values and quantities
- For ALL granularity level combinations (product, account, product+account, trader, desk, etc.)
- For ALL relevant time windows (business date, trend, market event, etc.)
- Result: buy_value, sell_value, net_value, buy_qty, sell_qty per granularity+window

**VWAP Calculation** (`vwap_calc`)
- Value-Weighted Average Price of buys vs. sells
- Per product, per account, per time window
- Result: vwap_buy, vwap_sell, vwap_spread

### 5.4 Layer 3.5 — Derived Calculations

**Large Trading Activity** (`large_trading_activity`)
- Threshold-based flag on aggregated activity
- Threshold matched via settings engine (varies by entity attributes)
- Result: is_large (boolean), activity_score, threshold_used

**Wash Detection** (`wash_detection`)
- Buy/sell quantity cancellation check (buy_qty ≈ sell_qty)
- VWAP similarity check (|vwap_buy - vwap_sell| < threshold)
- Thresholds from settings engine
- Result: is_wash_candidate (boolean), qty_match_ratio, vwap_proximity

---

## 6. Detection Models

### 6.1 Wash Trading — Full Day (`wash_full_day`)
- **Time window**: Business date
- **Conditions**: Large trading activity + buy/sell quantity cancellation + VWAP buy ≈ VWAP sell
- **Granularity**: Per product + account

### 6.2 Wash Trading — Intraday (`wash_intraday`)
- **Time window**: Batch or trend window
- **Conditions**: Same as Full Day at finer granularity

### 6.3 Market Price Ramping — MPR (`market_price_ramping`)
- **Time window**: Trend window (up/down trends)
- **Conditions**: Large trading activity on the same side as the trend (buying during uptrend, selling during downtrend — using adjusted direction)
- **Granularity**: Per product + account + trend window

### 6.4 Insider Dealing (`insider_dealing`)
- **Time window**: Market event window (lookback)
- **Conditions**: Large trading activity in related products to the base product/company before the market event + profit detection (look-forward)
- **Granularity**: Per product + account, expanded to related products
- **Related products**: All relationship types applicable to the base product

### 6.5 Spoofing/Layering (`spoofing_layering`)
- **Time window**: Cancellation pattern window
- **Conditions**: Cancellation pattern detected + large executed orders on opposite side + cancelled orders within/outside spread analysis
- **Granularity**: Per product + account + pattern event

---

## 7. Settings & Matching

### 7.1 Setting Categories

| Category | Examples |
|---|---|
| **Time thresholds** | Business date cutoff, trend detection sensitivity, lookback/lookforward periods |
| **Activity thresholds** | Large trading multiplier, minimum activity count |
| **Price thresholds** | VWAP proximity tolerance, price impact threshold |
| **Pattern thresholds** | Cancellation count/ratio, spread tolerance |
| **Aggregation config** | Granularity levels, time window types to include |
| **Detection levels** | Exchange, timezone, asset class, instrument type |

### 7.2 Matching Pattern Schema

```json
{
  "setting_id": "wash_vwap_threshold",
  "name": "VWAP Proximity Threshold for Wash Detection",
  "type": "decimal",
  "default": 0.02,
  "match_type": "hierarchy",
  "overrides": [
    {
      "match": {"asset_class": "equity", "exchange": "NYSE"},
      "value": 0.015,
      "priority": 2
    },
    {
      "match": {"instrument_type": "option"},
      "value": 0.03,
      "priority": 1
    },
    {
      "match": {"product_id": "AAPL"},
      "value": 0.01,
      "priority": 100
    }
  ]
}
```

### 7.3 Resolution Rules
- Product-specific match: always wins (priority 100)
- `hierarchy` match_type: most specific scope wins (deepest level in BU → Desk → Trader → Account)
- `multi_dimensional` match_type: most matching dimensions wins
- Default: always present, used when no override matches
- Resolution trace: recorded for every resolution (which override won and why)

---

## 8. UI Design

### 8.1 Style
- **Bloomberg-style Risk Case Manager** — professional, data-dense, clean
- **Configurable widgets** — panels can be added/removed in the alert detail view
- Dark/light mode support
- Clear visualization of manipulation flows

### 8.2 Views

**DEFINE**:
- **Entity Designer** — define/view canonical entities, attributes, subtypes, relationships
- **Metadata Explorer** — browse/edit calculation definitions, view the calculation DAG

**CONFIGURE**:
- **Settings Manager** — configure thresholds, matching patterns, resolution rules per entity attributes
- **Mapping Studio** — select calculation → see required canonical fields → drag-and-drop map source columns → validate → enable

**OPERATE**:
- **Pipeline Monitor** — watch calculations execute layer by layer, real-time progress via WebSocket
- **Schema Explorer** — DuckDB schema catalog: tables, columns, types, ER diagram, views
- **SQL Console** — pre-defined illustrative queries + custom SQL execution + results display

**COMPOSE**:
- **Model Composer** — deploy detection models from existing calculations, easy-to-use "model as query" interface, near-instant results
- **Data Manager** — manage source data files (CSV), view/edit, reload into engine

**INVESTIGATE**:
- **Risk Case Manager**:
  - **Alert Summary** — all alerts, filterable, sortable, clickable
  - **Alert Detail** (drill-down per alert, dynamic structure per model):
    - Business description (human-readable, business-oriented)
    - Detection level and entity context (trader, account, product, desk)
    - Product details + related products
    - Graphs: price, volume, orders timeline (with lookback/lookahead)
    - Calculation trace: interactive DAG with live values and formulas
    - Settings resolution trace: which thresholds applied and why
    - Score breakdown
    - Related data links
    - Processing logs

**AI**:
- **AI Query Assistant** — available in SQL Console and Model Composer
  - **Live mode**: Connected to LLM API, generates SQL/models from natural language
  - **Mock mode**: Pre-scripted demo sequences that produce real, deployable output
  - Configurable LLM provider and API key in Settings

**DEMO**:
- **Demo Controller** (persistent toolbar): Reset, Resume, Skip-to-End, Step-by-Step, Jump-to-Act

### 8.3 Risk Case Manager — Alert Detail Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Alert: ALT-001 │ Insider Dealing │ Score: 0.87 │ HIGH        │
├──────────────────────┬───────────────────────────────────────┤
│  Business Description│  Entity Context                       │
│  "Account ACC-42 had │  Trader: J. Smith, Desk: US Flow      │
│  unusual buying in   │  Account: ACC-42 (Institutional)      │
│  AAPL options 3 days │  Product: AAPL Jan 150 Call            │
│  before earnings..." │  Related: AAPL (underlying), AAPL Put │
├──────────────────────┼───────────────────────────────────────┤
│  Calculation Trace   │  Market Data Graph                     │
│  (interactive DAG)   │  (price + volume + orders timeline)    │
│                      │                                        │
│  [insider_dealing]   │  ████ ▂▃▅██▃▂  AAPL price             │
│    ├─large_activity  │  ▂▃▅████████▅▃  volume                 │
│    ├─market_event    │  ↑↑↑ trades by ACC-42                  │
│    ├─related_products│  ──── market event (earnings)          │
│    └─aggregations    │                                        │
├──────────────────────┼───────────────────────────────────────┤
│  Settings Resolution │  Score Breakdown                       │
│  lookback: 5 days    │  Activity score: 0.82                  │
│    (asset_class=eq)  │  Event significance: 0.91              │
│  large_threshold: 3x │  Composite: 0.87                       │
│    (global default)  │  Threshold: 0.80 (matched)             │
├──────────────────────┴───────────────────────────────────────┤
│  Related Orders & Executions                                  │
│  10:30:01 BUY  100 AAPL Jan 150 Call @ 3.50 → FILLED        │
│  10:30:15 BUY  200 AAPL Jan 150 Call @ 3.55 → FILLED        │
│  10:31:00 BUY   50 AAPL Jan 155 Call @ 2.10 → FILLED        │
├──────────────────────────────────────────────────────────────┤
│  [Logs] [Raw Data] [Related Alerts] [Export]                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Demo Flow

### 9.1 Three-Act Structure

**Act 1 — Wash Trading (Foundation)**
1. Show entity definitions (canonical model)
2. Show calculation definitions (value calc, adjusted direction, business date window)
3. Configure settings (thresholds, matching patterns)
4. Map source data to canonical fields (Mapping Studio)
5. Run pipeline: transaction calcs → business date windows → aggregations → VWAP → wash detection
6. Deploy Wash Trading Full Day model
7. **Result**: Wash Trading alerts appear in Risk Case Manager
8. **Drill down**: Investigate an alert — full trace, graphs, settings resolution

**Act 2 — Market Price Ramping (Add Trends)**
1. Enable Trend Time Window calculation
2. Show trend calculations being generated (Pipeline Monitor)
3. Combine in Model Composer: Large Trading Activity + Trend Window + "same side of trend" setting
4. Deploy MPR model
5. **Result**: MPR alerts appear
6. Show how existing aggregations are reused (no recalculation needed)

**Act 3 — Insider Dealing (Add Market Events)**
1. Enable Market Event detection calculation
2. Create Insider Dealing model in Model Composer:
   - Market Event Window (lookback)
   - Trading Activity Aggregation (buying/selling before event)
   - Related Products expansion
3. [Optional] Use AI Assistant to generate the query
4. Deploy model
5. **Result**: Insider Dealing alerts showing who traded before events and profited
6. **Climax**: Full drill-down showing the complete investigation workspace

### 9.2 Demo State Machine

```
PRISTINE → DATA_LOADED → ENTITIES_DEFINED → CALCS_DEFINED
    → SETTINGS_CONFIGURED → DATA_MAPPED
    → ACT1_PIPELINE_RUNNING → ACT1_WASH_ALERTS
    → ACT2_TRENDS_ENABLED → ACT2_MPR_ALERTS
    → ACT3_EVENTS_ENABLED → ACT3_INSIDER_ALERTS → COMPLETE
```

### 9.3 Demo Controls
- **Reset** → restore pristine snapshot → PRISTINE
- **Resume** → read demo_state.json → continue from last checkpoint
- **Skip to End** → restore final snapshot → COMPLETE
- **Step ▶** → advance one checkpoint
- **Jump to Act N** → restore act start snapshot

---

## 10. AI Query Assistant

### 10.1 Live Mode (API configured)
- LLM receives auto-generated system context: entity schemas, calculation definitions, DB schema, sample data, domain instructions
- User asks in natural language → AI generates SQL query or model JSON
- Actions: Run Query, Edit, Save as Model
- Configuration: LLM provider, API key, model selection in Settings Manager

### 10.2 Mock Mode (default / no API)
- Pre-scripted conversation sequences for the demo
- Canned questions and realistic AI responses
- Generated queries/models are real and deployable
- Steps through mock conversation on click
- Full reset capability

### 10.3 Domain Instructions
A `workspace/metadata/ai_instructions.md` file containing:
- Trade surveillance domain vocabulary
- Calculation layer architecture
- Settings resolution mechanics
- Examples of common queries and model compositions
- Available tables and relationships

---

## 11. File Organization

```
analytics-platform-demo/
├── backend/                          # Python FastAPI
│   ├── main.py                       # Entry point
│   ├── engine/
│   │   ├── calculation_engine.py     # DAG executor
│   │   ├── settings_resolver.py      # Hierarchy + multi-dim matching
│   │   ├── detection_engine.py       # Model evaluation → alerts
│   │   └── data_loader.py           # CSV → Parquet loader
│   ├── services/
│   │   ├── metadata_service.py       # JSON metadata CRUD
│   │   ├── query_service.py          # DuckDB SQL interface
│   │   ├── ai_assistant.py           # LLM integration (live + mock)
│   │   └── demo_controller.py        # State machine
│   ├── models/                       # Pydantic schemas
│   └── api/                          # FastAPI routes
│
├── frontend/                         # React app
│   └── src/
│       ├── views/
│       │   ├── EntityDesigner/
│       │   ├── MetadataExplorer/
│       │   ├── SettingsManager/
│       │   ├── MappingStudio/
│       │   ├── PipelineMonitor/
│       │   ├── SchemaExplorer/
│       │   ├── SQLConsole/
│       │   ├── ModelComposer/
│       │   ├── DataManager/
│       │   ├── RiskCaseManager/
│       │   │   ├── AlertSummary/
│       │   │   └── AlertDetail/
│       │   └── AIAssistant/
│       └── components/               # Shared widgets
│
├── workspace/                        # ALL runtime data
│   ├── metadata/                     # JSON definitions
│   │   ├── entities/
│   │   ├── calculations/
│   │   │   ├── transaction/
│   │   │   ├── time_windows/
│   │   │   ├── aggregations/
│   │   │   └── derived/
│   │   ├── settings/
│   │   ├── detection_models/
│   │   ├── mappings/
│   │   ├── related_products/
│   │   └── ai_instructions.md
│   ├── data/
│   │   ├── csv/                      # Human-readable, editable
│   │   └── parquet/                  # Engine-optimized (auto-generated)
│   ├── results/                      # Calculation outputs (Parquet)
│   │   ├── transaction/
│   │   ├── time_windows/
│   │   ├── aggregations/
│   │   └── derived/
│   ├── alerts/
│   │   ├── summary.parquet
│   │   └── traces/                   # Per-alert JSON
│   └── snapshots/
│       ├── pristine/
│       ├── act1_complete/
│       ├── act2_complete/
│       └── final/
│
├── docs/
│   ├── plans/                        # Design docs
│   ├── requirements/                 # BDD scenarios, user stories
│   ├── schemas/                      # Data dictionary, entity schemas
│   └── demo-guide.md                # Step-by-step demo walkthrough
│
├── start.sh                          # Single launch command
├── README.md                         # Project overview + quickstart
├── requirements.txt                  # Python dependencies
└── .gitignore
```

---

## 12. Data Strategy

### 12.1 Dual Storage
- **CSV files** (`workspace/data/csv/`) — human-readable, editable, one file per entity
- **Parquet files** (`workspace/data/parquet/`) — auto-generated from CSV on load, used by DuckDB engine
- If CSV is modified, re-running the loader regenerates Parquet

### 12.2 Synthetic Data
- Generated via a dedicated data generation script
- Realistic but synthetic trade data
- Contains known patterns that trigger each detection model
- Data guidelines and approval: separate milestone with dedicated session
- Always resettable to original generated data via snapshots

### 12.3 DuckDB as Analytics Engine
- Embedded, in-process — no network overhead
- Reads Parquet files directly (no ETL)
- Full SQL support: window functions, ASOF joins, time bucketing
- Schema catalog accessible via Schema Explorer
- Concurrent read access from multiple API endpoints

---

## 13. Documentation Plan

- **Google-style docstrings** on all modules, classes, functions
- **README.md** at root, backend, frontend, workspace levels
- **Demo Guide** (`docs/demo-guide.md`) — step-by-step with expected states
- **Data Dictionary** (`docs/schemas/`) — all entity schemas, field descriptions
- **API Documentation** — auto-generated from FastAPI/Pydantic
- **Requirements** (`docs/requirements/`) — BDD scenarios, user stories, capabilities

---

## 14. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Launch time** | < 10 seconds to usable UI |
| **Query response** | < 500ms for any SQL query |
| **Alert generation** | Near-instant after model deployment |
| **Portability** | Runs on macOS, Linux, Windows (WSL) |
| **Dependencies** | Python 3.11+, Node 18+, no Docker required |
| **Single command** | `./start.sh` launches everything |
| **Reset time** | < 3 seconds to restore any snapshot |

---

## 15. What This Design Does NOT Include (Future Work)

- Multi-user authentication / role-based access
- Production deployment (Kafka, Flink, Doris, Iceberg)
- Real-time streaming ingestion
- Alert distribution / notification routing
- Case management workflow (assign, escalate, close)
- Historical alert comparison
- Regulatory reporting integration
- Performance optimization for production data volumes
