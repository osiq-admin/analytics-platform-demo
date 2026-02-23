# Backend

Python FastAPI backend for the Analytics Platform Demo.

## Structure

```
backend/
├── main.py                  # FastAPI entry point, router registration, SPA serving
├── config.py                # Pydantic Settings (workspace_dir, host, port, LLM config)
├── db.py                    # DuckDB connection manager, lifespan context
├── api/                     # API route handlers
│   ├── ai.py                # AI assistant (mode, mock sequences, chat)
│   ├── alerts.py            # Alert queries and trace retrieval
│   ├── data.py              # Data file management
│   ├── demo.py              # Demo state machine (reset, step, jump, snapshot)
│   ├── metadata.py          # CRUD for entities, calculations, settings, models
│   ├── pipeline.py          # Pipeline execution and status
│   ├── query.py             # SQL execution, table listing, schema introspection
│   └── ws.py                # WebSocket for real-time pipeline updates
├── engine/                  # Core computation engines
│   ├── calculation_engine.py # DAG executor — topological sort, SQL execution, Parquet persistence
│   ├── data_loader.py       # CSV → Parquet → DuckDB with change detection
│   ├── detection_engine.py  # Graduated scoring, MUST_PASS/OPTIONAL, alert trigger logic
│   └── settings_resolver.py # Hierarchy/multi-dim matching, score step evaluation
├── models/                  # Pydantic data models
│   ├── alerts.py            # AlertTrace, CalculationScore, SettingsTraceEntry
│   ├── calculations.py      # CalculationDefinition, CalculationLayer
│   ├── detection.py         # DetectionModelDefinition, ModelCalculation, Strictness
│   ├── entities.py          # EntityDefinition, EntityField
│   └── settings.py          # SettingDefinition, SettingOverride, ScoreStep
└── services/                # Business logic
    ├── ai_assistant.py      # Claude API (live) + mock mode with pre-scripted sequences
    ├── alert_service.py     # Alert generation — JSON traces + Parquet summary
    ├── demo_controller.py   # 8-checkpoint state machine, snapshot save/restore
    ├── metadata_service.py  # JSON CRUD for all metadata types
    └── query_service.py     # SQL execution wrapper for DuckDB
```

## API Routes

All routes are prefixed with `/api/`.

| Prefix | Description |
|--------|------------|
| `/api/health` | Health check |
| `/api/metadata` | Entity, calculation, setting, detection model CRUD |
| `/api/query` | SQL execution, table listing, schema, presets |
| `/api/pipeline` | Pipeline run and status |
| `/api/alerts` | Alert summary list and trace retrieval |
| `/api/demo` | Demo state, reset, step, jump, skip-to-end, snapshot |
| `/api/data` | Data file listing, preview, reload |
| `/api/ai` | AI mode, mock sequences, chat |
| `/api/ws` | WebSocket for pipeline progress |

## Key Engines

### Calculation Engine
Executes SQL calculations in dependency order (topological sort). Four layers:
1. **Transaction** — per-execution calculations (value, adjusted direction)
2. **Time Window** — temporal segmentation (business date, trends, events, cancellation patterns)
3. **Aggregation** — grouped calculations (trading activity, VWAP)
4. **Derived** — threshold-based flags (large activity, wash detection)

### Detection Engine
Evaluates detection models using graduated scoring:
- **MUST_PASS** calculations act as gates
- **OPTIONAL** calculations contribute graduated scores via score steps
- Alert fires when: all gates pass AND (all checks pass OR score >= threshold)

### Settings Resolver
Resolves settings with entity-context-dependent overrides:
- Product-specific overrides always win
- Hierarchy matching (most specific wins)
- Multi-dimensional matching (most dimensions matched wins)
- Default fallback guaranteed

## Running

```bash
# Development (auto-reload)
uv run uvicorn backend.main:app --reload --port 8000

# Production (serves React SPA from frontend/dist/)
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
