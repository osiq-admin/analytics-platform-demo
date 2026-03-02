# Apache Iceberg Lakehouse Architecture — Implementation Plan

**Date:** 2026-03-01
**Phase:** 21 (M243-M256)
**Branch:** `feature/lakehouse/iceberg-architecture`
**Research:** `docs/plans/2026-03-01-iceberg-lakehouse-research.md`

---

## Goal

Introduce Apache Iceberg as the lakehouse storage layer with:
- Schema evolution, ACID transactions, time travel
- PII/IPP governance with dual-layer tagging
- Run versioning via Iceberg branches (Write-Audit-Publish)
- Multi-tenant-ready namespace design
- DuckDB analytics OLAP layer
- Pre-calculated Gold-tier results (calculate-once fingerprinting)
- Config-driven deployment abstraction (SQLite → Polaris/Nessie/Glue)

**Tech Stack:** PyIceberg 0.11.0+ (SQL catalog, SQLite), DuckDB Iceberg extension, PyArrow, Pydantic v2

---

## Architecture

### Config-Driven LakehouseService
- `workspace/config/lakehouse.yaml` — local/onprem/aws profiles
- LakehouseService wraps PyIceberg + DuckDB iceberg_scan()
- REST Catalog protocol for maximum portability

### Namespace Layout (Multi-Tenant Ready)
- `default/` — single-tenant (demo/dev), becomes `tenant_{id}/` in multi-tenant
- `shared/` — reference data
- `platform/` — cross-tenant operations, metadata-as-data

### 7 Iceberg Tiers
Bronze, Silver, Gold, Platinum, Reference, Logging, Archive

### 4 Non-Iceberg Tiers
Landing (CSV), Quarantine (Parquet), Sandbox (future), Metrics (Parquet)

---

## Tasks

| # | Task | Milestones | Key Deliverables |
|---|------|-----------|------------------|
| 1 | Lakehouse Foundation | M243-M244 | Config, models, LakehouseService, SQLite catalog |
| 2 | Silver Iceberg + Schema Evolution | M245-M246 | SchemaEvolutionService, dual-write, DuckDB views |
| 3 | PII/IPP Governance | M247 | PII registry, GovernanceService, GDPR tagging |
| 4 | Gold Iceberg + Calculate-Once | M248-M249 | CalcResultService, fingerprinting, skip logic |
| 5 | Run Versioning | M250 | RunVersioningService, Iceberg branches |
| 6 | Materialized Views | M251 | MaterializedViewService, OLAP layer |
| 7 | Ref/Plat/Archive + Metadata Replicator | M252 | MetadataReplicator, tier Iceberg writes |
| 8 | API Endpoints | M253 | 14 lakehouse API endpoints |
| 9 | Pipeline Integration | M254 | Full Iceberg pipeline, data generation |
| 10 | Frontend Lakehouse Explorer | M255 | 6-panel tab in MedallionOverview |
| 11 | Phase D Completion | M256 | QA, docs, test count sync, PR |

---

## Dependencies

```
Task 1 → Tasks 2,3,4,5 (parallel) → Task 6 → Tasks 7,8 → Task 9,10 → Task 11
```

---

## New Files (17)

- `workspace/config/lakehouse.yaml` — deployment profiles
- `workspace/metadata/medallion/iceberg_config.json` — tier mapping
- `workspace/metadata/medallion/materialized_views.json` — MV definitions
- `workspace/metadata/governance/pii_registry.json` — PII field registry
- `workspace/metadata/governance/schema_history.json` — schema evolution log
- `backend/models/lakehouse.py` — Pydantic config/table/snapshot/run/MV models
- `backend/models/governance.py` — Pydantic PII/classification models
- `backend/models/calculation_optimization.py` — Pydantic fingerprint/result models
- `backend/services/lakehouse_service.py` — LakehouseService abstraction
- `backend/services/schema_evolution_service.py` — schema drift/evolution
- `backend/services/governance_service.py` — PII tagging/classification
- `backend/services/calc_result_service.py` — fingerprinting/skip/audit
- `backend/services/run_versioning_service.py` — pipeline runs/branches
- `backend/services/materialized_view_service.py` — MV refresh/status
- `backend/services/metadata_replicator.py` — JSON→Iceberg sync
- `backend/api/lakehouse.py` — 14 API endpoints
- `scripts/generate_iceberg_tables.py` — catalog init + populate

## Modified Files (17)

- `pyproject.toml` — add pyiceberg dependency
- `backend/config.py` — add lakehouse_env setting
- `backend/db.py` — Iceberg extension + service wiring
- `backend/engine/data_loader.py` — dual-write
- `backend/engine/calculation_engine.py` — fingerprint skip + Iceberg writes
- `backend/services/pipeline_orchestrator.py` — run versioning + Iceberg pipeline
- `backend/services/reference_service.py` — Reference Iceberg
- `backend/services/platinum_service.py` — Platinum Iceberg
- `backend/services/archive_service.py` — Archive Iceberg
- `backend/main.py` — register lakehouse router
- `workspace/metadata/medallion/tiers.json` — add storage_backend field
- `frontend/src/views/MedallionOverview/index.tsx` — Lakehouse tab
- `frontend/src/data/tourDefinitions.ts` — lakehouse tour
- `frontend/src/data/scenarioDefinitions.ts` — S34-S35
- `frontend/src/data/operationScripts.ts` — 7 operations
- `frontend/src/data/architectureRegistry.ts` — 6 sections
- `workspace/metadata/tours/registry.json` — counts
