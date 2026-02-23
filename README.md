# Analytics Platform Demo

A metadata-driven trade surveillance analytics platform demo featuring a Bloomberg-style Risk Case Manager UI, showing end-to-end flow from raw trading data to alert investigation.

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

**Single process, single command, no Docker.** Python FastAPI serves both the API and the React SPA.

```
┌─────────────────────────────────────────┐
│  React SPA (Vite + TypeScript)          │
│  AG Grid · TradingView Charts · Monaco  │
│  React Flow · Zustand · Tailwind CSS 4  │
└───────────────┬─────────────────────────┘
                │ /api/*
┌───────────────┴─────────────────────────┐
│  FastAPI Backend                        │
│  Calculation Engine · Detection Engine  │
│  Settings Resolver · Alert Service      │
│  AI Assistant (Claude API / Mock)       │
└───────────────┬─────────────────────────┘
                │ SQL
┌───────────────┴─────────────────────────┐
│  DuckDB (embedded)                      │
│  CSV → Parquet → SQL Views              │
└─────────────────────────────────────────┘
```

## What It Does

### Detection Models

The platform detects 4 types of market manipulation:

| Model | What It Detects |
|-------|----------------|
| **Wash Trading** | Account trading with itself to inflate volume |
| **Market Price Ramping** | Aggressive trading to amplify price trends |
| **Insider Dealing** | Trading before material market events |
| **Spoofing/Layering** | Placing/cancelling orders to create false demand |

### Graduated Scoring

Each model uses a graduated scoring system:
- **MUST_PASS** calculations act as gates (e.g., must have offsetting trades)
- **OPTIONAL** calculations contribute graduated scores (e.g., quantity match ratio → score)
- Alert fires when: all gates pass AND (all checks pass OR score >= threshold)

### Demo Flow

The platform has 8 checkpoints that walk through a complete demo:

1. **Pristine** — Empty workspace, metadata only
2. **Data Loaded** — 519 executions, 532 orders, market data
3. **Pipeline Run** — 10 calculations executed across 4 layers
4. **Alerts Generated** — 5 detection models evaluated, alerts fired
5. **Act 1 Complete** — Investigation phase
6. **Model Deployed** — New model configuration
7. **Act 2 Complete** — Re-evaluation
8. **Final** — Complete demo state

## Project Structure

```
├── backend/           # Python FastAPI backend
│   ├── api/           # API route handlers
│   ├── engine/        # Calculation, detection, data loading
│   ├── models/        # Pydantic data models
│   └── services/      # Business logic services
├── frontend/          # React TypeScript SPA
│   └── src/
│       ├── views/     # 11 view components
│       ├── components/# Shared UI components
│       ├── stores/    # Zustand state stores
│       └── api/       # API client + WebSocket
├── workspace/         # Runtime data directory
│   ├── metadata/      # JSON definitions (entities, calcs, settings, models)
│   ├── data/          # CSV source + Parquet derived
│   ├── results/       # Calculation output Parquet files
│   ├── alerts/        # Alert traces (JSON) + summary (Parquet)
│   └── snapshots/     # Demo checkpoint snapshots
├── scripts/           # Data generation + snapshot generation
├── tests/             # pytest test suite
└── docs/              # Design docs, plans, progress tracker
```

## Development

```bash
# Run tests
uv run pytest tests/ -v

# Frontend dev server (with hot reload)
cd frontend && npm run dev

# Backend dev server (with auto-reload)
uv run uvicorn backend.main:app --reload --port 8000
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11+, FastAPI, DuckDB, PyArrow, Pydantic v2 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Data Grid | AG Grid Community |
| Charts | TradingView Lightweight Charts, Recharts |
| DAG Viz | React Flow + dagre |
| Editor | Monaco Editor |
| State | Zustand |
| AI | Claude API (live) or mock mode |
