# UX Configuration Experience

**Document**: 15 of the Data Modeling Design Considerations series
**Audience**: Product Managers, UX Engineers, Sales, Clients
**Last updated**: 2026-03-09

---

## 1. Philosophy: No Manual Work

### If a Compliance Officer Needs to Write JSON or SQL, We Have Failed

The platform's metadata architecture (documents 04--14) is powerful because it compresses all surveillance configuration into a small number of composable primitives: match patterns, calculations, score step matrices, and thresholds. But architectural elegance means nothing if the people who need to use it --- compliance analysts, model risk officers, operations teams --- cannot configure it without engineering support.

The configuration experience is designed around a single principle: **every action that a user could take is guided, validated, and reversible, with no raw data manipulation required at any step.**

This means:

- **Everything is configurable through guided UI.** No JSON files to hand-edit. No SQL to write. No API calls to craft. Every configuration surface --- detection models, match patterns, calculations, scoring rules, thresholds, time windows --- has a dedicated wizard or editor with structured inputs, validation, and preview.

- **Popup wizards with smart defaults.** When a user creates a new detection model, the wizard pre-populates sensible defaults at every step: default detection level (product x account), default score template (volume_standard), default threshold (the median across existing models). The user can accept all defaults and have a working model in under a minute, then refine.

- **Progressive disclosure: simple first, advanced available.** The first screen of any wizard shows the minimum required fields. Advanced options (custom time windows, multi-entity detection levels, entity key overrides) are behind expandable sections, clearly labeled "Advanced." A compliance analyst who needs to create a straightforward model never sees the advanced options unless they choose to.

- **Auto-populated dropdowns from entity metadata.** Every picker in the system draws its options from the live entity metadata. When a user selects "product" as an entity, the attribute dropdown shows only product attributes. When they select "asset_class" as the attribute, the value picker shows `equity`, `fx`, `commodity`, `index`, `fixed_income` --- pulled directly from the entity's domain values, not hardcoded. If a new domain value is added (e.g., `crypto`), it appears in every picker automatically.

- **Impact preview before any change is committed.** Before saving any configuration change, the system shows exactly what will change: how many entities are affected, how many alerts would increase or decrease based on historical data, which downstream models reference the changed component. No change is ever a surprise.

This philosophy applies equally to a first-time setup and to ongoing tuning. Whether a client is onboarding with 50 detection models or a compliance analyst is adjusting a single threshold, the experience is the same: guided, validated, and transparent.

---

## 2. Configuration Flows

### 2.1 New Detection Model Wizard (8 Steps)

Creating a new detection model is the most complex configuration task in the platform. The wizard breaks it into eight sequential steps, each self-contained and reversible. The user can save progress at any step and return later.

#### Step 1: Name and Description

```
+------------------------------------------------------------+
|  New Detection Model                            Step 1 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Model Name:    [________________________]                   |
|  Description:   [________________________]                   |
|                 [________________________]                   |
|                                                              |
|  Regulation:    [MAR ▼]                                      |
|                                                              |
|  Suggested templates based on regulation:                    |
|   ○ Market Manipulation (MAR 12(1)(a))                       |
|   ○ Insider Dealing (MAR 14(a))                              |
|   ○ Wash Trading (MAR 12(2)(a))                              |
|   ○ Start from scratch                                       |
|                                                              |
|                                    [Cancel]  [Next →]        |
+------------------------------------------------------------+
```

The user enters a name and description in free text. Selecting a regulation from the dropdown generates template suggestions based on the regulatory framework mapping (document 13). Choosing a template pre-populates steps 2--6 with sensible defaults drawn from existing models in the same regulatory category.

Choosing "Start from scratch" leaves all subsequent steps at platform defaults.

#### Step 2: Detection Level

```
+------------------------------------------------------------+
|  Detection Level                                Step 2 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Select the entities that define the alert grain:            |
|                                                              |
|  ☑ product    ☐ execution    ☐ venue                         |
|  ☑ account    ☐ order        ☐ trader                        |
|                                                              |
|  Detection grain diagram:                                    |
|                                                              |
|    ┌─────────┐     ┌─────────┐                               |
|    │ product │ ──× │ account │                                |
|    │(group by│     │(group by│                                |
|    │ prod_id)│     │ acct_id)│                                |
|    └─────────┘     └─────────┘                               |
|                                                              |
|  Alert summary:                                              |
|  "One alert per unique (product, account) combination        |
|   per business date."                                        |
|                                                              |
|  Based on current data: ~3,800 unique combinations           |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The user selects one or more entities from a multi-select checklist. The entity options are drawn from the live entity registry (currently 8 entities). The default selection is product x account, which matches the most common surveillance pattern.

As entities are selected, the diagram updates in real time to show the grouping structure. The natural-language summary below the diagram explains the detection grain in plain English. The "Based on current data" indicator shows how many unique combinations exist in the current dataset, giving the user an immediate sense of alert volume.

Under the "Advanced" expandable section, users can select specific entity key fields instead of defaulting to the primary key (e.g., grouping by `trader.desk` instead of `trader.trader_id`).

#### Step 3: Classification

```
+------------------------------------------------------------+
|  Classification                                 Step 3 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Which data should this model analyze?                       |
|                                                              |
|  ○ All data (no filter)                                      |
|  ● Specific subset:                                          |
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │ Entity:     [product ▼]                                │  |
|  │ Attribute:  [asset_class ▼]                            │  |
|  │ Value:      [equity ▼]                                 │  |
|  │                                         [+ Add Rule]   │  |
|  └────────────────────────────────────────────────────────┘  |
|                                                              |
|  Active rules (AND logic):                                   |
|   • product.asset_class = "equity"                           |
|   • venue.country = "US"                                     |
|                                                              |
|  Preview: This matches 18 products, 142 accounts             |
|           (~2,556 unique combinations)                       |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The classification step uses the attribute picker pattern described in section 2.2 (Match Pattern Wizard). The entity dropdown shows all 8 entities. Selecting an entity filters the attribute dropdown to show only that entity's attributes that have defined domain values. Selecting an attribute populates the value dropdown with the actual domain values from the entity metadata.

Multiple rules compose as AND logic. Each rule is displayed as a readable predicate (`product.asset_class = "equity"`). The preview shows the live count of matching entities and combinations, so the user knows exactly what data the model will operate on before proceeding.

#### Step 4: Calculations

```
+------------------------------------------------------------+
|  Calculations                                   Step 4 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Drag calculations into the model:                           |
|                                                              |
|  Available Calculations:        Model Calculations:          |
|  ┌─────────────────────┐       ┌─────────────────────────┐  |
|  │ ◇ large_activity    │  -->  │ ■ vwap_proximity  [MUST]│  |
|  │ ◇ price_reversal    │       │ ■ quantity_match  [OPT] │  |
|  │ ◇ cancel_count      │       │ ■ large_activity  [OPT] │  |
|  │ ◇ order_imbalance   │       │                         │  |
|  │ ◇ spread_impact     │       │                         │  |
|  └─────────────────────┘       └─────────────────────────┘  |
|                                                              |
|  Calculation DAG:                                            |
|  vwap_proximity ──→ quantity_match ──→ [SCORE]               |
|       │                                   ↑                  |
|       └──── large_activity ───────────────┘                  |
|  (Dependencies auto-resolved: trade_value included)          |
|                                                              |
|  [+ Add existing calc]  [+ Create new calc]                  |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The left panel shows all available calculations from the calculation catalog, filterable by layer (Transaction, Time Window, Aggregation, Derived). The user drags calculations into the model panel on the right, or clicks "Add existing calc" to browse with filters.

For each calculation added, the user selects whether it is **MUST_PASS** (the model cannot generate an alert unless this calculation passes) or **OPTIONAL** (contributes a score component but does not block alerts). The toggle is a simple dropdown next to each calculation.

The DAG visualization updates in real time as calculations are added, showing dependencies between calculations. If a calculation depends on upstream calculations that are not yet in the model, the system auto-resolves them: it adds the dependency automatically and highlights it in the DAG with a note ("Dependencies auto-resolved").

The "Create new calc" button opens the Calculation Wizard (section 2.3) in a nested modal, allowing the user to define a new calculation inline without leaving the detection model wizard.

#### Step 5: Scoring

```
+------------------------------------------------------------+
|  Scoring                                        Step 5 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Configure score steps for each OPTIONAL calculation:        |
|                                                              |
|  ┌─ quantity_match ──────────────────────────────────────┐   |
|  │                                                       │   |
|  │  Template: [volume_standard ▼]                        │   |
|  │                                                       │   |
|  │  Available templates:                                 │   |
|  │   • volume_standard     (equities, general)           │   |
|  │   • volume_fx           (FX pairs, higher notional)   │   |
|  │   • ratio_graduated     (ratio-based, 0-1 scale)     │   |
|  │   • binary_threshold    (pass/fail, 0 or 10)          │   |
|  │   • sensitivity_linear  (linear 0-10)                 │   |
|  │   • percentile_bands    (quartile-based)              │   |
|  │   • custom              (define your own)             │   |
|  │                                                       │   |
|  │  Score distribution preview:                          │   |
|  │  ├─── 0 ──┤── 3 ──┤──── 7 ────┤── 10 ─┤             │   |
|  │  0     0.50     0.80       0.95      1.0              │   |
|  │                                                       │   |
|  │  Based on historical data:                            │   |
|  │   Score 0:  62% of results                            │   |
|  │   Score 3:  21% of results                            │   |
|  │   Score 7:   12% of results                           │   |
|  │   Score 10:  5% of results                            │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  ┌─ large_activity ──────────────────────────────────────┐   |
|  │  Template: [volume_standard ▼]                        │   |
|  │  ...                                                  │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

For each OPTIONAL calculation in the model, the scoring step presents a template picker with seven pre-built score templates. Selecting a template instantly shows the score distribution preview --- a visual range bar showing where the score boundaries fall and a histogram showing how historical data distributes across the score bands.

The "custom" template opens a visual editor where the user can drag score band boundaries on a slider, defining arbitrary ranges and point values. Every change updates the distribution preview in real time.

MUST_PASS calculations are not shown on this screen because they do not contribute a scored component --- they are binary gates.

#### Step 6: Thresholds

```
+------------------------------------------------------------+
|  Thresholds                                     Step 6 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Set the minimum combined score to generate an alert:        |
|                                                              |
|  Score Threshold:  [=====●==========]  7                     |
|                    0              20                          |
|                                                              |
|  Impact preview:                                             |
|  ┌──────────────────────────────────────────────────────┐    |
|  │  With threshold 7:                                   │    |
|  │   • ~42 alerts would be generated                    │    |
|  │   • Based on 3 months of historical data             │    |
|  │                                                      │    |
|  │  Comparison:                                         │    |
|  │   Threshold 5  → ~78 alerts   (+85%)                 │    |
|  │   Threshold 7  → ~42 alerts   (selected)             │    |
|  │   Threshold 10 → ~19 alerts   (-55%)                 │    |
|  │   Threshold 15 → ~6 alerts    (-86%)                 │    |
|  └──────────────────────────────────────────────────────┘    |
|                                                              |
|  Per-segment overrides (optional):                           |
|   [+ Add threshold override for specific segments]           |
|                                                              |
|  Example: asset_class=fx → threshold 12                      |
|           asset_class=fixed_income → threshold 5             |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The threshold step presents a slider for the overall model score threshold, with the impact preview updating in real time as the user adjusts the value. The comparison table shows alert counts at multiple threshold levels, giving the user an intuitive sense of the sensitivity curve.

The "Per-segment overrides" section allows the user to define asset-class-specific or entity-specific threshold overrides using the attribute picker. Each override creates a match pattern of type `threshold` (document 04, section 3.3) behind the scenes, but the user never sees the pattern structure --- they see a simple rule: "For equity instruments, use threshold 8 instead of 7."

#### Step 7: Review

```
+------------------------------------------------------------+
|  Review                                         Step 7 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Model: Equity Wash Trading - Enhanced                       |
|  Regulation: MAR 12(2)(a)                                    |
|                                                              |
|  Detection Level:  product × account                         |
|  Classification:   product.asset_class = "equity"            |
|                    venue.country = "US"                       |
|  Calculations:     3 (1 MUST_PASS, 2 OPTIONAL)               |
|  Score Templates:  volume_standard (×2)                      |
|  Threshold:        7 (override: fx=12, fixed_income=5)       |
|                                                              |
|  Estimated alerts: ~42 (based on 3 months historical)        |
|                                                              |
|  ┌──────────────────────────────────────────────────────┐    |
|  │  [▶ Test Run]                                        │    |
|  │                                                      │    |
|  │  Executes model against sample data and shows         │    |
|  │  preview alerts with full score breakdown.            │    |
|  └──────────────────────────────────────────────────────┘    |
|                                                              |
|  Configuration summary (expandable):                         |
|  ▸ Match patterns (3 patterns, 5 attribute rows)             |
|  ▸ Calculation bindings (3 bindings)                         |
|  ▸ Score step definitions (2 matrices)                       |
|  ▸ Threshold overrides (2 overrides + default)               |
|                                                              |
|                             [← Back]  [Cancel]  [Save →]     |
+------------------------------------------------------------+
```

The review step displays a readable summary of every configuration choice across all prior steps. Every section is expandable to show the underlying detail, but the default view is a concise, scannable overview.

The "Test Run" button executes the model's full detection pipeline against a sample dataset (the most recent 30 days of data, or a configurable sample window). The results are displayed as preview alerts with full score breakdowns, allowing the user to verify that the model behaves as expected before committing the configuration.

The expandable "Configuration summary" sections show the underlying data structures (match patterns, bindings, score steps) in a formatted, readable table --- not raw JSON. This gives advanced users visibility into exactly what will be written, while remaining approachable for business users.

#### Step 8: Save

```
+------------------------------------------------------------+
|  Save                                           Step 8 of 8 |
+------------------------------------------------------------+
|                                                              |
|  Ready to save "Equity Wash Trading - Enhanced"              |
|                                                              |
|  The following will be created:                              |
|                                                              |
|  ┌──────────────────────────────────────────────────────┐    |
|  │  NEW RESOURCES                                       │    |
|  │                                                      │    |
|  │  Match Patterns:                                     │    |
|  │   + ewt_enhanced_level      (detection_level)        │    |
|  │   + ewt_enhanced_class      (classification)         │    |
|  │   + ewt_enhanced_fx_thresh  (threshold override)     │    |
|  │                                                      │    |
|  │  Calculation Bindings:                               │    |
|  │   + vwap_proximity  → ewt_enhanced (MUST_PASS)       │    |
|  │   + quantity_match  → ewt_enhanced (OPTIONAL)        │    |
|  │   + large_activity  → ewt_enhanced (OPTIONAL)        │    |
|  │                                                      │    |
|  │  Score Steps:                                        │    |
|  │   + quantity_match_steps (from volume_standard)       │    |
|  │   + large_activity_steps (from volume_standard)      │    |
|  │                                                      │    |
|  │  Model Definition:                                   │    |
|  │   + ewt_enhanced (status: Draft)                     │    |
|  └──────────────────────────────────────────────────────┘    |
|                                                              |
|  Diff view:  [Show what changed ▸]                           |
|                                                              |
|  ☑ Save as Draft (requires approval to activate)             |
|                                                              |
|                             [← Back]  [Cancel]  [✓ Save]     |
+------------------------------------------------------------+
```

The save step shows a complete manifest of every resource that will be created: match patterns, calculation bindings, score step definitions, and the model definition itself. Each item is listed with its identifier, type, and source.

The "Show what changed" link opens a diff view showing the exact metadata that will be written, formatted as a side-by-side comparison (empty on the left, new configuration on the right). For modifications to existing models, this shows the before-and-after comparison.

New detection models are saved in **Draft** status by default. Activating a draft model requires approval from the Model Risk Committee (see section 6). This ensures that no model enters production without review, while allowing users to create and test models freely.

---

### 2.2 New Match Pattern Wizard (5 Steps)

Match patterns are the universal configuration primitive (document 04). The wizard abstracts the 3-column structure behind a guided flow.

#### Step 1: Pattern Type

```
+------------------------------------------------------------+
|  New Match Pattern                              Step 1 of 5 |
+------------------------------------------------------------+
|                                                              |
|  What kind of configuration does this pattern drive?         |
|                                                              |
|  ○ Detection Level  — defines alert grouping grain           |
|  ○ Classification   — filters which data a model analyzes    |
|  ○ Threshold        — resolves pass/fail limits              |
|  ○ Score            — selects scoring step matrices           |
|  ○ Setting          — resolves calculation parameters        |
|  ○ Time Window      — scopes time window computation         |
|                                                              |
|  Each type is explained with a one-line description.         |
|                                                              |
|                                    [Cancel]  [Next →]        |
+------------------------------------------------------------+
```

The six pattern types correspond directly to the `pattern_type` discriminator in the match patterns table (document 04, section 3). Each option includes a plain-language description --- no technical jargon. The user selects one.

#### Step 2: Entity Picker

```
+------------------------------------------------------------+
|  Entity Selection                               Step 2 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Select the entities this pattern targets:                   |
|                                                              |
|  ┌───────────────────────────────────────────────────────┐   |
|  │                                                       │   |
|  │  ┌─────────┐    ┌─────────┐    ┌─────────┐           │   |
|  │  │ product │────│execution│────│  order  │           │   |
|  │  │  (50)   │    │  (761)  │    │  (786)  │           │   |
|  │  └────┬────┘    └────┬────┘    └────┬────┘           │   |
|  │       │              │              │                 │   |
|  │       │         ┌────┴────┐    ┌────┴────┐           │   |
|  │       │         │  venue  │    │ trader  │           │   |
|  │       │         │   (6)   │    │  (50)   │           │   |
|  │       │         └─────────┘    └─────────┘           │   |
|  │  ┌────┴────┐                                         │   |
|  │  │ account │                                         │   |
|  │  │  (220)  │                                         │   |
|  │  └─────────┘                                         │   |
|  │                                                       │   |
|  │  Click an entity to select it.                        │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Selected: product                                           |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The entity picker displays the entity relationship diagram from the live entity registry (document 11). Entity boxes show the entity name and current row count. The user clicks an entity to select it. Multiple entities can be selected for stacked patterns (AND logic).

The relationship lines between entities show how they connect, making it clear which cross-entity combinations are valid for matching.

#### Step 3: Attribute Picker

```
+------------------------------------------------------------+
|  Attribute Selection                            Step 3 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Selected entity: product                                    |
|                                                              |
|  Choose an attribute:                                        |
|  ┌───────────────────────────────────────────────────────┐   |
|  │  asset_class       (5 values: equity, fx, ...)        │   |
|  │  instrument_type   (5 values: common_stock, ...)      │   |
|  │  exchange_mic      (6 values: XNYS, XNAS, ...)       │   |
|  │  currency          (8 values: USD, GBP, ...)          │   |
|  │  regulatory_scope  (5 values: EU, US, ...)            │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Only attributes with defined domain values are shown.       |
|  Attributes without domain values (e.g., free text fields)   |
|  are not eligible for match patterns.                        |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The attribute dropdown is filtered to show only attributes of the selected entity that have defined domain values. Free-text fields, timestamps, and numeric fields without enumerated values are excluded. Each attribute shows the count and preview of its domain values, so the user can evaluate which attribute is appropriate without needing to look elsewhere.

#### Step 4: Value Picker

```
+------------------------------------------------------------+
|  Value Selection                                Step 4 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Entity:     product                                         |
|  Attribute:  asset_class                                     |
|                                                              |
|  Select value(s):                                            |
|  ┌───────────────────────────────────────────────────────┐   |
|  │  ☑ equity          (18 products)                      │   |
|  │  ☐ fx              (12 products)                      │   |
|  │  ☐ commodity       (8 products)                       │   |
|  │  ☐ index           (7 products)                       │   |
|  │  ☐ fixed_income    (5 products)                       │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Selected: equity (18 products)                              |
|                                                              |
|  [+ Add another attribute rule]                              |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The value picker shows every domain value for the selected attribute, with a live count of how many entity instances have each value. This count is pulled from the actual data, not from metadata alone --- if a domain value exists in the schema but no data rows have it, the count shows `(0 products)`, alerting the user that the pattern would match nothing.

The "Add another attribute rule" button loops back to steps 2--4, allowing the user to stack additional attribute predicates. Each additional rule is an AND condition on the same pattern.

#### Step 5: Preview and Confirm

```
+------------------------------------------------------------+
|  Preview                                        Step 5 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Pattern: equity_us_classification                           |
|  Type: classification                                        |
|                                                              |
|  Rules:                                                      |
|   • product.asset_class = "equity"                           |
|   • venue.country = "US"                                     |
|                                                              |
|  Matches:                                                    |
|   • 18 products                                              |
|   • 3 venues (XNYS, XNAS, XCBF)                             |
|   • 412 executions in last 30 days                           |
|                                                              |
|  Sample matching records:                                    |
|  ┌────────────┬─────────────┬───────┬──────────┐             |
|  │ product_id │ asset_class │  MIC  │ country  │             |
|  ├────────────┼─────────────┼───────┼──────────┤             |
|  │ AAPL       │ equity      │ XNYS  │ US       │             |
|  │ MSFT       │ equity      │ XNAS  │ US       │             |
|  │ TSLA       │ equity      │ XNAS  │ US       │             |
|  │ ...        │ ...         │ ...   │ ...      │             |
|  └────────────┴─────────────┴───────┴──────────┘             |
|                                                              |
|                             [← Back]  [Cancel]  [✓ Save]     |
+------------------------------------------------------------+
```

The preview shows the complete pattern definition in human-readable form, the live count of matching entities, and a sample table of matching records. The user confirms that the pattern captures the intended data subset before saving.

---

### 2.3 New Calculation Wizard (5 Steps)

Calculations are the computational building blocks of detection models. The wizard guides the user through defining a new calculation from layer selection through testing.

#### Step 1: Layer Selection

```
+------------------------------------------------------------+
|  New Calculation                                Step 1 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Select the calculation layer:                               |
|                                                              |
|  ○ Transaction      Raw per-trade computations               |
|                      (e.g., trade_value, price_deviation)    |
|                                                              |
|  ○ Time Window      Aggregations over time periods           |
|                      (e.g., volume_30min, cancel_rate_1h)    |
|                                                              |
|  ○ Aggregation      Cross-record summaries                   |
|                      (e.g., total_volume, avg_price)         |
|                                                              |
|  ○ Derived          Computed from other calculations         |
|                      (e.g., vwap_proximity, quantity_match)  |
|                                                              |
|                                    [Cancel]  [Next →]        |
+------------------------------------------------------------+
```

The four layers correspond to the calculation hierarchy (document 05). Each layer includes a plain-language description and examples from existing calculations. The layer selection determines which input options are available in the next step.

#### Step 2: Input Definition

```
+------------------------------------------------------------+
|  Inputs                                         Step 2 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Layer: Derived                                              |
|                                                              |
|  Define inputs for this calculation:                         |
|                                                              |
|  ┌───────────────────────────────────────────────────────┐   |
|  │  Input 1: [Entity field ▼]                            │   |
|  │    Entity:    [execution ▼]                           │   |
|  │    Field:     [quantity ▼]                             │   |
|  │                                                       │   |
|  │  Input 2: [Upstream calculation ▼]                    │   |
|  │    Calculation: [vwap_proximity ▼]                    │   |
|  │    Output field: [proximity_score ▼]                  │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Dependency graph:                                           |
|  execution.quantity ──┐                                      |
|                       ├──→ [new_calc]                        |
|  vwap_proximity ──────┘                                      |
|                                                              |
|  [+ Add input]                                               |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

Inputs can be entity fields (from any entity in the data model) or outputs from upstream calculations. The dependency picker shows available calculations and their output fields, ensuring type-safe composition. The dependency graph updates as inputs are added, showing the calculation's position in the overall DAG.

#### Step 3: Formula Editor

```
+------------------------------------------------------------+
|  Formula                                        Step 3 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Write the calculation formula:                              |
|                                                              |
|  ┌───────────────────────────────────────────────────────┐   |
|  │  SELECT                                               │   |
|  │    ABS(buy_vwap - sell_vwap) / NULLIF(sell_vwap, 0)   │   |
|  │    AS vwap_proximity                                  │   |
|  │  FROM {inputs}                                        │   |
|  │                                                       │   |
|  │  ▌                                                    │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Editor features:                                            |
|   • Autocomplete for table names, column names               |
|   • Syntax highlighting                                      |
|   • Inline error indicators                                  |
|   • Reference to available inputs (from step 2)              |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

The formula editor uses Monaco (the same editor that powers VS Code) with SQL autocomplete configured against the platform's actual table and column names. Available inputs from step 2 are registered as autocomplete tokens. Syntax errors are highlighted inline.

For common formula patterns, a template library is available (accessible via a "Templates" button) with pre-built formulas for ratios, deviations, moving averages, and other standard surveillance calculations.

#### Step 4: Parameters

```
+------------------------------------------------------------+
|  Parameters                                     Step 4 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Define configurable parameters:                             |
|                                                              |
|  ┌───────────────────────────────────────────────────────┐   |
|  │  Parameter 1:                                         │   |
|  │    Name:     [vwap_threshold]                         │   |
|  │    Source:   ○ Literal value  ● Setting reference      │   |
|  │    Setting:  [wash_vwap_threshold ▼]                  │   |
|  │    Default:  [0.02]                                   │   |
|  │                                                       │   |
|  │  Parameter 2:                                         │   |
|  │    Name:     [lookback_days]                          │   |
|  │    Source:   ● Literal value  ○ Setting reference      │   |
|  │    Value:    [30]                                     │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  [+ Add parameter]                                           |
|                                                              |
|  Parameters sourced from settings inherit the full           |
|  resolution chain: entity key → multi-attribute →            |
|  single-attribute → default.                                 |
|                                                              |
|                             [← Back]  [Cancel]  [Next →]     |
+------------------------------------------------------------+
```

Parameters are the values that can vary by context --- thresholds, multipliers, lookback periods. Each parameter can be either a literal value (hardcoded) or a reference to a setting (which participates in the resolution chain described in document 12).

Setting-referenced parameters inherit the full match-pattern-based resolution: if a setting has overrides for specific asset classes, venues, or entity instances, the calculation automatically uses the most specific matching value at runtime. The wizard explains this in plain language.

#### Step 5: Test

```
+------------------------------------------------------------+
|  Test                                           Step 5 of 5 |
+------------------------------------------------------------+
|                                                              |
|  Execute calculation against sample data:                    |
|                                                              |
|  Sample window: [Last 7 days ▼]   [▶ Run Test]              |
|                                                              |
|  Results:                                                    |
|  ┌──────────┬──────────┬────────────┬──────────────┐         |
|  │ product  │ account  │   result   │    status    │         |
|  ├──────────┼──────────┼────────────┼──────────────┤         |
|  │ AAPL     │ ACC-001  │   0.0087   │  ✓ Computed  │         |
|  │ MSFT     │ ACC-003  │   0.0142   │  ✓ Computed  │         |
|  │ TSLA     │ ACC-007  │   NULL     │  ○ No data   │         |
|  │ ...      │ ...      │   ...      │  ...         │         |
|  └──────────┴──────────┴────────────┴──────────────┘         |
|                                                              |
|  Summary: 2,847 records computed, 12 nulls, 0 errors        |
|                                                              |
|                             [← Back]  [Cancel]  [✓ Save]     |
+------------------------------------------------------------+
```

The test step executes the calculation formula against a configurable sample window of actual data. Results are displayed in a table with computed values and status indicators. The summary row shows total counts, null results (which may indicate missing input data), and errors (which indicate formula problems).

If errors occur, the user can navigate back to step 3 to fix the formula, then re-run the test --- all without losing any other configuration.

---

### 2.4 Threshold and Score Configuration

Threshold and score adjustments are the most frequent configuration changes in day-to-day operations. The platform provides streamlined editors for these changes that do not require the full wizard flow.

#### Threshold Editor

```
+------------------------------------------------------------+
|  Threshold Configuration                                     |
+------------------------------------------------------------+
|                                                              |
|  Setting: wash_score_threshold                               |
|  Current default: 10                                         |
|                                                              |
|  ┌─ Default ─────────────────────────────────────────────┐   |
|  │  Value: [========●===========]  10                    │   |
|  │         0                  20                          │   |
|  │                                                       │   |
|  │  Impact: Currently 14 alerts.                         │   |
|  │          With new value: 14 alerts (no change)        │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  ┌─ Overrides ───────────────────────────────────────────┐   |
|  │                                                       │   |
|  │  asset_class = equity    →  8   (18 alerts)           │   |
|  │  asset_class = fx        → 12   (6 alerts)            │   |
|  │  product_id = AAPL       →  6   (3 alerts)            │   |
|  │                                                       │   |
|  │  [+ Add override]                                     │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Impact preview:                                             |
|  "This threshold is used by 3 models:                        |
|   wash_full_day, wash_intraday, spoofing_layering.           |
|   Changing the default affects 42 products across             |
|   4 jurisdictions."                                          |
|                                                              |
|                                    [Cancel]  [✓ Save]        |
+------------------------------------------------------------+
```

The threshold editor shows the current default value with a slider, all existing overrides with their match conditions, and the live impact preview. Adjusting the slider updates the impact preview in real time.

#### Score Step Editor

```
+------------------------------------------------------------+
|  Score Step Configuration                                    |
+------------------------------------------------------------+
|                                                              |
|  Setting: quantity_match_score_steps                         |
|  Template: volume_standard                                   |
|                                                              |
|  Visual range editor:                                        |
|  ┌───────────────────────────────────────────────────────┐   |
|  │                                                       │   |
|  │  Score 0    Score 3    Score 7      Score 10           │   |
|  │  ├────────┤├─────────┤├───────────┤├────────┤         │   |
|  │  0      0.50       0.80         0.95      1.0         │   |
|  │         ↕           ↕             ↕                    │   |
|  │    (drag to adjust boundaries)                        │   |
|  │                                                       │   |
|  │  Distribution (historical data):                      │   |
|  │  ████████████████░░░░░░░░░░░▒▒▒▒▒▒▓▓▓                │   |
|  │    62%          21%        12%    5%                   │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                              |
|  Override: asset_class = "equity"                            |
|  Applies to 42 products matching this pattern                |
|                                                              |
|                                    [Cancel]  [✓ Save]        |
+------------------------------------------------------------+
```

The score step editor provides a visual range editor where score band boundaries can be dragged. The histogram below shows how historical data distributes across the bands, updating in real time as boundaries move. This gives the user an intuitive understanding of how boundary changes affect alert distribution --- without requiring them to reason about numbers in a table.

---

## 3. Reuse and Composition

One of the platform's defining advantages is that configuration components are designed for reuse. A match pattern defined once can be referenced by any number of calculations, models, and settings. The configuration UI makes reuse discoverable and effortless.

### Pattern Library

The pattern library is a searchable catalog of all existing match patterns across the platform. Users can:

- **Browse by type**: filter to show only classification patterns, or only threshold patterns, or all types.
- **Search by entity or attribute**: "show me all patterns that reference product.asset_class."
- **Clone and modify**: select an existing pattern, click "Clone," and the wizard opens with all fields pre-populated. Change one attribute value and save as a new pattern.
- **View usage**: each pattern shows how many models, calculations, and settings reference it, with click-through links to each consumer.

### Calculation Catalog

The calculation catalog lists all available calculations with rich filtering:

- **Filter by layer**: Transaction, Time Window, Aggregation, Derived.
- **Filter by input entity**: "show me calculations that use execution fields."
- **Filter by output type**: numeric, boolean, categorical.
- **Usage indicator**: "Used by N models" badge on each calculation. Heavily-used calculations are flagged as "Core" --- changing them has wide impact.
- **Dependency view**: click any calculation to see its upstream dependencies and downstream consumers in a visual DAG.

### Template Gallery

Score templates are pre-built score step matrices that encode common scoring patterns:

| Template | Description | Typical Use |
|---|---|---|
| `volume_standard` | Linear bands for standard volume metrics | Equities, general surveillance |
| `volume_fx` | Higher notional thresholds for FX markets | FX pairs, cross-currency |
| `ratio_graduated` | 0--1 scale with graduated sensitivity | Ratio-based calculations (quantity match, VWAP proximity) |
| `binary_threshold` | Pass/fail only (0 or 10 points) | MUST_PASS gate checks |
| `sensitivity_linear` | Linear 0--10 scale with even distribution | General-purpose, exploratory |
| `percentile_bands` | Quartile-based boundaries from historical data | Data-driven threshold setting |
| `custom` | User-defined boundaries | Any non-standard requirement |

Each template shows a preview distribution chart based on historical data, so the user can evaluate which template fits their data profile before selecting it.

### "Similar to..." Suggestions

When a user begins creating a new configuration component, the system analyzes existing components and suggests starting points:

- **New detection model**: "This model is similar to wash_full_day. Want to start from that configuration?" Based on matching regulation, detection level, and calculation overlap.
- **New match pattern**: "3 existing patterns match product.asset_class = equity. Want to clone one?" Based on matching entity/attribute/value combinations.
- **New calculation**: "This formula is structurally similar to vwap_proximity. Want to review that calculation first?" Based on formula pattern matching.

Suggestions reduce configuration time and promote consistency across the platform.

### Dependency Visualization

Before modifying any shared component (a pattern used by multiple models, a calculation referenced by several detection models), the system displays a dependency graph:

```
                    ┌─────────────────┐
                    │ equity_class    │
                    │ (classification)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼────────┐ ┌───▼────────────┐
     │ wash_full_day  │ │ wash_intra │ │ spoofing       │
     │ (model)        │ │ (model)    │ │ (model)        │
     └────────────────┘ └────────────┘ └────────────────┘
```

The graph makes it immediately clear what will be affected by a change, preventing accidental side effects across models.

---

## 4. Impact Preview (Before Any Save)

Every configuration change in the platform --- whether creating a new model, adjusting a threshold, modifying a score matrix, or editing a match pattern --- passes through an impact preview before being committed. The preview is not optional; it is built into the save flow of every editor and wizard.

### What the Impact Preview Shows

**Entity and row impact.** How many entities and data rows are affected by the change. For a new classification pattern, this is the count of matching products and accounts. For a threshold adjustment, this is the number of entity combinations whose detection outcome would change.

**Alert volume change.** Based on the most recent historical data window (configurable, default 90 days), the preview computes how many alerts would be generated with the new configuration versus the current configuration. The result is displayed as a simple comparison:

```
  Current configuration:  42 alerts
  Proposed configuration: 67 alerts  (+59%)
```

**Side-by-side comparison.** For threshold and score changes, a before-and-after table shows the specific alerts that would change status:

```
  ┌──────────┬──────────┬────────┬────────┬────────────────┐
  │ product  │ account  │ score  │ before │     after      │
  ├──────────┼──────────┼────────┼────────┼────────────────┤
  │ AAPL     │ ACC-042  │  8.5   │ Alert  │ Alert          │
  │ MSFT     │ ACC-017  │  6.2   │ —      │ NEW Alert      │
  │ TSLA     │ ACC-003  │  5.8   │ —      │ NEW Alert      │
  │ JPM      │ ACC-091  │  4.1   │ —      │ —              │
  └──────────┴──────────┴────────┴────────┴────────────────┘
```

**Affected models.** If the changed component is shared across models, the preview lists every consuming model:

```
  This pattern is used by 3 models:
   • wash_full_day (14 alerts currently)
   • wash_intraday (8 alerts currently)
   • spoofing_layering (6 alerts currently)
```

**Risk assessment.** For changes that affect thresholds or scoring, the preview includes a jurisdictional impact summary:

```
  Jurisdictional impact:
   • US (MAR + Dodd-Frank): 28 alerts → 41 alerts
   • EU (MAR + MiFID II):   11 alerts → 19 alerts
   • UK (MAR):              3 alerts → 7 alerts
```

This ensures that a threshold change intended for one market does not inadvertently flood another jurisdiction's compliance team with new alerts.

---

## 5. Lifecycle Indicators (Visible in All Configuration UIs)

Every configuration component in the platform carries lifecycle metadata that is visible wherever that component appears --- in wizards, editors, catalogs, dependency graphs, and detail panels.

### Version History

Every match pattern, calculation, score step matrix, and detection model maintains a full version history. The version panel is an expandable section available on every configuration screen:

```
  ▾ Version History
  ┌─────────┬──────────────┬─────────────────┬─────────────────┐
  │ Version │    Date      │   Modified By   │    Summary      │
  ├─────────┼──────────────┼─────────────────┼─────────────────┤
  │  v3     │ 2026-03-08   │ J. Chen         │ Threshold 10→8  │
  │  v2     │ 2026-02-15   │ S. Patel        │ Added FX override│
  │  v1     │ 2026-01-10   │ M. Rodriguez    │ Initial creation │
  └─────────┴──────────────┴─────────────────┴─────────────────┘
```

Each version is clickable, showing a diff of what changed between versions. This provides a complete audit trail for regulatory inquiries.

### Last Modified Indicator

Every configuration component displays "Last modified by [name] on [date]" in its header or detail panel. This is always visible, not hidden behind a menu.

### Dependency Count Badge

A badge reading "Used by N models" appears on every match pattern, calculation, and setting. Clicking the badge reveals the list of consuming models with links. Components with high dependency counts are visually distinguished (e.g., bold text or a colored badge), signaling that changes to these components have broad impact and warrant extra caution.

### Alert Impact Badge

A live-computed badge reading "Would affect N alerts" appears on thresholds and score configurations. This count is refreshed periodically against the most recent data window. It gives the user an at-a-glance sense of the component's operational significance.

### Status Badge

Every configuration component carries a status:

| Status | Meaning | Visual |
|---|---|---|
| **Draft** | Created but not yet active. Can be tested but does not generate production alerts. | Grey badge |
| **Active** | Currently in use by the detection engine. | Green badge |
| **Deprecated** | Marked for removal. Still functional but flagged in all UIs. | Amber badge with strikethrough |
| **Under Review** | Pending approval from a supervisor or committee. | Blue badge with clock icon |

Status transitions follow the governance rules in section 6 and are logged in the audit trail.

### Regulatory Hold Indicator

Components that are referenced by an active investigation or regulatory inquiry display a locked icon. While locked, the component cannot be modified without override authorization. This prevents accidental changes to configuration that is subject to regulatory scrutiny.

---

## 6. Self-Service vs. Supervised Workflows

Not all configuration changes carry the same risk. Creating a new match pattern is low-risk and reversible; changing a model's score threshold affects live alert generation and has regulatory implications. The platform distinguishes between self-service actions (immediate, no approval required) and supervised actions (queued for approval).

### Approval Matrix

| Action | Self-Service | Requires Approval | Approver |
|---|---|---|---|
| Create new match pattern (classification, setting, time_window) | Yes | No | --- |
| Create new match pattern (threshold, score) | No | Yes | Compliance Officer |
| Adjust threshold values | No | Yes | Compliance Officer |
| Create new detection model | No | Yes | Model Risk Committee |
| Clone existing model | Yes | No | --- |
| Modify score steps | No | Yes | Compliance Officer |
| Add new calculation | No | Yes | Data Engineering |
| Change detection level | No | Yes | Model Risk Committee |
| Modify classification pattern | Yes | No | --- |
| Delete/deprecate a component | No | Yes | Component Owner + Compliance |

### How Approval Works

When a user saves a supervised action, the change is persisted in **Draft** status and a notification is sent to the designated approver. The approver sees:

1. The complete impact preview (section 4) showing what the change affects.
2. The diff between current configuration and proposed configuration.
3. The user's justification (entered as a required field on save).
4. The test results, if the user ran a test (e.g., the "Test Run" from the detection model wizard).

The approver can:
- **Approve**: the change transitions to Active status and takes effect.
- **Reject**: the change returns to the author with feedback. The draft is preserved so the author can modify and resubmit.
- **Request changes**: the approver adds comments, and the change remains in Draft status for revision.

All approval actions are logged in the audit trail with timestamp, approver identity, and decision rationale.

### Escalation

If an approval has been pending for more than 48 hours, the system sends a reminder. If pending for more than 5 business days, it escalates to the approver's manager. Escalation thresholds are configurable per action type.

---

## 7. Mobile and Quick Access

### Dashboard Widget: Recent Configuration Changes

The platform dashboard includes a widget showing the most recent configuration changes across all users. Each entry shows the component name, change type, author, and timestamp. Clicking an entry navigates directly to the component's detail view.

```
  ┌─ Recent Configuration Changes ─────────────────────────┐
  │                                                         │
  │  ● wash_vwap_threshold    Threshold 10→8   J. Chen      │
  │    2 hours ago            ✓ Approved                    │
  │                                                         │
  │  ● mpr_fx_classification  New pattern      S. Patel     │
  │    5 hours ago            ✓ Self-service                │
  │                                                         │
  │  ● spoofing_model_v2      New model        M. Rodriguez │
  │    1 day ago              ◷ Pending approval            │
  │                                                         │
  │  [View all →]                                           │
  └─────────────────────────────────────────────────────────┘
```

### Alert Impact Notifications

When upstream configuration changes affect a user's area of responsibility, the system sends proactive notifications:

- "The wash_vwap_threshold was changed from 10 to 8 by J. Chen. Your equity portfolio is expected to see ~12 additional alerts per week."
- "A new detection model (spoofing_v2) was activated. Your US equity desk will be covered starting tomorrow."

Notifications are delivered in-app and optionally via email, configurable per user.

### Quick Threshold Adjuster

For the most common operational task --- adjusting a threshold --- the platform provides a quick access panel accessible from any alert list or model detail view:

```
  ┌─ Quick Adjust ─────────────────────────────┐
  │                                             │
  │  wash_score_threshold: [====●=====] 8       │
  │  Impact: 14 → 18 alerts  (+29%)             │
  │                                             │
  │  [Submit for Approval]                      │
  └─────────────────────────────────────────────┘
```

The quick adjuster shows the slider, the live impact preview, and a single "Submit for Approval" button. No navigation, no wizard, no multi-step flow. For compliance analysts who need to respond quickly to market conditions, this eliminates friction.

### Approval Queue

Approvers have a dedicated queue showing all pending changes awaiting their review:

```
  ┌─ Pending Approvals ────────────────────────────────────┐
  │                                                         │
  │  1. spoofing_model_v2        New model    M. Rodriguez  │
  │     Submitted: 1 day ago     Impact: ~28 new alerts     │
  │     [Review →]                                          │
  │                                                         │
  │  2. mpr_threshold_adjust     Threshold    A. Kim        │
  │     Submitted: 3 hours ago   Impact: +12 alerts         │
  │     [Review →]                                          │
  │                                                         │
  │  3 items pending (0 overdue)                            │
  └─────────────────────────────────────────────────────────┘
```

The queue is prioritized by submission age (oldest first) and shows the impact summary for each pending change, so approvers can triage effectively.

---

## Cross-References

| Document | Relationship to This Document |
|---|---|
| 04 Match Pattern Architecture | The 3-column structure that all wizards abstract. Entity picker, attribute picker, and value picker all generate match pattern rows. |
| 05 Calculation Instance Model | Calculation wizard creates calculation definitions and bindings. |
| 06 Time Window Framework | Time window patterns are configurable through the match pattern wizard (pattern type = time_window). |
| 07 Detection Level Design | Detection level step in the model wizard generates detection_level match patterns. |
| 08 Resolution Priority Rules | Priority is computed automatically from attribute count --- the UI never exposes manual priority. |
| 10 Scoring and Alerting Pipeline | Score step templates and the visual range editor drive score matrix configuration. |
| 11 Entity Relationship Graph | Entity picker displays the live entity relationship diagram. |
| 12 Settings Resolution | Threshold and setting editors use the resolution chain for override display. |
| 13 Regulatory Compliance Mapping | Regulation selector in the model wizard maps to regulatory frameworks. |
| 16 Lifecycle and Governance | Status badges, approval workflows, and audit trail described here are governed by lifecycle rules. |
