# Appendix A -- Complete Table Schemas

**Audience**: Data Engineers, Database Architects
**Last updated**: 2026-03-09

Full DDL for all proposed tables in the Risk Case Manager trade surveillance platform.
Organized by medallion tier and dependency order.

---

## Table of Contents

1. [Migration Order](#1-migration-order)
2. [Configuration Tables (Reference/MDM Tier)](#2-configuration-tables-referencemdm-tier)
   - 2.1 [match_patterns](#21-match_patterns)
   - 2.2 [match_pattern_attributes](#22-match_pattern_attributes)
   - 2.3 [calc_definitions](#23-calc_definitions)
   - 2.4 [detection_models](#24-detection_models)
   - 2.5 [model_calculations](#25-model_calculations)
   - 2.6 [calc_pattern_bindings](#26-calc_pattern_bindings)
   - 2.7 [calc_settings](#27-calc_settings)
   - 2.8 [score_steps](#28-score_steps)
3. [Result Tables (Gold Tier)](#3-result-tables-gold-tier)
   - 3.1 [time_windows](#31-time_windows)
   - 3.2 [calc_results](#32-calc_results)
   - 3.3 [calc_instances](#33-calc_instances)
4. [Alert Tables (Platinum Tier)](#4-alert-tables-platinum-tier)
   - 4.1 [alert_traces](#41-alert_traces)
5. [Versioning Tables (Logging/Audit Tier)](#5-versioning-tables-loggingaudit-tier)
   - 5.1 [match_pattern_versions](#51-match_pattern_versions)
6. [All Indexes](#6-all-indexes)
7. [DuckDB-Specific Notes](#7-duckdb-specific-notes)

---

## 1. Migration Order

Tables must be created in the following order to satisfy foreign key dependencies.
Each group can be created in parallel within the group; groups must be created sequentially.

```
Group 1 (no dependencies):
  match_patterns
  calc_definitions

Group 2 (depends on Group 1):
  match_pattern_attributes    (FK -> match_patterns)
  detection_models            (FK -> match_patterns)
  calc_pattern_bindings       (FK -> calc_definitions, match_patterns)
  calc_settings               (FK -> calc_definitions, match_patterns)
  score_steps                 (FK -> match_patterns, calc_definitions)
  match_pattern_versions      (FK -> match_patterns)

Group 3 (depends on Groups 1-2):
  model_calculations          (FK -> detection_models, calc_definitions)
  time_windows                (no FK, but logically depends on config tables)

Group 4 (depends on Groups 1-3):
  calc_results                (FK -> calc_definitions, time_windows, match_patterns)
  calc_instances              (FK -> calc_definitions, match_patterns)

Group 5 (depends on Groups 1-4):
  alert_traces                (FK -> detection_models)
```

---

## 2. Configuration Tables (Reference/MDM Tier)

These tables define the metadata-driven configuration that governs detection behavior.
They live in the Reference/MDM medallion tier (Tier 7): immutable, versioned,
indefinite retention, data-steward access.

### 2.1 match_patterns

Parent table for the universal match pattern system. Each row defines a single
reusable pattern that drives classification, detection levels, thresholds,
scores, settings, or time window scoping.

See: Document 04 (Match Pattern Architecture), Section 2.

```sql
CREATE TABLE match_patterns (
    -- Primary key: human-readable identifier (e.g., 'equity_stocks', 'wash_full_day_level')
    pattern_id   VARCHAR PRIMARY KEY,

    -- Discriminator: determines how the engine interprets the attribute rows.
    -- 'detection_level' : attribute_value=NULL means GROUP BY this attribute
    -- 'classification'  : attribute rows are WHERE predicates (AND logic)
    -- 'threshold'       : dimensional context for pass/fail threshold lookup
    -- 'score'           : dimensional context for score step matrix selection
    -- 'setting'         : dimensional context for calculation parameter resolution
    -- 'time_window'     : scopes which time window computation applies
    pattern_type VARCHAR NOT NULL CHECK (pattern_type IN (
        'detection_level',
        'classification',
        'threshold',
        'score',
        'setting',
        'time_window'
    )),

    -- Human-readable display label for UI (e.g., 'Equity Stocks', 'FX Instruments')
    label       VARCHAR,

    -- Extended description of what this pattern represents and when to use it
    description VARCHAR,

    -- Origin layer: 'oob' (out-of-box, shipped with platform) or 'custom' (client-defined)
    layer       VARCHAR NOT NULL DEFAULT 'oob' CHECK (layer IN ('oob', 'custom')),

    -- Row creation timestamp for audit trail
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Identity of the user or system process that created this pattern
    created_by  VARCHAR,

    -- Monotonically increasing version number; incremented on each configuration change.
    -- Version 1 is the initial creation.
    version     INTEGER NOT NULL DEFAULT 1,

    -- Lifecycle status governing whether the pattern participates in resolution.
    -- Only 'active' patterns are evaluated by the engine at runtime.
    -- 'draft'      : under construction, not yet reviewed
    -- 'review'     : submitted for compliance/data-steward approval
    -- 'approved'   : approved but not yet activated (pending effective date)
    -- 'active'     : live in production, evaluated by the resolution engine
    -- 'deprecated' : superseded by a newer version, still queryable for audit
    -- 'archived'   : removed from active use, retained for regulatory retention
    status      VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN (
        'draft',
        'review',
        'approved',
        'active',
        'deprecated',
        'archived'
    ))
);

COMMENT ON TABLE match_patterns IS
    'Universal match pattern parent table. Every configuration dimension in the platform '
    '(thresholds, scores, detection levels, settings, time windows) is expressed as a '
    'match pattern. See doc 04-match-pattern-architecture.md.';

COMMENT ON COLUMN match_patterns.pattern_type IS
    'Discriminator that governs interpretation of child attribute rows. '
    'Six types: detection_level, classification, threshold, score, setting, time_window.';

COMMENT ON COLUMN match_patterns.status IS
    'Lifecycle status. Only "active" patterns are evaluated at runtime. '
    'Other states exist for governance workflows (draft -> review -> approved -> active -> deprecated -> archived).';
```

### 2.2 match_pattern_attributes

Child table decomposing each pattern into individual entity-attribute-value
predicates. Multiple rows with the same pattern_id compose as AND logic.

This is the core 3-column structure described in Document 04, Section 2.

```sql
CREATE TABLE match_pattern_attributes (
    -- Surrogate primary key for individual attribute rows
    attribute_id     VARCHAR PRIMARY KEY,

    -- FK to the parent pattern. Multiple rows per pattern_id = AND composition.
    pattern_id       VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- Which entity owns this attribute: 'product', 'account', 'venue', 'trader',
    -- 'execution', 'order', 'md_eod', 'md_intraday'.
    -- NULL for default patterns that match everything (zero-attribute fallback).
    entity           VARCHAR,

    -- The attribute name on the entity: 'asset_class', 'exchange_mic', 'risk_rating',
    -- 'product_id' (for entity-key overrides), etc.
    -- NULL for default patterns.
    entity_attribute VARCHAR,

    -- The domain value to match: 'equity', 'XNYS', 'HIGH', 'AAPL'.
    -- NULL specifically for detection_level patterns, where NULL means
    -- "group by this attribute" rather than "filter to this value".
    -- Also NULL for default patterns (zero-attribute fallback).
    attribute_value  VARCHAR
);

COMMENT ON TABLE match_pattern_attributes IS
    'The universal 3-column match pattern detail table. Each row expresses one predicate: '
    '"on entity X, look at attribute Y, match value Z." Multiple rows per pattern_id compose '
    'as AND logic (stacking). See doc 04, Sections 2-4.';

COMMENT ON COLUMN match_pattern_attributes.entity IS
    'Source entity owning the attribute. Enables entity-aware resolution and cross-entity '
    'matching (e.g., product.asset_class AND account.risk_rating in the same pattern). '
    'NULL for zero-attribute default patterns.';

COMMENT ON COLUMN match_pattern_attributes.attribute_value IS
    'Domain value to match. NULL has special semantics for detection_level patterns: '
    'it means "GROUP BY this entity_attribute" rather than "WHERE entity_attribute = value". '
    'See doc 07-detection-level-design.md.';
```

### 2.3 calc_definitions

Stores the definition of each calculation in the DAG. One row per calculation.
Calculations are reusable across detection models.

See: Document 05 (Calculation Instance Model), Document 09, Section 4.1.

```sql
CREATE TABLE calc_definitions (
    -- Unique calculation identifier matching the calc JSON filename
    -- (e.g., 'wash_detection', 'vwap_calc', 'large_trading_activity')
    calc_id       VARCHAR PRIMARY KEY,

    -- Display name for UI (e.g., 'Wash Detection', 'VWAP Calculation')
    name          VARCHAR NOT NULL,

    -- Human-readable description of what this calculation computes
    description   VARCHAR,

    -- DAG layer determining execution order:
    -- 'transaction'  : operates on individual execution/order rows (Layer 1)
    -- 'time_window'  : computes bounded time periods (Layer 2)
    -- 'aggregation'  : grouped summaries within time windows (Layer 3)
    -- 'derived'      : computed from other calculation outputs (Layer 4)
    layer         VARCHAR NOT NULL CHECK (layer IN (
        'transaction',
        'time_window',
        'aggregation',
        'derived'
    )),

    -- The SQL template with $param placeholders for parameterized execution.
    -- Placeholders are resolved by the settings engine at runtime.
    -- Example: 'CASE WHEN execution_time > $cutoff_time THEN ...'
    logic_sql     TEXT,

    -- Parameter specifications with source type and default values.
    -- JSON object where each key is a parameter name and each value is:
    --   {"source": "setting", "setting_id": "wash_vwap_threshold", "default": 0.02}
    --   {"source": "literal", "value": 0.5}
    -- Parameters with source="setting" participate in context-dependent resolution.
    -- Parameters with source="literal" are substituted directly.
    parameters    JSON,

    -- Array of calc_ids this calculation depends on (DAG edges).
    -- The engine executes dependencies in topological order before this calculation.
    -- Example: ['large_trading_activity', 'vwap_calc'] for wash_detection
    depends_on    VARCHAR[],

    -- DuckDB table name where this calculation writes its output.
    -- Example: 'calc_wash_detection', 'calc_large_trading_activity'
    -- In the unified schema, this is superseded by calc_results, but retained
    -- for backwards compatibility with per-calc table mode.
    output_table  VARCHAR NOT NULL,

    -- JSON object describing the output columns produced by this calculation.
    -- Maps column names to types and descriptions for documentation/validation.
    -- Example: {"qty_match_ratio": {"type": "DOUBLE", "description": "Buy/sell quantity match ratio"}}
    output_fields JSON,

    -- Which output column is the primary metric stored in calc_results.primary_value
    -- (e.g., 'qty_match_ratio', 'total_value', 'cancel_count')
    value_field   VARCHAR,

    -- JSON mapping generic calc_results columns to calculation-specific display labels.
    -- Example: {"primary_value": "Quantity Match Ratio", "secondary_value": "VWAP Proximity",
    --           "flag_value": "Is Wash Candidate"}
    -- Used by the frontend to render meaningful column headers.
    value_labels  VARCHAR,

    -- Array of regulatory standard references this calculation supports.
    -- Example: ['MAR Art. 12(1)(a)', 'MiFID II Art. 16(2)']
    regulatory_tags VARCHAR[]
);

COMMENT ON TABLE calc_definitions IS
    'Calculation metadata definitions. One row per calculation in the DAG. '
    'Calculations are reusable across detection models. Currently 10 calculations '
    'across 4 layers. See doc 05-calculation-instance-model.md, doc 09 Section 4.1.';

COMMENT ON COLUMN calc_definitions.parameters IS
    'JSON parameter specifications. Each parameter declares its source (setting or literal), '
    'the setting_id for resolver lookup, and a default fallback value. '
    'See doc 05, Section 2 (Resolution Flow).';

COMMENT ON COLUMN calc_definitions.depends_on IS
    'DAG dependency edges as an array of calc_ids. The engine uses topological sort '
    'to ensure all dependencies are executed before this calculation runs.';
```

### 2.4 detection_models

One row per detection model. Defines the surveillance model configuration
including which calculations it uses, what grain it operates at, and
how it resolves its score threshold.

See: Document 09, Section 4.5; Document 07 (Detection Level Design);
Document 10 (Scoring and Alerting Pipeline).

```sql
CREATE TABLE detection_models (
    -- Unique model identifier (e.g., 'wash_full_day', 'spoofing_layering')
    model_id                 VARCHAR PRIMARY KEY,

    -- Display name (e.g., 'Wash Trading -- Full Day')
    name                     VARCHAR NOT NULL,

    -- Human-readable description of what market abuse type this model detects
    description              VARCHAR,

    -- FK to match_patterns: the detection level pattern that defines the alert
    -- grain (GROUP BY dimensions). Pattern type must be 'detection_level'.
    -- Example: 'wash_full_day_level' -> GROUP BY product_id, account_id
    detection_level_pattern  VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- FK to match_patterns: optional classification pattern that filters the data
    -- subset this model operates on. NULL means "all data" (universal applicability).
    -- Pattern type must be 'classification'.
    classification_pattern   VARCHAR
        REFERENCES match_patterns(pattern_id),

    -- Setting ID for the alert score threshold (e.g., 'wash_score_threshold').
    -- Resolved via the settings engine with entity context to produce the
    -- minimum accumulated score required to fire an alert.
    score_threshold_setting  VARCHAR NOT NULL,

    -- Array of entity attribute names included in detection query results
    -- for context enrichment. These fields are carried through for display
    -- and settings resolution but do not participate in grouping.
    -- Example: ['product_id', 'account_id', 'business_date', 'asset_class', 'instrument_type']
    context_fields           VARCHAR[] NOT NULL,

    -- The SQL query template that the detection engine executes against DuckDB.
    -- JOINs calculation output tables, applies WHERE filters, and returns
    -- candidate rows for scoring.
    query_template           TEXT,

    -- JSON object mapping regulatory frameworks to specific articles this model covers.
    -- Example: {"MAR": ["Art. 12(1)(a)", "Art. 15"], "MiFID_II": ["Art. 16(2)"]}
    regulatory_coverage      JSON,

    -- Lifecycle status of the model. Only 'active' models are executed by the engine.
    status                   VARCHAR NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'review', 'approved', 'active', 'deprecated', 'archived'))
);

COMMENT ON TABLE detection_models IS
    'Detection model definitions. Currently 5 models: wash_full_day, wash_intraday, '
    'market_price_ramping, spoofing_layering, insider_dealing. '
    'See doc 09 Section 4.5, doc 07, doc 10.';

COMMENT ON COLUMN detection_models.detection_level_pattern IS
    'FK to match_patterns (type=detection_level). Defines the GROUP BY grain for alerts. '
    'Replaces the hardcoded granularity array. See doc 07-detection-level-design.md.';

COMMENT ON COLUMN detection_models.score_threshold_setting IS
    'Setting ID resolved per entity context to determine the minimum accumulated score '
    'for alert generation. Different asset classes may have different thresholds. '
    'See doc 10, Section 5.';
```

### 2.5 model_calculations

Junction table mapping which calculations contribute to each detection model.
Defines strictness (MUST_PASS vs OPTIONAL), value field mapping, scoring
configuration, and evaluation order.

See: Document 09, Section 4.6; Document 10, Section 3.

```sql
CREATE TABLE model_calculations (
    -- FK to the detection model that uses this calculation
    model_id             VARCHAR NOT NULL
        REFERENCES detection_models(model_id),

    -- FK to the calculation definition
    calc_id              VARCHAR NOT NULL
        REFERENCES calc_definitions(calc_id),

    -- Gate vs. evidence classification:
    -- 'MUST_PASS' : prerequisite gate. If the candidate row is present, the gate passes.
    --               When score_steps_setting is present, also contributes a score.
    -- 'OPTIONAL'  : scored evidence. The computed value is mapped to a graduated score
    --               via score steps. threshold_passed = (score > 0).
    strictness           VARCHAR NOT NULL CHECK (strictness IN ('MUST_PASS', 'OPTIONAL')),

    -- Which calc_results column to read the computed value from:
    -- 'primary_value', 'secondary_value', or 'flag_value'.
    -- Some calcs use domain-specific names here that map to the generic columns:
    -- 'total_value' -> primary_value, 'qty_match_ratio' -> primary_value, etc.
    value_field          VARCHAR,

    -- Setting ID for graduated scoring step lookup (e.g., 'large_activity_score_steps').
    -- NULL if this calculation does not participate in graduated scoring
    -- (e.g., gate calcs without scoring like trend_detection, cancel_pattern).
    score_steps_setting  VARCHAR,

    -- Setting ID for a direct pass/fail threshold (e.g., 'large_activity_multiplier').
    -- NULL if pass/fail is determined by score_steps instead.
    threshold_setting    VARCHAR,

    -- Evaluation order within the model. Lower ordinals are evaluated first.
    -- MUST_PASS gates typically have the lowest ordinals.
    ordinal              INTEGER NOT NULL,

    -- Composite primary key: each calculation appears at most once per model
    PRIMARY KEY (model_id, calc_id)
);

COMMENT ON TABLE model_calculations IS
    'Junction table binding calculations to detection models with evaluation semantics. '
    'Currently 13 bindings across 5 models. See doc 09 Section 4.6, doc 10 Section 3.';

COMMENT ON COLUMN model_calculations.strictness IS
    'MUST_PASS = prerequisite gate (must be satisfied before scoring begins). '
    'OPTIONAL = scored evidence (value mapped to graduated score via score steps). '
    'See doc 10 Section 3 for trigger path logic.';

COMMENT ON COLUMN model_calculations.ordinal IS
    'Evaluation order within the model. The engine processes calculations in ordinal '
    'order: MUST_PASS gates first, then OPTIONAL scored calculations.';
```

### 2.6 calc_pattern_bindings

Links calculations to the match patterns that parameterize them. When a
calculation is bound to a pattern, the settings resolver uses the pattern's
entity-attribute context to resolve parameters to context-specific values.

See: Document 04, Section 5; Document 05, Section 6; Document 09, Section 4.7.

```sql
CREATE TABLE calc_pattern_bindings (
    -- Human-readable composite key: '{calc_id}__{pattern_id}__{binding_type}'
    -- Example: 'wash_detection__equity_stocks__setting'
    binding_id    VARCHAR PRIMARY KEY,

    -- FK to the calculation definition being parameterized
    calc_id       VARCHAR NOT NULL
        REFERENCES calc_definitions(calc_id),

    -- FK to the match pattern supplying entity context for settings resolution.
    -- The pattern's attribute rows become the context dictionary passed to the
    -- settings resolver (e.g., {asset_class: "equity"}).
    pattern_id    VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- FK to the detection model that uses this binding. NULL means the binding
    -- is shared across all models that reference this calculation.
    model_id      VARCHAR
        REFERENCES detection_models(model_id),

    -- Discriminator for what aspect of the calculation this binding controls:
    -- 'setting'   : resolves calculation parameter values (e.g., vwap_threshold)
    -- 'threshold' : resolves pass/fail alert trigger thresholds
    -- 'score'     : resolves graduated score step matrix overrides
    binding_type  VARCHAR NOT NULL CHECK (binding_type IN (
        'setting',
        'threshold',
        'score'
    )),

    -- Ensures no duplicate bindings for the same calc+pattern+type combination
    UNIQUE (calc_id, pattern_id, binding_type)
);

COMMENT ON TABLE calc_pattern_bindings IS
    'Cross-product binding of calculations to match patterns. This is the core join table '
    'of the calculation instance model: Calculation x Pattern = Parameterized Instance. '
    'See doc 04 Section 5, doc 05 Section 6.';

COMMENT ON COLUMN calc_pattern_bindings.model_id IS
    'Optional FK to detection_models. NULL means the binding is shared (any model may use it). '
    'When set, the binding is model-specific and only applies when that model invokes the calculation.';
```

### 2.7 calc_settings

Resolved parameter values per calculation-pattern context. Stores the
concrete setting values that the engine uses when executing a calculation
instance in a specific match pattern context.

See: Document 05, Section 2 (Resolution Flow); Document 08 (Resolution Priority Rules).

```sql
CREATE TABLE calc_settings (
    -- Surrogate primary key
    setting_id    VARCHAR PRIMARY KEY,

    -- FK to the calculation whose parameter is being set
    calc_id       VARCHAR NOT NULL
        REFERENCES calc_definitions(calc_id),

    -- FK to the match pattern providing the context for this setting value.
    -- A zero-attribute pattern (no child rows) represents the default.
    pattern_id    VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- The parameter name from calc_definitions.parameters
    -- (e.g., 'vwap_threshold', 'cutoff_time', 'trend_multiplier')
    param_name    VARCHAR NOT NULL,

    -- The resolved parameter value as JSON (supports numeric, string, boolean, array).
    -- Examples:
    --   0.015                              (numeric threshold)
    --   "21:00"                            (string cutoff time)
    --   [{"min": 0, "max": 25000, ...}]   (score step array)
    param_value   JSON NOT NULL,

    -- Ensures one value per calc+pattern+param combination
    UNIQUE (calc_id, pattern_id, param_name)
);

COMMENT ON TABLE calc_settings IS
    'Resolved parameter values per calculation-pattern context. Each row stores the '
    'concrete value the engine substitutes into a calculation SQL template when running '
    'under a specific match pattern context. See doc 05 Section 2, doc 08.';

COMMENT ON COLUMN calc_settings.param_value IS
    'JSON-typed parameter value. Supports scalars (0.015, "21:00", true), arrays '
    '(score step definitions), and objects (complex parameter specs). '
    'The engine deserializes based on the parameter type declared in calc_definitions.parameters.';
```

### 2.8 score_steps

Graduated scoring ranges linked to match patterns. Each row maps a value range
to a score. The engine uses these to convert raw calculation outputs into
risk scores.

See: Document 09, Section 4.4; Document 10, Sections 1-2.

```sql
CREATE TABLE score_steps (
    -- Surrogate primary key
    step_id      VARCHAR PRIMARY KEY,

    -- FK to the match pattern providing dimensional context for this score matrix.
    -- Different patterns can define different step ranges for the same setting.
    -- Example: 'equity_stocks' pattern has higher floor for large_activity scoring.
    pattern_id   VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- FK to the calculation whose output is being scored.
    -- Links to calc_definitions to identify which calculation produces the value
    -- that these score steps evaluate.
    calc_id      VARCHAR NOT NULL
        REFERENCES calc_definitions(calc_id),

    -- Lower bound of the range (inclusive). NULL means unbounded lower (negative infinity).
    -- Example: 0.0, 25000.0, 0.005
    min_value    DOUBLE,

    -- Upper bound of the range (exclusive). NULL means unbounded upper (positive infinity).
    -- Example: 25000.0, 100000.0, NULL (for the highest tier)
    max_value    DOUBLE,

    -- Score points awarded when the computed value falls in [min_value, max_value).
    -- Typical scale: 0 (normal), 3 (elevated), 7 (significant), 10 (extreme).
    score        DOUBLE NOT NULL,

    -- Human-readable label for this step range
    -- (e.g., 'Normal equity volume', 'Elevated', 'Extreme')
    label        VARCHAR
);

COMMENT ON TABLE score_steps IS
    'Graduated scoring ranges mapping calculation output values to risk scores. '
    'Ranges are contiguous and non-overlapping within a (pattern_id, calc_id) group. '
    'The typical scale is 0/3/7/10. See doc 09 Section 4.4, doc 10 Sections 1-2.';

COMMENT ON COLUMN score_steps.min_value IS
    'Lower bound (inclusive). NULL = unbounded lower (negative infinity). '
    'Value comparison: min_value <= computed_value < max_value.';

COMMENT ON COLUMN score_steps.max_value IS
    'Upper bound (exclusive). NULL = unbounded upper (positive infinity). '
    'The highest tier in every score step set should have max_value = NULL.';
```

---

## 3. Result Tables (Gold Tier)

These tables hold computed outputs from the detection pipeline. They live in
the Gold medallion tier (Tier 5): business-ready, append-only, 365-day retention,
business_user access.

### 3.1 time_windows

First-class time window objects registered by the pipeline. Both precomputed
(simple) windows and discovered (complex) windows are stored in this single table.

See: Document 06 (Time Window Framework), Sections 3-4.

```sql
CREATE TABLE time_windows (
    -- Globally unique window identifier.
    -- Simple windows: deterministic (e.g., 'bdate_XNYS_2026-03-09')
    -- Complex windows: derived from pattern attributes
    --   (e.g., 'cancel_PRD001_ACC042_20260309_SELL')
    window_id         VARCHAR PRIMARY KEY,

    -- Window category linking to detection model metadata.
    -- Maps to the 'time_window' field in detection model JSON.
    -- Values: 'business_date', 'cancellation_pattern', 'trend', 'market_event'
    window_type       VARCHAR NOT NULL,

    -- How and when this window was determined:
    -- 'simple'  : precomputed from calendar/exchange schedule (deterministic)
    -- 'complex' : discovered during execution via pattern detection (non-deterministic)
    detection_method  VARCHAR NOT NULL CHECK (detection_method IN ('simple', 'complex')),

    -- Sparse nullable entity columns: different window types scope to different
    -- entity combinations. See doc 06, Section 3 for nullability rules per window type.
    --
    -- business_date:        product=NULL, account=NULL, venue=SET
    -- cancellation_pattern: product=SET,  account=SET,  venue=NULL
    -- trend:                product=SET,  account=NULL, venue=NULL
    -- market_event:         product=SET,  account=NULL, venue=NULL
    product_id        VARCHAR,
    account_id        VARCHAR,
    venue_id          VARCHAR,

    -- Window time boundaries
    start_ts          TIMESTAMP NOT NULL,
    end_ts            TIMESTAMP NOT NULL,

    -- The business date this window belongs to. Enables efficient partition-based lookups.
    -- A single business date may contain multiple complex windows but exactly one
    -- simple business_date window per venue.
    business_date     DATE,

    -- Extensible JSON payload carrying window-type-specific context:
    -- cancellation_pattern: {"cancel_count": 5, "cancel_quantity": 12500, "pattern_side": "SELL"}
    -- trend:                {"trend_type": "up", "price_change_pct": 3.2, "start_price": 14.0, "end_price": 14.45}
    -- market_event:         {"event_type": "price_surge", "lookback_start": "...", "lookforward_end": "..."}
    metadata          JSON,

    -- Timestamp of when this window row was registered.
    -- Used for audit trail, staleness checks, and recomputation decisions.
    computed_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: end must be after start
    CHECK (end_ts > start_ts)
);

COMMENT ON TABLE time_windows IS
    'First-class time window result table. Simple windows (business date boundaries) are '
    'precomputed; complex windows (cancellation bursts, price trends, market events) are '
    'discovered during execution. Both types are registered here for uniform downstream '
    'consumption via dynamic JOIN. See doc 06-time-window-framework.md.';

COMMENT ON COLUMN time_windows.detection_method IS
    'simple = precomputed from calendar/exchange schedule, fully deterministic. '
    'complex = discovered via pattern detection during execution, non-deterministic count.';

COMMENT ON COLUMN time_windows.metadata IS
    'Window-type-specific JSON payload. Schema varies by window_type. '
    'Cancellation patterns store cancel_count, cancel_quantity, pattern_side. '
    'Trends store trend_type, price_change_pct, start_price, end_price.';
```

### 3.2 calc_results

Unified fact table for all calculation outputs. Every calculation in the DAG
writes to this single table, regardless of layer, detection model, or
granularity. The calc_id column is the discriminator that makes generic
columns interpretable.

See: Document 09 (Unified Results Schema), Sections 1-7.

```sql
CREATE TABLE calc_results (
    -- Surrogate primary key. Generated as a deterministic hash of
    -- (calc_id, product_id, account_id, business_date, window_id) for idempotent upserts,
    -- or as a UUID for append-only pipelines.
    result_id        VARCHAR PRIMARY KEY,

    -- FK to calc_definitions: identifies which calculation produced this row.
    -- The meaning of primary_value, secondary_value, and flag_value is determined
    -- entirely by this calc_id discriminator.
    calc_id          VARCHAR NOT NULL
        REFERENCES calc_definitions(calc_id),

    -- FK to time_windows: the time window context for this result.
    -- NULL for transaction-layer calculations that operate on individual executions
    -- without time windowing (e.g., value_calc, adjusted_direction).
    window_id        VARCHAR
        REFERENCES time_windows(window_id),

    -- FK to match_patterns: which classification context was active when this result
    -- was computed. NULL when the calculation ran with no pattern-specific parameterization.
    pattern_id       VARCHAR
        REFERENCES match_patterns(pattern_id),

    -- Sparse nullable dimension columns. Populated based on calculation grain.
    -- Not every calculation operates at every entity dimension.
    -- DuckDB columnar storage handles NULLs efficiently (~1 bit per row for null bitmap).
    product_id       VARCHAR,       -- FK -> product entity
    account_id       VARCHAR,       -- FK -> account entity
    venue_id         VARCHAR,       -- FK -> venue entity (ISO 10383 MIC)
    trader_id        VARCHAR,       -- FK -> trader entity

    -- The business date this result applies to
    business_date    DATE NOT NULL,

    -- Main calculation output. Meaning varies by calc_id:
    --   value_calc              -> calculated_value (notional)
    --   trading_activity_agg    -> net_value
    --   wash_detection          -> qty_match_ratio
    --   large_trading_activity  -> total_value
    --   cancellation_pattern    -> cancel_count
    --   trend_window            -> price_change_pct
    --   vwap_calc               -> vwap_proximity
    primary_value    DOUBLE,

    -- Optional secondary metric. Used when a calculation produces two meaningful
    -- numeric outputs. Examples:
    --   wash_detection    -> vwap_proximity (primary = qty_match_ratio)
    --   vwap_calc         -> vwap_spread (primary = vwap_proximity)
    --   cancellation      -> cancel_quantity (primary = cancel_count)
    --   large_trading     -> threshold_used (primary = total_value)
    secondary_value  DOUBLE,

    -- Boolean pass/fail indicator. Examples:
    --   large_trading_activity  -> is_large
    --   wash_detection          -> is_wash_candidate
    -- NULL for calculations that produce only numeric outputs (e.g., value_calc).
    flag_value       BOOLEAN,

    -- Timestamp recording when the calculation engine produced this row.
    -- Used for pipeline audit, freshness monitoring, and SLA tracking.
    computed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE calc_results IS
    'Unified star schema fact table for all calculation outputs. Replaces per-calculation '
    'table proliferation (10+ separate tables) with a single table discriminated by calc_id. '
    'Sparse nullable dimension columns handle varying calculation grains efficiently. '
    'See doc 09-unified-results-schema.md.';

COMMENT ON COLUMN calc_results.primary_value IS
    'Main numeric output. Meaning determined by calc_id. '
    'Use calc_definitions.value_labels for human-readable column labels.';

COMMENT ON COLUMN calc_results.flag_value IS
    'Boolean pass/fail indicator. Directly usable as a MUST_PASS gate in detection models '
    'without threshold comparison. NULL for calculations producing only numeric outputs.';
```

### 3.3 calc_instances

Runtime-populated table recording each resolved calculation instance for
auditability. One row per (calculation x pattern x run) execution. Tracks
the resolved parameters, caching status, and resolution trace.

See: Document 05, Section 6.

```sql
CREATE TABLE calc_instances (
    -- Globally unique instance identifier (UUID or composite)
    instance_id          VARCHAR PRIMARY KEY,

    -- FK to the pipeline run that produced this instance.
    -- Enables grouping all instances from a single engine execution.
    run_id               VARCHAR NOT NULL,

    -- FK to the calculation definition
    calc_id              VARCHAR NOT NULL
        REFERENCES calc_definitions(calc_id),

    -- FK to the match pattern that supplied the entity context for parameter resolution
    pattern_id           VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- JSON object of the fully resolved parameters.
    -- Example: {"vwap_threshold": 0.015, "qty_threshold": 0.5}
    -- These are the concrete values that were substituted into the SQL template.
    resolved_params      JSON NOT NULL,

    -- SHA-256 hash of sorted resolved parameter key-value pairs.
    -- Used for deduplication: if two patterns produce identical resolved parameters
    -- for the same calculation, only one instance is executed.
    resolved_params_hash VARCHAR NOT NULL,

    -- DuckDB table name or reference where results were written
    result_table         VARCHAR NOT NULL,

    -- Number of rows produced by this instance execution
    row_count            INTEGER NOT NULL,

    -- When this instance was executed
    executed_at          TIMESTAMP NOT NULL,

    -- TRUE if result was reused from a previous instance with the same
    -- (calc_id, resolved_params_hash) tuple. Avoids redundant computation
    -- when multiple detection models share the same parameterized calculation.
    cached               BOOLEAN NOT NULL DEFAULT FALSE,

    -- Per-parameter resolution audit trail. JSON object keyed by parameter name.
    -- Each entry records: setting_id, context, matched_override, resolved_value, why.
    -- Example:
    -- {
    --   "vwap_threshold": {
    --     "setting_id": "wash_vwap_threshold",
    --     "context": {"asset_class": "equity"},
    --     "matched_override": {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    --     "resolved_value": 0.015,
    --     "why": "Matched override: {asset_class=equity} (priority 1)"
    --   }
    -- }
    resolution_trace     JSON
);

COMMENT ON TABLE calc_instances IS
    'Runtime audit table recording each resolved calculation instance. One row per '
    '(calculation x pattern x run). Enables alert traceability: alert -> instance -> '
    'resolved parameters -> matched settings overrides. See doc 05 Section 6.';

COMMENT ON COLUMN calc_instances.resolved_params_hash IS
    'SHA-256 hash of sorted resolved params. Enables deduplication: instances with '
    'identical (calc_id, hash) tuples share cached results.';

COMMENT ON COLUMN calc_instances.resolution_trace IS
    'Complete per-parameter resolution audit trail. Records which setting was loaded, '
    'which context was passed, which override matched, and why.';
```

---

## 4. Alert Tables (Platinum Tier)

These tables hold alert outputs and investigation traces. Alert summaries
live in the Platinum/Diamond tier (Tier 6). Detailed traces with investigator
annotations live in the Sandbox/Lab tier (Tier 8) where they are mutable.

### 4.1 alert_traces

Complete audit trail for every alert candidate, whether the alert fired or not.
Regulatory obligations under MAR Art. 16, MiFID II Art. 16(2), and SEC Rule 17a-4
require firms to demonstrate why an alert was raised or suppressed.

See: Document 10, Section 6 (Alert Trace Explainability).

```sql
CREATE TABLE alert_traces (
    -- Unique alert identifier (e.g., 'ALT-A1B2C3D4')
    alert_id            VARCHAR PRIMARY KEY,

    -- FK to the detection model that evaluated this candidate
    model_id            VARCHAR NOT NULL
        REFERENCES detection_models(model_id),

    -- JSON object containing the entity context that triggered evaluation.
    -- Keys: product_id, account_id, asset_class, instrument_type, business_date, etc.
    -- Derived from the model's context_fields applied to the candidate query row.
    -- Example: {"product_id": "PRD-001", "account_id": "ACC-042",
    --           "asset_class": "equity", "business_date": "2026-03-07"}
    entity_context      JSON NOT NULL,

    -- JSON array of per-calculation scoring results (CalculationScore objects).
    -- Each entry contains: calc_id, computed_value, threshold, threshold_passed,
    -- score, score_step_matched, strictness.
    -- Example: [
    --   {"calc_id": "large_trading_activity", "computed_value": 125000,
    --    "score": 7, "threshold_passed": true, "strictness": "MUST_PASS",
    --    "score_step_matched": {"min": 100000, "max": 500000, "score": 7}},
    --   ...
    -- ]
    calculation_scores  JSON NOT NULL,

    -- Sum of all individual calculation scores
    accumulated_score   DOUBLE NOT NULL,

    -- The resolved score threshold for this entity context.
    -- Resolved from model.score_threshold_setting via the settings engine.
    score_threshold     DOUBLE NOT NULL,

    -- How the alert decision was reached:
    -- 'all_passed'  : every calculation (MUST_PASS + OPTIONAL) passed its threshold
    -- 'score_based' : not all passed individually, but accumulated_score >= score_threshold
    -- 'none'        : neither condition met; alert did not fire
    trigger_path        VARCHAR NOT NULL CHECK (trigger_path IN (
        'all_passed',
        'score_based',
        'none'
    )),

    -- Final alert decision: must_pass_ok AND (all_passed OR score_ok)
    alert_fired         BOOLEAN NOT NULL,

    -- Compact scoring summary. JSON array with one entry per calculation:
    -- [{"calc_id": "...", "value_field": "...", "computed_value": N,
    --   "score": N, "step_matched": {...}, "passed": bool}]
    scoring_breakdown   JSON,

    -- Settings resolution audit trail. JSON array of SettingsTraceEntry objects:
    -- [{"setting_id": "...", "setting_name": "...", "matched_override": {...},
    --   "resolved_value": ..., "why": "..."}]
    settings_trace      JSON,

    -- Match pattern resolution trace. Records which patterns drove each settings
    -- resolution step. JSON array of pattern trace entries:
    -- [{"step": "score_steps_resolution", "setting_id": "...",
    --   "context": {...}, "matched_pattern": "...", "result": "..."}]
    pattern_trace       JSON,

    -- The business date of the candidate being evaluated
    business_date       DATE NOT NULL,

    -- Timestamp of when this trace was created
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE alert_traces IS
    'Complete audit trail for every alert candidate. Required by MAR Art. 16, '
    'MiFID II Art. 16(2), SEC Rule 17a-4. Records the full score computation path '
    'from raw data through parameter resolution, scoring, and trigger decision. '
    'See doc 10 Section 6.';

COMMENT ON COLUMN alert_traces.trigger_path IS
    'How the alert decision was reached. "all_passed" = all calcs passed individually. '
    '"score_based" = not all passed but accumulated score exceeds threshold. '
    '"none" = alert suppressed. See doc 10 Section 3.';

COMMENT ON COLUMN alert_traces.pattern_trace IS
    'Proposed enhancement (doc 10 Section 6): traces which match patterns drove each '
    'settings resolution step, enabling compliance to audit pattern configurations.';
```

---

## 5. Versioning Tables (Logging/Audit Tier)

These tables track configuration change history. They live in the Logging/Audit
medallion tier (Tier 9): tamper-evident, 2555-day retention (~7 years),
compliance access.

### 5.1 match_pattern_versions

Immutable version history for match patterns. Each configuration change
produces a new version row containing a JSON snapshot of the complete
pattern state at that point in time.

See: Document 16 (Lifecycle and Governance -- planned).

```sql
CREATE TABLE match_pattern_versions (
    -- Surrogate primary key for the version record
    version_id     VARCHAR PRIMARY KEY,

    -- FK to the pattern being versioned
    pattern_id     VARCHAR NOT NULL
        REFERENCES match_patterns(pattern_id),

    -- Monotonically increasing version number within this pattern.
    -- Version 1 = initial creation. Subsequent changes increment by 1.
    version_num    INTEGER NOT NULL,

    -- When this version was created
    created_at     TIMESTAMP NOT NULL,

    -- Who created this version (user ID, system process ID, or API caller)
    created_by     VARCHAR NOT NULL,

    -- Human-readable explanation of why this change was made.
    -- Required by compliance governance: every configuration change must
    -- document its business justification.
    change_reason  VARCHAR,

    -- The lifecycle status of the pattern at this version point.
    -- Captures the full state transition history.
    status         VARCHAR NOT NULL CHECK (status IN (
        'draft', 'review', 'approved', 'active', 'deprecated', 'archived'
    )),

    -- Complete JSON snapshot of the pattern and all its attribute rows at this
    -- version point. Captures the full state for point-in-time audit queries.
    -- Schema:
    -- {
    --   "pattern_id": "...",
    --   "pattern_type": "...",
    --   "label": "...",
    --   "description": "...",
    --   "status": "...",
    --   "attributes": [
    --     {"entity": "product", "entity_attribute": "asset_class", "attribute_value": "equity"},
    --     ...
    --   ]
    -- }
    snapshot       JSON NOT NULL,

    -- Ensures version numbers are unique and sequential per pattern
    UNIQUE (pattern_id, version_num)
);

COMMENT ON TABLE match_pattern_versions IS
    'Immutable version history for match patterns. Each row is a point-in-time snapshot '
    'of a pattern configuration. Supports regulatory requirements for configuration '
    'change audit trails (MAR, MiFID II). Once committed, rows are never modified. '
    'See doc 16 (Lifecycle and Governance).';

COMMENT ON COLUMN match_pattern_versions.snapshot IS
    'Complete JSON snapshot of the pattern at this version. Includes pattern_type, label, '
    'description, status, and all attribute rows. Enables point-in-time reconstruction '
    'of any historical configuration state.';

COMMENT ON COLUMN match_pattern_versions.change_reason IS
    'Business justification for the change. Governance policy requires this field for '
    'all changes beyond draft status.';
```

---

## 6. All Indexes

### 6.1 match_patterns Indexes

```sql
-- Pattern type lookup: "all active detection_level patterns"
-- Used by the detection engine when loading model configurations
-- and by the settings resolver when filtering patterns by type.
CREATE INDEX idx_match_patterns_type_status
    ON match_patterns (pattern_type, status);
```

**Rationale**: The engine frequently queries for all active patterns of a given type (e.g., "find all active detection_level patterns"). This composite index supports both the type filter and the status filter in a single index scan.

### 6.2 match_pattern_attributes Indexes

```sql
-- Parent lookup: all attributes for a given pattern
-- Used every time the engine resolves a pattern's match criteria.
CREATE INDEX idx_mpa_pattern
    ON match_pattern_attributes (pattern_id);

-- Entity lookup: "all patterns that reference the product entity"
-- Used by impact analysis and entity graph reachability queries.
CREATE INDEX idx_mpa_entity
    ON match_pattern_attributes (entity, entity_attribute);
```

**Rationale**: `idx_mpa_pattern` is the most frequently used index -- every pattern resolution requires loading all attribute rows for a pattern_id. `idx_mpa_entity` supports reverse lookups: "which patterns reference `product.asset_class`?" -- needed for impact analysis when entity attributes change.

### 6.3 calc_definitions Indexes

```sql
-- Layer lookup: "all calculations in the time_window layer"
-- Used by the DAG scheduler to identify execution phases.
CREATE INDEX idx_calc_defs_layer
    ON calc_definitions (layer);
```

**Rationale**: The pipeline scheduler groups calculations by layer for phased execution (transaction -> time_window -> aggregation -> derived). This index supports the phase grouping query.

### 6.4 detection_models Indexes

```sql
-- Status filter: "all active detection models"
-- Used by the detection engine at startup to load the model catalog.
CREATE INDEX idx_detection_models_status
    ON detection_models (status);
```

**Rationale**: Only active models are executed. This index supports the startup model catalog load without scanning deprecated/archived models.

### 6.5 model_calculations Indexes

```sql
-- Model lookup: "all calculations for a given model"
-- Primary access pattern: the detection engine loads all calculations
-- when evaluating a specific model.
CREATE INDEX idx_model_calcs_model
    ON model_calculations (model_id, ordinal);

-- Reverse lookup: "which models use this calculation?"
-- Used for impact analysis when a calculation is modified.
CREATE INDEX idx_model_calcs_calc
    ON model_calculations (calc_id);
```

**Rationale**: `idx_model_calcs_model` supports the ordered loading of calculations per model (by ordinal). `idx_model_calcs_calc` supports the reverse query for dependency analysis.

### 6.6 calc_pattern_bindings Indexes

```sql
-- Calculation lookup: "all patterns bound to this calculation"
-- Used by the instance resolution engine to spawn instances.
CREATE INDEX idx_cpb_calc
    ON calc_pattern_bindings (calc_id);

-- Pattern lookup: "all calculations bound to this pattern"
-- Used by impact analysis when a pattern is modified.
CREATE INDEX idx_cpb_pattern
    ON calc_pattern_bindings (pattern_id);

-- Model-scoped binding lookup
CREATE INDEX idx_cpb_model
    ON calc_pattern_bindings (model_id)
    WHERE model_id IS NOT NULL;
```

**Rationale**: The instance engine queries by calc_id to find applicable patterns. Impact analysis queries by pattern_id. The partial index on model_id filters efficiently when most bindings have NULL model_id (shared bindings).

### 6.7 calc_settings Indexes

```sql
-- Calculation parameter lookup: "all settings for this calc+pattern"
-- Used by the settings resolver during parameter resolution.
CREATE INDEX idx_calc_settings_calc_pattern
    ON calc_settings (calc_id, pattern_id);
```

**Rationale**: The settings resolver always queries by (calc_id, pattern_id) to find all parameter values for a specific calculation in a specific context.

### 6.8 score_steps Indexes

```sql
-- Score lookup: "all steps for this pattern+calc combination"
-- Used by the scoring engine during graduated score evaluation.
CREATE INDEX idx_score_steps_pattern_calc
    ON score_steps (pattern_id, calc_id);
```

**Rationale**: The scoring engine loads all step ranges for a (pattern, calculation) pair and performs range lookup against the computed value. This index covers the load query.

### 6.9 time_windows Indexes

```sql
-- Primary query: "all windows of a given type for a business date"
-- Most common access pattern: detection models join against windows
-- by type and date to produce the work manifest.
CREATE INDEX idx_time_windows_type_date
    ON time_windows (window_type, business_date);

-- Entity-scoped lookup: "windows for a specific product on a date"
-- Used when the work manifest join includes entity scope predicates.
CREATE INDEX idx_time_windows_product_date
    ON time_windows (product_id, business_date)
    WHERE product_id IS NOT NULL;

-- Staleness check: "windows computed after a certain timestamp"
-- Used to determine whether cached windows are still valid.
CREATE INDEX idx_time_windows_computed
    ON time_windows (window_type, business_date, computed_at);
```

**Rationale**: `idx_time_windows_type_date` covers the cross-join work manifest query (doc 06, Section 4). `idx_time_windows_product_date` is a partial index that only indexes non-NULL product_id rows, covering entity-scoped window lookups efficiently. `idx_time_windows_computed` supports the staleness decision tree (doc 06, Section 7).

### 6.10 calc_results Indexes

```sql
-- Primary: "all results for a specific calculation on a specific date"
-- Covers every detection model query and all per-calculation lookups.
CREATE INDEX idx_calc_results_calc_date
    ON calc_results (calc_id, business_date);

-- Product-date: "all results for a product on a date"
-- Used by alert investigation workflows starting from a product context.
CREATE INDEX idx_calc_results_product_date
    ON calc_results (product_id, business_date);

-- Account-date: "all results for an account on a date"
-- Used by account-centric compliance reviews.
CREATE INDEX idx_calc_results_account_date
    ON calc_results (account_id, business_date);

-- Composite: "all results for calcs in a model, for a product, on a date"
-- Covers the full predicate chain of the generic detection query (doc 09, Section 6).
CREATE INDEX idx_calc_results_calc_product_date
    ON calc_results (calc_id, product_id, business_date);
```

**Rationale**: See Document 09, Section 8 for detailed justification. `idx_calc_results_calc_date` is the must-have primary index. Product and account indexes support investigation workflows. The composite index covers the full detection model query predicate chain.

### 6.11 calc_instances Indexes

```sql
-- Run lookup: "all instances from a specific pipeline run"
CREATE INDEX idx_calc_instances_run
    ON calc_instances (run_id);

-- Deduplication lookup: instances with the same calc and params hash
CREATE INDEX idx_calc_instances_calc_hash
    ON calc_instances (calc_id, resolved_params_hash);
```

**Rationale**: `idx_calc_instances_run` supports pipeline monitoring and audit (list all work done in a run). `idx_calc_instances_calc_hash` supports instance cache lookup for deduplication (doc 05, Section 5).

### 6.12 alert_traces Indexes

```sql
-- Model+date: "all alerts for a model on a date"
-- Primary query for alert review dashboards.
CREATE INDEX idx_alert_traces_model_date
    ON alert_traces (model_id, business_date);

-- Fired alerts only: "alerts that actually fired, by date"
-- Covers the most common compliance query: "show me today's alerts"
CREATE INDEX idx_alert_traces_fired_date
    ON alert_traces (business_date)
    WHERE alert_fired = TRUE;

-- Score lookup: "high-scoring alerts for review prioritization"
CREATE INDEX idx_alert_traces_score
    ON alert_traces (accumulated_score DESC)
    WHERE alert_fired = TRUE;
```

**Rationale**: `idx_alert_traces_model_date` covers the per-model alert review. The partial index `idx_alert_traces_fired_date` skips non-fired candidates (typically 60-80% of all traces), significantly reducing scan scope for compliance dashboards. `idx_alert_traces_score` supports priority-ordered review queues.

### 6.13 match_pattern_versions Indexes

```sql
-- Pattern version history: "all versions of a pattern, ordered"
-- Used by the governance UI to display change history.
CREATE INDEX idx_mpv_pattern_version
    ON match_pattern_versions (pattern_id, version_num DESC);

-- Audit timeline: "all configuration changes by a user"
CREATE INDEX idx_mpv_created_by
    ON match_pattern_versions (created_by, created_at DESC);
```

**Rationale**: `idx_mpv_pattern_version` supports the version history display (most recent version first). `idx_mpv_created_by` supports user-centric audit queries ("what did this user change and when?").

### 6.14 Index Summary

| Table | Index | Columns | Type | Priority |
|-------|-------|---------|------|----------|
| match_patterns | idx_match_patterns_type_status | (pattern_type, status) | Composite | Must-have |
| match_pattern_attributes | idx_mpa_pattern | (pattern_id) | Single | Must-have |
| match_pattern_attributes | idx_mpa_entity | (entity, entity_attribute) | Composite | Should-have |
| calc_definitions | idx_calc_defs_layer | (layer) | Single | Nice-to-have |
| detection_models | idx_detection_models_status | (status) | Single | Should-have |
| model_calculations | idx_model_calcs_model | (model_id, ordinal) | Composite | Must-have |
| model_calculations | idx_model_calcs_calc | (calc_id) | Single | Should-have |
| calc_pattern_bindings | idx_cpb_calc | (calc_id) | Single | Must-have |
| calc_pattern_bindings | idx_cpb_pattern | (pattern_id) | Single | Should-have |
| calc_pattern_bindings | idx_cpb_model | (model_id) WHERE NOT NULL | Partial | Nice-to-have |
| calc_settings | idx_calc_settings_calc_pattern | (calc_id, pattern_id) | Composite | Must-have |
| score_steps | idx_score_steps_pattern_calc | (pattern_id, calc_id) | Composite | Must-have |
| time_windows | idx_time_windows_type_date | (window_type, business_date) | Composite | Must-have |
| time_windows | idx_time_windows_product_date | (product_id, business_date) WHERE NOT NULL | Partial | Should-have |
| time_windows | idx_time_windows_computed | (window_type, business_date, computed_at) | Composite | Should-have |
| calc_results | idx_calc_results_calc_date | (calc_id, business_date) | Composite | Must-have |
| calc_results | idx_calc_results_product_date | (product_id, business_date) | Composite | Should-have |
| calc_results | idx_calc_results_account_date | (account_id, business_date) | Composite | Should-have |
| calc_results | idx_calc_results_calc_product_date | (calc_id, product_id, business_date) | Composite | Nice-to-have |
| calc_instances | idx_calc_instances_run | (run_id) | Single | Must-have |
| calc_instances | idx_calc_instances_calc_hash | (calc_id, resolved_params_hash) | Composite | Must-have |
| alert_traces | idx_alert_traces_model_date | (model_id, business_date) | Composite | Must-have |
| alert_traces | idx_alert_traces_fired_date | (business_date) WHERE fired=TRUE | Partial | Should-have |
| alert_traces | idx_alert_traces_score | (accumulated_score DESC) WHERE fired=TRUE | Partial/Desc | Nice-to-have |
| match_pattern_versions | idx_mpv_pattern_version | (pattern_id, version_num DESC) | Composite/Desc | Must-have |
| match_pattern_versions | idx_mpv_created_by | (created_by, created_at DESC) | Composite/Desc | Should-have |

**Total**: 25 indexes across 12 tables.

---

## 7. DuckDB-Specific Notes

### 7.1 Type Mapping

DuckDB's type system differs from PostgreSQL and other traditional RDBMS. The following
mappings apply to the DDL in this appendix:

| This DDL | DuckDB Type | Notes |
|----------|-------------|-------|
| `VARCHAR` | `VARCHAR` | DuckDB VARCHAR is unbounded by default (no length specifier needed). Equivalent to TEXT in other databases. DuckDB does not distinguish VARCHAR(N) and TEXT. |
| `TEXT` | `VARCHAR` | DuckDB uses VARCHAR for all text types. `TEXT` is accepted as an alias but stored as VARCHAR. |
| `INTEGER` | `INTEGER` | 32-bit signed integer. |
| `DOUBLE` | `DOUBLE` | 64-bit IEEE 754 floating point. For financial calculations requiring exact decimal arithmetic, consider `DECIMAL(18,8)`. |
| `BOOLEAN` | `BOOLEAN` | Standard true/false. |
| `DATE` | `DATE` | ISO 8601 date without time component. |
| `TIMESTAMP` | `TIMESTAMP` | Microsecond-precision timestamp without timezone. For timezone-aware timestamps, use `TIMESTAMPTZ`. |
| `JSON` | `JSON` | DuckDB has native JSON type support with `json_extract`, `json_extract_string`, `->`, `->>` operators. JSON columns are stored as VARCHAR internally but with JSON validation. Alternatively, use `VARCHAR` and parse at query time. |
| `VARCHAR[]` | `VARCHAR[]` | DuckDB supports native array types. Arrays are indexable and searchable with `list_contains()`, `array_length()`, etc. |

### 7.2 Constraint Enforcement

DuckDB's constraint enforcement differs from traditional RDBMS:

| Constraint | DuckDB Support | Notes |
|------------|---------------|-------|
| `PRIMARY KEY` | Enforced | Duplicate inserts raise an error. |
| `UNIQUE` | Enforced | Duplicate values raise an error. |
| `NOT NULL` | Enforced | NULL inserts into NOT NULL columns raise an error. |
| `CHECK` | Enforced | CHECK constraints are evaluated on INSERT/UPDATE. |
| `FOREIGN KEY` | **Parsed but not enforced** | DuckDB accepts REFERENCES syntax but does not validate referential integrity at runtime. FK declarations in this DDL serve as documentation of intended relationships. Application-layer or ETL-layer validation is required to enforce referential integrity. |
| `DEFAULT` | Supported | `DEFAULT CURRENT_TIMESTAMP` and literal defaults work as expected. |

**Important**: Because DuckDB does not enforce foreign keys, the migration order in Section 1 is a logical dependency guide, not a hard creation-order requirement. However, maintaining creation order is recommended for documentation clarity and for future migration to databases that enforce FKs (PostgreSQL, MySQL).

### 7.3 Index Behavior

DuckDB's index behavior differs significantly from row-oriented databases:

- **ART indexes**: DuckDB uses Adaptive Radix Tree (ART) indexes for explicit `CREATE INDEX` statements. These are most effective for point lookups and narrow range scans (< 1% selectivity).

- **Zone maps (implicit)**: DuckDB automatically maintains per-column min/max statistics for each row group (~122,880 rows). These provide implicit "indexing" that allows the engine to skip entire row groups whose range does not overlap the query predicate. For `business_date` columns, this effectively provides free date-range filtering.

- **Full-table scans are fast**: DuckDB is optimized for analytical (OLAP) workloads where full-column scans are the primary access pattern. For tables under 1M rows, explicit indexes provide marginal benefit. The indexes in Section 6 become valuable at scale (> 1M rows) or for point lookups.

- **Partial indexes**: The `WHERE` clause on indexes (e.g., `WHERE alert_fired = TRUE`) is supported in DuckDB and reduces index size by excluding rows that do not match the predicate.

- **Descending indexes**: DuckDB supports `DESC` in index definitions for ordered access patterns.

### 7.4 Parquet Integration

For production deployments at scale, several tables benefit from Parquet-backed storage:

| Table | Parquet Strategy | Partitioning |
|-------|-----------------|--------------|
| calc_results | Hive-partitioned Parquet | `business_date` |
| time_windows | Hive-partitioned Parquet | `business_date` |
| alert_traces | Hive-partitioned Parquet | `business_date` |
| calc_instances | Hive-partitioned Parquet | `run_id` (or date) |
| Configuration tables | Single Parquet file per table | None (small, rarely changing) |

Parquet partition pruning provides more effective date-range filtering than explicit indexes for large datasets:

```sql
-- Hive-partitioned layout:
-- workspace/results/calc_results/business_date=2026-03-01/part-0.parquet
-- workspace/results/calc_results/business_date=2026-03-02/part-0.parquet

-- DuckDB reads only the relevant partition:
SELECT * FROM read_parquet(
    'workspace/results/calc_results/*/part-*.parquet',
    hive_partitioning=true
)
WHERE business_date = '2026-03-01'
  AND calc_id = 'wash_detection';
```

### 7.5 JSON Column Querying

DuckDB provides multiple ways to query JSON columns used in this schema:

```sql
-- Arrow notation (returns JSON type)
SELECT entity_context->'product_id' FROM alert_traces;

-- Double-arrow notation (returns VARCHAR, extracts string)
SELECT entity_context->>'product_id' FROM alert_traces;

-- Function notation
SELECT json_extract_string(entity_context, '$.product_id') FROM alert_traces;

-- Nested access
SELECT calculation_scores->>0->>'calc_id' FROM alert_traces;

-- JSON array length
SELECT json_array_length(calculation_scores) FROM alert_traces;
```

---

## Cross-References

| Document | Relationship to This Appendix |
|----------|------------------------------|
| 04 Match Pattern Architecture | Defines match_patterns and match_pattern_attributes semantics |
| 05 Calculation Instance Model | Defines calc_pattern_bindings, calc_instances, and resolution flow |
| 06 Time Window Framework | Defines time_windows schema and join semantics |
| 07 Detection Level Design | Defines detection_level_pattern usage in detection_models |
| 08 Resolution Priority Rules | Defines how match pattern attributes determine priority |
| 09 Unified Results Schema | Defines calc_results star schema, dimension tables, and indexes |
| 10 Scoring and Alerting Pipeline | Defines alert_traces, score_steps scoring logic |
| 11 Entity Relationship Graph | Defines the 8 entities referenced by sparse dimension columns |
| 14 Medallion Integration | Defines which medallion tier each table belongs to |
| 16 Lifecycle and Governance | Defines match_pattern_versions and change management |
| Appendix B | End-to-end worked examples with actual data flowing through these tables |
| Appendix C | Mapping from current JSON metadata to proposed table rows |
| Appendix D | Phased implementation roadmap for migrating to these tables |
