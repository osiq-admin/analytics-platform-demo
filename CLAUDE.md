# Analytics Platform Demo — Claude Code Project Instructions

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. 12 views, 214 tests, 8 entities, 5 detection models.

## Quick Start
```bash
./start.sh                          # Start app on port 8000
uv run pytest tests/ -v             # Run all tests (214)
cd frontend && npm run build        # Build frontend
uv run python -m scripts.generate_data       # Regenerate CSVs
uv run python -m scripts.generate_snapshots  # Regenerate snapshots
```

## Architecture
- **Backend**: `backend/` — FastAPI + DuckDB, 9 API routers, calculation/detection engines
- **Frontend**: `frontend/` — React 19 + TypeScript + Vite, 12 views, Zustand stores
- **Data**: `workspace/` — metadata JSON, CSV data, Parquet results, alert traces
- **Tests**: `tests/` — 214 tests (unit + integration + snapshot)
- **Scripts**: `scripts/` — data generation, snapshot generation
- **Docs**: `docs/` — progress tracker, demo guide, plans, schemas

## Key Conventions
- Everything is metadata: entities, calculations, settings, models — all JSON on disk
- Dual storage: CSV (human-editable) + Parquet (engine)
- Tests run from repo root: `uv run pytest tests/ -v`
- Frontend build output: `frontend/dist/` (served by FastAPI SPA handler)

## Data Model (8 entities, ISO/FIX-aligned)
- **product** (50): ISIN, CFI, MIC, asset_class, instrument_type, underlying, strike, expiry
- **execution** (509): order_id FK, venue_mic, exec_type, capacity
- **order** (519): order_type (MARKET/LIMIT), limit_price, time_in_force, trader_id
- **md_eod** (2,150): OHLCV + prev_close, num_trades, vwap
- **md_intraday** (32K): bid/ask, trade_condition, equities + FX + futures
- **venue** (6): ISO 10383 MIC codes
- **account** (220): type, country, risk_rating
- **trader** (50): desk, trader_type

## Workflow Preferences
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
- Use subagent-driven development for same-session execution

## Plans & Progress
- All plans: `docs/plans/` (design doc, phase 1-6 implementation plans)
- Progress tracker: `docs/progress.md` (M0-M65 complete)
- Demo guide: `docs/demo-guide.md`
