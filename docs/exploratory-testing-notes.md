# Exploratory Testing Session — 2026-02-25

## Session Info
- **Date**: 2026-02-25
- **Tester**: Moshe Ashkenazi (manual) + Claude (support)
- **App**: Risk Case Manager / Analytics Platform Demo
- **URL**: http://localhost:8000

---

## Findings

### F-001: Alert Distribution Heavily Skewed Toward Market Price Ramping
- **Screen**: Dashboard
- **Observation**: market_price_ramping produces 414 of 430 alerts (96%). Other 4 models (insider_dealing, wash_full_day, wash_intraday, spoofing_layering) produce only ~16 combined. This is unrealistic for a demo — users expect a more balanced distribution across models.
- **Root Cause**: TBD — need to explore data generation logic, model thresholds, and score calibration.
- **Action Items**:
  1. Explore what drives the imbalance (data generation? thresholds? score logic?)
  2. Recalibrate to produce a more even/realistic alert distribution across all 5 models
- **Status**: OPEN

### F-002: Feature Need — Threshold & Score Tuning Analysis
- **Screen**: Dashboard (applies platform-wide)
- **Observation**: The current alert imbalance is exactly the kind of scenario where threshold/score tuning analysis is needed. Users need to understand: why does one model fire too many alerts while others fire too few? What settings cause this? How to recalibrate?
- **Feature Requirements**:
  - Analyze what causes alert volume imbalance across models
  - Show relationship between thresholds, scores, and alert volumes
  - Support "what-if" recalibration — adjust thresholds and preview impact
  - Help users find the sweet spot: reduce noise on over-firing models, increase sensitivity on under-firing models
- **Business Use Case**: This is a core surveillance workflow — tuning models to produce actionable alerts, not just noise. Compliance teams do this regularly.
- **Status**: NOTED — future feature

---

### F-003: Chart Re-render Causes Sibling Chart Annotations to Disappear
- **Screen**: Dashboard
- **Observation**: When changing the "Alerts by Model" chart type (e.g., H-Bar to another), the "Alerts by Asset Class" pie chart annotations (labels like "equity (363)", "commodity (67)") disappear until the Alerts by Model chart finishes rendering in its new form, then they reappear.
- **Root Cause**: Three layers of issues:
  1. **Zustand store over-subscription**: Dashboard subscribed to entire `useWidgetStore()`, so changing any chart type re-rendered all widgets
  2. **No render isolation**: All widgets shared one parent component, so sibling charts re-rendered when unrelated chart types changed
  3. **Browser repaint propagation**: Even with React isolation, the browser propagated layout/paint changes across sibling SVG elements in the same CSS grid
- **Fix Applied** (branch `fix/dashboard/chart-rerender-flicker`):
  1. Extracted each widget into its own component (`ModelWidget`, `ScoreWidget`, `TriggerWidget`, `AssetWidget`) with individual Zustand selectors — each subscribes only to its own store slice
  2. Added `isAnimationActive={false}` to all Recharts Pie/Bar/Line components — prevents re-animation on resize events
  3. Fixed widget content height to 240px — prevents grid reflow when switching chart types
  4. Added `contain: layout paint` CSS on `WidgetContainer` — tells browser to isolate rendering per widget, preventing cross-widget repaint flicker
  5. Replaced index-based `Cell` keys with stable data-based keys (e.g., `key={d.model_id}`)
- **Status**: FIXED

### F-004: Tooltip Text Not Visible on Dark Theme + "cnt" Label Instead of "Count"
- **Screen**: Dashboard
- **Observation**:
  1. **Alerts by Model** (H-Bar): tooltip count text is black on dark/gray background — not readable
  2. **Alerts by Asset Class** (Pie): same issue — tooltip text not visible
  3. **Alerts by Trigger Path** (H-Bar): tooltip text IS visible — inconsistent
  4. All tooltips show raw field name "cnt" instead of human-readable "Count"
- **Expected**: All tooltips should have consistent, readable text color on dark theme, and display "Count" not "cnt"
- **Root Cause**: `TOOLTIP_STYLE` only set background/border, not text color — Recharts defaults to black text, invisible on dark theme. Raw field names (`cnt`, `model_id`) were passed through to both tooltips and table headers without human-readable labels.
- **Fix Applied**:
  1. Added `color: var(--color-foreground)` to tooltip contentStyle
  2. Added `labelStyle` and `itemStyle` with theme-aware colors to all `<Tooltip>` components
  3. Added `name="Count"` to all `<Bar>` and `<Line>` components — tooltips now show "Count" not "cnt"
  4. Added `labelHeader`/`valueHeader` props to `DataTable` component
  5. All table views now show human-readable headers: Model, Score Range, Trigger Path, Asset Class, Count
- **Status**: FIXED

### F-005: Table Values Not User-Friendly + No Totals Row
- **Screen**: Dashboard (all table views)
- **Observation**:
  1. Raw snake_case values displayed as-is: "all_passed", "score_based", "market_price_ramping", "wash_full_day", etc. — not user-friendly for a demo
  2. No totals row at the bottom of tables — users expect to see the sum
- **Fix Applied**:
  1. Added `formatLabel()` utility — converts snake_case to Title Case (e.g., "all_passed" → "All Passed", "market_price_ramping" → "Market Price Ramping")
  2. Added totals row (`<tfoot>`) to `DataTable` — sums the value column, displays bold "Total" row
- **Status**: FIXED

### F-006: Cross-Project UX Consistency — Tooltip Styling, Labels, and Totals
- **Screen**: Multiple views (Dashboard, Risk Cases, Model Composer)
- **Observation**: After fixing F-004 and F-005 on the Dashboard, a project-wide scan revealed the same patterns in 4 other files:
  1. **TradeVolumeChart** (`AlertDetail/TradeVolumeChart.tsx`): Missing `itemStyle` on tooltip, Bar missing `name` prop — tooltip showed raw "volume" instead of "Volume"
  2. **PreviewPanel** (`components/PreviewPanel.tsx`): Two Tooltip instances missing `labelStyle`/`itemStyle`, Bar missing `name` prop — tooltip showed raw "maxScore" instead of "Max Score"
  3. **AlertSummary** (`RiskCaseManager/AlertSummary.tsx`): Trigger path badge displayed raw snake_case (e.g., "all_passed" instead of "All Passed")
  4. **ScoreBreakdown** (`AlertDetail/ScoreBreakdown.tsx`): Calculation names showed raw snake_case in both chart and table, index-based Cell keys, no totals row, Bar missing `name` prop
  5. **Dashboard chart axes**: All XAxis/YAxis ticks and Pie labels showed raw snake_case in chart mode (model_id, trigger_path, asset_class) — only tables were formatted
- **Fix Applied**:
  1. Added `itemStyle` and `name="Volume"` to TradeVolumeChart tooltip/Bar
  2. Added `labelStyle`/`itemStyle` to both PreviewPanel tooltips, `name="Max Score"` to Bar
  3. Added `formatLabel()` to AlertSummary trigger_path badge
  4. Added `formatLabel()` to ScoreBreakdown chart data and table rows, added totals `<tfoot>`, fixed Cell keys to data-based, added `name="Score"` to Bar
  5. Added `tickFormatter` with `formatLabel()` to all Dashboard chart XAxis/YAxis rendering snake_case fields, added `formatLabel()` to all Pie label functions, added `formatter` to all Legend components
- **Status**: FIXED

### F-007: Charts and Tables Should Show Percentages, Not Just Absolute Numbers
- **Screen**: Dashboard (all 4 chart widgets)
- **Observation**: All charts and tables only show absolute counts. Users expect to see percentages alongside counts — e.g., "Market Price Ramping: 414 (96.3%)" — to quickly understand relative distribution without mental math.
- **Requirements**:
  - Pie chart labels: show "Label (count, pct%)"
  - Bar chart tooltips: show count and percentage
  - Table views: add a "%" column
  - H-Bar chart bar labels: include percentage
- **Status**: FIXED

### F-008: "Fired %" Card Is Confusing and Always Shows 0%
- **Screen**: Dashboard (summary cards)
- **Observation**: The "Fired %" card shows 0% with "0 of 430 alerts". Users don't understand what "Fired" means or why it's 0. Root cause: the code looks for `trigger_path === "fired"` but that value doesn't exist in the data — trigger paths are "all_passed" and "score_based". All stored alerts have `alert_fired === true` by design (the engine only saves fired alerts), so this metric is meaningless.
- **Fix**: Replace with "Score Triggered %" — shows percentage of alerts triggered by score threshold breach vs. all calculations passing. This is meaningful surveillance information (tells you whether alerts come from threshold breaches or full rule compliance).
- **Status**: FIXED

### F-009: Demo Toolbar Buttons Lack Context — Act 1/2, Tour, Scenarios, Theme Toggle
- **Screen**: Top toolbar (all views)
- **Observation**:
  1. "Act 1" and "Act 2" buttons have no tooltips — unclear what they do or represent
  2. "Tour", "Scenarios", "Light"/"Dark" buttons are bare text with no descriptions
  3. The toolbar layout doesn't clearly separate demo controls from utility controls
  4. No visual grouping between "demo progression" (Reset/Step/End/Act) vs. "help & settings" (Tour/Scenarios/Theme)
- **Requirements**:
  - Add descriptive tooltips to Act 1, Act 2, Reset, Step, End, Guide
  - Add tooltips to Tour, Scenarios, Theme toggle
  - Better visual grouping: separate demo controls from utility controls with a divider
  - Consider adding brief descriptions or icons to clarify purpose
- **Status**: FIXED

### F-010: Only Equity and Commodity Alerts — No FX, Fixed Income, or Index
- **Screen**: Dashboard (Alerts by Asset Class)
- **Observation**: 363 equity alerts (84.4%) + 67 commodity (15.6%) = 100%. Zero alerts for FX, fixed_income, or index — despite the platform having 6 FX pairs, 1 fixed income product (ZB_FUT), and 2 index futures (ES_FUT, NQ_FUT).
- **Root Cause Analysis**: The detection engine is asset-class agnostic — it would generate alerts for ANY product with sufficient trading activity. The gap is entirely in `scripts/generate_data.py`:

  | Component | Equity | Commodity | FX | Index | Fixed Income |
  |-----------|--------|-----------|----|----|---|
  | Products | 31 | 10 | 6 | 2 | 1 |
  | EOD market data | Yes | Yes | Yes | Yes | Yes |
  | Intraday data | Yes | Only futures | Yes | Yes | No |
  | Normal daily executions | ~8/day | Patterns only | None | ~1/day | None |
  | Embedded detection patterns | 12 | 1 | 0 | 0 | 0 |
  | **Alerts generated** | **363** | **67** | **0** | **0** | **0** |

  - FX products have no regular executions in the normal trading loop (only exist in spoofing pattern data which doesn't trigger enough)
  - Fixed income (ZB_FUT) has zero executions — not in normal trading loop or any pattern
  - Index futures (ES_FUT, NQ_FUT) have ~1/day normal execution — too few to trigger detection thresholds
  - All 13 embedded detection patterns use equity or commodity products exclusively

- **Fix Required** (in `scripts/generate_data.py`):
  1. Add FX pairs to the normal daily trading loop (2-4 FX trades/day)
  2. Add ZB_FUT to normal daily trading (0-1 trades/day)
  3. Increase index futures daily volume (2-3 trades/day)
  4. Add embedded detection patterns for FX (e.g., FX wash trading on EURUSD)
  5. Add embedded detection patterns for fixed income (e.g., ramping on ZB_FUT)
  6. Add embedded detection patterns for index futures (e.g., spoofing on ES_FUT)
  7. Regenerate CSVs, run pipeline, regenerate alerts
- **Related**: F-001 (alert distribution imbalance) — both are data generation calibration issues
- **Status**: OPEN — future fix (data regeneration required)

### F-012: Entity Designer Layout — Wasted Space, Cramped Graph, No Row Selection
- **Screen**: Entity Designer
- **Observation**:
  1. Selected entity not highlighted in the entities list (AG Grid has no `rowSelection`)
  2. Center pane stacks header + Fields panel + Relationships panel vertically — the relationships panel wastes space for entities with few relationships, and the fields grid gets squeezed
  3. Right relationship graph panel (320px) is too small — nodes positioned in manual 3-column grid, no minimap, no zoom controls, no selection highlighting
  4. No ability to collapse/expand panels to reclaim space
- **Root Cause**: Fixed 3-pane layout with hardcoded widths, no AG Grid row selection, manual graph positioning instead of dagre auto-layout
- **Fix Plan**: Tabs in center pane (Fields/Relationships), collapsible Panel component, dagre + MiniMap + Controls for graph, AG Grid rowSelection, bidirectional entity selection between list and graph
- **Status**: FIXED

### F-011: Process Gap — Feature Changes Must Update All Dependent Systems
- **Screen**: N/A (process issue)
- **Observation**: When F-008 renamed "Fired %" to "Score Triggered", the tour definitions, operation scripts, and demo guide were NOT updated in the same commit. This created stale references that a user following the tour would see. The feature development checklist (`docs/feature-development-checklist.md`) already lists these systems, but the checklist was not followed during the fix.
- **Root Cause**: Quick fixes/renames are treated as "small changes" that don't trigger the full checklist review. But even a label rename affects: tours, scenarios, operation scripts, demo guide, data dictionary, and any documentation referencing the old label.
- **Process Improvement Required**:
  1. Any UI-visible change (label, metric, card, column rename) MUST trigger a grep for the old text across ALL of: `frontend/src/data/tourDefinitions.ts`, `frontend/src/data/scenarioDefinitions.ts`, `frontend/src/data/operationScripts.ts`, `docs/demo-guide.md`, `docs/schemas/`, `CLAUDE.md`
  2. Add this as a mandatory step in `docs/development-guidelines.md`
  3. Consider adding a pre-commit check or CI lint that detects stale references
- **Status**: FIXED (stale references updated) + PROCESS NOTE

---

### F-013: Raw snake_case Labels in Risk Cases, Alert Detail, Explainability, and Calc Trace
- **Screen**: Risk Case Manager (Alert Summary grid, Alert Detail header/body, Calculation Trace DAG, Explainability panel)
- **Observation**: Even though `formatLabel()` was applied to the Dashboard in F-005/F-006, several other views still display raw snake_case identifiers: model_id in alert grid, header badges, business description, DAG nodes, and explainability panel; calc_id in DAG nodes, explainability traces, and scoring breakdown table.
- **Fix Applied**: Added `formatLabel()` calls to all snake_case displays in AlertSummary grid (model_id column), AlertDetail header badges (model_id, trigger_path), BusinessDescription (model_id), CalculationTrace DAG nodes (model_id, calc_id), and ExplainabilityPanel (model_id badge, calc_id in traces and scoring table).
- **Status**: FIXED

### F-014: Model Composer Description Overlaps Action Buttons
- **Screen**: Model Composer (detail view)
- **Observation**: When a detection model has a long description, the description text overlaps the Edit/Delete/Deploy buttons in the model detail header.
- **Root Cause**: Flex container used `items-center` without constraining the description width or preventing button group from shrinking.
- **Fix Applied**: Changed to `items-start justify-between gap-4`, added `flex-1 min-w-0` to description container, `line-clamp-2` to description text, and `shrink-0` to button group.
- **Status**: FIXED

### F-015: Microsecond Timestamps Displayed Raw in Risk Cases
- **Screen**: Risk Case Manager (Alert Summary grid, Business Description)
- **Observation**: Timestamps like "2026-02-25T10:35:49.123456" displayed with full microsecond precision and ISO T separator — not user-friendly for a demo.
- **Fix Applied**: Added `formatTimestamp()` utility to format.ts (replaces T with space, strips microseconds). Applied to AlertSummary grid timestamp column and BusinessDescription time field.
- **Status**: FIXED

---

## Round 3 — Untested Views (2026-02-26)

**Scope**: 6 previously untested views — Pipeline Monitor, Metadata Editor, AI Assistant, Use Case Studio, Regulatory Map, Submissions.

### F-016: Pipeline Monitor — Steps Table Clipped at Bottom
- **Screen**: Pipeline Monitor (`/pipeline`)
- **Observation**: After running the pipeline, the Steps table shows only 5 of 10 rows. The remaining rows (Trend Window, Trading Activity Aggregation, VWAP Calculation, Large Trading Activity, Wash Detection) are clipped below the viewport with no scrollbar. The Execution Graph panel consumes excessive vertical space (large empty area above/below nodes), pushing the table off-screen.
- **Root Cause**: The graph panel has a fixed/flex height that doesn't account for the table below. The main content area doesn't scroll, and the table has no independent scroll container.
- **Fix Applied**: Changed DAG panel from `flex-1 min-h-[300px]` to `h-[350px] shrink-0` (fixed height), changed steps table panel from `max-h-48` to `flex-1 overflow-y-auto` (scrollable, takes remaining space).
- **Status**: FIXED

### F-017: Pipeline Monitor — Layer Column Shows snake_case
- **Screen**: Pipeline Monitor (`/pipeline`, Steps table)
- **Observation**: The "Layer" column displays raw snake_case values: "time_window" instead of "Time Window". Other values ("transaction", "aggregation", "derived") are single words and look fine, but "time_window" is clearly unformatted.
- **Root Cause**: Layer value from calculation metadata passed through without `formatLabel()`.
- **Fix Applied**: Added `formatLabel()` import and applied to the layer cell in PipelineMonitor.
- **Status**: FIXED

### F-018: AI Assistant — Markdown Not Fully Rendered in Chat Responses
- **Screen**: AI Assistant (`/assistant`)
- **Observation**: In mock mode chat responses, bold markdown syntax (`**Source Data:**`, `**Calculation Results**`, `**Alerts:**`) shows raw `**` markers instead of rendering as bold text. SQL code blocks render correctly in their own styled container, but inline markdown formatting (bold, backtick code) within the response body is displayed as raw text.
- **Root Cause**: Chat message body is rendered as plain text rather than being parsed through a markdown renderer.
- **Fix Applied**: Added `renderMarkdownText()` function to ChatPanel that parses `**bold**` → `<strong>`, `` `code` `` → `<code>`, and `- list items` → `<ul><li>`. Applied to both `before` and `after` text blocks in message bubbles.
- **Status**: FIXED

### F-019: Use Case Studio — Component IDs Show Raw snake_case
- **Screen**: Use Case Studio (`/use-cases`, detail view)
- **Observation**: In the Components section of a use case detail, component IDs are displayed as raw snake_case: "wash_full_day" and "wash_detection" instead of "Wash Full Day" and "Wash Detection". The component picker (edit wizard step 2) correctly shows formatted names, but the detail view does not.
- **Root Cause**: Detail view renders the raw `model_id`/`calc_id` from the use case JSON without applying `formatLabel()`.
- **Fix Applied**: Added `formatLabel()` import and applied to component ID display in UseCaseStudio detail view.
- **Status**: FIXED

### F-020: Use Case Studio — Run Results Display Raw JSON
- **Screen**: Use Case Studio (`/use-cases`, after clicking Run)
- **Observation**: When a use case is run, the Run Results section displays the raw API response as unformatted JSON. Shows technical fields like `"model_id": "wash_full_day"`, `"use_case_id": "test_uc_1"`, `"alerts_evaluated": 4`, `"alerts_fired": 4`. For a demo, this should be a formatted summary table (Model Name, Alerts Evaluated, Alerts Fired, Status).
- **Root Cause**: Run result JSON is rendered as-is in a `<pre>` block without formatting or structured presentation.
- **Fix Applied**: Replaced raw JSON `<pre>` with structured `<table>` showing Model (formatted), Evaluated, Fired, and Status columns with StatusBadge. Falls back to JSON for non-array results.
- **Status**: FIXED

---

### Views with No Issues Found

- **Metadata Editor** (`/editor`): Excellent design. All 4 tabs (Entities, Calculations, Settings, Models) work correctly. Side-by-side JSON + Visual editors. Monaco JSON editor, OOB versioning with badges, match pattern picker with catalog. Both dark and light themes clean.
- **Regulatory Map** (`/regulatory`): Clean layout. Summary cards (9/9 covered, 100%), traceability graph with color-coded nodes (Regulation → Article → Model → Calculation), detail panel populates on node click, legend, "Suggestions — All clear" section. Both themes work well.
- **Submissions** (`/submissions`): Clean empty state. "No submissions yet. Submit a use case from the Use Case Studio." Both themes work. Limited testing since no submission data available (use case Run doesn't create a submission — separate governance workflow).

---

## Notes & Observations
- Dashboard gives a good high-level overview but the data imbalance immediately stands out
- The original "Fired %" card was misleading (always 0%) — replaced with "Score Triggered" (12.6%) in F-008
- Cross-project consistency is critical — a pattern fix in one view should be applied everywhere
- F-013 confirms cross-project consistency gap: formatLabel() was applied to Dashboard/charts but not to Risk Cases, Alert Detail, or Model Composer
- Light theme works well across all tested views — no visibility issues found
- Entity Designer F-012 fixes (tabs, collapsible graph, dagre, selection) verified working in both themes
- Round 3: Metadata Editor and Regulatory Map are the strongest views — polished, well-designed, no issues
- Round 3: Pipeline Monitor has the most impactful issue (F-016) — users can't see half the pipeline steps
- Round 3: The `formatLabel()` pattern continues to be missed in new views (F-017, F-019) — same pattern as F-005/F-006/F-013
- Round 3: AI Assistant markdown rendering (F-018) affects demo readability — the mock responses contain carefully written markdown that doesn't display correctly

---

## Round 4 — User-Driven Exploratory Testing (2026-02-26)

**Scope**: Live feedback from product owner during UI exploration.

### F-021: Entity Designer — Vertical Layout + Tab-Based Pane Redesign
- **Screen**: Entity Designer (`/entities`)
- **Observation**: The 3-pane horizontal layout (entity list left w-80, detail center, graph right w-80) required horizontal scrolling in the entity list AG Grid. Bottom of entity list was empty. Left-to-right orientation wasted vertical space.
- **Root Cause**: Fixed-width left pane (w-80) constrained AG Grid columns. No drag-to-resize capability. Three-pane horizontal layout inefficient for the content.
- **Fix Applied**: Replaced with vertical 2-tab layout using `react-resizable-panels`:
  - Tab 1 "Entity Details": Full-width entity list (top, resizable) + entity detail (bottom)
  - Tab 2 "Relationship Graph": Full-width entity list (top, resizable) + React Flow graph (bottom)
  - Removed collapsible graph panel, expand/shrink button, `graphCollapsed`/`graphExpanded` state
  - Added `useDefaultLayout` for pane size persistence, `useLocalStorage` for tab persistence
- **Status**: FIXED

---

## Round 5 — User-Driven Exploratory Testing (2026-02-26)

**Scope**: Continued live feedback from product owner — Entity Designer fields, relationship graphs, Regulatory Map.

### F-022: Entity Designer — Domain Values Not Visible or Manageable
- **Screen**: Entity Designer (`/entities`) → Fields tab
- **Observation**: Entity fields have `domain_values` in metadata JSON (e.g., risk_rating: ["LOW","MEDIUM","HIGH"]) but there is no way to view or manage them in the UI. Domain values should be metadata-managed like everything else. Clicking a field should show its domain values with CRUD actions.
- **Root Cause**: Fields AG Grid has no "Domain" column. No click handler on field rows. No side pane for domain value management. `useDomainValues` hook and API exist but are only used for autocomplete suggestions in other views.
- **Status**: OPEN

### F-023: Entity Designer — Relationship Graph Readability Issues
- **Screen**: Entity Designer (`/entities`) → Relationship Graph tab
- **Observation**: (a) Relationship labels have no background — text floats over edges and is hard to read. (b) Bezier edge routing creates messy line crossings. Organization is hard to follow. Lines overlap and crowd the graph.
- **Root Cause**: Edge labels use plain `labelStyle.fill` with no `labelBgStyle`, `labelBgPadding`, or `labelBgBorderRadius`. Default bezier edge type creates curved crossings. Dagre spacing too tight (`nodesep: 40`, `ranksep: 60`). No arrowheads to indicate direction.
- **Status**: OPEN

### F-024: Regulatory Map — Thin, Uninformative, Poor Readability
- **Screen**: Regulatory Map (`/regulatory`)
- **Observation**: View is cutoff, centered on screen with narrow 288px detail panel. No references to actual regulation text (descriptions exist in registry.json but aren't displayed). No tooltips on nodes or edges. No edge labels showing relationship types. No minimap or zoom controls. Different layout pattern from other redesigned views. Overall thin and uninformative.
- **Root Cause**: Layout uses fixed `w-72` detail panel beside `flex-[3]` graph — wastes space. Backend traceability graph endpoint doesn't return `description` fields for article/model/calc nodes (data exists in registry.json and model JSON). No `MiniMap`, `Controls`, edge labels, or tooltips in React Flow config. Node details panel only shows sparse metadata (type, label, title, jurisdiction).
- **Status**: OPEN
