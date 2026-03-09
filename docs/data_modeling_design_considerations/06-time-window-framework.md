# 06 --- Time Window Framework

> Time window types, registration, lifecycle, and join semantics with calculation instances.

**Audience**: Data Engineers, Financial Modelers
**Last updated**: 2026-03-09

---

## 1. Time Windows as First-Class Objects

### Current State

Today, time windows are calculations like any other. They live in the `time_window` layer of the calculation DAG and produce output tables (`calc_business_date_window`, `calc_cancellation_pattern`, `calc_trend_window`, `calc_market_event_window`) that downstream calculations reference through standard `depends_on` edges.

This works, but it conflates two fundamentally different concerns:

- **What interval of time to analyze** (the window)
- **What to compute within that interval** (the calculation)

When a detection model references `business_date_window`, it is not asking for a calculated metric -- it is asking for a temporal scope. But the current system treats that scope definition identically to a value computation, which means:

1. Windows cannot be shared across models without duplicating DAG edges.
2. There is no way to precompute windows independently of the calculations that consume them.
3. The relationship between "time scope" and "what gets computed in that scope" is implicit, buried in SQL join conditions rather than declared in metadata.

### Proposed State

Elevate time windows to **first-class objects** with their own result table (`time_windows`) that is separate from the calculation results pipeline. Time windows are registered after computation -- either batch-precomputed or discovered during execution -- and become joinable with calculation instances.

This separation enables three capabilities that the current architecture cannot support:

- **Reuse across models.** A `business_date` window computed once for 2026-03-09 on XNYS can be referenced by wash trading, market price ramping, and any future model. No redundant computation, no duplicated DAG edges.

- **Independent scheduling.** Simple windows (business date boundaries) can be precomputed at the start of each trading day, before any detection model runs. Complex windows (cancellation bursts, price trends) are discovered during execution but still registered in the same table for uniform downstream consumption.

- **Explicit scoping.** A detection model's metadata declares `"time_window": "trend_window"` (as it does today), but now that declaration maps to a lookup in the `time_windows` table rather than a DAG dependency. The scoping is data, not wiring.

---

## 2. Two Categories of Time Windows

Time windows fall into two categories based on how and when they are determined. This distinction drives performance optimization and scheduling strategy.

| Property | Simple Windows | Complex Windows |
|---|---|---|
| **Definition** | Known boundaries derived from calendar, exchange schedule, or fixed intervals | Emergent boundaries discovered through pattern detection in market data |
| **Examples** | Business date cutoff, 5-minute bars, hourly aggregation, trading session boundaries | Cancellation burst clusters, price ramp sequences, volume spike events |
| **Computation** | Batch precomputed before any detection model runs | On-the-fly pattern detection during execution |
| **Registration** | Upfront -- boundaries are deterministic given exchange schedules and cutoff settings | Discovered during execution -- the number, timing, and scope of windows cannot be predicted |
| **Predictability** | Fully predictable: "XNYS will have exactly one business_date window for 2026-03-09" | Unpredictable: "PRD-001 may have 0, 1, or 5 cancellation burst windows on any given day" |

### Why This Distinction Matters

**For performance:** Simple windows can be materialized once and reused by every calculation and detection model that runs on a given business date. Computing the XNYS business date boundary once and sharing it across all models avoids redundant date-arithmetic in every downstream query. By contrast, complex windows are inherently coupled to their detection logic -- you cannot know a cancellation burst exists until you scan the order data. Attempting to precompute complex windows would require running the full pattern detection pipeline upfront, defeating the purpose.

**For scheduling:** A batch orchestrator can divide work into phases:

1. **Phase 1 -- Register simple windows.** Compute all business date and session boundaries for all exchanges. These are cheap, deterministic, and fully parallelizable.
2. **Phase 2 -- Run time-window-layer calculations.** Execute complex window detection (cancellation patterns, trend detection, market events). Each discovered window is registered in the `time_windows` table as it is found.
3. **Phase 3 -- Run downstream calculations.** Aggregations and derived calculations join against the now-populated `time_windows` table, regardless of whether the window was simple or complex.

This phased approach means simple windows are available before any calculation runs, while complex windows are registered as soon as they are discovered, making them immediately available to subsequent pipeline stages.

---

## 3. Proposed Schema

```sql
CREATE TABLE time_windows (
  window_id        VARCHAR PRIMARY KEY,
  window_type      VARCHAR NOT NULL,        -- 'business_date', 'cancellation_pattern', 'trend', 'market_event'
  detection_method VARCHAR NOT NULL,        -- 'simple' | 'complex'
  product_id       VARCHAR,                 -- nullable: scoped to a product when relevant
  account_id       VARCHAR,                 -- nullable: scoped to an account when relevant
  venue_id         VARCHAR,                 -- nullable: scoped to a venue/exchange when relevant
  start_ts         TIMESTAMP NOT NULL,      -- window start boundary
  end_ts           TIMESTAMP NOT NULL,      -- window end boundary
  business_date    DATE,                    -- the business date this window belongs to
  metadata         JSON,                    -- additional context (cancel_count, trend_type, price_change_pct, etc.)
  computed_at      TIMESTAMP NOT NULL       -- when this window was registered
);
```

### Column-by-Column Purpose

| Column | Purpose |
|---|---|
| `window_id` | Globally unique identifier. For simple windows, deterministic (e.g., `bdate_XNYS_2026-03-09`). For complex windows, derived from discovered pattern attributes (e.g., `cancel_PRD001_ACC042_2026-03-09_SELL`). |
| `window_type` | Discriminator that links this window to a category of time-scoped analysis. Maps directly to the `"time_window"` field in detection model metadata. |
| `detection_method` | Whether the window was precomputed (`simple`) or discovered during execution (`complex`). Drives caching and recomputation strategy. |
| `product_id` | The product this window applies to. NULL for windows that span all products (e.g., a venue-wide business date window). |
| `account_id` | The account this window applies to. NULL for windows that are not account-specific. Cancellation patterns are scoped to product+account; business date windows are not. |
| `venue_id` | The venue/exchange this window applies to. A business date window is venue-specific (XNYS vs. XLON have different cutoffs); a trend window is product-specific, not venue-specific. |
| `start_ts` | The beginning of the time interval. For a business date window, this is the start of the trading day. For a cancellation burst, this is the timestamp of the first cancelled order in the cluster. |
| `end_ts` | The end of the time interval. For a business date window, this is the cutoff time. For a cancellation burst, this is the last cancellation timestamp plus the configured lookforward buffer. |
| `business_date` | The business date this window falls on. Enables efficient partition-based lookups. A single business date may contain multiple complex windows but exactly one simple business_date window per venue. |
| `metadata` | Extensible JSON payload carrying window-type-specific context. Cancellation patterns store `cancel_count`, `cancel_quantity`, `pattern_side`. Trends store `trend_type`, `price_change_pct`, `start_price`, `end_price`. Market events store `event_type`, `lookback_start`, `lookforward_end`. |
| `computed_at` | Timestamp of when this window row was registered. Enables audit trail, staleness checks, and recomputation decisions. |

### Why Sparse Nullable Entity Columns

The entity columns (`product_id`, `account_id`, `venue_id`) are intentionally nullable because different window types scope to different entity combinations:

| Window Type | product_id | account_id | venue_id | Rationale |
|---|---|---|---|---|
| `business_date` | NULL | NULL | SET | Venue-level: same boundary for all products on that exchange |
| `cancellation_pattern` | SET | SET | NULL | Product+account: burst patterns are per-trader-position |
| `trend` | SET | NULL | NULL | Product-level: price trends are instrument-specific |
| `market_event` | SET | NULL | NULL | Product-level: price surges and volume spikes are per-instrument |

An alternative design would normalize these into a separate `time_window_entities` junction table. We chose sparse columns for two reasons: (1) window scoping rarely exceeds 2-3 entity dimensions, making the sparsity manageable, and (2) the join between `time_windows` and `calc_instances` must be fast -- nullable columns in a single row are cheaper to filter than a secondary join.

---

## 4. Join Semantics

The relationship between time windows and calculation instances is the core of the proposed scheduling model. Instead of hard-wiring DAG edges between window calculations and downstream calculations, the system uses a **dynamic join** that determines what work needs to be done.

### The Join as Work Scheduler

```sql
SELECT tw.window_id, ci.calc_id, ci.resolved_params
FROM time_windows tw
CROSS JOIN calc_instances ci
WHERE tw.window_type IN (ci.required_window_types)
  AND tw.business_date = :target_date;
```

This query produces a **work manifest**: every (window, calculation) pair that needs to execute for the target business date. Each row in the result is a unit of work -- "run calculation X within the time boundaries defined by window Y, using parameters Z."

### How This Replaces the DAG Dependency Model

In the current system, the dependency chain is explicit and static:

```
                 CURRENT: Static DAG Edges
                 ===========================

  adjusted_direction
        |
        v
  business_date_window  (time_window layer)
        |
        +--------+--------+
        v                 v
  trading_activity    vwap_calc    (aggregation layer)
        |                 |
        v                 v
  large_trading_activity  |        (derived layer)
        |                 |
        +--------+--------+
                 v
          wash_detection             (derived layer)
```

Adding a new detection model that uses `business_date_window` requires adding new edges to this DAG -- modifying the existing dependency structure. If the new model also requires `trend_window`, you need edges from both window calculations, creating a fan-in pattern that complicates scheduling.

In the proposed model, the dependency is replaced by a data join:

```
             PROPOSED: Dynamic Join
             =======================

  +------------------+       +-------------------+
  |   time_windows   |       |  calc_instances   |
  |   (result table) |       |  (parameterized)  |
  +--------+---------+       +---------+---------+
           |                           |
           +----------+  +------------+
                      |  |
                      v  v
              +-------+--+--------+
              |  CROSS JOIN       |
              |  WHERE            |
              |    window_type    |
              |    IN (required)  |
              |  AND              |
              |    business_date  |
              |    = :target      |
              +---------+---------+
                        |
                        v
              +---------+---------+
              |  WORK MANIFEST    |
              |                   |
              |  (window_id,      |
              |   calc_id,        |
              |   resolved_params)|
              +-------------------+
```

The work manifest is computed dynamically from the data in two tables. Adding a new detection model that uses `business_date` windows requires zero changes to existing calculations or their dependencies -- the new model's calculation instances simply declare `required_window_types = ['business_date']` and the join picks up the existing windows automatically.

### Entity Scoping in the Join

When entity columns are populated on a time window, the join must filter accordingly:

```sql
SELECT tw.window_id, ci.calc_id, ci.resolved_params
FROM time_windows tw
CROSS JOIN calc_instances ci
WHERE tw.window_type IN (ci.required_window_types)
  AND tw.business_date = :target_date
  AND (tw.product_id IS NULL OR tw.product_id = ci.product_id)
  AND (tw.account_id IS NULL OR tw.account_id = ci.account_id)
  AND (tw.venue_id IS NULL OR tw.venue_id = ci.venue_id);
```

A NULL entity column on the time window means "this window applies to all values of that entity" -- it does not filter. A populated entity column restricts the join to matching calculation instances only. This allows a single business date window (venue-scoped, product NULL) to serve every calculation on that exchange, while a cancellation pattern window (product+account scoped) only matches calculations for that specific product-account pair.

---

## 5. Current State Mapping

Each of the four existing time window calculations maps to the proposed model as follows.

| Current Calculation | Proposed `window_type` | `detection_method` | Entity Scoping | Notes |
|---|---|---|---|---|
| `business_date_window` | `business_date` | `simple` | venue_id (from exchange_mic) | Exchange-specific cutoff times resolved via `business_date_cutoff` setting. XNYS = 21:00 UTC, XLON = 16:30 UTC, FX = 21:00 UTC, default = 17:00 UTC. Fully precomputable given venue schedule data. |
| `cancellation_pattern` | `cancellation_pattern` | `complex` | product_id + account_id | Pattern detection scanning cancelled orders for burst clusters. Threshold via `cancel_count_threshold` setting (equity = 3, options = 8, default = 5). Discovered at runtime -- cannot predict how many bursts exist. |
| `trend_window` | `trend` | `complex` | product_id | Intraday price trend detection using standard deviation multiplier via `trend_sensitivity` setting (equity = 2.5, FX = 2.0, default = 3.5). Discovers up/down trends per product per day. |
| `market_event_window` | `market_event` | `complex` | product_id | Detects significant price changes (>5%) and volume spikes (>3x). Lookback via `insider_lookback_days` setting (equity = 20, options = 10, default = 30). Could arguably be precomputable from EOD data, but classified as complex because the number and timing of events is not predictable. |

### Detection Model to Window Mapping

Each detection model declares a `time_window` in its metadata. The proposed system resolves this through the `time_windows` table:

| Detection Model | `time_window` (current metadata) | Proposed `window_type` JOIN |
|---|---|---|
| Wash Trading -- Full Day | `business_date` | `WHERE tw.window_type = 'business_date'` |
| Wash Trading -- Intraday | `trend_window` | `WHERE tw.window_type = 'trend'` |
| Market Price Ramping | `trend_window` | `WHERE tw.window_type = 'trend'` |
| Insider Dealing | `market_event_window` | `WHERE tw.window_type = 'market_event'` |
| Spoofing / Layering | `cancellation_pattern` | `WHERE tw.window_type = 'cancellation_pattern'` |

Note that `trend_window` is shared by two models (Wash Trading -- Intraday and Market Price Ramping). In the current system, both models have separate DAG edges to `calc_trend_window`. In the proposed model, both join against the same `time_windows` rows with `window_type = 'trend'` -- the window is computed once and consumed twice.

---

## 6. Window Lifecycle

A time window progresses through four states from creation to archival. The lifecycle is tracked through metadata on the window row and through join outcomes with the calculation pipeline.

```
  +----------------+       +----------------+       +----------------+       +----------------+
  |                |       |                |       |                |       |                |
  |  REGISTERED    +------>+    ACTIVE      +------>+   CONSUMED     +------>+   ARCHIVED     |
  |                |       |                |       |                |       |                |
  +----------------+       +----------------+       +----------------+       +----------------+

  Window created            Available for           All calculations         Retained for
  (batch or                 calculation joins.       have executed            audit trail.
  discovered).              Appears in work          against this             Excluded from
  computed_at is            manifests for the        window. No pending       active work
  set.                      target business          work items remain.       manifests.
                            date.
```

### State Definitions

**1. Registered**

The window row is inserted into the `time_windows` table. For simple windows, this happens during the batch precomputation phase at the start of the trading day. For complex windows, this happens when the pattern detection calculation discovers a qualifying pattern.

- **Simple example:** At 06:00 UTC, the scheduler computes business date boundaries for all 6 venues and inserts 6 rows with `detection_method = 'simple'`.
- **Complex example:** The `cancellation_pattern` calculation discovers 3 burst windows for product PRD-001, account ACC-042. Three rows are inserted with `detection_method = 'complex'` and unique `window_id` values.

The `computed_at` timestamp records the moment of registration.

**2. Active**

A registered window is active when the target business date matches a pending or current pipeline run. Active windows appear in work manifests produced by the cross-join query in Section 4. A window remains active until all calculation instances that reference its `window_type` (and matching entity scope) have completed execution.

**3. Consumed**

A window transitions to consumed when every calculation instance in the work manifest for that window has produced results. This is verified by comparing the work manifest against the `calc_results` table:

```sql
-- Find windows where all expected calculations have completed
SELECT tw.window_id
FROM time_windows tw
CROSS JOIN calc_instances ci
WHERE tw.window_type IN (ci.required_window_types)
  AND tw.business_date = :target_date
  AND (tw.product_id IS NULL OR tw.product_id = ci.product_id)
GROUP BY tw.window_id
HAVING COUNT(*) = COUNT(cr.result_id)  -- all expected results exist
```

Consumed windows are no longer included in work manifests for future pipeline runs (unless a recomputation is triggered).

**4. Archived**

After the business date closes and all downstream processes (alerting, scoring, case creation, regulatory reporting) have completed, windows are archived. Archived windows are retained indefinitely for audit and regulatory inquiry purposes but are excluded from active pipeline scheduling.

Archival may involve moving rows to a separate `time_windows_archive` table or adding an `archived_at` timestamp column -- the choice depends on query volume and retention policy.

---

## 7. Performance Implications

### Simple Windows: Precompute and Reuse

Simple windows have the highest reuse ratio. A single `business_date` window for XNYS on 2026-03-09 is consumed by every calculation that operates on XNYS data for that date -- trading activity aggregation, VWAP computation, wash detection, and any future model that needs daily boundaries.

**Current cost:** The `business_date_window` calculation runs the cutoff logic for every execution row, computing `CASE WHEN execution_time > $cutoff_time THEN ...` across all 761 executions. Every downstream calculation that depends on `business_date_window` implicitly re-reads this result table.

**Proposed cost:** One row per venue per business date (6 venues = 6 rows). Downstream calculations join against these 6 rows to filter their execution data into the correct business date. The date boundary logic runs once, not once per execution.

```
  CURRENT                          PROPOSED
  =======                          ========

  761 executions                   6 venue windows (precomputed)
    |                                |
    v                                v
  761-row calc_business_date_window  JOIN execution ON
    |                                  venue_mic = tw.venue_id
    v                                  AND exec_ts BETWEEN
  Each downstream calc                 tw.start_ts AND tw.end_ts
  re-reads 761 rows                    |
                                       v
                                     Same downstream calcs,
                                     but window lookup is
                                     6-row index scan
```

### Complex Windows: Compute and Cache

Complex windows cannot be precomputed, but their results should be cached once discovered. The key optimization is **existence checks before computation:**

```sql
-- Before running cancellation_pattern detection:
SELECT COUNT(*) FROM time_windows
WHERE window_type = 'cancellation_pattern'
  AND business_date = :target_date
  AND computed_at > :last_data_refresh;

-- If count > 0 and no new data has arrived, skip recomputation
```

This avoids redundant pattern detection when the pipeline is re-run (for example, after a partial failure and restart). The `computed_at` timestamp, compared against the last data refresh timestamp, determines whether cached windows are still valid.

### Window Reuse Across Models

The reuse multiplier quantifies the efficiency gain:

| Window Type | Current: Computed by | Current: Used by | Proposed: Computed | Proposed: Consumed by |
|---|---|---|---|---|
| `business_date` | 1 calculation | 2 downstream calcs | 1 registration (per venue) | All calcs needing daily scope |
| `trend` | 1 calculation | 2 models (MPR + wash intraday) | 1 registration (per product) | All trend-scoped calcs |
| `cancellation_pattern` | 1 calculation | 1 model (spoofing) | 1 registration (per burst) | All cancel-pattern calcs |
| `market_event` | 1 calculation | 1 model (insider) | 1 registration (per event) | All event-scoped calcs |

Today, `trend_window` is computed once but its output table is joined by two separate model queries. In the proposed model, this is explicit and extensible -- a third model that needs trend windows simply declares the requirement in its metadata and the join handles it automatically.

### Avoiding Redundant Computation

The pipeline should follow this decision tree before computing any time window:

```
  Does a time_windows row exist
  for this (window_type, business_date, entity scope)?
       |
       +--- YES ---> Is computed_at > last_data_refresh?
       |                  |
       |                  +--- YES ---> SKIP (use cached window)
       |                  |
       |                  +--- NO ----> RECOMPUTE (data has changed)
       |
       +--- NO ----> COMPUTE and REGISTER
```

This pattern is especially valuable for complex windows, where pattern detection can be computationally expensive (scanning all cancelled orders, computing standard deviations across intraday tick data).

---

## 8. Example Scenarios

### Scenario 1: Business Date Processing

**Context:** The daily batch pipeline begins at 06:00 UTC for the 2026-03-09 business date. The platform has 6 venues with different cutoff times.

**Step 1 -- Register simple windows.**

At pipeline start, the scheduler reads venue metadata and the `business_date_cutoff` setting (with exchange-specific overrides) and registers 6 window rows:

```
  time_windows table after Phase 1:
  +--------------------------+-----------------+---------+----------+---------------------+---------------------+
  | window_id                | window_type     | method  | venue_id | start_ts            | end_ts              |
  +--------------------------+-----------------+---------+----------+---------------------+---------------------+
  | bdate_XNYS_2026-03-09   | business_date   | simple  | XNYS     | 2026-03-09 00:00:00 | 2026-03-09 21:00:00 |
  | bdate_XLON_2026-03-09   | business_date   | simple  | XLON     | 2026-03-09 00:00:00 | 2026-03-09 16:30:00 |
  | bdate_XPAR_2026-03-09   | business_date   | simple  | XPAR     | 2026-03-09 00:00:00 | 2026-03-09 17:00:00 |
  | bdate_XFRA_2026-03-09   | business_date   | simple  | XFRA     | 2026-03-09 00:00:00 | 2026-03-09 17:00:00 |
  | bdate_XCME_2026-03-09   | business_date   | simple  | XCME     | 2026-03-09 00:00:00 | 2026-03-09 21:00:00 |
  | bdate_XASX_2026-03-09   | business_date   | simple  | XASX     | 2026-03-09 00:00:00 | 2026-03-09 17:00:00 |
  +--------------------------+-----------------+---------+----------+---------------------+---------------------+
```

**Step 2 -- Downstream calculations use windows.**

All calculations that need daily boundaries -- `trading_activity_aggregation`, `vwap_calc`, and their downstream dependents -- join against these window rows:

```sql
SELECT e.execution_id, e.product_id, e.account_id, e.price, e.quantity,
       tw.window_id, tw.business_date
FROM execution e
INNER JOIN time_windows tw
  ON e.venue_mic = tw.venue_id
  AND CAST(e.execution_date || ' ' || e.execution_time AS TIMESTAMP)
      BETWEEN tw.start_ts AND tw.end_ts
WHERE tw.window_type = 'business_date'
  AND tw.business_date = '2026-03-09';
```

Every calculation on XNYS data uses the same `bdate_XNYS_2026-03-09` window row. No redundant date boundary computation occurs.

**Step 3 -- Windows are consumed and eventually archived.**

After all detection models have scored and alerts have been generated, the 6 window rows transition to consumed, then archived at the end of the settlement cycle.

---

### Scenario 2: Cancellation Burst Detection

**Context:** The `cancellation_pattern` calculation runs as part of Phase 2 (complex window detection) and discovers burst patterns in the order data for 2026-03-09.

**Step 1 -- Pattern detection discovers bursts.**

The cancellation pattern SQL (from the current `cancellation_pattern.json` metadata) scans all `CANCELLED` orders, groups by product+account+side+date, and applies the `cancel_count_threshold` setting:

```
  Discovered patterns for 2026-03-09:
  +---------------------------------------------------+
  | product_id | account_id | side | cancel_count | window_start          | window_end            |
  +------------+------------+------+--------------+-----------------------+-----------------------+
  | PRD-001    | ACC-042    | SELL | 5            | 2026-03-09 10:15:03   | 2026-03-09 10:18:47   |
  | PRD-001    | ACC-042    | BUY  | 3            | 2026-03-09 14:02:11   | 2026-03-09 14:04:55   |
  | PRD-017    | ACC-108    | SELL | 4            | 2026-03-09 11:30:22   | 2026-03-09 11:33:18   |
  +---------------------------------------------------+
```

**Step 2 -- Register discovered windows.**

Each pattern becomes a row in `time_windows`:

```
  time_windows table (new rows):
  +--------------------------------------------+----------------------+---------+----------+----------+----------+
  | window_id                                  | window_type          | method  | product  | account  | venue    |
  +--------------------------------------------+----------------------+---------+----------+----------+----------+
  | cancel_PRD001_ACC042_20260309_SELL         | cancellation_pattern | complex | PRD-001  | ACC-042  | NULL     |
  | cancel_PRD001_ACC042_20260309_BUY          | cancellation_pattern | complex | PRD-001  | ACC-042  | NULL     |
  | cancel_PRD017_ACC108_20260309_SELL         | cancellation_pattern | complex | PRD-017  | ACC-108  | NULL     |
  +--------------------------------------------+----------------------+---------+----------+----------+----------+

  metadata JSON for first row:
  {
    "cancel_count": 5,
    "cancel_quantity": 12500,
    "pattern_side": "SELL"
  }
```

**Step 3 -- Downstream calculations join against burst windows.**

The spoofing/layering detection model needs to evaluate opposite-side execution activity within each burst window. Its calculation instances join against the registered windows:

```sql
SELECT tw.window_id, tw.metadata->>'pattern_side' AS spoof_side,
       e.execution_id, e.side, e.price, e.quantity
FROM time_windows tw
INNER JOIN execution e
  ON e.product_id = tw.product_id
  AND e.account_id = tw.account_id
  AND CAST(e.execution_date || ' ' || e.execution_time AS TIMESTAMP)
      BETWEEN tw.start_ts AND tw.end_ts
WHERE tw.window_type = 'cancellation_pattern'
  AND tw.business_date = '2026-03-09'
  AND e.side != tw.metadata->>'pattern_side';  -- opposite side executions
```

**Each burst gets its own calculation results.** The 5-cancellation SELL burst for PRD-001/ACC-042 produces separate scored results from the 3-cancellation BUY burst, even though they involve the same product and account. The window isolation ensures that scoring accurately reflects the severity of each individual pattern.

```
  BURST 1 (SELL, 5 cancels)              BURST 2 (BUY, 3 cancels)
  window: 10:15:03 - 10:18:47            window: 14:02:11 - 14:04:55
       |                                      |
       v                                      v
  opposite-side BUY executions           opposite-side SELL executions
  within window -> scored                within window -> scored
       |                                      |
       v                                      v
  Alert if score > threshold             Alert if score > threshold
  (higher cancel_count = higher score)   (lower cancel_count = lower score)
```

This per-window isolation is a key advantage of the first-class time window model. In the current system, the cancellation pattern output table contains all bursts as rows, and the detection model query joins them together. The proposed model makes the window boundary explicit, ensuring each burst is scored independently.

---

*This document is part of the Data Modeling Design Considerations series. For the calculation instances that join against time windows, see [05 -- Calculation Instance Model](05-calculation-instance-model.md). For how scored results flow from window-scoped calculations into the unified results table, see [09 -- Unified Results Schema](09-unified-results-schema.md). For performance optimization strategies including window materialization, see [17 -- Performance and Efficiency](17-performance-and-efficiency.md).*
