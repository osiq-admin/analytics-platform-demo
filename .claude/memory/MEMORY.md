# Analytics Platform Demo — Session Memory

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Pitching to product team — E2E concept demo, not production.

## Current State (2026-03-01)
- **Branch**: `feature/analytics-tiers/extended-tiers` — Phase 21 (Iceberg Lakehouse) complete
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 1186 total (962 backend + 224 E2E Playwright) — ALL PASSING
- **QA Automation**: `qa/` toolkit — `uv run python -m qa <command>` for test, quality, report, gate, baseline, watch, hooks
- **Frontend**: builds clean — 971 modules (`cd frontend && npm run build`)
- **Views**: 21 (Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, UseCaseStudio, RiskCaseManager, AIAssistant, MetadataEditor, RegulatoryMap, Submissions, MedallionOverview, DataOnboarding, DataQuality, ReferenceData, AnalyticsTiers)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)
- **Detection Models**: 5 (wash trading x2, market price ramping, insider dealing, spoofing/layering)
- **Alerts**: 82 across 5 models and 5 asset classes (MPR 68%, wash 17%, insider 9%, spoofing 6%)
- **Architecture**: 100 sections across 21 views, 81% metadata-driven
- **Tour scenarios**: 33 guided scenarios (S1-S33) in 13 categories
- **Operation scripts**: 123 operations across 21 views
- **Golden records**: 301 total (25 product, 6 venue, 220 account, 50 trader)
- **Milestones**: M0-M256 complete
- **Roadmap**: 33 phases across 7 tiers — medallion architecture, data governance, business glossary, migration readiness
- **Latest**: Phase 21 Iceberg Lakehouse Architecture complete (M243-M256). LakehouseService, governance metadata, schema evolution, PII tagging, calculate-once audit, pipeline versioning. Lakehouse Explorer tab in MedallionOverview. Next: Phase 22+

## Key Files
- **Development workflow protocol**: `docs/development-workflow-protocol.md` — MANDATORY for every feature lifecycle
- **Feature checklist**: `docs/feature-development-checklist.md` — MANDATORY reference for every new feature
- **Comprehensive roadmap**: `docs/plans/2026-02-24-comprehensive-roadmap.md` — 33 phases, 7 tiers
- **Development guidelines**: `docs/development-guidelines.md` — frontend patterns + QA automation
- Progress tracker: `docs/progress.md`
- Demo guide: `docs/demo-guide.md`
- QA config: `qa/config/` (suites.json, tools.json, gate.json)
- QA reports: `qa/reports/` (runs/, quality/, baselines/)
- Lakehouse service: `backend/services/lakehouse_service.py`
- Lakehouse API: `backend/api/lakehouse.py`
- Lakehouse models: `backend/models/lakehouse.py`
- Governance metadata: `workspace/metadata/governance/`
- Lakehouse metadata: `workspace/metadata/lakehouse/`
- Architecture registry: `frontend/src/data/architectureRegistry.ts` (100 sections)
- Tour definitions: `frontend/src/data/tourDefinitions.ts`
- Scenario definitions: `frontend/src/data/scenarioDefinitions.ts`
- Operation scripts: `frontend/src/data/operationScripts.ts`

## Commands
```bash
./start.sh                                      # Start app on port 8000
uv run python -m qa test backend                # Backend tests (962)
uv run python -m qa test e2e                    # E2E Playwright tests (224)
uv run python -m qa quality --python            # Quality scan (ruff, bandit, radon, vulture, coverage)
uv run python -m qa gate                        # Quality gate evaluation
uv run python -m qa report                      # Latest test report
uv run python -m qa report --regression         # Regression analysis
uv run python -m qa baseline update             # Save regression baseline
cd frontend && npm run build                    # Build frontend (971 modules)
```

## Workflow Preferences
- **ALWAYS follow `docs/development-workflow-protocol.md`** — Pre-Work → Planning → Execution → Completion
- **ALWAYS use QA automation framework** — never run direct pytest/ruff/bandit commands
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
