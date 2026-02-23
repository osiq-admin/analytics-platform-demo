# Alert Detail & Polish — Phase 3 Implementation Plan

> **Goal:** Transform the Alert Detail view from a basic 3-panel display into the full Bloomberg-style investigation workspace described in the design doc (§8.3), adding Calculation Trace DAG, Market Data Chart, Settings Resolution Trace, Related Orders table, and Footer Actions.

**Architecture:** Extend the existing AlertDetail view with 5 new sub-components. Backend already populates `settings_trace` and `calculation_trace` in AlertTrace — the frontend TypeScript interface just needs updating to consume them. Two new thin backend endpoints provide market data and related orders. All visualization libraries are already installed (React Flow, TradingView Lightweight Charts, AG Grid, Recharts).

**Tech Stack:** React 19 + TypeScript + Zustand (frontend), @xyflow/react + dagre (DAG), lightweight-charts (TradingView), ag-grid-react (orders table), FastAPI + DuckDB (backend). No new libraries needed.

**Reference:**
- Design doc: `docs/plans/2026-02-23-analytics-platform-demo-design.md` §8.3 (Alert Detail Layout)
- Gap analysis: `docs/progress.md` §Gap Analysis
- Phase 2 plan (complete): `docs/plans/2026-02-23-implementation-plan.md`

---

## Context

Phase 2 (M14-M17) made 3 views interactive but the Alert Detail view — the centerpiece of the demo's "Investigate" section — still shows only a basic score breakdown. The design doc (§8.3) specifies a rich 6-row investigation workspace with calculation traces, market data graphs, settings audit trails, and related orders. The backend already generates this data (settings_trace, calculation_trace fields on AlertTrace) but the frontend doesn't render it.

## Milestones Overview

| # | Milestone | Description | Dependencies |
|---|---|---|---|
| M18 | Save Plan & Update Progress | Persist plan to repo, update progress tracker | M17 |
| M19 | Foundation: TS Types + Backend Endpoints | Update AlertTrace TS, add market data + orders endpoints | M18 |
| M20 | Calculation Trace DAG | Interactive React Flow DAG with live score values | M19 |
| M21 | Market Data Chart | TradingView Lightweight Charts for price + volume | M19 |
| M22 | Settings Resolution Trace | Panel showing which thresholds applied and why | M19 |
| M23 | Related Orders Table | AG Grid table of orders/executions for the alert entity | M19 |
| M24 | Footer Actions & Layout | Action bar + 6-row grid layout matching design §8.3 | M20-M23 |
| M25 | Build, Test & Document | Frontend build, Playwright E2E, progress/demo docs | M24 |

**Critical Path:** M18 → M19 → M20/M21/M22/M23 (parallel) → M24 → M25

---

## Key Existing Code to Reuse

| Component | File | What it provides |
|-----------|------|------------------|
| `CalculationDAG.tsx` | `frontend/src/views/MetadataExplorer/CalculationDAG.tsx` | React Flow + dagre graph pattern (copy & adapt) |
| `PipelineDAG.tsx` | `frontend/src/views/PipelineMonitor/PipelineDAG.tsx` | React Flow with status colors pattern |
| `DataGrid` | `frontend/src/components/DataGrid.tsx` | AG Grid wrapper component |
| `Panel` | `frontend/src/components/Panel.tsx` | Widget panel with title bar |
| `StatusBadge` | `frontend/src/components/StatusBadge.tsx` | Colored badge component |
| `api.post/get` | `frontend/src/api/client.ts` | API client with typed generics |
| `useAlertStore` | `frontend/src/stores/alertStore.ts` | Zustand store with fetchAlert |
| `QueryService.execute()` | `backend/services/query_service.py` | Arbitrary SQL execution against DuckDB |
| `AlertTrace` (Python) | `backend/models/alerts.py` | Already has settings_trace, calculation_trace, related_data fields |
| `SettingsTraceEntry` | `backend/models/alerts.py` | setting_id, setting_name, matched_override, resolved_value, why |

---

## Milestone 19: Foundation — TS Types + Backend Endpoints

### Task 19.1: Update AlertTrace TypeScript Interface
- Add `calculation_trace`, `settings_trace`, `related_data` to AlertTrace
- Add `SettingsTraceEntry` interface
- Update `CalculationScore` with `computed_value`, `score_step_matched`

### Task 19.2: Backend — Market Data Endpoint
- `GET /api/data/market/{product_id}?days=60` → EOD + intraday data

### Task 19.3: Backend — Related Orders Endpoint
- `GET /api/data/orders?product_id=X&account_id=Y&limit=50` → orders + executions

## Milestone 20: Calculation Trace DAG
- React Flow + dagre DAG: model root → calc nodes with scores, pass/fail coloring

## Milestone 21: Market Data Chart
- TradingView Lightweight Charts: price line + volume histogram

## Milestone 22: Settings Resolution Trace
- Panel showing SettingsTraceEntry array with override/default badges

## Milestone 23: Related Orders Table
- AG Grid (DataGrid wrapper) showing executions for the alert entity

## Milestone 24: Footer Actions & Layout
- FooterActions: Raw Data toggle, Export JSON, Related Alerts button
- Rewire AlertDetail/index.tsx to 6-row layout per design §8.3

## Milestone 25: Build, Test & Document
- Frontend build, backend tests, Playwright E2E, docs update
