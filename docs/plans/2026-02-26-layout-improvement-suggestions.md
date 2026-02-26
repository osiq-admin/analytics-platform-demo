# Layout Improvement Suggestions — Vertical Resizable Panes

## Context
F-021 redesigned Entity Designer from horizontal 3-pane to vertical 2-tab resizable layout.
This pattern (full-width list top + detail/graph bottom, with drag-to-resize) improves views that
have narrow fixed-width panels (`w-80`, `w-72`, `w-64`) causing AG Grid horizontal scroll or wasted space.

## Reference Implementation
`frontend/src/views/EntityDesigner/index.tsx` — uses `react-resizable-panels` (already installed).

## High Priority

### MetadataExplorer (`/metadata`)
- **Current**: Horizontal 3-pane — Calc list (`w-[440px]`) + DAG (`flex`) + Detail (`w-80`)
- **Problem**: Same pattern EntityDesigner had — narrow right panel squeezes detail view
- **Suggestion**: Vertical 2-tab layout:
  - Tab 1 "Calculations": Full-width calc list (top) + detail/form (bottom)
  - Tab 2 "Calculation DAG": Full-width calc list (top) + DAG visualization (bottom)
- **Files**: `frontend/src/views/MetadataExplorer/index.tsx`

### ModelComposer (`/models`)
- **Current**: Horizontal multi-pane — Models list (`w-72`) + Detail (`flex`) + Wizard tabs (`w-64`) + AI panel (`w-72` collapsible)
- **Problem**: Right wizard panel (w-64) is cramped for 3 tabs; center detail competes for width
- **Suggestion**: Vertical 2-tab layout:
  - Tab 1 "Model Details": Model list (top) + Detail (bottom, full width)
  - Tab 2 "Wizard": Model list (top) + Wizard form (bottom) with inner tabs
  - Keep AI panel collapsible overlay
- **Files**: `frontend/src/views/ModelComposer/index.tsx`

## Medium Priority

### UseCaseStudio (`/use-cases`)
- **Current**: Horizontal — List (`w-72`) + Detail (`flex`) with nested 2-column inner layout
- **Problem**: Detail has nested columns (Sample Data + Results) fighting for space
- **Suggestion**: Vertical layout — list (top) + detail (bottom) with inner tabs for components/results
- **Files**: `frontend/src/views/UseCaseStudio/index.tsx`

### SettingsManager (`/settings`)
- **Current**: Horizontal — List (`w-[480px]` fixed) + Detail+Overrides (`flex`)
- **Problem**: List is large but rigid; complex right side (detail + overrides stacked)
- **Suggestion**: Vertical resizable — list (top) + detail+overrides (bottom)
- **Files**: `frontend/src/views/SettingsManager/index.tsx`

### MetadataEditor (`/editor`)
- **Current**: Horizontal 2-pane — JSON Editor (`flex`) + Visual Editor (`flex`)
- **Problem**: Equal-width split is rigid; users often want one panel larger
- **Suggestion**: Add resizable horizontal separator between JSON and Visual panels (no tabs needed)
- **Files**: `frontend/src/views/MetadataEditor/index.tsx`

### SchemaExplorer (`/schema`)
- **Current**: Horizontal — Tables list (`w-72`) + Columns (`flex`)
- **Problem**: Columns grid benefits from full width
- **Suggestion**: Vertical resizable — tables list (top) + columns grid (bottom)
- **Files**: `frontend/src/views/SchemaExplorer/index.tsx`

### RegulatoryMap (`/regulatory`)
- **Current**: Summary cards + Horizontal — Graph (`flex-3`) + Detail (`w-72`)
- **Problem**: Detail panel (w-72) narrow for node information
- **Suggestion**: Make graph + detail section resizable with horizontal separator
- **Files**: `frontend/src/views/RegulatoryMap/index.tsx`

### MappingStudio (`/mappings`)
- **Current**: Horizontal 3-pane — Calc (`w-64`) + Source (`w-56`) + Canonical (`flex`)
- **Problem**: Three narrow panes; drag-and-drop benefits from more space
- **Suggestion**: Consider vertical or 2-row layout for better drag surface
- **Files**: `frontend/src/views/MappingStudio/index.tsx`

## Low Priority (No Change Needed)

| View | Reason |
|------|--------|
| Dashboard | Widget grid works well; horizontal layout intentional |
| PipelineMonitor | Already vertical (DAG + Steps table); clean structure |
| RiskCaseManager | Single-view pattern (grid OR detail); good UX |
| SQLConsole | Already vertical with collapsible AI panel |
| AIAssistant | Chat + collapsible Query Preview; intentional design |
| Submissions | Vertical flow with conditional detail; good for review |
| DataManager | Simple 2-pane; acceptable as-is |
