# Apache Iceberg Lakehouse Architecture — Research Findings

**Date:** 2026-03-01
**Phase:** 21 (M243-M256)
**Branch:** `feature/lakehouse/iceberg-architecture`

---

## Catalog Landscape

| Catalog | Deployment | Multi-Tenant | Auth | Migration From SQLite |
|---------|-----------|-------------|------|-----------------------|
| **SQLite** (PyIceberg) | Embedded file | None | None | N/A — starting point |
| **PostgreSQL** (PyIceberg SQL) | Server | Namespace-level | DB auth | Config change only (`uri`) |
| **Polaris** (Apache, incubating) | K8s/Helm | Full RBAC | OAuth2/OIDC | Register existing tables |
| **Nessie** | K8s/Docker | Namespace + branching | OIDC | Register existing tables |
| **AWS Glue** | Managed (AWS-only) | Account-level | IAM | REST catalog bridge |
| **Unity Catalog** | Databricks/self-hosted | Full | Databricks auth | REST API |
| **Lakekeeper** | Single binary (Rust) | REST catalog | Configurable | Direct REST |

**Decision:** Start with SQLite SQL catalog (zero-dependency demo). Code targets the REST Catalog protocol via PyIceberg's abstraction. Swap to Polaris/Nessie/Glue by changing config only — zero code changes.

---

## Version Compatibility

| Component | Version | Iceberg Spec | Key Limitation |
|-----------|---------|-------------|----------------|
| PyIceberg | 0.11.0 | v1, v2, v3 read | Branch-aware writes maturing |
| DuckDB Iceberg ext | 1.4.2 | v1, v2 | No partitioned writes, no schema evolution |
| Iceberg spec v2 | 2.x | — | Row-level deletes, merge-on-read |
| Flink connector | 1.20 + Iceberg 1.9+ | v2 | Streaming writes GA |

---

## Cross-Engine Portability

ALL major engines support the Iceberg REST Catalog protocol: Spark, Flink, Trino, DuckDB, Snowflake, Databricks (UniForm), BigQuery (BigLake). Standardize on REST and catalog/compute/storage are independently swappable.

---

## Run Versioning

**Recommended: Iceberg branches (Write-Audit-Publish pattern)**
- Normal runs → write to `main`, tag snapshot (e.g., `run-20260301-daily-001`)
- Backfill/correction → create branch, write to branch, validate, fast-forward merge to main
- Production queries unaffected during branch processing
- Storage-efficient (shared data files until divergence)

---

## Multi-Tenancy

**Recommended: Namespace-per-tenant hybrid**
- `shared/` — reference data (venues, products, ISO standards)
- `tenant_{id}/` — all medallion tiers per tenant
- `platform/` — cross-tenant operational data (logs, metrics, metadata-as-data)
- DuckDB isolation via application-layer view scoping (no native RLS)

---

## Codebase Portability Assessment

**82 DuckDB-specific patterns** identified across 15 files. Key abstractions needed:
- `read_parquet()` → `iceberg_scan()` → PyIceberg `scan().to_arrow()` → view registration
- `fetch_arrow_table()` → abstract via query executor interface
- All 10 calc SQL templates and 5 detection model queries are standard ANSI SQL — portable

---

## Known Limitations & Workarounds

1. **DuckDB Iceberg writes on partitioned tables** — NOT supported. Use PyIceberg for all writes.
2. **PyIceberg branch-aware writes** — Maturing. Use `manage_snapshots()` API.
3. **DuckDB schema evolution** — NOT supported. All schema evolution via PyIceberg `update_schema()`.
4. **Iceberg column-level PII tagging** — No standard. Use dual-layer (table properties + metadata JSON).
5. **DuckDB row-level security** — NOT supported. Application-layer tenant scoping.
6. **Crypto-shredding** — Demo only (metadata-driven, no actual encryption).

---

## Migration Paths

### Catalog (Zero Code Changes)
- SQLite → PostgreSQL: change `uri` in `lakehouse.yaml`
- SQLite → Polaris REST: change `type: rest` in `lakehouse.yaml`
- SQLite → AWS Glue: change `type: glue` in `lakehouse.yaml`

### Compute
- DuckDB → Spark/Flink/Trino: same ANSI SQL templates, different execution context

### Storage
- Local → S3/ADLS/GCS: set endpoint in `lakehouse.yaml`, PyIceberg FileIO handles it

### Framework Integration
- Databricks: REST catalog, UniForm reads Delta as Iceberg
- Snowflake: External catalog-linked tables via REST
- Flink: `iceberg-flink-runtime` JAR, REST catalog
- Spark: `iceberg-spark-runtime` JAR, REST catalog

---

## Future Phases (Not In This Plan)

1. Auth & RBAC (Polaris OIDC, role-to-namespace)
2. Crypto-shredding implementation (AES-256-GCM)
3. Nessie branching for Sandbox tier
4. Flink streaming (CDC pipeline)
5. Partitioned tables (when PyIceberg/DuckDB support matures)
6. Snapshot expiration (automated cleanup)
7. Parallel calc execution (DAG parallelization)
8. REST catalog server (Polaris/Lakekeeper)
