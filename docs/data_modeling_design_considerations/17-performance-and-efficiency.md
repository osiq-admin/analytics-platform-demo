# Performance and Efficiency

**Document**: 17 of the Data Modeling Design Considerations series
**Audience**: Data Engineers, Architects
**Last updated**: 2026-03-09

---

## 1. Query Optimization

The unified `calc_results` table, `time_windows` table, and `match_pattern_attributes` table each serve different query patterns with different access frequencies. Indexing strategy must align with how these tables are actually queried during detection, scoring, and audit workflows.

### 1.1 Indexing Strategy for `calc_results`

The `calc_results` table is the single highest-traffic table in the system. Every detection model reads from it, every alert traces back to it, and every audit query lands on it. Four index patterns cover the full range of access:

| Index | Columns | Query Pattern | Frequency |
|---|---|---|---|
| **Primary** | `(calc_id, business_date)` | All results for a specific calculation on a specific date. This is the default detection query: "what did `large_trading_activity` compute on 2026-03-09?" | Every detection model evaluation |
| **Secondary** | `(product_id, business_date)` | Product-centric queries: "show me all calculation results for AAPL on this date." Used by the Data Manager product detail panel and alert investigation drill-down. | On-demand, per-investigation |
| **Secondary** | `(account_id, business_date)` | Account-centric queries: "show me all calculation results for ACC-00042 on this date." Used by the Risk Case Manager case detail view. | On-demand, per-investigation |
| **Composite** | `(calc_id, product_id, business_date)` | Model-specific detection queries that filter to a single product within a single calculation. The tightest possible scan for detection: "what did `vwap_proximity` compute for AAPL on 2026-03-09?" | Per-candidate during scoring |

**Index selection rationale.** The primary index `(calc_id, business_date)` is chosen because detection models iterate over calculations, not over products. A model evaluating 10 calculations on one date issues 10 queries, each filtered by `calc_id` and `business_date`. The composite index adds `product_id` for the inner loop where the model evaluates each product within a calculation --- this narrows the scan from all products to one, reducing I/O by a factor of the product count (currently 50).

The secondary indexes support the reverse access pattern: starting from an entity (product or account) and finding all calculations that touched it. These are read-path-only indexes used for investigation and audit, not for detection processing.

### 1.2 Indexing Strategy for `time_windows`

The `time_windows` table stores both simple (precomputed) and complex (on-the-fly) window boundaries. Detection queries join against it to scope their temporal analysis.

| Index | Columns | Query Pattern |
|---|---|---|
| **Primary** | `(window_type, business_date)` | "Give me all `business_date` windows for 2026-03-09." Detection models resolve their time window type from metadata, then look up boundaries by `(type, date)`. |
| **Secondary** | `(product_id, business_date)` | "Which time windows apply to AAPL on 2026-03-09?" Product-specific complex windows (e.g., a cancellation burst for a specific product) require product-level filtering. |

**Cardinality estimate.** Simple windows produce one row per exchange per date: 6 venues x 252 trading days = 1,512 rows/year. Complex windows produce variable rows --- a cancellation burst detection might find 0--20 windows per product per date. At 50 products x 252 days x 5 average complex windows = 63,000 rows/year. Total: ~65,000 rows/year, well within single-table performance bounds.

### 1.3 Indexing Strategy for `match_pattern_attributes`

Match pattern resolution happens at two points: at pipeline start (batch load into memory) and during reverse lookups ("which patterns match this context?").

| Index | Columns | Query Pattern |
|---|---|---|
| **Primary** | `(pattern_id)` | Forward lookup: load all attributes for a known pattern. Used during batch initialization when the resolution cache is populated. |
| **Secondary** | `(entity, entity_attribute, attribute_value)` | Reverse lookup: "which patterns reference `product.asset_class = equity`?" Used by the configuration UI to show pattern impact analysis ("if I change this pattern, which calculations are affected?"). |

**Row count.** The current platform defines 9 match patterns. At the proposed scale of ~100 patterns with ~5 attributes each, the table holds ~500 rows. This entire table is loaded into memory at pipeline start and held for the duration of the processing run (see Section 2.4).

### 1.4 Partition Strategy

Partitioning becomes relevant as `calc_results` grows beyond single-table scan performance. The partition key is `business_date` --- the natural temporal boundary that aligns with daily processing semantics.

**Why `business_date`.**
- Detection queries always filter by date. Partition pruning eliminates all non-matching partitions before the scan begins.
- Daily processing writes results for exactly one date. Writes are append-only within a partition, no update contention across partitions.
- Regulatory retention requirements align with date-based archival: partitions older than N years can be moved to cold storage as complete units.

**Partition scheme by scale:**

| Row Count | Strategy | Notes |
|---|---|---|
| < 10M rows | No partitioning | DuckDB columnar scans handle this without partition overhead |
| 10M--100M rows | Partition by `business_date` (monthly) | ~12 partitions/year, pruning reduces scan to 1 month |
| 100M+ rows | Partition by `business_date` + `calc_id` | Nested partition, pruning reduces scan to 1 month x 1 calculation |

**Cold/hot partitioning.** Recent dates (current month + N months lookback per regulatory requirement) reside in DuckDB's in-memory working set. Older dates are materialized as Parquet files on disk. DuckDB's external Parquet scan capability enables seamless querying across hot (in-memory) and cold (on-disk) partitions without application-level routing.

```
              HOT                           COLD
   ┌──────────────────────┐    ┌──────────────────────────────┐
   │  DuckDB in-memory    │    │  Parquet files on disk        │
   │  Current month       │    │  Historical months/years      │
   │  ~100K rows          │    │  Compressed columnar storage   │
   │  <10ms query          │    │  ~100ms scan with predicate   │
   │                      │    │  pushdown                      │
   └──────────────────────┘    └──────────────────────────────┘
                    \                    /
                     \                  /
                      v                v
                ┌─────────────────────────┐
                │  DuckDB query engine     │
                │  Unified query plan      │
                │  Transparent to caller   │
                └─────────────────────────┘
```

---

## 2. Computation Efficiency

The detection pipeline has four categories of computation, each with distinct caching and reuse characteristics. The design minimizes redundant work by ensuring each computation runs exactly once per unique input context.

### 2.1 Simple Time Windows

Simple time windows are deterministic given an exchange schedule and a business date cutoff setting. They do not depend on market data content --- only on calendar metadata.

**Computation strategy:**
- Precomputed in batch at the start of the processing day, before any detection model runs.
- One computation per exchange per date.
- Cached in the `time_windows` table for the entire processing run.
- All downstream calculations reference the cached rows; no recomputation.

**Current scale:**
- 6 venues (XNYS, XNAS, XLON, XCME, XHKG, XCBF) x 1 business date = 6 rows per run.
- Computation time: <1ms per venue (calendar lookup + cutoff setting resolution).
- Total: ~6ms for all simple windows. Negligible.

**Why precomputation matters.** Without precomputation, every calculation that references `business_date_window` would independently compute the window boundaries. With 10 calculations across 5 models, each referencing the business date window, that is 50 redundant computations of a deterministic value. Precomputing once and caching eliminates 49 of those 50 executions.

### 2.2 Complex Time Windows

Complex time windows are discovered during detection --- their existence and boundaries depend on patterns in market data that cannot be predicted from calendar metadata alone.

**Computation strategy:**
- Computed on-the-fly during the first detection model that requires them.
- Results written to the `time_windows` table immediately after discovery.
- Subsequent calculations and models reuse the discovered windows from the table.
- No recomputation for the same `(window_type, product_id, business_date)` tuple.

**Example: Cancellation burst detection.**
1. The `cancellation_pattern` calculation scans order data for clusters of cancellations within short time intervals.
2. Each discovered cluster becomes a row in `time_windows` with `window_type = 'cancellation_burst'`, recording the cluster's start and end timestamps.
3. The `spoofing_layering` model's downstream calculations reference these discovered windows to scope their analysis to the exact time intervals where cancellation bursts occurred.
4. If a second model (e.g., a future `layering_v2` model) also references `cancellation_burst` windows, it reads the already-discovered rows --- no re-scan of order data.

**Estimated cost.** Cancellation burst detection scans the order table (786 rows in current data) once. At DuckDB's vectorized processing rate of ~1M rows/second for filter-and-group queries, this completes in <1ms. At production scale (100K orders/day), this remains under 100ms.

### 2.3 Calculation Instance Resolution

When a detection model evaluates a calculation, it must resolve the correct parameter values for the current entity context. This resolution involves:
1. Loading the calculation's setting bindings (which settings does this calc reference?).
2. Resolving each setting against the current entity context using match patterns.
3. Parameterizing the calculation SQL with the resolved values.
4. Executing the parameterized SQL.

**Caching strategy:**
- Resolution results are cached per `(setting_id, context_hash)` tuple.
- `context_hash` is computed from the entity attributes relevant to the setting's match patterns (e.g., `{asset_class: "equity", exchange_mic: "XNYS"}` hashes to a stable key).
- A setting resolved once for a given context is never re-resolved during the same run.
- The parameterized SQL template is generated once per unique `(calc_id, resolved_params)` combination and reused for all rows that share that context.

**What this avoids.** Without instance-level caching, a calculation evaluating 50 products would resolve settings 50 times. With caching, if 30 of those products share `asset_class = equity`, the setting resolves once for the equity context and the cached result serves the remaining 29.

**Current numbers:**
- 10 calculations x 14 settings = 140 potential resolution lookups per run.
- With 5 distinct asset classes and 6 venues, the maximum number of unique contexts is 30 (5 x 6).
- Actual unique resolutions per run: ~30--50 (due to stacking, some settings have more granular patterns).
- Resolution time: ~1ms per lookup (in-memory comparison against ~500 pattern attribute rows).
- Total resolution cost: ~30--50ms per run, amortized across all calculations and models.

### 2.4 Match Pattern Resolution Caching

The match pattern resolution cache is the foundational layer that makes all other caching efficient. It loads the entire `match_pattern_attributes` table into memory at pipeline start and performs all resolution as in-memory comparisons.

**Loading strategy:**
- All rows from `match_pattern_attributes` loaded into a dictionary keyed by `pattern_id` at pipeline initialization.
- All rows from `match_patterns` loaded to map `pattern_id` to `pattern_type`.
- Loading happens once, takes <1ms for ~500 rows.

**Resolution mechanics:**
- For each `(setting_id, context)` resolution request:
  1. Look up which pattern IDs are bound to this setting via `calc_pattern_bindings`.
  2. For each bound pattern, check if all attribute rows match the current context (in-memory comparison).
  3. Rank matching patterns by attribute count (specificity).
  4. Return the highest-specificity match.
- All comparisons are dictionary lookups and equality checks --- no database queries, no I/O.

**Cache invalidation:**
- The cache is valid for the duration of a single processing run.
- Invalidation triggers: pattern version change (detected by comparing the `version` field on `match_patterns` against the cached version).
- In practice, pattern definitions change between runs (configuration updates), not during runs. The per-run cache lifetime aligns perfectly with this update cadence.

**Memory footprint:**
- ~100 patterns x ~5 attributes = ~500 rows.
- Each row: ~4 varchar fields x ~20 bytes average = ~80 bytes/row.
- Total: ~40KB. Negligible relative to DuckDB's working memory.

---

## 3. Materialization Strategy

Not all data should be computed at the same time. The materialization strategy distinguishes between data that is profitable to precompute and data that should be computed on demand.

### 3.1 Pre-Materialized (Computed Ahead of Time)

These are computed once at pipeline start and cached for the entire run. They have deterministic outputs given the current metadata state and do not depend on market data content.

| Artifact | Computation | Lifetime | Storage |
|---|---|---|---|
| Simple time windows | Calendar + cutoff settings | Per-date | `time_windows` table |
| Entity dimension tables | Denormalized from JSON metadata (product, account, venue, trader) | Per-run | DuckDB in-memory tables |
| Match pattern resolution cache | Loaded from `match_pattern_attributes` | Per-run | In-memory dictionary (~40KB) |
| Score step lookup tables | Loaded from settings with `value_type = score_steps` | Per-run | In-memory list (~2KB per setting) |

**Total pre-materialization cost:** <100ms at pipeline start, producing all cached artifacts for the run.

### 3.2 On-Demand (Computed During Detection)

These are computed as detection models require them, with results cached for reuse by subsequent models.

| Artifact | Trigger | Caching | Reuse |
|---|---|---|---|
| Complex time windows | First detection model that references the window type | Written to `time_windows` table | All subsequent models read from table |
| Calculation results (`calc_results` rows) | DAG execution order; each calc runs once per instance | Written to `calc_results` table | All detection models query the table |
| Score evaluations | Per-candidate during model evaluation | Not cached (stateless function of value + score steps) | Recomputed per candidate (~0.01ms each) |
| Alert traces | Per-candidate that exceeds score threshold | Written to alert trace JSON | Post-processing and investigation |

**Why score evaluations are not cached.** Score step evaluation is a binary search over a sorted list of 3--5 steps: given a value, find which step range contains it and return the score. This takes ~0.01ms. Caching would add overhead (hash computation + dictionary lookup) that exceeds the cost of recomputation. The break-even point for caching is ~1ms per evaluation, which score steps never approach.

### 3.3 Materialized Views for Common Queries

Frequently-accessed aggregate queries benefit from materialized views that DuckDB maintains. These serve the dashboard, compliance reporting, and operational monitoring without requiring full table scans.

```sql
-- Daily alert summary by model
-- Serves: Dashboard widget "Alerts by Model", compliance daily report
CREATE VIEW v_daily_alerts AS
SELECT business_date,
       model_id,
       COUNT(*)              AS alert_count,
       AVG(accumulated_score) AS avg_score,
       MAX(accumulated_score) AS max_score,
       MIN(accumulated_score) AS min_score
FROM alerts
GROUP BY business_date, model_id;
```

```sql
-- Calculation coverage: how many products did each calc evaluate?
-- Serves: Pipeline Monitor, calculation health checks
CREATE VIEW v_calc_coverage AS
SELECT calc_id,
       business_date,
       COUNT(DISTINCT product_id) AS products_covered,
       COUNT(*)                   AS total_rows,
       AVG(value)                 AS avg_value,
       MAX(value)                 AS max_value
FROM calc_results
GROUP BY calc_id, business_date;
```

```sql
-- Score distribution by model and asset class
-- Serves: Model Composer effectiveness analysis
CREATE VIEW v_score_distribution AS
SELECT a.model_id,
       p.asset_class,
       a.business_date,
       COUNT(*)                        AS candidate_count,
       SUM(CASE WHEN a.is_alert THEN 1 ELSE 0 END) AS alert_count,
       AVG(a.accumulated_score)        AS avg_score,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY a.accumulated_score) AS p50_score,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY a.accumulated_score) AS p95_score
FROM alerts a
JOIN products p ON a.product_id = p.product_id
GROUP BY a.model_id, p.asset_class, a.business_date;
```

```sql
-- Settings resolution audit trail
-- Serves: Settings Manager, compliance audit
CREATE VIEW v_resolution_audit AS
SELECT r.setting_id,
       r.pattern_id,
       r.resolved_value,
       r.context_hash,
       r.resolution_timestamp,
       mp.description AS pattern_description,
       COUNT(*) AS times_used
FROM resolution_log r
JOIN match_patterns mp ON r.pattern_id = mp.pattern_id
GROUP BY r.setting_id, r.pattern_id, r.resolved_value,
         r.context_hash, r.resolution_timestamp, mp.description;
```

---

## 4. Scalability Analysis

### 4.1 Single `calc_results` Table Scalability

The unified `calc_results` table is the central architectural decision of this design (see document 09). Its scalability determines whether the "one table for all models" approach remains viable as the platform grows.

**Row count estimation:**

| Parameter | Current | Moderate Scale | Full Scale |
|---|---|---|---|
| Calculations | 10 | 25 | 50 |
| Products | 50 | 200 | 500 |
| Accounts | 220 | 500 | 1,000 |
| Trading days/year | 252 | 252 | 252 |
| Rows/year (calc x product x date) | ~126K | ~1.26M | ~6.3M |
| Rows/year (with account dimension) | ~27.7M | ~25.2M | ~126M |

The account dimension is the primary cardinality driver. Not all calculations produce per-account rows --- many aggregate at the product level. The actual row count depends on the detection level configuration:

- **Product-level calcs** (e.g., `business_date_window`, `trend_window`): product x date = 50 x 252 = 12,600 rows/year
- **Product+account calcs** (e.g., `wash_detection`, `large_trading_activity`): product x account x date = 50 x 220 x 252 = 2,772,000 rows/year per calc
- **Blended estimate** (current 10 calcs: 4 product-level, 6 product+account): ~16.7M rows/year

**DuckDB handling characteristics at scale:**

| Scale | Row Count | Storage (Parquet) | Query Time (filtered) | Query Time (full scan) |
|---|---|---|---|---|
| Current (10 calcs, 50 products) | ~16.7M/year | ~200MB | <10ms | ~500ms |
| Moderate (25 calcs, 200 products) | ~80M/year | ~1GB | <20ms | ~2s |
| Full (50 calcs, 500 products) | ~400M/year | ~5GB | <50ms | ~8s |

**Why this works.** DuckDB's columnar storage compresses sparse nullable columns to near-zero for NULL values. The `calc_results` table uses an EAV-inspired schema where many columns are NULL for any given calculation type (see document 09). A row produced by `large_trading_activity` has values in `value`, `product_id`, `account_id`, and `business_date`, but NULLs in fields specific to other calculations. Columnar compression represents these NULLs as run-length encoded bitmasks, adding negligible storage overhead.

### 4.2 When to Partition

The partition strategy follows a simple decision tree based on `calc_results` row count:

```
                         Row Count
                            │
                    ┌───────┼───────┐
                    │       │       │
               < 10M    10M-100M   > 100M
                    │       │       │
            No partition  Partition  Partition by
                         by date    date + calc_id
                         (monthly)  (nested)
```

**< 10M rows: No partitioning.**
DuckDB's vectorized columnar scan processes 10M rows in ~500ms for a filtered query. Partition management overhead (metadata tracking, partition pruning logic, file management) is not justified at this scale.

**10M--100M rows: Partition by `business_date` (monthly).**
Monthly partitions produce ~12 files/year. A detection query for a single date scans 1 partition (~1/12 of data) instead of the full table. Expected query time improvement: ~12x for date-filtered queries.

Partition format: Parquet files named `calc_results_YYYY_MM.parquet`.

**100M+ rows: Partition by `business_date` + `calc_id`.**
At 100M+ rows, monthly partitions contain ~8M rows each. Adding `calc_id` as a secondary partition key reduces scan size to ~1/N of the monthly partition (where N = number of distinct calculations). With 50 calculations, a filtered query scans ~160K rows instead of 8M.

Partition format: directory structure `calc_results/YYYY_MM/calc_id.parquet`.

### 4.3 Write Scalability

Detection results are write-once-read-many. No row in `calc_results` is ever updated after it is written. This enables:

- **Append-only writes.** No locking, no update contention, no WAL overhead for updates.
- **Partition-aligned writes.** All writes for a processing run target the same date partition. No cross-partition transactions.
- **Batch inserts.** DuckDB's `INSERT INTO ... SELECT` processes bulk results efficiently: ~1M rows/second for columnar inserts from query results.

---

## 5. DuckDB-Specific Optimizations

The platform uses DuckDB as an embedded analytical database. Several DuckDB-specific characteristics directly inform the performance design.

### 5.1 Columnar Storage and Compression

DuckDB stores data in columnar format, which provides two performance advantages for the surveillance workload:

- **Compression of sparse nullable columns.** The EAV-inspired `calc_results` schema has many columns that are NULL for any given row. Columnar storage compresses NULL-heavy columns using run-length encoding and dictionary compression. A column that is 90% NULL compresses to ~10% of its dense equivalent.
- **Scan only needed columns.** A detection query that filters on `(calc_id, business_date)` and reads `(product_id, value)` touches only 4 columns out of potentially 20+. Columnar storage skips the untouched columns entirely, reducing I/O proportionally.

### 5.2 Vectorized Execution

DuckDB processes data in vectors (batches of ~2048 rows), not row-by-row. This matters for:

- **Aggregation queries.** `SUM`, `AVG`, `COUNT` over `calc_results` process 2048 rows per CPU cycle, not 1.
- **Filter evaluation.** Predicate evaluation on `calc_id = 'wash_detection' AND business_date = '2026-03-09'` is applied to entire vectors using SIMD instructions where available.
- **Hash joins.** Joining `calc_results` with `time_windows` on `(product_id, business_date)` processes hash probes in vectorized batches.

**Impact.** Vectorized execution provides a ~10x throughput improvement over row-at-a-time processing for the analytical query patterns used in detection.

### 5.3 Predicate Pushdown

DuckDB pushes filter predicates as close to the data source as possible:

- **Parquet predicate pushdown.** When scanning Parquet files (cold storage), DuckDB reads row group statistics (min/max values per column) and skips row groups that cannot contain matching rows. A query filtered on `business_date = '2026-03-09'` skips all row groups where `max(business_date) < '2026-03-09'`.
- **Join pushdown.** Filter predicates from outer queries propagate into subqueries and joins, narrowing the scan at each stage.

### 5.4 Parallel Execution

DuckDB uses intra-query parallelism to distribute work across CPU cores:

- **Scan parallelism.** Multiple threads scan different segments of a table or different Parquet files simultaneously.
- **Aggregation parallelism.** Partial aggregates computed per-thread are merged in a final reduction step.
- **Pipeline parallelism.** Independent pipeline stages execute concurrently.

On a 4-core machine (typical development/demo environment), parallel execution provides ~3x throughput improvement for table scans and aggregations (scaling is sub-linear due to coordination overhead).

### 5.5 Memory-Mapped Parquet Access

DuckDB memory-maps Parquet files for cold storage access, avoiding the need to copy data into a separate buffer. This provides:

- **Zero-copy reads.** The OS page cache serves Parquet data directly to DuckDB's query engine.
- **Lazy loading.** Only the Parquet row groups and columns that the query actually touches are paged into memory.
- **OS-managed caching.** Frequently accessed Parquet files remain in the OS page cache without DuckDB explicitly managing a buffer pool.

### 5.6 Embedded Architecture --- No Network Overhead

DuckDB runs in-process with the FastAPI application. There is no client-server protocol, no TCP/IP round trips, no serialization/deserialization between application and database. The function call overhead for a query is measured in microseconds, not milliseconds.

This embedded architecture means:

- **Latency floor.** The minimum query latency is bounded by I/O and computation, not by network round trips. A trivial query (e.g., `SELECT 1`) returns in ~10 microseconds.
- **No connection pooling.** The application holds a single DuckDB connection. No connection acquisition latency, no pool exhaustion, no connection leak risk.
- **Simplified deployment.** No database server to provision, configure, monitor, or upgrade. DuckDB is a library linked into the Python process.

---

## 6. Caching Hierarchy

The platform's caching strategy uses three tiers with increasing latency and decreasing freshness. Each tier serves a distinct purpose in the processing pipeline.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  L1: In-Memory Cache                                            │
│  ─────────────────                                              │
│  Contents: Match pattern resolution cache, settings cache,      │
│            score step lookup tables, entity dimension tables     │
│  Lifetime: Per-run (invalidated at pipeline start)              │
│  Latency:  ~0.001ms (dictionary lookup)                         │
│  Size:     ~100KB (500 pattern rows + 14 settings + 50 score    │
│            step lists + entity dimensions)                       │
│  Access:   Every settings resolution, every score evaluation    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L2: DuckDB Tables (Hot Storage)                                │
│  ───────────────────────────────                                │
│  Contents: calc_results (current date), time_windows (current   │
│            date), alerts (current date), entity base tables      │
│  Lifetime: Per-date (current processing date in-memory,         │
│            persisted to Parquet on completion)                   │
│  Latency:  ~1-10ms (columnar scan with predicate pushdown)      │
│  Size:     ~50-200MB (depends on entity count and calc count)   │
│  Access:   Detection model queries, alert generation,           │
│            dashboard views                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L3: Parquet Files (Cold Storage)                               │
│  ────────────────────────────────                               │
│  Contents: Historical calc_results, archived alerts,            │
│            prior-date time_windows, audit logs                  │
│  Lifetime: Permanent (regulatory retention)                     │
│  Latency:  ~50-100ms (Parquet scan with row group pruning)      │
│  Size:     ~200MB-5GB per year (compressed columnar)            │
│  Access:   Historical investigation, trend analysis,            │
│            regulatory audit, compliance reporting               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Coherence

The three-tier hierarchy avoids coherence problems through a strict lifecycle:

1. **L1 is rebuilt at pipeline start.** No stale data from prior runs can contaminate the current run.
2. **L2 is append-only within a run.** Calculation results and time windows are written once and never updated, so readers always see consistent data.
3. **L3 is immutable.** Parquet files are written at the end of a processing day and never modified. Historical queries always return the exact data that was produced on that date.

There is no cross-tier invalidation because data flows in one direction: L1 informs L2 writes, L2 is flushed to L3 at end-of-day. No tier reads from a lower tier during the write path.

### Cache Miss Costs

| Scenario | Without Cache | With Cache | Speedup |
|---|---|---|---|
| Settings resolution (per call) | ~5ms (DB query + pattern matching) | ~0.001ms (dictionary lookup) | ~5,000x |
| Score step evaluation (per candidate) | ~0.5ms (load steps from DB) | ~0.01ms (in-memory binary search) | ~50x |
| Time window lookup (per calc) | ~2ms (scan time_windows table) | ~0.01ms (L2 DuckDB table, pre-filtered) | ~200x |
| Historical alert lookup | ~500ms (scan raw data) | ~100ms (Parquet with pruning) | ~5x |

---

## 7. Benchmarks and Targets

All benchmarks measured on the current platform (8 entities, 10 calcs, 5 models, 50 products, 220 accounts, 82 alerts) running on a single-process embedded DuckDB instance. "Target" represents achievable performance with the proposed unified data model optimizations.

| Operation | Current | Target | Delta | Notes |
|---|---|---|---|---|
| Full DAG execution (10 calcs) | ~2s | ~2s | -- | Already efficient; DAG topological sort + sequential SQL execution. Parallelization of independent calcs is a future opportunity but not a bottleneck. |
| Detection model evaluation (per model) | ~500ms | ~200ms | 2.5x | Current: per-model result tables require cross-table joins. Proposed: single `calc_results` table eliminates 4--8 joins per model. |
| Settings resolution (per call) | ~1ms | ~0.1ms | 10x | Current: JSON file read + in-memory match. Proposed: preloaded match pattern cache with hash-based lookup. |
| Alert generation (82 alerts) | ~3s | ~1s | 3x | Current: sequential per-candidate evaluation with individual DB queries. Proposed: batch scoring with vectorized score step evaluation. |
| Score step evaluation (per candidate) | ~0.01ms | ~0.01ms | -- | Already optimal. In-memory binary search over 3--5 steps. No further optimization warranted. |
| Daily full pipeline (all models) | ~10s | ~5s | 2x | Sum of above improvements. Primary gains from reduced join count and batch processing. |
| Time window precomputation | ~50ms | ~6ms | 8x | Current: computed per-model. Proposed: computed once, cached in `time_windows` table. |
| Match pattern resolution (full cache build) | N/A | ~1ms | -- | New capability. 500 rows loaded into memory dictionary. |
| Cold storage query (1 month historical) | ~500ms | ~100ms | 5x | Current: re-scan raw CSV/Parquet. Proposed: pre-partitioned Parquet with predicate pushdown. |

### Scaling Projections

The following projections estimate pipeline runtime at increased scale, assuming the proposed optimizations are in place:

| Scale Factor | Products | Accounts | Calcs | Models | Est. Pipeline Time | Bottleneck |
|---|---|---|---|---|---|---|
| 1x (current) | 50 | 220 | 10 | 5 | ~5s | DAG execution |
| 5x | 250 | 500 | 25 | 10 | ~25s | DAG execution (linear in calc count) |
| 10x | 500 | 1,000 | 50 | 20 | ~90s | `calc_results` write volume |
| 20x | 1,000 | 2,000 | 50 | 50 | ~300s | `calc_results` write + scan volume |

**Linearity analysis.** Pipeline time scales linearly with calculation count (each calc runs once) and sub-linearly with product/account count (vectorized execution amortizes per-row overhead). The primary scaling concern at 20x is write throughput: 50 calcs x 1,000 products x 2,000 accounts x 1 date = 100M rows to write and index per day.

**Mitigation at 20x scale:**
- Partition by `calc_id` to parallelize writes across partitions.
- Use `INSERT INTO ... SELECT` (single statement, no per-row overhead) for each calculation's results.
- Consider DuckDB's Parquet direct-write mode to bypass the in-memory table for historical data.

---

## Cross-References

| Document | Relationship to This Document |
|---|---|
| 04 Match Pattern Architecture | Defines the `match_pattern_attributes` table that Section 1.3 indexes and Section 2.4 caches |
| 05 Calculation Instance Model | Defines the `(calc_id, pattern_id, resolved_params)` tuple that Section 2.3 caches |
| 06 Time Window Framework | Defines simple vs complex windows that Section 2.1 and 2.2 optimize |
| 08 Resolution Priority Rules | Defines the resolution algorithm that Section 2.3 and 2.4 cache |
| 09 Unified Results Schema | Defines the `calc_results` table that Section 1.1 indexes and Section 4.1 scales |
| 10 Scoring and Alerting Pipeline | Defines score step evaluation that Section 2 benchmarks |
| 14 Medallion Integration | Defines the tier placement that informs the hot/cold partitioning in Section 1.4 |
| 16 Lifecycle and Governance | Defines pattern versioning that drives cache invalidation in Section 2.4 |
| Appendix A | Full DDL for all indexed tables |
| Appendix B | Worked examples showing query plans and execution times |
