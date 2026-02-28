# Analytics Platform Demo — Session Memory

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Pitching to product team — E2E concept demo, not production.

## Current State (2026-02-28)
- **Branch**: `feature/pipeline/silver-to-gold-orchestration` — Phase 17 complete (M0-M204), ready for PR
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 800 total (590 backend + 210 E2E Playwright) — ALL PASSING
- **Frontend**: builds clean — 969 modules (`cd frontend && npm run build`)
- **Views**: 18 (Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, UseCaseStudio, RiskCaseManager, AIAssistant, MetadataEditor, RegulatoryMap, Submissions, MedallionOverview, DataOnboarding)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)
- **Detection Models**: 5 (wash trading x2, market price ramping, insider dealing, spoofing/layering)
- **Alerts**: 82 across 5 models and 5 asset classes (MPR 68%, wash 17%, insider 9%, spoofing 6%)
- **Architecture**: 82 sections, 82.9% metadata-driven
- **Tour scenarios**: 30 guided scenarios (S1-S30) in 10 categories
- **Operation scripts**: 109 operations across 18 views
- **Roadmap**: Restructured to 33 phases across 7 tiers — medallion architecture (11 tiers), data governance, business glossary, migration readiness
- **Latest**: Phase 17 Silver-to-Gold Pipeline Orchestration complete (M197-M204). Contract validator, pipeline orchestrator, Silver-to-Gold mapping + data contract, MappingStudio tier selectors, PipelineMonitor overhaul (true DAG edges + medallion stages progress bar), MedallionOverview execution status + Run Stage, S30 scenario. Next: Phase 18 (Data Quality)

## Key Files
- **Development workflow protocol**: `docs/development-workflow-protocol.md` — MANDATORY for every feature lifecycle
- **Feature checklist**: `docs/feature-development-checklist.md` — MANDATORY reference for every new feature
- **Comprehensive roadmap**: `docs/plans/2026-02-24-comprehensive-roadmap.md` — 33 phases, 7 tiers, medallion architecture
- Progress tracker: `docs/progress.md`
- Design doc: `docs/plans/2026-02-23-analytics-platform-demo-design.md`
- Demo guide: `docs/demo-guide.md`
- Data gen: `scripts/generate_data.py`
- Snapshot gen: `scripts/generate_snapshots.py`
- Medallion tiers: `workspace/metadata/medallion/tiers.json`
- Medallion contracts: `workspace/metadata/medallion/contracts.json`
- Medallion transformations: `workspace/metadata/medallion/transformations.json`
- Medallion pipeline stages: `workspace/metadata/medallion/pipeline_stages.json`
- Medallion Pydantic models: `backend/models/medallion.py`
- Medallion API router: `backend/api/medallion.py`
- MedallionOverview view: `frontend/src/views/MedallionOverview/index.tsx`

## Commands
```bash
./start.sh                                    # Start app on port 8000
uv run pytest tests/ --ignore=tests/e2e -v    # Backend tests (590)
uv run pytest tests/e2e/ -v                   # E2E Playwright tests (210)
cd frontend && npm run build                  # Build frontend (969 modules)
```

## Workflow Preferences
- **ALWAYS follow `docs/development-workflow-protocol.md`** — Pre-Work → Planning → Execution → Completion
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
