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

---

## Notes & Observations
- Dashboard gives a good high-level overview but the data imbalance immediately stands out
- The "Fired %" at 0% is also notable — none of the 430 alerts have been escalated yet
- Cross-project consistency is critical — a pattern fix in one view should be applied everywhere
