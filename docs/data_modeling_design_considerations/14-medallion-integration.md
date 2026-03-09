# Medallion Integration: Where Proposed Tables Live

**Document**: 14 of the Data Modeling Design Considerations series
**Audience**: Data Engineers, Architects
**Last updated**: 2026-03-09

---

## 1. Medallion Tier Overview

The platform uses an 11-tier medallion architecture defined in `workspace/metadata/medallion/tiers.json`. Each tier serves a distinct purpose in the data lifecycle, with dedicated storage formats, retention policies, quality gates, and access controls.

| # | Tier | Purpose | Data State | Storage | Retention | Quality Gate | Access |
|---|------|---------|------------|---------|-----------|--------------|--------|
| 1 | **Landing/Staging** | Raw ingestion zone --- files, streams, APIs arrive as-is | raw | original | 7 days | schema_detection | data_engineering |
| 2 | **Bronze** | Type-cast, deduplicated, timestamped --- single version of truth for raw data | typed | parquet | 30 days | type_validation | data_engineering |
| 3 | **Quarantine/Error** | Failed validation records --- flagged for investigation or reprocessing | invalid | parquet | 90 days | quarantine_reason | data_engineering |
| 4 | **Silver** | Canonical entities --- mapped to standard entity model (ISO/FIX-aligned) | canonical | parquet | 365 days | referential_integrity | data_analyst |
| 5 | **Gold** | Business-ready aggregations --- calculations, scores, detection results | aggregated | parquet | 365 days | calculation_validation | business_user |
| 6 | **Platinum/Diamond** | Pre-built KPIs, executive dashboards, regulatory report datasets | kpi_ready | parquet | 365 days | completeness_sla | executive |
| 7 | **Reference/MDM** | Master data --- golden records for products, venues, accounts, traders | master | parquet | indefinite | cross_source_reconciliation | data_steward |
| 8 | **Sandbox/Lab** | Isolated testing --- what-if analysis, threshold tuning, model backtesting | copy_on_write | parquet | 7 days | isolation_check | data_scientist |
| 9 | **Logging/Audit** | Pipeline execution logs, user actions, metadata changes, compliance audit trail | event_log | parquet | 2555 days | tamper_evident | compliance |
| 10 | **Metrics/Observability** | Pipeline health, data quality scores, SLA compliance, drift detection | time_series | parquet | 90 days | anomaly_detection | platform_engineer |
| 11 | **Archive/Cold** | Regulatory retention --- compressed, encrypted, immutable cold storage | archived | compressed_parquet | 2555 days | retention_compliance | compliance |

Key properties that govern tier placement decisions:

- **Mutability**: Only Reference/MDM, Quarantine, and Sandbox allow updates. All other tiers are append-only or immutable.
- **Retention**: Configuration data (Reference/MDM) is retained indefinitely. Compliance-sensitive tiers (Logging, Archive) retain for 2555 days (~7 years). Transient tiers (Landing, Sandbox) expire in 7 days.
- **Access**: Tiers enforce role-based access from `data_engineering` (lowest sensitivity) through `compliance` (highest sensitivity).

---

## 2. Where Proposed Tables Live

| Table | Tier | Tier # | Rationale |
|---|---|---|---|
| `match_patterns` | **Reference/MDM** | 7 | Immutable configuration data defining reusable match criteria. Versioned with effective dates. Retention: indefinite. Treated as master data alongside golden records for products, venues, accounts, and traders. |
| `match_pattern_attributes` | **Reference/MDM** | 7 | Detail rows for each match pattern (the 3-column `pattern_key`, `entity`, `entity_attribute` structure). Versioned in lockstep with the parent `match_patterns` row. |
| `calc_definitions` | **Reference/MDM** | 7 | Calculation metadata (formula references, source entity dependencies, output types). Rarely changes after initial definition. Same governance as entity schemas. |
| `calc_pattern_bindings` | **Reference/MDM** | 7 | The cross-product binding of calculations to match patterns. Defines which calculations apply to which market segments. Configuration that changes only when models are reconfigured. |
| `calc_settings` | **Reference/MDM** | 7 | Parameterized settings (thresholds, percentile targets, lookback periods) resolved by the settings engine. Versioned, auditable, data-steward-managed. |
| `detection_models` | **Reference/MDM** | 7 | Model definitions (model_id, name, enabled calculations, regulatory mapping). Core configuration that drives the entire detection pipeline. |
| `model_calculations` | **Reference/MDM** | 7 | Junction table linking models to their constituent calculations with weights. Defines model composition. |
| `score_steps` | **Reference/MDM** | 7 | Graduated scoring templates (min/max value ranges mapped to score points). Configuration that defines how raw calculation values translate to risk scores. |
| `time_windows` | **Gold** | 5 | Business-ready computed time window results per detection run. Produced during the Enrichment/Aggregation pipeline stages. Contains `window_start`, `window_end`, `grain_key`, `window_type` per run. |
| `calc_results` | **Gold** | 5 | Business-ready calculation outputs per run. The star schema fact table containing `primary_value`, `secondary_value`, dimensional keys, and `computed_at` timestamps. Fed directly into detection models. |
| `alerts` | **Platinum/Diamond** | 6 | Pre-built alert summaries aggregated from Gold-tier detection results. Alert counts, score distributions, model effectiveness KPIs. Consumed by executive dashboards and regulatory report datasets. |
| `alert_traces` | **Sandbox/Lab** | 8 | Investigation-ready detailed traces showing step-by-step score computation. Mutable (investigators annotate). Isolated from production Gold/Platinum data. Short retention (7 days active, then archived). |
| `score_breakdowns` | **Sandbox/Lab** | 8 | Detailed per-calculation, per-step scoring decomposition for investigation. Allows analysts to drill into why a specific alert scored as it did. Same isolation and mutability as `alert_traces`. |
| Historical patterns | **Archive/Cold** | 11 | Aged-out `calc_results`, `time_windows`, and `alerts` compressed for regulatory retention. 2555-day retention (~7 years) satisfies MAR, MiFID II, and Dodd-Frank record-keeping requirements. |
| Raw calculation logs | **Bronze** | 2 | Unprocessed computation logs from the calculation engine --- timestamps, input hashes, execution durations. Type-cast and deduplicated but not yet mapped to canonical schema. 30-day retention. |

### Placement Principles

1. **Configuration vs. results**: Tables that define *what* to compute live in Reference/MDM. Tables that hold *computed outputs* live in Gold or Platinum.
2. **Investigation mutability**: Any table that analysts modify during investigation (annotations, dispositions) must live in Sandbox, which is the only mutable tier with `copy_on_write` semantics.
3. **Regulatory retention**: Anything subject to regulatory record-keeping requirements eventually flows to Archive with compressed parquet and 7-year retention.
4. **Access separation**: Configuration (Reference/MDM, `data_steward` access) is separated from results (Gold, `business_user` access) and from KPIs (Platinum, `executive` access).

---

## 3. Data Contracts for calc_results

The `calc_results` table crosses the Silver-to-Gold boundary, which already has an existing contract (`silver_to_gold_calc_results` in `workspace/metadata/medallion/contracts/`). The proposed tables require extending this contract with the following quality gates:

### Completeness

All expected `(calc_id, business_date)` combinations must be present. For a given detection run, if a model references 4 calculations and the run covers 50 products, the contract expects 200 result rows (minus any products excluded by match pattern filters). Completeness threshold: **99.5%** (matching the existing contract SLA).

```
rule: completeness
check: COUNT(DISTINCT (calc_id, business_date)) >= expected_combinations * 0.995
```

### Uniqueness

No duplicate `(calc_id, product_id, account_id, business_date)` rows within a single run. A duplicate indicates the calculation engine produced conflicting results for the same grain.

```
rule: unique
fields: [calc_id, product_id, account_id, business_date, run_id]
```

### Freshness

The `computed_at` timestamp must fall within the expected SLA window. For the Silver-to-Gold transition, the existing contract specifies **30 minutes** (`freshness_minutes: 30`). The extended contract should enforce this per-calculation:

```
rule: freshness
field: computed_at
max_age_minutes: 30
```

### Validity

The `primary_value` must fall within an expected range per `calc_id`. This prevents nonsensical outputs (negative volumes, percentages above 100) from propagating to detection models.

```
rule: range_check
field: primary_value
min: 0
dynamic_max: resolved from calc_definitions.expected_range
```

Examples:
- `trade_value`: min 0, no upper bound
- `vwap_proximity`: min 0, max 1.0 (ratio)
- `volume_concentration`: min 0, max 1.0 (percentage)

### Referential Integrity

All foreign key references in `calc_results` must resolve to existing records:

```
rule: referential_integrity
checks:
  - field: calc_id      -> reference: calc_definitions.calc_id      (Reference/MDM)
  - field: product_id   -> reference: product.product_id            (Silver/Reference)
  - field: account_id   -> reference: account.account_id            (Silver/Reference)
  - field: model_id     -> reference: detection_models.model_id     (Reference/MDM)
```

### Proposed Contract Definition

Following the structure of existing contracts (e.g., `silver_to_gold_calc_results.json`):

```json
{
  "contract_id": "silver_to_gold_calc_results_extended",
  "source_tier": "silver",
  "target_tier": "gold",
  "entity": "calc_results",
  "description": "Extended quality contract for calc_results: completeness, uniqueness, freshness, validity, and referential integrity",
  "field_mappings": [
    {"source": "execution_id", "target": "execution_id", "transform": "passthrough"},
    {"source": "product_id", "target": "product_id", "transform": "passthrough"},
    {"source": "calculated_value", "target": "primary_value", "transform": "passthrough"},
    {"source": "calc_id", "target": "calc_id", "transform": "passthrough"},
    {"source": "business_date", "target": "business_date", "transform": "passthrough"}
  ],
  "quality_rules": [
    {"rule": "not_null", "fields": ["calc_id", "product_id", "business_date", "primary_value", "computed_at"]},
    {"rule": "unique", "fields": ["calc_id", "product_id", "account_id", "business_date", "run_id"]},
    {"rule": "range_check", "field": "primary_value", "min": 0},
    {"rule": "referential_integrity", "field": "calc_id", "reference": "calc_definitions.calc_id"},
    {"rule": "referential_integrity", "field": "product_id", "reference": "product.product_id"},
    {"rule": "freshness", "field": "computed_at", "max_age_minutes": 30}
  ],
  "sla": {"freshness_minutes": 30, "completeness_pct": 99.5},
  "owner": "surveillance-ops",
  "classification": "internal"
}
```

---

## 4. Pipeline Stage Integration

The current pipeline has 10 stages defined in `workspace/metadata/medallion/pipeline_stages.json`. The proposed tables integrate at specific stages without altering the existing flow:

| Stage | Pipeline Stage | Tier Transition | Proposed Table Activity |
|---|---|---|---|
| 1 | **Ingest to Landing** | null -> Landing | --- |
| 2 | **Landing to Bronze** | Landing -> Bronze | `raw calculation logs` written here (engine execution telemetry) |
| 3 | **Bronze to Silver** | Bronze -> Silver | --- (entity canonicalization only) |
| 4 | **Silver to Gold** | Silver -> Gold | `time_windows` computed during enrichment; `calc_results` populated during aggregation. Both written atomically per run. Contract `silver_to_gold_calc_results` validated at this boundary. |
| 5 | **Gold to Platinum** | Gold -> Platinum | `alerts` aggregated from `calc_results` + detection model scoring. Alert summaries, score distributions, and model effectiveness KPIs materialized. Contract `gold_to_platinum_kpi` validated. |
| 6 | **Silver to Reference** | Silver -> Reference | `match_patterns`, `calc_definitions`, `detection_models`, and all other configuration tables reconciled via `cross_source_reconciliation` quality gate. Existing contracts: `silver_to_reference_product`, `silver_to_reference_account`, `silver_to_reference_trader`, `silver_to_reference_venue`. |
| 7 | **Gold to Sandbox** | Gold -> Sandbox | `alert_traces` and `score_breakdowns` snapshot from Gold-tier detection outputs for investigation. Contract `gold_to_sandbox` validated (isolation_check, freshness). |
| 8 | **Gold to Archive** | Gold -> Archive | Aged `calc_results` and `time_windows` exported to compressed cold storage. Contract `gold_to_archive` validated (retention_compliance, checksum). |
| 9 | **Case Creation** | Gold -> Sandbox | Cases created from alerts (existing `gold_to_sandbox_cases` contract). Not directly affected by proposed tables. |
| 10 | **Case Archival** | Sandbox -> Archive | Resolved cases archived (existing `sandbox_to_archive_cases` contract). Not directly affected by proposed tables. |

### Key Integration Points

**Stage 4 (Silver to Gold)** is where the core computation happens. The existing `silver_to_gold` stage already processes `alert` and `calculation_result` entities (per `pipeline_stages.json`). The proposed tables formalize what "calculation_result" means:

1. The calculation engine resolves `calc_pattern_bindings` + `calc_settings` from Reference/MDM
2. For each binding, it evaluates `time_windows` (simple windows precomputed, complex windows computed on-the-fly)
3. Results are written to `calc_results` with full dimensional keys
4. The contract validator checks completeness, uniqueness, freshness, validity, and referential integrity
5. Failed records route to Quarantine (tier 3) with error metadata

**Stage 5 (Gold to Platinum)** consumes `calc_results` to produce alerts:

1. Detection models read `model_calculations` to determine which `calc_results` to score
2. `score_steps` from Reference/MDM define the graduated scoring logic
3. Multi-dimensional scores aggregate into final alert scores
4. Alert summaries materialize in Platinum for executive dashboards

---

## 5. Data Flow Diagram

```
                        CONFIGURATION (Reference/MDM, Tier 7)
                        Retention: indefinite | Access: data_steward
    ┌─────────────────────────────────────────────────────────────────┐
    │  match_patterns ──> match_pattern_attributes                   │
    │  calc_definitions ──> calc_pattern_bindings                    │
    │  calc_settings                                                 │
    │  detection_models ──> model_calculations ──> score_steps       │
    └─────────────────┬───────────────────────────┬───────────────────┘
                      │ (read at runtime)         │
                      ▼                           │
    ┌──────────────────────────┐                  │
    │  LANDING (Tier 1)        │                  │
    │  Raw files/streams/APIs  │                  │
    └────────┬─────────────────┘                  │
             │ schema_detection                   │
             ▼                                    │
    ┌──────────────────────────┐                  │
    │  BRONZE (Tier 2)         │                  │
    │  raw_calculation_logs    │◄── engine telemetry
    │  typed entity records    │                  │
    └────────┬─────────────────┘                  │
             │ type_validation                    │
             ▼                                    │
    ┌──────────────────────────┐                  │
    │  SILVER (Tier 4)         │                  │
    │  Canonical entities      │                  │
    │  (ISO/FIX-aligned)       │                  │
    └────────┬─────────────────┘                  │
             │ referential_integrity              │
             ▼                                    │
    ┌──────────────────────────────────────────┐  │
    │  GOLD (Tier 5)                           │  │
    │  ┌──────────────┐  ┌──────────────────┐  │  │
    │  │ time_windows  │  │  calc_results    │◄─┼──┘
    │  │ (precomputed) │──│  (star schema)   │  │
    │  └──────────────┘  └───────┬──────────┘  │
    │                            │              │
    │  calculation_validation    │              │
    └──────────┬─────────────────┼──────────────┘
               │                 │
     ┌─────────┤                 │
     │         ▼                 │
     │  ┌─────────────────────┐  │
     │  │ PLATINUM (Tier 6)   │  │
     │  │ alerts (summaries)  │  │
     │  │ score_distribution  │  │
     │  │ model_effectiveness │  │
     │  │ regulatory_reports  │  │
     │  └────────┬────────────┘  │
     │           │               │
     │    completeness_sla       │
     │           │               │
     │           ▼               ▼
     │  ┌──────────────────────────────┐
     │  │ SANDBOX (Tier 8)             │
     │  │ alert_traces (mutable)       │
     │  │ score_breakdowns (mutable)   │
     │  │ investigation cases          │
     │  └──────────┬───────────────────┘
     │             │
     │      isolation_check
     │             │
     ▼             ▼
    ┌──────────────────────────────────┐
    │  ARCHIVE (Tier 11)               │
    │  Historical calc_results         │
    │  Historical time_windows         │
    │  Historical alerts               │
    │  Resolved cases                  │
    │  retention: 2555 days (~7 yrs)   │
    │  format: compressed_parquet      │
    └──────────────────────────────────┘

    ┌──────────────────────────────────┐
    │  QUARANTINE (Tier 3)             │◄── Failed contracts at ANY
    │  Failed calc_results             │    tier boundary route here
    │  Failed time_windows             │    with error metadata
    │  Invalid records                 │
    └──────────────────────────────────┘

    ┌──────────────────────────────────┐
    │  LOGGING/AUDIT (Tier 9)          │◄── All tier transitions
    │  Pipeline execution logs         │    append audit records
    │  Contract validation results     │
    │  retention: 2555 days            │
    └──────────────────────────────────┘

    ┌──────────────────────────────────┐
    │  METRICS/OBSERVABILITY (Tier 10) │◄── Pipeline health,
    │  Quality scores per tier         │    SLA compliance,
    │  Contract pass/fail rates        │    drift detection
    │  Freshness tracking              │
    └──────────────────────────────────┘
```

---

## 6. Contract Enforcement

### Enforcement Model

Data contracts are validated at every tier boundary. The contract validator (`backend/services/contract_validator.py`) runs quality rules defined in JSON contract files under `workspace/metadata/medallion/contracts/`. Each contract specifies:

- **Field mappings**: source-to-target column transformations
- **Quality rules**: not_null, unique, range_check, referential_integrity, regex, enum_check, completeness, freshness
- **SLA**: freshness (minutes) and completeness (percentage) thresholds
- **Owner**: team responsible for the contract
- **Classification**: data sensitivity level (internal, confidential, restricted)

### Failed Contracts Route to Quarantine

When a record fails any quality rule during a tier transition, it is routed to the Quarantine tier (tier 3) with error metadata:

- `quarantine_reason`: which rule failed
- `source_tier`: where the record came from
- `target_tier`: where it was headed
- `contract_id`: which contract was violated
- `failed_at`: timestamp of failure
- `error_detail`: specific field-level failure information

Quarantine is the only tier besides Reference/MDM and Sandbox that allows mutation --- records can be corrected and reprocessed.

### Existing Contracts (from `workspace/metadata/medallion/contracts/`)

| Contract ID | Transition | Entity |
|---|---|---|
| `landing_to_bronze_execution` | Landing -> Bronze | execution |
| `landing_to_bronze_order` | Landing -> Bronze | order |
| `landing_to_bronze_product` | Landing -> Bronze | product |
| `bronze_to_silver_execution` | Bronze -> Silver | execution |
| `bronze_to_silver_order` | Bronze -> Silver | order |
| `silver_to_gold_alerts` | Silver -> Gold | alert |
| `silver_to_gold_calc_results` | Silver -> Gold | calculation_result |
| `silver_to_reference_product` | Silver -> Reference | product |
| `silver_to_reference_account` | Silver -> Reference | account |
| `silver_to_reference_trader` | Silver -> Reference | trader |
| `silver_to_reference_venue` | Silver -> Reference | venue |
| `gold_to_platinum_kpi` | Gold -> Platinum | kpi |
| `gold_to_sandbox` | Gold -> Sandbox | sandbox_snapshot |
| `gold_to_archive` | Gold -> Archive | archive_export |
| `gold_to_sandbox_cases` | Gold -> Sandbox | case |
| `sandbox_to_archive_cases` | Sandbox -> Archive | case |

### New Contracts Needed

The proposed tables require new contracts for transitions that do not yet have formal definitions:

| New Contract ID | Transition | Entity | Key Quality Rules |
|---|---|---|---|
| `silver_to_gold_calc_results_extended` | Silver -> Gold | calc_results | completeness (99.5%), uniqueness on composite key, freshness (30 min), range_check per calc_id, referential integrity to calc_definitions |
| `silver_to_gold_time_windows` | Silver -> Gold | time_windows | not_null on window boundaries, uniqueness on (grain_key, window_type, run_id), freshness (30 min), validity (window_end > window_start) |
| `gold_to_sandbox_traces` | Gold -> Sandbox | alert_traces | isolation_check, freshness (60 min), referential integrity to alerts |
| `gold_to_sandbox_breakdowns` | Gold -> Sandbox | score_breakdowns | isolation_check, freshness (60 min), referential integrity to calc_results |
| `gold_to_archive_calc_results` | Gold -> Archive | calc_results | retention_compliance, checksum_validation, completeness (100%) |
| `gold_to_archive_time_windows` | Gold -> Archive | time_windows | retention_compliance, checksum_validation, completeness (100%) |

These contracts should be added to `workspace/metadata/medallion/contracts/` following the existing JSON structure and registered in the pipeline orchestrator (`backend/services/pipeline_orchestrator.py`).

---

## Cross-References

- Medallion tier definitions: `workspace/metadata/medallion/tiers.json`
- Pipeline stage definitions: `workspace/metadata/medallion/pipeline_stages.json`
- Existing contracts: `workspace/metadata/medallion/contracts/*.json`
- Contract validator: `backend/services/contract_validator.py`
- Pipeline orchestrator: `backend/services/pipeline_orchestrator.py`
- Lakehouse service: `backend/services/lakehouse_service.py`
- Quarantine service: `backend/services/quarantine_service.py`
- Quality engine: `backend/engine/quality_engine.py`
- Table schemas: `appendices/A-complete-table-schemas.md`
- Scoring pipeline: `10-scoring-and-alerting-pipeline.md`
- Settings resolution: `12-settings-resolution-patterns.md`
