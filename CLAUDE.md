# Analytics Platform Demo — Claude Code Project Instructions

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. 18 views, 772 tests (562 backend + 210 E2E), 8 entities, 5 detection models, 29 guided scenarios.

## Quick Start
```bash
./start.sh                          # Start app on port 8000
uv run pytest tests/ --ignore=tests/e2e -v   # Run backend tests (562)
uv run pytest tests/e2e/ -v                   # Run E2E Playwright tests (210)
cd frontend && npm run build                  # Build frontend (969 modules)
uv run python -m scripts.generate_data        # Regenerate CSVs
uv run python -m scripts.generate_snapshots   # Regenerate snapshots
```

## Architecture
- **Backend**: `backend/` — FastAPI + DuckDB, 9 API routers, calculation/detection engines
- **Frontend**: `frontend/` — React 19 + TypeScript + Vite, 18 views, Zustand stores
- **Data**: `workspace/` — metadata JSON, CSV data, Parquet results, alert traces
- **Metadata types**: entities, calculations, settings, detection_models, widgets, query_presets, navigation, format_rules, audit_trail, standards (iso, fix, compliance), grids, view_config, theme, workflows, demo, tours, medallion, connectors, mappings
- **Navigation**: metadata-driven (`workspace/metadata/navigation/main.json`)
- **Tests**: `tests/` — 562 backend tests + 210 E2E Playwright tests
- **Scripts**: `scripts/` — data generation, snapshot generation
- **Docs**: `docs/` — progress tracker, demo guide, plans, schemas, checklists

## Key Conventions
- Everything is metadata: entities, calculations, settings, models — all JSON on disk
- Dual storage: CSV (human-editable) + Parquet (engine)
- Tests run from repo root: `uv run pytest tests/ -v`
- Frontend build output: `frontend/dist/` (served by FastAPI SPA handler)
- **ALWAYS follow `docs/development-guidelines.md`** for all frontend work — covers Recharts patterns, tooltip styling, label formatting, table conventions, Zustand selectors, CSS containment
- Shared utilities: `frontend/src/utils/format.ts` (formatLabel), `frontend/src/constants/chartStyles.ts` (tooltip/tick styles)
- **View layout**: Vertical resizable panes (`react-resizable-panels`) for list-detail views; see `docs/development-guidelines.md` View Layout Patterns section

## Data Model (8 entities, ISO/FIX-aligned)
- **product** (50): ISIN, CFI, MIC, asset_class, instrument_type, underlying, strike, expiry
- **execution** (761): order_id FK, venue_mic, exec_type, capacity
- **order** (786): order_type (MARKET/LIMIT), limit_price, time_in_force, trader_id
- **md_eod** (2,150): OHLCV + prev_close, num_trades, vwap
- **md_intraday** (32K): bid/ask, trade_condition, equities + FX + futures
- **venue** (6): ISO 10383 MIC codes
- **account** (220): type, country, risk_rating
- **trader** (50): desk, trader_type

## Feature Development Workflow
- **ALWAYS follow `docs/development-workflow-protocol.md`** — the single authoritative protocol covering Pre-Work → Planning → Execution → Completion
- **Phase A (Pre-Work)**: Verify clean git state, read current docs, verify test suite before starting
- **Phase B (Planning)**: Invoke `/writing-plans` skill, create plan doc, update roadmap, commit plan
- **Phase C (Execution)**: Follow the plan, run Tier 1/2 checks at milestones
- **Phase D (Completion)**: Run the 3-tier Milestone Completion Protocol — updates ALL docs, syncs ALL counts
- **ALWAYS reference the Feature Development Checklist** (`docs/feature-development-checklist.md`) for which systems need updating

## Broad Systems Requiring Updates on New Features
These systems MUST be updated whenever certain feature types are added. See `docs/feature-development-checklist.md` Section 10 for full details:
- **New View** → sidebar link, route, tour, operation scripts, scenarios, E2E tests, demo guide
- **New Entity** → entity JSON, data generation, relationships, Entity Designer, Schema Explorer, data dictionary
- **New Calculation** → calc JSON, DAG, Metadata Explorer, calculation schemas
- **New Detection Model** → model JSON, Model Composer, alerts, Risk Cases, regulatory map, BDD
- **New Setting** → setting JSON, Settings Manager, resolution tester, overrides
- **New API Endpoint** → route, Pydantic model, backend test, E2E test, frontend integration

## Plans & Progress
- **Development workflow protocol**: `docs/development-workflow-protocol.md` — MANDATORY for every feature lifecycle
- **Comprehensive roadmap**: `docs/plans/2026-02-24-comprehensive-roadmap.md` — 33 phases across 7 tiers (medallion architecture, data governance, standards, migration readiness)
- All plans: `docs/plans/` (design doc, phase 1-12 implementation plans)
- Progress tracker: `docs/progress.md` (M0-M196 complete)
- Demo guide: `docs/demo-guide.md`
- Feature checklist: `docs/feature-development-checklist.md`
- Development guidelines: `docs/development-guidelines.md`
- Testing checklist: `docs/phase7b-testing-checklist.md`
