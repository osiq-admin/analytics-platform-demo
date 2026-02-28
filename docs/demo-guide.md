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
- **Trace** — Toggle Architecture Traceability Mode (info icons appear on every traced section)
- **Scenarios** — Open the guided scenario browser (29 scenarios in Watch Demo or Try It Yourself mode)
- **Light/Dark** — Toggle theme

Each view also has a **(?)** help button in the bottom-right corner that opens a per-view operations panel with available actions, related scenarios, and quick tips.

## Guided Tours & Onboarding

**First Visit:** An onboarding modal welcomes new users with a 4-phase overview (Define, Configure, Operate, Investigate) and offers to start the overview tour.

**View Tours:** Click the **Tour** button in the top-right toolbar to start a guided tour for the current view. Each tour highlights key elements with a spotlight overlay and step-by-step popover explaining what each part does.

**Demo Workflow Guides:** Click the **Guide** button in the demo toolbar to start an act-based workflow that walks through multiple views:
- **Act 1 Guide** (9 steps): Raw data → Entity model → Pipeline → Schema → SQL → Settings → Models → Alerts
- **Act 2 Guide** (4 steps): Model composition, parameters, score steps, input mappings
- **Act 3 Guide** (3 steps): Alert investigation, dashboard overview, AI analysis

**Guided Scenarios (Phase 7B):** Click the **Scenarios** button in the toolbar to open the scenario browser with 29 guided scenarios in 10 categories (Settings, Calculations, Detection Models, Use Cases, Entities, Investigation, Admin, Architecture, Data Onboarding). Each scenario supports:
- **Watch Demo** — Auto-plays with narration, auto-fills forms, clicks buttons
- **Try It Yourself** — Interactive mode with hints and validation

**Tooltips:** Hover over the `?` help buttons next to panel titles throughout the app for contextual help about what each section does.

## Dashboard (Overview → Dashboard)

The Dashboard provides a summary analytics view:
- **Row 1:** 4 summary cards — Total Alerts, Score Triggered %, Average Score, Active Models
- **Row 2:** Alerts by Model (horizontal bar) | Score Distribution (bar histogram)
- **Row 3:** Alerts by Trigger Path (horizontal bar) | Alerts by Asset Class (pie chart)

**Chart Type Switching (Phase 9):** Each chart widget has a dropdown in its header to switch between visualization types (Bar, H-Bar, Line, Pie, Table). Selections persist in localStorage.

**Widget Visibility (Phase 9):** Click the gear icon next to the Dashboard heading to toggle widget visibility. Each chart can be shown/hidden via toggle switches. Settings persist in localStorage.

**Metadata-Driven Widgets (M132-M133):** All 8 dashboard widgets (4 KPI cards + 4 charts) are now defined in `workspace/metadata/widgets/dashboard.json`. The Dashboard fetches widget configuration from `/api/metadata/widgets/dashboard` at load time. Widget order, chart types, color palettes, and grid layout are all configurable via metadata. Add, reorder, or modify widgets by editing the JSON — no code changes required.

The dashboard is the default landing page. Navigate to it from the sidebar under **Overview → Dashboard**.

## Act 1: Data & Discovery

### 1.1 Entity Designer (Define → Entities)

**Key Points:**
- Show the 8 canonical entities: venue, product, account, trader, order, execution, md_intraday, md_eod
- **New in Phase 6:** Venue (6 ISO 10383 MIC codes), Account (220 rows with type/country/risk), Trader (50 rows with desk/type)
- The **Product** entity contains instrument characteristics: asset_class, instrument_type, ISIN, CFI code, MIC, underlying, strike, expiry, tick_size, lot_size
- **Order** entity includes: order_type (market/limit/stop), limit_price, filled_quantity, time_in_force (DAY/GTC/IOC/FOK), trader_id, venue_mic
- Execution references Product via product_id, Order via order_id (normalized, FIX Protocol-aligned data model)
- **Two-tab layout**: Toggle between "Entity Details" and "Relationship Graph" using the tab switcher in the top-right corner
- **Entity Details tab**: Full-width entity list (top pane) + entity detail (bottom pane) with Fields and Relationships sub-tabs. Drag the divider to resize.
- **Domain Values**: The Fields grid includes a "Domain" column showing value counts (e.g., "3 vals"). Click any field row to open the Domain Values pane — view metadata-defined values (editable: add/remove), data-only values (read-only, from DuckDB), and add new values. Changes save immediately.
- **Relationship Graph tab**: Full-width entity list (top pane) + React Flow graph (bottom pane) with dagre auto-layout, smoothstep edges with label backgrounds, arrowheads, minimap, and zoom controls. Click nodes to navigate; selected entity highlighted with connected edges.
- **Bidirectional selection**: Selecting an entity in the list highlights it in the graph (and vice versa). Selection persists across tabs.
- **Resizable panes**: Drag the horizontal divider between the entity list and detail/graph panes. Sizes persist across sessions.
- Highlight: "Everything is metadata — entities are JSON definitions, not hardcoded schemas"

### 1.2 Load Data (Step → data_loaded)

Click **Step** in the toolbar to advance to `data_loaded`.

**Key Points:**
- 519 trade executions across 50 real products (AAPL, MSFT, GOOGL, etc.)
- 532 orders with order_type (market/limit/stop), limit_price, time_in_force
- ~32K intraday price records with bid/ask spreads (equities, FX, futures), ~2K EOD records with full OHLCV
- 6 venues (ISO MIC codes), 220 accounts, 50 traders
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
- **Metadata-Driven (M137-M138):** Panel ordering, emphasis, and investigation hints are now loaded from each detection model's `alert_detail_layout` field in metadata. Edit `workspace/metadata/detection_models/*.json` to customize per-model investigation layouts without code changes.

**Row 1: Business Description | Entity Context**
- Model name, trigger path (all_passed vs score_based), accumulated score vs threshold
- Entity context badges: product_id, account_id, business_date, asset_class

**Row 2: Calculation Trace DAG | Market Data Chart**
- Interactive React Flow DAG showing the detection model root node → calculation nodes
- Each calc node displays: computed value, score, pass/fail border color (green/red/orange)
- TradingView Lightweight Charts: EOD OHLC candlesticks + volume histogram for the alert's product
  - **Time Range Selector:** 1W / 1M / 3M / 6M / All buttons to control the date range
  - **EOD/Intraday Toggle:** Switch between daily OHLC candlesticks and tick-level intraday data with bid/ask spreads
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
- Columns: Order ID, Order Type, Side (BUY/SELL badges), Qty, Filled Qty, Price, Limit Price, Time in Force, Status, Venue, Trader, Date
- **Column Filters:** Click column headers to access date, number, and text filters

**Row 5: Footer Actions**
- **Raw Data** — Toggle JSON view of the full alert trace
- **Export JSON** — Download the alert as a `.json` file for external analysis
- **Related Alerts** — (when available) Jump to alerts for same entity

**Key Takeaway:** "Every alert is fully traceable — from the detection model, through each calculation's score, the settings that drove thresholds, market data context, and related trading activity."

## Metadata Editor (Configure → Editor) — Phase 9

The Metadata Editor provides side-by-side JSON + visual editing for all 4 metadata types.

### Key Points
- **Monaco JSON Editor** (left): Full syntax highlighting, validation, auto-format
- **Visual Form Editor** (right): Type-specific form with fields, dropdowns, and controls
- **Bidirectional Sync**: Changes in either panel update the other in real-time (400ms debounce on JSON→Visual)
- **Validation**: Green check / red X indicator shows JSON validity
- **Save**: Persists changes to the backend via CRUD API

### Interactive: Edit a Setting
1. Navigate to **Configure → Editor**
2. Click **Settings** in the type selector
3. Select "Wash Trading Score Threshold" from the dropdown
4. In the Visual Editor, change the default value from 10 to 8
5. Watch the JSON panel update in real-time
6. Click **Save** — changes persist to disk

### Interactive: Explore Calculation SQL
1. Click **Calculations** in the type selector
2. Select "Trading Activity Aggregation"
3. Scroll down in the Visual Editor to see the full SQL logic
4. Note the Layer selector (aggregation), Dependencies list
5. Key takeaway: "Every calculation's SQL is visible and editable alongside its configuration"

### CRUD Buttons in Existing Views (Phase 9)
- **Entity Designer**: "+ New Entity" button, Edit/Delete on entity detail
- **Settings Manager**: "+ New Setting" button, Edit/Delete with dependency checking
- **Model Composer**: "+ New Model" button, Edit/Delete on model detail
- **Metadata Explorer**: Edit/Delete on calculation detail

## Regulatory Traceability (Governance → Regulatory Map) — Phase 10

The Regulatory Map provides end-to-end traceability from regulatory requirements to detection logic.

### Key Points
- **Two-tab layout**: Toggle between "Traceability Map" and "Regulation Details" using the tab switcher in the top-right corner
- **Coverage Summary Cards**: Total requirements, covered count, uncovered count, coverage percentage
- **Traceability Map tab**: Interactive React Flow graph with resizable panes (graph top, detail bottom)
  - Smoothstep edges with labels ("contains", "detected by", "uses") and arrowheads
  - MiniMap (bottom-left) and zoom Controls (zoom in/out, fit view)
  - Blue nodes = Regulations (MAR, MiFID II, Dodd-Frank, FINRA)
  - Green nodes = Covered regulatory articles
  - Red nodes = Uncovered regulatory articles (gaps)
  - Orange nodes = Detection models
  - Purple nodes = Calculations
- **Node Detail Pane**: Click any node to see full metadata in the bottom pane — type, title, description text, coverage status, layer
- **Regulation Details tab**: AG Grid table listing all regulations and articles with columns: Regulation, Jurisdiction, Article, Title, Coverage (green/red badges). Click any row to see full article description in the bottom pane.
- **Resizable panes**: Drag the horizontal divider between graph/grid and detail panes. Sizes persist across sessions.
- **Suggestions Panel**: Automated gap analysis with actionable recommendations

### Interactive: Explore the Traceability Chain
1. Navigate to **Governance → Regulatory Map**
2. See 4 coverage summary cards at the top
3. In the Traceability Map, follow edges from **blue regulation node** → green articles → orange models → purple calculations
4. Use edge labels to understand relationships: "contains", "detected by", "uses"
5. Click any node to see details with description text in the bottom pane
6. Switch to **Regulation Details** tab for a structured table view
7. Click an article row to see its full description
8. Expand the **Suggestions** panel at the bottom
9. Key takeaway: "Every detection model is traceable to the regulations it covers — with full descriptions and structured table views"

### Interactive: Review Coverage Gaps
1. In the Traceability Map, find a **red node** — this is an uncovered regulatory requirement
2. Click the red node to see why it's uncovered
3. Switch to **Regulation Details** tab and sort by Coverage column to see uncovered articles
4. Expand the **Suggestions** panel
5. See **Coverage Gaps** (red) — regulatory articles without detection models
6. See **Model Improvements** (amber) — models that could be strengthened with additional calculations
7. Key takeaway: "The system identifies exactly where regulatory coverage is weak and suggests improvements"

### Standards & Compliance Registry
- **ISO Standards**: 6 ISO standards with field mappings and validation rules (ISO 6166, 10383, 10962, 4217, 3166-1, 8601)
- **FIX Protocol**: 6 FIX fields mapped to entity fields with regulatory relevance
- **Compliance Requirements**: 14 granular requirements mapped to implementations (detection models, calculations, entity fields)
- **Regulations**: 6 frameworks (MAR, MiFID II, Dodd-Frank, FINRA, EMIR, SEC) with article-level detail and source URLs

### Entity Compliance Fields
- **Account**: MiFID II client classification (retail/professional/eligible_counterparty) and compliance status
- **Product**: Regulatory jurisdiction scope (EU/US/UK/APAC/MULTI)
- **Detection Models**: All 5 models now cover multiple jurisdictions (EU + US minimum)

### Grid Column Metadata (M159-M161)
- **Metadata-driven grids**: Column definitions (field, header, width, filter type) loaded from JSON metadata via API
- **DataManager**: Table list columns from `workspace/metadata/grids/data_manager.json`
- **Alert Summary**: 8 columns with filter types from `workspace/metadata/grids/risk_case_manager.json`
- **Related Executions**: 12 execution columns from `workspace/metadata/grids/related_executions.json`
- **Related Orders**: 11 order columns from `workspace/metadata/grids/related_orders.json`
- **Market Data Config**: Per-model chart configuration (chart type, price fields, overlay) in detection model `market_data_config`
- **Fallback resilience**: All grids fall back to hardcoded columns if metadata API fails
- **Hook pattern**: `useGridColumns(viewId, fallback)` — generic hook used across all metadata-driven grids

### View Configuration Metadata (M163-M164)
- **View tabs**: Tab definitions (id, label, icon, default) loaded from metadata API
  - Entity Designer: 2 tabs from `workspace/metadata/view_config/entity_designer.json`
  - Model Composer: 3 tabs from `workspace/metadata/view_config/model_composer.json`
- **Theme palettes**: Chart colors, asset class colors, badge variants, graph node colors from `workspace/metadata/theme/palettes.json`
  - Dashboard uses metadata palette for all charts
  - Regulatory Map uses metadata palette for graph node colors
- **Hook pattern**: `useViewTabs(viewId, fallback)` and `useThemePalettes()` with module-level cache

### Workflow & Template Metadata (M167-M169)
- **Submission workflow**: State machine (pending → in_review → approved/rejected/implemented) from `workspace/metadata/workflows/submission.json`
  - Badge variants and allowed transitions configurable via metadata
  - `useWorkflowStates(workflowId)` hook with module-level cache
- **Demo checkpoints**: 8 demo progression checkpoints from `workspace/metadata/demo/default.json`
  - Labels, descriptions, ordering accessible via `/api/metadata/demo/default`
- **Tour/scenario registry**: 21 tours and 29 scenarios catalogued in `workspace/metadata/tours/registry.json`
  - Tour summaries (id, path, title, step count) and scenario categories via `/api/metadata/tours`

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
- Metadata-driven bronze→silver field mapping for 3 entities (execution, order, product)
- Each mapping defines source (bronze) → target (silver) field transformations with validation rules
- CRUD operations: create, edit, delete field mappings via 7 API endpoints
- Validation status indicators (valid/warning/error) per mapping and per field
- Integrated with Data Onboarding wizard (Step 4 auto-suggests mappings from detected schema)

**Interactive: Explore Field Mappings**
1. Navigate to **Configure → Mappings**
2. See the 3 entity mapping cards: execution, order, product — each showing field count and validation status
3. Click an entity card (e.g., "execution") to see its field mapping table
4. Review source→target field pairs, data types, transformation rules, and validation status
5. Click **+ Add Field** to add a new field mapping — select source field, target field, and transformation
6. Click the edit icon on any row to modify an existing mapping
7. Click the delete icon to remove a mapping (with confirmation)
8. Note the validation indicators: green checkmark (valid), amber warning, red error
9. Key takeaway: "Bronze→silver field mappings are metadata-driven — define transformations in JSON, no code changes needed"

**Guided Scenario**
**S29: Mapping Studio Walkthrough** (Mapping category, beginner difficulty) — available in the Scenarios browser. Walks through exploring entity mappings, field-level transformations, and validation status.

### 3.2 Skip to End

Click **Skip to End** to show the final state.

### 3.3 Summary Points

- **Everything is metadata**: entities, calculations, settings, detection models, mappings, use cases, scenarios — all JSON
- **Production-grade data model**: 8 entities aligned with FIX Protocol and ISO standards (ISO 10383 MIC, ISO 6166 ISIN, ISO 10962 CFI)
- **Graduated scoring**: flexible alert triggering (all-pass OR score-based)
- **Full traceability**: every alert shows exactly why it fired
- **AI-assisted**: natural language → SQL → investigation, AI calc generation
- **Governance workflow**: use cases → submissions → review → approve/reject
- **5-layer validation**: static analysis, schema compat, sandbox exec, impact, regression
- **29 guided scenarios**: Watch Demo or Try It Yourself mode across 10 categories
- **Single command**: `./start.sh` — no Docker, no external databases

## Act 4: Model Composition Wizard — Phase 7B

### 4.1 Seven-Step Model Wizard (Compose → Models)

**Key Points:**
- The Model Composer now features a full 7-step wizard for building detection models from scratch
- Steps: Define → Calculations → Scoring → Query → Review → Test Run → Deploy
- Right panel shows real-time Validation, Preview (score simulation), and Dependency DAG

**Interactive: Build a Detection Model**
1. Navigate to **Compose → Models**
2. Click **+ New Model**
3. **Step 1 (Define):** Enter name "Order Cancellation Surge", description, select time window, check granularity fields
4. **Step 2 (Calculations):** Select 3-4 calculations across layers — click to select, click OPTIONAL badge to toggle to MUST_PASS
5. **Step 3 (Scoring):** Configure per-calc thresholds, select score threshold setting
6. **Step 4 (Query):** Click "Generate from selections" to auto-build SQL, or edit in Monaco editor
7. **Step 5 (Review):** Read-only summary of all choices
8. **Step 6 (Test Run):** Click "Run Test" → dry-run API returns preview alerts in AG Grid (50 rows max)
9. **Step 7 (Deploy):** Click "Save Model" to persist

**Validation Panel (right sidebar):** Shows real-time completeness checks — missing fields highlighted, progress bar tracks completion.

**Preview Panel (right sidebar):** Recharts bar chart simulating score distribution based on selected calculations.

**Dependency DAG (right sidebar):** React Flow graph showing calculation dependencies for selected calcs.

### 4.2 Examples Library

**Interactive: Browse Examples**
1. In Model Composer, click the **Examples** button
2. A 400px drawer slides in from the right
3. Three tabs: **Models**, **Settings**, **Calculations**
4. Each example has annotations explaining design rationale
5. Click **"Use as Starting Point"** to pre-populate the wizard

### 4.3 Domain-Aware Inputs

**Key Points:**
- **SuggestionInput:** Autocomplete with domain values from the API — small entities show dropdown, large entities use search
- **MatchPatternPicker:** Browse or create reusable override patterns (two-tab UI)
- **ScoreStepBuilder:** Visual range bar with gap/overlap detection, template library
- These components are used throughout Settings Manager, Metadata Editor, and Model Composer

## Act 5: Use Cases & Governance — Phase 7B

### 5.1 Use Case Studio (Compose → Use Cases)

**Key Points:**
- Create test scenarios ("use cases") to validate detection model behavior
- 5-step wizard: Describe → Components → Sample Data → Expected Results → Review
- Sample Data editor uses Monaco JSON with entity-specific tabs
- Run pipeline on sample data to verify expected alerts

**Interactive: Create a Use Case**
1. Navigate to **Compose → Use Cases**
2. Click **+ New Use Case**
3. **Step 1:** Enter name "Wash Trading — Same Account, Same Day", pick a model
4. **Step 2:** Review auto-selected calculations and settings
5. **Step 3:** Enter sample data as JSON (execution, order, product records)
6. **Step 4:** Toggle "Should Fire Alert", set expected count, add notes
7. **Step 5:** Review and **Save as Draft**
8. To submit: click **Submit for Review** → use case enters governance workflow

### 5.2 Submissions Queue (Governance → Submissions)

**Key Points:**
- AG Grid queue showing all submitted changes with status badges (pending/approved/rejected/changes_requested)
- 5-tab detail view: Summary, Components, Recommendations, Comments, Impact
- Auto-recommendations generated on submission (change classification, similarity analysis, consistency checks, best practices)
- Approve, Reject, or Request Changes with comment

**Interactive: Review a Submission**
1. Navigate to **Governance → Submissions**
2. Select a pending submission row
3. Read the **Summary** tab for overview
4. Check **Recommendations** tab — auto-generated governance advice
5. Write a comment in the **Comments** tab
6. Click **Approve** or **Request Changes**
7. Key takeaway: "Every metadata change goes through a governance review workflow"

### 5.3 Five-Layer Validation

**Key Points:**
- Backend validation API checks models, calculations, and settings across 5 layers:
  1. Static analysis (SQL syntax, table/column existence)
  2. Schema compatibility (input/output matching, dependency order)
  3. Sandbox execution (read-only run, timing checks)
  4. Impact analysis (affected models)
  5. Regression safety (before/after comparison)

## Act 6: AI-Assisted Building — Phase 7B

### 6.1 AI Calculation Builder

**Key Points:**
- Describe what you want in natural language → AI generates a calculation definition
- Split review view: Monaco JSON editor (left) + summary with confidence/suggestions (right)
- Iterative refinement: adjust description → regenerate → compare
- Mock mode uses keyword-based template matching (ratio, aggregation, time_window, derived)

**Interactive: Generate a Calculation**
1. Open the AI Calc Builder (accessible from Model Composer or AI Assistant)
2. Enter: "Calculate the ratio of cancelled orders to total orders per account"
3. Click **Generate** → AI returns a calculation JSON
4. Review the JSON, confidence score, and suggestions
5. Click **Refine** to adjust, or **Accept** to save

### 6.2 Version Management

**Key Points:**
- All metadata changes are version-tracked (snapshot-based)
- Compare any two versions side-by-side with color-coded field-level diffs
- Rollback to a previous version with one click
- Version history available for all metadata types

**Interactive: Compare Versions**
1. Open the Version Comparison panel (available in Metadata Editor)
2. Select two versions from the dropdowns
3. View color-coded diff: green = added, red = removed, amber = changed
4. Click **Rollback** to restore a previous version

## Act 7: Guided Scenarios — Phase 7B

### 7.1 Scenario Browser

**Key Points:**
- 29 guided scenarios organized in 10 categories
- Each scenario has: name, description, difficulty badge (beginner/intermediate/advanced), estimated time
- Two modes: **Watch Demo** (auto-play) and **Try It Yourself** (interactive with hints)
- Completed scenarios get a checkmark

**Interactive: Run a Guided Scenario**
1. Click the **Scenarios** button in the top toolbar
2. Browse categories: Settings, Calculations, Detection Models, Use Cases, Entities, Investigation, Admin, Architecture, Data Onboarding, Mapping
3. Filter by difficulty (All / Beginner / Intermediate / Advanced)
4. Select a scenario (e.g., "S1: View Settings Overview")
5. Choose **Watch Demo** to see auto-narrated walkthrough, or **Try It Yourself** for interactive hints
6. In Watch mode: steps auto-advance, forms auto-fill, buttons auto-click
7. In Try mode: follow hints, complete each step yourself, validation confirms your actions
8. Key takeaway: "Every platform feature has a guided walkthrough — watch or try it yourself"

### 7.2 Per-View Help

**Key Points:**
- Every view has a **(?)** button in the bottom-right corner
- Opens a slide-in panel with:
  - **Available Operations** — what you can do on this screen
  - **Related Scenarios** — links to relevant guided scenarios
  - **Quick Tips** — context-specific advice
- 105 operations defined across 18 views

### 7.3 Scenario Categories

| Category | Scenarios | Difficulty Range |
|---|---|---|
| Settings & Thresholds | S1-S6 | Beginner → Advanced |
| Calculations | S7-S10 | Beginner → Advanced |
| Detection Models | S11-S14 | Beginner → Advanced |
| Use Cases & Submissions | S15-S18 | Beginner → Advanced |
| Entities | S19-S20 | Beginner |
| Investigation | S21-S23 | Beginner → Advanced |
| Admin | S24-S26 | Intermediate → Advanced |
| Architecture | S27 | Beginner |
| Data Onboarding | S28 | Beginner |
| Mapping | S29 | Beginner |

## Act 8: Metadata Configuration

### 8.1 Dashboard Widget Configuration
Navigate to **Overview → Dashboard**. Widget layout (KPI cards, charts, ordering) is defined in `workspace/metadata/widgets/dashboard.json`. Edit the JSON to add, reorder, or reconfigure widgets without code changes. The API at `GET /api/metadata/widgets/dashboard` serves the configuration.

### 8.2 Navigation Configuration
The sidebar navigation is loaded from `workspace/metadata/navigation/main.json`. Add new views by editing the JSON — no Sidebar.tsx changes needed.

### 8.3 Format Rules
Formatting rules for numeric fields, labels, and currencies are defined in `workspace/metadata/format_rules/default.json`. The `useFormatRules` hook fetches these rules to apply consistent formatting throughout the UI.

### 8.4 Audit Trail
Every metadata save/delete creates an immutable audit record in `workspace/metadata/_audit/`. Query the audit history via `GET /api/metadata/audit?metadata_type=entity&item_id=product`.

## Medallion Architecture (MedallionOverview)

Navigate to **Architecture → Medallion** to see the 11-tier data architecture.

### Key Points
- **Path**: `/medallion`
- **Purpose**: Visualize the 11-tier medallion data architecture
- **Features**:
  - React Flow diagram showing all 11 tiers with Dagre auto-layout
  - Data contract edges with entity counts between tiers
  - Tier detail panel: data state, format, retention, quality gate, access level, mutability
  - Related data contracts and pipeline stages per tier
  - Status badges: 11 tiers, 6 contracts, 5 stages

### Interactive: Explore the Medallion Architecture
1. Navigate to **Architecture → Medallion**
2. See the 11-tier flow diagram: Landing → Bronze → Quarantine → Silver → Gold → Platinum → Reference/MDM → Sandbox → Logging/Audit → Metrics/Observability → Archive
3. Note the data contract edges between tiers showing entity counts
4. Click any tier node to see its detail panel: purpose, data state, storage format, retention policy, quality gate, access level, mutability
5. Review the related data contracts for the selected tier (source and target)
6. Review the pipeline stages that involve the selected tier
7. Key takeaway: "The entire data architecture is metadata-driven — tiers, contracts, transformations, and pipeline stages are all JSON definitions"

### Guided Scenario
**S27: Medallion Architecture Exploration** (Architecture category, beginner difficulty) — available in the Scenarios browser. Walks through the 11-tier architecture, data contracts, and pipeline stages.

## Data Onboarding (DataOnboarding)

Navigate to **Architecture → Onboarding** to access the 5-step data onboarding wizard.

### Key Points
- **Path**: `/onboarding`
- **Purpose**: Guide users through onboarding new data sources into the platform
- **Features**:
  - 5-step wizard: Source → Schema → Profile → Mapping → Review
  - Connector abstraction layer: 6 connector types (local_file, s3, sftp, api_rest, database, kafka)
  - Auto-detect schema from uploaded files
  - Data profiling: column statistics, null counts, cardinality, distribution
  - Field-level mapping from source schema to canonical entity fields
  - Review and confirm before ingestion

### Interactive: Onboard a New Data Source
1. Navigate to **Architecture → Onboarding**
2. **Step 1 (Source):** Select a connector type (e.g., "Local File") and configure connection parameters
3. **Step 2 (Schema):** Review the auto-detected schema — column names, types, sample values
4. **Step 3 (Profile):** View data profiling results — null percentages, unique counts, value distributions
5. **Step 4 (Mapping):** Map source columns to canonical entity fields with type coercion options
6. **Step 5 (Review):** Review all selections and confirm the onboarding configuration
7. Key takeaway: "New data sources are onboarded through a guided wizard — connectors, schemas, and mappings are all metadata-driven"

### Guided Scenario
**S28: Data Onboarding Walkthrough** (Data Onboarding category, beginner difficulty) — available in the Scenarios browser. Walks through the 5-step wizard for onboarding a local file data source.

---

## Architecture Traceability Mode — M128

Architecture Traceability Mode lets you inspect the technical architecture of every section in the platform. It reveals which source files, Zustand stores, API endpoints, metadata files, and technologies power each UI component — and rates how metadata-driven each section is.

### How to Use

1. Click the **Trace** button in the top-right toolbar area to activate Architecture Traceability Mode
2. Blue info icons (i) appear on every traced section throughout the current view
3. Click any info icon to open a **400px slide-in panel** from the right showing:
   - **Source Files** — React components, TypeScript files that render this section
   - **Zustand Stores** — State management stores used by the section
   - **API Endpoints** — Backend endpoints the section calls (with HTTP methods)
   - **Metadata & Data Sources** — JSON metadata files, CSV/Parquet data, DuckDB tables
   - **Technologies** — Libraries and frameworks used (React Flow, AG Grid, Monaco, Recharts, etc.)
   - **Metadata Maturity Rating** — Color-coded badge showing how metadata-driven the section is
   - **Maturity Explanation** — Why the section received its rating
   - **Improvement Opportunities** — What could make the section more metadata-driven
4. Click the **Trace** button again (or click outside the panel) to deactivate traceability mode

### Metadata Maturity Ratings

Each section is rated on a 5-level metadata maturity scale:

| Rating | Color | Meaning |
|--------|-------|---------|
| Fully Metadata-Driven | Green | Everything rendered from metadata definitions — zero hardcoded logic |
| Mostly Metadata-Driven | Blue | Core behavior from metadata, minor presentation logic in code |
| Mixed | Amber | Significant metadata usage but also substantial hardcoded elements |
| Code-Driven | Orange | Primarily implemented in code with limited metadata |
| Infrastructure | Gray | System-level component (layout, navigation) — metadata-driven by nature of hosting metadata content |

### Coverage

- **80 traced sections** across all 18 views plus cross-cutting concerns (sidebar, toolbar, demo controls)
- Every view has 3-6 traced sections covering its major panels and features
- Cross-cutting sections cover: sidebar navigation, demo toolbar, theme switcher, tour system, scenario system, help system

### Interactive: Explore Architecture Traceability

1. Navigate to any view (e.g., **Dashboard**)
2. Click **Trace** in the toolbar — info icons appear on each panel
3. Click the info icon on "Summary Cards" — see that it reads from alert trace Parquet files and uses the dashboardStore
4. Navigate to **Entity Designer** — click Trace again
5. Click the info icon on "Entity List" — see it uses entityStore, reads entity JSON metadata, and is rated "fully-metadata-driven"
6. Click the info icon on "Relationship Graph" — see it uses React Flow, reads relationships from entity metadata
7. Compare maturity ratings across sections to understand which parts are most metadata-driven
8. Key takeaway: "Every section is architecturally traceable — you can see exactly what code, stores, APIs, and metadata power each part of the UI"

### Guided Scenario

**S26: Explore Architecture Traceability** (Admin category, intermediate difficulty) — available in the Scenarios browser. Walks through activating traceability, reading architecture details, and understanding maturity ratings.

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

---

## OOB vs User Metadata (Configure → Editor) — Phase 11

Phase 11 introduces a clean separation between out-of-box (vendor-shipped) metadata and user customizations. All metadata items now carry a `metadata_layer` field indicating their provenance.

### Walkthrough A: Viewing Layers

1. Navigate to **Metadata Editor** (`/editor`)
2. Observe the **LayerBadge** next to the item selector — shows "OOB" (cyan) for shipped items
3. Visit **Entity Designer** (`/entities`) — entity list shows OOB/Custom badges in Layer column
4. Visit **Metadata Explorer** (`/metadata`) — calculation list shows OOB badges in OOB column
5. Visit **Settings Manager** (`/settings`) — settings list shows Layer column with OOB badges
6. Visit **Model Composer** (`/models`) — model list shows inline OOB/Custom badges next to names

### Walkthrough B: Creating a User Override

1. In **Metadata Editor**, select the "product" entity
2. Note the amber info banner: "Out-of-box item. Editing will create a user override"
3. Edit the `description` field in the JSON editor
4. Click **Save** — the badge changes to "Modified" (amber)
5. The original OOB definition is preserved untouched

### Walkthrough C: Resetting to OOB

1. After modifying an OOB item, the **Reset to OOB** button appears in the bottom bar
2. Click "Reset to OOB" — a confirmation dialog appears
3. Confirm — the override is deleted, badge reverts to "OOB", original definition restored

### Walkthrough D: Upgrade Simulation

1. In the Metadata Editor, click **OOB Version Info** to expand the version panel
2. Shows version "1.0.0", OOB item count, and user override count
3. Click **Simulate Upgrade** — compares current manifest to a demo v1.1.0 manifest
4. Review the color-coded upgrade report:
   - **Green (+ Added)**: new items in the upgrade (e.g., front_running_detection calc)
   - **Amber (~ Modified)**: OOB items changed by the vendor (e.g., wash_detection, product entity)
   - **Red (! Conflict)**: modified OOB items that you've also customized — needs manual review

### Walkthrough E: Cross-View Badges

1. **Entity Designer** (`/entities`) — "Layer" column in entity list grid
2. **Metadata Explorer** (`/metadata`) — "OOB" column in calculation list grid
3. **Settings Manager** (`/settings`) — "Layer" column in settings list grid
4. **Model Composer** (`/models`) — inline badge next to each model name

---

## Grid & Layout Features — Phase 12

Phase 12 addresses UI/UX usability across all viewports from 1024px to 1920px+. AG Grid columns are now properly sized with tooltips and resizable headers.

### Column Resize

All AG Grid columns are now **resizable**. Drag the border between column headers to adjust width. Columns auto-fit to the available grid width using `fitGridWidth` strategy, but manual adjustment is always available.

### Tooltips on Hover

Hover over any grid cell for **300ms** to see a tooltip with the full cell content. This is especially useful for:
- **Alert IDs** — truncated UUID prefixes show full ID on hover
- **Calculation IDs** — long identifiers like `adjusted_direction` appear in full
- **Setting IDs** — `business_date_cutoff` and similar long names

### Responsive Layouts

Panel widths have been optimized across all split-panel views:
- **Entity Designer** — vertical two-tab layout with `react-resizable-panels`: entity list (top) + detail/graph (bottom), drag divider to resize, sizes persist
- **Metadata Explorer** — calculation list panel expanded to 440px for better column readability
- **Settings Manager** — settings list panel expanded to 480px

### Visual Editor Grid Fix

The Metadata Editor's Visual Editor field table had invisible Description column at smaller viewports. The CSS grid template now uses `minmax()` values ensuring both Name and Description columns have minimum widths.

### Guided Tour

Start the **"Grid & Layout Features"** tour from the tour menu to see these features in action across 5 views.
