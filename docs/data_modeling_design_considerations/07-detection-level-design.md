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

This is a **configuration-time** check, not a runtime check. When a user configures a threshold pattern for a detection model, the system validates:

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
-- Calculations: large_trading_activity (MUST_PASS), wash_qty_match, wash_vwap_proximity
-- Classification: (none -- applies to all)

SELECT
  -- Detection level keys (from detection_level pattern)
  cr.product_id,
  cr.account_id,

  -- Time dimension (from time_window registration)
  cr.business_date,

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
  AND cr_wqm.calc_id = 'wash_qty_match'
  AND cr_wvp.calc_id = 'wash_vwap_proximity'
  AND cr_lta.is_large = TRUE        -- MUST_PASS gate
```

**Generated query for market_price_ramping (changed grain: product only):**

```sql
-- Detection level: product.product_id (no account dimension)
-- Calculations: trend_detection (MUST_PASS), large_trading_activity, same_side_ratio

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
  AND cr_lta.calc_id = 'large_trading_activity'
  AND cr_ssr.calc_id = 'same_side_ratio'
  AND cr_td.trend_type IS NOT NULL   -- MUST_PASS gate
```

Key differences from the current hardcoded approach:

| Aspect | Current (Hardcoded) | Proposed (Generated) |
|--------|--------------------|--------------------|
| GROUP BY columns | Implicit in upstream calc view | Derived from `detection_level` pattern rows |
| JOIN conditions | Written by hand in SQL string | Generated from detection level keys + time window |
| WHERE filters | Written by hand | Derived from classification patterns + MUST_PASS gates |
| Entity context joins | Written by hand (e.g., `INNER JOIN product p`) | Generated from entity graph reachability analysis |
| Grain change | Requires editing the SQL string and upstream calc | Change the detection level pattern rows -- query regenerates |

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

---

## Cross-References

- `04-match-pattern-architecture.md` -- universal 3-column pattern structure that detection levels use
- `05-calculation-instance-model.md` -- how calculations bind to detection levels for parameterization
- `06-time-window-framework.md` -- time dimension that combines with detection level for alert identity
- `08-resolution-priority-rules.md` -- how multiple matching patterns are ranked when detection level is ambiguous
- `09-unified-results-schema.md` -- how `calc_results` stores data at the detection level grain
- `11-entity-relationship-graph.md` -- full entity graph definition, cardinality rules, and reachability algorithms
- `appendices/B-worked-examples.md` -- end-to-end scenarios showing detection level in action with real data
