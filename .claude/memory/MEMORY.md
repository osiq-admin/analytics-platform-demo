# Analytics Platform Demo — Session Memory

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Pitching to product team — E2E concept demo, not production.

## Current State (2026-02-28)
- **Branch**: `feature/reference/reference-data-mdm` — Phase 19 + QA toolkit complete, merging to main
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 1018 total (794 backend + 224 E2E Playwright) — ALL PASSING
- **QA Automation**: `qa/` toolkit — `uv run python -m qa <command>` for test, quality, report, gate, baseline, watch, hooks
- **Frontend**: builds clean — 971 modules (`cd frontend && npm run build`)
- **Views**: 20 (Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, UseCaseStudio, RiskCaseManager, AIAssistant, MetadataEditor, RegulatoryMap, Submissions, MedallionOverview, DataOnboarding, DataQuality, ReferenceData)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)
- **Detection Models**: 5 (wash trading x2, market price ramping, insider dealing, spoofing/layering)
- **Alerts**: 82 across 5 models and 5 asset classes (MPR 68%, wash 17%, insider 9%, spoofing 6%)
- **Architecture**: 94 sections, 81.9% metadata-driven
- **Tour scenarios**: 32 guided scenarios (S1-S32) in 12 categories
- **Operation scripts**: 122 operations across 20 views
- **Golden records**: 301 total (25 product, 6 venue, 220 account, 50 trader)
- **Roadmap**: 33 phases across 7 tiers — medallion architecture (11 tiers), data governance, business glossary, migration readiness
- **Latest**: Phase 19 Reference Data & MDM complete (M216-M227) + QA Automation Toolkit. Next: Phase 20 (Platinum/Sandbox/Archive)

## Key Files
- **Development workflow protocol**: `docs/development-workflow-protocol.md` — MANDATORY for every feature lifecycle
- **Feature checklist**: `docs/feature-development-checklist.md` — MANDATORY reference for every new feature
- **Comprehensive roadmap**: `docs/plans/2026-02-24-comprehensive-roadmap.md` — 33 phases, 7 tiers
- **Development guidelines**: `docs/development-guidelines.md` — frontend patterns + QA automation
- Progress tracker: `docs/progress.md`
- Demo guide: `docs/demo-guide.md`
- QA config: `qa/config/` (suites.json, tools.json, gate.json)
- QA reports: `qa/reports/` (runs/, quality/, baselines/)
- Reference models: `backend/models/reference.py`
- Reference service: `backend/services/reference_service.py`
- Reference API: `backend/api/reference.py`
- Reference configs: `workspace/metadata/reference/` (product, venue, account, trader)
- Golden records: `workspace/reference/` (product_golden, venue_golden, account_golden, trader_golden)
- ReferenceData view: `frontend/src/views/ReferenceData/index.tsx`

## Commands
```bash
./start.sh                                      # Start app on port 8000
uv run python -m qa test backend                # Backend tests (794)
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
