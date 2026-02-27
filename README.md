# Analytics Platform Demo

A metadata-driven trade surveillance analytics platform demo (Risk Case Manager). End-to-end flow from raw trading data through calculation pipelines, detection models, and alert investigation — everything defined as JSON metadata, nothing hardcoded.

Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Single process, single command, no Docker.

## Quick Start

```bash
# Prerequisites: Python 3.11+, Node.js 18+, uv

# Install dependencies
uv sync
cd frontend && npm install && cd ..

# Generate synthetic data (optional — pre-generated data included)
uv run python -m scripts.generate_data

# Generate demo snapshots (optional — enables demo checkpoints)
uv run python -m scripts.generate_snapshots

# Launch (builds frontend + starts server)
./start.sh
# → Open http://localhost:8000
```

## Architecture

```
┌──────────────────────────────────────────────┐
│  React 19 SPA (971 Vite modules)             │
│  AG Grid · TradingView Charts · Monaco       │
│  React Flow · Recharts · Zustand (11 stores) │
│  Tailwind CSS 4 · react-resizable-panels     │
└──────────────────┬───────────────────────────┘
                   │ /api/* (20 route modules)
┌──────────────────┴───────────────────────────┐
│  FastAPI Backend                             │
│  Calculation Engine · Detection Engine       │
│  Settings Resolver · Alert Service           │
│  5-Layer Validation · Version Manager        │
│  AI Assistant (Claude API / Mock)            │
└──────────────────┬───────────────────────────┘
                   │ SQL
┌──────────────────┴───────────────────────────┐
│  DuckDB (embedded)                           │
│  CSV → Parquet → SQL Views                   │
└──────────────────────────────────────────────┘
```

## What It Does

### 8 Entities (ISO/FIX-aligned)

| Entity | Records | Key Fields |
|--------|---------|------------|
| **product** | 50 | ISIN, CFI, MIC, asset_class, instrument_type, strike, expiry |
| **execution** | 509 | order_id FK, venue_mic, exec_type, capacity |
| **order** | 519 | order_type, limit_price, time_in_force, trader_id |
| **md_eod** | 2,150 | OHLCV + prev_close, num_trades, vwap |
| **md_intraday** | 32K | bid/ask, trade_condition (equities, FX, futures) |
| **venue** | 6 | ISO 10383 MIC codes |
| **account** | 220 | type, country, risk_rating |
| **trader** | 50 | desk, trader_type |

### 5 Detection Models

| Model | What It Detects |
|-------|----------------|
| **Wash Trading — Full Day** | Account trading with itself to inflate volume (daily) |
| **Wash Trading — Intraday** | Same pattern at tick-level granularity |
| **Market Price Ramping** | Aggressive trading to amplify price trends |
| **Insider Dealing** | Trading before material market events |
| **Spoofing/Layering** | Placing/cancelling orders to create false demand |

### 10 Calculations (4 Layers)

| Layer | Calculations |
|-------|-------------|
| **Transaction** | Value Calculation, Adjusted Direction |
| **Time Windows** | Business Date Window, Trend Window, Market Event Window, Cancellation Pattern |
| **Aggregations** | Trading Activity Aggregation, VWAP Calculation |
| **Derived** | Large Trading Activity, Wash Detection |

### Graduated Scoring

- **MUST_PASS** calculations act as gates (e.g., must have offsetting trades)
- **OPTIONAL** calculations contribute graduated scores via configurable score steps
- Alert fires when: all gates pass AND (all checks pass OR score >= threshold)
- Settings resolve per entity context: product-specific → hierarchy/multi-dim → default fallback

## 18 Views

| Area | View | What It Does |
|------|------|-------------|
| **Overview** | Dashboard | Summary cards, 4 chart widgets with type switching + visibility toggles |
| **Define** | Entity Designer | 8 entities with fields, relationships, domain values, React Flow graph |
| | Metadata Explorer | Calculation browser with DAG, SQL logic, layer visualization |
| **Configure** | Settings Manager | Hierarchical overrides, score steps, resolution tester |
| | Mapping Studio | Drag-and-drop source → canonical field mapping |
| | Metadata Editor | Side-by-side Monaco JSON + visual form, bidirectional sync |
| **Compose** | Model Composer | 7-step wizard: Define → Calcs → Scoring → Query → Review → Test → Deploy |
| | Data Manager | Browse and preview loaded data tables |
| | Use Case Studio | 5-step wizard for test scenarios with sample data + expected results |
| **Operate** | Pipeline Monitor | Calculation DAG execution status |
| | Schema Explorer | DuckDB tables, columns, types |
| | SQL Console | Monaco editor, preset queries, AI-assisted query generation |
| **Investigate** | Risk Case Manager | Alert grid → 6-panel investigation workspace |
| | AI Assistant | Claude-powered chat (live or mock) with Run Query integration |
| **Governance** | Regulatory Map | Traceability graph + regulation details (MAR, MiFID II, Dodd-Frank, FINRA) |
| | Submissions | Review queue with auto-recommendations, approve/reject workflow |
| **Architecture** | Medallion Overview | 11-tier medallion data architecture with React Flow, data contracts, pipeline stages |
| | Data Onboarding | 5-step wizard: Source → Schema → Profile → Mapping → Review, 6 connector types |

## Key Features

### Alert Investigation Workspace (Risk Case Manager)

Six-panel layout with toggle toolbar — every alert is fully traceable:

1. **Business Description** — model, trigger path, score vs. threshold
2. **Entity Context** — product, account, date, asset class badges
3. **Calculation Trace DAG** — React Flow graph with computed values, scores, pass/fail colors
4. **Market Data Chart** — TradingView candlesticks (EOD/intraday toggle, time range selector)
5. **Settings Resolution** — which thresholds applied and why (override vs. default)
6. **Score Breakdown** — Recharts bar chart with threshold line, MUST_PASS/OPTIONAL badges
7. **Trade Volume** — 90-day daily execution volume with alert date marker
8. **Related Orders & Executions** — AG Grid with filters

### 7-Step Model Composer Wizard

Build detection models from scratch with real-time validation:
- Define → Calculations → Scoring → Query → Review → Test Run → Deploy
- Right panel: validation checklist, score preview chart, dependency DAG
- AI Calc Builder: natural language → calculation JSON with confidence scores
- Score Step Builder: visual range bars with gap/overlap detection, template library
- Examples library: pre-built models/settings/calcs as starting points

### OOB vs User Metadata Layers

Clean separation between out-of-box (vendor-shipped) and user customizations:
- All metadata items carry a `metadata_layer` field (OOB / Custom / Modified)
- Edit an OOB item → creates a user override, original preserved
- Reset to OOB with one click, upgrade simulation with conflict detection

### Architecture Traceability Mode

Toolbar toggle overlays info icons on every section across all 18 views:
- 80 traced sections showing source files, Zustand stores, API endpoints, metadata sources
- 5-level metadata maturity rating per section (Fully Metadata-Driven → Infrastructure)
- Improvement opportunities for each section

### Use Cases & Governance

- **Use Case Studio**: 5-step wizard (Describe → Components → Sample Data → Expected → Review)
- **Submissions**: AG Grid queue with status badges, auto-recommendations, approve/reject/request changes
- **5-Layer Validation**: static analysis → schema compatibility → sandbox execution → impact analysis → regression safety
- **Version Management**: snapshot-based versioning, side-by-side diff, one-click rollback

### Guided Experience

- **28 scenarios** in 9 categories with Watch Demo (auto-play) and Try It Yourself (interactive) modes
- **Per-view tours** with spotlight overlay and step-by-step popovers
- **3 demo workflow guides** (Act 1: data discovery, Act 2: model composition, Act 3: investigation)
- **104 operation scripts** across 18 views via per-view help panels
- **Onboarding modal** for first-time visitors
- **8 demo checkpoints**: Pristine → Data Loaded → Pipeline Run → Alerts → Acts 1-3 → Final

## Project Structure

```
├── backend/             # Python FastAPI backend
│   ├── api/             # 20 API route modules
│   ├── engine/          # Calculation, detection, data loading
│   ├── models/          # Pydantic data models
│   └── services/        # Business logic services
├── frontend/            # React 19 TypeScript SPA
│   └── src/
│       ├── views/       # 18 view components
│       ├── components/  # Shared UI components
│       ├── stores/      # 11 Zustand state stores
│       ├── data/        # Tours, scenarios, operations, traceability
│       └── api/         # API client + WebSocket
├── workspace/           # Runtime data directory
│   ├── metadata/        # JSON definitions (entities, calcs, settings, models)
│   ├── data/            # CSV source + Parquet derived
│   ├── results/         # Calculation output Parquet files
│   ├── alerts/          # Alert traces (JSON) + summary (Parquet)
│   ├── use_cases/       # Use case definitions
│   └── snapshots/       # Demo checkpoint snapshots
├── scripts/             # Data generation + snapshot generation
├── tests/               # 759 tests (549 backend + 210 E2E Playwright)
└── docs/                # Design docs, plans, progress tracker
```

## Testing

```bash
# Backend tests (549)
uv run pytest tests/ --ignore=tests/e2e -v

# E2E Playwright tests (210)
uv run pytest tests/e2e/ -v

# Frontend build
cd frontend && npm run build
```

759 tests total: 549 backend unit/integration + 210 E2E Playwright. All 18 views have dedicated E2E coverage.

## Development

```bash
# Frontend dev server (with hot reload)
cd frontend && npm run dev

# Backend dev server (with auto-reload)
uv run uvicorn backend.main:app --reload --port 8000

# Regenerate data
uv run python -m scripts.generate_data
uv run python -m scripts.generate_snapshots
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11+, FastAPI, DuckDB, PyArrow, Pydantic v2 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Data Grid | AG Grid Community |
| Charts | TradingView Lightweight Charts, Recharts |
| DAG & Graphs | React Flow + dagre |
| Editor | Monaco Editor |
| State | Zustand (11 stores) |
| Layout | react-resizable-panels |
| AI | Claude API (live) or mock mode |
| Package Manager | uv (Python), npm (Node) |

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Server won't start | Run `uv sync` to install dependencies |
| Frontend not loading | Run `cd frontend && npm install && npm run build` |
| No data visible | Click **Reset** then **Skip to End** |
| No alerts | Run `uv run python -m scripts.generate_snapshots` |
| AI not responding | Mock mode is the default — set `LLM_API_KEY` env var for live mode |
| DuckDB lock error | Another process holds the lock — `lsof workspace/analytics.duckdb` |
| Stale UI after build | Restart server + hard-reload browser (both cache aggressively) |
