# Analytics Platform Demo — Session Memory

## Project Overview
Trade surveillance risk case management demo. Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. 12 views, 214 tests, 5 detection models, 8 entities.

## Current State (2026-02-24)
- **Branch**: `main` (Phase 6 merged)
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 214 passing (`uv run pytest tests/ -v`)
- **Frontend**: Builds clean (895 modules, `cd frontend && npm run build`)
- **Phases 1-6**: All complete (M0-M65)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)

## Key Files
- Progress tracker: `docs/progress.md`
- Design doc: `docs/plans/2026-02-23-analytics-platform-demo-design.md`
- Phase 5 plan: `docs/plans/2026-02-23-phase5-data-ux-plan.md`
- Phase 6 plan: `docs/plans/2026-02-24-phase6-data-model-plan.md`
- Demo guide: `docs/demo-guide.md`
- Data gen: `scripts/generate_data.py`
- Snapshot gen: `scripts/generate_snapshots.py`

## Architecture Notes
See [architecture.md](architecture.md) for tech stack and patterns.

## Next Steps
See [next-steps.md](next-steps.md) for detailed TODO list.

## Workflow Preferences
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
