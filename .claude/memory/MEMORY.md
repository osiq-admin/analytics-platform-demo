# Analytics Platform Demo — Session Memory

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Pitching to product team — E2E concept demo, not production.

## Current State (2026-02-27)
- **Branch**: `main` — all phases complete (M0-M174), fully merged and pushed
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 716 total (506 backend + 210 E2E Playwright) — ALL PASSING
- **Frontend**: builds clean — 969 modules (`cd frontend && npm run build`)
- **Views**: 16 (Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, UseCaseStudio, RiskCaseManager, AIAssistant, MetadataEditor, RegulatoryMap, Submissions)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)
- **Detection Models**: 5 (wash trading x2, market price ramping, insider dealing, spoofing/layering)
- **Alerts**: 82 across 5 models and 5 asset classes (MPR 68%, wash 17%, insider 9%, spoofing 6%)
- **Architecture**: 74 sections, 83.8% metadata-driven
- **Tour scenarios**: 26 guided scenarios (S1-S26) in 7 categories
- **Operation scripts**: 89 operations across 16 views
- **Roadmap**: Restructured to 33 phases across 7 tiers — medallion architecture (11 tiers), data governance, business glossary, migration readiness
- **Next priority**: Phase 14 (Medallion Core) → Phases 15-17 (Onboarding + Mapping)

## Key Files
- **Development workflow protocol**: `docs/development-workflow-protocol.md` — MANDATORY for every feature lifecycle
- **Feature checklist**: `docs/feature-development-checklist.md` — MANDATORY reference for every new feature
- **Comprehensive roadmap**: `docs/plans/2026-02-24-comprehensive-roadmap.md` — 33 phases, 7 tiers, medallion architecture
- Progress tracker: `docs/progress.md`
- Design doc: `docs/plans/2026-02-23-analytics-platform-demo-design.md`
- Demo guide: `docs/demo-guide.md`
- Data gen: `scripts/generate_data.py`
- Snapshot gen: `scripts/generate_snapshots.py`

## Commands
```bash
./start.sh                                    # Start app on port 8000
uv run pytest tests/ --ignore=tests/e2e -v    # Backend tests (506)
uv run pytest tests/e2e/ -v                   # E2E Playwright tests (210)
cd frontend && npm run build                  # Build frontend (969 modules)
```

## Workflow Preferences
- **ALWAYS follow `docs/development-workflow-protocol.md`** — Pre-Work → Planning → Execution → Completion
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
