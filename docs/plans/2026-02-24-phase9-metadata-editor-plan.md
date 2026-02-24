# Phase 9: Metadata Editor & Visual Configuration — Implementation Plan

> Implemented 2026-02-24. All milestones complete (M74-M78).

## Overview
Side-by-side JSON+visual metadata editor, toggleable dashboard widgets, dynamic chart type switching, and CRUD wiring into all existing views.

## Milestones
- **M74**: Persist Roadmap + Store Foundation — roadmap saved, TS types expanded, CRUD store actions, 14 API tests
- **M75**: MetadataEditor View — Monaco JSON editor (left) + visual form (right) with bidirectional sync
- **M76**: Visual Editors for All 4 Types — EntityEditor, CalculationEditor, SettingsEditor, DetectionModelEditor
- **M77**: Dashboard Widgets + Chart Switching — WidgetContainer, widgetStore, ChartTypeSwitcher, multi-renderer
- **M78**: Wire CRUD into Existing Views — edit/delete in EntityDesigner, MetadataExplorer, SettingsManager, ModelComposer

## New Files (15)
- `docs/plans/2026-02-24-comprehensive-roadmap.md`
- `frontend/src/views/MetadataEditor/index.tsx`, `JsonPanel.tsx`, `VisualPanel.tsx`
- `frontend/src/views/MetadataEditor/EntityEditor.tsx`, `CalculationEditor.tsx`, `SettingsEditor.tsx`, `DetectionModelEditor.tsx`
- `frontend/src/components/WidgetContainer.tsx`, `ChartTypeSwitcher.tsx`
- `frontend/src/stores/widgetStore.ts`
- `frontend/src/views/EntityDesigner/EntityForm.tsx`
- `frontend/src/views/MetadataExplorer/CalculationForm.tsx`
- `frontend/src/views/SettingsManager/SettingForm.tsx`
- `tests/test_metadata_crud_api.py`

## Modified Files (13)
- `frontend/src/stores/metadataStore.ts`
- `frontend/src/routes.tsx`, `frontend/src/layouts/Sidebar.tsx`
- `frontend/src/views/Dashboard/index.tsx`
- `frontend/src/views/EntityDesigner/index.tsx`, `EntityDetail.tsx`
- `frontend/src/views/MetadataExplorer/index.tsx`, `CalculationDetail.tsx`
- `frontend/src/views/SettingsManager/index.tsx`, `SettingDetail.tsx`
- `frontend/src/views/ModelComposer/index.tsx`, `ModelCreateForm.tsx`
- `docs/progress.md`

## Verification
- 266 backend tests passing (14 new CRUD tests)
- 911 frontend modules, clean build, 0 TS errors
