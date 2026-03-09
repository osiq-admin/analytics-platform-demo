# Match Pattern Architecture

**Document**: 04 of the Data Modeling Design Considerations series
**Audience**: All --- this is the central concept document referenced by every other document in the series
**Last updated**: 2026-03-09

---

## 1. Philosophy

### Match Patterns as the Universal Configuration Primitive

In a trade surveillance platform, the same question arises in dozens of contexts: *which configuration applies to this data?*

- Which threshold should the wash trading model use for FX instruments?
- Which score matrix should insider dealing apply to equity options?
- At what grain should spoofing detection group its results --- by product, by account, or by product+account+venue?
- Which lookback window applies to NYSE-listed equities versus LSE-listed equities?
- Which settings should the business date calculation use for commodity futures?

Traditional surveillance platforms answer each of these questions with a different mechanism. Thresholds live in one table, score mappings in another, detection levels are hardcoded, and time window scoping is buried in SQL. Each mechanism has its own schema, its own resolution logic, and its own configuration UI. Adding a new dimension of variability --- say, varying by trader desk in addition to asset class --- requires schema changes in every subsystem.

**Match patterns replace all of these mechanisms with a single structure.**

A match pattern is not a lookup key that points to separate configuration stored elsewhere. The match pattern *is* the configuration. It is a composable, typed, multi-dimensional filter that expresses: "for data that looks like *this*, apply *that* behavior." The "that" varies by pattern type --- it might be a threshold value, a score step matrix, a detection granularity, a parameter override, or a time window scope --- but the structural primitive is always the same three columns.

This "one structure to express all configuration dimensions" approach means:

- **No schema changes when adding new configuration dimensions.** Want to vary thresholds by trader desk? Add a pattern row. Want to vary scoring by regulatory jurisdiction? Add a pattern row. The table structure never changes.
- **A single resolution engine for all configuration types.** The same algorithm that resolves threshold overrides also resolves score matrix selection, detection level configuration, and time window scoping.
- **Complete auditability.** Every configuration decision traces back to a pattern row with a typed discriminator, an entity, an attribute, and a value. There are no hidden rules, no implicit defaults buried in code, and no configuration that exists only in someone's head.

Everything flows from match patterns: detection levels, classification, thresholds, scores, settings, and time window scoping.

---

## 2. The 3-Column Structure

### Parent Table: `match_patterns`

```
match_patterns
  +-- pattern_id    (PK, varchar)       -- unique identifier for this pattern
  +-- pattern_type  (varchar, NOT NULL)  -- discriminator: what kind of configuration this pattern drives
  +-- description   (text)               -- human-readable explanation
```

### Child Table: `match_pattern_attributes`

```
match_pattern_attributes
  +-- pattern_id       (FK -> match_patterns.pattern_id)
  +-- entity           (varchar, nullable)   -- which entity ("product", "account", "venue", "trader", NULL)
  +-- entity_attribute (varchar, nullable)   -- which attribute ("asset_class", "product_id", "risk_rating", NULL)
  +-- attribute_value  (varchar, nullable)   -- the value to match ("equity", "PRD-001", "HIGH", NULL)
```

### Why 3 Columns?

The three columns --- `entity`, `entity_attribute`, `attribute_value` --- encode a complete dimensional coordinate in the entity graph. Each row says: "on entity X, look at attribute Y, match value Z." This is more powerful than flat key-value pairs for four reasons:

**1. Entity awareness.** A flat key-value pair like `{"asset_class": "equity"}` does not tell you *which entity* owns the `asset_class` attribute. Is it the product entity? The execution entity? A derived table? The 3-column structure makes this explicit: `entity=product, entity_attribute=asset_class, attribute_value=equity`. This matters when attributes with the same name exist on multiple entities (e.g., `status` exists on account, order, and trader).

**2. Composability through row stacking.** Multiple rows with the same `pattern_id` compose as AND logic. A single pattern can express "equity instruments on NYSE traded by high-risk accounts" as three rows, each targeting a different entity. Flat key-value pairs cannot express cross-entity conditions without custom join logic.

**3. NULL semantics for detection levels.** When `attribute_value` is NULL, the row means "group by this attribute" rather than "filter to this value." This dual interpretation --- filter vs. group --- is what allows the same table to serve both classification patterns (filter to equities) and detection level patterns (group by product_id). Flat key-value pairs have no way to express "group by" versus "equals."

**4. Type safety through the discriminator.** The `pattern_type` on the parent table tells the resolution engine how to interpret the attribute rows. A `detection_level` pattern interprets NULL `attribute_value` as a grouping key. A `classification` pattern interprets non-NULL `attribute_value` as a filter predicate. A `threshold` pattern uses the attribute rows as context for looking up a threshold value. The structure is the same; the semantics vary by type.

### Relationship Diagram

```
+--------------------+          +-------------------------------+
| match_patterns     |          | match_pattern_attributes      |
+--------------------+          +-------------------------------+
| pattern_id    (PK) |----<>----| pattern_id    (FK)            |
| pattern_type       |          | entity                        |
| description        |          | entity_attribute              |
+--------------------+          | attribute_value               |
                                +-------------------------------+
                                    |
                                    | 0..N rows per pattern
                                    | Multiple rows = AND logic
```

---

## 3. Pattern Types

The `pattern_type` discriminator on `match_patterns` determines how the engine interprets the attribute rows. Six types are defined:

| Type | Purpose | `attribute_value` Semantics |
|---|---|---|
| `detection_level` | Defines the grain at which alerts are generated | NULL --- the attribute IS the grouping key |
| `classification` | Filters the data subset a model or calc operates on | Domain value to match (AND logic within pattern) |
| `threshold` | Resolves pass/fail limits for a calculation | Domain value context for threshold lookup |
| `score` | Resolves the scoring step matrix for a calculation | Domain value context for score matrix selection |
| `setting` | Resolves calculation parameters (cutoffs, multipliers) | Domain value context for parameter lookup |
| `time_window` | Scopes which time window computation applies | Domain value context for window type selection |

### 3.1 Detection Level Patterns

Detection level patterns define the *grain* at which a detection model groups its results and generates alerts. The `attribute_value` is always NULL because the attribute is not a filter --- it is a grouping dimension.

**Example**: Wash trading groups alerts by product + account.

```
match_patterns:
  pattern_id:   wash_full_day_level
  pattern_type: detection_level
  description:  "Wash trading alert grain: per product per account"

match_pattern_attributes:
  pattern_id          | entity   | entity_attribute | attribute_value
  --------------------|----------|------------------|----------------
  wash_full_day_level | product  | product_id       | NULL
  wash_full_day_level | account  | account_id       | NULL
```

The engine reads this as: "GROUP BY product.product_id, account.account_id" --- each unique combination produces a separate alert candidate.

### 3.2 Classification Patterns

Classification patterns filter the data that a model or calculation operates on. They answer: "which subset of the universe does this configuration apply to?"

**Example**: A pattern that selects only equity instruments.

```
match_patterns:
  pattern_id:   equity_classification
  pattern_type: classification
  description:  "All equity instruments"

match_pattern_attributes:
  pattern_id              | entity  | entity_attribute | attribute_value
  ------------------------|---------|------------------|----------------
  equity_classification   | product | asset_class      | equity
```

The engine reads this as: `WHERE product.asset_class = 'equity'`.

### 3.3 Threshold Patterns

Threshold patterns provide dimensional context for resolving a pass/fail limit. When a calculation needs to know "what is the large activity multiplier for this data?", the threshold pattern tells the engine which attributes to evaluate to find the right override.

**Example**: The large activity multiplier varies by asset class.

```
match_patterns:
  pattern_id:   large_activity_equity_threshold
  pattern_type: threshold
  description:  "Large activity threshold context for equities"

match_pattern_attributes:
  pattern_id                       | entity  | entity_attribute | attribute_value
  ---------------------------------|---------|------------------|----------------
  large_activity_equity_threshold  | product | asset_class      | equity
```

When the engine encounters this pattern during resolution, it looks up the `large_activity_multiplier` setting with context `{product.asset_class: "equity"}` and resolves to value `2.5` (versus the default `2.0`).

### 3.4 Score Patterns

Score patterns determine which graduated scoring step matrix to apply to a calculation's output value. Different market segments may have different score step boundaries.

**Example**: Large activity score steps for equities use higher notional thresholds.

```
match_patterns:
  pattern_id:   large_activity_equity_score
  pattern_type: score
  description:  "Equity-specific score step matrix for large activity"

match_pattern_attributes:
  pattern_id                    | entity  | entity_attribute | attribute_value
  ------------------------------|---------|------------------|----------------
  large_activity_equity_score   | product | asset_class      | equity
```

This pattern resolves to the equity-specific score steps:
```
[0, 25000) -> 0 points
[25000, 100000) -> 3 points
[100000, 500000) -> 7 points
[500000, infinity) -> 10 points
```
Instead of the default:
```
[0, 10000) -> 0 points
[10000, 100000) -> 3 points
[100000, 500000) -> 7 points
[500000, infinity) -> 10 points
```

### 3.5 Setting Patterns

Setting patterns resolve calculation parameters --- values like cutoff times, lookback periods, and sensitivity multipliers --- to the correct override for the current data context.

**Example**: Business date cutoff varies by exchange.

```
match_patterns:
  pattern_id:   cutoff_nyse
  pattern_type: setting
  description:  "Business date cutoff for NYSE"

match_pattern_attributes:
  pattern_id   | entity  | entity_attribute | attribute_value
  -------------|---------|------------------|----------------
  cutoff_nyse  | product | exchange_mic     | XNYS
```

This resolves the `business_date_cutoff` setting to `"21:00"` for NYSE-listed products (versus the default `"17:00"`).

### 3.6 Time Window Patterns

Time window patterns scope which time window computation applies to a given data subset. They answer: "should this data be analyzed in a full-day window, a trend window, a market event window, or a cancellation pattern window?"

**Example**: A time window pattern that selects the market event window for equity products.

```
match_patterns:
  pattern_id:   equity_market_event_window
  pattern_type: time_window
  description:  "Equity products use market event windows for insider dealing"

match_pattern_attributes:
  pattern_id                  | entity  | entity_attribute | attribute_value
  ----------------------------|---------|------------------|----------------
  equity_market_event_window  | product | asset_class      | equity
```

---

## 4. Stacking --- Multiple Attributes Per Pattern

The most powerful feature of the 3-column design is **stacking**: multiple rows with the same `pattern_id` compose as AND logic, creating multi-dimensional match criteria.

### How Stacking Works

Each row in `match_pattern_attributes` is an independent predicate. When multiple rows share the same `pattern_id`, they are evaluated together as a conjunction (AND). The pattern matches only when ALL attribute predicates are satisfied simultaneously.

### Example: 3-Attribute Stack

A threshold pattern that targets high-risk US accounts trading equity instruments:

```
match_patterns:
  pattern_id:   equity_us_high_risk
  pattern_type: threshold
  description:  "Equity instruments traded by high-risk US accounts"

match_pattern_attributes:
  pattern_id          | entity  | entity_attribute      | attribute_value
  --------------------|---------|----------------------|----------------
  equity_us_high_risk | product | asset_class           | equity
  equity_us_high_risk | account | registration_country  | US
  equity_us_high_risk | account | risk_rating           | HIGH
```

The engine reads this as:
```
WHERE product.asset_class = 'equity'
  AND account.registration_country = 'US'
  AND account.risk_rating = 'HIGH'
```

### Any Entity Attribute Can Participate

Because the 3-column structure names the entity and attribute explicitly, any attribute with domain values from any entity in the data model can participate in a match pattern. The current platform has 8 entities with dozens of attributes that have defined domain values:

| Entity | Matchable Attributes | Domain Values |
|---|---|---|
| product | `asset_class` | equity, fx, commodity, index, fixed_income |
| product | `instrument_type` | common_stock, call_option, put_option, future, spot |
| product | `exchange_mic` | XNYS, XNAS, XLON, XCME, XHKG, XCBF |
| product | `currency` | USD, GBP, EUR, JPY, CHF, HKD, AUD, CAD |
| product | `regulatory_scope` | EU, US, UK, APAC, MULTI |
| account | `account_type` | institutional, retail, hedge_fund, market_maker |
| account | `risk_rating` | LOW, MEDIUM, HIGH |
| account | `mifid_client_category` | retail, professional, eligible_counterparty |
| trader | `desk` | Equity Flow, Derivatives, FX Spot, Commodities |
| trader | `trader_type` | execution, portfolio, algorithmic |
| venue | `country` | US, GB, HK |
| execution | `side` | BUY, SELL |
| execution | `exec_type` | FILL, PARTIAL_FILL |
| execution | `capacity` | AGENCY, PRINCIPAL |
| order | `order_type` | MARKET, LIMIT |
| order | `time_in_force` | DAY, GTC, IOC, FOK |
| order | `status` | NEW, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED |

Any combination of these can be stacked into a single pattern. Want to create a threshold that applies only to LIMIT orders for FX spot instruments placed by algorithmic traders on the FX Spot desk? That is four rows with the same `pattern_id`:

```
match_pattern_attributes:
  pattern_id   | entity  | entity_attribute | attribute_value
  -------------|---------|------------------|----------------
  fx_algo_limit| product | asset_class      | fx
  fx_algo_limit| product | instrument_type  | spot
  fx_algo_limit| order   | order_type       | LIMIT
  fx_algo_limit| trader  | trader_type      | algorithmic
```

### Replacing the Current Flat Match Objects

The current platform uses flat JSON match objects in settings overrides:

```json
{"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012, "priority": 2}
```

This flat structure has several limitations:
- It does not record which entity owns each attribute
- It cannot express cross-entity conditions (e.g., product + account)
- Priority must be manually assigned
- There is no shared vocabulary --- each setting defines its own match keys

The 3-column match pattern replaces this with:

```
match_pattern_attributes:
  pattern_id | entity  | entity_attribute | attribute_value
  -----------|---------|------------------|----------------
  pat_001    | product | asset_class      | equity
  pat_001    | product | exchange_mic     | XNYS
```

The priority is computed automatically from the number and specificity of the attribute rows (see document 08, Resolution Priority Rules).

---

## 5. Multiple Patterns Per Calculation/Model

A single calculation or detection model often needs different *kinds* of match pattern configuration simultaneously. A wash trading calculation might need:
- A **setting** pattern to resolve its VWAP threshold parameter
- A **score** pattern to select the right scoring step matrix
- A **threshold** pattern to determine its pass/fail boundary

These are different pattern types serving different roles, all bound to the same calculation.

### The `calc_pattern_bindings` Table

```
calc_pattern_bindings
  +-- binding_id    (PK, varchar)
  +-- calc_id       (FK -> calculations.calc_id)     -- which calculation
  +-- pattern_id    (FK -> match_patterns.pattern_id) -- which pattern
  +-- binding_type  (varchar)                          -- role: "setting", "threshold", "score"
  +-- setting_id    (FK -> settings.setting_id, nullable) -- for setting/threshold: which setting
  +-- priority      (integer, default 0)               -- tie-breaking when multiple patterns match
```

### Calculation Bindings

A calculation can have separate patterns for each role:

```
calc_pattern_bindings:
  binding_id | calc_id              | pattern_id                      | binding_type | setting_id
  -----------|----------------------|---------------------------------|-------------|-------------------
  b_001      | wash_detection       | equity_wash_setting             | setting      | wash_vwap_threshold
  b_002      | wash_detection       | equity_wash_score               | score        | vwap_proximity_score_steps
  b_003      | large_trading_activity| equity_large_activity_threshold | threshold    | large_activity_multiplier
  b_004      | large_trading_activity| equity_large_activity_score     | score        | large_activity_score_steps
```

### Model Bindings

Detection models have their own pattern bindings for detection level and classification:

```
model_pattern_bindings
  +-- binding_id    (PK, varchar)
  +-- model_id      (FK -> detection_models.model_id)
  +-- pattern_id    (FK -> match_patterns.pattern_id)
  +-- binding_type  (varchar)    -- "detection_level", "classification", "threshold"
  +-- setting_id    (FK, nullable)
```

```
model_pattern_bindings:
  binding_id | model_id       | pattern_id              | binding_type    | setting_id
  -----------|----------------|-------------------------|-----------------|-------------------
  mb_001     | wash_full_day  | wash_full_day_level     | detection_level | NULL
  mb_002     | wash_full_day  | NULL                    | classification  | NULL
  mb_003     | wash_full_day  | wash_score_pattern      | threshold       | wash_score_threshold
```

Note: a NULL `pattern_id` for classification means "all data --- no filter" (universal applicability).

---

## 6. Complete Examples

The following examples use real entity and model data from the platform.

### 6.1 Wash Trading --- Full Day

The `wash_full_day` model detects accounts that buy and sell the same product at similar prices and quantities within a single business day. Current platform data: 5 detection models, 82 alerts, wash trading accounts for ~17% of alerts.

**Detection level pattern** --- alerts are generated per product per account:

```
match_patterns:
  pattern_id:   wash_full_day_level
  pattern_type: detection_level

match_pattern_attributes:
  pattern_id          | entity  | entity_attribute | attribute_value
  --------------------|---------|------------------|----------------
  wash_full_day_level | product | product_id       | NULL
  wash_full_day_level | account | account_id       | NULL
```

Interpretation: GROUP BY `product.product_id`, `account.account_id`. Each unique (product, account) pair on each business date is evaluated independently.

**Classification pattern** --- none. Wash trading applies to all products regardless of asset class. The model binding has `pattern_id = NULL` for the classification role.

**Setting patterns** --- the wash VWAP threshold varies by asset class and can be overridden per exchange or per product:

Default pattern (all products):
```
match_patterns:
  pattern_id:   wash_vwap_default
  pattern_type: setting

match_pattern_attributes:
  (no rows -- empty pattern = match everything = default)
```
Resolves `wash_vwap_threshold` to `0.02`.

Equity pattern:
```
match_patterns:
  pattern_id:   wash_vwap_equity
  pattern_type: setting

match_pattern_attributes:
  pattern_id        | entity  | entity_attribute | attribute_value
  ------------------|---------|------------------|----------------
  wash_vwap_equity  | product | asset_class      | equity
```
Resolves `wash_vwap_threshold` to `0.015`. More specific than default (1 attribute vs 0).

Equity on NYSE pattern (2 attributes --- wins over single-attribute equity pattern):
```
match_patterns:
  pattern_id:   wash_vwap_equity_nyse
  pattern_type: setting

match_pattern_attributes:
  pattern_id             | entity  | entity_attribute | attribute_value
  -----------------------|---------|------------------|----------------
  wash_vwap_equity_nyse  | product | asset_class      | equity
  wash_vwap_equity_nyse  | product | exchange_mic     | XNYS
```
Resolves `wash_vwap_threshold` to `0.012`. Two attributes = higher specificity.

**Score patterns** --- the quantity match and VWAP proximity score step matrices:

```
match_patterns:
  pattern_id:   wash_qty_score_default
  pattern_type: score

match_pattern_attributes:
  (no rows -- default score steps for all products)
```
Resolves `quantity_match_score_steps` to:
```
[0, 0.50) -> 0    [0.50, 0.80) -> 3    [0.80, 0.95) -> 7    [0.95, 1.00] -> 10
```

```
match_patterns:
  pattern_id:   wash_vwap_score_default
  pattern_type: score

match_pattern_attributes:
  (no rows -- default score steps for all products)
```
Resolves `vwap_proximity_score_steps` to:
```
[0, 0.005) -> 10    [0.005, 0.01) -> 7    [0.01, 0.02) -> 3    [0.02, inf) -> 0
```
Note the inverted scale: closer to VWAP (lower proximity) = higher suspicion score.

**Threshold pattern** --- the overall model score threshold for generating an alert:

Default: `wash_score_threshold` = `10`
Equity override: `wash_score_threshold` = `8` (lower threshold for equities --- more sensitive)
FX override: `wash_score_threshold` = `12` (higher threshold for FX --- higher baseline noise)

### 6.2 Spoofing / Layering

The `spoofing_layering` model detects accounts that place multiple orders on one side (subsequently cancelled) while executing on the opposite side.

**Detection level pattern** --- alerts are generated per product per account:

```
match_patterns:
  pattern_id:   spoofing_level
  pattern_type: detection_level

match_pattern_attributes:
  pattern_id     | entity  | entity_attribute | attribute_value
  ---------------|---------|------------------|----------------
  spoofing_level | product | product_id       | NULL
  spoofing_level | account | account_id       | NULL
```

Note how the venue entity is *reachable* from the detection level even though it is not in the grouping key. Executions have a `venue_mic` foreign key to venue, so any venue attribute can participate in threshold/score/setting patterns without being in the detection level itself:

```
match_patterns:
  pattern_id:   spoofing_cancel_nyse
  pattern_type: setting

match_pattern_attributes:
  pattern_id           | entity  | entity_attribute | attribute_value
  ---------------------|---------|------------------|----------------
  spoofing_cancel_nyse | venue   | mic              | XNYS
```

This resolves `cancel_count_threshold` to a venue-specific value for XNYS without venue being part of the alert grouping. The engine walks `execution.venue_mic -> venue.mic` to reach the venue entity.

**Classification pattern** --- none. Spoofing detection applies to all products.

**Setting patterns** --- cancel count threshold varies by asset class and instrument type:

```
Default:                cancel_count_threshold = 5
asset_class=equity:     cancel_count_threshold = 3   (equities cancel more frequently)
instrument_type=call_option: cancel_count_threshold = 8   (options have different patterns)
instrument_type=put_option:  cancel_count_threshold = 8
asset_class=fixed_income:    cancel_count_threshold = 5
```

### 6.3 Insider Dealing

The `insider_dealing` model detects accounts that traded in related products before a significant market event (price surge, drop, or volume spike).

**Detection level pattern** --- alerts are generated per account only:

```
match_patterns:
  pattern_id:   insider_level
  pattern_type: detection_level

match_pattern_attributes:
  pattern_id    | entity  | entity_attribute | attribute_value
  --------------|---------|------------------|----------------
  insider_level | account | account_id       | NULL
```

Single-entity detection level. The alert is at the account grain: "did this account trade suspiciously before a market event?"

**Entity reachability from account**: Product attributes are reachable from account via the execution entity. The entity graph path is:

```
account ---(1:N)---> execution ---(N:1)---> product
```

So even though the detection level is per-account, product attributes like `asset_class` and `instrument_type` can still participate in setting/threshold/score patterns. When the engine resolves settings for an insider dealing alert candidate, it can use the product context of the executions involved.

**Setting patterns** --- lookback days vary by asset class:

```
Default:                    insider_lookback_days = 30
asset_class=equity:         insider_lookback_days = 20
instrument_type=call_option: insider_lookback_days = 10
instrument_type=put_option:  insider_lookback_days = 10
asset_class=fixed_income:    insider_lookback_days = 14
```

### 6.4 Market Price Ramping

The `market_price_ramping` model detects accounts that trade aggressively in the same direction as a detected price trend, potentially contributing to or exploiting the trend.

**Detection level pattern** --- alerts are generated per product per account:

```
match_patterns:
  pattern_id:   mpr_level
  pattern_type: detection_level

match_pattern_attributes:
  pattern_id | entity  | entity_attribute | attribute_value
  -----------|---------|------------------|----------------
  mpr_level  | product | product_id       | NULL
  mpr_level  | account | account_id       | NULL
```

**Setting patterns** --- trend sensitivity varies by asset class:

```
Default:                 trend_sensitivity = 3.5
asset_class=equity:      trend_sensitivity = 2.5
asset_class=fx:          trend_sensitivity = 2.0
asset_class=fixed_income: trend_sensitivity = 1.2  (detect subtle rate movements)
asset_class=index:       trend_sensitivity = 1.3
```

**Score threshold** --- the MPR score threshold to generate an alert:

```
Default:                 mpr_score_threshold = 18
asset_class=equity:      mpr_score_threshold = 16
asset_class=commodity:   mpr_score_threshold = 14
asset_class=fixed_income: mpr_score_threshold = 7   (price movements more significant)
asset_class=index:       mpr_score_threshold = 6
```

The wide range (6--18) across asset classes demonstrates why match-pattern-driven configuration matters: a single hardcoded threshold would either flood compliance analysts with FX false positives or miss significant fixed income manipulations.

### 6.5 Single-Entity Detection Level (Simplified Case)

Some detection models need only a single entity in their detection level. Market price ramping could alternatively be configured to alert per-product only (ignoring the account dimension), which simplifies the model to flag any product undergoing potential manipulation regardless of which accounts are involved.

```
match_patterns:
  pattern_id:   mpr_product_only_level
  pattern_type: detection_level

match_pattern_attributes:
  pattern_id            | entity  | entity_attribute | attribute_value
  ----------------------|---------|------------------|----------------
  mpr_product_only_level| product | product_id       | NULL
```

One row. The engine groups results by `product.product_id` only. This is the simplest possible detection level --- every alert is about one product, across all accounts.

### 6.6 Custom Client Example --- No Schema Changes

A new client trades crypto assets. They want:
- A new asset class: `crypto`
- Detection at the product + trader grain (not account)
- Higher cancel count thresholds (crypto markets have different order patterns)
- Custom score steps for volume (crypto notional values differ from equities)

**Step 1**: Add `crypto` to the product entity's `asset_class` domain values (metadata change, not schema change).

**Step 2**: Define a detection level pattern:
```
match_pattern_attributes:
  pattern_id         | entity  | entity_attribute | attribute_value
  -------------------|---------|------------------|----------------
  crypto_spoof_level | product | product_id       | NULL
  crypto_spoof_level | trader  | trader_id        | NULL
```

**Step 3**: Define setting/threshold patterns:
```
match_pattern_attributes:
  pattern_id          | entity  | entity_attribute | attribute_value
  --------------------|---------|------------------|----------------
  crypto_cancel_thresh| product | asset_class      | crypto
```
Binds to `cancel_count_threshold` with value `15` (crypto markets cancel far more frequently).

**Step 4**: Define score patterns:
```
match_pattern_attributes:
  pattern_id       | entity  | entity_attribute | attribute_value
  -----------------|---------|------------------|----------------
  crypto_vol_score | product | asset_class      | crypto
```
Binds to custom score steps:
```
[0, 500000) -> 0    [500000, 5000000) -> 3    [5000000, 50000000) -> 7    [50000000, inf) -> 10
```

**No table was created. No column was added. No code was changed.** The new asset class, new detection level, new thresholds, and new score steps are all expressed as new rows in the existing `match_patterns` and `match_pattern_attributes` tables plus new bindings in `calc_pattern_bindings`.

---

## 7. Entity Key as Match Value

A special case of the 3-column structure occurs when:
- `entity_attribute` = the entity's primary key field (e.g., `product_id`)
- `attribute_value` = a specific entity instance ID (e.g., `AAPL`)

This creates an **entity-level override** --- configuration that applies to one specific entity instance rather than a category of entities.

### Example: Product-Specific Threshold Override

The VWAP wash threshold for Apple stock (product_id = `AAPL`) needs to be tighter than the general equity threshold because AAPL is extremely liquid:

```
match_patterns:
  pattern_id:   wash_vwap_aapl
  pattern_type: setting

match_pattern_attributes:
  pattern_id      | entity  | entity_attribute | attribute_value
  ----------------|---------|------------------|----------------
  wash_vwap_aapl  | product | product_id       | AAPL
```

Resolves `wash_vwap_threshold` to `0.01` for AAPL specifically.

### Automatic Priority

Entity key overrides receive the **highest resolution priority** automatically. The resolution engine (described in document 08) computes priority based on attribute specificity. Matching on the primary key is the most specific possible match --- it identifies exactly one entity instance --- so it always wins over category-level matches.

The resolution cascade for AAPL wash VWAP threshold:

```
Priority (computed)     Pattern                     Resolves to
--------------------    -------------------------   -----------
Highest (entity key)    product_id = AAPL           0.01        <-- WINS
High (2 attributes)     asset_class=equity AND      0.012
                        exchange_mic=XNYS
Medium (1 attribute)    asset_class=equity           0.015
Lowest (0 attributes)   (default -- no pattern)      0.02
```

### When to Use Entity Key Overrides

- **Product-specific tuning**: Apple, Tesla, and other high-volume stocks may need custom thresholds
- **Account-specific monitoring**: A specific account under investigation may need lower alert thresholds
- **Trader-specific rules**: A trader with a history of violations may need heightened surveillance
- **Venue-specific configuration**: A specific exchange (e.g., `XHKG`) may require different business hours

### Example: Account Under Investigation

An account flagged for suspicious activity needs enhanced monitoring with lower thresholds:

```
match_pattern_attributes:
  pattern_id          | entity  | entity_attribute | attribute_value
  --------------------|---------|------------------|----------------
  acct_investigation  | account | account_id       | ACC-00042
```

All detection models that use account-level settings will automatically apply tighter configuration for `ACC-00042` without changing any model logic.

---

## 8. Why This Design

### Comparison with Alternatives

#### Alternative 1: Flat Key-Value Pairs

```json
{"asset_class": "equity", "exchange_mic": "XNYS", "value": 0.012}
```

**Strengths**: Simple, familiar, easy to read.

**Weaknesses**:
- No entity awareness: which entity owns `exchange_mic`? If both product and venue have a MIC attribute, ambiguity arises.
- Cannot express cross-entity conditions without custom logic.
- Priority must be manually assigned (the current platform uses explicit `priority` integers).
- No type discrimination: a threshold override and a score override look identical structurally.
- Each setting re-invents its own match format.

#### Alternative 2: JSON Blob Column

```json
{
  "conditions": {
    "product.asset_class": "equity",
    "product.exchange_mic": "XNYS"
  },
  "value": 0.012,
  "type": "threshold"
}
```

**Strengths**: Flexible, can encode any structure.

**Weaknesses**:
- Not queryable by standard SQL without JSON functions (DuckDB supports them, but at a performance cost).
- No referential integrity: the column values are opaque strings, not validated against entity metadata.
- Cannot be indexed efficiently for resolution queries.
- Audit queries become string-parsing exercises.
- Schema evolution is invisible --- a renamed attribute silently breaks matching.

#### Alternative 3: Per-Type Tables

Separate tables for each configuration concern:

```
threshold_overrides(threshold_id, asset_class, exchange_mic, value)
score_overrides(score_id, asset_class, instrument_type, matrix_ref)
detection_levels(model_id, dimension_1_entity, dimension_1_field, ...)
setting_overrides(setting_id, asset_class, risk_rating, value)
```

**Strengths**: Type-specific schemas, clear purpose per table.

**Weaknesses**:
- Schema changes required for every new matching dimension (e.g., adding `risk_rating` to threshold_overrides requires an ALTER TABLE).
- N tables means N resolution engines, N configuration UIs, N audit queries.
- Cross-type analysis ("show me all configuration that mentions XNYS") requires querying every table.
- Adding a new entity attribute to matching requires schema changes across multiple tables.

### Advantages of the 3-Column Match Pattern Design

| Advantage | Explanation |
|---|---|
| **Composability** | Any entity attribute can participate in any pattern type. New dimensions require zero schema changes. |
| **Type safety** | The `pattern_type` discriminator ensures the engine interprets attribute rows correctly for each use case. |
| **Reusability** | The same pattern can be referenced by multiple calculations or models via bindings. A "commodity instruments" pattern is defined once and reused everywhere. |
| **Auditability** | Every configuration decision traces back to explicit pattern rows. "Why did this alert fire with threshold X?" is answered by querying `match_pattern_attributes` and `calc_pattern_bindings`. |
| **Resolution uniformity** | One algorithm resolves all configuration types. The resolution engine in document 08 works identically for thresholds, scores, settings, and time windows. |
| **Schema stability** | The `match_patterns` and `match_pattern_attributes` tables never need ALTER TABLE, regardless of how many entity attributes, asset classes, or configuration dimensions are added. |
| **Cross-entity matching** | Stacking rows from different entities enables conditions like "equity instruments traded by high-risk accounts" --- something flat key-value pairs cannot express. |
| **Automatic priority** | Priority is computed from the number and specificity of attribute rows, eliminating manual priority assignment and the bugs it introduces. |

### Acknowledged Disadvantages

| Disadvantage | Mitigation |
|---|---|
| **More complex than flat match** | The configuration UX (document 15) provides a guided wizard that abstracts the 3-column structure. Users pick entities and attributes from dropdowns; the system writes the pattern rows. |
| **Requires tooling for configuration** | The platform includes a configuration UI, not just raw JSON files. Without the UI, hand-authoring match pattern rows is error-prone. |
| **Indirection overhead** | Resolving a setting requires joining `match_patterns` -> `match_pattern_attributes` -> `calc_pattern_bindings` -> settings. This is mitigated by materialization (document 17) and caching. |
| **Learning curve** | The 3-column model requires understanding entity-attribute-value semantics. This document and the glossary (document 18) serve as the primary teaching tools. |

### Summary

The 3-column match pattern design is a deliberate trade-off: it accepts structural complexity in exchange for configuration extensibility. In a domain where regulatory requirements change frequently, new asset classes emerge regularly, and clients need per-entity tuning, the ability to express all configuration as rows in two tables --- without schema changes --- is a decisive architectural advantage.

---

## Cross-References

| Document | Relationship to This Document |
|---|---|
| 02 Current State | Shows the flat JSON match objects this design replaces |
| 03 Gap Analysis | Maps gaps between current flat matches and the proposed 3-column design |
| 05 Calculation Instance Model | Uses match patterns to bind calcs to parameterized instances |
| 06 Time Window Framework | Time window patterns are a pattern_type in this system |
| 07 Detection Level Design | Detection levels are a pattern_type in this system |
| 08 Resolution Priority Rules | Defines how attribute count and specificity determine override priority |
| 09 Unified Results Schema | Results reference the pattern_id that drove their configuration |
| 10 Scoring and Alerting | Score patterns drive score step matrix selection |
| 11 Entity Relationship Graph | Entity reachability determines which attributes can participate in patterns |
| 12 Settings Resolution | Setting patterns drive parameter resolution (replaces current JSON overrides) |
| 15 UX Configuration Experience | Wizard-based pattern authoring abstracts the 3-column model for end users |
| 16 Lifecycle and Governance | Pattern versioning, audit trail, change management |
| Appendix A | Full DDL for `match_patterns`, `match_pattern_attributes`, `calc_pattern_bindings` |
| Appendix B | End-to-end worked examples with actual data |
| Appendix C | Mapping from current JSON match objects to proposed pattern rows |
