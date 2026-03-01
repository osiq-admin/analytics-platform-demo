# Analytics Platform Demo — Session Memory

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Pitching to product team — E2E concept demo, not production.

## Current State (2026-03-01)
- **Branch**: `feature/glossary/business-glossary` — Phase 23 (Business Glossary & Semantic Layer) complete
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 1343 total (1105 backend + 238 E2E Playwright) — ALL PASSING
- **QA Automation**: `qa/` toolkit — `uv run python -m qa <command>` for test, quality, report, gate, baseline, watch, hooks
- **Frontend**: builds clean — 975 modules (`cd frontend && npm run build`)
- **Views**: 23 (Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, UseCaseStudio, RiskCaseManager, AIAssistant, MetadataEditor, RegulatoryMap, Submissions, MedallionOverview, DataOnboarding, DataQuality, ReferenceData, AnalyticsTiers, DataGovernance, BusinessGlossary)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)
- **Detection Models**: 5 (wash trading x2, market price ramping, insider dealing, spoofing/layering)
- **Alerts**: 82 across 5 models and 5 asset classes (MPR 68%, wash 17%, insider 9%, spoofing 6%)
- **Architecture**: 112 sections across 23 views, 83% metadata-driven
- **Tour scenarios**: 35 guided scenarios (S1-S35) in 15 categories
- **Operation scripts**: 136 operations across 23 views
- **Golden records**: 301 total (25 product, 6 venue, 220 account, 50 trader)
- **Milestones**: M0-M280 complete
- **Roadmap**: 33 phases across 7 tiers — medallion architecture, data governance, business glossary, migration readiness
- **Latest**: Phase 23 Business Glossary & Semantic Layer complete (M269-M280). ISO 11179 glossary (45 terms), semantic metrics (12), DAMA-DMBOK (11 areas), standards compliance (28), entity gap analysis (25 gaps). BusinessGlossary view (5 tabs), GlossaryTooltip, S35 scenario. Next: Phase 24+

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
- Glossary models: `backend/models/glossary.py`
- Glossary service: `backend/services/glossary_service.py`
- Semantic service: `backend/services/semantic_service.py`
- Glossary API: `backend/api/glossary.py`
- Glossary store: `frontend/src/stores/glossaryStore.ts`
- BusinessGlossary view: `frontend/src/views/BusinessGlossary/index.tsx`
- GlossaryTooltip: `frontend/src/components/GlossaryTooltip.tsx`
- Glossary metadata: `workspace/metadata/glossary/` (terms, categories, entity_gaps)
- Semantic metadata: `workspace/metadata/semantic/` (metrics, dimensions)
- DMBOK metadata: `workspace/metadata/dmbok/coverage.json`
- Standards registry: `workspace/metadata/standards/compliance_registry.json`
- Architecture registry: `frontend/src/data/architectureRegistry.ts` (112 sections)
- Tour definitions: `frontend/src/data/tourDefinitions.ts`
- Scenario definitions: `frontend/src/data/scenarioDefinitions.ts`
- Operation scripts: `frontend/src/data/operationScripts.ts`

## Commands
```bash
./start.sh                                      # Start app on port 8000
uv run python -m qa test backend                # Backend tests (1105)
uv run python -m qa test e2e                    # E2E Playwright tests (238)
uv run python -m qa quality --python            # Quality scan (ruff, bandit, radon, vulture, coverage)
uv run python -m qa gate                        # Quality gate evaluation
uv run python -m qa report                      # Latest test report
uv run python -m qa report --regression         # Regression analysis
uv run python -m qa baseline update             # Save regression baseline
cd frontend && npm run build                    # Build frontend (975 modules)
```

## Workflow Preferences
- **ALWAYS follow `docs/development-workflow-protocol.md`** — Pre-Work → Planning → Execution → Completion
- **ALWAYS use QA automation framework** — never run direct pytest/ruff/bandit commands
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
