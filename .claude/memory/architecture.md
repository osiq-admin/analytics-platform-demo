# Architecture — Analytics Platform Demo

## Tech Stack
- **Backend**: Python FastAPI + DuckDB (embedded OLAP), uv package manager
- **Frontend**: React 19 + TypeScript + Vite, Tailwind CSS 4
- **Charts**: TradingView Lightweight Charts (market data, OHLC candlesticks), Recharts (bar/pie/histogram)
- **Data Grid**: AG Grid Community
- **DAG Viz**: React Flow + dagre
- **Tooltips/Tours**: @floating-ui/react
- **State**: Zustand (per-domain stores)
- **Code Editor**: Monaco Editor (SQL Console)

## Backend Structure
- `backend/main.py` — FastAPI app with 9 routers
- `backend/api/` — metadata, query, pipeline, alerts, demo, data, ws, ai, dashboard
- `backend/engine/` — calculation_engine, detection_engine, data_loader
- `backend/services/` — query_service, alert_service, ai_assistant, demo_controller, settings_resolver
- `backend/db.py` — DuckDB connection manager
- `backend/config.py` — Settings with workspace_dir

## Frontend Structure
- `frontend/src/layouts/` — AppLayout, Sidebar
- `frontend/src/views/` — 12 views: Dashboard, EntityDesigner, MetadataExplorer, SettingsManager, MappingStudio, PipelineMonitor, SchemaExplorer, SQLConsole, ModelComposer, DataManager, RiskCaseManager, AIAssistant
- `frontend/src/stores/` — alertStore, pipelineStore, demoStore, metadataStore, tourStore, dashboardStore
- `frontend/src/components/` — Panel, DataGrid, Tooltip, HelpButton, TourOverlay, OnboardingModal, SummaryCard, etc.
- `frontend/src/data/tourDefinitions.ts` — 12 view tours + 3 act workflow guides

## Data Flow
1. CSV files in `workspace/data/csv/` (8 entities: product, execution, order, md_intraday, md_eod, venue, account, trader)
2. DataLoader reads CSVs → DuckDB tables
3. CalculationEngine runs SQL DAG (4 layers, 10 calcs) → Parquet results
4. DetectionEngine evaluates 5 models → AlertService writes traces
5. Frontend fetches via REST API, renders in views

## Data Model (Phase 6 — Industry-Standard)
- **8 entities**: product (50), execution (509), order (519), md_intraday (32K), md_eod (2,150), venue (6), account (220), trader (50)
- **ISO Standards**: ISIN (ISO 6166), CFI (ISO 10962), MIC (ISO 10383), ISO 4217 currencies, ISO 3166-1 countries
- **FIX Protocol**: OrdType (MARKET/LIMIT), OrdStatus (NEW/FILLED/CANCELLED/PARTIALLY_FILLED/REJECTED), TimeInForce (DAY/GTC/IOC/FOK), ExecType (FILL), Capacity (AGENCY/PRINCIPAL)
- **OHLCV**: Full Open/High/Low/Close/Volume + prev_close, num_trades, vwap
- **Bid/Ask**: Level 1 quotes on all intraday data (equities + FX + futures)
- Product entity holds: asset_class (equity/fx/commodity/index/fixed_income), instrument_type (common_stock/spot/call_option/put_option/future), underlying relationships, strike/expiry for derivatives

## Key Patterns
- **Everything is metadata**: entities, calculations, settings, models — all JSON files on disk
- **Normalized data model**: Product entity holds instrument characteristics, all transactions reference via product_id FK
- **Graduated scoring**: MUST_PASS/OPTIONAL strictness, score steps for escalation
- **Snapshot-based demo**: 8 checkpoints from pristine to final state
- **Panel component**: Reusable with optional tooltip, dataTour, noPadding, actions props

## Tests
- Tests run from main repo root: `uv run pytest tests/ -v`
- 214 tests: unit (layer calcs, settings, data gen, entity schemas), integration (pipeline, E2E API), snapshot tests

## Completed Phases
1. **Phase 1** (M0-M13): Full platform scaffold — backend, frontend, 11 views, demo controls, AI assistant
2. **Phase 2** (M14-M17): Interactive features — settings resolver, D&D mappings, model create/deploy
3. **Phase 3** (M18-M25): Alert Detail — calc trace DAG, market chart, settings trace, orders, footer
4. **Phase 4** (M26-M33): UX Polish — confirm dialogs, panel toggles, AI panels, dynamic layout
5. **Phase 5** (M34-M48): Data model normalization (Product entity), tooltips/tours/onboarding, chart enhancements (time range, intraday, filters), Dashboard view
6. **Phase 6** (M49-M65): Data model deep refinement — ISO identifiers, FIX Protocol alignment, 3 new entities (venue/account/trader), OHLCV, bid/ask, candlestick charts
