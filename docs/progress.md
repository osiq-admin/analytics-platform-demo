# Project Progress Tracker

**Project**: Analytics Platform Demo — Trade Surveillance Risk Case Manager
**Started**: 2026-02-23
**Last Updated**: 2026-02-24

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
| Implementation | IN PROGRESS | M0-M9+M11 complete — 114 tests, all views built |

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
| M10 | AI Query Assistant | NOT STARTED | 2 | 0 | Depends: M7, M8 |
| M11 | Demo Controls | COMPLETE | 2 | 2 | State machine + DemoToolbar |
| M12 | Synthetic Data | NOT STARTED | 3 | 0 | Depends: M4, M11 |
| M13 | Polish & Docs | NOT STARTED | 5 | 0 | Depends: All |

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
