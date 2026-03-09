# 18 --- Glossary

> Canonical definitions of all terms used across the Data Modeling Design Considerations documentation suite.

**Audience**: All

---

## A

**Accumulated Score**
Sum of all OPTIONAL calculation scores for a detection candidate. When the accumulated score meets or exceeds the score threshold, the detection model fires a score-based alert.

**Alert Trace**
Complete audit trail linking an alert back through every layer: alert -> scores -> calculations -> settings -> raw data. Provides full explainability for regulatory review.

**Attribute Value**
The specific domain value to match in a match pattern attribute row. Examples: `"equity"` for asset_class, `"XNYS"` for venue MIC, `"HIGH"` for risk_rating. A NULL attribute value in a detection level pattern indicates a grouping key rather than a filter.

## B

**Business Date Window**
Time window defining the trading day boundary using exchange-specific cutoff times. Accounts for pre-market and after-hours sessions that may span calendar dates.

## C

**Calculation DAG**
Directed acyclic graph of calculation dependencies. Calculations are executed in topological order so that every dependency has already produced its output before a dependent calculation runs.

**Calculation Definition**
Metadata specification of a computation: SQL logic, parameters, layer assignment, upstream dependencies, and output schema. Definitions are reusable across detection models.

**Calculation Instance**
A specific (calculation definition x match pattern x resolved parameters) tuple ready for execution. The cross-product of what to compute, where to apply it, and with what configuration.

**Calculation Layer**
One of four DAG tiers that organize calculations by their data requirements: Transaction (raw event access) -> Time Window (bounded time periods) -> Aggregation (grouped summaries) -> Derived (computed from other calculations).

**Cardinality**
Relationship multiplicity between entities: `one_to_one`, `one_to_many`, `many_to_one`, `many_to_many`. Determines how attribute values are collapsed when resolving across entity graph traversals.

**Classification Pattern**
Match pattern of type `classification` that filters data to a subset before calculation. For example, a classification pattern with `product.asset_class = "equity"` restricts processing to equity instruments only.

**Collapse Strategy**
How to resolve attribute values when traversing a one-to-many relationship in the entity graph. Strategies include: `dominant` (most frequent value), `any` (first match), `all` (require unanimous), and `aggregate` (collect all values).

**Complex Time Window**
Time window requiring on-the-fly pattern detection rather than precomputation. Examples include cancellation burst windows (triggered by event sequences) and trend reversal windows (triggered by price pattern changes).

**Context Fields**
Entity attributes included in detection query results to provide additional context for entity resolution. These fields are carried through for enrichment and display but do not participate in scoring.

## D

**Default (Resolution)**
A zero-attribute match pattern serving as the lowest-priority fallback in resolution. Applied only when no more-specific match pattern matches the current entity context.

**Detection Grain**
See: Detection Level.

**Detection Level**
The entity key combination defining alert granularity. For example, `product x account` generates one alert per unique product-account pair, while `product` alone generates one alert per product regardless of account.

**Detection Level Pattern**
Match pattern of type `detection_level` with NULL attribute_values that declare grouping keys. The entity attributes listed become the dimensions along which alerts are aggregated.

**Detection Model**
Metadata definition combining calculations, scoring rules, and thresholds for detecting a specific market abuse type (e.g., wash trading, market manipulation, insider trading, spoofing).

**Domain Value**
An enumerated valid value for an entity attribute. Examples: `asset_class` has domain values `equity`, `fx`, `fixed_income`, `commodity`; `risk_rating` has domain values `HIGH`, `MEDIUM`, `LOW`.

## E

**EAV Pattern**
Entity-Attribute-Value storage pattern used in the unified results table. Allows flexible storage of heterogeneous calculation outputs without requiring schema changes for each new calculation type.

**Entity**
A first-class data object in the platform. The eight entities are: product, execution, order, md_eod, md_intraday, venue, account, and trader.

**Entity Attribute**
A field or column on an entity. Examples: `product.asset_class`, `account.risk_rating`, `order.order_type`, `trader.desk`.

**Entity Graph**
The network of relationships between the eight entities, with cardinality and join fields defined for each connection. Used for reachability analysis and attribute resolution.

**Entity Key**
The primary identifier for an entity instance. Examples: `product_id`, `account_id`, `order_id`, `trader_id`.

**Entity Key Override**
A match pattern where the entity_attribute is the entity's primary key and the attribute_value is a specific ID (e.g., `product.product_id = "PROD-042"`). This is the highest-priority resolution level in the granularity pyramid.

## G

**Gate Calculation**
A MUST_PASS calculation that acts as a boolean prerequisite for alert generation. If a gate calculation fails (returns false or below threshold), no alert is produced regardless of accumulated score.

**Granularity Pyramid**
The resolution priority hierarchy, from most specific to least: entity key override (highest) -> multi-attribute match -> single-attribute match -> default (lowest). More-specific patterns always win.

## M

**Match Pattern**
Universal configuration primitive: a named, typed set of (entity, attribute, value) rows. Match patterns drive detection levels, classification, thresholds, scores, settings, and time window scoping through a single reusable abstraction.

**Match Pattern Attribute**
A single row in a match pattern, consisting of: (pattern_id, entity, entity_attribute, attribute_value). Multiple attribute rows on the same pattern_id create AND logic via pattern stacking.

**Medallion Architecture**
Tiered data organization defining progressive data refinement stages: Landing (raw ingestion) -> Bronze (validated, typed) -> Silver (cleansed, conformed) -> Gold (business-ready, aggregated) -> Platinum (curated analytics) -> Sandbox (experimental) -> Archive (retention).

**MUST_PASS**
Calculation strictness level indicating a gate. The calculation must pass (return true or meet its threshold) for any alert to fire from the detection model. Contrast with OPTIONAL.

## O

**OPTIONAL**
Calculation strictness level indicating a scored contribution. The calculation's output is mapped through score steps to produce points that accumulate toward the score threshold. Does not gate alert generation. Contrast with MUST_PASS.

**Override**
A setting value that applies when its match criteria (match pattern) are satisfied. Overrides replace the default value with a context-specific value when the entity context matches the override's pattern.

## P

**Parameter Placeholder**
`$param_name` syntax in calculation SQL that is resolved at execution time using the settings resolver. Allows the same calculation definition to operate with different thresholds, windows, or limits depending on entity context.

**Pattern Stacking**
Multiple attribute rows sharing the same pattern_id, creating AND logic. A stacked pattern matches only when all of its attribute rows match simultaneously (e.g., `asset_class = "equity" AND risk_rating = "HIGH"`).

**Pattern Type**
Discriminator on match patterns that determines how the pattern is used. Types are: `detection_level`, `classification`, `threshold`, `score`, `setting`, and `time_window`.

## R

**Reachability**
Whether an entity attribute can be accessed from another entity via relationship graph traversal. For example, `trader.desk` is reachable from `execution` through `execution -> order -> trader`. Reachability analysis considers cardinality and collapse strategies.

**Resolution Priority**
Automatic priority ranking based on match specificity. No manual priority numbers are assigned; instead, the system infers priority from the number and type of matched attributes using the granularity pyramid.

**Resolution Strategy**
Pluggable algorithm for settings resolution. Current strategies include `HierarchyStrategy` (cascading specificity within a single dimension) and `MultiDimensionalStrategy` (cross-product of multiple entity attributes).

## S

**Score Matrix**
Context-specific set of score steps for a given calculation and match pattern combination. Different matrices can apply to different contexts (e.g., an equity score matrix with different thresholds than an FX score matrix).

**Score Step**
A range definition consisting of (min_value, max_value, score) that maps a calculation output value to a discrete score. Steps are evaluated in order; the first matching range determines the score contribution.

**Score Template**
Reusable pre-built score step configuration that can be referenced by name rather than redefined. Examples: `volume_standard`, `ratio_graduated`, `binary_pass_fail`.

**Score Threshold**
Minimum accumulated score required to fire a score-based alert. When the sum of all OPTIONAL calculation scores meets or exceeds this threshold, the detection model generates an alert.

**Scored Calculation**
An OPTIONAL calculation that contributes points to the accumulated score. Its raw output is mapped through score steps to produce a numeric score value.

**Settings Resolver**
Engine component that finds the best-matching override for a setting given the current entity context. Evaluates all applicable match patterns, ranks by resolution priority, and returns the most specific match.

**Simple Time Window**
Time window that can be precomputed in batch because its boundaries are deterministic. Examples: business date windows, fixed calendar intervals (T-5, T-20), and rolling periods.

**Sparse Columns**
Nullable dimension columns on the calc_results table that allow flexible entity key combinations. Only the columns relevant to a given detection level are populated; others remain NULL. This avoids requiring a separate table for each key combination.

**Star Schema**
Dimensional modeling pattern with the calc_results fact table at the center and dimension tables (entities) surrounding it. Calculation outputs are stored as facts; entity attributes are resolved through dimension joins.

**Strictness**
Whether a detection model calculation is MUST_PASS (gate) or OPTIONAL (scored). Strictness determines whether the calculation blocks alert generation or contributes to accumulated score.

## T

**Time Window**
A bounded time period used to scope calculation execution. Time windows define the temporal range over which data is aggregated or analyzed. See also: Simple Time Window, Complex Time Window, Business Date Window.

**Topological Sort**
Algorithm that orders calculations in the DAG so that every dependency executes before any of its dependents. Ensures that when a calculation runs, all of its input calculations have already produced results.

**Trigger Path**
How an alert was triggered. Two paths exist: `all_passed` (every MUST_PASS gate calculation passed and no OPTIONAL calculations exist or scoring is not configured) and `score_based` (accumulated score from OPTIONAL calculations met or exceeded the score threshold, with all MUST_PASS gates also passing).

## U

**Unified Results Table**
Single `calc_results` table storing all calculation outputs using the EAV pattern and sparse columns. Replaces the alternative of creating per-calculation output tables, enabling cross-calculation queries and simpler schema management.

---

*This glossary is a living document. New terms should be added alphabetically as the documentation suite evolves.*
