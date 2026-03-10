# 07 -- Detection Level Design

> Configurable detection grain, entity graph reachability, and collapse strategies.
> All data sourced from `workspace/metadata/detection_models/` and `workspace/metadata/entities/` JSON files.

**Audience**: Data Engineers, Financial Modelers, Compliance

---

## 1. Problem: Hardcoded Granularity

Every detection model in the current system declares its analysis grain through a `granularity` field in the model JSON:

```json
"granularity": ["product_id", "account_id"]
```

All five production models use the identical grain:

| Model | `model_id` | `granularity` | Time Window |
|-------|-----------|---------------|-------------|
| Wash Trading -- Full Day | `wash_full_day` | `["product_id", "account_id"]` | `business_date` |
| Wash Trading -- Intraday | `wash_intraday` | `["product_id", "account_id"]` | `trend_window` |
| Market Price Ramping | `market_price_ramping` | `["product_id", "account_id"]` | `trend_window` |
| Spoofing / Layering | `spoofing_layering` | `["product_id", "account_id"]` | `cancellation_pattern` |
| Insider Dealing | `insider_dealing` | `["product_id", "account_id"]` | `market_event_window` |

This is a design problem, not a coincidence. Different models logically operate at different grains:

- **Wash trading** at product x account makes sense -- the behavior is "same person trades same product in both directions." The account dimension is essential because wash trading is by definition self-dealing.

- **Market price ramping** is fundamentally a product-level phenomenon. A price trend exists on a product regardless of which accounts participate. Including `account_id` in the grain means the model evaluates each account's contribution separately, which is correct for attribution -- but the trend detection itself (the `MUST_PASS` calculation) only needs product-level grain.

- **Spoofing / layering** is venue-specific order book manipulation. The cancellation pattern happens on a specific venue's order book. The current grain misses the venue dimension entirely, even though `spoofing_layering.json` references `cancel_count` and `pattern_side` from `calc_cancellation_pattern`.

- **Insider dealing** is account-centric. The suspicion is that an account traded across multiple products before a market event. Grouping by product x account fragments the picture -- the model should be asking "did this account trade abnormally across ANY products before the event?" not "did this account trade THIS product before THIS product's event?"

The hardcoded `granularity` array is a configuration shortcut that became a constraint. The proposed design replaces it with a match pattern -- making detection level a first-class configurable concept.

There is a second, subtler problem: detection levels are currently tied to models, not to calculations. The same calculation can be meaningful at multiple detection levels -- `large_trading_activity`, for example, is useful both at the product grain (for market price ramping) and at the product x account grain (for wash trading). But the current design allows only one `granularity` per model, and calculations are implicitly locked to whatever grain their parent model declares. This means a calculation cannot be pre-computed at multiple grains and shared across models with different detection levels. The result is either redundant calculation definitions (same logic, different grain) or forced grain alignment (all models share the same grain, as seen today). The proposed design decouples calculation grain from model grain by introducing a per-calculation detection level registration.

---

## 2. Detection Level as Match Pattern

The detection level defines the GROUP BY grain of a detection model's analysis query. In the proposed architecture, this is expressed as a match pattern with `pattern_type = "detection_level"` and `attribute_value = NULL`.

### 2.1 Pattern Structure

Detection level patterns follow the universal 3-column match pattern structure (see `04-match-pattern-architecture.md`):

| Column | Description | Detection Level Usage |
|--------|-------------|----------------------|
| `pattern_key` | Links to the entity attribute being used as a grouping key | Entity + attribute pair |
| `entity` | The source entity that owns the attribute | One of the 8 entities |
| `entity_attribute` | The specific field used for grouping | Typically the primary key field |
| `attribute_value` | Always `NULL` for detection levels | `NULL` -- means "group by this column" rather than "filter to this value" |

The `NULL` value in `attribute_value` is what distinguishes a detection level pattern from a classification pattern. Classification says "where asset_class = equity" (value is `equity`). Detection level says "group by product_id" (value is `NULL` -- we group by whatever the data contains).

### 2.2 Multiple Rows = Multi-Dimensional Grain

When a detection level pattern has multiple rows, the rows combine with AND logic to form a composite grouping key. Each row adds one dimension to the GROUP BY clause.

**Example: Wash Trading detection level**

```
pattern_id:   "DL-WASH"
pattern_type: "detection_level"
model_id:     "wash_full_day"  (also "wash_intraday")

Row 1:
  entity:           "product"
  entity_attribute: "product_id"
  attribute_value:  NULL           <-- group by product_id

Row 2:
  entity:           "account"
  entity_attribute: "account_id"
  attribute_value:  NULL           <-- group by account_id
```

This produces: `GROUP BY product_id, account_id` -- one alert candidate per unique product-account pair.

**Example: Market Price Ramping detection level (product only)**

```
pattern_id:   "DL-MPR"
pattern_type: "detection_level"
model_id:     "market_price_ramping"

Row 1:
  entity:           "product"
  entity_attribute: "product_id"
  attribute_value:  NULL           <-- group by product_id
```

This produces: `GROUP BY product_id` -- one alert candidate per product, regardless of which accounts participated.

### 2.3 Detection Levels are Per-Calculation

Detection levels are not solely a property of models -- they are independently registered per calculation. A single calculation can declare that it is computable at multiple detection levels via the `calc_detection_levels` junction table. The detection MODEL still declares its alert grain through a `detection_level_pattern`, but the calculation infrastructure computes results at each grain the calculation is registered for, independently of any particular model.

This decoupling means:

- **`large_trading_activity`** can be registered for both `DL-PRODUCT` and `DL-PRODUCT-ACCOUNT`. The calculation engine computes it once at each grain, storing separate rows in `calc_results` with the appropriate `detection_level_id`. Market Price Ramping reads the `DL-PRODUCT` results; Wash Trading reads the `DL-PRODUCT-ACCOUNT` results. Same calculation logic, different grains, no duplication of calculation definitions.

- **`wash_detection`** is registered only for `DL-PRODUCT-ACCOUNT`, because wash trading is inherently a per-account-per-product behavior. Registering it at `DL-PRODUCT` would be semantically meaningless.

- **`value_calc`** (quantity x price) has NO rows in `calc_detection_levels` -- it is a transaction-layer calculation that operates on individual rows without grouping (see Section 2.4).

**`calc_detection_levels` junction table:**

| calc_id | detection_level_id | Resulting Grain |
|---|---|---|
| `large_trading_activity` | `DL-PRODUCT` | GROUP BY product_id |
| `large_trading_activity` | `DL-PRODUCT-ACCOUNT` | GROUP BY product_id, account_id |
| `wash_detection` | `DL-PRODUCT-ACCOUNT` | GROUP BY product_id, account_id |
| `trend_detection` | `DL-PRODUCT` | GROUP BY product_id |
| `value_calc` | *(no rows)* | transaction-layer, no GROUP BY |

When the calculation engine runs, it iterates over each calculation's registered detection levels and produces one set of `calc_results` rows per detection level. The `detection_level_id` column in `calc_results` identifies which grain each result row belongs to, enabling downstream consumers (detection models, reports, what-if analysis) to select the appropriate grain.

> **Time windows**: Time windows are another join dimension for calculation execution: a calculation runs at a detection level x time window cross-product. Time window association with calculations will be detailed in a future additive document.

### 2.4 Transaction-Layer Calculations

Not all calculations use detection levels. Transaction-layer calculations operate on individual rows without any grouping. These are typically arithmetic transformations, enrichments, or ratio computations applied row-by-row:

- **`value_calc`** -- quantity x price, computed per execution row
- **`adjusted_direction`** -- normalizes buy/sell direction based on capacity and order side
- **Ratio calculations** -- e.g., price-to-VWAP ratio per execution, bid-ask spread per market data tick

Transaction-layer calculations have:

- **No rows in `calc_detection_levels`** -- they are not registered for any detection level
- **`detection_level_id = NULL` in `calc_results`** -- results are stored without a grain key, indexed by the source row's natural key (e.g., `execution_id`)
- **No universe materialization needed** -- they do not require pre-computed entity combination sets (see Section 3.2)

Transaction-layer results serve as inputs to detection-level calculations. For example, `large_trading_activity` at `DL-PRODUCT` aggregates `value_calc` results across all executions for a product: `SUM(value_calc.value) GROUP BY product_id`. The transaction-layer calc runs first, producing per-row values; the detection-level calc then aggregates those values at the appropriate grain.

---

## 3. Examples per Model

The following table shows the proposed detection level for each current model, two hypothetical future models, and the rationale for each grain choice.

| Model | Detection Level | Pattern Rows | Rationale |
|-------|-----------------|--------------|-----------|
| Wash Trading (Full Day + Intraday) | product x account | `product.product_id` + `account.account_id` | Same person, same product -- self-dealing requires both dimensions to identify the account buying and selling the same instrument |
| Market Price Ramping | product only | `product.product_id` | Price manipulation is a product-level phenomenon -- the trend exists on the instrument, not on any single account |
| Spoofing / Layering | product x venue | `product.product_id` + `venue.mic` | Order book manipulation is venue-specific -- spoofing exploits a particular venue's order book, and the cancellation pattern is observable per venue |
| Insider Dealing | account only | `account.account_id` | Suspicious account behavior across products -- the question is "did this account trade abnormally before an event?" not "did this account trade this specific product?" |
| _(hypothetical)_ Concentration Risk | account only | `account.account_id` | Position concentration is account-level -- risk accumulates across an account's full portfolio, not per instrument |
| _(hypothetical)_ Cross-venue Arbitrage | product only | `product.product_id` | Price discrepancy across venues -- the same product priced differently on different venues, detected at product level |

**Calculation Registration per Detection Level:**

Because detection levels are per-calculation (Section 2.3), a calculation can appear in multiple models with different detection levels. The following table shows which calculations are registered at which detection levels, and which models consume them:

| Calculation | Registered Detection Levels | Consumed By (Model @ DL) |
|-------------|----------------------------|--------------------------|
| `large_trading_activity` | `DL-PRODUCT`, `DL-PRODUCT-ACCOUNT` | Market Price Ramping @ `DL-PRODUCT`, Wash Trading @ `DL-PRODUCT-ACCOUNT` |
| `trend_detection` | `DL-PRODUCT` | Market Price Ramping @ `DL-PRODUCT` |
| `same_side_ratio` | `DL-PRODUCT`, `DL-PRODUCT-ACCOUNT` | Market Price Ramping @ `DL-PRODUCT`, Wash Trading @ `DL-PRODUCT-ACCOUNT` |
| `wash_qty_match` | `DL-PRODUCT-ACCOUNT` | Wash Trading @ `DL-PRODUCT-ACCOUNT` |
| `wash_vwap_proximity` | `DL-PRODUCT-ACCOUNT` | Wash Trading @ `DL-PRODUCT-ACCOUNT` |
| `calc_cancellation_pattern` | `DL-PRODUCT-VENUE` | Spoofing / Layering @ `DL-PRODUCT-VENUE` |
| `value_calc` | *(none -- transaction-layer)* | Input to `large_trading_activity` aggregation |

Note that `large_trading_activity` is registered at TWO detection levels. The calculation engine computes it at both grains, producing separate `calc_results` rows for each. Market Price Ramping queries `calc_results WHERE detection_level_id = 'DL-PRODUCT'`; Wash Trading queries `calc_results WHERE detection_level_id = 'DL-PRODUCT-ACCOUNT'`. The same calculation definition serves both models without duplication.

### 3.1 Current vs Proposed Query Impact

**Wash Trading** -- unchanged (already correct at product x account):
```sql
-- Current and proposed both produce:
GROUP BY product_id, account_id
```

**Market Price Ramping** -- grain change from product x account to product only:
```sql
-- Current (hardcoded):
GROUP BY product_id, account_id
-- 761 executions across 50 products x 220 accounts = sparse matrix

-- Proposed (from detection level pattern):
GROUP BY product_id
-- 761 executions across 50 products = dense, meaningful aggregation
```

**Spoofing / Layering** -- grain change from product x account to product x venue:
```sql
-- Current (hardcoded):
GROUP BY product_id, account_id

-- Proposed (from detection level pattern):
GROUP BY product_id, venue_mic
-- Now captures venue-specific order book manipulation patterns
```

**Insider Dealing** -- grain change from product x account to account only:
```sql
-- Current (hardcoded):
GROUP BY product_id, account_id

-- Proposed (from detection level pattern):
GROUP BY account_id
-- Holistic view of account behavior across all products before an event
```

### 3.2 Detection Level Universe

The `detection_level_universe` table pre-materializes the set of active entity combinations for each detection level. This avoids the need to discover valid combinations at runtime by scanning transactional data.

**Why pre-materialize?**

Without a universe table, the calculation engine must answer "which product-account pairs actually exist in the data?" by scanning the full execution table at runtime. For `DL-PRODUCT` this is trivial (50 products), but for `DL-PRODUCT-ACCOUNT` the theoretical cross-product is 50 x 220 = 11,000 pairs -- while only ~2,200 pairs have actual trading activity. Pre-materializing the active combinations avoids wasteful computation on empty pairs and provides a stable enumeration for:

- **Calculation scheduling** -- iterate over universe rows, compute each combination
- **Completeness checks** -- verify that `calc_results` has one row per universe entry per calculation
- **Gap detection** -- identify combinations that were expected but produced no results (vs. combinations that were never active)

**How it works:**

One row per active entity combination per detection level. The universe is materialized periodically (e.g., daily before the calculation run) or triggered on entity data change (new account created, new product listed).

| universe_id | detection_level_id | product_id | account_id | is_active | last_activity_date |
|---|---|---|---|---|---|
| `U-001` | `DL-PRODUCT` | `PROD-001` | `NULL` | `TRUE` | `2026-03-09` |
| `U-002` | `DL-PRODUCT` | `PROD-002` | `NULL` | `TRUE` | `2026-03-09` |
| `U-003` | `DL-PRODUCT-ACCOUNT` | `PROD-001` | `ACCT-001` | `TRUE` | `2026-03-09` |
| `U-004` | `DL-PRODUCT-ACCOUNT` | `PROD-001` | `ACCT-015` | `TRUE` | `2026-03-08` |
| `U-005` | `DL-PRODUCT-ACCOUNT` | `PROD-002` | `ACCT-001` | `TRUE` | `2026-03-09` |
| `U-006` | `DL-PRODUCT-ACCOUNT` | `PROD-033` | `ACCT-112` | `FALSE` | `2026-02-15` |

**Scale characteristics:**

| Detection Level | Entity Columns | Theoretical Max | Active Rows (typical) |
|---|---|---|---|
| `DL-PRODUCT` | `product_id` | 50 | ~50 |
| `DL-PRODUCT-ACCOUNT` | `product_id`, `account_id` | 11,000 (50 x 220) | ~2,200 |
| `DL-PRODUCT-VENUE` | `product_id`, `venue_mic` | 300 (50 x 6) | ~120 |
| `DL-ACCOUNT` | `account_id` | 220 | ~220 |

The universe table uses `NULL` for entity columns not relevant to a given detection level (e.g., `account_id = NULL` for `DL-PRODUCT` rows). The `is_active` flag supports soft deactivation -- combinations that had historical activity but are no longer traded remain in the universe for historical analysis but are excluded from the active calculation run.

---

## 4. Entity Graph Reachability

The detection level determines the grain of analysis -- but it does NOT limit which entity attributes are available to the detection model. Attributes from entities not included in the detection level are still **reachable** through the entity relationship graph.

### 4.1 The 8-Entity Relationship Graph

The platform's entity model (from `workspace/metadata/entities/`) forms a connected graph. Every entity is reachable from every other entity through some path of relationships.

```
                            ┌───────────┐
                            │   venue   │
                            │   (mic)   │
                            └─────┬─────┘
                     1:M ┌────────┼────────┐ 1:M
                         │        │        │
                         ▼   1:M  ▼        ▼
  ┌───────────┐  1:M  ┌───────────┐  M:1  ┌───────────┐
  │  product   │◄─────│ execution  │──────►│   order   │
  │(product_id)│  1:M │(execution_ │  M:1  │ (order_id)│
  │            │◄─────│   id)      │       └─────┬─────┘
  │            │      └──────┬─────┘        M:1  │  M:1
  │            │        M:1  │                   │
  │            │             ▼              M:1  ▼
  │            │      ┌───────────┐       ┌───────────┐
  │            │      │  trader   │  1:M  │  account  │
  │            │      │(trader_id)│──────►│(account_  │
  │            │      └───────────┘       │   id)     │
  │  1:M  1:M  │                          └───────────┘
  │       │    │
  ▼       ▼    │
┌──────┐┌──────┐
│md_eod││md_   │
│      ││intra-│
│      ││day   │
└──────┘└──────┘
```

### 4.2 Reachability Paths with Hop Counts

From any detection level entity, the system can walk the relationship graph to reach any other entity. The number of hops and the cardinality at each hop determine both the cost and the collapse strategy required.

**From `product` (detection level = product only):**

| Target Entity | Path | Hops | Cardinality Chain | Collapse Needed? |
|---------------|------|------|-------------------|------------------|
| execution | product -> execution | 1 | 1:M | Yes |
| order | product -> order | 1 | 1:M | Yes |
| venue | product -> venue (via `exchange_mic` = `mic`) | 1 | M:1 | No |
| account | product -> execution -> account | 2 | 1:M -> M:1 | Yes (first hop) |
| account | product -> order -> account | 2 | 1:M -> M:1 | Yes (first hop) |
| trader | product -> execution -> trader | 2 | 1:M -> M:1 | Yes (first hop) |
| trader | product -> order -> trader | 2 | 1:M -> M:1 | Yes (first hop) |
| md_eod | product -> md_eod | 1 | 1:M | Yes |
| md_intraday | product -> md_intraday | 1 | 1:M | Yes |

**From `account` (detection level = account only):**

| Target Entity | Path | Hops | Cardinality Chain | Collapse Needed? |
|---------------|------|------|-------------------|------------------|
| execution | account -> execution | 1 | 1:M | Yes |
| order | account -> order | 1 | 1:M | Yes |
| product | account -> execution -> product | 2 | 1:M -> M:1 | Yes (first hop) |
| product | account -> order -> product | 2 | 1:M -> M:1 | Yes (first hop) |
| venue | account -> execution -> venue | 2 | 1:M -> M:1 | Yes (first hop) |
| venue | account -> order -> venue | 2 | 1:M -> M:1 | Yes (first hop) |
| trader | account -> order -> trader | 2 | 1:M -> M:1 | Yes (first hop) |
| md_eod | account -> execution -> product -> md_eod | 3 | 1:M -> M:1 -> 1:M | Yes |
| md_intraday | account -> execution -> product -> md_intraday | 3 | 1:M -> M:1 -> 1:M | Yes |

**From `venue` (used in spoofing detection level as product x venue):**

| Target Entity | Path | Hops | Cardinality Chain | Collapse Needed? |
|---------------|------|------|-------------------|------------------|
| execution | venue -> execution | 1 | 1:M | Yes |
| order | venue -> order | 1 | 1:M | Yes |
| product | venue -> product (via `mic` = `exchange_mic`) | 1 | 1:M | Yes |
| account | venue -> execution -> account | 2 | 1:M -> M:1 | Yes (first hop) |
| trader | venue -> execution -> trader | 2 | 1:M -> M:1 | Yes (first hop) |

### 4.3 Cardinality Rules

The entity graph walk follows these cardinality rules:

- **M:1 (many-to-one)** -- always safe. Each source row maps to exactly one target row. No collapse needed. Example: execution -> product (each execution belongs to one product).

- **1:1 (one-to-one)** -- always safe. Bidirectional single-row mapping. No collapse needed. (Not present in current model, but the system supports it.)

- **1:M (one-to-many)** -- requires a collapse strategy. One source row maps to many target rows. Example: product -> execution (one product has many executions). The system must decide how to reduce the many rows to a single value. See Section 5.

- **M:M (many-to-many)** -- resolved by walking through an intermediary entity with two M:1 hops. Example: account to product via execution (account -> execution [1:M] -> product [M:1]).

---

## 5. Collapse Strategies for 1:Many Reachability

When the entity graph walk encounters a 1:M relationship, the system must collapse multiple target rows into a single value usable by the detection model. Four collapse strategies are defined:

| Strategy | Semantics | Use Case | Example |
|----------|-----------|----------|---------|
| `dominant` | Most frequent value (by count or volume) | Primary venue for a product | Product `PROD-001` traded on 5 venues: XNYS (80% of volume), XNAS (12%), XCHI (5%), BATS (2%), EDGX (1%). Dominant = `XNYS`. |
| `any` | Any single match triggers the condition | "Any execution on dark pool" | If ANY of a product's executions routed through a dark pool venue (`venue_type = 'dark_pool'`), the condition is true. One match suffices. |
| `all` | All target rows must satisfy the condition | "All executions through same venue" | Every execution for the product must route through the same venue. Used for detecting concentration or routing anomalies. |
| `aggregate` | Compute a numeric aggregate (count, sum, distinct count, min, max, avg) | "Number of distinct venues" | Count of unique `venue_mic` values across all executions for a product. Useful for cross-venue detection patterns. |

### 5.1 Worked Example: Product-Level Detection Reaching Venue Attributes

Consider Market Price Ramping with detection level = product only. The model needs to know the primary trading venue to contextualize the price trend.

```
Detection level:  product.product_id
Needed attribute: venue.venue_type
Path:             product -> execution -> venue
Cardinality:      1:M (product -> execution) then M:1 (execution -> venue)
Collapse at:      product -> execution (1:M hop)
```

The 1:M hop is at `product -> execution`. A single product may have hundreds of executions across multiple venues. The collapse strategy determines how to resolve this:

```
Product PROD-001 (AAPL equity):
  Execution E-001: venue_mic = XNYS  (500 shares)
  Execution E-002: venue_mic = XNYS  (200 shares)
  Execution E-003: venue_mic = XNAS  (100 shares)
  Execution E-004: venue_mic = XNYS  (300 shares)
  Execution E-005: venue_mic = BATS  (50 shares)

  dominant  -> XNYS  (3 executions, 1000 shares = 87% of volume)
  any("BATS") -> TRUE (at least one execution on BATS)
  all("XNYS") -> FALSE (not all executions on XNYS)
  aggregate(count_distinct) -> 3 (three distinct venues)
```

### 5.2 Collapse Strategy in Entity Graph Walk (ASCII)

```
                   DETECTION LEVEL: product.product_id
                   ┌──────────────────────────────────┐
                   │  GROUP BY product_id              │
                   │                                   │
                   │  Direct attributes (no collapse): │
                   │    product.asset_class             │
                   │    product.instrument_type         │
                   │    product.isin                    │
                   │    product.exchange_mic            │
                   │    product.currency                │
                   └─────────────┬────────────────────┘
                                 │
                    1:M hop      │  COLLAPSE NEEDED
                    ─────────    ▼
                   ┌──────────────────────────────────┐
                   │  execution (many per product)     │
                   │                                   │
                   │  Collapse strategies apply here:  │
                   │    dominant(venue_mic) = XNYS     │
                   │    aggregate(count, *) = 761      │
                   │    any(capacity = 'PRINCIPAL')    │
                   └─────────────┬────────────────────┘
                                 │
                    M:1 hop      │  SAFE (no collapse)
                    ─────────    ▼
                   ┌──────────────────────────────────┐
                   │  venue (one per execution)        │
                   │                                   │
                   │  After collapse at execution:     │
                   │    venue.venue_type                │
                   │    venue.country                   │
                   │    venue.timezone                  │
                   └──────────────────────────────────┘
```

---

## 6. Constraint: Detection Level Scopes Downstream Patterns

Detection level imposes a validation constraint on all other pattern types within the same model. Threshold patterns, score patterns, and setting patterns can only reference attributes that are **reachable** from the detection level entities through the entity relationship graph.

### 6.1 The Validation Rule

This is a **configuration-time** check, not a runtime check. Validation now operates at two levels:

**Per-calculation validation:**

When a calculation is registered for a detection level via `calc_detection_levels`, the system validates that all of the calculation's required settings and input attributes are reachable from the detection level entities:

1. Identify the detection level entities for the registered detection level (from the `detection_level` pattern rows).
2. For each setting or input attribute the calculation references, determine which entity owns it.
3. Check that a path exists in the entity relationship graph from a detection level entity to the target entity.
4. If no path exists, reject the registration with a clear error: "Calculation `X` cannot be registered for detection level `Y` because setting `Z` on entity `W` is not reachable from the detection level entities `[...]`."

**Per-model validation:**

When a detection model references a calculation, the system validates that the model's `detection_level_pattern` is compatible with the calculation's registered detection levels:

1. The model's detection level must be one of the calculation's registered detection levels in `calc_detection_levels`, OR it must be aggregatable from one (e.g., a model at `DL-PRODUCT` can use a calculation registered at `DL-PRODUCT-ACCOUNT` by aggregating over the account dimension).
2. If the calculation has no matching registration, reject the model configuration: "Model `M` at detection level `DL-X` references calculation `C`, but `C` is not registered for `DL-X` or any detection level aggregatable to `DL-X`."

**Legacy (single-level) validation:**

For threshold, score, and setting patterns within a model, the original reachability check still applies:

1. Identify the detection level entities for the model (from the `detection_level` pattern).
2. For each attribute referenced in the threshold/score/setting pattern, determine which entity owns it.
3. Check that a path exists in the entity relationship graph from a detection level entity to the target entity.
4. If no path exists, reject the configuration with a clear error message.

### 6.2 What This Prevents

Consider a hypothetical (invalid) configuration:

```
Detection model:  "wash_full_day"
Detection level:  product.product_id + account.account_id
Threshold pattern: references "pipeline_stage.quality_gate"
```

The entity `pipeline_stage` does not exist in the entity relationship graph (it is a medallion metadata concept, not a transactional entity). There is no path from `product` or `account` to `pipeline_stage`. The configuration validator rejects this pattern.

### 6.3 What This Does NOT Prevent

The validation rule checks reachability, not directness. An attribute is valid as long as ANY path exists, even if it requires collapse strategies.

```
Detection model:  "market_price_ramping"
Detection level:  product.product_id (product only)
Threshold pattern: references "account.risk_rating"

Validation:
  product -> execution (1:M, collapse needed)
    -> account (M:1, safe after collapse)
      -> risk_rating (direct attribute)

Result: VALID -- account.risk_rating is reachable from product via
        product -> execution -> account (2 hops, with collapse at
        the 1:M execution hop)
```

The system records the path and required collapse strategy at configuration time, so runtime execution knows exactly how to resolve the attribute.

---

## 7. Expansion: Detection Level Does Not Limit Attribute Availability

This section clarifies a key design insight that is easy to confuse: **detection level defines the GRAIN, not the scope of available attributes.**

### 7.1 Grain vs Scope

| Concept | Detection Level Controls? | Example |
|---------|--------------------------|---------|
| **Grain** (GROUP BY columns) | Yes | Product-only detection: `GROUP BY product_id` |
| **Available attributes** | No | Product-only detection CAN access `venue.venue_type`, `account.risk_rating`, `trader.desk` -- all reachable through the entity graph |
| **Alert identity** | Yes | Each alert candidate is identified by its grain key(s) |
| **Attribute filters** | No | Classification patterns (WHERE clauses) can use any reachable attribute |
| **Threshold inputs** | No | Threshold comparisons can use values from any reachable entity |

### 7.2 Why This Matters

Without this distinction, users might assume that a product-only detection level means "I can only use product attributes." That assumption would make product-only detection nearly useless -- the model could not reference trading volumes (from execution), order patterns (from order), or account risk profiles (from account).

In practice, the entity relationship graph provides full reachability:

```
Detection level: product only (GROUP BY product_id)

Available through entity graph walk:
  product.* .................. direct (0 hops)
  venue.* .................... 1 hop via exchange_mic (M:1, safe)
  execution.* ................ 1 hop (1:M, collapse needed)
  order.* .................... 1 hop (1:M, collapse needed)
  md_eod.* ................... 1 hop (1:M, collapse needed)
  md_intraday.* .............. 1 hop (1:M, collapse needed)
  account.* .................. 2 hops via execution (1:M -> M:1, collapse at execution)
  trader.* ................... 2 hops via execution (1:M -> M:1, collapse at execution)
```

The detection level constrains the granularity at which alerts are raised. The entity graph determines which attributes are accessible for classification, thresholds, scoring, and context enrichment.

### 7.3 Smart Resolution Walkthrough

When the detection engine encounters a reference to an attribute not on a detection-level entity, it performs the following:

1. **Identify the target entity** -- e.g., `account.risk_rating` belongs to entity `account`.
2. **Find the shortest path** from a detection-level entity to the target entity in the relationship graph.
3. **Identify 1:M hops** along the path that require collapse.
4. **Apply the configured collapse strategy** (or the default strategy if none is configured).
5. **Return the resolved value** for use in the calculation or threshold comparison.

This resolution is deterministic, auditable, and recorded in the alert trace for compliance review.

---

## 8. Impact on Query Generation

The detection level pattern directly drives the SQL query that the detection engine generates. Today, queries are hardcoded in the model JSON as a `query` string field. In the proposed architecture, the query is generated from the detection level and classification patterns.

### 8.1 Current: Hardcoded Query

From `workspace/metadata/detection_models/wash_full_day.json`:

```sql
SELECT w.product_id, w.account_id, w.business_date,
       w.total_value, w.buy_value, w.sell_value,
       w.buy_qty, w.sell_qty, w.total_trades,
       w.same_side_pct, w.is_large,
       w.qty_match_ratio, w.vwap_buy, w.vwap_sell,
       w.vwap_spread, w.vwap_proximity,
       w.is_wash_candidate,
       p.asset_class, p.instrument_type
FROM calc_wash_detection w
INNER JOIN product p ON w.product_id = p.product_id
WHERE w.is_wash_candidate = TRUE
  AND w.buy_qty > 0
  AND w.sell_qty > 0
```

The GROUP BY is implicit in the upstream `calc_wash_detection` view, which already computes at the product x account grain. The hardcoded query bakes in the grain assumption -- there is no way to change the grain without editing the SQL string.

### 8.2 Proposed: Generated Query

In the proposed architecture, the detection engine generates the query from three inputs:

1. **Detection level pattern** -- determines the GROUP BY columns.
2. **Calculation references** -- determines which calc result tables to join.
3. **Classification patterns** -- determines the WHERE clause filters.

**Generated query for wash_full_day (product x account -- unchanged grain):**

```sql
-- Detection level: product.product_id + account.account_id
-- Detection level ID: DL-PRODUCT-ACCOUNT
-- Calculations: large_trading_activity (MUST_PASS), wash_qty_match, wash_vwap_proximity
-- Classification: (none -- applies to all)
-- Note: each calc_results join filters on detection_level_id to select the
--       correct grain. large_trading_activity exists at both DL-PRODUCT and
--       DL-PRODUCT-ACCOUNT; this model reads the DL-PRODUCT-ACCOUNT results.

SELECT
  -- Detection level keys (from detection_level pattern)
  cr_lta.product_id,
  cr_lta.account_id,

  -- Time dimension (from time_window registration)
  cr_lta.business_date,

  -- Calculation results (from calc references)
  cr_lta.total_value,
  cr_lta.is_large,
  cr_wqm.qty_match_ratio,
  cr_wvp.vwap_proximity,

  -- Entity context (from entity graph reachability)
  p.asset_class,
  p.instrument_type

FROM calc_results cr_lta
INNER JOIN calc_results cr_wqm
  ON  cr_lta.product_id = cr_wqm.product_id
  AND cr_lta.account_id = cr_wqm.account_id
  AND cr_lta.business_date = cr_wqm.business_date
INNER JOIN calc_results cr_wvp
  ON  cr_lta.product_id = cr_wvp.product_id
  AND cr_lta.account_id = cr_wvp.account_id
  AND cr_lta.business_date = cr_wvp.business_date
INNER JOIN product p
  ON cr_lta.product_id = p.product_id

WHERE cr_lta.calc_id = 'large_trading_activity'
  AND cr_lta.detection_level_id = 'DL-PRODUCT-ACCOUNT'
  AND cr_wqm.calc_id = 'wash_qty_match'
  AND cr_wqm.detection_level_id = 'DL-PRODUCT-ACCOUNT'
  AND cr_wvp.calc_id = 'wash_vwap_proximity'
  AND cr_wvp.detection_level_id = 'DL-PRODUCT-ACCOUNT'
  AND cr_lta.is_large = TRUE        -- MUST_PASS gate
```

**Generated query for market_price_ramping (changed grain: product only):**

```sql
-- Detection level: product.product_id (no account dimension)
-- Detection level ID: DL-PRODUCT
-- Calculations: trend_detection (MUST_PASS), large_trading_activity, same_side_ratio
-- Note: large_trading_activity is the SAME calculation as in wash trading above,
--       but here the query reads the DL-PRODUCT results (GROUP BY product_id only).
--       The calc_detection_levels registration ensures results exist at this grain.

SELECT
  -- Detection level keys (product only -- no account_id)
  cr_td.product_id,

  -- Time dimension
  cr_td.business_date,

  -- Calculation results
  cr_td.price_change_pct,
  cr_td.trend_type,
  cr_lta.total_value,
  cr_ssr.same_side_pct,

  -- Entity context (reachable via entity graph)
  p.asset_class,
  p.instrument_type

FROM calc_results cr_td
INNER JOIN calc_results cr_lta
  ON  cr_td.product_id = cr_lta.product_id
  AND cr_td.business_date = cr_lta.business_date
INNER JOIN calc_results cr_ssr
  ON  cr_td.product_id = cr_ssr.product_id
  AND cr_td.business_date = cr_ssr.business_date
INNER JOIN product p
  ON cr_td.product_id = p.product_id

WHERE cr_td.calc_id = 'trend_detection'
  AND cr_td.detection_level_id = 'DL-PRODUCT'
  AND cr_lta.calc_id = 'large_trading_activity'
  AND cr_lta.detection_level_id = 'DL-PRODUCT'
  AND cr_ssr.calc_id = 'same_side_ratio'
  AND cr_ssr.detection_level_id = 'DL-PRODUCT'
  AND cr_td.trend_type IS NOT NULL   -- MUST_PASS gate
```

**Query generator verification step:** Before assembling the query, the generator reads `calc_detection_levels` to verify that each referenced calculation has a registration at the model's detection level. If `large_trading_activity` were not registered for `DL-PRODUCT`, the generator would reject the model configuration at build time rather than producing a query that returns no results at runtime.

Key differences from the current hardcoded approach:

| Aspect | Current (Hardcoded) | Proposed (Generated) |
|--------|--------------------|--------------------|
| GROUP BY columns | Implicit in upstream calc view | Derived from `detection_level` pattern rows |
| JOIN conditions | Written by hand in SQL string | Generated from detection level keys + time window |
| WHERE filters | Written by hand | Derived from classification patterns + MUST_PASS gates |
| Entity context joins | Written by hand (e.g., `INNER JOIN product p`) | Generated from entity graph reachability analysis |
| Grain change | Requires editing the SQL string and upstream calc | Change the detection level pattern rows -- query regenerates |
| Calc grain selection | Implicit -- calc and model share same grain | Explicit `detection_level_id` filter in WHERE clause selects the correct grain from `calc_results` |
| Calc reuse across models | Requires duplicate calc definitions at different grains | Single calc registered at multiple detection levels via `calc_detection_levels` |

### 8.3 Query Generation Algorithm

```
function generateDetectionQuery(model):
  1. Read detection_level pattern -> extract GROUP BY columns
  2. Read time_window registration -> determine time dimension column
  3. For each calculation in model.calculations:
     a. Add calc_results join on GROUP BY columns + time column
     b. If strictness = MUST_PASS, add WHERE clause for gate condition
  4. For each entity attribute referenced in context_fields:
     a. Walk entity graph from detection level entities to target entity
     b. If path is all M:1, add direct JOIN
     c. If path crosses 1:M, add subquery with collapse strategy
  5. For each classification pattern:
     a. Walk entity graph to attribute entity
     b. Add WHERE clause with pattern match condition
  6. Assemble SELECT / FROM / JOIN / WHERE / GROUP BY
  7. Return generated SQL
```

### 8.4 Separation of Computation from Scoring

A critical design insight in the proposed architecture is the clean separation between **computation** (calculating raw values) and **scoring** (applying thresholds and generating alerts). The `calc_results` table stores raw computed values independently from scoring decisions. Scoring is a downstream consumer of `calc_results`, not an embedded part of the computation pipeline.

**Core principle:** `calc_results` contains the computed facts. Thresholds, score steps, and alert decisions are applied as a separate query layer on top of those facts. This means computation and scoring can evolve independently.

**Benefits:**

1. **Threshold tuning without recomputation.** Changing a score threshold from 15 to 12 does not require re-running the calculation pipeline. The `calc_results` rows already contain the raw `total_value`, `qty_match_ratio`, or `price_change_pct` values. Only the scoring query needs to re-run with the new threshold, which is orders of magnitude cheaper than recomputing from raw execution data.

2. **Score step recalibration.** Graduated scoring ranges (e.g., "value 10-20 = low risk, 20-50 = medium, 50+ = high") can be adjusted and re-applied against existing `calc_results`. The compliance team can recalibrate scoring without involving the data engineering team or waiting for a full pipeline run.

3. **What-if analysis.** "What would our alert volume look like at threshold 10 vs 15?" becomes a pure SQL query against `calc_results`:

   ```sql
   -- What-if: compare alert counts at threshold 10 vs 15
   SELECT
     'threshold_10' AS scenario,
     COUNT(*) AS alert_count
   FROM calc_results
   WHERE calc_id = 'large_trading_activity'
     AND detection_level_id = 'DL-PRODUCT-ACCOUNT'
     AND total_value >= 10

   UNION ALL

   SELECT
     'threshold_15' AS scenario,
     COUNT(*) AS alert_count
   FROM calc_results
   WHERE calc_id = 'large_trading_activity'
     AND detection_level_id = 'DL-PRODUCT-ACCOUNT'
     AND total_value >= 15
   ```

   No pipeline execution required. The analyst gets immediate results because the computation has already been done.

4. **Regulatory audit trail.** Historical `calc_results` are preserved even when thresholds change. An auditor can answer "what was the computed value for this product-account pair on this date?" independently of "what threshold was in effect at that time?" The computation facts and the scoring policy are stored separately, providing full traceability.

**Concrete example: same computation, different scoring outcomes**

Consider a `large_trading_activity` result for PROD-001 / ACCT-042 on 2026-03-09:

```
calc_results row:
  calc_id:            large_trading_activity
  detection_level_id: DL-PRODUCT-ACCOUNT
  product_id:         PROD-001
  account_id:         ACCT-042
  business_date:      2026-03-09
  total_value:        13.7
  total_trades:       8
  buy_value:          7.2
  sell_value:         6.5
```

**Scoring configuration A** (current production thresholds):
```
Threshold: total_value >= 15
Result:    13.7 < 15 → NO ALERT
```

**Scoring configuration B** (proposed lower thresholds for enhanced surveillance):
```
Threshold: total_value >= 12
Result:    13.7 >= 12 → ALERT (score = 68, severity = MEDIUM)
```

**Scoring configuration C** (graduated scoring with steps):
```
Step 1: total_value >= 10 AND < 15 → score += 40 (low concern)
Step 2: total_value >= 15 AND < 25 → score += 70 (medium concern)
Step 3: total_value >= 25          → score += 95 (high concern)
Result: 13.7 matches Step 1 → score += 40
```

The same `calc_results` row produces three different alert outcomes depending on the scoring configuration. None of these scoring changes require recomputing `large_trading_activity` from raw execution data.

**Architecture implication:** The detection engine pipeline has two distinct phases:

1. **Computation phase** -- reads raw entity data, applies calculation logic at each registered detection level, writes `calc_results`. This is the expensive phase (aggregation, joins, window functions).

2. **Scoring phase** -- reads `calc_results`, applies threshold patterns and score step configurations, produces alert candidates. This is the cheap phase (simple comparisons and arithmetic on pre-computed values).

The separation is enforced by the data model: `calc_results` has no threshold or score columns. Scoring decisions live in the detection model's threshold/score patterns and are applied as a query layer, not baked into the computation.

---

## Cross-References

- `04-match-pattern-architecture.md` -- universal 3-column pattern structure that detection levels use
- `05-calculation-instance-model.md` -- how calculations bind to detection levels for parameterization; Section 3 covers detection level orthogonality to the calculation instance model
- `06-time-window-framework.md` -- time dimension that combines with detection level for alert identity
- `08-resolution-priority-rules.md` -- how multiple matching patterns are ranked when detection level is ambiguous
- `09-unified-results-schema.md` -- how `calc_results` stores data at the detection level grain; `detection_level_id` column definition and indexing
- `10-scoring-pipeline.md` -- separation of computation from scoring; threshold application as a query layer on `calc_results`
- `11-entity-relationship-graph.md` -- full entity graph definition, cardinality rules, and reachability algorithms
- `appendices/A-schema-catalog.md` -- `calc_detection_levels` and `detection_level_universe` table schemas
- `appendices/B-worked-examples.md` -- end-to-end scenarios showing detection level in action with real data
- `appendices/E-per-value-pattern-matching.md` -- Section 4.1 covers detection level worked examples with per-value pattern matching
