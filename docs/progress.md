# Project Progress Tracker

**Project**: Analytics Platform Demo — Trade Surveillance Risk Case Manager
**Started**: 2026-02-23
**Last Updated**: 2026-02-23

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
| Data Model, UX, Viz & Dashboard (Phase 5) | IN PROGRESS | M34-M48: Product entity, tooltips/tours, chart enhancements, dashboard |

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
| M34 | Phase 5 Plan & Progress | IN PROGRESS | 1 | 0 | Save plan, update progress tracker |
| M35 | Product Entity & CSV | PENDING | 5 | 0 | Create product entity, generate product.csv, remove fields from execution |
| M36 | Update Entity Defs & Loader | PENDING | 3 | 0 | Update execution.json, Pydantic models, schema docs |
| M37 | Update Calculation SQL | PENDING | 4 | 0 | Update value_calc and adjusted_direction to JOIN product |
| M38 | Update Detection Models & Engine | PENDING | 3 | 0 | Update all 5 detection model queries to JOIN product |
| M39 | Update Tests & Frontend | PENDING | 4 | 0 | Update test fixtures for product table |
| M40 | Regenerate Data & Snapshots | PENDING | 4 | 0 | Regenerate CSVs and snapshots with new schema |
| M41 | Tooltip Infrastructure | PENDING | 5 | 0 | @floating-ui/react, Tooltip, HelpButton components |
| M42 | Tour System & Store | PENDING | 5 | 0 | tourStore, TourOverlay, OnboardingModal |
| M43 | Chart Enhancements & Filtering | PENDING | 6 | 0 | Time range, intraday toggle, AG Grid filters |
| M44 | View Tooltips & Tour Content | PENDING | 5 | 0 | Tour definitions, tooltips on all views |
| M45 | Demo Workflow Guides | PENDING | 4 | 0 | Act 1/2/3 guided workflows |
| M46 | Dashboard View | PENDING | 6 | 0 | Backend endpoint, store, view, charts |
| M47 | Build, Test & Verify | PENDING | 4 | 0 | Frontend build, all tests, Playwright E2E |
| M48 | Documentation | PENDING | 3 | 0 | Update progress and demo guide |

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
