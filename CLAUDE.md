# Analytics Platform Demo — Claude Code Project Instructions

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. 16 views, 473 tests (386 backend + 87 E2E), 8 entities, 5 detection models, 25 guided scenarios.

## Quick Start
```bash
./start.sh                          # Start app on port 8000
uv run pytest tests/ --ignore=tests/e2e -v   # Run backend tests (386)
uv run pytest tests/e2e/ -v                   # Run E2E Playwright tests (87)
cd frontend && npm run build                  # Build frontend (952 modules)
uv run python -m scripts.generate_data        # Regenerate CSVs
uv run python -m scripts.generate_snapshots   # Regenerate snapshots
```

## Architecture
- **Backend**: `backend/` — FastAPI + DuckDB, 9 API routers, calculation/detection engines
- **Frontend**: `frontend/` — React 19 + TypeScript + Vite, 16 views, Zustand stores
- **Data**: `workspace/` — metadata JSON, CSV data, Parquet results, alert traces
- **Tests**: `tests/` — 386 backend tests + 87 E2E Playwright tests
- **Scripts**: `scripts/` — data generation, snapshot generation
- **Docs**: `docs/` — progress tracker, demo guide, plans, schemas, checklists

## Key Conventions
- Everything is metadata: entities, calculations, settings, models — all JSON on disk
- Dual storage: CSV (human-editable) + Parquet (engine)
- Tests run from repo root: `uv run pytest tests/ -v`
- Frontend build output: `frontend/dist/` (served by FastAPI SPA handler)
- **ALWAYS follow `docs/development-guidelines.md`** for all frontend work — covers Recharts patterns, tooltip styling, label formatting, table conventions, Zustand selectors, CSS containment
- Shared utilities: `frontend/src/utils/format.ts` (formatLabel), `frontend/src/constants/chartStyles.ts` (tooltip/tick styles)

## Data Model (8 entities, ISO/FIX-aligned)
- **product** (50): ISIN, CFI, MIC, asset_class, instrument_type, underlying, strike, expiry
- **execution** (509): order_id FK, venue_mic, exec_type, capacity
- **order** (519): order_type (MARKET/LIMIT), limit_price, time_in_force, trader_id
- **md_eod** (2,150): OHLCV + prev_close, num_trades, vwap
- **md_intraday** (32K): bid/ask, trade_condition, equities + FX + futures
- **venue** (6): ISO 10383 MIC codes
- **account** (220): type, country, risk_rating
- **trader** (50): desk, trader_type

## Feature Development Workflow
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- **ALWAYS reference the Feature Development Checklist** (`docs/feature-development-checklist.md`) when starting any new feature — it lists every system that needs updating (tests, tours, scenarios, operation scripts, docs, etc.)
- Check existing plans in `docs/plans/` and build on them
- Use subagent-driven development for same-session execution
- After completing a feature: update progress.md, demo-guide.md, CLAUDE.md, MEMORY.md, then commit, push, merge

## Broad Systems Requiring Updates on New Features
These systems MUST be updated whenever certain feature types are added. See `docs/feature-development-checklist.md` Section 10 for full details:
- **New View** → sidebar link, route, tour, operation scripts, scenarios, E2E tests, demo guide
- **New Entity** → entity JSON, data generation, relationships, Entity Designer, Schema Explorer, data dictionary
- **New Calculation** → calc JSON, DAG, Metadata Explorer, calculation schemas
- **New Detection Model** → model JSON, Model Composer, alerts, Risk Cases, regulatory map, BDD
- **New Setting** → setting JSON, Settings Manager, resolution tester, overrides
- **New API Endpoint** → route, Pydantic model, backend test, E2E test, frontend integration

## Plans & Progress
- All plans: `docs/plans/` (design doc, phase 1-12 implementation plans)
- Progress tracker: `docs/progress.md` (M0-M120 complete)
- Demo guide: `docs/demo-guide.md`
- Feature checklist: `docs/feature-development-checklist.md`
- Development guidelines: `docs/development-guidelines.md`
- Testing checklist: `docs/phase7b-testing-checklist.md`
