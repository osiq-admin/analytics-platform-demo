# Phase 4: UX Polish & AI Integration — Implementation Plan

> **Goal:** Address the 5 remaining MEDIUM priority gaps from the design doc gap analysis: confirmation dialogs, configurable alert panels, AI integration in SQL Console & Model Composer, and dynamic model-type alert layouts.

**Architecture:** All 5 gaps are frontend-only changes (no new backend endpoints needed). The existing `ChatPanel` component is reused for AI integration. A new `ConfirmDialog` component is created once and wired into 2 views. Alert Detail gets panel toggles with localStorage persistence and model-type-aware layout emphasis.

**Tech Stack:** React 19 + TypeScript + Zustand (frontend). No new libraries needed — reuses existing ChatPanel, Panel, StatusBadge, DataGrid components.

**Reference:**
- Design doc: `docs/plans/2026-02-23-analytics-platform-demo-design.md` §8.1-8.3, §10.1
- Gap analysis: `docs/progress.md` §Gap Analysis (MEDIUM priority items)
- Phase 3 plan (complete): `docs/plans/2026-02-23-phase3-alert-detail-plan.md`

---

## Context

Phases 1-3 are complete (M0-M25, 193 tests passing). All HIGH priority gaps were resolved in Phase 3. Five MEDIUM priority gaps remain:

1. **Confirmation Dialogs** — Model deploy, mapping save fire immediately with no confirmation
2. **Configurable Widgets** — Alert Detail panels are hardcoded, no hide/show toggle
3. **AI in SQL Console** — AI Assistant is a separate view, not integrated into SQL Console
4. **AI in Model Composer** — Same AI isolation issue in Model Composer
5. **Dynamic Alert Structure** — All alerts show identical layout regardless of detection model type

## Milestones

| # | Milestone | Description | Dependencies |
|---|---|---|---|
| M26 | Save Plan & Update Progress | Persist plan, update progress tracker | M25 |
| M27 | ConfirmDialog Component | Reusable dialog + wire into Model Composer & Mapping Studio | M26 |
| M28 | Configurable Alert Panels | Panel toggle toolbar + localStorage persistence | M26 |
| M29 | AI Side Panel in SQL Console | Collapsible ChatPanel + query injection into Monaco | M26 |
| M30 | AI Side Panel in Model Composer | Collapsible ChatPanel in Model Composer | M26 |
| M31 | Dynamic Alert Structure | Model-type layout config with emphasis and hints | M28 |
| M32 | Build, Test & Verify | Frontend build, backend tests, Playwright E2E | M27-M31 |
| M33 | Documentation | Update progress.md and demo-guide.md | M32 |

## Files Summary

### Create (2 new files)
1. `frontend/src/components/ConfirmDialog.tsx`
2. `frontend/src/views/RiskCaseManager/AlertDetail/modelLayouts.ts`

### Modify (5 existing files)
1. `frontend/src/views/ModelComposer/index.tsx` — ConfirmDialog + AI panel
2. `frontend/src/views/MappingStudio/index.tsx` — ConfirmDialog
3. `frontend/src/views/SQLConsole/index.tsx` — AI side panel
4. `frontend/src/views/RiskCaseManager/AlertDetail/index.tsx` — Panel toggles + dynamic layout
5. `docs/progress.md` — Phase 4 milestones

### Update (docs)
6. `docs/demo-guide.md` — New feature documentation
