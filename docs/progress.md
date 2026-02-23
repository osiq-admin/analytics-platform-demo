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
| Implementation | NOT STARTED | |

---

## Milestone Progress

| # | Milestone | Status | Tasks | Done | Notes |
|---|---|---|---|---|---|
| M0 | Project Scaffolding | NOT STARTED | 3 | 0 | |
| M1 | Backend Foundation | NOT STARTED | 6 | 0 | |
| M2 | Calculation Engine | NOT STARTED | 5 | 0 | Depends: M1 |
| M3 | Settings Resolution | NOT STARTED | 2 | 0 | Depends: M1 |
| M4 | Detection & Alerts | NOT STARTED | 3 | 0 | Depends: M2, M3 |
| M5 | Frontend Foundation | NOT STARTED | 4 | 0 | Depends: M0 |
| M6 | Configuration Views | NOT STARTED | 4 | 0 | Depends: M1, M5 |
| M7 | Operations Views | NOT STARTED | 3 | 0 | Depends: M2, M5 |
| M8 | Compose Views | NOT STARTED | 2 | 0 | Depends: M4, M5 |
| M9 | Risk Case Manager | NOT STARTED | 5 | 0 | Depends: M4, M5 |
| M10 | AI Query Assistant | NOT STARTED | 2 | 0 | Depends: M7, M8 |
| M11 | Demo Controls | NOT STARTED | 2 | 0 | Depends: M4 |
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

---

## What Was NOT Done (Deferred / Blocked)

| Item | Reason | When |
|---|---|---|
| ~~Synthetic data generation~~ | ~~Requires separate approval session~~ | DONE — guidelines approved |
| Spoofing/layering research | Detailed mechanics deferred to implementation | During M2 Task 2.3 |
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
