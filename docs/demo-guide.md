# Demo Guide

Step-by-step walkthrough for presenting the Analytics Platform Demo.

## Setup

```bash
# Ensure dependencies are installed
uv sync && cd frontend && npm install && cd ..

# Generate data and snapshots (if not already done)
uv run python -m scripts.generate_data
uv run python -m scripts.generate_snapshots

# Start the platform
./start.sh
```

Open **http://localhost:8000** in Chrome or Firefox.

## Demo Toolbar

The top toolbar shows demo controls:
- **Reset** — Return to pristine state (metadata only, no data)
- **Step** — Advance one checkpoint
- **Skip to End** — Jump to final state with all data/alerts
- **Jump to Act** — Jump to specific demo phases
- **Guide** — Start a guided workflow for the current demo act

The top-right toolbar area has:
- **Tour** — Start a guided tour for the current view
- **Light/Dark** — Toggle theme

## Guided Tours & Onboarding

**First Visit:** An onboarding modal welcomes new users with a 4-phase overview (Define, Configure, Operate, Investigate) and offers to start the overview tour.

**View Tours:** Click the **Tour** button in the top-right toolbar to start a guided tour for the current view. Each tour highlights key elements with a spotlight overlay and step-by-step popover explaining what each part does.

**Demo Workflow Guides:** Click the **Guide** button in the demo toolbar to start an act-based workflow that walks through multiple views:
- **Act 1 Guide** (9 steps): Raw data → Entity model → Pipeline → Schema → SQL → Settings → Models → Alerts
- **Act 2 Guide** (4 steps): Model composition, parameters, score steps, input mappings
- **Act 3 Guide** (3 steps): Alert investigation, dashboard overview, AI analysis

**Tooltips:** Hover over the `?` help buttons next to panel titles throughout the app for contextual help about what each section does.

## Dashboard (Overview → Dashboard)

The Dashboard provides a summary analytics view:
- **Row 1:** 4 summary cards — Total Alerts, Fired %, Average Score, Active Models
- **Row 2:** Alerts by Model (pie chart) | Score Distribution (bar histogram)
- **Row 3:** Alerts by Trigger Path (horizontal bar) | Alerts by Asset Class (pie chart)

The dashboard is the default landing page. Navigate to it from the sidebar under **Overview → Dashboard**.

## Act 1: Data & Discovery

### 1.1 Entity Designer (Define → Entities)

**Key Points:**
- Show the 5 canonical entities: product, execution, order, md_intraday, md_eod
- The **Product** entity contains instrument characteristics: asset_class, instrument_type, contract_size, option_type, exchange, currency
- Execution references Product via product_id (normalized data model)
- Click an entity to see its fields, types, and relationships
- Highlight: "Everything is metadata — entities are JSON definitions, not hardcoded schemas"

### 1.2 Load Data (Step → data_loaded)

Click **Step** in the toolbar to advance to `data_loaded`.

**Key Points:**
- 519 trade executions across 50 real products (AAPL, MSFT, GOOGL, etc.)
- 532 orders including fills and cancellations
- ~27K intraday price records, ~2K EOD records
- CSV → Parquet → DuckDB: "Edit the CSV, pipeline picks up changes"

### 1.3 Schema Explorer (Operate → Schema)

**Key Points:**
- Show DuckDB tables created from the loaded data
- Click a table to see columns and types
- "All data is queryable via standard SQL"

### 1.4 SQL Console (Operate → SQL)

**Key Points:**
- Run preset queries (click buttons in top right)
- Type a custom query: `SELECT * FROM execution LIMIT 10`
- Show the Monaco editor with syntax highlighting

**AI Assistant in SQL Console**
1. Click **Ask AI** in the header bar to open a collapsible chat panel on the right
2. Type a question like "What data do we have?" → AI responds (mock mode returns guidance)
3. When the AI returns SQL in a code block, click **Run Query** → SQL auto-populates the Monaco editor
4. Click **Close AI** to collapse the panel back

### 1.5 Run Pipeline (Step → pipeline_run)

Click **Step** to advance to `pipeline_run`.

**Key Points:**
- 10 calculations executed in dependency order (4 layers)
- Pipeline Monitor shows the calculation DAG
- Layer 1: Transaction values, adjusted direction
- Layer 2: Time windows (trends, market events, cancellation patterns)
- Layer 3: Aggregations (trading activity, VWAP)
- Layer 3.5: Derived (large activity flags, wash detection)

### 1.6 Metadata Explorer (Define → Metadata)

**Key Points:**
- Browse calculation definitions by layer
- Click a calculation to see inputs, outputs, SQL logic
- Show the calculation DAG — "dependencies drive execution order"

### 1.7 Settings Manager (Configure → Settings)

**Key Points:**
- Settings with entity-context-dependent overrides
- "Equities get a 2% VWAP threshold, FX gets 5%"
- Score steps: graduated scoring ranges per calculation

**Interactive: Resolution Tester**
1. Select a setting (e.g. "Large Activity Score Steps")
2. In the Resolution Tester panel, type **equity** in the Asset Class field
3. Click **Resolve**
4. See the equity-specific override match with "Why" explanation
5. Clear Asset Class → Resolve again → see "default value" fallback
6. Key takeaway: "Same setting resolves differently per entity context"

### 1.8 Detection (Step → alerts_generated)

Click **Step** to advance to `alerts_generated`.

**Key Points:**
- 5 detection models evaluated
- Alerts fired: wash trading, MPR, insider dealing, spoofing
- Each alert has a graduated score based on calculation results

### 1.9 Risk Case Manager (Investigate → Alerts)

**Key Points:**
- AG Grid with all fired alerts — sort by score, filter by model
- Click an alert to drill into the full investigation workspace (see below)

### 1.10 Alert Investigation Deep Dive

Click any alert row to open the full 6-panel investigation workspace.

**Panel Toggle Toolbar**
- Below the header, 8 toggle buttons let you show/hide individual panels
- Toggle state persists across page refreshes (localStorage)
- When one panel in a 2-column row is hidden, the remaining panel expands to full width

**Investigation Hint Banner**
- A colored hint banner appears based on the alert's detection model type
- Examples: "Wash Trading: Focus on VWAP proximity, quantity matching, and related buy/sell orders."
- "Insider Dealing: Focus on related products, profit/loss, and proximity to market events."
- Emphasized panels get a subtle accent ring border to draw investigator attention

**Row 1: Business Description | Entity Context**
- Model name, trigger path (all_passed vs score_based), accumulated score vs threshold
- Entity context badges: product_id, account_id, business_date, asset_class

**Row 2: Calculation Trace DAG | Market Data Chart**
- Interactive React Flow DAG showing the detection model root node → calculation nodes
- Each calc node displays: computed value, score, pass/fail border color (green/red/orange)
- TradingView Lightweight Charts: EOD price line + volume histogram for the alert's product
  - **Time Range Selector:** 1W / 1M / 3M / 6M / All buttons to control the date range
  - **EOD/Intraday Toggle:** Switch between daily close prices and tick-level intraday data
  - **Crosshair:** Normal crosshair mode for precise value reading

**Row 3: Settings Resolution | Score Breakdown**
- Settings trace showing which threshold values were applied and why
- Each entry shows: setting name, "override" or "default" badge, resolved value, explanation
- Recharts bar chart with threshold reference line + detail table with MUST_PASS/OPTIONAL badges

**Row 3: Trade Volume Chart**
- Recharts bar chart showing 90-day daily execution volume for the product
- Red dashed reference line marks the alert's business date

**Row 4: Related Orders & Executions**
- AG Grid showing orders/executions for the alert's product + account combination
- Columns: Exec ID, Date, Time, Side (BUY/SELL badges), Qty, Price, Product, Account
- **Column Filters:** Click column headers to access date, number, and text filters

**Row 5: Footer Actions**
- **Raw Data** — Toggle JSON view of the full alert trace
- **Export JSON** — Download the alert as a `.json` file for external analysis
- **Related Alerts** — (when available) Jump to alerts for same entity

**Key Takeaway:** "Every alert is fully traceable — from the detection model, through each calculation's score, the settings that drove thresholds, market data context, and related trading activity."

## Act 2: Model Composition

### 2.1 Model Composer (Compose → Models)

**Key Points:**
- View existing detection model definitions
- Each model shows its calculations with MUST_PASS/OPTIONAL tags
- Score steps define graduated scoring ranges
- "Models are composable from existing calculations"

**Interactive: Create a Custom Model**
1. Click **+ New Model**
2. Enter name: "Custom Wash Detection"
3. Add description: "Focused wash trading with strict quantity matching"
4. Click "Large Trading Activity" → badge shows OPTIONAL
5. Click the OPTIONAL badge → toggles to MUST_PASS
6. Click "Wash Detection" → leaves as OPTIONAL
7. Click **Save Model (2 calcs)**
8. New model appears in the left sidebar
9. Select it → click **Deploy & Run** → a confirmation dialog appears with the model name
10. Click **Deploy & Run** in the dialog to confirm → see alert count badge
11. Key takeaway: "Build detection models by composing existing calculations"

**AI Assistant in Model Composer**
- Click **Ask AI** in the top right to open a collapsible chat panel
- Ask questions about detection models, calculations, or scoring logic
- The AI panel provides conversational guidance alongside the model composition view

### 2.2 AI Assistant (AI → Assistant)

**Key Points:**
- In mock mode: click scenario buttons to see pre-scripted conversations
- "Explore Available Data" — shows what's in the database
- "Investigate Wash Trading" — queries wash detection results
- "Check for Spoofing" — queries cancellation patterns
- SQL from AI responses has "Run Query" buttons
- With API key: live Claude conversations with full schema context

### 2.3 Data Manager (Compose → Data)

**Key Points:**
- Browse loaded data tables
- Preview data in AG Grid
- "In a real deployment, you'd edit CSVs to add new products or accounts"

## Act 3: Wrap-Up

### 3.1 Mapping Studio (Configure → Mappings)

**Key Points:**
- Shows how source data maps to canonical entity fields
- "New data sources just need a mapping definition"

**Interactive: Drag-and-Drop Mapping**
1. Select a calculation (e.g. "Value Calculation")
2. Source Columns appear on the left, Required Fields on the right
3. **Drag** "symbol" from Source → **drop** on "product_id" → green badge appears
4. Drag "account" → "account_id", "price" → "price", "qty" → "quantity"
5. Click **x** on any mapping to remove it
6. Click **Save Mappings** → a confirmation dialog shows the field count and calculation name
7. Confirm to save → green "Saved" badge appears
8. Key takeaway: "Map any data format to canonical fields with drag-and-drop"

### 3.2 Skip to End

Click **Skip to End** to show the final state.

### 3.3 Summary Points

- **Everything is metadata**: entities, calculations, settings, detection models, mappings — all JSON
- **Graduated scoring**: flexible alert triggering (all-pass OR score-based)
- **Full traceability**: every alert shows exactly why it fired
- **AI-assisted**: natural language → SQL → investigation
- **Single command**: `./start.sh` — no Docker, no external databases

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Server won't start | Run `uv sync` to install dependencies |
| Frontend not loading | Run `cd frontend && npm install && npm run build` |
| No data visible | Click **Reset** then **Skip to End** |
| No alerts | Run `uv run python -m scripts.generate_snapshots` |
| AI not responding | Mock mode is the default — need `LLM_API_KEY` env var for live mode |
| DuckDB lock error on start | Another process holds the lock — kill it (`lsof workspace/analytics.duckdb`) or restart |
| Pipeline shows errors | Normal on re-run if tables/views type-mismatch — fixed with try/except drop logic |
| Schema Explorer empty after Step | Data reload happens automatically; if still empty, click **Reset** then **Skip to End** |
