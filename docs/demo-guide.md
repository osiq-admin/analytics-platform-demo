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

## Act 1: Data & Discovery

### 1.1 Entity Designer (Define → Entities)

**Key Points:**
- Show the 4 canonical entities: execution, order, md_intraday, md_eod
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

### 1.8 Detection (Step → alerts_generated)

Click **Step** to advance to `alerts_generated`.

**Key Points:**
- 5 detection models evaluated
- Alerts fired: wash trading, MPR, insider dealing, spoofing
- Each alert has a graduated score based on calculation results

### 1.9 Risk Case Manager (Investigate → Alerts)

**Key Points:**
- AG Grid with all fired alerts — sort by score, filter by model
- Click an alert to drill into the full trace:
  - Business description
  - Entity context (account, product, trader)
  - Score breakdown (Recharts bar chart)
  - Settings resolution trace (which override matched)

## Act 2: Model Composition

### 2.1 Model Composer (Compose → Models)

**Key Points:**
- View existing detection model definitions
- Each model shows its calculations with MUST_PASS/OPTIONAL tags
- Score steps define graduated scoring ranges
- "Models are composable from existing calculations"

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
