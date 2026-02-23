# Phase 5: Data Model, UX/UI, Visualization & Dashboard — Implementation Plan

> **Goal:** Normalize the data model (Product entity), add tooltips/guided tours/onboarding, enhance market data visualization and filtering, and create a summary dashboard.

**Architecture:** Four work streams — (1) data model normalization is full-stack (entities, CSVs, SQL, engine, tests, snapshots), (2) UX infrastructure is frontend-only (new components + Zustand store), (3) visualization enhancements touch backend API params + frontend charts, (4) dashboard is a new backend endpoint + frontend view. All streams converge at M47 for integration testing.

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript + Vite (frontend), @floating-ui/react (new — tooltips/tours), TradingView Lightweight Charts + Recharts (existing — enhanced), AG Grid (existing — filters), Zustand (state).

---

## Milestones Overview

| # | Milestone | Area | Deps |
|---|-----------|------|------|
| M34 | Plan & Progress | Docs | — |
| M35 | Product Entity & CSV | Data Model | M34 |
| M36 | Update Entity Defs & Loader | Data Model | M35 |
| M37 | Update Calculation SQL | Data Model | M36 |
| M38 | Update Detection Models & Engine | Data Model | M37 |
| M39 | Update Tests & Frontend | Data Model | M38 |
| M40 | Regenerate Data & Snapshots | Data Model | M39 |
| M41 | Tooltip Infrastructure | UX Infra | M34 |
| M42 | Tour System & Store | UX Infra | M41 |
| M43 | Chart Enhancements & Filtering | Visualization | M40 |
| M44 | View Tooltips & Tour Content | UX Content | M42 |
| M45 | Demo Workflow Guides | UX Content | M44 |
| M46 | Dashboard View | Dashboard | M40 |
| M47 | Build, Test & Verify | Verify | M40-M46 |
| M48 | Documentation | Docs | M47 |

**Critical Path:** M34→M35→M36→M37→M38→M39→M40→M47→M48
**Parallel after M34:** M41→M42→M44→M45 (UX track, frontend-only)
**Parallel after M40:** M43 (charts), M46 (dashboard)

---

## Files Summary

### Create (~14 new files)
1. `workspace/metadata/entities/product.json`
2. `frontend/src/components/Tooltip.tsx`
3. `frontend/src/components/HelpButton.tsx`
4. `frontend/src/components/TourOverlay.tsx`
5. `frontend/src/components/OnboardingModal.tsx`
6. `frontend/src/components/SummaryCard.tsx`
7. `frontend/src/stores/tourStore.ts`
8. `frontend/src/stores/dashboardStore.ts`
9. `frontend/src/data/tourDefinitions.ts`
10. `frontend/src/views/RiskCaseManager/AlertDetail/TimeRangeSelector.tsx`
11. `frontend/src/views/RiskCaseManager/AlertDetail/TradeVolumeChart.tsx`
12. `frontend/src/views/Dashboard/index.tsx`
13. `backend/api/dashboard.py`
14. `docs/plans/2026-02-23-phase5-data-ux-plan.md`

### Modify (~25+ existing files)
- `scripts/generate_data.py` — Product CSV, remove execution fields
- `workspace/metadata/entities/execution.json` — Remove 4 fields
- `workspace/metadata/calculations/transaction/value_calc.json` — JOIN product
- `workspace/metadata/calculations/transaction/adjusted_direction.json` — JOIN product
- `workspace/metadata/detection_models/*.json` — All 5 models
- `backend/api/data.py` — Date range params
- `backend/main.py` — Register dashboard router
- `frontend/src/components/Panel.tsx` — tooltip prop
- `frontend/src/components/DemoToolbar.tsx` — tooltips + Guide button
- `frontend/src/layouts/AppLayout.tsx` — TourOverlay, OnboardingModal, Tour button
- `frontend/src/layouts/Sidebar.tsx` — Dashboard nav entry
- `frontend/src/routes.tsx` — Dashboard route
- `frontend/src/views/RiskCaseManager/AlertDetail/MarketDataChart.tsx` — Enhancements
- `frontend/src/views/RiskCaseManager/AlertDetail/RelatedOrders.tsx` — Filters
- `frontend/src/views/RiskCaseManager/AlertDetail/index.tsx` — Volume panel
- `frontend/src/views/RiskCaseManager/AlertDetail/modelLayouts.ts` — Volume panel ID
- `tests/` — ~11 test files
- `docs/progress.md`, `docs/demo-guide.md`, `docs/schemas/entity-schemas.md`
