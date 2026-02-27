# Frontend Development Guidelines

Mandatory reference for all frontend development. These patterns were established during exploratory testing (F-003 through F-006) and must be followed for consistency across all views.

---

## 1. Recharts — Tooltip Styling

Every `<Tooltip>` component **must** include theme-aware text colors. Recharts defaults to black text, which is invisible on dark themes.

```tsx
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from "../../constants/chartStyles";

<Tooltip
  contentStyle={TOOLTIP_STYLE}
  labelStyle={TOOLTIP_LABEL_STYLE}
  itemStyle={TOOLTIP_ITEM_STYLE}
/>
```

**Never** define tooltip styles inline — always import from `constants/chartStyles.ts`.

---

## 2. Recharts — Series Name Props

Every `<Bar>`, `<Line>`, and `<Pie>` **must** have a human-readable `name` prop. Without it, tooltips display the raw `dataKey` (e.g., "cnt" instead of "Count").

```tsx
// BAD — tooltip shows "cnt"
<Bar dataKey="cnt" />

// GOOD — tooltip shows "Count"
<Bar dataKey="cnt" name="Count" />
```

---

## 3. Recharts — Axis Label Formatting

Any axis rendering snake_case data (model_id, trigger_path, asset_class, calc_id, etc.) **must** use `tickFormatter` with `formatLabel()`.

```tsx
import { formatLabel } from "../../utils/format";

<XAxis dataKey="model_id" tickFormatter={(v: string) => formatLabel(v)} />
<YAxis dataKey="trigger_path" tickFormatter={(v: string) => formatLabel(v)} />
```

Pie chart labels and Legend components need the same treatment:

```tsx
<Pie label={(p) => `${formatLabel(String(p.name ?? ""))} (${p.value ?? 0})`} />
<Legend formatter={(v: string) => formatLabel(v)} />
```

---

## 4. Recharts — Animation Control

Set `isAnimationActive={false}` on **all** chart series (Bar, Line, Pie) to prevent:
- Re-animation on parent re-render
- Label/annotation flicker during resize
- SVG repaint cascading to sibling charts

```tsx
<Bar dataKey="cnt" isAnimationActive={false} />
<Line dataKey="cnt" isAnimationActive={false} />
<Pie data={data} isAnimationActive={false} />
```

---

## 5. Recharts — Cell Keys

Always use **data-based keys**, never index-based. Index keys cause unnecessary React re-renders and can break animation state.

```tsx
// BAD
{data.map((d, i) => <Cell key={i} fill={COLORS[i]} />)}

// GOOD
{data.map((d, i) => <Cell key={d.model_id} fill={COLORS[i]} />)}
```

---

## 6. Recharts — Axis Tick Styling

Use the shared `TICK_STYLE` constant for consistent axis tick appearance:

```tsx
import { TICK_STYLE } from "../../constants/chartStyles";

<XAxis tick={TICK_STYLE} />
<YAxis tick={TICK_STYLE} />
```

---

## 7. Label Formatting — formatLabel()

All snake_case values displayed to the user **must** be formatted to Title Case. Import from the shared utility — never redefine locally.

```tsx
import { formatLabel } from "../../utils/format";

// "market_price_ramping" → "Market Price Ramping"
// "all_passed" → "All Passed"
// "wash_full_day" → "Wash Full Day"
```

Apply in: chart axes, pie labels, legend formatters, table cells, badge labels, tooltip labels.

---

## 8. Tables — Headers and Totals

Every data table **must** have:
1. **Human-readable column headers** (not raw field names)
2. **A totals row** (`<tfoot>`) for numeric columns

```tsx
<thead>
  <tr>
    <th>Model</th>           {/* not "model_id" */}
    <th>Count</th>           {/* not "cnt" */}
  </tr>
</thead>
<tbody>...</tbody>
<tfoot>
  <tr>
    <td>Total</td>
    <td>{total}</td>
  </tr>
</tfoot>
```

---

## 9. CSS Containment for Chart Containers

Any container holding multiple independent charts (e.g., dashboard grids) **must** use CSS containment to prevent cross-widget repaint propagation:

```tsx
<div style={{ contain: "layout paint" }}>
  {children}
</div>
```

This tells the browser to isolate rendering per container, preventing one chart's resize/redraw from triggering repaints in sibling charts.

---

## 10. Zustand Store Subscriptions

Subscribe to **individual store slices**, not the entire store. Over-subscription causes all consumers to re-render on any state change.

```tsx
// BAD — re-renders on ANY store change
const { chartTypes, visibility, toggleWidget } = useWidgetStore();

// GOOD — only re-renders when this specific slice changes
const chartType = useWidgetStore((s) => s.chartTypes["alerts-by-model"] ?? "horizontal_bar");
const visible = useWidgetStore((s) => s.visibility["alerts-by-model"] ?? true);
```

When a component needs multiple slices, use separate selector calls — Zustand optimizes these individually.

---

## 11. Widget/Chart Container Heights

Fix chart container heights to prevent grid reflow when switching between chart types (e.g., bar → table → pie):

```tsx
<div style={{ height: 240 }}>
  {children}
</div>
```

Without fixed heights, switching from a tall chart to a short table causes the grid to reflow, which can trigger sibling chart repaints.

---

## 12. Theme-Aware Colors

Use CSS custom properties (not hardcoded colors) for all theme-sensitive elements:

| Use Case | Variable |
|----------|----------|
| Primary text | `var(--color-foreground)` |
| Muted text | `var(--color-muted)` |
| Borders | `var(--color-border)` |
| Surface background | `var(--color-surface)` |
| Elevated surface | `var(--color-surface-elevated)` |
| Accent/highlight | `var(--color-accent)` |
| Success | `var(--color-success)` |
| Error/destructive | `var(--color-destructive)` |

Hardcoded hex colors (e.g., `#6366f1`) are acceptable **only** for chart series color palettes where each series needs a distinct color.

---

## 13. StatusBadge Labels

When displaying snake_case values in `StatusBadge` components, always format:

```tsx
// BAD
<StatusBadge label={cs.strictness} />
<StatusBadge label={p.value} />

// GOOD
<StatusBadge label={formatLabel(cs.strictness)} />
<StatusBadge label={formatLabel(p.value ?? "")} />
```

---

## 14. Cross-View Consistency

When fixing a pattern in one view, **always scan the entire project** for the same pattern in other views. Use:

```bash
# Find all Tooltip components
grep -r "<Tooltip" frontend/src/ --include="*.tsx"

# Find all Bar/Line/Pie without name prop
grep -r "dataKey=" frontend/src/ --include="*.tsx"

# Find formatLabel duplicates
grep -r "formatLabel" frontend/src/ --include="*.tsx"

# Find index-based Cell keys
grep -r "key={i}" frontend/src/ --include="*.tsx"
```

A fix applied to one chart but not its siblings creates inconsistency.

---

## 15. UI Label/Metric Changes Must Update All Dependent Systems

Any change to a user-visible label, metric name, card title, or column header **must** trigger a search across all dependent systems. Even a "small rename" affects tours, scenarios, operation scripts, and documentation.

**Mandatory grep after any UI text change:**

```bash
# Search for the OLD text across all dependent systems
grep -r "old text" \
  frontend/src/data/tourDefinitions.ts \
  frontend/src/data/scenarioDefinitions.ts \
  frontend/src/data/operationScripts.ts \
  docs/demo-guide.md \
  docs/schemas/ \
  CLAUDE.md
```

**Systems to check:**

| System | File | What to update |
|--------|------|----------------|
| Tour definitions | `frontend/src/data/tourDefinitions.ts` | Step content referencing the label |
| Scenario definitions | `frontend/src/data/scenarioDefinitions.ts` | Scenario descriptions |
| Operation scripts | `frontend/src/data/operationScripts.ts` | Operation descriptions |
| Demo guide | `docs/demo-guide.md` | Feature descriptions |
| Data dictionary | `docs/schemas/data-dictionary.md` | Column/field descriptions |
| Project docs | `CLAUDE.md`, `docs/progress.md` | Any references |

---

## 16. Build → Restart → Hard Reload

After any frontend change:
1. `cd frontend && npm run build`
2. Restart the server (kill port 8000 + `./start.sh`)
3. Hard-reload the browser (Cmd+Shift+R / Ctrl+Shift+R)

The FastAPI static file server and browser both cache aggressively. Without all 3 steps, you may be testing stale code.

---

## Shared Constants & Utilities

| Import | File | Purpose |
|--------|------|---------|
| `formatLabel` | `frontend/src/utils/format.ts` | snake_case → Title Case |
| `TOOLTIP_STYLE` | `frontend/src/constants/chartStyles.ts` | Recharts tooltip container |
| `TOOLTIP_LABEL_STYLE` | `frontend/src/constants/chartStyles.ts` | Recharts tooltip label text |
| `TOOLTIP_ITEM_STYLE` | `frontend/src/constants/chartStyles.ts` | Recharts tooltip item text |
| `TICK_STYLE` | `frontend/src/constants/chartStyles.ts` | Recharts axis tick style |

---

## 17. View Layout Patterns

### List-Detail Views: Vertical Resizable Panes

For views with a list + detail pattern (entity list → entity detail), use vertical resizable panes instead of horizontal fixed-width columns:

**Pattern** (using `react-resizable-panels`):
```tsx
import { Group, Panel as ResizablePanel, Separator, useDefaultLayout } from "react-resizable-panels";

const { defaultLayout, onLayoutChanged } = useDefaultLayout({
  id: "view-name-layout",
  storage: localStorage,
});

<Group orientation="vertical" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
  <ResizablePanel id="list" defaultSize="35%" minSize="15%">
    {/* Full-width list (AG Grid, etc.) */}
  </ResizablePanel>
  <Separator className="h-1.5 bg-border hover:bg-accent transition-colors cursor-row-resize" />
  <ResizablePanel id="detail" defaultSize="65%" minSize="30%">
    {/* Detail content */}
  </ResizablePanel>
</Group>
```

**When to use:**
- Views with narrow left/right panels (`w-80`, `w-72`, `w-64`) that force AG Grid horizontal scrolling
- Views with 3+ panes where one pane could be a separate tab instead
- Views where the list has few items but the grid columns need full width

**Tab switching for multiple bottom views:**
When the bottom pane has two distinct modes (e.g., detail vs. graph), use top-level tab buttons instead of cramming both into the layout. Persist tab selection with `useLocalStorage`.

**Reference implementation:** `frontend/src/views/EntityDesigner/index.tsx`

**Name collision:** The project has its own `Panel` component. Import the library's as `ResizablePanel`:
```tsx
import { Panel as ResizablePanel } from "react-resizable-panels";
import Panel from "../../components/Panel.tsx";
```

## 18. Widget Configuration Pattern

Dashboard widgets are defined in metadata JSON (`workspace/metadata/widgets/{view_id}.json`), not hardcoded in components.

**Adding a new widget:**
1. Add a `WidgetDefinition` entry to the view's widget JSON file
2. If it's a chart widget, add a renderer entry in the view's `CHART_RENDERERS` map
3. The widget will be included automatically at the grid position specified in `grid_config`

**Widget metadata structure:**
```json
{
  "widget_id": "my-widget",
  "label": "My Widget",
  "widget_type": "chart",
  "data_source": "stats.my_data",
  "grid_config": { "row": 1, "col": 0, "col_span": 1, "order": 0 },
  "chart_config": { "default_chart_type": "bar", "available_chart_types": ["bar", "pie"] }
}
```

**API:** `GET /api/metadata/widgets/{view_id}` returns the config; `PUT` saves updates.

**Fallback:** If the API fails, the Dashboard falls back to hardcoded widgets for resilience.

**Reference:** `frontend/src/views/Dashboard/index.tsx`, `backend/models/widgets.py`, `workspace/metadata/widgets/dashboard.json`

## 19. Navigation Metadata Pattern

Sidebar navigation is loaded from `workspace/metadata/navigation/main.json` via the `navigationStore` Zustand store.

**Adding a new view:**
1. Add a `NavItem` entry to the appropriate group in `main.json`
2. Add the route to `frontend/src/App.tsx`
3. The sidebar link appears automatically at the position specified by `order`

**API:** `GET /api/metadata/navigation` returns the full navigation config.

**Fallback:** If the API fails, `Sidebar.tsx` falls back to `FALLBACK_NAVIGATION`.

**Reference:** `frontend/src/layouts/Sidebar.tsx`, `frontend/src/stores/navigationStore.ts`, `workspace/metadata/navigation/main.json`
