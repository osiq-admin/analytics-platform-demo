# Analytics Platform Demo — Comprehensive Roadmap & Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the analytics platform into a fully metadata-driven, medallion-architected trade surveillance system with production-grade data governance, regulatory traceability, PII handling, business glossary, and platform-portable metadata — ready to migrate from local DuckDB to any cloud data platform.

**Architecture:** 11-tier medallion architecture (Landing → Bronze → Quarantine → Silver → Gold → Platinum → Reference/MDM → Sandbox → Logging/Audit → Metrics/Observability → Archive). All data transformations, quality gates, governance rules, and business definitions are metadata-driven JSON — no hardcoded logic. Connector abstraction layer supports local files today, streaming queues and APIs tomorrow. Metadata portability enables migration to Snowflake, Databricks, BigQuery, or any platform via SQLMesh transpilation and Arrow interchange.

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript + Vite (frontend). Existing metadata JSON + Pydantic models. SQLMesh for platform-agnostic pipeline definitions. Apache Arrow/Parquet for universal data interchange. No new database technology for demo (DuckDB sufficient), but architecture designed for cloud migration.

---

## Current State Assessment

**What's built (Phases 1-19 + 7B + Overhauls, M0-M227):**
- 8 entities (product, execution, order, md_eod, md_intraday, venue, account, trader)
- 10 calculations across 4 layers (transaction → time_window → aggregation → derived)
- 5 detection models (wash trading x2, spoofing, market price ramping, insider dealing)
- 20 frontend views, 929 tests (705 backend + 224 E2E), Playwright verified
- Settings system with hierarchical overrides (already exemplary metadata-driven design)
- 81.9% metadata-driven (94 sections across 20 views)
- 11-tier medallion architecture with data contracts, transformations, and pipeline stages
- Bronze→Silver mapping engine with metadata-driven MappingStudio
- Data quality engine with ISO 8000/25012 dimensions, quarantine service, DataQuality view
- Reference Data/MDM tier with 301 golden records, reconciliation engine, field-level provenance
- 32 guided scenarios, 122 operation scripts, 8 demo checkpoints

**What's already metadata-driven (~83.1%):**
- Calculation definitions: JSON with SQL logic, inputs, outputs, DAG dependencies
- Detection models: JSON with query, scoring, alert templates
- Settings: JSON with hierarchical overrides, priority system, context-aware resolution
- Entity definitions: JSON with field schemas, relationships, domain values
- Navigation, widgets, format rules, grid columns, view tabs, theme palettes, workflows, tours
- ISO/FIX/compliance standards metadata
- OOB vs user-defined metadata layers

**Critical gaps for medallion architecture:**
- No tiered data processing (all data goes CSV → Parquet → DuckDB in one step)
- MappingStudio is UI-only prototype — mappings not persisted or used in pipeline
- No raw-to-canonical entity mapping (source format → standard entity)
- No canonical-to-calculation attribute mapping (entity fields → calc inputs)
- No data quality gates or quarantine tier
- No data classification, PII detection, or sensitivity marking
- No masking or encryption of sensitive fields
- No business glossary or semantic layer
- No data lineage tracking (OpenLineage)
- No connector abstraction (hardcoded CSV file reader)
- No platform migration support (DuckDB-specific SQL throughout)

---

## Architectural Vision: 11-Tier Medallion Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MEDALLION ARCHITECTURE TIERS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ LANDING  │→ │  BRONZE  │→ │  SILVER  │→ │   GOLD   │→ │ PLATINUM │ │
│  │ Raw      │  │ Typed +  │  │ Canonical│  │ Business │  │ Pre-built│ │
│  │ ingested │  │ validated│  │ entities │  │ aggreg.  │  │ KPIs &   │ │
│  │ as-is    │  │ quality  │  │ mapped   │  │ calcs    │  │ summaries│ │
│  └──────────┘  └────┬─────┘  └──────────┘  └──────────┘  └──────────┘ │
│                     │                                                   │
│                     ↓ (failed)                                          │
│               ┌──────────┐                                              │
│               │QUARANTINE│                                              │
│               │ Flagged  │                                              │
│               │ records  │                                              │
│               └──────────┘                                              │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ CROSS-CUTTING TIERS                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │REFERENCE │  │ SANDBOX  │  │ LOGGING  │  │ METRICS  │         │  │
│  │  │ MDM,     │  │ Lab for  │  │ Audit &  │  │ Pipeline │         │  │
│  │  │ golden   │  │ what-if  │  │ lineage  │  │ health   │         │  │
│  │  │ records  │  │ testing  │  │ traces   │  │ KPIs     │         │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │  │
│  │  ┌──────────┐                                                     │  │
│  │  │ ARCHIVE  │                                                     │  │
│  │  │ Cold     │                                                     │  │
│  │  │ storage  │                                                     │  │
│  │  │ retention│                                                     │  │
│  │  └──────────┘                                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tier Definitions

| # | Tier | Purpose | Data State | Quality Gate |
|---|------|---------|-----------|--------------|
| T1 | **Landing/Staging** | Raw ingestion zone — files, streams, APIs arrive as-is | Raw bytes/text, original format | Schema detection, basic integrity |
| T2 | **Bronze** | Type-cast, deduplicated, timestamped — "single version of truth" for raw data | Typed columns, append-only | Type validation, null checks, dedup |
| T3 | **Quarantine/Error** | Failed validation records — flagged for investigation or reprocessing | Invalid/suspicious records | Quarantine reason, retry policy |
| T4 | **Silver** | Canonical entities — mapped to standard entity model (ISO/FIX-aligned) | Canonical schema, relationships | Referential integrity, business rules |
| T5 | **Gold** | Business-ready aggregations — calculations, scores, detection results | Aggregated, scored, enriched | Calculation validation, score bounds |
| T6 | **Platinum/Diamond** | Pre-built KPIs, executive dashboards, regulatory report datasets | KPIs, summaries, report-ready | Completeness, freshness SLA |
| T7 | **Reference/MDM** | Master data — golden records for products, venues, accounts, traders | Deduplicated master records | Cross-source reconciliation |
| T8 | **Sandbox/Lab** | Isolated testing — what-if analysis, threshold tuning, model backtesting | Copy-on-write from any tier | No production impact guarantee |
| T9 | **Logging/Audit** | Pipeline execution logs, user actions, metadata changes, compliance audit trail | Append-only event records | Tamper-evident, retention compliance |
| T10 | **Metrics/Observability** | Pipeline health, data quality scores, SLA compliance, drift detection | Time-series metrics | Alerting thresholds, anomaly detection |
| T11 | **Archive/Cold** | Regulatory retention — compressed, encrypted, immutable cold storage | Compressed Parquet + metadata | Retention policy, crypto-shredding ready |

### Data Contracts (Between Tiers)

Each tier boundary is governed by a **data contract** — a metadata-defined agreement specifying:

```json
{
  "contract_id": "bronze_to_silver_execution",
  "source_tier": "bronze",
  "target_tier": "silver",
  "entity": "execution",
  "schema": { "fields": [...], "required": [...], "types": {...} },
  "quality_rules": [
    { "rule": "not_null", "fields": ["execution_id", "order_id", "timestamp"] },
    { "rule": "referential_integrity", "field": "order_id", "reference": "order.order_id" },
    { "rule": "range_check", "field": "quantity", "min": 0 },
    { "rule": "enum_check", "field": "exec_type", "values": ["NEW", "PARTIAL", "FILL", "CANCEL"] }
  ],
  "sla": { "freshness_minutes": 15, "completeness_pct": 99.5 },
  "owner": "data-engineering",
  "classification": { "sensitivity": "confidential", "pii_fields": ["trader_id", "account_id"] }
}
```

### Data Classification Taxonomy

| Level | Label | Description | Handling |
|-------|-------|-------------|----------|
| L0 | **Public** | Market data (EOD prices, venue info) | No restrictions |
| L1 | **Internal** | Aggregated analytics, pipeline metrics | Internal use only |
| L2 | **Confidential** | Order/execution data, account details | Encrypted at rest, access-logged |
| L3 | **Restricted** | Detection model thresholds, scoring logic | Need-to-know basis |
| L4 | **PII** | Trader names, account holder info, beneficial ownership | Masked by default, GDPR/CCPA compliant |
| L5 | **Market-Sensitive** | Pre-trade intelligence, material non-public info | Strict compartmentalization |

### Column-Level Sensitivity Metadata

Every entity field carries governance metadata:

```json
{
  "field_name": "trader_id",
  "data_type": "string",
  "classification": "L4_PII",
  "pii_category": "direct_identifier",
  "masking_policy": "tokenize",
  "masking_function": "hash_sha256_salt",
  "encryption": "column_level_aes256",
  "retention_days": 2555,
  "gdpr_lawful_basis": "legitimate_interest",
  "gdpr_data_subject_category": "employee",
  "right_to_erasure": true,
  "crypto_shredding_key_group": "trader_pii"
}
```

---

## Roadmap Phases

### Completed Phases (M0-M173)

| Phase | Milestone Range | Status | Summary |
|-------|----------------|--------|---------|
| Phases 1-6 | M0-M65 | COMPLETE | 8 entities, 10 calculations, 5 detection models, 16 views |
| Phase 7 | M66-M69 | COMPLETE | Dynamic metadata foundation, CRUD APIs |
| Phase 8 | M70-M73 | COMPLETE | Explainability & drill-down |
| Phase 9 | M74-M78 | COMPLETE | Metadata editor (JSON + visual) |
| Phase 10 | M79-M83 | COMPLETE | Regulatory traceability |
| Phase 11 | M84-M88 | COMPLETE | OOB vs user-defined separation |
| Phase 12 | M89-M92 | COMPLETE | UI/UX usability |
| Phase 7B | M93-M120 | COMPLETE | Metadata UX, guided demo, use case studio |
| Architecture Traceability | M128 | COMPLETE | 74 traced sections |
| Metadata Architecture Overhaul | M129-M150 | COMPLETE | Navigation, widgets, format rules, audit trail |
| Compliance & Metadata Phase 2 | M151-M173 | COMPLETE | ISO/FIX/compliance, grid columns, themes, workflows |

---

### Tier 0 — Quick Wins

### Phase 13: Data Calibration & Alert Distribution Fix (**COMPLETE** — M174)

*Fix alert distribution skew so detection models fire realistic, balanced alerts across entities.*

**Status:** COMPLETE (2026-02-27). See `docs/plans/2026-02-27-phase13-data-calibration.md` for implementation plan.

**Results:**
- **F-001 FIXED**: MPR reduced from 96% to 68% of alerts — realistic for surveillance
- **F-010 FIXED**: All 5 asset classes now have alerts (equity 55, FI 12, index 7, commodity 4, FX 4)
- **82 total alerts**: MPR 56, wash_full_day 7, wash_intraday 7, insider 7, spoofing 5
- **Key changes**: Cross-asset normal trading (FX/FI/futures), 9 new detection patterns, trend_sensitivity 1.5→3.5, MPR score threshold calibration, SettingsResolver pipeline bug fix, spoofing pattern count fix
- **Data**: execution 509→761, order 782→786, intraday includes fixed income

---

### Tier 1 — Medallion Architecture Foundation

### Phase 14: Medallion Architecture Core

*Define the 11-tier data architecture, tier metadata schema, data contract framework, and pipeline orchestration model.*

**Goal:** Establish the foundational metadata schema for the medallion architecture. Define tier definitions, data contracts between tiers, pipeline stage metadata, and the transformation registry. This is the "skeleton" that all subsequent phases flesh out.

**Tasks:**

#### Task 14.1: Tier definition metadata
- **Create:** `workspace/metadata/medallion/tiers.json` — 11 tier definitions with properties:
  ```json
  {
    "tiers": [
      {
        "tier_id": "landing",
        "tier_number": 1,
        "name": "Landing/Staging",
        "purpose": "Raw ingestion zone",
        "data_state": "raw",
        "storage_format": "original",
        "retention_policy": "7_days",
        "quality_gate": "schema_detection",
        "access_level": "data_engineering",
        "mutable": false,
        "append_only": true
      }
    ]
  }
  ```

#### Task 14.2: Data contract metadata schema
- **Create:** `workspace/metadata/medallion/contracts/` — per-entity, per-tier-boundary contracts
- Contracts define: source tier, target tier, entity, field mappings, quality rules, SLAs, owner, classification
- **Create:** `backend/models/medallion.py` — Pydantic models for Tier, DataContract, QualityRule, TransformationStep

#### Task 14.3: Transformation registry
- **Create:** `workspace/metadata/medallion/transformations/` — metadata defining each tier-to-tier transformation
- Each transformation specifies: source query, target schema, field mappings, quality checks, error handling
- Transformations are metadata-driven SQL templates with `$param` substitution (same pattern as calculations)

#### Task 14.4: Pipeline stage metadata
- **Create:** `workspace/metadata/medallion/pipeline_stages.json` — ordered execution plan
- Define execution order, dependencies, parallelism hints, retry policies
- Integrate with existing `PipelineMonitor` view for visualization

#### Task 14.5: Medallion API endpoints
- **Create:** `backend/api/medallion.py` — CRUD endpoints for tiers, contracts, transformations
- `GET /api/medallion/tiers` — list all tiers with status
- `GET /api/medallion/contracts` — list data contracts
- `GET /api/medallion/lineage/{entity}` — tier-to-tier lineage graph
- `POST /api/medallion/validate-contract` — validate a contract definition

#### Task 14.6: Medallion overview view (frontend)
- **Create:** `frontend/src/views/MedallionOverview/index.tsx` — React Flow diagram of 11 tiers
- Clickable tiers showing: entity count, record count, last refresh, quality score
- Data contract edges showing: field mapping count, quality rule count, SLA status
- Integrated with PipelineMonitor for execution status

---

### Phase 15: Data Onboarding & Connector Abstraction

*Enable ingestion of data from any source format — local files, streaming queues, APIs — through a metadata-driven connector framework.*

**Goal:** Replace the hardcoded CSV reader with a connector abstraction layer. Users can onboard data in any format (CSV, JSON, XML, FIX, Excel, Parquet), and the system detects schemas, profiles data quality, and stages it in the Landing tier. Architecture is local-first but designed to swap connectors for Kafka, REST APIs, FIX protocol, etc.

**Tasks:**

#### Task 15.1: Connector abstraction layer
- **Create:** `backend/connectors/base.py` — abstract base connector interface:
  ```python
  class BaseConnector(ABC):
      @abstractmethod
      def connect(self, config: ConnectorConfig) -> Connection
      @abstractmethod
      def read(self, connection: Connection, params: ReadParams) -> pa.Table
      @abstractmethod
      def schema(self, connection: Connection) -> pa.Schema
      @abstractmethod
      def profile(self, connection: Connection) -> DataProfile
  ```
- **Create:** `backend/connectors/local_file.py` — CSV, JSON, Parquet, Excel, XML support
- **Create:** `backend/connectors/fix_protocol.py` — FIX message parsing (FIX 4.2/4.4/5.0)
- **Create:** `backend/connectors/streaming_stub.py` — Kafka/queue stub (interface ready, local mock)
- **Create:** `backend/connectors/api_stub.py` — REST/GraphQL API stub (interface ready, local mock)

#### Task 15.2: Connector metadata
- **Create:** `workspace/metadata/connectors/` — connector definitions as JSON:
  ```json
  {
    "connector_id": "local_csv",
    "connector_type": "local_file",
    "format": "csv",
    "config": {
      "delimiter": ",",
      "encoding": "utf-8",
      "header_row": true,
      "date_format": "ISO8601"
    },
    "schema_detection": "auto",
    "quality_profile": true,
    "landing_tier": "landing",
    "target_entity": "execution"
  }
  ```

#### Task 15.3: Schema detection & data profiling
- **Create:** `backend/services/schema_detector.py` — auto-detect column types, formats, patterns
- **Create:** `backend/services/data_profiler.py` — profile completeness, cardinality, distribution, outliers
- Profile output stored as metadata in `workspace/metadata/medallion/profiles/`
- DuckDB `SUMMARIZE` + PyArrow schema inference for local implementation

#### Task 15.4: Data onboarding API
- **Create:** `backend/api/onboarding.py` — endpoints for data ingestion workflow:
  - `POST /api/onboarding/upload` — upload file, detect schema, profile
  - `GET /api/onboarding/preview/{job_id}` — preview detected schema + sample data
  - `POST /api/onboarding/confirm/{job_id}` — confirm and stage to Landing tier
  - `GET /api/onboarding/connectors` — list available connectors
  - `POST /api/onboarding/connectors` — register new connector

#### Task 15.5: Data onboarding view (frontend)
- **Create:** `frontend/src/views/DataOnboarding/index.tsx` — guided onboarding wizard:
  1. **Select Source** — file upload, connector selection, URL input
  2. **Detect Schema** — auto-detected schema with type correction UI
  3. **Profile Data** — quality report (nulls, duplicates, outliers, patterns)
  4. **Map to Entity** — suggest target entity based on field name similarity
  5. **Confirm & Ingest** — stage to Landing tier, create data contract draft

---

### Phase 16: Source-to-Canonical Mapping (Bronze → Silver)

*Overhaul MappingStudio to enable mapping from raw source fields to canonical entity attributes.*

**Goal:** Transform MappingStudio from a UI-only prototype into a functional mapping engine. Users map source fields (from any ingested format) to canonical entity fields (ISO/FIX-aligned). Mappings are persisted as metadata and executed in the Bronze → Silver transformation.

**Tasks:**

#### Task 16.1: Mapping definition metadata
- **Create:** `workspace/metadata/mappings/source_to_canonical/` — per-entity mapping definitions:
  ```json
  {
    "mapping_id": "csv_trades_to_execution",
    "source_connector": "local_csv",
    "source_schema": "raw_trades",
    "target_entity": "execution",
    "tier_transition": "bronze_to_silver",
    "field_mappings": [
      {
        "source_field": "TradeID",
        "target_field": "execution_id",
        "transformation": "direct",
        "required": true
      },
      {
        "source_field": "TradeDate",
        "target_field": "timestamp",
        "transformation": "date_parse",
        "params": { "format": "%Y-%m-%d %H:%M:%S.%f" }
      },
      {
        "source_field": "Venue",
        "target_field": "venue_mic",
        "transformation": "lookup",
        "params": { "reference": "venue", "match_field": "name", "return_field": "mic" }
      }
    ],
    "validation_rules": [
      { "rule": "not_null", "fields": ["execution_id", "order_id"] },
      { "rule": "referential_integrity", "field": "order_id", "reference": "order" }
    ],
    "standards_alignment": {
      "iso_20022": "semt.002",
      "fix_protocol": "ExecutionReport(8)"
    }
  }
  ```

#### Task 16.2: Transformation function library
- **Create:** `backend/services/transformation_library.py` — reusable transformation functions:
  - `direct` — 1:1 copy
  - `rename` — field rename
  - `date_parse` — parse date with format string
  - `lookup` — reference data lookup (join to Reference tier)
  - `enum_map` — value mapping (e.g., "BUY"/"SELL" → "1"/"2")
  - `concat` — concatenate fields
  - `split` — split field into multiple
  - `expression` — SQL expression evaluation
  - `default` — fill missing with default value
  - `coalesce` — first non-null from list of source fields
  - `iso_normalize` — normalize to ISO standard format (ISIN, MIC, LEI, CCY, etc.)

#### Task 16.3: Mapping engine
- **Create:** `backend/engine/mapping_engine.py` — execute mappings:
  - Load mapping metadata → generate transformation SQL → execute via DuckDB
  - Quality gate: validate output against target entity schema
  - Failed records → Quarantine tier with error details
  - Emit lineage events (source field → transformation → target field)

#### Task 16.4: MappingStudio overhaul (frontend)
- **Modify:** `frontend/src/views/MappingStudio/` — complete redesign:
  - **Left panel:** Source schema (from Landing/Bronze) with field types, sample values, profiling stats
  - **Center:** Visual mapping canvas (drag source → target) with transformation node in between
  - **Right panel:** Target entity schema (canonical) with required/optional indicators
  - **Bottom:** Preview of transformation output (sample rows), quality report
  - **Toolbar:** Save mapping, test mapping (dry run), execute mapping, auto-suggest mappings
  - Auto-suggest: Match source fields to target fields by name similarity, type compatibility, ISO standard patterns

#### Task 16.5: ISO/FIX-aligned canonical schemas
- Ensure all 8 entity canonical schemas reference:
  - **ISO 20022** message types (semt.002 for settlements, setr.010 for orders, etc.)
  - **FIX Protocol** message/field mappings (Tag 35=8 for ExecutionReport, Tag 150 for ExecType, etc.)
  - **ISO 10383** for venue MIC codes
  - **ISO 6166** for ISIN
  - **ISO 10962** for CFI classification
  - **ISO 17442** for LEI
  - **ISO 4217** for currency codes
  - **ISO 8601** for timestamps
- Document standard-to-canonical mapping in entity metadata `standards_alignment` field

---

### Phase 17: Canonical-to-Analytics Mapping (Silver → Gold)

*Map canonical entity attributes to calculation input attributes — completing the Bronze→Silver→Gold pipeline.*

**Goal:** Enable mapping from canonical entity fields (Silver) to the specific attributes required by calculations and detection models (Gold). This closes the gap where calculations currently assume specific column names from the raw data.

**Tasks:**

#### Task 17.1: Calculation input mapping metadata
- **Create:** `workspace/metadata/mappings/canonical_to_calc/` — per-calculation input mappings:
  ```json
  {
    "mapping_id": "execution_to_value_calc",
    "source_entity": "execution",
    "source_tier": "silver",
    "target_calculation": "value_calculation",
    "target_tier": "gold",
    "input_mappings": [
      {
        "calc_input": "quantity",
        "source_field": "execution.quantity",
        "transformation": "direct"
      },
      {
        "calc_input": "price",
        "source_field": "execution.price",
        "transformation": "direct"
      },
      {
        "calc_input": "product_ref",
        "source_field": "product.product_id",
        "transformation": "join",
        "params": { "join_entity": "product", "join_key": "execution.product_id = product.product_id" }
      }
    ]
  }
  ```

#### Task 17.2: Calculation input registry
- **Modify:** `workspace/metadata/calculations/**/*.json` — add `inputs` section to each calculation:
  ```json
  {
    "calc_id": "value_calculation",
    "inputs": [
      { "name": "quantity", "type": "numeric", "required": true, "description": "Trade quantity" },
      { "name": "price", "type": "numeric", "required": true, "description": "Execution price" },
      { "name": "product_ref", "type": "string", "required": true, "description": "Product identifier for join" }
    ]
  }
  ```

#### Task 17.3: Update calculation engine for mapped inputs
- **Modify:** `backend/engine/calculation_engine.py` — resolve input mappings before SQL execution
- Calculation SQL uses abstract input names → engine resolves to actual Silver-tier column names via mapping metadata
- This decouples calculations from raw data column names entirely

#### Task 17.4: MappingStudio Silver→Gold tab
- **Modify:** `frontend/src/views/MappingStudio/` — add second tab for canonical-to-calc mapping
- **Left panel:** Silver-tier canonical entity fields
- **Center:** Mapping canvas with join/transform nodes
- **Right panel:** Calculation input requirements (from input registry)
- Preview: Show sample calculation output with mapped inputs

---

### Tier 2 — Data Quality & Extended Tiers

### Phase 18: Data Quality, Quarantine & Profiling

*Implement quality gates at every tier boundary, quarantine tier for failed records, and ISO 8000/25012-aligned quality scoring.*

**Goal:** Every tier transition validates data quality. Records that fail validation go to the Quarantine tier with error details. Quality scores follow ISO 8000 (Data Quality) and ISO/IEC 25012 (Data Quality Model) dimensions.

**Tasks:**

#### Task 18.1: Quality dimension metadata (ISO 8000 / ISO 25012)
- **Create:** `workspace/metadata/quality/dimensions.json` — quality dimensions:
  ```json
  {
    "dimensions": [
      { "id": "completeness", "iso_25012": "4.2.1", "description": "Ratio of non-null values", "weight": 0.2 },
      { "id": "accuracy", "iso_25012": "4.2.2", "description": "Values match real-world truth", "weight": 0.2 },
      { "id": "consistency", "iso_25012": "4.2.3", "description": "No contradictions within/across datasets", "weight": 0.15 },
      { "id": "timeliness", "iso_25012": "4.2.4", "description": "Data available within SLA", "weight": 0.15 },
      { "id": "uniqueness", "iso_25012": "4.2.5", "description": "No duplicate records", "weight": 0.1 },
      { "id": "validity", "iso_25012": "4.2.6", "description": "Values conform to domain rules", "weight": 0.1 },
      { "id": "currentness", "iso_8000": "8000-61", "description": "Data reflects current state", "weight": 0.1 }
    ]
  }
  ```

#### Task 18.2: Quality rule engine
- **Create:** `backend/engine/quality_engine.py` — evaluate quality rules from data contracts
- Rule types: `not_null`, `unique`, `range_check`, `enum_check`, `regex_match`, `referential_integrity`, `freshness`, `custom_sql`
- Each rule produces: pass/fail, affected row count, quality score contribution
- Aggregate quality score per entity per tier (0-100 scale)

#### Task 18.3: Quarantine tier implementation
- **Create:** `workspace/quarantine/` — quarantined record storage
- Each quarantined record includes: original data, source tier, target tier, failed rules, timestamp, retry count
- API: `GET /api/quarantine` — list quarantined records with filters
- API: `POST /api/quarantine/{id}/retry` — attempt reprocessing
- API: `POST /api/quarantine/{id}/override` — force-accept with justification (audit logged)

#### Task 18.4: Quality dashboard (frontend)
- **Create:** `frontend/src/views/DataQuality/index.tsx` — quality monitoring dashboard
- Quality scores by entity, by tier, by dimension (spider/radar chart)
- Quarantine queue with investigation workflow
- Quality trend over time (line chart)
- Data profiling results (distribution histograms, null patterns)

---

### Phase 19: Reference Data & Master Data Management

*Implement the Reference/MDM tier — golden records for products, venues, accounts, traders.*

**Goal:** Establish a Reference Data tier that holds deduplicated, reconciled master records. All other tiers reference this as the source of truth for lookup/join data. Supports cross-source reconciliation and golden record creation.

**Tasks:**

#### Task 19.1: Reference data tier structure
- **Create:** `workspace/reference/` — golden record storage (Parquet + metadata)
- Entity types: products (ISIN master), venues (ISO 10383 master), accounts, traders
- Each record has: `golden_id`, `source_records[]`, `confidence_score`, `last_reconciled`

#### Task 19.2: Reference data metadata
- **Create:** `workspace/metadata/reference/` — master data definitions:
  ```json
  {
    "entity": "product",
    "golden_key": "isin",
    "match_rules": [
      { "strategy": "exact", "fields": ["isin"] },
      { "strategy": "fuzzy", "fields": ["product_name"], "threshold": 0.85 }
    ],
    "merge_rules": [
      { "field": "product_name", "strategy": "longest" },
      { "field": "asset_class", "strategy": "most_frequent" }
    ],
    "external_sources": [
      { "source": "iso_10962", "field": "cfi_code" },
      { "source": "iso_6166", "field": "isin" }
    ]
  }
  ```

#### Task 19.3: Reference data API
- `GET /api/reference/{entity}` — list golden records
- `GET /api/reference/{entity}/{id}/sources` — show source records that contributed
- `POST /api/reference/{entity}/reconcile` — trigger reconciliation
- `POST /api/reference/{entity}/{id}/override` — manual golden record edit (audit logged)

#### Task 19.4: Reference data view (frontend)
- **Create:** `frontend/src/views/ReferenceData/index.tsx` — master data browser
- Golden record list with source provenance
- Reconciliation dashboard (match/conflict summary)
- Cross-reference to downstream tiers using this golden record

---

### Phase 20: Extended Analytical Tiers (Platinum, Sandbox, Archive)

*Implement the Platinum (pre-built KPIs), Sandbox (what-if testing), and Archive (regulatory retention) tiers.*

**Tasks:**

#### Task 20.1: Platinum tier — pre-built KPIs & summaries
- **Create:** `workspace/metadata/medallion/platinum/` — KPI definitions:
  - Daily alert summary (by model, by product, by account)
  - Model effectiveness metrics (precision, recall if labeled)
  - Score distribution statistics
  - Regulatory report datasets (pre-aggregated for MAR, MiFID II, Dodd-Frank)
- KPIs are metadata-defined SQL aggregations that run on Gold tier data
- Dashboard widgets pull from Platinum tier for fast rendering

#### Task 20.2: Sandbox tier — isolated testing environment
- **Implement:** Copy-on-write sandbox creation from any tier
- Users can modify settings, thresholds, mappings in sandbox without production impact
- Side-by-side comparison: sandbox results vs. production results
- Sandbox lifecycle: create → configure → run → compare → promote or discard
- This replaces the planned Phase 14 "sandbox mode" with a proper tier

#### Task 20.3: Archive tier — regulatory retention
- **Create:** `workspace/archive/` — compressed cold storage
- Retention policies per regulation:
  | Regulation | Retention Period | Data Types |
  |-----------|-----------------|------------|
  | MiFID II | 5-7 years | Orders, executions, communications |
  | Dodd-Frank / SEC 17a-4 | 5 years | Trade records, communications |
  | MAR | 5 years | Surveillance data, alert records |
  | FINRA 4511 | 6 years | All business records |
  | GDPR | Minimal necessary | PII data (crypto-shredding ready) |
- Archive format: compressed Parquet with metadata sidecar (retention policy, classification, encryption key reference)
- GDPR vs. regulatory retention paradox resolved via **crypto-shredding**: PII encrypted with per-subject key; erasure = destroy key (regulatory records remain, PII becomes unrecoverable)

---

### Tier 3 — Governance & Compliance

### Phase 21: Data Governance & Classification

*Implement data classification taxonomy, column-level sensitivity marking, and governance metadata across all entities.*

**Goal:** Every field in every entity carries classification metadata. Data governance rules are metadata-driven. Sensitivity is marked at the column level, not just the table level.

**Tasks:**

#### Task 21.1: Classification metadata schema
- **Create:** `workspace/metadata/governance/classification.json` — taxonomy definition (L0-L5)
- **Modify:** All entity JSONs in `workspace/metadata/entities/` — add per-field classification:
  ```json
  {
    "field_name": "trader_id",
    "classification": "L4_PII",
    "pii_category": "direct_identifier",
    "pii_type": "employee_id",
    "gdpr_relevant": true,
    "retention_policy": "regulatory_7yr"
  }
  ```

#### Task 21.2: PII detection service
- **Create:** `backend/services/pii_detector.py` — auto-detect PII in data:
  - Pattern matching: email, phone, SSN/NIN, names, addresses
  - Statistical detection: high-cardinality string columns that look like identifiers
  - Configurable patterns via metadata (`workspace/metadata/governance/pii_patterns.json`)
  - Runs during data onboarding (Phase 15) and on-demand

#### Task 21.3: Governance policy engine
- **Create:** `backend/services/governance_engine.py` — enforce governance rules:
  - Access control: who can see which classification levels
  - Retention: auto-archive/delete based on retention policy
  - Lineage: track which fields flow through which transformations
  - Compliance check: validate that PII handling meets GDPR/CCPA requirements

#### Task 21.4: Data classification view (frontend)
- **Create:** `frontend/src/views/DataGovernance/index.tsx` — governance dashboard:
  - Entity × field classification matrix (color-coded by sensitivity level)
  - PII inventory: all PII fields across all entities
  - Retention policy overview (Gantt-style timeline per regulation)
  - Compliance scorecard (GDPR, CCPA, MiFID II data handling)

---

### Phase 22: Masking, Encryption & Access Control

*Implement dynamic data masking, column-level encryption, and role-based access control for sensitive data.*

**Goal:** Sensitive data is masked or encrypted based on classification level and user role. Masking is dynamic (applied at query time, not stored). Encryption uses column-level AES-256. RBAC governs who sees what.

**Tasks:**

#### Task 22.1: Masking policy metadata
- **Create:** `workspace/metadata/governance/masking_policies.json`:
  ```json
  {
    "policies": [
      {
        "policy_id": "mask_trader_id",
        "target_field": "trader_id",
        "classification": "L4_PII",
        "masking_type": "tokenize",
        "algorithm": "sha256_hmac",
        "params": { "salt_key_ref": "env:MASKING_SALT" },
        "unmask_roles": ["compliance_officer", "admin"],
        "audit_unmask": true
      },
      {
        "policy_id": "mask_account_holder",
        "target_field": "account_holder_name",
        "classification": "L4_PII",
        "masking_type": "partial",
        "algorithm": "first_last_char",
        "params": { "mask_char": "*", "visible_start": 1, "visible_end": 1 }
      },
      {
        "policy_id": "mask_account_id_fpe",
        "target_field": "account_id",
        "classification": "L4_PII",
        "masking_type": "format_preserving",
        "algorithm": "ff1_aes256",
        "params": { "key_ref": "env:FPE_KEY", "alphabet": "alphanumeric" }
      }
    ]
  }
  ```

#### Task 22.2: Dynamic masking engine
- **Create:** `backend/services/masking_service.py` — apply masking at query time:
  - Masking types: `redact`, `partial`, `tokenize`, `hash`, `format_preserving` (FF1/NIST SP 800-38G), `noise_injection`
  - Dynamic: masking applied in DuckDB SQL layer (views or query rewriting)
  - Role-aware: current user's role determines which fields are masked
  - Audit: every unmask event logged to Logging tier

#### Task 22.3: Column-level encryption
- Metadata-defined encryption per column (AES-256-GCM)
- Encryption at rest in Parquet files (Parquet Modular Encryption when supported, or application-level)
- Key management: per-column or per-classification-level keys
- Crypto-shredding support: per-data-subject key groups for GDPR erasure

#### Task 22.4: Role-based access control (RBAC)
- **Create:** `workspace/metadata/governance/roles.json`:
  ```json
  {
    "roles": [
      {
        "role_id": "analyst",
        "description": "Front-office surveillance analyst",
        "tier_access": ["gold", "platinum"],
        "classification_access": ["L0_public", "L1_internal", "L2_confidential"],
        "masked_fields": ["trader_id", "account_holder_name"]
      },
      {
        "role_id": "compliance_officer",
        "description": "Compliance officer with full PII access",
        "tier_access": ["silver", "gold", "platinum", "quarantine"],
        "classification_access": ["L0_public", "L1_internal", "L2_confidential", "L3_restricted", "L4_PII"],
        "masked_fields": []
      },
      {
        "role_id": "data_engineer",
        "description": "Data engineering team",
        "tier_access": ["landing", "bronze", "silver", "gold", "quarantine", "logging", "metrics"],
        "classification_access": ["L0_public", "L1_internal"],
        "masked_fields": ["trader_id", "account_holder_name", "account_id"]
      }
    ]
  }
  ```
- For demo: role switching via UI dropdown (no auth system needed)
- Fields dynamically masked based on selected role

#### Task 22.5: Masking & access control view (frontend)
- Extend `DataGovernance` view with tabs for masking policies and RBAC
- Visual preview: show same data row under different roles (side-by-side masked vs. unmasked)
- Audit log: who accessed what PII data and when

---

### Phase 23: Business Glossary & Semantic Layer

*Implement a business glossary mapping business terms to technical fields, with ownership and governed definitions. Build a semantic layer for business-friendly data access.*

**Goal:** Business users can understand data in their terms, not technical column names. Every technical field has a business definition, owner, and governed description. The semantic layer provides business-friendly names, computed metrics, and governed definitions following ISO 11179 (Metadata Registries) and DAMA-DMBOK principles.

**Tasks:**

#### Task 23.1: Business glossary metadata (ISO 11179)
- **Create:** `workspace/metadata/glossary/` — business term definitions:
  ```json
  {
    "term_id": "wash_trade",
    "business_name": "Wash Trade",
    "definition": "A transaction where the same beneficial owner is on both sides, creating artificial volume without genuine change of ownership",
    "category": "market_abuse",
    "owner": "compliance",
    "steward": "surveillance_team",
    "regulatory_references": ["MAR Art. 12(1)(a)", "SEC Rule 10b-5"],
    "related_terms": ["self_dealing", "artificial_volume", "market_manipulation"],
    "technical_mappings": [
      { "entity": "execution", "field": "wash_score", "relationship": "computed_indicator" },
      { "entity": "alert", "field": "model_id", "relationship": "detected_by", "value": "wash_trading_full_day" }
    ],
    "iso_11179": {
      "object_class": "Trade",
      "property": "Wash Indicator",
      "representation": "Score",
      "data_element_concept": "Trade.WashIndicator"
    }
  }
  ```

#### Task 23.2: Semantic layer definitions
- **Create:** `workspace/metadata/semantic/` — business-friendly metric definitions:
  ```json
  {
    "metric_id": "daily_alert_rate",
    "business_name": "Daily Alert Rate",
    "definition": "Number of alerts generated per trading day",
    "formula": "COUNT(alerts) / COUNT(DISTINCT business_date)",
    "source_tier": "gold",
    "source_entities": ["alert_summary"],
    "unit": "alerts/day",
    "dimensions": ["model", "product", "account"],
    "owner": "surveillance_team"
  }
  ```
- Metrics are SQL expressions that can be composed and reused
- Dimensions define available drill-down axes

#### Task 23.3: Business glossary API
- `GET /api/glossary` — list all business terms with search
- `GET /api/glossary/{term_id}` — term details with technical mappings
- `GET /api/glossary/field/{entity}/{field}` — reverse lookup: field → business term
- `PUT /api/glossary/{term_id}` — update term (audit logged)

#### Task 23.4: Business glossary view (frontend)
- **Create:** `frontend/src/views/BusinessGlossary/index.tsx` — searchable glossary:
  - Alphabetical/categorical browse with search
  - Term detail: definition, owner, regulatory references, technical mappings
  - Reverse lookup: click any field in any view → see its business definition
  - Glossary icon on entity fields across all views (tooltip with business name + definition)
  - Ownership matrix: who owns which data domains

#### Task 23.5: DAMA-DMBOK knowledge area mapping
- Document alignment with DAMA-DMBOK 11 knowledge areas:
  | Area | Coverage | Phase |
  |------|----------|-------|
  | Data Governance | Policies, classification, ownership | Phase 21-22 |
  | Data Architecture | Medallion tiers, data contracts | Phase 14 |
  | Data Modeling | Entity schemas, relationships | Phases 1-6 |
  | Data Storage | DuckDB, Parquet, Archive tier | Phase 14, 20 |
  | Data Security | Masking, encryption, RBAC | Phase 22 |
  | Data Integration | Connectors, mappings, ETL | Phases 15-17 |
  | Data Quality | Quality engine, profiling, ISO 8000 | Phase 18 |
  | Reference & Master Data | Reference tier, golden records | Phase 19 |
  | Document & Content | Metadata JSON, business glossary | Phase 23 |
  | Metadata Management | Full metadata-driven architecture | All phases |
  | Data Warehousing & BI | Platinum tier KPIs, dashboards | Phase 20 |

---

### Phase 24: Observability, Lineage & Audit

*Implement the Logging/Audit tier and Metrics/Observability tier — full pipeline observability with OpenLineage-compatible data lineage.*

**Goal:** Every data transformation, every quality check, every user action is logged. Data lineage is tracked field-to-field from Landing through Gold. Pipeline health is monitored with SLA alerting.

**Tasks:**

#### Task 24.1: Logging/Audit tier
- **Create:** `workspace/logging/` — append-only event log storage
- Event types:
  - `pipeline_execution` — tier-to-tier transformation runs (start, end, row counts, duration)
  - `quality_check` — quality rule evaluations (pass/fail, affected rows)
  - `data_access` — who queried what data (masked/unmasked)
  - `metadata_change` — who modified which metadata (diff included)
  - `alert_action` — alert investigation, disposition, escalation
  - `masking_unmask` — PII unmask events
- Tamper-evident: hash chain on log entries (each entry hashes previous entry's hash)

#### Task 24.2: OpenLineage-compatible lineage tracking
- **Create:** `backend/services/lineage_service.py` — emit lineage events:
  ```json
  {
    "eventType": "COMPLETE",
    "eventTime": "2026-02-28T10:00:00Z",
    "run": { "runId": "..." },
    "job": {
      "namespace": "analytics-platform",
      "name": "bronze_to_silver_execution"
    },
    "inputs": [{ "namespace": "bronze", "name": "raw_trades" }],
    "outputs": [{ "namespace": "silver", "name": "execution" }],
    "facets": {
      "dataQuality": { "completeness": 0.997, "uniqueness": 1.0 },
      "columnLineage": {
        "fields": {
          "execution_id": { "inputFields": [{ "field": "TradeID" }], "transformation": "direct" },
          "venue_mic": { "inputFields": [{ "field": "Venue" }], "transformation": "lookup" }
        }
      }
    }
  }
  ```
- Column-level lineage: track exactly which source fields contribute to which target fields
- Store lineage locally (JSON), format compatible with OpenLineage spec for future integration with Marquez, DataHub, etc.

#### Task 24.3: Metrics/Observability tier
- **Create:** `workspace/metrics/` — time-series pipeline metrics
- Metrics:
  - Pipeline execution time per stage
  - Record throughput per tier
  - Quality scores over time (per entity, per dimension)
  - Quarantine rate trends
  - SLA compliance (freshness, completeness targets)
  - Data drift detection (schema changes, distribution shifts)
- Alert on metric anomalies (quality score drop, SLA breach, unexpected schema change)

#### Task 24.4: Lineage & observability view (frontend)
- **Create:** `frontend/src/views/DataLineage/index.tsx` — interactive lineage graph:
  - Entity-level lineage: Landing → Bronze → Silver → Gold → Platinum (React Flow)
  - Field-level lineage: click a Gold field → trace back to Landing source field through all transformations
  - Timeline: lineage at a specific point in time
- Extend `PipelineMonitor` view with:
  - Execution history timeline
  - Quality score trends (Recharts line chart)
  - SLA status indicators (green/amber/red)

---

### Tier 4 — Standards & Portability

### Phase 25: Standards Integration

*Comprehensive standards alignment across all data management activities.*

**Goal:** The platform demonstrably aligns with international standards for data quality, metadata management, information security, and risk data aggregation.

**Standards coverage:**

| Standard | Domain | Integration Point |
|----------|--------|-------------------|
| **ISO 8000** (Data Quality) | Data quality management and measurement | Quality engine (Phase 18), quality dimensions, profiling |
| **ISO/IEC 25012** (Data Quality Model) | System and software quality — data quality characteristics | Quality scoring dimensions, spider charts |
| **ISO 11179** (Metadata Registries) | Metadata registry design and naming | Business glossary (Phase 23), entity naming, term governance |
| **ISO 27001/27002** (Information Security) | Security controls for information systems | Masking (Phase 22), encryption, RBAC, audit logging |
| **ISO 20022** (Financial Messaging) | Universal financial industry message scheme | Canonical entity schemas (Silver tier), field naming |
| **ISO 8601** (Date/Time) | Date and time format standard | All timestamps throughout system |
| **ISO 10383** (MIC codes) | Market Identifier Codes | Venue entity, venue_mic fields |
| **ISO 6166** (ISIN) | International Securities Identification Number | Product entity, product ISIN |
| **ISO 10962** (CFI) | Classification of Financial Instruments | Product entity, CFI classification |
| **ISO 17442** (LEI) | Legal Entity Identifier | Account/counterparty identification |
| **ISO 4217** (Currency) | Currency codes | All monetary fields |
| **ISO 3166** (Country) | Country codes | Account country, venue jurisdiction |
| **BCBS 239** (Risk Data Aggregation) | Principles for effective risk data aggregation | Data architecture, timeliness, accuracy, completeness |
| **DAMA-DMBOK** | Data Management Body of Knowledge | 11 knowledge areas mapped to platform capabilities |
| **FIX Protocol** (4.2/4.4/5.0) | Financial Information eXchange | Order/execution messaging, field tags |
| **ISDA CDM** | Common Domain Model for derivatives | Trade lifecycle events (future extensibility) |

**Tasks:**

#### Task 25.1: Standards compliance metadata
- **Create:** `workspace/metadata/standards/compliance_matrix.json` — mapping of standard → platform capability → compliance level:
  ```json
  {
    "standards": [
      {
        "standard_id": "iso_8000",
        "name": "ISO 8000 Data Quality",
        "controls": [
          {
            "control_id": "8000-61",
            "description": "Data quality measurement",
            "platform_capability": "quality_engine",
            "compliance_level": "full",
            "evidence": "Quality scoring per ISO 25012 dimensions, profiling reports"
          }
        ]
      }
    ]
  }
  ```

#### Task 25.2: BCBS 239 compliance mapping
- Map BCBS 239 principles to platform capabilities:
  | Principle | Requirement | Platform Capability |
  |-----------|-------------|-------------------|
  | 1 — Governance | Governance framework for risk data | Data classification, ownership, glossary |
  | 2 — Data Architecture | Integrated data architecture | Medallion tiers, data contracts |
  | 3 — Accuracy | Risk data must be accurate | Quality engine, validation gates |
  | 4 — Completeness | Complete risk data capture | Completeness dimension scoring |
  | 5 — Timeliness | Timely risk data availability | SLA monitoring, freshness checks |
  | 6 — Adaptability | Architecture flexible to change | Metadata-driven, no hardcoding |
  | 7 — Accuracy (reporting) | Reports must be accurate | Platinum tier pre-aggregation |
  | 8 — Comprehensiveness | Reports cover all material risks | Detection model coverage matrix |
  | 9 — Clarity | Reports understandable | Business glossary, semantic layer |
  | 10 — Frequency | Reports produced frequently | Pipeline scheduling, SLA targets |
  | 11 — Distribution | Reports distributed appropriately | RBAC, role-based dashboards |

#### Task 25.3: Standards compliance view (frontend)
- Extend `RegulatoryMap` view with standards compliance tab
- Compliance matrix: standard × control with RAG status
- Evidence links: click control → see platform capability + configuration + test evidence
- Gap analysis: which controls are not yet covered

---

### Phase 26: Migration Readiness & Platform Portability

*Ensure the metadata-driven architecture can migrate from local DuckDB to any cloud data platform.*

**Goal:** The platform's metadata definitions (entities, mappings, calculations, quality rules, governance policies) can be exported and used with Snowflake, Databricks, BigQuery, or any SQL-based platform. Pipeline definitions are platform-agnostic. Data interchange uses Apache Arrow/Parquet universally.

**Key patterns:**

#### Connector abstraction (from Phase 15)
- All data access goes through connector interface
- Swap `DuckDBConnector` for `SnowflakeConnector`, `DatabricksConnector`, etc.
- Connection config is metadata-driven (no hardcoded connection strings)

#### SQLMesh integration
- **Create:** `backend/services/sqlmesh_service.py` — SQLMesh integration layer:
  - SQLMesh defines transformations as SQL models with metadata (audits, grains, intervals)
  - SQLGlot transpiles SQL between dialects (DuckDB → Snowflake, BigQuery, Spark, etc.)
  - Same transformation metadata → different target platform → automatically transpiled SQL
  - Platform-agnostic pipeline definitions exportable as SQLMesh projects

#### Arrow ecosystem
- PyArrow as the universal in-memory interchange format
- DuckDB zero-copy integration with Arrow tables
- Arrow Flight protocol stub for distributed data access (future)
- Parquet as the universal storage format across all tiers

#### Metadata export/import
- **Create:** `backend/api/portability.py`:
  - `GET /api/portability/export` — export all metadata as a single JSON bundle
  - `POST /api/portability/import` — import metadata bundle into new platform
  - `GET /api/portability/export/sqlmesh` — export pipeline as SQLMesh project
  - `GET /api/portability/export/dbt` — export as dbt project (alternative to SQLMesh)
  - `GET /api/portability/compatibility/{platform}` — check compatibility with target platform

**Tasks:**

#### Task 26.1: SQL dialect abstraction
- **Create:** `backend/services/sql_dialect.py` — SQL generation from metadata:
  - Generate DuckDB SQL from calculation/transformation metadata (current behavior)
  - Generate Snowflake SQL from same metadata
  - Generate BigQuery SQL from same metadata
  - Use SQLGlot for transpilation where possible
  - Flag platform-specific features that don't transpile cleanly

#### Task 26.2: Metadata portability bundle
- Export format: JSON archive with version, schema, and all metadata types
- Import validates compatibility and flags conflicts
- Migration assistant: highlight what needs manual adjustment for target platform

#### Task 26.3: Platform compatibility view (frontend)
- **Create:** `frontend/src/views/Portability/index.tsx` — migration readiness dashboard:
  - Target platform selector (DuckDB, Snowflake, Databricks, BigQuery, PostgreSQL)
  - Compatibility matrix: which features work on which platform
  - Export button: download metadata bundle or SQLMesh project
  - Migration checklist: automated compatibility check with recommendations

---

### Tier 5 — Enhanced Intelligence

### Phase 27: AI-Assisted Configuration

*LLM understands system metadata, suggests calculations, orchestrates integrations.*

**Goal:** The AI Assistant is aware of all medallion tiers, data contracts, quality rules, governance policies, and business glossary. It can help users configure mappings, create calculations, tune thresholds, and understand data lineage.

**Tasks:**

#### Task 27.1: System metadata context for AI
- **Modify:** `backend/services/ai_service.py` — enhance with full medallion context
- **Create:** `backend/services/ai_context_builder.py` — builds system context including:
  - Medallion tier status and health
  - Data contracts and mapping definitions
  - Quality scores and quarantine stats
  - Governance classifications and masking policies
  - Business glossary terms and definitions
  - Lineage graphs for referenced entities
  - Current pipeline execution status

#### Task 27.2: AI-assisted mapping suggestion
- AI analyzes source schema (from onboarding) and suggests:
  - Target entity mapping (which canonical entity does this data represent?)
  - Field mappings (source → canonical, with confidence scores)
  - Transformation functions (date parsing, enum mapping, lookups)
  - Quality rules for the data contract

#### Task 27.3: AI calculation builder (enhanced)
- User describes a calculation in natural language
- AI generates: calculation JSON, Silver→Gold input mapping, quality rules, score steps
- AI explains which business glossary terms relate to the calculation
- AI suggests regulatory tags based on the calculation's purpose

#### Task 27.4: AI tuning recommendations
- AI analyzes alert distribution, quality scores, pipeline metrics
- Recommends: threshold adjustments, new quality rules, mapping corrections
- Shows impact simulation before applying changes
- Explains recommendations in business terms (using glossary)

---

### Phase 28: Alert Tuning & Additional Detection Models

*Scoring calibration, threshold optimization, back-testing, and expanding from 5 to 15 detection models.*

**Tasks:**

#### Task 28.1: Alert distribution analysis dashboard
- Score distribution histogram (by model)
- Alert volume trends (by day/week/month)
- Heat map: alerts by product × model
- Score calibration curve

#### Task 28.2: Threshold simulation (sandbox tier)
- Use Sandbox tier (Phase 20) for threshold testing
- Re-run detection models with different thresholds
- Side-by-side comparison (current vs. proposed)
- No production impact

#### Task 28.3: Back-testing framework
- Run detection models against historical archive data
- Compare alert sets across parameter configurations
- Generate calibration reports (precision, recall, F1 if labeled data available)

#### Task 28.4: Additional detection models
Expand from 5 to 15 models covering full regulatory spectrum:

| # | Model | Regulation | Priority |
|---|-------|-----------|----------|
| D1 | Benchmark Manipulation | MAR Art. 12, IOSCO | High |
| D2 | Momentum Ignition | MiFID II RTS 25 | High |
| D3 | Quote Stuffing | MAR Art. 12(1)(c) | High |
| D4 | Cross-Product Manipulation | MAR Art. 12(1)(b) | Medium |
| D5 | Marking the Close | FINRA Rule 5210 | Medium |
| D6 | Painting the Tape | SEC Rule 10b-5 | Medium |
| D7 | Unusual Volume | General surveillance | Medium |
| D8 | Price Dislocation | General surveillance | Low |
| D9 | Concentrated Position | Risk management | Low |
| D10 | Best Execution Monitoring | MiFID II Art. 27 | Low |

Each model is purely metadata-defined (JSON) using the medallion architecture. No code changes — just add JSON definitions, Silver→Gold mappings, and supporting calculations.

---

### Tier 6 — Production Readiness

### Phase 29: Security Hardening

*SQL injection fixes, authentication, CORS, rate limiting, input validation.*

#### Task 29.1: Fix SQL injection vulnerabilities (CRITICAL)
- **Modify:** `backend/services/query_service.py:39-46` — parameterized queries
- Add SQL validation (SELECT-only for raw queries)
- Negative test cases for injection attempts

#### Task 29.2: API authentication
- JWT middleware for API endpoints
- Role-based endpoint access (aligned with RBAC from Phase 22)

#### Task 29.3: CORS, rate limiting, input validation
- CORS with restricted origins
- slowapi rate limiting
- Pydantic Field constraints on all API inputs

---

### Phase 30: Testing Framework Expansion

*Frontend component tests, API security tests, performance tests.*

#### Task 30.1: Frontend component tests (vitest + @testing-library/react)
- Target: 50+ component tests

#### Task 30.2: API security tests
- SQL injection, XSS, CORS, auth bypass
- Target: 20+ negative test cases

#### Task 30.3: Performance tests
- k6 load test scripts
- Target: 100 concurrent users, <500ms p95 latency

---

### Phase 31: Cloud & Deployment Infrastructure

*Docker, CI/CD, health checks, structured logging.*

#### Task 31.1: Docker containerization
- Multi-stage Dockerfile (frontend build + backend)
- docker-compose for local containerized development

#### Task 31.2: CI/CD pipeline
- `.github/workflows/test.yml` — run tests on PR
- `.github/workflows/build.yml` — build Docker image on merge

#### Task 31.3: Health checks & structured logging
- Readiness/liveness probes
- Request ID correlation
- Structured JSON logging

---

### Tier 7 — Productization

### Phase 32: Advanced Analytics & Case Management

*Customizable dashboards, comparative analysis, case lifecycle.*

**Tasks:**

#### Task 32.1: Customizable dashboard layout
- User-configurable widget positions (drag-and-drop grid)
- Saved dashboard views (per role)
- Widget library with add/remove

#### Task 32.2: Comparative analysis views
- Multi-product/account/time period overlays
- Peer group analysis
- Before/after detection effectiveness

#### Task 32.3: Case management workflow
- Case lifecycle: Triage → Investigation → Case → Resolution → Filing
- Case assignment, escalation, SLA tracking
- Investigation workspace: timeline builder, evidence collection, narrative editor
- SAR/STR auto-generation
- Disposition codes (True Positive, False Positive, Escalated)

---

### Phase 33: Productization

*Multi-tenant, configuration management, plugin architecture.*

#### Task 33.1: Multi-tenant architecture
- Tenant middleware, per-tenant workspace isolation
- Tenant-specific metadata (using OOB layer architecture)

#### Task 33.2: Configuration management
- Environment-based config (pydantic-settings)
- Feature flags for gradual rollout
- Secrets management integration

#### Task 33.3: Plugin architecture
- Runtime-loadable calculation plugins
- Custom entity type registration
- Extension point system for detection models

---

## Data Model Extensions (Backlog)

| # | Entity | Description | Dependency |
|---|--------|-------------|-----------|
| E1 | News Feed | Market news for correlation | Phase 19 (Reference) |
| E2 | Quotes | Level 2 order book | Phase 15 (Onboarding) |
| E3 | Order Versioning | Track amendments | Phase 14 (Medallion) |
| E4 | Communications | Email/chat metadata | Phase 32 (Case Management) |
| E5 | Beneficial Ownership | Account→UBO chain | Phase 21 (Governance) |
| E6 | Watchlist | Restricted/grey/insider lists | Phase 19 (Reference) |
| E7 | Regulatory Calendar | Earnings, fixing windows | Phase 19 (Reference) |
| E8 | Position | End-of-day positions | Phase 17 (Silver→Gold) |

---

## Visualization Backlog

| # | Feature | Description | Phase |
|---|---------|-------------|-------|
| V1 | Order Book Depth | Bid/ask depth around suspicious orders | Phase 28 |
| V2 | Trade Timeline | Millisecond execution timeline | Phase 17 |
| V3 | Network Graph | Account/trader relationships | Phase 32 |
| V4 | Heatmaps | Volume/alert concentration | Phase 28 |
| V5 | Comparative Charts | Multi-product overlays | Phase 32 |
| V6 | Annotation Layer | Analyst marks on charts | Phase 32 |
| V7 | Geographic Map | Jurisdiction analysis | Phase 33 |
| V8 | Lineage Graph | Field-level lineage visualization | Phase 24 |
| V9 | Quality Spider Charts | ISO 25012 dimension radar plots | Phase 18 |
| V10 | Tier Flow Sankey | Data volume flow through medallion tiers | Phase 14 |

---

## Regulatory Reporting Backlog

| # | Feature | Regulation | Phase |
|---|---------|-----------|-------|
| R1 | Transaction Reporting | MiFIR Art. 26 | Phase 32 |
| R2 | Order Record Keeping | RTS 25 | Phase 25 |
| R3 | STOR Generation | MAR Art. 16 | Phase 32 |
| R4 | CAT Reporting | FINRA CAT | Phase 32 |
| R5 | Regulatory Dashboard | Multi-regulation KPIs | Phase 20 (Platinum) |
| R6 | Data Retention Policies | GDPR, MiFID II | Phase 20 (Archive) |
| R7 | Compliance Audit Report | ISO 27001 | Phase 25 |

---

## Demo & Presentation Backlog

| # | Feature | Description |
|---|---------|-------------|
| ~~P1~~ | ~~Guided Demo Mode~~ | ~~Pre-scripted walkthrough with narration~~ — DONE (Phase 7B) |
| ~~P2~~ | ~~Scenario Library~~ | ~~Multiple pre-built scenarios~~ — DONE (Phase 7B + M128: 26 scenarios) |
| P3 | Live Data Simulation | Streaming real-time alert generation via connector framework |
| P4 | Comparison Mode | Before/after detection effectiveness via Sandbox tier |
| P5 | Performance Metrics | Detection rates, false positive rates via Platinum tier |
| P6 | Medallion Architecture Demo | Interactive walkthrough of data flowing through all 11 tiers |
| P7 | Data Governance Demo | PII detection → classification → masking → audit trail |
| P8 | Migration Demo | Export metadata → show compatibility with Snowflake/Databricks |

---

## Known Technical Debt

| # | Issue | Location | Phase |
|---|-------|----------|-------|
| T1 | SQL string formatting (injection risk) | `query_service.py:39-46` | Phase 29 |
| T2 | No input validation on API endpoints | `backend/api/*.py` | Phase 29 |
| T3 | DuckDB single-writer lock | `backend/db.py` | Phase 33 |
| ~~T4~~ | ~~Market data time range defaults to current date~~ | | ~~RESOLVED (M94)~~ |
| T5 | No error boundaries in React | `frontend/src/views/**` | Phase 30 |
| ~~T6~~ | ~~Stale asset_class in settings~~ | | ~~RESOLVED (M94)~~ |
| T7 | Demo state file not validated | `backend/api/demo.py` | Phase 29 |
| ~~T8~~ | ~~Calc SQL has hardcoded thresholds~~ | | ~~RESOLVED (M93)~~ |
| ~~T9~~ | ~~ModelCreateForm missing critical fields~~ | | ~~RESOLVED (M101-M102)~~ |
| ~~T10~~ | ~~No domain value suggestions~~ | | ~~RESOLVED (M95-M100)~~ |
| ~~T11~~ | ~~No visual score step builder~~ | | ~~RESOLVED (M99)~~ |
| ~~T12~~ | ~~MappingStudio is UI-only prototype~~ | | ~~RESOLVED (M191-M196, Phase 16)~~ |
| T13 | No data quality validation gates | `backend/engine/data_loader.py` | Phase 18 |
| T14 | No PII detection or classification | All entity data | Phase 21 |
| T15 | No data lineage tracking | Pipeline execution | Phase 24 |
| ~~T16~~ | ~~Hardcoded CSV reader (no connector abstraction)~~ | | ~~RESOLVED (M176-M183, Phase 15)~~ |
| T17 | Platform-specific DuckDB SQL throughout | `backend/engine/*.py` | Phase 26 |

---

## Priority Matrix

| Priority | Phase | Status | Rationale |
|----------|-------|--------|-----------|
| **P0 — DONE** | Phases 1-12, 7B, Overhauls (M0-M173) | COMPLETE | Foundation: 16 views, 716 tests, 83.8% metadata-driven |
| **P1 — Next** | Phase 13 (Data Calibration) | **COMPLETE** | Fixed F-001/F-010: 82 alerts across 5 models and 5 asset classes (M174) |
| **P1 — Next** | Phase 14 (Medallion Core) | **COMPLETE** | M175: 11-tier metadata, 6 contracts, 5 transformations, MedallionOverview view, 7 APIs, S27 scenario — 732 tests (522+210), 17 views |
| **P1 — Next** | Phase 15 (Data Onboarding) | **COMPLETE** | M176-M183: 6 connectors, BaseConnector + LocalFileConnector, schema detector, data profiler, DataOnboarding wizard, S28 — 759 tests (549+210), 18 views |
| **P1 — Next** | Phase 15.5 (Tour Quality Fixes) | **COMPLETE** | M184-M190: Tour backdrop click-through fix (4-edge overlay), viewport clipping fix (floating-ui size()), :has-text selector replacement (86→data-action), ScenarioRunner timeouts |
| **P1 — Next** | Phase 16 (Bronze→Silver Mapping) | **COMPLETE** | M191-M196: Pydantic mapping models, 3 mapping metadata files, CRUD API (7 endpoints), MappingStudio overhaul (metadata-driven), onboarding Step 4 mapping integration, S29 scenario — 772 tests (562+210) |
| **P1 — Next** | Phase 17 (Silver→Gold Pipeline) | **COMPLETE** | M197-M204: Contract validator, pipeline orchestrator, Silver→Gold mapping + data contract, MappingStudio tier selectors, PipelineMonitor overhaul (true DAG + medallion stages), MedallionOverview execution status — 800 tests (590+210), 30 scenarios, 82 sections |
| **P2 — Important** | Phase 18 (Data Quality) | **COMPLETE** | M205-M215: Quality dimensions (ISO 8000/25012), weighted scoring engine, quarantine service, DataQuality view with spider chart + profiling — 862 tests (645+217), 19 views, 31 scenarios, 86 architecture sections |
| **P2 — Important** | Phase 19 (Reference Data/MDM) | **COMPLETE** | M216-M227: Golden records (301 across 4 entities), reconciliation engine, 9 API endpoints, ReferenceData view, S32 scenario — 929 tests (705+224), 20 views |
| **P2 — Important** | Phase 20 (Platinum/Sandbox/Archive) | PLANNED | KPIs, testing isolation, regulatory retention |
| **P2 — Important** | Phase 21 (Data Governance) | PLANNED | Classification, PII detection, compliance |
| **P2 — Important** | Phase 22 (Masking/Encryption/RBAC) | PLANNED | Dynamic masking, column encryption, role-based access |
| **P3 — Enhance** | Phase 23 (Business Glossary) | PLANNED | ISO 11179, semantic layer, DAMA-DMBOK |
| **P3 — Enhance** | Phase 24 (Observability/Lineage) | PLANNED | OpenLineage, pipeline metrics, audit trail |
| **P3 — Enhance** | Phase 25 (Standards Integration) | PLANNED | ISO 27001, BCBS 239, compliance matrix |
| **P3 — Enhance** | Phase 26 (Migration Readiness) | PLANNED | SQLMesh, Arrow, metadata export, multi-platform SQL |
| **P3 — Enhance** | Phase 27 (AI Configuration) | PLANNED | LLM metadata awareness, assisted mapping/tuning |
| **P3 — Enhance** | Phase 28 (Alert Tuning + Models) | PLANNED | Distribution analysis, 10 new detection models |
| **P4 — Future** | Phases 29-31 (Security, Testing, Cloud) | PLANNED | Production infrastructure |
| **P5 — Long-term** | Phases 32-33 (Analytics, Cases, Productization) | PLANNED | Multi-tenant, case management, plugins |

---

## Verification Plan

After each phase:
1. `cd frontend && npm run build` — no TypeScript errors (970+ modules)
2. `uv run pytest tests/ --ignore=tests/e2e -v` — all backend tests pass (645+)
3. `uv run pytest tests/e2e/ -v` — all E2E tests pass (217+) — stop port 8000 first
4. Playwright MCP visual walkthrough at 1440px and 1024px
5. Reference `docs/feature-development-checklist.md` for all new features
6. Follow `docs/development-workflow-protocol.md` for milestone completion
7. Regression: existing demo checkpoints still work
8. New medallion-specific checks:
   - Data contracts validate (all tier boundaries have contracts)
   - Quality scores generate for all entities
   - Lineage graph complete from Landing to Gold
   - Classification metadata present on all PII fields
   - Masking policies active for role-based demo

---

## Research Sources

### Industry & Vendor Research
- NICE Actimize SURVEIL-X (generative AI integration, 2025)
- Behavox AI Risk Policies (60%+ alert reduction)
- SteelEye module-based architecture
- Trapets drill-down dashboards and white-box models
- OneTick source code transparency for all models
- Salesforce metadata-driven multitenant architecture

### Medallion Architecture
- Databricks Medallion Architecture (Bronze/Silver/Gold canonical pattern)
- Delta Lake best practices for tiered data processing
- Microsoft Fabric lakehouse medallion patterns
- Extended tiers: Quarantine (data quality), Platinum (pre-aggregated KPIs), Reference/MDM (golden records)
- Netflix data mesh + medallion hybrid architecture

### Data Governance & Standards
- ISO 8000 (Data Quality Management)
- ISO/IEC 25012 (System & Software Quality — Data Quality Model)
- ISO 11179 (Metadata Registries — naming, classification, registration)
- ISO 27001/27002 (Information Security Management — controls catalog)
- BCBS 239 (Principles for Effective Risk Data Aggregation and Risk Reporting)
- DAMA-DMBOK (Data Management Body of Knowledge — 11 knowledge areas)
- GDPR Articles 17 (Right to Erasure) and 6 (Lawful Basis for Processing)
- NIST SP 800-38G (Format-Preserving Encryption — FF1/FF3-1)

### Financial Standards
- ISO 20022 (Universal Financial Industry Message Scheme)
- FIX Protocol 4.2/4.4/5.0 (Financial Information eXchange)
- ISO 10383 (Market Identifier Codes — MIC)
- ISO 6166 (International Securities Identification Number — ISIN)
- ISO 10962 (Classification of Financial Instruments — CFI)
- ISO 17442 (Legal Entity Identifier — LEI)
- ISO 4217 (Currency Codes)
- ISO 3166 (Country Codes)
- ISO 8601 (Date/Time Representation)
- ISDA Common Domain Model (CDM) for derivatives lifecycle
- FINRA CAT reporting requirements

### Regulatory
- MiFID II RTS 25 (time synchronization, order record keeping)
- MAR Art. 12/16 (market manipulation surveillance, STOR obligations)
- Dodd-Frank / SEC 17a-4 (record retention)
- FINRA 4511 (general record retention — 6 years)
- EMIR (European Market Infrastructure Regulation)

### Technology Patterns
- SQLMesh (platform-agnostic pipeline definitions, SQLGlot transpilation)
- Apache Arrow (zero-copy in-memory interchange, Arrow Flight for distributed access)
- Apache Parquet (universal columnar storage, Modular Encryption)
- OpenLineage (standard for lineage metadata collection)
- Data Contracts (schema + SLA + quality expectations between tiers)
- MIND pattern (Metadata-Informed Normalization Design)
- Crypto-shredding (GDPR erasure via key destruction)

*Total items: ~200+ across 21 phases + backlogs. Structured in 7 tiers from quick wins through productization.*
