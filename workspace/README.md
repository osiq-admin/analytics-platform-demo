# Workspace Directory

Runtime workspace for the Analytics Platform Demo. All data, metadata, calculation results, alerts, and demo snapshots live here.

## Structure

```
workspace/
├── metadata/                  # JSON configuration files (version-controlled)
│   ├── entities/              # Canonical entity definitions
│   │   ├── execution.json     # Trade execution entity (13 fields)
│   │   ├── order.json         # Order entity (8 fields)
│   │   ├── md_intraday.json   # Intraday market data entity (5 fields)
│   │   └── md_eod.json        # End-of-day market data entity (4 fields)
│   ├── calculations/          # Calculation definitions by layer
│   │   ├── transaction/       # Layer 1: value_calc, adjusted_direction
│   │   ├── time_windows/      # Layer 2: business_date, trend, market_event, cancellation
│   │   ├── aggregations/      # Layer 3: trading_activity, vwap
│   │   └── derived/           # Layer 3.5: large_activity, wash_detection
│   ├── settings/              # Settings and thresholds
│   │   ├── thresholds/        # 6 threshold definitions with entity-context overrides
│   │   ├── score_steps/       # 5 graduated scoring step definitions
│   │   └── score_thresholds/  # 4 model score threshold definitions
│   ├── detection_models/      # 5 detection model definitions
│   │   ├── wash_full_day.json
│   │   ├── wash_intraday.json
│   │   ├── market_price_ramping.json
│   │   ├── insider_dealing.json
│   │   └── spoofing_layering.json
│   ├── mappings/              # Source-to-canonical field mappings
│   ├── related_products/      # Product relationship definitions
│   ├── ai_instructions.md     # AI assistant system prompt
│   └── ai_mock_sequences.json # Pre-scripted AI conversation scenarios
├── data/
│   ├── csv/                   # Source data (human-editable)
│   │   ├── execution.csv      # 519 trade executions
│   │   ├── order.csv          # 532 orders (filled + cancelled)
│   │   ├── md_intraday.csv    # 26,890 intraday price snapshots
│   │   └── md_eod.csv         # 2,150 end-of-day prices
│   └── parquet/               # Engine data (auto-generated from CSV)
├── results/                   # Calculation output (Parquet files)
│   ├── transaction/           # calc_value, calc_adjusted_direction
│   ├── time_windows/          # calc_business_date_window, calc_trend_window, etc.
│   ├── aggregations/          # calc_trading_activity, calc_vwap
│   └── derived/               # calc_large_trading_activity, calc_wash_detection
├── alerts/
│   ├── summary.parquet        # Alert summary table
│   └── traces/                # Per-alert JSON trace files (one per fired alert)
└── snapshots/                 # Demo checkpoint snapshots
    ├── pristine/              # Metadata only, no data
    ├── data_loaded/           # CSV + Parquet loaded
    ├── pipeline_run/          # All calculations executed
    ├── alerts_generated/      # Detection models evaluated
    ├── act1_complete/         # Act 1 investigation complete
    ├── model_deployed/        # New model deployed (Act 2)
    ├── act2_complete/         # Act 2 complete
    └── final/                 # Complete demo state
```

## File Formats

| Directory | Format | Description |
|-----------|--------|------------|
| `metadata/` | JSON | Pydantic-validated definitions. Edit these to change platform behavior. |
| `data/csv/` | CSV | Source data. Edit to add products, accounts, or trading patterns. |
| `data/parquet/` | Parquet | Auto-generated from CSV. Do not edit directly. |
| `results/` | Parquet | Calculation outputs. Regenerated on pipeline run. |
| `alerts/traces/` | JSON | Full alert traces with calculation scores, settings resolution, entity context. |
| `alerts/summary.parquet` | Parquet | Tabular alert summary registered as DuckDB table. |
| `snapshots/` | Mixed | Complete workspace state copies for demo checkpoints. |

## Generated vs. Version-Controlled

| What | Git tracked? | How to regenerate |
|------|-------------|-------------------|
| `metadata/` | Yes | Manual edits |
| `data/csv/` | Yes | `python -m scripts.generate_data` |
| `data/parquet/` | No | Auto-generated on data load |
| `results/` | No | `python -m scripts.generate_snapshots` |
| `alerts/` | No | `python -m scripts.generate_snapshots` |
| `snapshots/` | No | `python -m scripts.generate_snapshots` |
