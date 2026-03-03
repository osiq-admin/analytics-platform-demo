# Analytics Platform Demo — Session Memory

## Project Overview
Metadata-driven trade surveillance platform demo (Risk Case Manager). Python FastAPI + DuckDB backend, React 19 + TypeScript + Vite frontend. Pitching to product team — E2E concept demo, not production.

## Current State (2026-03-03)
- **Branch**: `feature/phase22b/cross-view-governance` — Phase 22b Cross-View Governance (pending merge to main)
- **GitHub**: `analytics-platform-demo` repo
- **Tests**: 1813 total (1517 backend + 296 E2E Playwright) — ALL PASSING
- **QA Automation**: `qa/` toolkit — `uv run python -m qa <command>` for test, quality, report, gate, baseline, watch, hooks
- **Frontend**: builds clean — 1093 modules (`cd frontend && npm run build`)
- **Views**: 26 (Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, UseCaseStudio, RiskCaseManager, AIAssistant, MetadataEditor, RegulatoryMap, Submissions, MedallionOverview, DataOnboarding, DataQuality, ReferenceData, AnalyticsTiers, DataGovernance, BusinessGlossary, LakehouseExplorer, DataLineage, CaseManagement)
- **Entities**: 8 (product, execution, order, md_intraday, md_eod, venue, account, trader)
- **Detection Models**: 5 (wash trading x2, market price ramping, insider dealing, spoofing/layering)
- **Alerts**: 82 across 5 models and 5 asset classes (MPR 68%, wash 17%, insider 9%, spoofing 6%)
- **Architecture**: 131 sections across 26 views, 85% metadata-driven
- **Tour scenarios**: 40 guided scenarios (S1-S40) in 17 categories
- **Golden records**: 301 total (25 product, 6 venue, 220 account, 50 trader)
- **API endpoints**: 36 route modules
- **Milestones**: M0-M378 complete
- **Roadmap**: 33 phases across 7 tiers — medallion architecture, data governance, business glossary, migration readiness
- **Latest**: Phase 22b Cross-View Governance complete (M369-M378). Cross-view masking wrapper, PII masking in data/query/alerts endpoints, PII registry API, PII access audit logging, PiiBadge component, toolbar masking indicator, 8 E2E tests, GDPR/MAR/BCBS 239 compliance evidence. Next: Phase 28+

## Key Files
- **Development workflow protocol**: `docs/development-workflow-protocol.md` — MANDATORY for every feature lifecycle
- **Feature checklist**: `docs/feature-development-checklist.md` — MANDATORY reference for every new feature
- **Comprehensive roadmap**: `docs/plans/2026-02-24-comprehensive-roadmap.md` — 33 phases, 7 tiers
- **Development guidelines**: `docs/development-guidelines.md` — frontend patterns + QA automation
- Progress tracker: `docs/progress.md`
- Demo guide: `docs/demo-guide.md`
- QA config: `qa/config/` (suites.json, tools.json, gate.json)
- QA reports: `qa/reports/` (runs/, quality/, baselines/)
- Masking wrapper: `backend/services/masking_wrapper.py`
- Masking service: `backend/services/masking_service.py`
- RBAC service: `backend/services/rbac_service.py`
- Audit service: `backend/services/audit_service.py`
- Governance API: `backend/api/governance.py`
- Governance metadata: `workspace/metadata/governance/`
- PII registry: `workspace/metadata/governance/pii_registry.json`
- PiiBadge component: `frontend/src/components/PiiBadge.tsx`
- PII columns utility: `frontend/src/utils/piiColumns.ts`
- Governance store: `frontend/src/stores/governanceStore.ts`
- Architecture registry: `frontend/src/data/architecture/` (131 sections across 25 files)
- Tour definitions: `frontend/src/data/tours/` (per-view barrel)
- Scenario definitions: `frontend/src/data/scenarios/` (per-category barrel)
- Operation scripts: `frontend/src/data/operations/` (per-view barrel)

## Commands
```bash
./start.sh                                      # Start app on port 8000
uv run python -m qa test backend                # Backend tests (1517)
uv run python -m qa test e2e                    # E2E Playwright tests (296)
uv run python -m qa quality --python            # Quality scan (ruff, bandit, radon, vulture, coverage)
uv run python -m qa gate                        # Quality gate evaluation
uv run python -m qa report                      # Latest test report
uv run python -m qa report --regression         # Regression analysis
uv run python -m qa baseline update             # Save regression baseline
cd frontend && npm run build                    # Build frontend (1093 modules)
```

## Workflow Preferences
- **ALWAYS follow `docs/development-workflow-protocol.md`** — Pre-Work → Planning → Execution → Completion
- **ALWAYS use QA automation framework** — never run direct pytest/ruff/bandit commands
- **ALWAYS use /writing-plans skill** before executing any implementation plan
- Check existing plans in `docs/plans/` and build on them
