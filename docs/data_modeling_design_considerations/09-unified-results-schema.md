# 09 -- Unified Results Schema

> Defines the `calc_results` star schema that consolidates all calculation outputs into a single fact table,
> eliminating per-calculation table proliferation and enabling generic, parameterized detection queries.

**Audience**: Data Engineers, Database Architects

---

## 1. The `calc_results` Fact Table

All calculation outputs --- regardless of layer, detection model, or granularity --- are stored in a single wide fact table:

```sql
CREATE TABLE calc_results (
    result_id       VARCHAR PRIMARY KEY,   -- Surrogate key (UUID or deterministic hash)
    calc_id         VARCHAR NOT NULL,      -- FK -> calc_definitions; identifies which calculation produced this row
    window_id       VARCHAR,               -- FK -> time_windows; nullable for calculations not scoped to a time window
    pattern_id      VARCHAR,               -- FK -> match_patterns; which classification context applies
    product_id      VARCHAR,               -- Sparse nullable dimension: FK -> product
    account_id      VARCHAR,               -- Sparse nullable dimension: FK -> account
    venue_id        VARCHAR,               -- Sparse nullable dimension: FK -> venue (via MIC)
    trader_id       VARCHAR,               -- Sparse nullable dimension: FK -> trader
    business_date   DATE,                  -- The business date this result applies to
    primary_value   DOUBLE,                -- Main calculation output (e.g., total_value, qty_match_ratio, cancel_count)
    secondary_value DOUBLE,                -- Optional secondary metric (e.g., vwap_proximity alongside qty_match_ratio)
    flag_value      BOOLEAN,               -- Boolean result: pass/fail, is_large, is_wash_candidate
    computed_at     TIMESTAMP NOT NULL     -- When this result was computed (pipeline audit trail)
);
```

### Column Semantics

| Column | Description | Nullable | Notes |
|--------|-------------|----------|-------|
| `result_id` | Surrogate primary key. Generated as a deterministic hash of `(calc_id, product_id, account_id, business_date, window_id)` to enable idempotent upserts, or as a UUID for append-only pipelines. | No | Uniquely identifies one calculation output row. |
| `calc_id` | Foreign key to `calc_definitions`. Identifies which calculation produced this row. The meaning of `primary_value`, `secondary_value`, and `flag_value` is determined entirely by the calc_id. | No | This is the discriminator that makes generic columns interpretable. |
| `window_id` | Foreign key to a `time_windows` dimension. Links to the time window context (business date window, trend window, cancellation pattern, market event window). NULL for transaction-layer calculations that operate on individual executions without time windowing. | Yes | Time window scoping is optional; transaction-layer calcs like `value_calc` have no window. |
| `pattern_id` | Foreign key to `match_patterns`. Records which classification context (e.g., `equity_stocks`, `fx_instruments`) was active when this result was computed. NULL when the calculation ran with no pattern-specific parameterization. | Yes | Enables filtering results by the match pattern that drove parameter resolution. |
| `product_id` | Sparse dimension FK to the product entity. Populated when the calculation grain includes product. NULL for calculations aggregated beyond product level (e.g., desk-level or firm-wide). | Yes | Sparse --- not every calculation operates at product grain. |
| `account_id` | Sparse dimension FK to the account entity. Populated when the calculation grain includes account. NULL for product-only calculations (e.g., `trend_window`, `market_event_window`). | Yes | Sparse --- time window calculations typically have no account dimension. |
| `venue_id` | Sparse dimension FK to the venue entity (ISO 10383 MIC). Populated for venue-scoped calculations. NULL for most current calculations which aggregate across venues. | Yes | Reserved for future venue-level detection (e.g., best execution analysis). |
| `trader_id` | Sparse dimension FK to the trader entity. Populated for trader-scoped calculations. NULL when grain does not include trader. | Yes | Reserved for future trader-level detection (e.g., rogue trader monitoring). |
| `business_date` | The business date this result applies to. For time-windowed calculations, this is the business date derived from the window. For event-based calculations (market_event_window), this is the event date. | Yes | NULL only for calculations that are not date-scoped (rare). |
| `primary_value` | The main numeric output of the calculation. What this value represents depends on `calc_id`: for `trading_activity_aggregation` it is `net_value`; for `wash_detection` it is `qty_match_ratio`; for `cancellation_pattern` it is `cancel_count`. | Yes | The `value_field` attribute in `calc_definitions` names the semantic meaning. |
| `secondary_value` | An optional secondary numeric metric. Used when a calculation produces two meaningful numeric outputs --- e.g., `vwap_calc` stores `vwap_buy` in `primary_value` and `vwap_proximity` in `secondary_value`. | Yes | Many calculations use only `primary_value`; secondary is NULL. |
| `flag_value` | Boolean pass/fail indicator. For `large_trading_activity` this is `is_large`; for `wash_detection` this is `is_wash_candidate`. NULL for calculations that produce only numeric outputs (e.g., `value_calc`). | Yes | Directly usable as a MUST_PASS gate in detection models without threshold comparison. |
| `computed_at` | Timestamp recording when the calculation engine produced this row. Used for pipeline audit, freshness monitoring, and SLA tracking. | No | Always populated by the engine at execution time. |

### Design Principle: One Table for All Calculation Outputs

The central design decision is that **every calculation in the DAG writes to the same `calc_results` table** rather than creating its own dedicated table. This means:

- 10 current calculations produce rows in one table instead of 10 separate `calc_*` tables.
- 50 future calculations still produce rows in the same one table instead of 50 separate tables.
- Every query against calculation results uses the same table, the same column names, and the same JOIN patterns.
- The `calc_id` column is the discriminator: it tells you which calculation produced the row and therefore what `primary_value`, `secondary_value`, and `flag_value` mean in context.

---

## 2. Current State: Per-Calc Tables

### How It Works Today

Each calculation in the DAG writes to its own dedicated DuckDB table. The table name is specified in the calculation metadata's `output.table_name` field, and the columns are specific to that calculation:

| calc_id | Output Table | Unique Columns |
|---------|-------------|----------------|
| `value_calc` | `calc_value` | execution_id, side, price, quantity, instrument_type, asset_class, calculated_value |
| `adjusted_direction` | `calc_adjusted_direction` | original_side, adjusted_side, instrument_type, asset_class, calculated_value |
| `business_date_window` | `calc_business_date_window` | business_date, window_start, window_end |
| `trend_window` | `calc_trend_window` | trend_id, trend_type, start_price, end_price, price_change_pct |
| `cancellation_pattern` | `calc_cancellation_pattern` | pattern_id, pattern_side, cancel_count, cancel_quantity |
| `market_event_window` | `calc_market_event_window` | event_id, event_type, event_date, price_change_pct, lookback_start, lookforward_end |
| `trading_activity_aggregation` | `calc_trading_activity` | buy_value, sell_value, net_value, buy_qty, sell_qty, total_trades, same_side_pct |
| `vwap_calc` | `calc_vwap` | vwap_buy, vwap_sell, vwap_spread, vwap_proximity |
| `large_trading_activity` | `calc_large_trading_activity` | total_value, is_large, threshold_used |
| `wash_detection` | `calc_wash_detection` | qty_match_ratio, vwap_proximity, is_wash_candidate |

### The `_execute()` Method

The `CalculationEngine._execute()` method in `backend/engine/calculation_engine.py` creates individual tables via:

```python
cursor.execute(f'CREATE TABLE "{table_name}" AS {sql}')
```

Each execution:
1. Drops any existing table/view with the same name.
2. Creates a new table from the calculation's SQL logic.
3. Writes the results to a Parquet file in `workspace/results/{layer}/{table_name}.parquet`.

### Problems with Per-Calc Tables

**Table proliferation.** 10 calculations produce 10 tables today. As the platform adds new calculations --- per-venue activity, trader-level aggregations, cross-asset correlations, time-of-day analysis, historical volatility windows --- the table count grows linearly. At 50 calculations, there are 50 tables with 50 different schemas.

**No common query pattern.** A detection model query that needs results from 3 calculations must JOIN 3 tables, each with different column names. The `wash_full_day` model query JOINs `calc_wash_detection`, `calc_large_trading_activity`, and `calc_vwap` --- each with its own specific column names (`qty_match_ratio`, `total_value`, `vwap_proximity`). Adding a new calculation to a model requires rewriting the model's query to include the new table.

**Schema drift.** Each calculation defines its own output schema in JSON metadata. There is no enforcement that related calculations use consistent column naming, types, or grain. One calculation might call it `business_date`, another `pattern_date`, another `event_date` --- all meaning the same thing.

**Cross-model analysis is difficult.** Answering "which product-account pairs scored high across multiple detection models today?" requires querying all 10 tables, unioning results with incompatible schemas, and manually aligning columns.

---

## 3. Sparse Columns vs JSON Keys (Trade-off Analysis)

The `calc_results` table uses sparse nullable columns for entity dimensions (`product_id`, `account_id`, `venue_id`, `trader_id`) rather than a single JSON `dimension_keys` column. This is a deliberate architectural choice.

### Option A: Sparse Nullable Columns (Recommended)

```sql
-- Query: all wash detection results for a specific product
SELECT * FROM calc_results
WHERE calc_id = 'wash_detection'
  AND product_id = 'AAPL'
  AND business_date = '2026-03-01';
```

**Advantages:**

- **SQL-queryable.** Standard `WHERE` clauses, no function calls. Every SQL tool, BI connector, and query builder works without modification.
- **Indexable.** Standard B-tree or columnar min/max indexes on dimension columns. The query planner can push predicates directly to storage.
- **Type-safe.** `product_id VARCHAR`, `business_date DATE` --- the database enforces types at write time. Invalid data is rejected immediately, not discovered later during JSON extraction.
- **DuckDB columnar compression.** In columnar storage, a column that is 80% NULL compresses to near-zero overhead. DuckDB uses dictionary encoding and run-length encoding; a NULL-heavy column in a Parquet/columnar file costs essentially one bit per row for the null bitmap. The storage cost of unused columns is negligible.
- **JOIN-friendly.** Foreign key columns directly participate in JOINs to dimension tables without extraction.

**Disadvantages:**

- Schema change required if a new entity type is added (e.g., a `desk_id` dimension). This requires an `ALTER TABLE ADD COLUMN` and updating all write paths.
- Columns are unused for many rows. A `venue_id` column populated for only 5% of rows is 95% NULL. (Mitigated by columnar compression as noted above.)

### Option B: JSON `dimension_keys` Column

```sql
-- Same query with JSON approach
SELECT * FROM calc_results
WHERE calc_id = 'wash_detection'
  AND json_extract_string(dimension_keys, '$.product_id') = 'AAPL'
  AND business_date = '2026-03-01';
```

**Advantages:**

- Infinitely extensible. Adding a new entity dimension is just adding a key to the JSON blob --- no schema changes, no migrations.
- No unused columns. Only the dimensions relevant to a specific calculation are stored in the JSON.

**Disadvantages:**

- **Not directly indexable.** DuckDB supports limited JSON indexing; most queries require full-column extraction at scan time. This negates much of the columnar storage benefit for filtered queries.
- **Requires extraction functions.** Every query must use `json_extract_string()` or `->` operators. This adds syntax complexity and breaks compatibility with simple BI tools.
- **No type safety.** A typo in a key name (`"prodcut_id"`) silently produces NULL rather than a schema error. A numeric account_id stored as a string requires explicit casting.
- **JOIN complexity.** Joining to dimension tables requires extracting keys first: `JOIN product p ON json_extract_string(cr.dimension_keys, '$.product_id') = p.product_id` --- verbose and potentially slow.

### Why Sparse Columns Wins for This Platform

1. **The entity set is stable.** The platform defines 8 entities (product, execution, order, md_eod, md_intraday, venue, account, trader). The dimension columns in `calc_results` correspond to the 4 entities that appear as calculation grain dimensions: product, account, venue, trader. This set has been stable since inception and is unlikely to grow beyond 6--8 dimension columns.

2. **DuckDB's columnar storage handles NULLs efficiently.** A `VARCHAR` column that is 90% NULL in a columnar/Parquet file costs approximately 1 bit per row (null bitmap) plus negligible dictionary overhead. For 100,000 rows, a fully-NULL column costs ~12 KB. The storage penalty is immaterial.

3. **Direct SQL access matters for this platform.** The platform serves queries through a SQL Console (Monaco Editor), AG Grid data views, and BI-style dashboards. JSON extraction functions add friction to every query surface. Sparse columns keep queries clean and standard.

4. **Index pushdown is critical for detection queries.** Detection model queries filter by `calc_id + product_id + business_date`. With sparse columns, the query planner can use composite indexes or columnar min/max statistics to skip irrelevant data blocks. With JSON, the planner must scan and extract before filtering.

---

## 4. Dimension Tables

The `calc_results` fact table is the center of a star schema. The following dimension tables provide the metadata context needed to interpret, filter, and score results.

### 4.1 `calc_definitions` -- Calculation Metadata

Stores the definition of each calculation. One row per calculation in the DAG.

```sql
CREATE TABLE calc_definitions (
    calc_id         VARCHAR PRIMARY KEY,   -- e.g., 'wash_detection', 'vwap_calc'
    name            VARCHAR NOT NULL,      -- Display name: 'Wash Detection', 'VWAP Calculation'
    layer           VARCHAR NOT NULL,      -- DAG layer: 'transaction', 'time_window', 'aggregation', 'derived'
    description     TEXT,                  -- Human-readable description of what this calculation computes
    logic_sql       TEXT,                  -- The SQL template with $param placeholders
    value_field     VARCHAR,               -- Which output column is the primary metric: 'qty_match_ratio', 'total_value'
    value_labels    VARCHAR,               -- JSON mapping primary/secondary to display labels (UI hint)
    depends_on      VARCHAR[],             -- Array of calc_ids this calculation depends on
    regulatory_tags VARCHAR[]              -- Array of regulatory references: 'MAR Art. 12(1)(a)', 'MiFID II Art. 16(2)'
);
```

**Current population** (10 rows, sourced from `workspace/metadata/calculations/`):

| calc_id | layer | value_field | depends_on |
|---------|-------|-------------|------------|
| `value_calc` | transaction | `calculated_value` | _(none)_ |
| `adjusted_direction` | transaction | `calculated_value` | `value_calc` |
| `business_date_window` | time_window | `calculated_value` | `adjusted_direction` |
| `trend_window` | time_window | `price_change_pct` | _(none)_ |
| `cancellation_pattern` | time_window | `cancel_count` | _(none)_ |
| `market_event_window` | time_window | `price_change_pct` | _(none)_ |
| `trading_activity_aggregation` | aggregation | `net_value` | `business_date_window` |
| `vwap_calc` | aggregation | `vwap_proximity` | `business_date_window` |
| `large_trading_activity` | derived | `total_value` | `trading_activity_aggregation` |
| `wash_detection` | derived | `qty_match_ratio` | `large_trading_activity`, `vwap_calc` |

The `value_labels` column is a JSON object that maps generic column names to calculation-specific display labels for the UI:

```json
-- value_labels for calc_id = 'wash_detection':
{
    "primary_value": "Quantity Match Ratio",
    "secondary_value": "VWAP Proximity",
    "flag_value": "Is Wash Candidate"
}
```

### 4.2 `match_patterns` -- Pattern Classification

Stores reusable classification patterns. One row per pattern.

```sql
CREATE TABLE match_patterns (
    pattern_id      VARCHAR PRIMARY KEY,   -- e.g., 'equity_stocks', 'fx_instruments'
    pattern_type    VARCHAR NOT NULL,      -- Discriminator: 'classification', 'detection_level', 'threshold', 'scoring'
    label           VARCHAR NOT NULL,      -- Display name: 'Equity Stocks', 'FX Instruments'
    description     TEXT,                  -- Human-readable description
    layer           VARCHAR NOT NULL       -- Origin: 'oob' (out-of-box) or 'custom'
);
```

### 4.3 `match_pattern_attributes` -- Pattern Detail

Decomposes each pattern's match criteria into individual key-value pairs. This is the universal 3-column structure described in document 04.

```sql
CREATE TABLE match_pattern_attributes (
    pattern_id       VARCHAR NOT NULL,     -- FK -> match_patterns
    entity           VARCHAR NOT NULL,     -- Which entity this attribute belongs to: 'product', 'venue', 'account'
    entity_attribute VARCHAR NOT NULL,     -- The attribute name: 'asset_class', 'exchange_mic', 'instrument_type'
    attribute_value  VARCHAR NOT NULL,     -- The value to match: 'equity', 'XNYS', 'bond'
    PRIMARY KEY (pattern_id, entity, entity_attribute)
);
```

**Current population** (sourced from 9 match patterns in `workspace/metadata/match_patterns/`):

| pattern_id | entity | entity_attribute | attribute_value |
|------------|--------|------------------|-----------------|
| `equity_stocks` | product | asset_class | equity |
| `equity_nyse` | product | asset_class | equity |
| `equity_nyse` | product | exchange_mic | XNYS |
| `fx_instruments` | product | asset_class | fx |
| `commodity_instruments` | product | asset_class | commodity |
| `index_instruments` | product | asset_class | index |
| `fixed_income_all` | product | asset_class | fixed_income |
| `fixed_income_bonds` | product | asset_class | fixed_income |
| `fixed_income_bonds` | product | instrument_type | bond |
| `nasdaq_listed` | product | exchange_mic | XNAS |
| `nyse_listed` | product | exchange_mic | XNYS |

### 4.4 `score_steps` -- Graduated Scoring Ranges

Defines the scoring tiers linked to patterns. Each row maps a value range to a score.

```sql
CREATE TABLE score_steps (
    step_id         VARCHAR PRIMARY KEY,   -- Surrogate key
    pattern_id      VARCHAR NOT NULL,      -- FK -> match_patterns (which context these steps apply to)
    setting_id      VARCHAR NOT NULL,      -- Which score_steps setting: 'large_activity_score_steps'
    min_value       DOUBLE,                -- Lower bound (inclusive)
    max_value       DOUBLE,                -- Upper bound (exclusive); NULL = unbounded
    score           INTEGER NOT NULL,      -- Score awarded for values in [min_value, max_value)
    ordinal         INTEGER NOT NULL       -- Step ordering within the pattern+setting combination
);
```

**Example** (from `quantity_match_score_steps`, default pattern):

| min_value | max_value | score | ordinal |
|-----------|-----------|-------|---------|
| 0.0 | 0.5 | 0 | 1 |
| 0.5 | 0.8 | 3 | 2 |
| 0.8 | 0.95 | 7 | 3 |
| 0.95 | NULL | 10 | 4 |

### 4.5 `detection_models` -- Model Definitions

One row per detection model.

```sql
CREATE TABLE detection_models (
    model_id                VARCHAR PRIMARY KEY,   -- e.g., 'wash_full_day', 'spoofing_layering'
    name                    VARCHAR NOT NULL,      -- Display name: 'Wash Trading -- Full Day'
    description             TEXT,                  -- What the model detects
    time_window_calc_id     VARCHAR,               -- Which time window calculation scopes this model
    granularity             VARCHAR[] NOT NULL,    -- Grain columns: ['product_id', 'account_id']
    score_threshold_setting VARCHAR NOT NULL       -- Setting ID for the alert threshold: 'wash_score_threshold'
);
```

**Current population** (5 rows):

| model_id | time_window_calc_id | granularity | score_threshold_setting |
|----------|---------------------|-------------|------------------------|
| `wash_full_day` | `business_date_window` | [product_id, account_id] | `wash_score_threshold` |
| `wash_intraday` | `trend_window` | [product_id, account_id] | `wash_score_threshold` |
| `market_price_ramping` | `trend_window` | [product_id, account_id] | `mpr_score_threshold` |
| `spoofing_layering` | `cancellation_pattern` | [product_id, account_id] | `spoofing_score_threshold` |
| `insider_dealing` | `market_event_window` | [product_id, account_id] | `insider_score_threshold` |

### 4.6 `model_calculations` -- Model-to-Calc Bindings

Maps which calculations contribute to each detection model, with strictness and value field metadata.

```sql
CREATE TABLE model_calculations (
    model_id        VARCHAR NOT NULL,      -- FK -> detection_models
    calc_id         VARCHAR NOT NULL,      -- FK -> calc_definitions
    strictness      VARCHAR NOT NULL,      -- 'MUST_PASS' or 'OPTIONAL'
    value_field     VARCHAR NOT NULL,      -- Which calc_results column to evaluate: 'primary_value', 'flag_value'
    score_steps_setting VARCHAR,           -- Setting ID for graduated scoring; NULL if no scoring
    threshold_setting   VARCHAR,           -- Setting ID for pass/fail threshold; NULL if no threshold
    ordinal         INTEGER NOT NULL,      -- Evaluation order within the model
    PRIMARY KEY (model_id, calc_id)
);
```

**Current population** (13 bindings across 5 models):

| model_id | calc_id | strictness | value_field | score_steps_setting |
|----------|---------|------------|-------------|---------------------|
| `wash_full_day` | `large_trading_activity` | MUST_PASS | total_value | `large_activity_score_steps` |
| `wash_full_day` | `wash_qty_match` | OPTIONAL | qty_match_ratio | `quantity_match_score_steps` |
| `wash_full_day` | `wash_vwap_proximity` | OPTIONAL | vwap_proximity | `vwap_proximity_score_steps` |
| `wash_intraday` | `large_trading_activity` | MUST_PASS | total_value | `large_activity_score_steps` |
| `wash_intraday` | `wash_qty_match` | OPTIONAL | qty_match_ratio | `quantity_match_score_steps` |
| `wash_intraday` | `wash_vwap_proximity` | OPTIONAL | vwap_proximity | `vwap_proximity_score_steps` |
| `market_price_ramping` | `trend_detection` | MUST_PASS | price_change_pct | _(null)_ |
| `market_price_ramping` | `large_trading_activity` | OPTIONAL | total_value | `large_activity_score_steps` |
| `market_price_ramping` | `same_side_ratio` | OPTIONAL | same_side_pct | `same_side_pct_score_steps` |
| `spoofing_layering` | `cancel_pattern` | MUST_PASS | cancel_count | _(null)_ |
| `spoofing_layering` | `opposite_side_execution` | OPTIONAL | total_value | `large_activity_score_steps` |
| `insider_dealing` | `market_event_detection` | MUST_PASS | price_change_pct | `market_event_score_steps` |
| `insider_dealing` | `large_trading_activity` | OPTIONAL | total_value | `large_activity_score_steps` |

### 4.7 `calc_pattern_bindings` -- Calc-to-Pattern Bindings

Links calculations to the match patterns that parameterize them. When a calculation is bound to a pattern, the settings resolver uses the pattern's attributes to resolve parameters.

```sql
CREATE TABLE calc_pattern_bindings (
    calc_id         VARCHAR NOT NULL,      -- FK -> calc_definitions
    pattern_id      VARCHAR NOT NULL,      -- FK -> match_patterns
    binding_type    VARCHAR NOT NULL,      -- 'parameterization' (pattern drives settings) or 'scoping' (pattern filters input)
    PRIMARY KEY (calc_id, pattern_id)
);
```

---

## 5. Star Schema Diagram

```
                                    ┌──────────────────────┐
                                    │   match_patterns     │
                                    │──────────────────────│
                                    │ pattern_id  (PK)     │
                                    │ pattern_type         │
                                    │ label                │
                                    │ description          │
                                    │ layer                │
                                    └──────────┬───────────┘
                                               │
                                               │ pattern_id
                                               │
         ┌───────────────────────┐             │           ┌──────────────────────────┐
         │  match_pattern_       │             │           │     score_steps          │
         │  attributes           │◄────────────┤           │──────────────────────────│
         │───────────────────────│             │           │ step_id  (PK)            │
         │ pattern_id  (FK)      │             │           │ pattern_id  (FK)         │
         │ entity                │             │           │ setting_id               │
         │ entity_attribute      │             │           │ min_value                │
         │ attribute_value       │             │           │ max_value                │
         └───────────────────────┘             │           │ score                    │
                                               │           │ ordinal                  │
                                               │           └────────────┬─────────────┘
                                               │                        │
                                               │                        │ score lookup
    ┌────────────────────────┐                 │                        │
    │  calc_definitions      │                 │                        │
    │────────────────────────│     calc_id     │        pattern_id      │
    │ calc_id  (PK)          │─────────┐       │       ┌────────────────┘
    │ name                   │         │       │       │
    │ layer                  │         │       │       │
    │ description            │         │       │       │
    │ logic_sql              │         │  ┌────┴───────┴───────────────────────────────┐
    │ value_field             │         │  │                                            │
    │ value_labels           │         │  │             calc_results                    │
    │ depends_on             │         │  │       (FACT TABLE -- CENTER)                │
    │ regulatory_tags        │         │  │────────────────────────────────────────────│
    └────────────────────────┘         ├──│ result_id        VARCHAR  PK               │
                                       │  │ calc_id          VARCHAR  FK  NOT NULL      │
    ┌────────────────────────┐         │  │ window_id        VARCHAR  FK               │
    │  detection_models      │         │  │ pattern_id       VARCHAR  FK               │
    │────────────────────────│         │  │ product_id       VARCHAR     (sparse)       │
    │ model_id  (PK)         │───┐     │  │ account_id       VARCHAR     (sparse)       │
    │ name                   │   │     │  │ venue_id         VARCHAR     (sparse)       │
    │ description            │   │     │  │ trader_id        VARCHAR     (sparse)       │
    │ time_window_calc_id    │   │     │  │ business_date    DATE                       │
    │ granularity            │   │     │  │ primary_value    DOUBLE                     │
    │ score_threshold_setting│   │     │  │ secondary_value  DOUBLE                     │
    └────────────────────────┘   │     │  │ flag_value       BOOLEAN                    │
              │                  │     │  │ computed_at      TIMESTAMP  NOT NULL         │
              │ model_id         │     │  │                                            │
              │                  │     │  └──────────┬────────────┬────────────────────┘
              ▼                  │     │             │            │
    ┌────────────────────────┐   │     │             │            │ sparse FK columns
    │  model_calculations    │   │     │             │            │
    │────────────────────────│   │     │             │            ├──► product  (product_id)
    │ model_id  (FK)         │◄──┘     │             │            ├──► account  (account_id)
    │ calc_id   (FK)         │◄────────┘             │            ├──► venue    (venue_id / mic)
    │ strictness             │                       │            └──► trader   (trader_id)
    │ value_field            │                       │
    │ score_steps_setting    │                       │
    │ threshold_setting      │            ┌──────────┘
    │ ordinal                │            │
    └────────────────────────┘            │
                                          │
    ┌────────────────────────┐            │
    │ calc_pattern_bindings  │            │
    │────────────────────────│            │
    │ calc_id   (FK)         │◄───────────┘
    │ pattern_id (FK)        │
    │ binding_type           │
    └────────────────────────┘
```

**FK Relationships Summary:**

| From | To | FK Column | Cardinality |
|------|----|-----------|-------------|
| `calc_results` | `calc_definitions` | `calc_id` | Many:1 |
| `calc_results` | `match_patterns` | `pattern_id` | Many:1 |
| `calc_results` | product / account / venue / trader | sparse dimension columns | Many:1 |
| `model_calculations` | `detection_models` | `model_id` | Many:1 |
| `model_calculations` | `calc_definitions` | `calc_id` | Many:1 |
| `match_pattern_attributes` | `match_patterns` | `pattern_id` | Many:1 |
| `score_steps` | `match_patterns` | `pattern_id` | Many:1 |
| `calc_pattern_bindings` | `calc_definitions` | `calc_id` | Many:1 |
| `calc_pattern_bindings` | `match_patterns` | `pattern_id` | Many:1 |

---

## 6. Generic Detection Query

The unified schema enables a single query template that works for **any** detection model. The model is identified by a parameter, not by hardcoded table names or column references.

### The Query

```sql
-- Generic detection query: parameterized by :model_id and :target_date
-- Works identically for wash_full_day, spoofing_layering, insider_dealing, etc.

WITH scored_results AS (
    SELECT
        cr.result_id,
        cr.product_id,
        cr.account_id,
        cr.trader_id,
        cr.venue_id,
        cr.business_date,
        cd.name                     AS calc_name,
        cd.layer                    AS calc_layer,
        mc.strictness,
        mc.ordinal                  AS eval_order,
        cr.primary_value,
        cr.secondary_value,
        cr.flag_value,
        -- Score lookup: find the score_step that contains primary_value
        COALESCE(ss.score, 0)       AS calc_score
    FROM calc_results cr
    JOIN calc_definitions cd
        ON cr.calc_id = cd.calc_id
    JOIN model_calculations mc
        ON mc.calc_id = cd.calc_id
    JOIN detection_models dm
        ON mc.model_id = dm.model_id
    LEFT JOIN score_steps ss
        ON ss.setting_id = mc.score_steps_setting
        AND cr.primary_value >= ss.min_value
        AND (cr.primary_value < ss.max_value OR ss.max_value IS NULL)
    WHERE dm.model_id = :model_id
      AND cr.business_date = :target_date
),

-- Phase 1: MUST_PASS gate -- all MUST_PASS calcs must have flag_value = TRUE
must_pass_check AS (
    SELECT
        product_id,
        account_id,
        -- A granularity row passes the gate if ALL MUST_PASS calcs have flag_value = TRUE
        BOOL_AND(CASE WHEN strictness = 'MUST_PASS' THEN COALESCE(flag_value, FALSE) ELSE TRUE END) AS gate_passed
    FROM scored_results
    GROUP BY product_id, account_id
),

-- Phase 2: Score accumulation -- sum scores for rows that passed the gate
accumulated_scores AS (
    SELECT
        sr.product_id,
        sr.account_id,
        sr.business_date,
        SUM(sr.calc_score) AS total_score
    FROM scored_results sr
    JOIN must_pass_check mpc
        ON sr.product_id = mpc.product_id
        AND sr.account_id = mpc.account_id
    WHERE mpc.gate_passed = TRUE
    GROUP BY sr.product_id, sr.account_id, sr.business_date
)

SELECT
    a.product_id,
    a.account_id,
    a.business_date,
    a.total_score,
    sr.calc_name,
    sr.strictness,
    sr.primary_value,
    sr.calc_score
FROM accumulated_scores a
JOIN scored_results sr
    ON a.product_id = sr.product_id
    AND a.account_id = sr.account_id
WHERE a.total_score >= :score_threshold
ORDER BY a.total_score DESC, a.product_id, a.account_id, sr.eval_order;
```

### How This Replaces Model-Specific Queries

**Before** (current state): Each detection model has a bespoke `query` field in its JSON metadata. The `wash_full_day` model query hardcodes references to `calc_wash_detection`, `calc_large_trading_activity`, and specific column names like `is_wash_candidate`, `qty_match_ratio`, `vwap_proximity`. Adding a new calculation to the model requires rewriting the query.

**After** (unified schema): The query above is parameterized solely by `model_id` and `target_date`. The `model_calculations` junction table determines which calculations participate. The `score_steps` table determines the scoring. Adding a new calculation to a model is an INSERT into `model_calculations` --- no query changes.

| Concern | Before (Per-Calc Tables) | After (Unified Schema) |
|---------|--------------------------|------------------------|
| Add a new calc to a model | Modify the model's SQL query to JOIN the new table, reference its specific columns | INSERT a row into `model_calculations` |
| Add a new detection model | Write a new custom SQL query referencing specific calc tables | INSERT a row into `detection_models` + rows into `model_calculations` |
| Query all results for a product | UNION across 10 tables with incompatible schemas | `SELECT * FROM calc_results WHERE product_id = ?` |
| Cross-model comparison | Manual UNION with column aliasing | `GROUP BY product_id, account_id` across all `calc_results` |

---

## 7. Migration Considerations

### 7.1 Mapping Current Tables to `calc_results`

Each existing per-calc table maps to rows in `calc_results`. The mapping assigns each calculation's primary output to `primary_value`, an optional secondary output to `secondary_value`, and any boolean flag to `flag_value`:

| Current Table | calc_id | primary_value Source | secondary_value Source | flag_value Source |
|---------------|---------|---------------------|----------------------|-------------------|
| `calc_value` | `value_calc` | `calculated_value` | _(null)_ | _(null)_ |
| `calc_adjusted_direction` | `adjusted_direction` | `calculated_value` | _(null)_ | _(null)_ |
| `calc_business_date_window` | `business_date_window` | `calculated_value` | _(null)_ | _(null)_ |
| `calc_trend_window` | `trend_window` | `price_change_pct` | _(null)_ | _(null)_ |
| `calc_cancellation_pattern` | `cancellation_pattern` | `cancel_count` | `cancel_quantity` | _(null)_ |
| `calc_market_event_window` | `market_event_window` | `price_change_pct` | _(null)_ | _(null)_ |
| `calc_trading_activity` | `trading_activity_aggregation` | `net_value` | `same_side_pct` | _(null)_ |
| `calc_vwap` | `vwap_calc` | `vwap_proximity` | `vwap_spread` | _(null)_ |
| `calc_large_trading_activity` | `large_trading_activity` | `total_value` | `threshold_used` | `is_large` |
| `calc_wash_detection` | `wash_detection` | `qty_match_ratio` | `vwap_proximity` | `is_wash_candidate` |

### 7.2 Migration SQL

```sql
-- Example: migrate calc_wash_detection -> calc_results
INSERT INTO calc_results (
    result_id, calc_id, window_id, pattern_id,
    product_id, account_id, venue_id, trader_id,
    business_date, primary_value, secondary_value, flag_value, computed_at
)
SELECT
    md5(CAST('wash_detection' || product_id || account_id || CAST(business_date AS VARCHAR) AS VARCHAR))
        AS result_id,
    'wash_detection'        AS calc_id,
    NULL                    AS window_id,       -- to be linked post-migration
    NULL                    AS pattern_id,      -- to be linked post-migration
    product_id,
    account_id,
    NULL                    AS venue_id,
    NULL                    AS trader_id,
    business_date,
    qty_match_ratio         AS primary_value,
    vwap_proximity          AS secondary_value,
    is_wash_candidate       AS flag_value,
    CURRENT_TIMESTAMP       AS computed_at
FROM calc_wash_detection;
```

### 7.3 What Is Lost and How to Mitigate

**Loss: Named columns.** In the current `calc_wash_detection` table, the column `qty_match_ratio` is self-documenting. In `calc_results`, it becomes `primary_value` --- generic and opaque without context.

**Mitigation: `calc_definitions.value_labels`.** The `value_labels` JSON column in the `calc_definitions` dimension table provides a mapping from generic column names to calculation-specific display labels:

```sql
-- Retrieve human-readable column labels for any calculation
SELECT
    cr.primary_value,
    json_extract_string(cd.value_labels, '$.primary_value')   AS primary_label,
    cr.secondary_value,
    json_extract_string(cd.value_labels, '$.secondary_value') AS secondary_label
FROM calc_results cr
JOIN calc_definitions cd ON cr.calc_id = cd.calc_id
WHERE cr.calc_id = 'wash_detection';

-- Output:
-- primary_value | primary_label           | secondary_value | secondary_label
-- 0.85          | Quantity Match Ratio     | 0.008           | VWAP Proximity
```

**Loss: Multi-column detail.** The `calc_trading_activity` table stores `buy_value`, `sell_value`, `net_value`, `buy_qty`, `sell_qty`, `total_trades`, and `same_side_pct` --- 7 distinct columns. The unified schema captures only 2 numeric values and 1 boolean.

**Mitigation options:**

1. **Multiple rows per calculation execution.** A single calculation run at a granularity point can produce multiple `calc_results` rows with different `calc_id` sub-variants (e.g., `trading_activity_net`, `trading_activity_buy_value`, `trading_activity_sell_value`). This preserves all values at the cost of more rows.

2. **Retain per-calc tables for drill-down.** The unified `calc_results` table serves as the primary query surface for detection and scoring. The existing per-calc Parquet files in `workspace/results/{layer}/` are retained as the detail layer. When a user drills into a specific result, the UI loads the full-schema Parquet file for that calculation.

3. **Add a `detail_json` column.** A JSON blob on `calc_results` that captures all non-primary columns. This preserves full fidelity without schema changes, at the cost of JSON extraction for access:

    ```sql
    ALTER TABLE calc_results ADD COLUMN detail_json JSON;
    -- For calc_trading_activity:
    -- detail_json = {"buy_value": 50000, "sell_value": 48000, "buy_qty": 500, "sell_qty": 480, "total_trades": 12}
    ```

Recommendation: option 2 (retain Parquet detail files) for the initial migration. The unified table handles detection and scoring; per-calc Parquet files handle drill-down. This minimizes migration risk while capturing the full benefit of a unified query surface.

---

## 8. Indexing Strategy

### 8.1 Primary Index

```sql
-- Most common query pattern: "all results for a specific calculation on a specific date"
CREATE INDEX idx_calc_results_calc_date
    ON calc_results (calc_id, business_date);
```

**Justification:** Every detection model query filters by `calc_id` (via the `model_calculations` JOIN) and `business_date`. This composite index supports the generic detection query in Section 6 and all per-calculation lookups.

### 8.2 Secondary Indexes

```sql
-- Product-date: "all results for a product on a date" (alert investigation)
CREATE INDEX idx_calc_results_product_date
    ON calc_results (product_id, business_date);

-- Account-date: "all results for an account on a date" (account review)
CREATE INDEX idx_calc_results_account_date
    ON calc_results (account_id, business_date);
```

**Justification:** Alert investigation workflows start from a product or account context. The investigator views all calculation results for a specific product-account-date triple. These indexes support that access pattern without full table scans.

### 8.3 Composite Index for Model Queries

```sql
-- Model-specific queries: "all results for calcs in a model, for a product, on a date"
CREATE INDEX idx_calc_results_calc_product_date
    ON calc_results (calc_id, product_id, business_date);
```

**Justification:** The generic detection query in Section 6 JOINs `calc_results` to `model_calculations` on `calc_id`, then filters by `product_id` and `business_date`. This three-column composite index covers the full predicate chain.

### 8.4 DuckDB-Specific Considerations

DuckDB's columnar storage engine has characteristics that affect indexing strategy differently from row-oriented databases:

**Columnar min/max statistics (zone maps).** DuckDB automatically maintains per-column min/max values for each row group (typically 122,880 rows). For `business_date`, the engine can skip entire row groups whose date range does not overlap the query predicate. This provides implicit "indexing" on date columns without explicit index creation.

**Full-table scans are fast.** DuckDB is optimized for analytical workloads where full-column scans are the primary access pattern. For a `calc_results` table with 1M rows, a full scan on a single column completes in milliseconds. Explicit indexes provide benefit primarily when:
- The selectivity is high (< 1% of rows match).
- The query accesses multiple columns (point lookups).

**Parquet predicate pushdown.** When `calc_results` is backed by Parquet files (as in the current dual-storage architecture), DuckDB pushes filter predicates into the Parquet reader. Filters on `calc_id` and `business_date` skip irrelevant row groups at the I/O level, before any in-memory processing.

**Partitioning by business_date.** For large-scale deployments, partitioning the `calc_results` Parquet files by `business_date` provides partition pruning --- the engine skips entire files for non-matching dates. This is more effective than explicit indexes for date-range queries:

```sql
-- Hive-partitioned Parquet layout:
-- workspace/results/calc_results/business_date=2026-03-01/part-0.parquet
-- workspace/results/calc_results/business_date=2026-03-02/part-0.parquet

-- DuckDB reads only the relevant partition:
SELECT * FROM read_parquet('workspace/results/calc_results/*/part-*.parquet',
                           hive_partitioning=true)
WHERE business_date = '2026-03-01'
  AND calc_id = 'wash_detection';
```

### 8.5 Index Summary

| Index | Columns | Primary Use Case | Priority |
|-------|---------|------------------|----------|
| Primary | `(calc_id, business_date)` | Detection model queries, daily batch runs | Must-have |
| Secondary | `(product_id, business_date)` | Product-centric alert investigation | Should-have |
| Secondary | `(account_id, business_date)` | Account-centric compliance review | Should-have |
| Composite | `(calc_id, product_id, business_date)` | Model-specific product queries | Nice-to-have |
| Partition | `business_date` (Parquet hive) | Date-range scans, historical analysis | Recommended for scale |

---

## Cross-References

- **Document 02** (`02-current-state-analysis.md`) --- Section 2.4 "Output Tables" documents the current per-calc table structure that this schema replaces.
- **Document 04** (`04-match-pattern-architecture.md`) --- Defines the universal 3-column match pattern structure used in `match_pattern_attributes`.
- **Document 05** (`05-calculation-instance-model.md`) --- Describes calculation instances (calc x pattern) whose results land in `calc_results`.
- **Document 06** (`06-time-window-framework.md`) --- Defines the time window dimension referenced by `calc_results.window_id`.
- **Document 10** (`10-scoring-and-alerting-pipeline.md`) --- Describes the scoring pipeline that reads from `calc_results` and `score_steps`.
- **Document 17** (`17-performance-and-efficiency.md`) --- Covers query optimization and materialization strategy for the unified schema.
- **Appendix A** (`appendices/A-complete-table-schemas.md`) --- Full DDL for all tables including constraints and comments.
- **Appendix B** (`appendices/B-worked-examples.md`) --- End-to-end scenarios showing data flowing through `calc_results`.
