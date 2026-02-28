# Project Progress Tracker

**Project**: Analytics Platform Demo — Trade Surveillance Risk Case Manager
**Started**: 2026-02-23
**Last Updated**: 2026-02-28 (M227 Phase 19 + QA Toolkit Complete; 1018 total tests: 794 backend + 224 E2E, 20 views, 32 scenarios, 94 architecture sections, 971 modules)

---

## Overall Status

| Phase | Status | Notes |
|---|---|---|
| Requirements Gathering | COMPLETE | 20 questions asked, all clarified |
| Design Document | COMPLETE | Approved by product owner |
| Implementation Plan | COMPLETE | 14 milestones, ~35 tasks |
| Capabilities & User Stories | COMPLETE | 9 capabilities, 18 user stories |
| BDD Scenarios | COMPLETE | All detection models covered |
| Data Guidelines | COMPLETE | Approved — 50+ real products, 200+ accounts, 2 months |
| Implementation | COMPLETE | All 14 milestones done — 185 tests, 11 views, full pipeline |
| Browser Testing (Playwright) | COMPLETE | All 11 views tested, 9 bugs found & fixed, all demo controls verified |
| Interactive Core Features | COMPLETE | M14-M17: Settings resolver, Mapping D&D, Model create & deploy — 191 tests |
| Alert Detail & Polish (Phase 3) | COMPLETE | M18-M25: 5 new components, 2 endpoints, 6-row layout, 193 tests |
| UX Polish & AI Integration (Phase 4) | COMPLETE | M26-M33: Confirm dialogs, panel toggles, AI panels, dynamic layout — 193 tests |
| Data Model, UX, Viz & Dashboard (Phase 5) | COMPLETE | M34-M48: Product entity, tooltips/tours, chart enhancements, dashboard — 193 tests |
| Data Model Deep Refinement (Phase 6) | COMPLETE | M49-M65: ISO identifiers, FIX Protocol alignment, 3 new entities, OHLCV, bid/ask — 214 tests |
| E2E Playwright Testing (Phase 6) | COMPLETE | All 12 views tested, 37 screenshots, slow-mo drag & drop, SQL queries verified, tour tested |
| GitHub Publication | COMPLETE | Repo created, Claude settings/memory/plans pushed, 92 commits |
| Dynamic Metadata Foundation (Phase 7) | COMPLETE | M66-M69: Remove hardcodings, CRUD APIs, parameter substitution — 234 tests |
| Explainability & Drill-Down (Phase 8) | COMPLETE | M70-M72: AlertTrace fields, trace APIs, frontend panels — 252 tests |
| E2E Testing (Phase 7-8) | COMPLETE | M73: 42 Playwright E2E scenarios, 11 test classes, 0 console errors — 294 total tests |
| Metadata Editor & Visual Config (Phase 9) | COMPLETE | M74-M78: MetadataEditor view, visual editors, dashboard widgets, CRUD wiring — 280 backend tests |
| E2E Testing & Tours (Phase 9) | COMPLETE | 14 new Playwright E2E tests (56 total), MetadataEditor guided tour, demo guide updates — 294 total tests |
| Regulatory Traceability (Phase 10) | COMPLETE | M79-M83: Regulatory tags, traceability graph, coverage analysis, suggestions — 13 new API tests |
| OOB vs User-Defined Separation (Phase 11) | COMPLETE | M84-M88: OOB manifest, layer resolution, layer API, frontend badges, version tracking — 309 backend + 71 E2E tests |
| UI/UX Usability (Phase 12) | COMPLETE | M89-M92: AG Grid global defaults, per-view column optimization, Visual Editor grid fix, E2E viewport tests — 12 new E2E tests |
| Metadata UX & Guided Demo (Phase 7B) | COMPLETE | M93-M120: domain values, patterns, templates, wizard, validation, use cases, submissions, AI calc, versioning, dual-mode tour engine, 25 scenarios, per-screen operation scripts — 386 backend tests, 952 modules |
| E2E Playwright Testing (Phase 7B-12) | COMPLETE | 87 E2E tests across 12 test classes — all views, APIs, scenarios, viewport tests — 473 total tests |
| Feature Development Checklist | COMPLETE | 10-section mandatory checklist for all new features with broad system integration triggers |
| Exploratory Testing Fixes (F-012) | COMPLETE | Entity Designer layout overhaul: tab-based detail, collapsible Panel, dagre graph, row selection, bidirectional navigation |
| Exploratory Testing Fixes Round 2 (F-013/F-014/F-015) | COMPLETE | Format snake_case labels in Risk Cases/Alert Detail/Explainability/Calc Trace, format timestamps, fix Model Composer description overlap |
| Architecture Traceability Mode (M128) | COMPLETE | 74 traced sections across 16 views + cross-cutting, slide-in architecture panel, metadata maturity ratings, S26 scenario, 7 new E2E tests — 572 total tests, 964 modules |
| Metadata Architecture Overhaul — Stage 1 (M129-M131) | COMPLETE | SQL presets to metadata, settings resolver Strategy pattern — 398 backend tests |
| Metadata Architecture Overhaul — Stage 2 (M132-M135) | COMPLETE | Dashboard widget manifest, metadata-driven rendering, E2E tests — 404 backend tests |
| Metadata Architecture Overhaul — Stage 3 (M136-M139) | COMPLETE | Format registry, model-specific alert layouts, useFormatRules hook — 411 backend tests |
| Metadata Architecture Overhaul — Stage 4 (M140-M143) | COMPLETE | Navigation manifest, Sidebar from metadata, E2E tests — 415 backend tests |
| Metadata Architecture Overhaul — Stage 5 (M144-M147) | COMPLETE | Audit trail, AI context-summary, E2E tests — 421 backend tests |
| Metadata Architecture Overhaul — Stage 6 (M148-M150) | COMPLETE | BDD scenarios, architecture re-audit, documentation sweep — 603 total tests, 69% metadata-driven |
| Compliance & Metadata Phase 2 (M151-M173) | COMPLETE | ISO/FIX/compliance standards, grid columns, view tabs, theme palettes, workflows, demo checkpoints, tour registry, BDD scenarios, architecture re-audit — 716 total tests (506+210), 83.8% metadata-driven |
| Development Workflow Protocol | COMPLETE | Single authoritative lifecycle protocol (Pre-Work → Planning → Execution → Completion), 3-tier Milestone Completion Protocol, Test Count Sync Registry, fixed all stale docs |
| Roadmap Restructuring — Medallion Architecture | COMPLETE | Restructured roadmap from 20 phases to 33 phases across 7 tiers: medallion architecture (11 tiers), data governance, PII/masking/encryption, business glossary (ISO 11179), standards (ISO 8000/25012/27001, BCBS 239), migration readiness (SQLMesh, Arrow) |
| Medallion Architecture Core (Phase 14) | COMPLETE | M175: 11-tier medallion architecture metadata, 6 data contracts, 5 transformations, 5 pipeline stages, MedallionOverview view with React Flow, 7 API endpoints, S27 scenario — 732 total tests (522+210), 17 views |
| Data Onboarding & Connector Abstraction (Phase 15) | COMPLETE | M176-M183: Pydantic onboarding models, 6 connector metadata files, BaseConnector + LocalFileConnector + stubs, schema detector + data profiler, onboarding service + API endpoints, 5-step DataOnboarding wizard, tours/scenarios/operations/architecture — 759 total tests (549+210), 18 views |
| Tour/Scenario Quality Fixes + Bronze→Silver Mapping (Phase 15.5 + 16) | COMPLETE | M184-M196: Tour backdrop click-through fix (4-edge overlay), viewport clipping fix (floating-ui size()), :has-text selector replacement (86→data-action), ScenarioRunner timeouts, Pydantic mapping models, 3 mapping metadata files, CRUD API (7 endpoints), MappingStudio overhaul (metadata-driven), onboarding Step 4 mapping integration, S29 scenario — 772 total tests (562+210), 18 views, 29 scenarios |
| Data Calibration (Phase 13) | COMPLETE | M174: Fixed F-001 (MPR 96%→68%) and F-010 (all 5 asset classes have alerts). Cross-asset trading, 9 new patterns, threshold calibration, SettingsResolver pipeline fix. 82 alerts across 5 models and 5 asset classes |
| Silver→Gold Pipeline Orchestration (Phase 17) | COMPLETE | M197-M204: Contract validator, pipeline orchestrator, Silver→Gold mapping + data contract, MappingStudio tier selectors, PipelineMonitor overhaul (true DAG edges + medallion stages progress bar), MedallionOverview execution status + Run Stage, S30 scenario — 800 total tests (590+210), 18 views, 30 scenarios, 82 architecture sections |
| Data Quality, Quarantine & Profiling (Phase 18) | COMPLETE | M205-M215: Quality dimensions (ISO 8000/25012), weighted scoring engine, quarantine service, DataQuality view with spider chart + profiling, E2E tests, tours/scenarios — 862 total tests (645+217), 19 views, 31 scenarios, 86 architecture sections |
| Reference Data & MDM (Phase 19) | COMPLETE | M216-M227: Golden records for 4 entities (product/venue/account/trader), reconciliation engine with exact+fuzzy matching, field-level provenance, 9 API endpoints, ReferenceData view, 4 data contracts, S32 scenario — 1018 total tests (794+224), 20 views, 32 scenarios, 94 architecture sections |
| QA Automation Toolkit | COMPLETE | `qa/` package: test runner, quality scanner (ruff/bandit/radon/vulture/coverage), regression detection, flaky test detection, quality gate, file watcher, git pre-push hooks. All 6 quality tools PASS. All guidelines updated |

---

### Metadata Architecture Overhaul — Summary (M129-M150)

| Metric | Before (M128) | After (M150) |
|---|---|---|
| Fully metadata-driven sections | 25 (34%) | 28 (39%) |
| Mostly metadata-driven sections | 12 (16%) | 21 (30%) |
| Combined FMD + Mostly | 37 (50%) | 49 (69%) |
| Code-driven sections | 13 (18%) | 8 (11%) |
| Backend tests | 390 | 421 |
| E2E tests | 182 | 182 |
| Total tests | 572 | 603 |
| New metadata types | 0 | 4 (widgets, presets, navigation, format_rules) |
| New Pydantic models | 0 | 7 |
| New API endpoints | 0 | 6 |

---

## Milestone Progress

| # | Milestone | Status | Tasks | Done | Notes |
|---|---|---|---|---|---|
| M0 | Project Scaffolding | COMPLETE | 3 | 3 | Python backend, React frontend, workspace dirs |
| M1 | Backend Foundation | COMPLETE | 6 | 6 | DuckDB, models, metadata svc, data loader, API routes, query svc |
| M2 | Calculation Engine | COMPLETE | 5 | 5 | DAG executor + 10 calc definitions (L1-L3.5) |
| M3 | Settings Resolution | COMPLETE | 2 | 2 | Resolver engine + 15 setting JSON files |
| M4 | Detection & Alerts | COMPLETE | 3 | 3 | Detection engine + 5 models + alert service |
| M5 | Frontend Foundation | COMPLETE | 4 | 4 | App shell, theme, components, stores |
| M6 | Configuration Views | COMPLETE | 4 | 4 | Entity Designer, Metadata Explorer, Settings Manager, Mapping Studio |
| M7 | Operations Views | COMPLETE | 3 | 3 | Pipeline Monitor, Schema Explorer, SQL Console |
| M8 | Compose Views | COMPLETE | 2 | 2 | Model Composer, Data Manager |
| M9 | Risk Case Manager | COMPLETE | 5 | 5 | Alert Summary, Alert Detail with score breakdown |
| M10 | AI Query Assistant | COMPLETE | 2 | 2 | Backend AI service (live+mock) + frontend chat interface |
| M11 | Demo Controls | COMPLETE | 2 | 2 | State machine + DemoToolbar |
| M12 | Synthetic Data | COMPLETE | 3 | 3 | Data gen + entity defs + snapshots for all 8 checkpoints |
| M13 | Polish & Docs | COMPLETE | 5 | 5 | 4 READMEs, demo guide, data dictionary (3 docs), SPA serving, 18 E2E tests |
| M14 | Documentation & Lifespan Wiring | COMPLETE | 2 | 2 | Wire SettingsResolver, DetectionEngine, AlertService to app.state |
| M15 | Settings Resolution Tester | COMPLETE | 2 | 2 | Resolve endpoint + interactive UI |
| M16 | Mapping Studio Drag-and-Drop | COMPLETE | 4 | 4 | Save endpoint + HTML5 DnD handlers |
| M17 | Model Composer Create & Deploy | COMPLETE | 5 | 5 | Save/generate endpoints + create form + deploy |
| M18 | Phase 3 Plan & Progress | COMPLETE | 1 | 1 | Save plan, update progress tracker |
| M19 | Foundation: TS Types + Endpoints | COMPLETE | 3 | 3 | AlertTrace TS, market data + orders endpoints |
| M20 | Calculation Trace DAG | COMPLETE | 1 | 1 | React Flow + dagre with live score values |
| M21 | Market Data Chart | COMPLETE | 1 | 1 | TradingView Lightweight Charts |
| M22 | Settings Resolution Trace | COMPLETE | 1 | 1 | Override/default badges, resolution trace |
| M23 | Related Orders Table | COMPLETE | 1 | 1 | AG Grid executions table |
| M24 | Footer Actions & Layout | COMPLETE | 2 | 2 | Action bar + 6-row layout |
| M25 | Build, Test & Document | COMPLETE | 6 | 6 | 193 tests pass, Playwright E2E, docs |
| M26 | Phase 4 Plan & Progress | COMPLETE | 1 | 1 | Save plan, update progress tracker |
| M27 | ConfirmDialog Component | COMPLETE | 3 | 3 | Reusable dialog + wire into Model Composer & Mapping Studio |
| M28 | Configurable Alert Panels | COMPLETE | 1 | 1 | Panel toggle toolbar + localStorage persistence |
| M29 | AI Side Panel in SQL Console | COMPLETE | 1 | 1 | Collapsible ChatPanel + query injection |
| M30 | AI Side Panel in Model Composer | COMPLETE | 1 | 1 | Collapsible ChatPanel |
| M31 | Dynamic Alert Structure | COMPLETE | 2 | 2 | Model-type layout config with emphasis and hints |
| M32 | Build, Test & Verify | COMPLETE | 3 | 3 | Frontend build (876 modules), 193 backend tests, Playwright E2E |
| M33 | Documentation | COMPLETE | 2 | 2 | Update progress.md and demo-guide.md |
| M34 | Phase 5 Plan & Progress | COMPLETE | 1 | 1 | Save plan, update progress tracker |
| M35 | Product Entity & CSV | COMPLETE | 5 | 5 | Create product entity, generate product.csv, remove fields from execution |
| M36 | Update Entity Defs & Loader | COMPLETE | 3 | 3 | Update execution.json, Pydantic models, schema docs |
| M37 | Update Calculation SQL | COMPLETE | 4 | 4 | Update value_calc and adjusted_direction to JOIN product |
| M38 | Update Detection Models & Engine | COMPLETE | 3 | 3 | Update all 5 detection model queries to JOIN product |
| M39 | Update Tests & Frontend | COMPLETE | 4 | 4 | Update test fixtures for product table, 198 tests |
| M40 | Regenerate Data & Snapshots | COMPLETE | 4 | 4 | Regenerate CSVs and snapshots with new schema |
| M41 | Tooltip Infrastructure | COMPLETE | 5 | 5 | @floating-ui/react, Tooltip, HelpButton components |
| M42 | Tour System & Store | COMPLETE | 5 | 5 | tourStore, TourOverlay, OnboardingModal |
| M43 | Chart Enhancements & Filtering | COMPLETE | 6 | 6 | Time range, intraday toggle, AG Grid filters, trade volume chart |
| M44 | View Tooltips & Tour Content | COMPLETE | 5 | 5 | Tour definitions for 12 views, data-tour attrs, tooltips |
| M45 | Demo Workflow Guides | COMPLETE | 4 | 4 | Act 1/2/3 guided workflows, Guide button in DemoToolbar |
| M46 | Dashboard View | COMPLETE | 6 | 6 | Backend endpoint, store, SummaryCard, Dashboard with 4 charts |
| M47 | Build, Test & Verify | COMPLETE | 4 | 4 | Frontend builds (895 modules), 193 backend tests pass |
| M48 | Documentation | COMPLETE | 3 | 3 | Update progress and demo guide |
| M49 | Phase 6 Plan & Progress | COMPLETE | 2 | 2 | Save plan, update progress tracker |
| M50 | Venue Entity | COMPLETE | 3 | 3 | 6 static rows with ISO 10383 MIC codes |
| M51 | Product Entity Overhaul | COMPLETE | 4 | 4 | Corrected taxonomy, ISIN/CFI/MIC/underlying/strike/expiry/tick_size/lot_size |
| M52 | Account Entity | COMPLETE | 3 | 3 | 220 rows with type, country (KY for hedge funds), risk rating |
| M53 | Trader Entity | COMPLETE | 3 | 3 | 50 rows with desk, type, hire date |
| M54 | Order Entity Overhaul | COMPLETE | 4 | 4 | order_type, limit_price, filled_quantity, time_in_force, execution_id, venue_mic, trader_id |
| M55 | Execution Entity Overhaul | COMPLETE | 4 | 4 | order_id FK, venue_mic, exec_type, capacity, millisecond times |
| M56 | MD_EOD Overhaul | COMPLETE | 4 | 4 | Full OHLCV + prev_close, num_trades, vwap |
| M57 | MD_Intraday Overhaul | COMPLETE | 4 | 4 | Bid/ask, trade_condition, ms times, FX + futures (32K rows) |
| M58 | Update Calculation SQL | COMPLETE | 3 | 3 | value_calc/adjusted_direction updated for call_option/put_option |
| M59 | Update Detection Model SQL | COMPLETE | 2 | 2 | entity_context verified, 4 settings overrides fixed |
| M60 | Update Tests | COMPLETE | 4 | 4 | 16 new tests (214 total), all fixtures updated |
| M61 | Regenerate Data & Snapshots | COMPLETE | 3 | 3 | 8 CSVs, 8 checkpoints regenerated |
| M62 | Frontend Entity Display Updates | COMPLETE | 4 | 4 | New RelatedOrders columns, orders grid, asset class colors |
| M63 | Frontend Dashboard & Alert Detail | COMPLETE | 3 | 3 | OHLC candlestick chart, order detail columns |
| M64 | Build, Test & Verify | COMPLETE | 4 | 4 | Frontend builds (895 modules), 214 tests pass, 51/51 data integrity |
| M65 | Documentation | COMPLETE | 2 | 2 | Update progress and demo guide |
| M66 | Remove Hardcoded Value Columns | COMPLETE | 4 | 4 | Add value_field to ModelCalculation + CalculationDefinition, remove CALC_VALUE_COLUMNS, update 15 JSONs + 2 test fixtures |
| M67 | Remove Hardcoded Context Fields | COMPLETE | 3 | 3 | Add context_fields to DetectionModelDefinition, update 5 model JSONs, update detection_engine.py |
| M68 | Metadata CRUD APIs | COMPLETE | 5 | 5 | PUT/DELETE for calcs/settings/entities/models, dependency checker, dependency graph, validation endpoint, 13 new tests |
| M69 | SQL Parameter Substitution | COMPLETE | 3 | 3 | Setting + literal param resolution, $param_name substitution, 7 new tests |
| M70 | Enhanced AlertTrace Explainability | COMPLETE | 4 | 4 | CalculationTraceEntry model, executed_sql, scoring_breakdown, entity_context_source — 8 new tests |
| M71 | Trace API Endpoints | COMPLETE | 3 | 3 | Trace API endpoints (alert, calculation, settings) — 10 new tests |
| M72 | Frontend Explainability Drill-Down | COMPLETE | 4 | 4 | ExplainabilityPanel, SQLViewer, SettingsTraceViewer components, AlertDetail integration |
| M73 | E2E Playwright Test Suite | COMPLETE | 5 | 5 | 42 E2E scenarios, 11 test classes, all 12 views, Phase 7-8 APIs, 0 console errors — 294 total tests |
| M74 | Persist Roadmap + Store Foundation | COMPLETE | 4 | 4 | Roadmap saved, TS types expanded, CRUD store actions, 14 API tests — 308 total tests |
| M75 | MetadataEditor View — JSON + Visual | COMPLETE | 4 | 4 | Monaco JSON panel + visual form panel with bidirectional sync, route + sidebar |
| M76 | Visual Editors for All 4 Types | COMPLETE | 4 | 4 | EntityEditor, CalculationEditor, SettingsEditor, DetectionModelEditor |
| M77 | Dashboard Widgets + Chart Switching | COMPLETE | 5 | 5 | WidgetContainer, widgetStore, ChartTypeSwitcher, multi-renderer (5 types) |
| M78 | Wire CRUD into Existing Views | COMPLETE | 6 | 6 | Edit/delete in EntityDesigner, MetadataExplorer, SettingsManager, ModelComposer + verification |
| M79 | Regulatory Tags on Backend Models | COMPLETE | 6 | 6 | regulatory_tags on calcs, regulatory_coverage on models, TS types, snapshot regen |
| M80 | Regulatory Traceability API | COMPLETE | 3 | 3 | Regulation registry, coverage map, traceability graph endpoint — 9 tests |
| M81 | Frontend RegulatoryMap View | COMPLETE | 3 | 3 | React Flow graph, regulatoryStore, route + sidebar entry |
| M82 | Coverage Analysis & Suggestions | COMPLETE | 3 | 3 | SuggestionService, API endpoint, frontend suggestions panel — 4 tests |
| M83 | E2E Tests, Tours & Documentation | COMPLETE | 4 | 4 | 4 E2E tests, guided tour, demo guide, progress tracker |
| M84 | OOB Manifest + Backend Layer Resolution | COMPLETE | 5 | 5 | OOB manifest (38 items), metadata_layer field, user_overrides dir, MetadataService layer resolution — 12 new tests |
| M85 | Layer-Aware API Endpoints | COMPLETE | 3 | 3 | Layer info in responses, 5 new endpoints (reset, diff, oob-manifest, layer-info, oob-version) — 10 new tests |
| M86 | Frontend Layer UI | COMPLETE | 5 | 5 | LayerBadge, ResetToOobButton, MetadataEditor + 4 views with layer badges (AG Grid badges fixed to use React JSX) |
| M87 | Version Tracking + Upgrade Simulation | COMPLETE | 5 | 5 | OobVersionService, upgrade simulation API, demo manifest v1.1, OobVersionPanel — 8 new tests |
| M88 | E2E Tests, Onboarding, Tours & Docs | COMPLETE | 5 | 5 | 10 E2E tests, 7-step OOB tour + act2 integration, onboarding update, demo guide walkthrough |
| M89 | Global AG Grid Usability | COMPLETE | 2 | 2 | defaultColDef (resizable, sortable, tooltips, minWidth), autoSizeStrategy, tooltip theme CSS |
| M90 | Per-View Column & Layout Optimization | COMPLETE | 6 | 6 | EntityDesigner, EntityDetail, MetadataExplorer, SettingsManager, RiskCaseManager, MetadataEditor |
| M91 | Visual Editor Field Grid Fix | COMPLETE | 1 | 1 | CSS grid template fix — Description column now visible |
| M92 | E2E Viewport Verification, Tours & Docs | COMPLETE | 4 | 4 | 12 new E2E tests, UX features tour, progress tracker, demo guide |
| | **Phase 7B: Metadata UX & Guided Demo** | **COMPLETE** | | | **M93-M120 all done — 7 workstreams, 25 scenarios, 71 ops, 386 tests, 952 modules** |
| M93 | Gap Fix: $param Migration | COMPLETE | 4 | 4 | Migrated 10 calc JSONs to $param placeholders, regression verified — 323 tests |
| M94 | Gap Fix: TimeRangeSelector + Settings Overrides | COMPLETE | 3 | 3 | Data-driven date range API, 8 fixed_income/index overrides, 5 new tests — 323 tests |
| M95 | Backend: Domain Values API | COMPLETE | 4 | 4 | 4 endpoints, cardinality tiers, server-side search, 14 new tests — 337 tests |
| M96 | Backend: Match Patterns + Score Templates | COMPLETE | 4 | 4 | CRUD APIs, usage counts, 9 OOB patterns, 7 OOB templates, 12 new tests — 349 tests |
| M97 | Frontend: SuggestionInput + useDomainValues | COMPLETE | 3 | 3 | Autocomplete with @floating-ui, tiered loading, caching, freeform warning — 917 modules |
| M98 | Frontend: MatchPatternPicker | COMPLETE | 3 | 3 | Two-tab picker (existing/create), searchable, save-as-pattern — 917 modules |
| M99 | Frontend: ScoreStepBuilder + Templates | COMPLETE | 4 | 4 | Visual range bar, editable table, gap/overlap validation, template picker — 917 modules |
| M100 | Frontend: Settings Manager Form Upgrades | COMPLETE | 4 | 4 | SuggestionInput, ScoreStepBuilder, MatchPatternPicker wired into forms — 922 modules |
| M101 | Frontend: Model Composer Wizard (Steps 1-3) | COMPLETE | 5 | 5 | 7-step wizard, Define/Select/Scoring with suggestions — 926 modules |
| M102 | Frontend: Model Composer Wizard (Steps 4-7) | COMPLETE | 5 | 5 | Monaco SQL editor, Review, Test Run (AG Grid), Deploy + dry run endpoint, 3 tests — 930 modules, 352 tests |
| M103 | Frontend: Preview + Validation + Dependencies | COMPLETE | 5 | 5 | ValidationPanel, PreviewPanel (Recharts), DependencyMiniDAG (React Flow) — 933 modules |
| M104 | Frontend: Example & Use Case Library UI | COMPLETE | 3 | 3 | ExamplesDrawer with 15 annotated examples, "Use as starting point" — 937 modules |
| M105 | Backend: Validation Service (5 Layers) | COMPLETE | 5 | 5 | Static analysis, schema compat, sandbox exec, impact analysis, regression, 7 new tests — 359 tests |
| M106 | Backend: Use Cases API | COMPLETE | 4 | 4 | CRUD + run endpoint, UseCase/UseCaseComponent models, 6 new tests — 365 tests |
| M107 | Backend: Submissions API + Recommendations | COMPLETE | 4 | 4 | Submission workflow, RecommendationService (4 checks), 11 new tests — 376 tests |
| M108 | Frontend: Use Case Studio View | COMPLETE | 5 | 5 | 5-step wizard, sample data editor (Monaco), expected results, stores — 942 modules |
| M109 | Frontend: Submissions Review Queue | COMPLETE | 4 | 4 | AG Grid queue, 5-tab detail view, ReviewActions, stores — 946 modules |
| M110 | Backend+Frontend: AI Calc Builder | COMPLETE | 4 | 4 | AI context builder, mock suggest_calculation, AICalcBuilder + AICalcReview, 5 tests — 381 tests |
| M111 | (merged with M110) | COMPLETE | — | — | Combined with M110 — NL input, split review, refine loop |
| M112 | Version Management + Comparison | COMPLETE | 3 | 3 | VersionService (snapshot, diff, rollback), VersionComparison UI, 5 tests — 386 tests, 946 modules |
| M113 | Tour Engine Upgrade | COMPLETE | 4 | 4 | Dual-mode (watch/try), StepOverlay, ScenarioRunner, ScenarioSelector, tourStore scenario state |
| M114 | Scenarios: Settings & Thresholds (S1-S6) | COMPLETE | 3 | 3 | 6 scenarios with full step definitions, auto-fill data, validation selectors |
| M115 | Scenarios: Calculations (S7-S10) | COMPLETE | 3 | 3 | 4 scenarios: DAG explore, manual calc, AI calc, parameterization |
| M116 | Scenarios: Detection Models (S11-S14) | COMPLETE | 3 | 3 | 4 scenarios: full wizard, clone/modify, add calc, best practices |
| M117 | Scenarios: Use Cases & Submissions (S15-S18) | COMPLETE | 3 | 3 | 4 scenarios: create, submit, review, implement |
| M118 | Scenarios: Entities, Investigation, Admin (S19-S25) | COMPLETE | 3 | 3 | 7 scenarios: entity explore, data import, alert investigation, OOB review |
| M119 | Per-Screen Operation Scripts | COMPLETE | 3 | 3 | OperationScripts component, 12 view operation definitions, contextual help panel |
| M120 | Testing & Documentation | COMPLETE | 5 | 5 | 386 backend tests pass, frontend builds (952 modules), scenarios wired into AppLayout, progress updated |
| | **E2E Testing & Documentation** | **COMPLETE** | | | **87 E2E tests, browser walkthrough, feature checklist** |
| — | E2E Test Suite (Phase 7B-12) | COMPLETE | 3 | 3 | 87 Playwright E2E tests pass (12 test classes), ExamplesDrawer CSS fix, all views + APIs verified |
| — | Browser Walkthrough Verification | COMPLETE | 2 | 2 | Full visual walkthrough with Playwright MCP at 1440px + 1024px, 23 screenshots |
| — | Feature Development Checklist | COMPLETE | 1 | 1 | 10-section checklist with broad system integration triggers at `docs/feature-development-checklist.md` |
| | **Exploratory Testing Fixes** | **COMPLETE** | | | **F-001 through F-020: 3 rounds, 17 FIXED, 2 OPEN (data), 1 NOTED** |
| M121 | Entity Designer Layout Overhaul (F-012) | COMPLETE | 8 | 8 | Collapsible Panel component, tab-based EntityDetail, dagre RelationshipGraph with MiniMap/Controls, row selection, bidirectional navigation, useLocalStorage hook, tour/scenario/ops updates |
| M122 | Exploratory Testing Fixes Round 2 (F-013/F-014/F-015) | COMPLETE | 7 | 7 | formatTimestamp utility, formatLabel applied to Risk Case Manager grid/Alert Detail/Calc Trace DAG/Explainability panel, Model Composer description overlap fix |
| M123 | Exploratory Testing Round 3 (F-016/F-017/F-018/F-019/F-020) | COMPLETE | 5 | 5 | Tested 6 untested views. Pipeline Monitor steps table + layer labels, AI Assistant markdown rendering, Use Case Studio component IDs + run results table. 955 modules. |
| M124 | Entity Designer Vertical 2-Tab Layout (F-021) | COMPLETE | 8 | 8 | react-resizable-panels, vertical 2-tab layout, useDefaultLayout persistence, removed 3-pane horizontal layout — 956 modules |
| M125 | Domain Values Management (F-022) | COMPLETE | 8 | 8 | Domain column in Fields AG Grid, DomainValuesPane side panel, EntityForm domain editor, 2 backend + 2 E2E tests — 957 modules |
| M126 | Relationship Graph Visual Improvements (F-023) | COMPLETE | 1 | 1 | Smoothstep edges, label backgrounds, ArrowClosed arrowheads, increased dagre spacing |
| M127 | Regulatory Map Redesign (F-024) | COMPLETE | 7 | 7 | Resizable panels, 2 tabs (Map + Details AG Grid), backend description fields, MiniMap, Controls, edge labels, h-full layout fix, tour path mapping fix — 957 modules |
| M128 | Architecture Traceability Mode | COMPLETE | 12 | 12 | Toolbar toggle, TraceOverlay with info icons on 74 sections, TracePopup slide-in panel (source files, stores, APIs, metadata, technologies, maturity rating, improvements), architectureRegistry.ts (2,978 lines), MetadataMaturity badges, S26 scenario, overview tour updated, architecture_trace op on all 16 views, 7 new E2E tests — 964 modules |
| M129 | SQL Presets to Metadata | COMPLETE | 4 | 4 | Moved hardcoded SQL presets to workspace/metadata/query_presets/default.json, QueryPreset Pydantic model, MetadataService.list_query_presets(), 4 new tests — 394 backend tests |
| M130 | Settings Resolver Strategy Pattern | COMPLETE | 4 | 4 | Extracted HierarchyStrategy + MultiDimensionalStrategy classes, RESOLUTION_STRATEGIES registry, ResolutionStrategy protocol, 4 new tests — 398 backend tests |
| M131 | Stage 1 Checkpoint | COMPLETE | 3 | 3 | Full regression pass, architecture registry updated, docs updated, pushed |
| M132 | Dashboard Widget Metadata Schema | COMPLETE | 5 | 5 | WidgetDefinition Pydantic model, dashboard.json with 8 widgets, GET/PUT /api/metadata/widgets/{view_id}, 6 new tests — 404 backend tests |
| M133 | Dashboard Frontend Refactor | COMPLETE | 4 | 4 | Removed hardcoded WIDGETS array, CHART_RENDERERS lookup, ChartWidget component, resolveKpiValue/resolveChartData helpers, fallback widgets — 964 modules build clean |
| M134 | Dashboard Widget Config E2E Tests | COMPLETE | 3 | 3 | TestDashboardWidgetConfig class, widget loading test, chart rendering test, API test — 3 new E2E tests |
| M135 | Stage 2 Checkpoint | COMPLETE | 6 | 6 | Full regression pass, architecture registry maturity updated, docs updated, pushed |
| M136 | Format Registry Metadata | COMPLETE | 4 | 4 | FormatRule/FormatRulesConfig Pydantic models, default.json with 8 rules and 12 field mappings, GET /api/metadata/format-rules, 4 new tests — 408 backend tests |
| M137 | Alert Detail Layouts | COMPLETE | 3 | 3 | alert_detail_layout field on DetectionModelDefinition, all 5 models updated with panels/emphasis/hints, 3 new tests — 411 backend tests |
| M138 | Frontend Format Rules + Alert Layouts | COMPLETE | 3 | 3 | useFormatRules hook with caching, fromApiLayout converter, AlertDetail loads layout from API with fallback — 964 modules |
| M139 | Stage 3 Checkpoint | COMPLETE | 5 | 5 | Full regression pass, architecture registry updated, docs updated, pushed |
| M140 | Navigation Manifest Metadata | COMPLETE | 4 | 4 | NavItem/NavGroup/NavigationConfig Pydantic models, main.json with 8 groups and 16 views, GET /api/metadata/navigation, 4 new tests — 415 backend tests |
| M141 | Sidebar from Metadata | COMPLETE | 3 | 3 | navigationStore Zustand store, Sidebar.tsx loads from API with FALLBACK_NAVIGATION — 965 modules |
| M142 | Navigation E2E Tests | COMPLETE | 2 | 2 | TestNavigationMetadata: API returns 16 views, sidebar renders 16 links — 2 new E2E tests |
| M143 | Stage 4 Checkpoint | COMPLETE | 5 | 5 | Full regression pass, architecture registry sidebar → fully-metadata-driven, docs updated, pushed |
| M144 | Metadata Audit Trail | COMPLETE | 3 | 3 | AuditService with append-only records, wired into 4 core save/delete methods, GET /api/metadata/audit, 3 new tests — 418 backend tests |
| M145 | AI Context Summary | COMPLETE | 3 | 3 | GET /api/ai/context-summary auto-generates from live metadata (entities, models, calcs, settings, format rules, nav), 3 new tests — 421 backend tests |
| M146 | Audit + AI E2E Tests | COMPLETE | 2 | 2 | TestAuditTrailE2E, TestAIContextE2E — 2 new E2E tests |
| M147 | Stage 5 Checkpoint | COMPLETE | 5 | 5 | Full regression pass, architecture registry + BDD updated, docs updated, pushed |
| M148 | BDD Scenarios for Metadata Features | COMPLETE | 3 | 3 | BDD scenarios for widgets, navigation, format rules, audit trail, query presets |
| M149 | Architecture Re-Audit | COMPLETE | 3 | 3 | Updated maturity ratings across 71 sections, 69% metadata-driven (was 50%) |
| M150 | Documentation Sweep | COMPLETE | 6 | 6 | Updated progress.md, demo-guide.md, development-guidelines.md, feature-development-checklist.md, CLAUDE.md, MEMORY.md |
| M151 | ISO Standards Registry | COMPLETE | 3 | 3 | Create ISO standards registry as structured metadata — 6 standards (ISO 6166, 10383, 10962, 4217, 3166-1, 8601) with field mappings and validation rules |
| M152 | FIX Protocol & Compliance | COMPLETE | 3 | 3 | FIX protocol registry (6 fields) + compliance requirements (14 requirements) mapped to implementations |
| M153 | EMIR & SEC Regulations | COMPLETE | 3 | 3 | Add EMIR, SEC to regulatory registry with source URLs — 6 total regulations |
| M154 | Stage 1 Checkpoint | COMPLETE | 5 | 5 | Standards foundation — 435 backend tests passing, frontend builds clean, architecture registry + operations + docs updated |
| M155 | Account MiFID II Classification | COMPLETE | 3 | 3 | MiFID II client category + compliance status on accounts |
| M156 | Product Regulatory Jurisdiction | COMPLETE | 3 | 3 | Regulatory scope field on products |
| M157 | Detection Model Coverage | COMPLETE | 3 | 3 | SEC coverage for multi-jurisdiction on all models |
| M158 | Stage 2 Checkpoint | COMPLETE | 5 | 5 | Entity compliance — 445 backend tests passing, frontend builds clean, docs updated |
| M159 | Grid Column Metadata | COMPLETE | 3 | 3 | Grid column definitions as metadata for DataManager — useGridColumns hook + API endpoint |
| M160 | Alert Filter Schema | COMPLETE | 3 | 3 | Alert summary grid columns and filters as metadata for RiskCaseManager |
| M161 | Related Orders Metadata | COMPLETE | 5 | 5 | Execution (12 cols) + order (11 cols) grid metadata + market_data_config on all 5 detection models |
| M162 | Stage 3 Checkpoint | COMPLETE | 5 | 5 | Grid metadata — 463 backend tests passing, 5 sections upgraded to mostly-metadata-driven |
| M163 | View Tabs Metadata | COMPLETE | 4 | 4 | View tab definitions as metadata — Entity Designer + Model Composer tabs from API |
| M164 | Color Palettes Metadata | COMPLETE | 4 | 4 | Theme palettes as metadata — chart colors, asset class colors, graph node colors |
| M165 | E2E Metadata Tests | COMPLETE | 3 | 3 | 21 E2E tests for standards, grids, view config, palettes APIs |
| M166 | Stage 4 Checkpoint | COMPLETE | 5 | 5 | View config — 478 backend + 203 E2E tests, entities.view-tabs upgraded |
| M167 | Submission Workflow | COMPLETE | 4 | 4 | Workflow states as metadata — badge variants, transitions from API |
| M168 | Demo Checkpoints | COMPLETE | 3 | 3 | Demo toolbar checkpoints as metadata — 8 checkpoints from API |
| M169 | Tour Registry | COMPLETE | 3 | 3 | Tour/scenario registry via metadata API — 19 tours, 26 scenarios |
| M170 | Stage 5 Checkpoint | COMPLETE | 5 | 5 | Workflow metadata — 506 backend tests, 3 more sections upgraded |
| M171 | BDD Scenarios | COMPLETE | 3 | 3 | BDD scenarios for compliance & metadata phase 2 features |
| M172 | Architecture Re-Audit | COMPLETE | 4 | 4 | 83.8% metadata-driven (was 69%) — 31 fully + 31 mostly + 2 mixed + 2 code-driven + 8 infrastructure |
| M173 | Documentation Sweep | COMPLETE | 5 | 5 | Update all counts, add Phase 2 metadata types to CLAUDE.md, progress.md, checklist |

### Phase 13: Data Calibration (M174)

| Milestone | Title | Status | Planned | Actual | Notes |
|---|---|---|---|---|---|
| M174 | Data Calibration | COMPLETE | 5 | 5 | Fix F-001 (MPR 96%→68%) and F-010 (all 5 asset classes). Cross-asset normal trading (FX/FI/futures), 9 new detection patterns (wash FX+commodity, MPR commodity, insider equity, spoofing index), calibrate trend_sensitivity (1.5→3.5), score thresholds (equity 10→16), score steps, fix SettingsResolver pipeline bug, fix spoofing pattern counts. 82 total alerts: MPR 56, wash 14, insider 7, spoofing 5 |

### Phase 14: Medallion Architecture Core (M175)

| Milestone | Title | Status | Planned | Actual | Notes |
|---|---|---|---|---|---|
| M175 | Medallion Architecture Core | COMPLETE | 5 | 5 | 11-tier metadata (tiers.json), 6 data contracts, 5 transformations, 5 pipeline stages, Pydantic models, MetadataService methods, 7 API endpoints (/api/medallion/*), MedallionOverview view (React Flow + Dagre), navigation + route, tour, S27 scenario, 5 operation scripts, 3 architecture registry entries |

### Phase 15: Data Onboarding & Connector Abstraction (M176-M183)

| Milestone | Title | Status | Planned | Actual | Notes |
|---|---|---|---|---|---|
| M176 | Pydantic Onboarding Models + Tests | COMPLETE | 3 | 3 | Onboarding models with validation, backend tests |
| M177 | Connector Metadata JSON Files | COMPLETE | 3 | 3 | 6 connector definitions as metadata (local_file, s3, sftp, api_rest, database, kafka) |
| M178 | Connector Abstraction Layer | COMPLETE | 4 | 4 | BaseConnector + LocalFileConnector + stubs for S3/SFTP/API/DB/Kafka |
| M179 | Schema Detector + Data Profiler | COMPLETE | 4 | 4 | Auto-detect schema from uploaded files, data profiling service |
| M180 | Onboarding Service + API Endpoints | COMPLETE | 4 | 4 | OnboardingService, MetadataService connector methods, /api/onboarding/* endpoints |
| M181 | DataOnboarding Wizard View | COMPLETE | 5 | 5 | Navigation + route, 5-step wizard (Source → Schema → Profile → Mapping → Review) |
| M182 | Tours, Scenarios, Operations, Architecture | COMPLETE | 4 | 4 | Onboarding tour, S28 scenario, 6 operation scripts, 3 architecture registry entries (80 total sections) |
| M183 | Test Suite + Build Verification | COMPLETE | 3 | 3 | 549 backend tests, 210 E2E tests, 971 frontend modules — all passing |

### Phase 17: Silver→Gold Pipeline Orchestration (M197-M204)

| Milestone | Title | Status | Planned | Actual | Notes |
|---|---|---|---|---|---|
| M197 | Contract Validator + Pipeline Orchestrator | COMPLETE | 4 | 4 | ContractValidator service (schema + null + type + range validation), PipelineOrchestrator service (stage execution, contract validation, dependency resolution), 20 new backend tests |
| M198 | Pipeline API Fix + Stage Execution Endpoints | COMPLETE | 3 | 3 | Fix SettingsResolver import in pipeline API, stage execution endpoints (/api/pipeline/stages/{id}/execute, /api/pipeline/validate-contract), 8 new backend tests |
| M199 | Silver-to-Gold Mapping Metadata | COMPLETE | 3 | 3 | 16 field mappings across execution, order, product entities (silver→gold tier) |
| M200 | Silver-to-Gold Data Contract + Transformation | COMPLETE | 2 | 2 | silver_to_gold data contract metadata, silver_to_gold_enrichment transformation update |
| M201 | MappingStudio Tier Selectors | COMPLETE | 3 | 3 | Source/target tier dropdown selectors, tier-filtered mapping display |
| M202 | PipelineMonitor Overhaul | COMPLETE | 4 | 4 | True DAG edges from depends_on metadata (replaced linear chaining), medallion stages progress bar, contract validation panel |
| M203 | MedallionOverview Execution Status + Run Stage | COMPLETE | 3 | 3 | Tier node execution status badges, Run Stage action button, stage execution results display |
| M204 | Tours, Scenarios, Operations, Architecture Registry | COMPLETE | 3 | 3 | S30 scenario (Silver→Gold Pipeline), 4 new operations, 2 new architecture registry entries (82 total sections), tour updates |

### Phase 18: Data Quality, Quarantine & Profiling (M205-M215)

| Milestone | Title | Status | Planned | Actual | Notes |
|---|---|---|---|---|---|
| M205 | Quality Dimension Metadata + Pydantic Models | COMPLETE | 3 | 3 | 7 ISO 8000/25012 quality dimensions in workspace/metadata/quality/dimensions.json, 8 Pydantic models in backend/models/quality.py |
| M206 | Extend ContractValidator with 4 New Rule Types | COMPLETE | 3 | 3 | regex_match, referential_integrity, freshness, custom_sql rules added to contract_validator.py, 4 new QualityRule fields on medallion models |
| M207 | Quality Engine — Per-Dimension Weighted Scoring | COMPLETE | 3 | 3 | backend/engine/quality_engine.py with ISO-weighted scoring across 7 dimensions |
| M208 | Quarantine Service | COMPLETE | 3 | 3 | backend/services/quarantine_service.py with quarantine/release/audit workflow |
| M209 | Quality + Quarantine API Endpoints | COMPLETE | 3 | 3 | backend/api/quality.py with 11 endpoints (/api/quality/*) |
| M210 | DataQuality View — Scaffold + Scores Panel | COMPLETE | 3 | 3 | frontend/src/views/DataQuality/index.tsx with entity score cards and weighted scoring breakdown |
| M211 | DataQuality View — Data Profiling Panel | COMPLETE | 3 | 3 | Spider chart (Recharts radar), quarantine queue (AG Grid), data profiling panel |
| M212 | E2E Tests for DataQuality View | COMPLETE | 3 | 3 | tests/e2e/test_data_quality_view.py with 7 E2E tests |
| M213 | Tours, Scenarios, Operations, Architecture Registry | COMPLETE | 3 | 3 | data-quality tour (4 steps), S31 scenario (Governance), 7 operations, 4 architecture sections (86 total) |
| M214 | Full Test Suite + Playwright Verification | COMPLETE | 3 | 3 | 645 backend + 217 E2E tests all passing, frontend builds (970 modules), visual verification |
| M215 | Phase D Documentation Sweep + PR | COMPLETE | 2 | 2 | Update all docs, sync counts, create PR |

### Phase 19: Reference Data & MDM (M216-M227)

| Milestone | Description | Status | Est | Act | Notes |
|---|---|---|---|---|---|
| M216 | Pydantic Models + Tests | COMPLETE | 3 | 3 | 9 models (GoldenRecord, MatchRule, MergeRule, ReferenceConfig, ReconciliationResult, etc.), 13 unit tests |
| M217 | Reference Metadata Files | COMPLETE | 2 | 2 | 4 entity configs (product/venue/account/trader) with match/merge rules, 8 metadata loading tests |
| M218 | MetadataService Methods | COMPLETE | 2 | 2 | 6 CRUD methods for reference configs and golden records, 6 tests |
| M219 | Reference Service — Reconciliation Engine | COMPLETE | 4 | 4 | Exact+fuzzy matching, 5 merge strategies, field-level provenance, cross-references, 12 tests |
| M220 | Silver-to-Reference Data Contracts | COMPLETE | 2 | 2 | 4 data contracts, silver_to_reference pipeline stage, 4 tests |
| M221 | Reference API Router | COMPLETE | 3 | 3 | 9 REST endpoints, registered in main.py, 17 API tests |
| M222 | Golden Record Generation Script | COMPLETE | 2 | 2 | 301 golden records (25 product, 6 venue, 220 account, 50 trader) |
| M223 | ReferenceData Frontend View | COMPLETE | 4 | 4 | 20th view: entity tabs, golden list, detail+provenance, reconciliation dashboard |
| M224 | Navigation, Route, Tour Mapping | COMPLETE | 1 | 1 | Lazy route, sidebar entry (Governance group), tour ID mapping |
| M225 | Tours, Scenarios, Operations, Architecture | COMPLETE | 3 | 3 | reference-data tour (4 steps), S32 scenario, 6 operations, 4 architecture sections (94 total) |
| M226 | Full Test Suite + Playwright Verification | COMPLETE | 2 | 2 | 705 backend + 224 E2E, 971 modules, light+dark mode verified |
| M227 | E2E Tests + Documentation + PR | COMPLETE | 2 | 2 | 7 E2E tests, all docs updated, count sync, PR |

---

## Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Embedded (no Docker) | ~99% launch reliability, fastest dev, files on disk = artifact visibility |
| OLAP Engine | DuckDB (embedded) | Full SQL, Parquet native, in-process, schema catalog |
| Data Storage | CSV (editable) + Parquet (engine) | Dual: human-readable + performant |
| Metadata Format | JSON files on disk | Human-readable, version-controllable, no DB needed |
| Frontend Framework | React 19 + TypeScript + Vite | Modern, fast, good library ecosystem |
| Charting | TradingView Lightweight Charts | Purpose-built for financial data, Bloomberg look |
| Data Grid | AG Grid Community | Bloomberg-grade data density, free tier sufficient |
| DAG Visualization | React Flow + dagre | Interactive nodes, auto-layout, widely adopted |
| State Management | Zustand | Simple, minimal boilerplate, per-domain stores |
| Theme | Tailwind CSS 4 + CSS variables | Bloomberg dark default, easy light mode toggle |
| AI Assistant | Claude API (live) + Mock mode | Works with or without API key |
| Demo Controls | File-based snapshots | Simple, reliable, fast reset |
| Alert Scoring | Graduated scoring + MUST_PASS/OPTIONAL | Flexible: alerts can trigger via all-thresholds-pass OR score-exceeds-threshold |

---

## What Was Done

### 2026-02-23
- [x] Requirements gathering session (20 clarifying questions)
- [x] Design document written and approved
- [x] Implementation plan created (14 milestones, ~35 tasks)
- [x] Capabilities & user stories documented (9 capabilities, 18 stories)
- [x] BDD scenarios written for all detection models and features
- [x] Progress tracker created
- [x] Git repo initialized
- [x] Synthetic data guidelines approved (50+ real products, 200+ accounts, order versioning, 3 types of market data, news feed, 13 embedded patterns)
- [x] Graduated scoring system added across all documents (score steps, MUST_PASS/OPTIONAL, score-based alert triggering)

### 2026-02-24
- [x] **M0 Task 0.1**: Python backend — FastAPI + pyproject.toml + uv sync (49 packages)
- [x] **M0 Task 0.2**: React frontend — Vite + TypeScript + all deps (AG Grid, TradingView, React Flow, Monaco, etc.)
- [x] **M0 Task 0.3**: Workspace directory structure + start.sh launch script
- [x] **M1 Task 1.1**: DuckDB connection manager with thread-safe cursors (3 tests)
- [x] **M1 Task 1.2**: Pydantic metadata models — entities, calculations, settings, detection, alerts (7 tests)
- [x] **M1 Task 1.3**: Metadata service — JSON CRUD for all metadata types (6 tests)
- [x] **M1 Task 1.4**: Data loader — CSV→Parquet→DuckDB with change detection (6 tests)
- [x] **M1 Task 1.5**: API route structure — 7 routers with placeholder endpoints
- [x] **M1 Task 1.6**: Query service — SQL execution, table listing, schema introspection (5 tests)
- [x] **M3 Task 3.1**: Settings resolver — hierarchy, multi-dim, product-specific, score steps, evaluation (12 tests)
- [x] **M3 Task 3.2**: 15 setting JSON files — 6 thresholds, 5 score steps, 4 score thresholds
- **Total**: 39 tests passing, 14 commits on `feature/scaffold/m0-m1-foundation`

### 2026-02-23 (continued)
- [x] **M2 Task 2.1**: Calculation DAG executor — topological sort, cycle detection, SQL execution, Parquet persistence (7 tests)
- [x] **M2 Task 2.2**: Layer 1 transaction calcs — value_calc (instrument-type-aware), adjusted_direction (short instrument logic) (9 tests)
- [x] **M2 Task 2.3**: Layer 2 time window calcs — business_date_window, trend_window, market_event_window, cancellation_pattern (12 tests)
- [x] **M2 Task 2.4**: Layer 3 aggregation calcs — trading_activity_aggregation (buy/sell/net/same_side), vwap_calc (proximity metric) (10 tests)
- [x] **M2 Task 2.5**: Layer 3.5 derived calcs — large_trading_activity (threshold flag), wash_detection (qty match + VWAP proximity) (8 tests)
- [x] **Bug fix**: Data loader now quotes table names for SQL reserved words (e.g., "order")
- **Total**: 85 tests passing, 15 commits on `feature/scaffold/m0-m1-foundation`

### 2026-02-24 (continued)
- [x] **M4 Task 4.1**: Detection engine — graduated scoring, MUST_PASS/OPTIONAL strictness, alert trigger logic (10 tests)
- [x] **M4 Task 4.2**: 5 detection model JSON definitions — wash_full_day, wash_intraday, market_price_ramping, insider_dealing, spoofing_layering
- [x] **M4 Task 4.3**: Alert service — JSON trace files, Parquet summary, DuckDB registration (8 tests)
- **Total**: 103 tests passing, 18 commits on `feature/scaffold/m0-m1-foundation`

### 2026-02-24 (M5)
- [x] **M5 Task 5.1**: App shell — React Router with 11 routes, sidebar navigation (Define/Configure/Operate/Compose/Investigate/AI), top toolbar
- [x] **M5 Task 5.2**: Theme system — CSS variable dark/light theme, useTheme hook, localStorage persistence, AG Grid/Monaco token overrides
- [x] **M5 Task 5.3**: Shared components — Panel, DataGrid (AG Grid wrapper), LoadingSpinner, StatusBadge
- [x] **M5 Task 5.4**: API client & stores — fetch wrapper, WebSocket manager, 4 Zustand stores (alerts, pipeline, demo, metadata)
- **Total**: 103 tests passing, frontend builds (232 KB JS, 13 KB CSS), 19 commits

### 2026-02-24 (M6+M7+M8+M9+M11)
- [x] **M6 Task 6.1**: Entity Designer — AG Grid list, detail with fields/types, React Flow relationship graph
- [x] **M6 Task 6.2**: Metadata Explorer — calculation list by layer, detail panel, dagre-layout DAG
- [x] **M6 Task 6.3**: Settings Manager — settings list, score steps table, override viewer
- [x] **M6 Task 6.4**: Mapping Studio — calc selector, source preview, canonical fields
- [x] **M7 Task 7.1**: Pipeline Monitor — execution DAG with animated edges, step table, run button
- [x] **M7 Task 7.2**: Schema Explorer — DuckDB table list, column detail
- [x] **M7 Task 7.3**: SQL Console — Monaco editor with Ctrl+Enter, AG Grid results, preset queries
- [x] **M8 Task 8.1**: Model Composer — detection model viewer with calc/strictness breakdown
- [x] **M8 Task 8.2**: Data Manager — table browser with live SQL data preview
- [x] **M9 Tasks 9.1-9.5**: Risk Case Manager — alert summary grid, alert detail with business description, entity context, Recharts score breakdown with threshold line
- [x] **M11 Task 11.1**: Demo Controller — 8-checkpoint state machine, save/restore snapshots (11 tests)
- [x] **M11 Task 11.2**: DemoToolbar — Reset/Step/End/Act jump buttons, progress bar
- [x] Wired metadata, query, alerts, and demo API routes to actual backend services
- **Total**: 114 tests passing, frontend builds, 23 commits

### 2026-02-23 (M12)
- [x] **M12 Task 12.1**: Data guidelines — already approved (50+ products, 200+ accounts, 50 traders, 2 months, 13 patterns)
- [x] **M12 Task 12.2**: Data generation script (`scripts/generate_data.py`) — 519 executions, 532 orders, 26,890 intraday rows, 2,150 EOD rows
  - 50 products: 25 equities, 6 FX, 8 commodities, 6 options, 5 futures
  - 220 accounts, 50 traders, date range 2024-01-02 to 2024-02-29
  - 13 embedded detection patterns: 4 wash trading, 3 MPR, 3 insider dealing, 3 spoofing
  - 4 entity JSON definitions (execution, order, md_intraday, md_eod)
  - 28 unit tests + 6 pipeline integration tests (data → load → calc → detect → alerts fire)
  - Detection engine fix: MUST_PASS gate calcs without score_steps now auto-pass (enables MPR + spoofing alerts)
- **Total**: 148 tests passing, 23 commits on `feature/scaffold/m0-m1-foundation`

### 2026-02-23 (M12 continued)
- [x] **M12 Task 12.3**: Snapshot generation script (`scripts/generate_snapshots.py`)
  - Drives full pipeline through all 8 checkpoints: pristine → data_loaded → pipeline_run → alerts_generated → act1_complete → model_deployed → act2_complete → final
  - Each snapshot contains data/, results/, alerts/, metadata/ as appropriate
  - Verification: each snapshot independently restorable with correct state
  - Bug fix: `demo_controller.py` restore_snapshot now clears workspace dirs not present in snapshot
  - 8 tests in `tests/test_snapshot_generation.py`
- **Total**: 156 tests passing on `feature/scaffold/m0-m1-foundation`

### 2026-02-23 (M10)
- [x] **M10 Task 10.1**: Backend AI service (`backend/services/ai_assistant.py`)
  - Live mode: Claude API with auto-generated system context (schema, metadata, domain instructions)
  - Mock mode: 5 pre-scripted conversation sequences (explore data, wash investigation, alert deep dive, custom analysis, spoofing check)
  - Domain instructions in `workspace/metadata/ai_instructions.md`
  - Mock sequences in `workspace/metadata/ai_mock_sequences.json`
  - API routes in `backend/api/ai.py` (mode, mock-sequences, chat endpoints)
  - 11 tests in `tests/test_ai_assistant.py`
- [x] **M10 Task 10.2**: Frontend AI chat interface
  - ChatPanel: message bubbles with markdown code block rendering, SQL "Run Query" buttons
  - MockPlayer: scenario picker buttons that load pre-scripted conversations
  - QueryPreview: execute SQL from chat directly, view results in AG Grid
  - Mode indicator (Live/Mock) with StatusBadge
- **Total**: 167 tests passing on `feature/scaffold/m0-m1-foundation`

### 2026-02-23 (M13)
- [x] **M13 Task 13.1**: 4 README files — root, `backend/README.md`, `frontend/README.md`, `workspace/README.md`
- [x] **M13 Task 13.2**: Demo guide (`docs/demo-guide.md`) — Act 1/2/3 walkthrough with what to click/say/expect
- [x] **M13 Task 13.3**: Data dictionary — `docs/schemas/data-dictionary.md`, `docs/schemas/entity-schemas.md`, `docs/schemas/calculation-schemas.md`
- [x] **M13 Task 13.4**: E2E integration test (`tests/test_integration_e2e.py`) — 18 tests covering all API endpoints via FastAPI TestClient
- [x] **M13 Task 13.5**: SPA static files serving — SPAStaticFiles class in `backend/main.py` with index.html fallback for client-side routing
- **Total**: 185 tests passing on `feature/scaffold/m0-m1-foundation`

### 2026-02-23 (Phase 2: Interactive Core Features — M14-M17)
- [x] **M14 Task 14.1**: Update progress tracker with Phase 2 milestones
- [x] **M14 Task 14.2**: Wire SettingsResolver, DetectionEngine, AlertService to app.state (1 test)
- [x] **M15 Task 15.1**: Backend — POST /settings/{id}/resolve endpoint (1 test)
- [x] **M15 Task 15.2**: Frontend — Wire OverrideEditor with live resolve
- [x] **M16 Task 16.1**: Backend — POST /metadata/mappings endpoint (1 test)
- [x] **M16 Task 16.2**: Frontend — Add drag handlers to SourcePreview
- [x] **M16 Task 16.3**: Frontend — Add drop handlers to CanonicalFields
- [x] **M16 Task 16.4**: Frontend — Wire MappingStudio with state & save
- [x] **M17 Task 17.1**: Backend — POST /metadata/detection-models endpoint (1 test)
- [x] **M17 Task 17.2**: Backend — POST /alerts/generate/{model_id} endpoint (2 tests)
- [x] **M17 Task 17.3**: Frontend — Add saveDetectionModel to store
- [x] **M17 Task 17.4**: Frontend — Create ModelCreateForm component
- [x] **M17 Task 17.5**: Frontend — Update ModelComposer with create & deploy
- [x] **Playwright E2E**: All 3 features verified in browser — resolve tester, D&D mappings, model create & deploy
- [x] **Regression**: Entity Designer, Risk Case Manager, all existing views still working
- **Total**: 191 tests passing (6 new), 14 commits on `feature/scaffold/m0-m1-foundation`

### 2026-02-23 (Phase 3: Alert Detail & Polish — M18-M25)
- [x] **M18 Task 18.1**: Save Phase 3 plan to `docs/plans/2026-02-23-phase3-alert-detail-plan.md`, update progress
- [x] **M19 Task 19.1**: Extend AlertTrace TS interface — `calculation_trace`, `settings_trace`, `related_data`, `SettingsTraceEntry`, `CalculationScore`
- [x] **M19 Task 19.2**: Backend — `GET /data/market/{product_id}` endpoint for EOD + intraday market data (1 test)
- [x] **M19 Task 19.3**: Backend — `GET /data/orders` endpoint for related orders/executions (1 test)
- [x] **M20 Task 20.1**: Frontend — `CalculationTrace.tsx` — React Flow + dagre DAG (model → calc nodes with scores, pass/fail coloring)
- [x] **M21 Task 21.1**: Frontend — `MarketDataChart.tsx` — TradingView Lightweight Charts v5 (price line + volume histogram, resize observer)
- [x] **M22 Task 22.1**: Frontend — `SettingsTrace.tsx` — Settings resolution entries with override/default badges, match details
- [x] **M23 Task 23.1**: Frontend — `RelatedOrders.tsx` — AG Grid executions table (Exec ID, Date, Time, Side, Qty, Price, Product, Account)
- [x] **M24 Task 24.1**: Frontend — `FooterActions.tsx` — Raw Data toggle, Export JSON download, Related Alerts button
- [x] **M24 Task 24.2**: Frontend — Rewire `AlertDetail/index.tsx` to 6-row layout matching design §8.3
- [x] **M25 Tasks 25.1-25.6**: Build (874 modules, 2.1MB JS), 193 backend tests pass, Playwright E2E verified all 6 panels render with real data
- [x] **Playwright E2E**: Insider dealing alert (AMZN/ACC-121) — all panels render: Calc Trace DAG, Market Data chart, Settings Resolution, Score Breakdown, Related Orders (4 executions), Footer Actions
- [x] **Regression**: Settings Manager, Mapping Studio, Model Composer all still working
- **Total**: 193 tests passing (2 new), 10 commits on `feature/alert-detail/phase3-investigation-workspace`

### 2026-02-23 (Browser Testing — Playwright E2E)
- [x] **Full browser-based E2E testing** of all 11 views using Playwright MCP
- [x] **9 bugs found and fixed** during live testing:
  1. **`step()` not restoring snapshots** — `demo_controller.py` only updated state label, never called `restore_snapshot()`. Fixed.
  2. **No DuckDB re-registration after snapshot restore** — Snapshot restores files to disk but DuckDB views not recreated. Added `_reload_data()` in `demo.py` that re-registers CSVs, result parquets, and alerts summary after every state change.
  3. **Result parquet glob pattern wrong** — Used `results/*.parquet` but files are in `results/<layer>/*.parquet`. Fixed to `**/*.parquet`.
  4. **alerts_summary filename mismatch** — Snapshot has `summary.parquet`, code expected `alerts_summary.parquet`. Fixed to check both names.
  5. **`/api/alerts` returning HTML (SPA fallback)** — Route `@router.get("/")` only matched with trailing slash; without slash, SPA fallback returned index.html. Fixed by adding `@router.get("")`.
  6. **Alerts fallback never triggered** — `QueryService.execute()` catches exceptions internally (returns `{"error": ...}` dict). The try/except in alerts handler never caught anything. Fixed by checking `if "rows" in result and result["rows"]`.
  7. **`data.py` and `pipeline.py` were stubs** — Returned hardcoded empty responses. Wired to DataLoader, QueryService, and CalculationEngine.
  8. **Pipeline API response mismatch** — Backend returned `{"calculations": ...}` but frontend expected `{"steps": [...]}` with PipelineStep format. Fixed to return proper steps with calc_id, name, layer, status, duration_ms, row_count.
  9. **DuckDB DROP TABLE/VIEW type conflict** — `DROP VIEW IF EXISTS` fails when object is TABLE and vice versa. Wrapped both drop statements in try/except blocks.
- [x] **All 11 views verified working**:
  - Entity Designer: 4 entities, field details, React Flow relationships graph
  - Metadata Explorer: 10 calculations, DAG visualization, layer filters
  - Settings Manager: 15 settings, score steps table, resolution tester
  - Mapping Studio: 10 calculations, source columns, required fields with type badges
  - Pipeline Monitor: DAG execution graph, 10 steps table with timing and row counts
  - Schema Explorer: 4 tables with column details
  - SQL Console: Monaco editor, preset queries, custom SQL execution
  - Model Composer: 5 detection models, calculation composition
  - Data Manager: 15 tables grid, data preview with live DuckDB query
  - Risk Case Manager: 500 alerts grid, alert detail with score breakdown chart
  - AI Assistant: Mock mode, 5 scenarios, "Run Query" executes live SQL with results grid
- [x] **Additional features verified**: Dark/Light theme toggle, demo toolbar (Reset/Step/End/Act 1/Act 2), full checkpoint progression (pristine → data_loaded → pipeline_run → alerts_generated → act1_complete → model_deployed → act2_complete → final)
- **Files modified**: `backend/services/demo_controller.py`, `backend/api/demo.py`, `backend/api/alerts.py`, `backend/api/data.py`, `backend/api/pipeline.py`, `backend/engine/calculation_engine.py`

### 2026-02-23 (Phase 4: UX Polish & AI Integration — M26-M33)
- [x] **M26 Task 26.1**: Save Phase 4 plan to `docs/plans/2026-02-23-phase4-ux-polish-plan.md`, update progress
- [x] **M27 Task 27.1**: Frontend — `ConfirmDialog.tsx` — Reusable portal-based dialog with Escape key, overlay click, default/danger variants
- [x] **M27 Task 27.2**: Frontend — Wire ConfirmDialog into Model Composer Deploy & Run button
- [x] **M27 Task 27.3**: Frontend — Wire ConfirmDialog into Mapping Studio Save Mappings button
- [x] **M28 Task 28.1**: Frontend — `AlertDetail/index.tsx` — Panel toggle toolbar (8 buttons) with localStorage persistence, conditional grid layout
- [x] **M29 Task 29.1**: Frontend — `SQLConsole/index.tsx` — Collapsible AI ChatPanel sidebar with query injection into Monaco editor
- [x] **M30 Task 30.1**: Frontend — `ModelComposer/index.tsx` — Collapsible AI ChatPanel as 4th column, conversational guidance
- [x] **M31 Task 31.1**: Frontend — `AlertDetail/modelLayouts.ts` — Model-type layout config (wash, MPR, insider, spoofing) with emphasis panels and investigation hints
- [x] **M31 Task 31.2**: Frontend — `AlertDetail/index.tsx` — Dynamic hint banner + ring emphasis per model type
- [x] **M32 Tasks 32.1-32.3**: Frontend build (876 modules), 193 backend tests pass, Playwright E2E verified all 5 features
- [x] **Playwright E2E**: ConfirmDialog (Model Composer + Mapping Studio), panel toggles (hide/show/persist), AI panels (SQL Console + Model Composer), dynamic layout (wash vs insider hints)
- [x] **Regression**: Settings Manager, Mapping Studio D&D, Model Composer create all still working
- **Total**: 193 tests passing (no new backend), 10 commits on `feature/frontend/phase4-ux-polish-ai-integration`

### 2026-02-23 (Phase 5: Data Model, UX, Visualization & Dashboard — M34-M48)
- [x] **M34 Task 34.1**: Save Phase 5 plan to `docs/plans/2026-02-23-phase5-data-ux-plan.md`, update progress
- [x] **M35-M36**: Data model normalization — Product entity with 8 fields (product_id, name, asset_class, instrument_type, contract_size, option_type, exchange, currency)
  - Created `workspace/metadata/entities/product.json` with relationships to execution, order, md_intraday, md_eod
  - Updated `scripts/generate_data.py` — new `_write_product_csv()` method, removed 4 fields from execution rows
  - Updated `workspace/metadata/entities/execution.json` — removed 4 product fields, added many_to_one relationship to product
  - Product CSV: 50 products (25 equities, 6 FX, 8 commodities, 6 options, 5 futures)
- [x] **M37-M38**: Updated calculation SQL and detection models
  - `value_calc.json` — `FROM execution e INNER JOIN product p` for instrument-type-aware pricing
  - `adjusted_direction.json` — `LEFT JOIN product p` for option_type
  - All 5 detection models — `INNER JOIN product p` replacing hardcoded `'equity' AS asset_class`
- [x] **M39-M40**: Updated all test fixtures (11 test files), added product.csv fixture data
  - Added `TestProductSchema` with 5 new tests in `test_data_generation.py`
  - Added `test_product_csv_loads` in `test_data_loader.py`
  - Regenerated CSV data and all 8 snapshots
  - 198 tests passing (5 new product tests)
- [x] **M41-M42**: UX infrastructure
  - `Tooltip.tsx` — @floating-ui/react hover tooltip with offset, flip, shift middleware
  - `HelpButton.tsx` — Small `?` circle wrapping Tooltip
  - `Panel.tsx` — Added optional `tooltip` and `dataTour` props
  - `tourStore.ts` — Zustand store with step navigation, localStorage completion tracking
  - `TourOverlay.tsx` — SVG spotlight mask, floating popover, cross-view navigation
  - `OnboardingModal.tsx` — First-visit welcome with 4-phase grid
  - `AppLayout.tsx` — TourOverlay, OnboardingModal, Tour button, tour registration
- [x] **M43**: Chart enhancements & filtering
  - `TimeRangeSelector.tsx` — 1W/1M/3M/6M/All button group
  - `MarketDataChart.tsx` — Enhanced with time range, EOD/Intraday toggle, crosshair
  - `RelatedOrders.tsx` — AG Grid column filters (date, number, text)
  - `TradeVolumeChart.tsx` — Recharts bar chart with alert date reference line
  - `backend/api/data.py` — Added start_date/end_date query params
- [x] **M44-M45**: Tour content & demo workflow guides
  - `tourDefinitions.ts` — 12 view tours + 3 act workflow guides (Act 1: 9 steps, Act 2: 4 steps, Act 3: 3 steps)
  - data-tour attributes added to all 10 views + sidebar + toolbar
  - Tooltips added to Panel components across all views
  - Guide button in DemoToolbar starts act-appropriate workflow
- [x] **M46**: Dashboard view
  - `backend/api/dashboard.py` — `/api/dashboard/stats` with 6 aggregation queries
  - `dashboardStore.ts` — Zustand state management
  - `SummaryCard.tsx` — Metric card component
  - `Dashboard/index.tsx` — 4 summary cards, PieChart (by model + by asset), BarChart (score distribution + triggers)
  - Dashboard route and sidebar entry (new "Overview" group)
- [x] **M47-M48**: Verification and documentation
  - Frontend build: 895 modules, 2.2MB JS, no TypeScript errors
  - Backend tests: 193 tests passing
  - Updated progress.md and demo-guide.md
- **Total**: 193 tests passing, 10 commits on `feature/phase5/data-ux-viz-dashboard`

### 2026-02-24 (Phase 6: Data Model Deep Refinement — M49-M65)
- [x] **M49**: Save Phase 6 plan, update progress tracker
- [x] **M50**: Venue entity — 6 static rows with ISO 10383 MIC codes (XNYS, XNAS, XCBO, XCME, XNYM, XXXX)
- [x] **M51**: Product entity overhaul — corrected taxonomy (stock→common_stock, fx→spot), added ISIN/CFI/MIC/underlying/strike/expiry/tick_size/lot_size
- [x] **M52**: Account entity — 220 rows with type, country (KY for hedge funds), risk rating
- [x] **M53**: Trader entity — 50 rows with desk, type, hire date
- [x] **M54**: Order entity overhaul — added order_type, limit_price, filled_quantity, time_in_force, execution_id, venue_mic, trader_id; renamed PENDING→NEW
- [x] **M55**: Execution entity overhaul — added order_id FK, venue_mic, exec_type, capacity, millisecond times
- [x] **M56**: MD_EOD overhaul — full OHLCV (open, high, low, close, volume) + prev_close, num_trades, vwap
- [x] **M57**: MD_Intraday overhaul — bid/ask prices, trade_condition, millisecond times, expanded to FX + futures (32K rows)
- [x] **M58-M59**: Calculation and detection SQL updates — value_calc/adjusted_direction updated for call_option/put_option; 4 settings overrides fixed
- [x] **M60**: Test updates — 16 new tests (214 total), all fixtures updated for new schemas
- [x] **M61**: Regenerated all data and snapshots (8 CSVs, 8 checkpoints)
- [x] **M62-M63**: Frontend updates — new RelatedOrders columns, orders grid, OHLC candlestick chart, asset class colors
- [x] **M64**: Full verification — frontend builds (895 modules), 214 tests pass, 51/51 data integrity checks
- [x] **M65**: Documentation — updated progress tracker and demo guide
- **Total**: 214 tests passing (21 new), 14 commits on `feature/phase6/data-model-refinement`

---

## Gap Analysis: Design vs. Implementation (2026-02-23)

Comprehensive comparison of the design doc (`docs/plans/2026-02-23-analytics-platform-demo-design.md` §8.3) against current implementation. These are the remaining items to bring the demo to full design parity.

### HIGH Priority — Core Demo Gaps

| Gap | Design Section | What's Missing |
|---|---|---|
| **Calculation Trace DAG** | §8.3 row 3-left | Interactive DAG showing detection model → calc chain with live values. Currently: only Recharts score breakdown bar chart |
| **Market Data Graph** | §8.3 row 3-right | Price + volume + orders timeline (TradingView Lightweight Charts). Currently: not implemented |
| **Settings Resolution Trace** | §8.3 row 4-left | Per-alert view showing which thresholds applied and WHY (resolution trace). Currently: not implemented |
| **Related Orders Table** | §8.3 row 5 | AG Grid table of related orders/executions with timestamps, side, qty, price, status. Currently: not implemented |
| **Footer Actions** | §8.3 row 6 | [Logs] [Raw Data] [Related Alerts] [Export] action buttons. Currently: not implemented |

### MEDIUM Priority — Polish & Enhancement

| Gap | Design Section | Status |
|---|---|---|
| **Product Details & Related Products** | §8.3 row 1-right | DEFERRED — Entity context shows product info but not "related products" expansion |
| **Dynamic Alert Structure** | §8.2 bullet | RESOLVED (M31) — Model-type layout config with emphasis panels and investigation hints |
| **Configurable Widgets** | §8.1 bullet | RESOLVED (M28) — Panel toggle toolbar with localStorage persistence |
| **AI in SQL Console & Model Composer** | §10.1 | RESOLVED (M29, M30) — Collapsible ChatPanel in both views |
| **Confirmation Dialogs** | General | RESOLVED (M27) — ConfirmDialog for Model Deploy & Mapping Save |

---

### 2026-02-24 (Phase 9: Metadata Editor & Visual Configuration — M74-M78)
- [x] **M74 Task 74.0**: Persist comprehensive roadmap (Phases 7-20, ~100+ items) to `docs/plans/2026-02-24-comprehensive-roadmap.md`
- [x] **M74 Task 74.1**: Expand TS metadata types — 6 new interfaces (FieldDef, RelationshipDef, SettingOverride, ModelCalculation), expanded EntityDef, CalculationDef, SettingDef, DetectionModelDef
- [x] **M74 Task 74.2**: Add 10 CRUD store actions — saveEntity, deleteEntity, saveCalculation, deleteCalculation, saveSetting, deleteSetting, updateDetectionModel, deleteDetectionModel, getCalculationDependents, getSettingDependents
- [x] **M74 Task 74.3**: Backend CRUD API integration tests — 14 tests covering PUT/DELETE for all 4 types + dependency checking + cycle detection
- [x] **M75**: MetadataEditor view — Monaco JSON panel (left) + visual form panel (right) with bidirectional sync, route + sidebar entry
- [x] **M76**: Visual editors — EntityEditor, CalculationEditor, SettingsEditor, DetectionModelEditor components
- [x] **M77**: Dashboard widgets — WidgetContainer, widgetStore (localStorage), ChartTypeSwitcher, multi-renderer (bar/line/pie/table/h-bar)
- [x] **M78**: Wire CRUD — edit/delete in EntityDesigner, MetadataExplorer, SettingsManager, ModelComposer; ConfirmDialog; dependency warnings
- **Total**: 280 tests passing (14 new CRUD tests), 911 frontend modules, 15 new files, 13 modified files

### 2026-02-24 (Phase 9 continued: E2E Tests, Tours & Demo Guide)
- [x] **E2E Tests**: 14 new Playwright E2E tests for Phase 9 features (56 total E2E, 294 total tests)
  - `TestMetadataEditor` (5 tests): loads entity, type buttons visible, switch to calculations, switch to models, valid JSON indicator
  - `TestDashboardWidgets` (3 tests): chart type dropdowns, widget settings gear, widget toggle panel
  - `TestCRUDButtons` (5 tests): entity new button, entity edit/delete on select, settings new button, model new button, model edit/delete on select
  - Added `/editor` route to `NAV_ROUTES` and no-console-errors route list
- [x] **Guided Tour**: Added `editor` tour definition (4 steps) to `tourDefinitions.ts`, wired `data-tour` attributes in MetadataEditor view
- [x] **Demo Guide**: Updated `docs/demo-guide.md` with Phase 9 features — Metadata Editor section, chart type switching, widget visibility, CRUD buttons
- [x] **Visual Verification**: 11 screenshots taken across MetadataEditor, Dashboard, EntityDesigner, SettingsManager, ModelComposer
- **Total**: 294 tests passing (56 E2E + 238 backend), 1 pre-existing flaky test (Monaco keyboard in headless)

### 2026-02-24 (Phase 10: Regulatory Traceability & Model Tagging — M79-M83)
- [x] **M79**: Added `regulatory_tags` (list[str]) to CalculationDefinition, `RegulatoryCoverage` model + `regulatory_coverage` to DetectionModelDefinition
- [x] **M79**: Updated all 10 calculation JSONs with regulatory article tags (MAR, MiFID II, Dodd-Frank)
- [x] **M79**: Updated all 5 detection model JSONs with structured regulatory coverage entries
- [x] **M79**: Expanded TS interfaces (RegulatoryCoverage, regulatory_tags, regulatory_coverage)
- [x] **M80**: Created regulation registry (`workspace/metadata/regulations/registry.json`) — 4 regulations, 10 articles
- [x] **M80**: Added `load_regulation_registry()` and `get_regulatory_coverage_map()` to MetadataService
- [x] **M80**: Added 3 API endpoints: `/regulatory/registry`, `/regulatory/coverage`, `/regulatory/traceability-graph`
- [x] **M80**: 9 new tests in `test_regulatory_api.py` (registry, coverage, graph)
- [x] **M81**: Created `regulatoryStore.ts` Zustand store with parallel fetch
- [x] **M81**: Created `RegulatoryMap/index.tsx` — React Flow + dagre graph with 4 node types, coverage cards, detail panel
- [x] **M81**: Added `/regulatory` route and "Governance" sidebar group
- [x] **M82**: Created `SuggestionService` — gap analysis, model improvements, unused calcs
- [x] **M82**: Added `/regulatory/suggestions` endpoint + 4 new tests
- [x] **M82**: Added collapsible SuggestionsPanel to RegulatoryMap
- [x] **M83**: Added 4 E2E tests for RegulatoryMap, guided tour (4 steps), demo guide section
- **Total**: 279 backend tests (13 new), 914 frontend modules, 4 new files, 12 modified files

---

### 2026-02-24 (Phase 12: UI/UX Usability — M89-M92)
- [x] **M89 Task 89.1**: DataGrid.tsx — global AG Grid defaults: defaultColDef (resizable, sortable, tooltipValueGetter, minWidth:60), autoSizeStrategy (fitGridWidth), tooltipShowDelay, tooltipInteraction, removed deprecated rowSelection="single"
- [x] **M89 Task 89.2**: AG Grid theme CSS — tooltip styling (background, border, shadow), text-overflow ellipsis on cells and headers
- [x] **M90 Task 90.1**: EntityDesigner — EntityList columns with minWidth+flex, panel widths w-72→w-80, w-96→w-80
- [x] **M90 Task 90.2**: EntityDetail — fields grid columns with minWidth+flex (Field 120, Description 150)
- [x] **M90 Task 90.3**: MetadataExplorer — CalculationList columns with minWidth+flex, panel w-[380px]→w-[440px], detail w-72→w-80
- [x] **M90 Task 90.4**: SettingsManager — SettingsList columns with minWidth+flex, panel w-[420px]→w-[480px]
- [x] **M90 Task 90.5**: RiskCaseManager — AlertSummary columns: Alert ID minWidth:150, Model minWidth:120, Time minWidth:180
- [x] **M90 Task 90.6**: MetadataEditor — dropdown max-w-[400px] to prevent overflow
- [x] **M91 Task 91.1**: EntityEditor — CSS grid template fix: grid-cols-[1fr_120px_60px_60px_1fr_40px] → grid-cols-[minmax(100px,1.5fr)_100px_45px_45px_minmax(80px,1fr)_32px], gap-1→gap-0.5
- [x] **M92 Task 92.1**: 12 new E2E tests in TestUxUsability — column readability, visual editor, responsive layout, tooltip/resize
- [x] **M92 Task 92.2**: UX features guided tour — 5 steps covering resizable columns, relationship graph, layer badges, dual editors, alert grid
- [x] **M92 Task 92.3**: Documentation — progress tracker, demo guide, plan file
- [x] **M92 Task 92.4**: Regenerated snapshots
- **Total**: 309 backend tests + 83 E2E tests, 14 files modified

#### Browser Walkthrough Verification (1440px + 1024px)

**1440x900 viewport — all views verified:**
- [x] Dashboard: 430 Total Alerts, 5 Active Models, all charts rendering
- [x] Entity Designer: entity IDs ("account", "execution", "md_eod") fully visible, "Account" detail panel with all 8 field names readable
- [x] Metadata Explorer: calculation IDs ("adjusted_direction", "business_date_window", "trading_activity_aggregation") fully visible, layer badges, DAG
- [x] Settings Manager: all 15 setting IDs fully visible ("business_date_cutoff", "same_side_pct_score_steps"), no truncation
- [x] Risk Case Manager: 8 columns, model names ("wash_intraday", "market_price_ramping") fully visible, full timestamps
- [x] Metadata Editor Visual Editor: all 5 columns (Name, Type, Key, Null, Description) visible, field names readable, Description column functional

**1024x768 viewport — all critical views verified:**
- [x] Entity Designer: entity list readable (4 columns), detail panel shows "Account" heading and field names, tight but usable
- [x] Metadata Editor: JSON + Visual Editor side by side, field names visible ("account_id", "registration_..."), all 5 grid columns present
- [x] Settings Manager: all 5 columns visible, full IDs readable, no truncation
- [x] Risk Case Manager: all 8 columns visible, model names identifiable, colored score/trigger badges

### 2026-02-25 (Phase 7B: Metadata UX & Guided Demo — Design)
- [x] **Phase 7 Audit**: Comprehensive audit of M66-M69 implementation — all 4 tasks complete, 3 gaps identified
  - G1: Calc SQL still has hardcoded thresholds ($param framework exists but no calc uses it)
  - G2: TimeRangeSelector uses `new Date()` — demo data dates don't align
  - G3: Missing settings overrides for `fixed_income` and `index` asset classes
- [x] **Brainstorming session**: 4 clarifying questions answered, 8 design sections developed
- [x] **Design decisions**:
  - Match patterns: criteria + label + description (reusable pattern bank)
  - Domain value sources: both metadata `domain_values` + live DuckDB distinct values
  - Guided tours: dual-mode (narrated auto-play + interactive try-it-yourself) with per-scenario mode selection
  - Score step builder: full visual builder with range bar, drag-to-reorder, gap/overlap detection
  - Score templates: reusable with value_category semantic tags
  - Use Case Studio: user-created scenarios with sample data, AI-assisted calc generation, 5-layer validation
  - Submission pipeline: submit → review → approve/reject → implement, with system recommendations
  - 25 guided scenarios covering all E2E business workflows
- [x] **Design document**: Saved to `docs/plans/2026-02-25-phase7-completion-metadata-ux-design.md` (10 sections, ~750 lines)
- [x] **Roadmap updated**: Phase 7B added as current priority, 28 milestones planned (M93-M120)
- [x] **Progress tracker updated**: New milestones, work log, overall status

### 2026-02-25 (Phase 7B: Implementation — M93-M105)
- [x] **M93**: Migrated 10 calc JSONs from hardcoded thresholds to `$param` placeholders — `e14b511`
- [x] **M94**: Data-driven TimeRangeSelector (new `/api/data/date-range/{entity_id}` endpoint), added fixed_income/index overrides to 8 settings — `694141c`, 5 new tests, 323 total
- [x] **M95**: Domain Values API with 4 endpoints (match-keys, setting-ids, calculation-ids, field values), cardinality-tier loading, 14 new tests — `b773b73`, 337 total
- [x] **M96**: Match Pattern bank (9 OOB patterns) + Score Template library (7 OOB templates) with CRUD APIs and usage counts, 12 new tests — `c503240`, 349 total
- [x] **M97**: SuggestionInput autocomplete with @floating-ui, useDomainValues hook with 60s cache, tiered loading — `4dff06f`, 917 modules
- [x] **M98**: MatchPatternPicker with two-tab UI (existing/create new), searchable, save-as-pattern — `2e79310`, 917 modules
- [x] **M99**: ScoreStepBuilder visual range bar, editable table, gap/overlap validation + ScoreTemplatePicker — `b9dbb0f`
- [x] **M100**: Settings Manager + MetadataEditor form upgrades — SuggestionInput, MatchPatternPicker, ScoreStepBuilder, Tooltips — `37d8799`, 922 modules
- [x] **M101**: Model Composer 7-step wizard (Steps 1-3: Define, Select Calcs, Configure Scoring) — `c96c7d6`, 926 modules
- [x] **M102**: Wizard Steps 4-7 (Query/Monaco, Review, Test Run/AG Grid, Deploy) + dry run backend endpoint, 3 new tests — `404970a`, 930 modules, 352 tests
- [x] **M103**: ValidationPanel (real-time checks), PreviewPanel (Recharts score sim), DependencyMiniDAG (React Flow) — `de11e95`, 933 modules
- [x] **M104**: ExamplesDrawer with 15 annotated examples (5 models, 5 settings, 5 calcs), slide-out panel — `3bb9213`, 937 modules
- [x] **M105**: 5-layer ValidationService (static, schema, sandbox, impact, regression) + validation API, 7 new tests — `8862284`, 359 tests

### 2026-02-25 (E2E Testing, Browser Walkthrough & Feature Checklist)
- [x] **Browser Walkthrough**: Full Playwright MCP visual walkthrough of all 16 views at 1440px
  - Dashboard, Entity Designer, Metadata Explorer, Settings Manager, Model Composer
  - Use Case Studio, Submissions Queue, AI Assistant, Risk Case Manager
  - Regulatory Map (100% coverage), Schema Explorer, SQL Console
  - Pipeline Monitor, Data Manager, Mapping Studio, Metadata Editor
  - 23 screenshots captured across all views and key interactions
- [x] **Guided Scenario Verification**: Ran "Explore Entity Data Model" Watch Demo (8 steps) through Playwright MCP
- [x] **E2E Playwright Tests**: 87/87 passing (12 test classes)
  - Fixed `test_examples_drawer_close` — ExamplesDrawer uses CSS `translate-x-full` to slide off-screen, keeping DOM element present; changed assertion to check button text reverts
  - Port conflict fix: E2E tests use port 8333, must stop any server on 8000 first (DuckDB lock)
- [x] **Backend Tests**: 386/386 passing
- [x] **Feature Development Checklist**: Created `docs/feature-development-checklist.md`
  - 10 sections: Backend, Frontend, Sidebar/Nav, Backend Tests, E2E Playwright, Tours/Scenarios/Operations, Demo/Presentation, Documentation/Tracking, Git/CI/Release, Broad System Integration Triggers
  - Self-updating Section 10: triggers for new views, entities, calculations, models, settings, API endpoints, tour changes, AG Grid changes
- [x] **Updated CLAUDE.md**: Test counts (473), view count (16), workflow preferences, broad systems section
- [x] **Updated MEMORY.md**: Current state, E2E port note, checklist reference
- **Total**: 473 tests passing (386 backend + 87 E2E), 952 frontend modules, 16 views

### 2026-02-26 (Exploratory Testing Round 3 — M123)
- [x] **Round 3 Exploratory Testing**: Tested 6 previously untested views via Playwright MCP
  - Pipeline Monitor, Metadata Editor, AI Assistant, Use Case Studio, Regulatory Map, Submissions
  - Both dark and light themes checked for each view
  - 5 findings documented, all 5 fixed:
- [x] **F-016**: Pipeline Monitor steps table clipped — changed DAG panel to `h-[350px] shrink-0`, steps to `flex-1 overflow-y-auto`
- [x] **F-017**: Pipeline Monitor Layer column snake_case — added `formatLabel()` to layer cell
- [x] **F-018**: AI Assistant markdown not rendered — added `renderMarkdownText()` parser for **bold**, `code`, and - list items
- [x] **F-019**: Use Case Studio component IDs snake_case — added `formatLabel()` to component ID display
- [x] **F-020**: Use Case Studio raw JSON run results — replaced with structured table (Model, Evaluated, Fired, Status)
- [x] **Views with no issues**: Metadata Editor, Regulatory Map, Submissions
- [x] **All 16 views now have exploratory testing coverage**
- [x] Updated: exploratory-testing-notes.md, roadmap, progress.md, CLAUDE.md, MEMORY.md
- **Total**: 473 tests passing, 955 frontend modules, 16 views, 20 findings (F-001 through F-020)

### 2026-02-26 (Exploratory Testing Round 4 — M124)
- [x] **Round 4 Exploratory Testing**: Live product owner feedback session
- [x] **F-021**: Entity Designer — Replaced horizontal 3-pane layout with vertical 2-tab resizable layout
  - Installed `react-resizable-panels` library
  - Tab 1 "Entity Details": full-width entity list + detail pane (Fields/Relationships sub-tabs)
  - Tab 2 "Relationship Graph": full-width entity list + React Flow graph
  - Drag-to-resize dividers, pane size + tab persistence via localStorage
  - Removed collapsible graph panel, expand/shrink button, graphCollapsed/graphExpanded state
- [x] Updated: exploratory-testing-notes.md, demo-guide.md, tourDefinitions.ts, scenarioDefinitions.ts, operationScripts.ts, development-guidelines.md
- [x] Layout improvement suggestions documented for other views
- **Total**: 473 tests passing, 956 frontend modules, 16 views, 21 findings (F-001 through F-021)

### 2026-02-26 (Exploratory Testing Round 5 — M125-M127)
- [x] **Round 5 Exploratory Testing**: Continued product owner feedback — Entity Designer fields, relationship graphs, Regulatory Map
- [x] **F-022 (M125)**: Entity Designer — Domain Values management
  - Added "Domain" column to Fields AG Grid showing value count badge
  - Field row click handler opening DomainValuesPane side panel (metadata CRUD + data-only values)
  - Domain values tag editor in EntityForm create/edit mode
  - 2 new backend tests, 2 new E2E tests
  - Updated tours, operations, scenarios
- [x] **F-023 (M126)**: Entity Designer — Relationship Graph visual improvements
  - Smoothstep edges (right-angle routing), label backgrounds, ArrowClosed arrowheads
  - Increased dagre spacing (nodesep: 60, ranksep: 100) and node dimensions (160×44)
- [x] **F-024 (M127)**: Regulatory Map — Complete redesign
  - Replaced fixed w-72 detail panel with resizable vertical panels
  - Two tabs: Traceability Map (graph + MiniMap + Controls + smoothstep edges + edge labels) and Regulation Details (AG Grid with coverage badges)
  - Backend: added description fields to article, detection_model, calculation nodes
  - Full-width detail pane with descriptions shown from regulation registry
  - 2 new backend tests, 3 new E2E tests
  - Updated tours, operations, scenarios
- [x] **Layout fix**: Changed RegulatoryMap outer div from `flex-1` to `h-full` — `<main>` is display:block, so flex-1 had no effect (Group collapsed to 6px)
- [x] **Tour path mapping fix**: Added `regulatory` and `editor` entries to `getTourIdForPath` in AppLayout.tsx — Tour button now works on Regulatory Map and Metadata Editor views
- [x] Updated: exploratory-testing-notes.md, progress.md, demo-guide.md, CLAUDE.md, MEMORY.md, feature-development-checklist.md
- [x] Verified all features with Playwright MCP browser: screenshots of Traceability Map, Regulation Details, Entity Designer domain values, Relationship Graph
- **Total**: 390 backend + 93 E2E = 483 tests passing, 957 frontend modules, 16 views, 24 findings (F-001 through F-024)

### 2026-02-26 (Architecture Traceability Mode — M128)
- [x] **Architecture Traceability Mode**: Full-feature implementation for tracing every UI section to its architecture
  - Toolbar toggle button in AppLayout (Trace on/off)
  - TraceOverlay renders info icons on every traced section using `data-trace` attributes
  - TracePopup: 400px slide-in panel showing source files, Zustand stores, API endpoints, metadata & data sources, technologies, metadata-maturity rating with explanation, and improvement opportunities
  - 74 traceable sections registered in `architectureRegistry.ts` (2,978 lines) across 16 views + cross-cutting concerns
  - MetadataMaturity rating system: fully-metadata-driven, mostly-metadata-driven, mixed, code-driven, infrastructure
  - MetadataMaturityBadge component with color-coded badges and maturity explanations
  - `data-trace` attributes added to all 16 view files + sub-components + Panel + WidgetContainer + Sidebar
  - Zustand store (`traceabilityStore.ts`) for toggle state and selected section
  - TypeScript interfaces in `architectureRegistryTypes.ts`
- [x] **New components created**:
  - `frontend/src/components/TraceabilityMode/TraceToggleButton.tsx`
  - `frontend/src/components/TraceabilityMode/TraceIcon.tsx`
  - `frontend/src/components/TraceabilityMode/TraceOverlay.tsx`
  - `frontend/src/components/TraceabilityMode/TracePopup.tsx`
  - `frontend/src/components/TraceabilityMode/MetadataMaturityBadge.tsx`
  - `frontend/src/data/architectureRegistryTypes.ts`
  - `frontend/src/data/architectureRegistry.ts` (74 sections, 2,978 lines)
  - `frontend/src/stores/traceabilityStore.ts`
- [x] **S26 scenario**: "Explore Architecture Traceability" added to scenarioDefinitions.ts (Admin category, intermediate difficulty)
- [x] **Overview tour updated**: Added architecture traceability step to the overview tour in tourDefinitions.ts
- [x] **Operation scripts**: Added `architecture_trace` operation to all 16 views in operationScripts.ts
- [x] **7 new E2E tests**: TestArchitectureTraceability class in test_e2e_views.py
- [x] **Feature spec**: `docs/architecture-traceability.md`
- [x] Updated: progress.md, demo-guide.md, CLAUDE.md, feature-development-checklist.md, roadmap
- [x] Frontend build clean: 964 modules
- **Total**: 390 backend + 182 E2E = 572 tests passing, 964 frontend modules, 16 views, 26 scenarios, 74 traced sections

---

## What Was NOT Done (Deferred / Blocked)

| Item | Reason | When |
|---|---|---|
| ~~Synthetic data generation~~ | ~~Requires separate approval session~~ | DONE — guidelines approved |
| ~~Spoofing/layering research~~ | ~~Detailed mechanics deferred~~ | DONE — cancellation_pattern.json implemented |
| Swap leg mechanics | Complex instrument relationships deferred | During M1 Task 1.2 |
| FX reverse pair cascade logic | Implementation detail deferred | During M2 |
| Production deployment (Kafka/Flink/Doris) | Out of scope for demo | Future work |
| Multi-user auth | Out of scope for demo | Future work |
| Case management workflow | Out of scope for demo | Future work |

---

## Open Questions

1. ~~Data guidelines session~~ — RESOLVED (approved 2026-02-23)
2. ~~Specific financial instruments~~ — RESOLVED (50+ real products, US-centric, all asset classes)
3. ~~Number of accounts, traders, products~~ — RESOLVED (200+ accounts, 50 traders, 80+ instruments)
4. When to add the News Feed entity to the entity definitions? (Discovered during data guidelines — needed for market event type 3)
5. Order versioning model needs to be added to the entity definitions in the design doc
