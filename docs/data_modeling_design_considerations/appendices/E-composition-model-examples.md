# Appendix E -- Composition Model Examples

**Audience**: Business Users, Data Engineers, Financial Modelers
**Last updated**: 2026-03-10

This appendix provides comprehensive worked examples of the composition model at multiple
audience levels. Each section is self-contained but builds on concepts from earlier sections.
The examples use actual calculations, settings, and match patterns from the Risk Case Manager
platform.

**Key concept introduced here:** Within a single calculation instance, different settings can
have values at different match pattern granularity levels. For example, an equity instance
might have `wash_vwap_threshold` varying by instrument type (call_option=0.018, etf=0.012,
default=0.015) while `large_activity_score_steps` stays at the asset-class level. This
per-value pattern matching is the refined composition model.

---

## Table of Contents

1. [Core Concept Examples](#1-core-concept-examples)
   - 1.1 [Setting Definitions — Pure Metadata](#11-setting-definitions--pure-metadata)
   - 1.2 [Calculation Definitions — Runtime-Agnostic Formulas](#12-calculation-definitions--runtime-agnostic-formulas)
   - 1.3 [Match Patterns — Reusable Predicates at Multiple Levels](#13-match-patterns--reusable-predicates-at-multiple-levels)
   - 1.4 [Required Settings — Calc Declares What It Needs](#14-required-settings--calc-declares-what-it-needs)
   - 1.5 [Calculation Instances — The Composition Point](#15-calculation-instances--the-composition-point)
   - 1.6 [Instance Setting Values — Per-Value Pattern Matching](#16-instance-setting-values--per-value-pattern-matching)
   - 1.7 [Score Steps — Graduated Scoring with Levels](#17-score-steps--graduated-scoring-with-levels)
   - 1.8 [Score Thresholds — Alert Firing Decisions](#18-score-thresholds--alert-firing-decisions)
2. [Integrated Examples (Business-Focused)](#2-integrated-examples-business-focused)
   - 2.1 [Equity Wash Detection — Multi-Setting, Multi-Score](#21-equity-wash-detection--multi-setting-multi-score)
   - 2.2 [Fixed Income — Different Instrument-Type Breakdown](#22-fixed-income--different-instrument-type-breakdown)
   - 2.3 [Default Fallback Chain — When Nothing Matches](#23-default-fallback-chain--when-nothing-matches)
   - 2.4 [Full Scoring Pipeline — Instance to Alert](#24-full-scoring-pipeline--instance-to-alert)
3. [Technical Implementation Examples](#3-technical-implementation-examples)
   - 3.1 [ID Naming Conventions](#31-id-naming-conventions)
   - 3.2 [Complete Table Data — Wash Detection Ecosystem](#32-complete-table-data--wash-detection-ecosystem)
   - 3.3 [Resolution Queries (SQL)](#33-resolution-queries-sql)
   - 3.4 [FK Relationship Diagram](#34-fk-relationship-diagram)
4. [Expansion Points](#4-expansion-points)
   - 4.1 [Detection Levels — Per-Calculation Grain](#41-detection-levels--per-calculation-grain)
   - 4.2 [Reserved: Temporal Instance Versioning](#42-reserved-temporal-instance-versioning)
   - 4.3 [Reserved: Cross-Entity Pattern Composition](#43-reserved-cross-entity-pattern-composition)
   - 4.4 [Reserved: Multi-Model Instance Sharing](#44-reserved-multi-model-instance-sharing)
5. [Cross-References](#5-cross-references)

---

## 1. Core Concept Examples

Each subsection introduces one concept in isolation with a self-contained example.

### 1.1 Setting Definitions — Pure Metadata

A setting definition declares *what kind of parameter* this is. It contains no values.

**Example: Three setting definitions**

| setting_id | name | value_type | description |
|---|---|---|---|
| `wash_vwap_threshold` | VWAP Proximity Threshold | `decimal` | VWAP proximity threshold for wash trading detection. Trades within this percentage of VWAP are suspicious. |
| `large_activity_score_steps` | Large Activity Score Steps | `score_steps` | Graduated scoring tiers for large trading activity based on notional value. |
| `cancel_count_threshold` | Cancel Count Threshold | `integer` | Minimum cancellation count within a time window to trigger spoofing detection. |

**What's present:** Identity (setting_id, name), type (value_type), description.

**What's absent:** No `default` value. No `overrides`. No `match_type`. The definition says "this is a decimal called VWAP Proximity Threshold" but does *not* say what the decimal's value is.

**Why this matters:** The same setting definition can be referenced by multiple calculations. Each calculation instance supplies its own values through `instance_setting_values`. The definition is a pure template — a contract saying "I accept a decimal" without specifying which decimal.

See: Document 12, Section 4.1; Appendix A, Section 2.3.

---

### 1.2 Calculation Definitions — Runtime-Agnostic Formulas

A calculation definition declares *what to compute*. It contains the formula template, DAG dependencies, and output schema — but no concrete parameter values.

**Example: Two calculation definitions**

| calc_id | name | layer | formula_type | formula (abbreviated) | depends_on |
|---|---|---|---|---|---|
| `wash_detection` | Wash Detection | `derived` | `sql` | `CASE WHEN ... qty_match > 0.5 AND vwap < $vwap_threshold ...` | `[large_trading_activity, vwap_calc]` |
| `large_trading_activity` | Large Trading Activity | `derived` | `sql` | `CASE WHEN total_value > avg_daily * $activity_multiplier ...` | `[trading_activity_aggregation]` |

**Key observations:**

- `$vwap_threshold` and `$activity_multiplier` are **placeholders** — they will be filled by values from `instance_setting_values` at runtime.
- The formula is runtime-agnostic: the same SQL template works regardless of which asset class or instrument type the calculation is applied to.
- `depends_on` defines DAG edges: `wash_detection` cannot run until `large_trading_activity` and `vwap_calc` have completed.

**What a hypothetical non-SQL calculation might look like:**

| calc_id | formula_type | formula |
|---|---|---|
| `ml_anomaly_score` | `code` | `backend.ml.anomaly_detector:compute_score` |

The `formula_type` discriminator tells the engine which executor to invoke: `sql` → DuckDB query, `code` → Python function, `flink` → streaming job.

See: Document 05, Section 6; Appendix A, Section 2.4.

---

### 1.3 Match Patterns — Reusable Predicates at Multiple Levels

Match patterns are reusable, typed predicates composed of entity-attribute-value rows. They carry NO values — they are pure filters that describe *for whom* something applies.

**Example: Six patterns forming a specificity hierarchy**

**`match_patterns` table:**

| pattern_id | pattern_type | label |
|---|---|---|
| `pat_default` | `setting` | Default (all) |
| `pat_equity` | `setting` | Equity |
| `pat_equity_call` | `setting` | Equity Call Options |
| `pat_equity_etf` | `setting` | Equity ETFs |
| `pat_equity_nyse` | `setting` | Equity on NYSE |
| `pat_fixed_income` | `setting` | Fixed Income |

**`match_pattern_attributes` table:**

| attribute_id | pattern_id | entity | entity_attribute | attribute_value |
|---|---|---|---|---|
| (none) | `pat_default` | — | — | — |
| `mpa_eq_ac` | `pat_equity` | `product` | `asset_class` | `equity` |
| `mpa_eq_call_ac` | `pat_equity_call` | `product` | `asset_class` | `equity` |
| `mpa_eq_call_it` | `pat_equity_call` | `product` | `instrument_type` | `call_option` |
| `mpa_eq_etf_ac` | `pat_equity_etf` | `product` | `asset_class` | `equity` |
| `mpa_eq_etf_it` | `pat_equity_etf` | `product` | `instrument_type` | `etf` |
| `mpa_eq_nyse_ac` | `pat_equity_nyse` | `product` | `asset_class` | `equity` |
| `mpa_eq_nyse_mic` | `pat_equity_nyse` | `product` | `exchange_mic` | `XNYS` |
| `mpa_fi_ac` | `pat_fixed_income` | `product` | `asset_class` | `fixed_income` |

**Specificity hierarchy:**

```
pat_default           0 attributes   → matches everything (universal fallback)
  └─ pat_equity       1 attribute    → asset_class = equity
       ├─ pat_equity_call   2 attributes  → asset_class = equity AND instrument_type = call_option
       ├─ pat_equity_etf    2 attributes  → asset_class = equity AND instrument_type = etf
       └─ pat_equity_nyse   2 attributes  → asset_class = equity AND exchange_mic = XNYS
  └─ pat_fixed_income 1 attribute    → asset_class = fixed_income
```

**Zero-attribute default:** `pat_default` has NO attribute rows. It matches every context. This is how the "default value" concept is represented — not as a special field, but as a match pattern that always wins at the lowest priority level.

**Attribute count = priority:** A 2-attribute pattern is always more specific than a 1-attribute pattern. No manual priority numbers needed — specificity is intrinsic.

See: Document 04, Sections 2-4; Appendix A, Sections 2.1-2.2.

---

### 1.4 Required Settings — Calc Declares What It Needs

The `calc_required_settings` table is a junction table: it declares which settings a calculation requires and what placeholder name each maps to in the formula.

**Example:**

| calc_id | setting_id | param_name |
|---|---|---|
| `wash_detection` | `wash_vwap_threshold` | `vwap_threshold` |
| `large_trading_activity` | `large_activity_multiplier` | `activity_multiplier` |
| `trend_window` | `trend_sensitivity` | `trend_multiplier` |
| `business_date_window` | `business_date_cutoff` | `cutoff_time` |

**Reading the first row:** "The `wash_detection` calculation requires the `wash_vwap_threshold` setting and uses it as the `$vwap_threshold` placeholder in its formula."

**What about literal parameters?** Parameters with fixed values (like `qty_threshold = 0.5` in `wash_detection`) are NOT in this table. They remain inline in the formula. Only setting-sourced parameters that vary by context appear here.

**Multi-setting calculations:** A calculation can require multiple settings. For example, if `wash_detection` also required `quantity_match_score_steps`, there would be two rows:

| calc_id | setting_id | param_name |
|---|---|---|
| `wash_detection` | `wash_vwap_threshold` | `vwap_threshold` |
| `wash_detection` | `quantity_match_score_steps` | `qty_score_steps` |

See: Document 05, Section 6; Appendix A, Section 2.5.

---

### 1.5 Calculation Instances — The Composition Point

A calculation instance is where a calculation definition meets a match pattern. It is the composition point that enables "one formula, many contexts."

**Example: Six instances of `wash_detection`**

| instance_id | calc_id | pattern_id | window_id |
|---|---|---|---|
| `inst_wash_default` | `wash_detection` | `pat_default` | NULL |
| `inst_wash_equity` | `wash_detection` | `pat_equity` | NULL |
| `inst_wash_equity_nyse` | `wash_detection` | `pat_equity_nyse` | NULL |
| `inst_wash_aapl` | `wash_detection` | `pat_aapl` | NULL |
| `inst_wash_fixed_income` | `wash_detection` | `pat_fixed_income` | NULL |
| `inst_wash_index` | `wash_detection` | `pat_index` | NULL |

**Key observations:**

- Each instance pairs the same calculation (`wash_detection`) with a different match pattern.
- The `pat_default` instance serves as the universal fallback — it matches any context where no more specific instance applies.
- `window_id` is NULL here because wash detection is not scoped to a specific time window type. Time-window-specific instances (e.g., trend detection with a specific window) would set this field.
- Instances carry no parameter values directly — values are in `instance_setting_values`.

**Instance selection at runtime:** When the engine processes a candidate row with context `{asset_class: "equity", exchange_mic: "XNYS"}`, it evaluates all instances of `wash_detection` and selects the best match:

```
inst_wash_aapl           → pat_aapl (product_id=AAPL)       → no match → skip
inst_wash_equity_nyse    → pat_equity_nyse (2 attributes)   → matches  → priority 2
inst_wash_equity         → pat_equity (1 attribute)         → matches  → priority 1
inst_wash_fixed_income   → pat_fixed_income (1 attribute)   → no match → skip
inst_wash_index          → pat_index (1 attribute)          → no match → skip
inst_wash_default        → pat_default (0 attributes)       → matches  → priority 0

Winner: inst_wash_equity_nyse (most specific match)
```

See: Document 05, Sections 5-6; Appendix A, Section 3.3.

---

### 1.6 Instance Setting Values — Per-Value Pattern Matching

This is the KEY section. Instance setting values store the concrete parameter values — and each value has its own `pattern_id`, enabling per-value granularity within a single instance.

**The refined model:**

```sql
CREATE TABLE instance_setting_values (
  instance_id      VARCHAR NOT NULL,    -- FK → calc_instances
  setting_id       VARCHAR NOT NULL,    -- FK → setting_definitions
  param_name       VARCHAR NOT NULL,    -- matches calc_required_settings.param_name
  pattern_id       VARCHAR NOT NULL,    -- FK → match_patterns (per-value granularity)
  param_value      JSON NOT NULL,       -- the actual concrete value
  PRIMARY KEY (instance_id, setting_id, param_name, pattern_id)
);
```

**Example: The equity instance with per-value variation**

| instance_id | setting_id | param_name | pattern_id | param_value |
|---|---|---|---|---|
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity` | `0.015` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_call` | `0.018` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_etf` | `0.012` |
| `inst_wash_equity` | `large_activity_score_steps` | `score_steps` | `pat_equity` | `[{"min":0,"max":25000,"score":0},{"min":25000,"max":100000,"score":3},{"min":100000,"max":500000,"score":7},{"min":500000,"max":null,"score":10}]` |

**What this data says:**

- The `wash_vwap_threshold` setting has THREE values within the equity instance, at three different granularity levels:
  - `pat_equity` (1 attribute: asset_class=equity) → 0.015 (general equity fallback)
  - `pat_equity_call` (2 attributes: asset_class=equity AND instrument_type=call_option) → 0.018
  - `pat_equity_etf` (2 attributes: asset_class=equity AND instrument_type=etf) → 0.012
- The `large_activity_score_steps` setting has ONE value, at the asset-class level only: `pat_equity` → the equity-specific score steps.

**Why different granularities?**

- **VWAP threshold varies by instrument type** because different instrument types have inherently different price behaviors relative to VWAP. Call options deviate more from underlying VWAP (0.018 = wider), ETFs track VWAP closely (0.012 = tighter), and generic equities use a middle value (0.015).
- **Score steps stay at the asset-class level** because the notional value tiers ($25K, $100K, $500K) are appropriate for all equity instrument types. There is no business reason to have different score steps for call options vs. ETFs.

**Resolution walkthrough 1: Call option context**

Context: `{asset_class: "equity", instrument_type: "call_option"}`

| Setting | Available patterns | Matching patterns | Best match | Value |
|---|---|---|---|---|
| `wash_vwap_threshold` | `pat_equity` (1 attr), `pat_equity_call` (2 attrs), `pat_equity_etf` (2 attrs) | `pat_equity` (1 match), `pat_equity_call` (2 matches) | `pat_equity_call` (most specific) | **0.018** |
| `large_activity_score_steps` | `pat_equity` (1 attr) | `pat_equity` (1 match) | `pat_equity` | **[{min:0,max:25000,...}]** |

**Resolution walkthrough 2: Common stock context**

Context: `{asset_class: "equity", instrument_type: "common_stock"}`

| Setting | Available patterns | Matching patterns | Best match | Value |
|---|---|---|---|---|
| `wash_vwap_threshold` | `pat_equity` (1 attr), `pat_equity_call` (2 attrs), `pat_equity_etf` (2 attrs) | `pat_equity` only (call/etf don't match) | `pat_equity` (only match) | **0.015** |
| `large_activity_score_steps` | `pat_equity` (1 attr) | `pat_equity` (1 match) | `pat_equity` | **[{min:0,max:25000,...}]** |

**Business impact:** The call option gets a wider VWAP threshold (0.018) because options inherently deviate from underlying VWAP — a 1.8% proximity is still suspicious for a call. The common stock gets the standard equity threshold (0.015). ETFs get a tighter threshold (0.012) because they track their benchmark closely. All share the same equity-level score steps because notional value tiers don't differ by instrument type.

See: Document 05, Section 6; Document 12, Section 4.4; Appendix A, Section 3.4.

---

### 1.7 Score Steps — Graduated Scoring with Levels

Score steps map raw calculation output values to risk scores using graduated tiers. Each tier defines a range and an associated score.

**Example: Default large activity score steps (4 tiers)**

| min_value | max_value | score | label |
|---|---|---|---|
| 0 | 10,000 | 0 | Normal |
| 10,000 | 100,000 | 3 | Elevated |
| 100,000 | 500,000 | 7 | Significant |
| 500,000 | NULL (infinity) | 10 | Extreme |

**Equity override (stored as `instance_setting_values` with `pat_equity`):**

| min_value | max_value | score | label |
|---|---|---|---|
| 0 | 25,000 | 0 | Normal equity volume |
| 25,000 | 100,000 | 3 | Elevated |
| 100,000 | 500,000 | 7 | Significant |
| 500,000 | NULL (infinity) | 10 | Extreme |

**What changed:** The equity override raises the minimum notional from $10,000 to $25,000 before scoring begins. This reflects higher baseline trading volumes in equity markets — a $15,000 equity trade is normal, but a $15,000 fixed income trade might be elevated.

**JSON vs. normalized table:** Score steps can be stored in two ways:

1. **As JSON in `instance_setting_values.param_value`** (current approach for settings):
   ```json
   [{"min": 0, "max": 25000, "score": 0}, {"min": 25000, "max": 100000, "score": 3}, ...]
   ```

2. **As rows in the normalized `score_steps` table** (for pattern-scoped scoring):
   Each tier is a separate row with `(step_id, pattern_id, calc_id, min_value, max_value, score, label)`.

Both representations are semantically equivalent. The normalized table supports SQL-based scoring queries; the JSON representation supports programmatic score evaluation via the `evaluate_score()` method.

**Score evaluation example:**

Input: `total_value = 75,000` for an equity context.

```
Step 1: [0, 25000)  → 75,000 >= 25,000? Yes → not in range → next
Step 2: [25000, 100000) → 75,000 >= 25,000 AND 75,000 < 100,000? Yes → score = 3
```

Result: score = 3 (Elevated).

See: Document 10, Sections 1-2; Document 12, Section 2.2.

---

### 1.8 Score Thresholds — Alert Firing Decisions

Score thresholds determine whether an accumulated score is high enough to generate an alert. Like other settings, thresholds vary by asset class.

**Example: `wash_score_threshold`**

| Context | Threshold | Rationale |
|---|---|---|
| Default | 10 | Standard threshold |
| Equity | 8 | Lower threshold — equity wash trading is easier to detect |
| FX | 12 | Higher threshold — FX market structure produces more false positives |
| Fixed Income | 8 | Lower threshold — fixed income wash trades are significant |
| Index | 7 | Lowest threshold — index manipulation has outsized market impact |

**Alert firing decision:**

```
accumulated_score = sum of all calculation scores for this candidate
score_threshold   = resolved threshold for this entity context

IF accumulated_score >= score_threshold THEN
    alert_fired = TRUE
    trigger_path = 'score_based'
ELSE
    alert_fired = FALSE
    trigger_path = 'none'
END
```

**Business impact:** For the same accumulated score of 9:
- An equity candidate (threshold 8) → **alert fires** (9 >= 8)
- An FX candidate (threshold 12) → **no alert** (9 < 12)
- An index candidate (threshold 7) → **alert fires** (9 >= 7)

This per-asset-class calibration ensures the right sensitivity for each market segment.

See: Document 10, Sections 3-5; Document 12, Section 2.3.

---

## 2. Integrated Examples (Business-Focused)

These examples compose multiple concepts from Section 1 into realistic multi-step scenarios.

### 2.1 Equity Wash Detection — Multi-Setting, Multi-Score

**Scenario:** Evaluate a potential wash trade for a call option traded on NYSE.

**Entity context:**
```
product_id:      PRD-007
asset_class:     equity
instrument_type: call_option
exchange_mic:    XNYS
account_id:      ACC-042
trader_id:       TRD-015
business_date:   2026-03-09
```

**Step 1 — Instance selection:**

The engine finds all `wash_detection` instances and selects the best match for this context:

| Instance | Pattern | Attributes | Match? | Priority |
|---|---|---|---|---|
| `inst_wash_equity_nyse` | `pat_equity_nyse` | asset_class=equity, exchange_mic=XNYS | Yes (2/2) | 2 |
| `inst_wash_equity` | `pat_equity` | asset_class=equity | Yes (1/1) | 1 |
| `inst_wash_default` | `pat_default` | (none) | Yes (0/0) | 0 |

**Winner:** `inst_wash_equity_nyse` (2 matching attributes).

But wait — `inst_wash_equity_nyse` might have fewer per-value settings configured than `inst_wash_equity`. This is by design: the instance defines the *scope*, and the per-value pattern matching within `instance_setting_values` handles the granularity. If `inst_wash_equity_nyse` has a `vwap_threshold` value with `pat_equity_nyse`, it uses that. If not, the engine falls back to the next-best instance.

**Step 2 — Per-value resolution within the selected instance:**

Assuming `inst_wash_equity_nyse` has values configured:

| Setting | param_name | pattern_id | param_value | Why |
|---|---|---|---|---|
| `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_nyse` | `0.012` | NYSE equity-specific tight threshold |

**Step 3 — Score step resolution:**

For scoring, the engine resolves `large_activity_score_steps` and `quantity_match_score_steps`:

| Score Setting | Resolved from instance | Value |
|---|---|---|
| `large_activity_score_steps` | `inst_wash_equity` (with `pat_equity`) | Equity-specific steps: [0→25K=0, 25K→100K=3, 100K→500K=7, 500K+=10] |
| `quantity_match_score_steps` | Default (no override) | Default steps: [0→0.5=0, 0.5→0.8=3, 0.8→0.95=7, 0.95+=10] |

**Step 4 — Score threshold resolution:**

The `wash_score_threshold` for context `{asset_class: "equity"}` resolves to **8**.

**Full scoring breakdown for a candidate row:**

| Calculation | Computed Value | Score Steps | Score |
|---|---|---|---|
| `large_trading_activity` | $85,000 | [0→25K=0, 25K→100K=**3**, 100K→500K=7, 500K+=10] | **3** |
| `wash_detection` (qty match) | 0.92 | [0→0.5=0, 0.5→0.8=3, 0.8→0.95=**7**, 0.95+=10] | **7** |
| `wash_detection` (vwap prox) | 0.008 | [0→0.005=10, 0.005→0.01=**7**, 0.01→0.02=3, 0.02+=0] | **7** |

**Accumulated score:** 3 + 7 + 7 = **17**
**Threshold:** 8
**Decision:** 17 >= 8 → **ALERT FIRES** (trigger_path = 'score_based')

---

### 2.2 Fixed Income — Different Instrument-Type Breakdown

**Scenario:** Fixed income instruments need their own per-value pattern hierarchy, similar to equities.

**Patterns for fixed income:**

| pattern_id | Attributes | Description |
|---|---|---|
| `pat_fixed_income` | asset_class=fixed_income | All fixed income |
| `pat_fi_bond` | asset_class=fixed_income, instrument_type=bond | Government/corporate bonds |
| `pat_fi_note` | asset_class=fixed_income, instrument_type=note | Medium-term notes |

**Instance setting values for `inst_wash_fixed_income`:**

| setting_id | param_name | pattern_id | param_value | Rationale |
|---|---|---|---|---|
| `wash_vwap_threshold` | `vwap_threshold` | `pat_fixed_income` | `0.01` | General fixed income threshold |
| `wash_vwap_threshold` | `vwap_threshold` | `pat_fi_bond` | `0.008` | Bonds trade in very tight spreads |
| `wash_vwap_threshold` | `vwap_threshold` | `pat_fi_note` | `0.012` | Notes have slightly wider spreads |

**Pattern reuse:** `pat_fi_bond` can be reused across ANY setting that needs bond-specific values — it is not tied to `wash_vwap_threshold`. If a new setting `cancel_count_threshold` needs bond-specific configuration, it references the same `pat_fi_bond` pattern.

**Resolution for a bond (context: `{asset_class: "fixed_income", instrument_type: "bond"}`):**
- `wash_vwap_threshold`: `pat_fi_bond` matches (2 attrs) → **0.008**

**Resolution for a convertible (context: `{asset_class: "fixed_income", instrument_type: "convertible"}`):**
- `wash_vwap_threshold`: only `pat_fixed_income` matches (1 attr) → **0.01** (fallback)

---

### 2.3 Default Fallback Chain — When Nothing Matches

**Scenario:** A commodity futures contract arrives. No commodity-specific instance exists for `wash_detection`.

**Entity context:**
```
asset_class:     commodity
instrument_type: futures
exchange_mic:    XCME
```

**Instance selection cascade:**

```
                         ALL wash_detection instances
                                    |
           +------------+-----------+----------+-----------+
           |            |           |          |           |
    inst_wash_equity  inst_wash_   inst_wash_ inst_wash_ inst_wash_
    (pat_equity)      equity_nyse  aapl       fi         index
           |            |           |          |           |
    asset_class=    asset_class=  product=  asset_class= asset_class=
    equity          equity,XNYS   AAPL      fixed_income index
           |            |           |          |           |
    NO MATCH        NO MATCH    NO MATCH   NO MATCH    NO MATCH
                                    |
                         inst_wash_default
                         (pat_default = 0 attributes)
                                    |
                              ALWAYS MATCHES
                                    |
                         Winner: inst_wash_default
```

**Per-value resolution within `inst_wash_default`:**

| setting_id | param_name | pattern_id | param_value |
|---|---|---|---|
| `wash_vwap_threshold` | `vwap_threshold` | `pat_default` | `0.02` |

The default instance provides the fallback value. No special "default" keyword needed — it is simply the instance with the zero-attribute pattern that matches everything.

**Full resolution chain (ASCII flowchart):**

```
Context: {asset_class: "commodity", instrument_type: "futures"}
   |
   v
[1] Try all instances of wash_detection
   |
   +---> inst_wash_equity?     Match pat_equity?    asset_class=equity ≠ commodity → SKIP
   +---> inst_wash_fi?         Match pat_fi?        asset_class=fixed_income ≠ commodity → SKIP
   +---> inst_wash_index?      Match pat_index?     asset_class=index ≠ commodity → SKIP
   +---> inst_wash_default     Match pat_default?   0 attributes → ALWAYS MATCH → SELECT
   |
   v
[2] Instance selected: inst_wash_default
   |
   v
[3] Resolve each required setting within inst_wash_default:
   |
   +---> wash_vwap_threshold: pat_default → 0.02
   +---> (other settings resolved similarly)
   |
   v
[4] Substitute $vwap_threshold = 0.02 into SQL template
   |
   v
[5] Execute wash_detection with commodity-default parameters
```

---

### 2.4 Full Scoring Pipeline — Instance to Alert

**Scenario:** One candidate row flows through the entire pipeline, from instance selection to alert decision.

**Candidate:** Trader TRD-015, Account ACC-042, Product PRD-007 (equity common stock), Business Date 2026-03-09.

**Raw data:**
- Total notional value: $125,000
- Buy/sell quantity match ratio: 0.88
- VWAP proximity: 0.011

**Pipeline stage 1 — Instance selection:**

Context: `{asset_class: "equity", instrument_type: "common_stock"}`

Selected instance: `inst_wash_equity` (pat_equity matches, 1 attribute).

**Pipeline stage 2 — Per-value resolution:**

| Setting | Available patterns | Best match | Value |
|---|---|---|---|
| `wash_vwap_threshold` | pat_equity, pat_equity_call, pat_equity_etf | pat_equity (only 1 matches common_stock) | **0.015** |
| `large_activity_score_steps` | pat_equity | pat_equity | **[0→25K=0, 25K→100K=3, 100K→500K=7, 500K+=10]** |
| `quantity_match_score_steps` | pat_default | pat_default | **[0→0.5=0, 0.5→0.8=3, 0.8→0.95=7, 0.95+=10]** |

**Pipeline stage 3 — Score step evaluation:**

| Metric | Raw Value | Score Steps | Range Matched | Score |
|---|---|---|---|---|
| Total value | $125,000 | equity large_activity steps | [100K, 500K) | **7** |
| Qty match ratio | 0.88 | default qty_match steps | [0.8, 0.95) | **7** |
| VWAP proximity | 0.011 | default vwap_proximity steps | [0.01, 0.02) | **3** |

**Pipeline stage 4 — Score accumulation:**

Accumulated score = 7 + 7 + 3 = **17**

**Pipeline stage 5 — Threshold comparison:**

Equity wash_score_threshold = **8**

17 >= 8 → **ALERT FIRES**

**Business impact — what if it were a different instrument type?**

For the SAME raw data but with `instrument_type: "call_option"`:
- vwap_threshold resolves to **0.018** (from `pat_equity_call`)
- VWAP proximity 0.011 < 0.018 → still suspicious → same score (3)
- Accumulated score: still 17 → alert still fires

For the SAME raw data but with `instrument_type: "etf"`:
- vwap_threshold resolves to **0.012** (from `pat_equity_etf`)
- VWAP proximity 0.011 < 0.012 → still suspicious → same score (3)
- Accumulated score: still 17 → alert still fires

But if the VWAP proximity were 0.014:
- For common stock (threshold 0.015): 0.014 < 0.015 → suspicious → score 3
- For call option (threshold 0.018): 0.014 < 0.018 → suspicious → score 3
- For ETF (threshold 0.012): 0.014 > 0.012 → NOT suspicious → score 0
- ETF accumulated score: 7 + 7 + 0 = 14 → still fires (14 >= 8)

The per-value pattern matching provides precisely calibrated sensitivity without requiring separate instances for every instrument type combination.

---

## 3. Technical Implementation Examples

These examples target data engineers building or maintaining the composition model.

### 3.1 ID Naming Conventions

All IDs in the composition model follow predictable naming conventions:

**Instances:** `inst_{calc_short}_{scope}`

| ID | Calculation | Scope |
|---|---|---|
| `inst_wash_default` | wash_detection | default (zero-attribute) |
| `inst_wash_equity` | wash_detection | equity asset class |
| `inst_wash_equity_nyse` | wash_detection | equity on NYSE |
| `inst_wash_aapl` | wash_detection | AAPL product-specific |
| `inst_wash_fixed_income` | wash_detection | fixed income asset class |
| `inst_trend_equity` | trend_window | equity asset class |
| `inst_trend_fx` | trend_window | FX asset class |

**Patterns:** `pat_{scope}[_{sub}]`

| ID | Scope | Sub-scope | Attributes |
|---|---|---|---|
| `pat_default` | default | — | 0 |
| `pat_equity` | equity | — | 1 (asset_class) |
| `pat_equity_call` | equity | call_option | 2 (asset_class + instrument_type) |
| `pat_equity_etf` | equity | etf | 2 (asset_class + instrument_type) |
| `pat_equity_nyse` | equity | NYSE | 2 (asset_class + exchange_mic) |
| `pat_fixed_income` | fixed_income | — | 1 (asset_class) |
| `pat_fi_bond` | fixed_income | bond | 2 (asset_class + instrument_type) |
| `pat_aapl` | AAPL | — | 1 (product_id) |

**Primary key composition rules:**

| Table | PK | Cardinality |
|---|---|---|
| `match_patterns` | `(pattern_id)` | 1 row per pattern |
| `match_pattern_attributes` | `(attribute_id)` | N rows per pattern |
| `setting_definitions` | `(setting_id)` | 1 row per setting |
| `calc_definitions` | `(calc_id)` | 1 row per calculation |
| `calc_required_settings` | `(calc_id, param_name)` | N settings per calc |
| `calc_instances` | `(instance_id)` | 1 per (calc, pattern) |
| `instance_setting_values` | `(instance_id, setting_id, param_name, pattern_id)` | N per instance × N patterns |
| `model_calculations` | `(model_id, calc_id)` | N calcs per model |
| `score_steps` | `(step_id)` | N steps per (pattern, calc) |

---

### 3.2 Complete Table Data — Wash Detection Ecosystem

Every table, every row, with proper IDs and FK references for the wash detection use case.

#### match_patterns (8 rows)

| pattern_id | pattern_type | label | layer | status |
|---|---|---|---|---|
| `pat_default` | `setting` | Default (all) | `oob` | `active` |
| `pat_equity` | `setting` | Equity | `oob` | `active` |
| `pat_equity_call` | `setting` | Equity Call Options | `oob` | `active` |
| `pat_equity_etf` | `setting` | Equity ETFs | `oob` | `active` |
| `pat_equity_nyse` | `setting` | Equity on NYSE | `oob` | `active` |
| `pat_fixed_income` | `setting` | Fixed Income | `oob` | `active` |
| `pat_index` | `setting` | Index | `oob` | `active` |
| `pat_aapl` | `setting` | AAPL Product-Specific | `oob` | `active` |

#### match_pattern_attributes (12 rows)

| attribute_id | pattern_id | entity | entity_attribute | attribute_value |
|---|---|---|---|---|
| *(pat_default has zero rows — that is the zero-attribute fallback)* | | | | |
| `mpa_eq_ac` | `pat_equity` | `product` | `asset_class` | `equity` |
| `mpa_eq_call_ac` | `pat_equity_call` | `product` | `asset_class` | `equity` |
| `mpa_eq_call_it` | `pat_equity_call` | `product` | `instrument_type` | `call_option` |
| `mpa_eq_etf_ac` | `pat_equity_etf` | `product` | `asset_class` | `equity` |
| `mpa_eq_etf_it` | `pat_equity_etf` | `product` | `instrument_type` | `etf` |
| `mpa_eq_nyse_ac` | `pat_equity_nyse` | `product` | `asset_class` | `equity` |
| `mpa_eq_nyse_mic` | `pat_equity_nyse` | `product` | `exchange_mic` | `XNYS` |
| `mpa_fi_ac` | `pat_fixed_income` | `product` | `asset_class` | `fixed_income` |
| `mpa_idx_ac` | `pat_index` | `product` | `asset_class` | `index` |
| `mpa_aapl_pid` | `pat_aapl` | `product` | `product_id` | `AAPL` |

*(11 attribute rows + pat_default with 0 rows = 12 logical entries)*

#### setting_definitions (4 rows)

| setting_id | name | value_type | version |
|---|---|---|---|
| `wash_vwap_threshold` | VWAP Proximity Threshold | `decimal` | `1.0.0` |
| `large_activity_score_steps` | Large Activity Score Steps | `score_steps` | `1.0.0` |
| `quantity_match_score_steps` | Quantity Match Score Steps | `score_steps` | `1.0.0` |
| `wash_score_threshold` | Wash Score Threshold | `decimal` | `1.0.0` |

#### calc_definitions (2 rows relevant to wash)

| calc_id | name | layer | formula_type | depends_on |
|---|---|---|---|---|
| `wash_detection` | Wash Detection | `derived` | `sql` | `[large_trading_activity, vwap_calc]` |
| `large_trading_activity` | Large Trading Activity | `derived` | `sql` | `[trading_activity_aggregation]` |

#### calc_required_settings (4 rows)

| calc_id | setting_id | param_name |
|---|---|---|
| `wash_detection` | `wash_vwap_threshold` | `vwap_threshold` |
| `wash_detection` | `large_activity_score_steps` | `score_steps` |
| `wash_detection` | `quantity_match_score_steps` | `qty_score_steps` |
| `large_trading_activity` | `large_activity_multiplier` | `activity_multiplier` |

#### calc_instances (6 rows)

| instance_id | calc_id | pattern_id | window_id | version |
|---|---|---|---|---|
| `inst_wash_default` | `wash_detection` | `pat_default` | NULL | `1.0.0` |
| `inst_wash_equity` | `wash_detection` | `pat_equity` | NULL | `1.0.0` |
| `inst_wash_equity_nyse` | `wash_detection` | `pat_equity_nyse` | NULL | `1.0.0` |
| `inst_wash_aapl` | `wash_detection` | `pat_aapl` | NULL | `1.0.0` |
| `inst_wash_fixed_income` | `wash_detection` | `pat_fixed_income` | NULL | `1.0.0` |
| `inst_wash_index` | `wash_detection` | `pat_index` | NULL | `1.0.0` |

#### instance_setting_values (18 rows with pattern_id)

| instance_id | setting_id | param_name | pattern_id | param_value |
|---|---|---|---|---|
| `inst_wash_default` | `wash_vwap_threshold` | `vwap_threshold` | `pat_default` | `0.02` |
| `inst_wash_default` | `large_activity_score_steps` | `score_steps` | `pat_default` | `[{"min":0,"max":10000,"score":0},{"min":10000,"max":100000,"score":3},{"min":100000,"max":500000,"score":7},{"min":500000,"max":null,"score":10}]` |
| `inst_wash_default` | `quantity_match_score_steps` | `qty_score_steps` | `pat_default` | `[{"min":0,"max":0.5,"score":0},{"min":0.5,"max":0.8,"score":3},{"min":0.8,"max":0.95,"score":7},{"min":0.95,"max":null,"score":10}]` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity` | `0.015` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_call` | `0.018` |
| `inst_wash_equity` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_etf` | `0.012` |
| `inst_wash_equity` | `large_activity_score_steps` | `score_steps` | `pat_equity` | `[{"min":0,"max":25000,"score":0},{"min":25000,"max":100000,"score":3},{"min":100000,"max":500000,"score":7},{"min":500000,"max":null,"score":10}]` |
| `inst_wash_equity` | `quantity_match_score_steps` | `qty_score_steps` | `pat_equity` | `[{"min":0,"max":0.5,"score":0},{"min":0.5,"max":0.8,"score":3},{"min":0.8,"max":0.95,"score":7},{"min":0.95,"max":null,"score":10}]` |
| `inst_wash_equity_nyse` | `wash_vwap_threshold` | `vwap_threshold` | `pat_equity_nyse` | `0.012` |
| `inst_wash_aapl` | `wash_vwap_threshold` | `vwap_threshold` | `pat_aapl` | `0.01` |
| `inst_wash_fixed_income` | `wash_vwap_threshold` | `vwap_threshold` | `pat_fixed_income` | `0.01` |
| `inst_wash_fixed_income` | `large_activity_score_steps` | `score_steps` | `pat_fixed_income` | `[{"min":0,"max":10000,"score":0},{"min":10000,"max":100000,"score":3},{"min":100000,"max":500000,"score":7},{"min":500000,"max":null,"score":10}]` |
| `inst_wash_fixed_income` | `quantity_match_score_steps` | `qty_score_steps` | `pat_fixed_income` | `[{"min":0,"max":0.5,"score":0},{"min":0.5,"max":0.8,"score":3},{"min":0.8,"max":0.95,"score":7},{"min":0.95,"max":null,"score":10}]` |
| `inst_wash_index` | `wash_vwap_threshold` | `vwap_threshold` | `pat_index` | `0.015` |
| `inst_wash_index` | `large_activity_score_steps` | `score_steps` | `pat_index` | `[{"min":0,"max":10000,"score":0},{"min":10000,"max":100000,"score":3},{"min":100000,"max":500000,"score":7},{"min":500000,"max":null,"score":10}]` |
| `inst_wash_index` | `quantity_match_score_steps` | `qty_score_steps` | `pat_index` | `[{"min":0,"max":0.5,"score":0},{"min":0.5,"max":0.8,"score":3},{"min":0.8,"max":0.95,"score":7},{"min":0.95,"max":null,"score":10}]` |

*(Note: instances without explicit values for a setting inherit from the default instance during resolution)*

#### model_calculations (3 rows for wash_full_day)

| model_id | calc_id | strictness | value_field | score_steps_setting | ordinal |
|---|---|---|---|---|---|
| `wash_full_day` | `large_trading_activity` | `MUST_PASS` | `primary_value` | `large_activity_score_steps` | 1 |
| `wash_full_day` | `wash_detection` | `OPTIONAL` | `primary_value` | `quantity_match_score_steps` | 2 |
| `wash_full_day` | `wash_detection` | `OPTIONAL` | `secondary_value` | `vwap_proximity_score_steps` | 3 |

#### score_steps (normalized, 16 rows for default pattern)

| step_id | pattern_id | calc_id | min_value | max_value | score | label |
|---|---|---|---|---|---|---|
| `ss_la_def_1` | `pat_default` | `large_trading_activity` | 0 | 10000 | 0 | Normal |
| `ss_la_def_2` | `pat_default` | `large_trading_activity` | 10000 | 100000 | 3 | Elevated |
| `ss_la_def_3` | `pat_default` | `large_trading_activity` | 100000 | 500000 | 7 | Significant |
| `ss_la_def_4` | `pat_default` | `large_trading_activity` | 500000 | NULL | 10 | Extreme |
| `ss_la_eq_1` | `pat_equity` | `large_trading_activity` | 0 | 25000 | 0 | Normal equity volume |
| `ss_la_eq_2` | `pat_equity` | `large_trading_activity` | 25000 | 100000 | 3 | Elevated |
| `ss_la_eq_3` | `pat_equity` | `large_trading_activity` | 100000 | 500000 | 7 | Significant |
| `ss_la_eq_4` | `pat_equity` | `large_trading_activity` | 500000 | NULL | 10 | Extreme |
| `ss_qm_def_1` | `pat_default` | `wash_detection` | 0 | 0.5 | 0 | Normal ratio |
| `ss_qm_def_2` | `pat_default` | `wash_detection` | 0.5 | 0.8 | 3 | Moderate match |
| `ss_qm_def_3` | `pat_default` | `wash_detection` | 0.8 | 0.95 | 7 | High match |
| `ss_qm_def_4` | `pat_default` | `wash_detection` | 0.95 | NULL | 10 | Near-perfect match |
| `ss_vp_def_1` | `pat_default` | `wash_detection` | 0 | 0.005 | 10 | Extremely close to VWAP |
| `ss_vp_def_2` | `pat_default` | `wash_detection` | 0.005 | 0.01 | 7 | Very close |
| `ss_vp_def_3` | `pat_default` | `wash_detection` | 0.01 | 0.02 | 3 | Moderately close |
| `ss_vp_def_4` | `pat_default` | `wash_detection` | 0.02 | NULL | 0 | Not close |

---

### 3.3 Resolution Queries (SQL)

Four production-grade DuckDB queries demonstrating the composition model in action.

#### (a) Instance Selection — Best-Matching Instance for Context

```sql
-- Given a context {asset_class: 'equity', instrument_type: 'call_option'},
-- find the best-matching wash_detection instance.

WITH instance_match_scores AS (
    SELECT
        ci.instance_id,
        ci.pattern_id,
        COUNT(mpa.attribute_id) AS attr_count,
        -- Check if ALL pattern attributes match the context
        COUNT(mpa.attribute_id) FILTER (WHERE
            (mpa.entity_attribute = 'asset_class' AND mpa.attribute_value = 'equity')
            OR (mpa.entity_attribute = 'instrument_type' AND mpa.attribute_value = 'call_option')
            OR (mpa.entity_attribute = 'exchange_mic' AND mpa.attribute_value = NULL)  -- placeholder
        ) AS matched_count
    FROM calc_instances ci
    LEFT JOIN match_pattern_attributes mpa ON ci.pattern_id = mpa.pattern_id
    WHERE ci.calc_id = 'wash_detection'
    GROUP BY ci.instance_id, ci.pattern_id
)
SELECT
    instance_id,
    pattern_id,
    attr_count,
    matched_count
FROM instance_match_scores
WHERE matched_count = attr_count  -- ALL attributes must match
   OR attr_count = 0              -- zero-attribute default always matches
ORDER BY attr_count DESC          -- most specific first
LIMIT 1;

-- Result:
-- instance_id      | pattern_id | attr_count | matched_count
-- inst_wash_equity | pat_equity | 1          | 1
```

#### (b) Per-Value Pattern Resolution — Best Value Within Instance

```sql
-- Given instance inst_wash_equity and context {asset_class: 'equity',
-- instrument_type: 'call_option'}, resolve the best value for wash_vwap_threshold.

WITH value_match_scores AS (
    SELECT
        isv.pattern_id,
        isv.param_value,
        COUNT(mpa.attribute_id) AS attr_count,
        COUNT(mpa.attribute_id) FILTER (WHERE
            (mpa.entity_attribute = 'asset_class' AND mpa.attribute_value = 'equity')
            OR (mpa.entity_attribute = 'instrument_type' AND mpa.attribute_value = 'call_option')
        ) AS matched_count
    FROM instance_setting_values isv
    LEFT JOIN match_pattern_attributes mpa ON isv.pattern_id = mpa.pattern_id
    WHERE isv.instance_id = 'inst_wash_equity'
      AND isv.setting_id = 'wash_vwap_threshold'
      AND isv.param_name = 'vwap_threshold'
    GROUP BY isv.pattern_id, isv.param_value
)
SELECT
    pattern_id,
    param_value,
    attr_count,
    matched_count
FROM value_match_scores
WHERE matched_count = attr_count  -- ALL attributes must match
   OR attr_count = 0              -- zero-attribute always matches
ORDER BY attr_count DESC          -- most specific first
LIMIT 1;

-- Result:
-- pattern_id      | param_value | attr_count | matched_count
-- pat_equity_call | 0.018       | 2          | 2
```

#### (c) Full Instance Composition — All Values for an Instance

```sql
-- Load the complete resolved state of inst_wash_equity: all settings,
-- all values, with their pattern granularity.

SELECT
    ci.instance_id,
    ci.calc_id,
    cd.name AS calc_name,
    isv.setting_id,
    sd.name AS setting_name,
    sd.value_type,
    isv.param_name,
    isv.pattern_id  AS value_pattern,
    mp_val.label    AS value_pattern_label,
    isv.param_value
FROM calc_instances ci
JOIN calc_definitions cd ON ci.calc_id = cd.calc_id
JOIN instance_setting_values isv ON ci.instance_id = isv.instance_id
JOIN setting_definitions sd ON isv.setting_id = sd.setting_id
JOIN match_patterns mp_val ON isv.pattern_id = mp_val.pattern_id
WHERE ci.instance_id = 'inst_wash_equity'
ORDER BY isv.setting_id, isv.param_name, isv.pattern_id;

-- Result:
-- instance_id      | calc_id        | calc_name      | setting_id                  | setting_name              | value_type  | param_name     | value_pattern    | value_pattern_label | param_value
-- inst_wash_equity | wash_detection | Wash Detection | large_activity_score_steps  | Large Activity Score Steps | score_steps | score_steps    | pat_equity       | Equity              | [{min:0,max:25000,...}]
-- inst_wash_equity | wash_detection | Wash Detection | quantity_match_score_steps  | Quantity Match Score Steps | score_steps | qty_score_steps| pat_equity       | Equity              | [{min:0,max:0.5,...}]
-- inst_wash_equity | wash_detection | Wash Detection | wash_vwap_threshold         | VWAP Proximity Threshold  | decimal     | vwap_threshold | pat_equity       | Equity              | 0.015
-- inst_wash_equity | wash_detection | Wash Detection | wash_vwap_threshold         | VWAP Proximity Threshold  | decimal     | vwap_threshold | pat_equity_call  | Equity Call Options | 0.018
-- inst_wash_equity | wash_detection | Wash Detection | wash_vwap_threshold         | VWAP Proximity Threshold  | decimal     | vwap_threshold | pat_equity_etf   | Equity ETFs         | 0.012
```

#### (d) Scoring Query — Computed Value to Graduated Score

```sql
-- Given a computed large_trading_activity value of $85,000 for an equity context,
-- determine the graduated score using the equity-specific score steps.

WITH equity_steps AS (
    SELECT min_value, max_value, score, label
    FROM score_steps
    WHERE pattern_id = 'pat_equity'
      AND calc_id = 'large_trading_activity'
)
SELECT
    85000 AS computed_value,
    es.min_value,
    es.max_value,
    es.score,
    es.label,
    CASE
        WHEN 85000 >= es.min_value
         AND (es.max_value IS NULL OR 85000 < es.max_value)
        THEN 'MATCHED'
        ELSE ''
    END AS status
FROM equity_steps es
ORDER BY es.min_value;

-- Result:
-- computed_value | min_value | max_value | score | label                | status
-- 85000          | 0         | 25000     | 0     | Normal equity volume |
-- 85000          | 25000     | 100000    | 3     | Elevated             | MATCHED
-- 85000          | 100000    | 500000    | 7     | Significant          |
-- 85000          | 500000    | NULL      | 10    | Extreme              |
```

---

### 3.4 FK Relationship Diagram

Complete ASCII diagram showing all tables, FK arrows, and cardinality annotations.

```
                                COMPOSITION MODEL — COMPLETE FK DIAGRAM

  ┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
  │  setting_definitions │         │  calc_required_      │         │  calc_definitions    │
  │  ─────────────────── │◄────────│  settings            │────────►│  ───────────────────  │
  │  PK: setting_id      │   FK    │  ──────────────────── │   FK    │  PK: calc_id         │
  │  name                │         │  PK: (calc_id,       │         │  name                │
  │  value_type          │         │      param_name)      │         │  layer               │
  │  version             │         │  FK: calc_id          │         │  formula_type        │
  │  examples            │         │  FK: setting_id       │         │  formula             │
  └──────────┬───────────┘         │  param_name           │         │  depends_on          │
             │                     └──────────────────────┘         │  version             │
             │ FK                                                   └──────────┬──────────┘
             │                                                                 │
  ┌──────────┴───────────┐                                         ┌──────────┴──────────┐
  │  instance_setting_   │         ┌──────────────────────┐        │  calc_instances      │
  │  values              │────────►│  calc_instances       │        │  ──────────────────── │
  │  ──────────────────── │   FK    │  ──────────────────── │        │  PK: instance_id     │
  │  PK: (instance_id,   │         │  PK: instance_id     │◄───────│  FK: calc_id          │
  │       setting_id,    │         │  FK: calc_id          │        │  FK: pattern_id       │
  │       param_name,    │         │  FK: pattern_id       │        │  FK: window_id        │
  │       pattern_id)    │         │  FK: window_id        │        │  version             │
  │  FK: instance_id     │         │  version              │        └─────────────────────┘
  │  FK: setting_id      │         │  created_at           │                  │
  │  FK: pattern_id ─────┼────┐    └──────────────────────┘                  │ FK
  │  param_name          │    │                                    ┌─────────┴──────────┐
  │  param_value         │    │                                    │  match_patterns     │
  └──────────────────────┘    │                                    │  ──────────────────── │
                              │                                    │  PK: pattern_id     │
                              └───────────────────────────────────►│  pattern_type       │
                                   per-value FK                    │  label              │
                                                                   │  status             │
                                                                   │  version            │
                                                                   └─────────┬──────────┘
                                                                             │
                                                                   ┌─────────┴──────────┐
                                                                   │  match_pattern_    │
                                                                   │  attributes        │
                                                                   │  ──────────────────  │
                                                                   │  PK: attribute_id  │
                                                                   │  FK: pattern_id    │
                                                                   │  entity            │
                                                                   │  entity_attribute  │
                                                                   │  attribute_value   │
                                                                   └────────────────────┘

                              ┌──────────────────────┐
                              │  time_windows        │
                              │  ──────────────────── │
                              │  PK: window_id       │◄── calc_instances.window_id (nullable FK)
                              │  window_type         │
                              │  start_ts / end_ts   │
                              │  business_date       │
                              └──────────────────────┘

  CARDINALITY ANNOTATIONS:
  ─────────────────────────
  calc_definitions      1 ──── N  calc_required_settings   (one calc requires N settings)
  setting_definitions   1 ──── N  calc_required_settings   (one setting used by N calcs)
  calc_definitions      1 ──── N  calc_instances           (one calc has N instances)
  match_patterns        1 ──── N  calc_instances           (one pattern used by N instances)
  match_patterns        1 ──── N  match_pattern_attributes (one pattern has N attributes)
  calc_instances        1 ──── N  instance_setting_values  (one instance has N values)
  setting_definitions   1 ──── N  instance_setting_values  (one setting has N values)
  match_patterns        1 ──── N  instance_setting_values  (one pattern scopes N values)  ← NEW
```

---

## 4. Expansion Points

These sections extend the composition model with additional concepts. Section 4.1 is a fully
worked example; the remaining sections are reserved for future documentation.

### 4.1 Detection Levels — Per-Calculation Grain

Detection levels answer the question: **at what level of aggregation does the engine look for
suspicious patterns?** Different surveillance concerns require different grains of analysis.

Consider these two examples:

- **Market price ramping** examines aggregate volume across *all* accounts for a given product.
  If total volume in AAPL across every participant spikes abnormally, that is a product-level
  signal. The relevant grain is `GROUP BY product_id`.
- **Wash trading** looks for a specific account (or pair of related accounts) trading against
  itself in a specific product. The relevant grain is `GROUP BY product_id, account_id` —
  product-level aggregation would mask the per-account pattern entirely.

Some calculations operate at the **transaction layer** — they evaluate each individual execution
without any aggregation. These calculations have no detection level at all.

The `calc_detection_levels` table declares which detection levels a calculation participates in.
A single calculation can participate in *multiple* detection levels, producing separate result
rows at each grain.

#### calc_detection_levels — which calculations run at which grain

| calc_id | detection_level_id | Resulting Grain |
|---|---|---|
| `large_trading_activity` | `DL-PRODUCT` | GROUP BY product_id |
| `large_trading_activity` | `DL-PRODUCT-ACCOUNT` | GROUP BY product_id, account_id |
| `wash_detection` | `DL-PRODUCT-ACCOUNT` | GROUP BY product_id, account_id |
| `trend_detection` | `DL-PRODUCT` | GROUP BY product_id |
| `value_calc` | *(no rows)* | transaction-layer, no GROUP BY |

**Key observations:**

- `large_trading_activity` appears at *both* `DL-PRODUCT` and `DL-PRODUCT-ACCOUNT`. The engine
  runs it twice per business date: once aggregated by product alone, once by product×account.
  Each run produces its own result rows tagged with the corresponding `detection_level_id`.
- `wash_detection` only runs at `DL-PRODUCT-ACCOUNT` — product-level aggregation would be
  meaningless for wash detection because the pattern requires account-specific visibility.
- `value_calc` has no rows in `calc_detection_levels`. It operates at the transaction layer:
  one result per execution, with `detection_level_id = NULL` in `calc_results`.

#### detection_level_universe — the set of combinations to evaluate

Each detection level has a universe: the set of dimension-value combinations the engine iterates
over. The universe is pre-computed from reference data and maintained as a lookup table.

| universe_id | detection_level_id | product_id | account_id | is_active |
|---|---|---|---|---|
| `UNI-P-001` | `DL-PRODUCT` | `PROD-001` | NULL | true |
| `UNI-P-002` | `DL-PRODUCT` | `PROD-002` | NULL | true |
| `UNI-P-003` | `DL-PRODUCT` | `PROD-003` | NULL | true |
| `UNI-PA-001` | `DL-PRODUCT-ACCOUNT` | `PROD-001` | `ACCT-100` | true |
| `UNI-PA-002` | `DL-PRODUCT-ACCOUNT` | `PROD-001` | `ACCT-101` | true |
| `UNI-PA-003` | `DL-PRODUCT-ACCOUNT` | `PROD-002` | `ACCT-100` | true |
| `UNI-PA-004` | `DL-PRODUCT-ACCOUNT` | `PROD-002` | `ACCT-102` | true |
| `UNI-PA-005` | `DL-PRODUCT-ACCOUNT` | `PROD-003` | `ACCT-100` | false |

**Key observations:**

- `DL-PRODUCT` universe rows have `account_id = NULL` — the grain is product-only.
- `DL-PRODUCT-ACCOUNT` universe rows specify both dimensions.
- `UNI-PA-005` has `is_active = false`. Inactive universe entries are skipped during engine runs
  but retained for audit trail — they were previously monitored and may be reactivated.
- In the full system, `DL-PRODUCT` would have ~50 rows (one per product) and
  `DL-PRODUCT-ACCOUNT` would have ~11,000 rows (220 accounts x 50 products, filtered to active
  trading pairs). Only 3 and 5 are shown above for brevity.

#### Resolution walkthrough — `large_trading_activity` at `DL-PRODUCT`

Given calculation `large_trading_activity` with detection level `DL-PRODUCT` for business date
2024-01-15, the engine proceeds as follows:

**Step 1 — Read universe.** The engine queries `detection_level_universe` for
`detection_level_id = 'DL-PRODUCT'` and `is_active = true`. This returns 50 product
combinations (3 shown above: PROD-001, PROD-002, PROD-003).

**Step 2 — Compute per combination.** For each universe row, the engine executes the
`large_trading_activity` SQL formula with context restricted to that product. The formula
aggregates all executions for that product on that business date, applies the resolved
settings (activity multiplier, score steps), and produces a `primary_value` representing
total notional volume.

**Step 3 — Write tagged results.** Each computation produces one row in `calc_results`,
tagged with the `detection_level_id` that produced it:

| result_id | calc_id | detection_level_id | product_id | account_id | primary_value |
|---|---|---|---|---|---|
| `R-001` | `large_trading_activity` | `DL-PRODUCT` | `PROD-001` | NULL | 75,000 |
| `R-002` | `large_trading_activity` | `DL-PRODUCT` | `PROD-002` | NULL | 42,000 |

**Step 4 — Model scoring JOIN.** The detection model `market_price_ramping` is configured to
consume `large_trading_activity` results at `DL-PRODUCT` (via `model_calculations`). The
scoring pipeline JOINs `calc_results` on `detection_level_id = 'DL-PRODUCT'` to pick up only
product-level results, ignoring any product×account rows that may also exist for the same
calculation.

**Now compare:** The same calculation at `DL-PRODUCT-ACCOUNT` produces finer-grained results:

| result_id | calc_id | detection_level_id | product_id | account_id | primary_value |
|---|---|---|---|---|---|
| `R-003` | `large_trading_activity` | `DL-PRODUCT-ACCOUNT` | `PROD-001` | `ACCT-100` | 31,000 |
| `R-004` | `large_trading_activity` | `DL-PRODUCT-ACCOUNT` | `PROD-001` | `ACCT-101` | 44,000 |

Note that `R-003 + R-004 = 75,000 = R-001`. The product-level result is the sum of all
account-level results for that product. The `detection_level_id` tag ensures the model scoring
pipeline selects the correct grain.

#### Transaction-layer contrast — `value_calc` with no detection level

Calculations with no rows in `calc_detection_levels` operate at the transaction layer. The
engine evaluates them once per execution row, producing results with `detection_level_id = NULL`:

| result_id | calc_id | detection_level_id | product_id | account_id | primary_value |
|---|---|---|---|---|---|
| `R-100` | `value_calc` | NULL | `PROD-001` | `ACCT-100` | 1,250.00 |
| `R-101` | `value_calc` | NULL | `PROD-001` | `ACCT-100` | 3,750.00 |
| `R-102` | `value_calc` | NULL | `PROD-002` | `ACCT-102` | 890.50 |

Each row corresponds to a single execution. There is no aggregation — `primary_value` is the
computed value for that individual trade (e.g., quantity x price). The NULL `detection_level_id`
distinguishes these from aggregated results and signals to the scoring pipeline that these
results should be evaluated individually rather than as group aggregates.

#### SQL — querying calc_results filtered by detection level

```sql
-- Get all product-level large_trading_activity results for model scoring
SELECT cr.*
FROM   calc_results cr
WHERE  cr.calc_id = 'large_trading_activity'
  AND  cr.detection_level_id = 'DL-PRODUCT'
  AND  cr.business_date = '2024-01-15';
```

```sql
-- Get product×account results for wash trading model
SELECT cr.*
FROM   calc_results cr
WHERE  cr.calc_id IN ('large_trading_activity', 'wash_detection')
  AND  cr.detection_level_id = 'DL-PRODUCT-ACCOUNT'
  AND  cr.business_date = '2024-01-15';
```

```sql
-- Get transaction-layer results (no detection level)
SELECT cr.*
FROM   calc_results cr
WHERE  cr.calc_id = 'value_calc'
  AND  cr.detection_level_id IS NULL
  AND  cr.business_date = '2024-01-15';
```

See: Appendix A, Section 2.9 (calc_detection_levels DDL); Document 09, Section 3
(calc_results schema); Document 05, Section 6 (calculation execution model).

---

### 4.2 Reserved: Temporal Instance Versioning

*(Future: How instances are versioned over time, how historical instances are preserved for regulatory audit, and how version transitions are managed during a pipeline run.)*

### 4.3 Reserved: Cross-Entity Pattern Composition

*(Future: How patterns can reference attributes from multiple entities simultaneously — e.g., "equity instruments traded by high-risk accounts" — and how the entity graph reachability engine resolves cross-entity attribute lookups.)*

### 4.4 Reserved: Multi-Model Instance Sharing

*(Future: How multiple detection models share calculation instances and how shared instances interact with model-specific pattern bindings.)*

---

## 5. Cross-References

| Document | Relationship to This Appendix |
|----------|------------------------------|
| 04 Match Pattern Architecture | Defines the 3-column pattern structure used in all examples |
| 05 Calculation Instance Model | Defines calc_instances, instance_setting_values, and the resolution flow |
| 06 Time Window Framework | Defines time_windows referenced by calc_instances.window_id |
| 08 Resolution Priority Rules | Defines the granularity pyramid (attribute count = priority) |
| 09 Unified Results Schema | Defines calc_results where instance outputs are stored |
| 10 Scoring and Alerting Pipeline | Defines score steps, score thresholds, and alert trace generation |
| 12 Settings Resolution Patterns | Defines settings as pure definitions and the migration from current model |
| Appendix A | Full DDL for all tables referenced in these examples |
| Appendix B | Additional end-to-end worked examples using the current model |
| Appendix C | Mapping from current JSON metadata to proposed table rows |
