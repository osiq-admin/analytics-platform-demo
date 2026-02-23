# Workspace Directory

Runtime workspace for the Analytics Platform Demo.

## Structure

```
workspace/
├── metadata/              # JSON configuration files
│   ├── entities/          # Canonical entity definitions
│   ├── calculations/      # Calculation definitions by layer
│   │   ├── transaction/   # Layer 1: per-execution calculations
│   │   ├── time_windows/  # Layer 2: time window boundaries
│   │   ├── aggregations/  # Layer 3: group-by aggregations
│   │   └── derived/       # Layer 3.5: cross-calculation derivations
│   ├── settings/          # Settings and thresholds
│   │   ├── thresholds/    # Threshold definitions with overrides
│   │   ├── score_steps/   # Graduated scoring step definitions
│   │   └── score_thresholds/ # Model score threshold definitions
│   ├── detection_models/  # Detection model definitions
│   ├── mappings/          # Source-to-canonical field mappings
│   └── related_products/  # Product relationship definitions
├── data/
│   ├── csv/               # Source data (human-editable)
│   └── parquet/           # Engine data (auto-generated from CSV)
├── results/               # Calculation output (Parquet + summary CSV)
│   ├── transaction/
│   ├── time_windows/
│   ├── aggregations/
│   └── derived/
├── alerts/
│   └── traces/            # Per-alert JSON trace files
└── snapshots/             # Demo state snapshots
    ├── pristine/          # Initial state
    ├── act1_complete/     # After Act 1
    ├── act2_complete/     # After Act 2
    └── final/             # Complete demo state
```

## File Formats

- **Metadata**: JSON files, validated by Pydantic models on load
- **Source Data**: CSV files in `data/csv/`, auto-converted to Parquet
- **Engine Data**: Parquet files, registered as DuckDB views
- **Results**: Parquet files with companion summary CSVs
- **Alerts**: JSON trace files with full calculation and settings lineage
- **Snapshots**: Complete copies of workspace state at demo checkpoints
