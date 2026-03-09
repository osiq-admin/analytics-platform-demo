# 08 -- Resolution Priority Rules

> Granularity-based resolution priority: how the system determines which configuration override wins
> when multiple patterns could match a given entity context.

**Document**: 08 of the Data Modeling Design Considerations series
**Audience**: All (fundamental system behavior)
**Last updated**: 2026-03-09

---

## 1. The Single Sort Rule

Every settings resolution in the platform reduces to one deterministic SQL expression:

```sql
ORDER BY
  has_entity_key DESC,          -- entity key matches first
  matched_attribute_count DESC,  -- then most attribute matches
  pattern_id ASC                 -- deterministic tiebreak
LIMIT 1
```

This three-part sort is the entire priority system. There are no priority numbers to assign, no ordering conflicts to debug, and no ambiguity about which override wins. The rule is applied identically for thresholds, score steps, detection levels, and any other setting type.

### 1.1 Sort Criterion 1: `has_entity_key DESC`

An **entity key match** means the override's match criteria include the entity's primary key field (e.g., `product_id = "PRD-001"` or `account_id = "ACC-0042"`). Entity key matches always sort first because they represent the most specific possible configuration: a rule written for exactly one entity instance.

This is a boolean column (1 or 0). Any pattern that matches by entity key sorts above every pattern that matches only by attributes, regardless of how many attributes the non-key pattern matches.

**Why entity key wins absolutely**: An entity key identifies a single row in the entity table. There is no more specific scope possible. If someone has configured a threshold specifically for product PRD-001, that configuration should never be overridden by a broader rule like "all equities on NYSE," even though the latter matches three attributes. The entity key match is an explicit, deliberate override for that exact entity.

### 1.2 Sort Criterion 2: `matched_attribute_count DESC`

Among patterns at the same entity-key level (i.e., both have entity key matches, or neither does), the pattern that matches the most attributes in the entity context wins. This implements the principle that **more-specific configuration beats less-specific configuration**.

A pattern matching `{asset_class: "equity", country: "US", exchange_mic: "XNYS"}` (3 attributes) is more specific than one matching `{asset_class: "equity", country: "US"}` (2 attributes), which is more specific than `{asset_class: "equity"}` (1 attribute).

**Why count, not weight**: Attribute weighting introduces subjective decisions ("is `asset_class` more important than `country`?") and configuration complexity. Counting treats all attributes equally and produces intuitive results: the rule that describes the most about the entity context wins.

### 1.3 Sort Criterion 3: `pattern_id ASC`

When two patterns have the same entity-key status and the same number of matching attributes, the pattern with the lexicographically first `pattern_id` wins. This is a **deterministic tiebreak** --- it exists solely to guarantee that the same inputs always produce the same output.

**Why `pattern_id ASC`**: The choice of ascending vs. descending is arbitrary; what matters is consistency. Ascending order means that if two patterns tie, the one created first (assuming sequential or alphabetical IDs) wins. In practice, ties at this level are rare and indicate that two patterns should probably be consolidated.

---

## 2. Granularity Pyramid

The sort rule produces a natural priority hierarchy that can be visualized as a pyramid, where higher positions always override lower ones:

```
┌──────────────────────────────────────────────────────────────┐
│  Entity Key Match                                            │
│  product_id = "PRD-001"                                      │
│  (highest priority --- ALWAYS wins)                          │
├──────────────────────────────────────────────────────────────┤
│  Multi-Attribute Match                                       │
│  asset_class = "equity", country = "US", exchange_mic = "XNYS"│
│  (3 attributes matched)                                      │
├──────────────────────────────────────────────────────────────┤
│  Dual-Attribute Match                                        │
│  asset_class = "equity", country = "US"                      │
│  (2 attributes matched)                                      │
├──────────────────────────────────────────────────────────────┤
│  Single-Attribute Match                                      │
│  asset_class = "equity"                                      │
│  (1 attribute matched)                                       │
├──────────────────────────────────────────────────────────────┤
│  Default                                                     │
│  {} (no match criteria --- catches everything)               │
│  (lowest priority)                                           │
└──────────────────────────────────────────────────────────────┘
```

Each tier in this pyramid corresponds to a natural business concept:

| Tier | Business Meaning | Example |
|------|-----------------|---------|
| Entity Key | "This specific product has its own rule" | AAPL wash threshold = 0.01 |
| 3+ Attributes | "This narrow market segment has its own rule" | US equity on NYSE |
| 2 Attributes | "This market intersection has its own rule" | US equities |
| 1 Attribute | "This asset class has its own rule" | All equities |
| Default | "The global baseline for everything" | Platform-wide default |

---

## 3. No Manual Priority Numbers

### 3.1 Current System: Integer Priority Fields

Today, each `SettingOverride` in the platform carries an integer `priority` field that determines resolution order. The current settings metadata shows these priority values in practice:

```json
// wash_vwap_threshold setting (from workspace/metadata/settings/thresholds/)
{
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    {"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012, "priority": 2},
    {"match": {"product": "AAPL"}, "value": 0.01, "priority": 100}
  ]
}
```

The current `SettingOverride` Pydantic model enforces this:

```python
class SettingOverride(BaseModel):
    match: dict[str, str]
    value: Any
    priority: int = Field(ge=0)
```

And the `SettingDefinition` model automatically sorts overrides by priority descending on load:

```python
@model_validator(mode="after")
def sort_overrides_by_priority(self):
    self.overrides = sorted(self.overrides, key=lambda o: o.priority, reverse=True)
    return self
```

The `HierarchyStrategy` and `MultiDimensionalStrategy` both use priority as a tiebreaker:

```python
# HierarchyStrategy
candidates.sort(key=lambda o: (len(o.match), o.priority), reverse=True)

# MultiDimensionalStrategy
candidates.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
```

### 3.2 The Problem with Manual Priority Numbers

Manual priority assignment creates several categories of problems:

**Priority conflicts**: Two overrides with priority 50 --- which wins? The current system breaks the tie arbitrarily based on list ordering, which depends on JSON parse order. The result is nondeterministic.

**Arbitrary numbering conventions**: The current data uses priority 1 for single-attribute overrides, priority 2 for dual-attribute, and priority 100 for entity-key overrides. But there is no enforcement. A user could assign priority 999 to a single-attribute override and it would beat everything --- including entity-key matches. This violates the granularity principle.

**"What number should I use?"**: When adding a new override, users must inspect existing overrides to find an unused priority number that produces the desired resolution order. This is a cognitive burden that has nothing to do with the business intent of the override.

**Maintenance burden**: If you need to insert a new priority level between existing ones (e.g., between priority 2 and priority 3), you may need to renumber other overrides. This is the same problem as manual array indexing.

**Gap between intent and mechanism**: The user's intent is "this rule is more specific, so it should win." The mechanism they are forced to use is "assign a higher integer." These are fundamentally different mental models.

### 3.3 Proposed: Granularity IS Priority

In the proposed system, the `priority` field is eliminated from overrides entirely. Priority is computed at resolution time from the structure of the match criteria:

- **Entity key match?** That is the priority. No number needed.
- **Three attributes match?** That is more specific than two. No number needed.
- **Same attribute count?** `pattern_id ASC` breaks the tie. No number needed.

The override definition simplifies to:

```json
{"match": {"asset_class": "equity"}, "value": 0.015}
{"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012}
{"match": {"product_id": "AAPL"}, "value": 0.01}
```

The resolution engine computes priority from the match structure. The user never assigns, inspects, or debugs priority numbers.

### 3.4 What This Eliminates

| Problem | With Manual Priority | With Granularity-Based Priority |
|---------|---------------------|-------------------------------|
| Priority conflicts | Two overrides with same number | Impossible --- attribute count is deterministic |
| Wrong override wins | Mis-assigned priority number | Impossible --- more-specific always wins |
| "What number?" | Inspect existing overrides | Not applicable --- no numbers to assign |
| Renumbering | Insert between existing priorities | Not applicable --- no numbers to maintain |
| Nondeterminism | Same priority, undefined order | `pattern_id ASC` breaks all ties |

---

## 4. Cascade Examples

### 4.1 Example 1: Resolving `wash_vwap_threshold` for Product PRD-001

**Scenario**: The wash trading detection engine needs the VWAP proximity threshold for a specific product. The product is an equity listed on NYSE.

**Entity context**:
```json
{
  "product_id": "PRD-001",
  "asset_class": "equity",
  "country": "US",
  "exchange_mic": "XNYS"
}
```

**Available patterns** (from the `wash_vwap_threshold` setting):

| Pattern | Match Criteria | Value |
|---------|---------------|-------|
| A | `{product_id: "PRD-001"}` | 0.01 |
| B | `{asset_class: "equity", exchange_mic: "XNYS"}` | 0.012 |
| C | `{asset_class: "equity"}` | 0.015 |
| D | `{asset_class: "fixed_income"}` | 0.01 |
| E | `{asset_class: "index"}` | 0.015 |
| F | `{}` (default) | 0.02 |

**Resolution steps**:

1. **Evaluate each pattern against the context**:
   - Pattern A: `product_id = "PRD-001"` --- context has `product_id = "PRD-001"`. Match. `product_id` is an entity key field (the `is_key: true` field on the product entity). So `has_entity_key = 1`, `matched_attribute_count = 1`.
   - Pattern B: `asset_class = "equity"` --- context has `asset_class = "equity"`. Match. `exchange_mic = "XNYS"` --- context has `exchange_mic = "XNYS"`. Match. Not an entity key. `has_entity_key = 0`, `matched_attribute_count = 2`.
   - Pattern C: `asset_class = "equity"` --- context has `asset_class = "equity"`. Match. `has_entity_key = 0`, `matched_attribute_count = 1`.
   - Pattern D: `asset_class = "fixed_income"` --- context has `asset_class = "equity"`. No match. Eliminated.
   - Pattern E: `asset_class = "index"` --- context has `asset_class = "equity"`. No match. Eliminated.
   - Pattern F: `{}` --- no criteria to fail. Always matches. `has_entity_key = 0`, `matched_attribute_count = 0`.

2. **Sort surviving patterns**:
   ```
   Pattern A: (has_entity_key=1, matched_count=1, pattern_id="A")
   Pattern B: (has_entity_key=0, matched_count=2, pattern_id="B")
   Pattern C: (has_entity_key=0, matched_count=1, pattern_id="C")
   Pattern F: (has_entity_key=0, matched_count=0, pattern_id="F")
   ```

3. **Apply sort rule** (`has_entity_key DESC, matched_count DESC, pattern_id ASC`):
   - Pattern A sorts first: `has_entity_key = 1` beats all others regardless of attribute count.

4. **Winner: Pattern A** --- value = **0.01**

**Why this is correct**: Someone deliberately configured a VWAP threshold of 0.01 for product PRD-001. That product-specific configuration should never be overridden by a broader "all equities on NYSE" rule, no matter how many attributes the broader rule matches. The entity key is the strongest possible specificity signal.

---

### 4.2 Example 2: Resolving `large_activity_score_steps` for FX Product PRD-042

**Scenario**: The detection engine needs the large activity score steps for an FX product trading on the London Stock Exchange. No entity-key-specific override exists for this product.

**Entity context**:
```json
{
  "product_id": "PRD-042",
  "asset_class": "fx",
  "country": "GB",
  "exchange_mic": "XLON"
}
```

**Available patterns** (from the `large_activity_score_steps` setting):

| Pattern | Match Criteria | Value |
|---------|---------------|-------|
| G | `{asset_class: "equity"}` | [25000/0, 100000/3, 500000/7, null/10] |
| H | `{}` (default) | [10000/0, 100000/3, 500000/7, null/10] |

**Resolution steps**:

1. **Evaluate each pattern against the context**:
   - Pattern G: `asset_class = "equity"` --- context has `asset_class = "fx"`. No match. Eliminated.
   - Pattern H: `{}` --- no criteria. Always matches. `has_entity_key = 0`, `matched_attribute_count = 0`.

2. **Sort surviving patterns**:
   ```
   Pattern H: (has_entity_key=0, matched_count=0, pattern_id="H")
   ```
   Only one pattern survives.

3. **Winner: Pattern H (default)** --- value = **[10000/0, 100000/3, 500000/7, null/10]**

**Why this is correct**: No override exists for FX instruments in the `large_activity_score_steps` setting. The system falls through to the default score steps. The default is the safety net --- it applies to any entity context that no specific override addresses.

**Note**: If the platform later needs different score steps for FX, a compliance analyst simply adds an override with `{asset_class: "fx"}`. No priority number needed --- the system will automatically prefer it over the default because `matched_attribute_count = 1 > 0`. And if an even more specific rule is needed for FX on XLON, adding `{asset_class: "fx", exchange_mic: "XLON"}` will automatically win over the single-attribute FX override because `matched_attribute_count = 2 > 1`.

---

### 4.3 Example 3: Resolving Detection Level for a New Custom Model

**Scenario**: A compliance team has created a new detection model for "cross-venue layering." They need to configure at what grain the model operates for different market segments.

The detection level setting determines the grouping grain: does the model analyze at the execution level, the order level, the trader-day level, or the account-product level?

**Available patterns in the `detection_level` setting**:

| Pattern | Match Criteria | Value |
|---------|---------------|-------|
| J | `{asset_class: "equity", exchange_mic: "XNYS"}` | `"order"` |
| K | `{asset_class: "equity"}` | `"trader_day"` |
| L | `{asset_class: "fx"}` | `"execution"` |
| M | `{}` (default) | `"account_product"` |

**Case A --- Equity on NYSE** (context: `{asset_class: "equity", exchange_mic: "XNYS"}`):

1. Pattern J: Both attributes match. `matched_attribute_count = 2`.
2. Pattern K: `asset_class = "equity"` matches. `matched_attribute_count = 1`.
3. Pattern L: `asset_class = "fx"` does not match. Eliminated.
4. Pattern M: Default. `matched_attribute_count = 0`.
5. Sort: J (count=2) > K (count=1) > M (count=0).
6. **Winner: Pattern J** --- detection level = `"order"`.

**Case B --- Equity on XLON** (context: `{asset_class: "equity", exchange_mic: "XLON"}`):

1. Pattern J: `asset_class = "equity"` matches, but `exchange_mic = "XNYS"` does not match `"XLON"`. ALL criteria must match. Eliminated.
2. Pattern K: `asset_class = "equity"` matches. `matched_attribute_count = 1`.
3. Pattern L: Eliminated.
4. Pattern M: Default. `matched_attribute_count = 0`.
5. **Winner: Pattern K** --- detection level = `"trader_day"`.

**Case C --- Commodity** (context: `{asset_class: "commodity", exchange_mic: "XCME"}`):

1. Patterns J, K, L: All eliminated (no attribute matches).
2. Pattern M: Default. `matched_attribute_count = 0`.
3. **Winner: Pattern M (default)** --- detection level = `"account_product"`.

**Key insight**: The new detection model did not need to define its own priority system or create custom resolution logic. It references the same match pattern infrastructure that thresholds, score steps, and every other setting uses. Adding the model required zero changes to the resolution engine.

---

### 4.4 Example 4: Tiebreak Scenario

**Scenario**: Two overrides exist for the `spoofing_score_threshold` setting, and both match exactly two attributes in the entity context.

**Entity context**:
```json
{
  "asset_class": "equity",
  "country": "US",
  "exchange_mic": "XNYS",
  "risk_rating": "HIGH"
}
```

**Available patterns**:

| Pattern ID | Match Criteria | Value |
|-----------|---------------|-------|
| `equity_high_risk` | `{asset_class: "equity", risk_rating: "HIGH"}` | 8 |
| `equity_us` | `{asset_class: "equity", country: "US"}` | 9 |
| `equity_stocks` | `{asset_class: "equity"}` | 10 |
| `default` | `{}` | 12 |

**Resolution steps**:

1. **Evaluate each pattern**:
   - `equity_high_risk`: `asset_class = "equity"` matches, `risk_rating = "HIGH"` matches. `matched_attribute_count = 2`.
   - `equity_us`: `asset_class = "equity"` matches, `country = "US"` matches. `matched_attribute_count = 2`.
   - `equity_stocks`: `asset_class = "equity"` matches. `matched_attribute_count = 1`.
   - `default`: Always matches. `matched_attribute_count = 0`.

2. **Sort by the single sort rule**:
   - `has_entity_key`: All are 0. No differentiation.
   - `matched_attribute_count`: `equity_high_risk` and `equity_us` both have 2. Tie.
   - `pattern_id ASC`: `"equity_high_risk"` < `"equity_us"` (lexicographic comparison).

3. **Winner: `equity_high_risk`** --- value = **8**

**Why `pattern_id ASC` is the right tiebreak**:

- **Deterministic**: Given the same patterns and context, the result is always the same. There is no randomness, no insertion-order dependency, no JSON parse-order sensitivity.
- **Predictable**: Users can look at two pattern IDs and know which one would win in a tie. The rule is simple and inspectable.
- **Signals a design issue**: If two patterns tie at the attribute count level and the tiebreak matters, it usually means the patterns overlap and should be consolidated or differentiated. The tiebreak is a safety net, not a design tool.

**Important**: All match criteria in a pattern must match for the pattern to be considered. A pattern with `{asset_class: "equity", risk_rating: "HIGH"}` does NOT match a context of `{asset_class: "equity", risk_rating: "LOW"}`. The `matched_attribute_count` is the count of a pattern's criteria that matched, but ONLY when ALL criteria in that pattern match. If any single criterion fails, the pattern is eliminated entirely --- it does not contribute a partial match count.

---

## 5. Defaults as Zero-Attribute Patterns

### 5.1 What a Default Is

In the proposed system, a **default** is simply a pattern with no attribute rows in its match criteria. It is represented as an empty match object: `{}`.

```json
{
  "pattern_id": "wash_vwap_threshold_default",
  "match": {},
  "value": 0.02
}
```

Because it has no match criteria, it matches every possible entity context. And because it has `matched_attribute_count = 0`, it always sorts below any pattern that matches at least one attribute. This makes it the universal fallback --- the value that applies when nothing more specific is configured.

### 5.2 Why Defaults Are Patterns, Not a Separate Field

In the current system, defaults are a separate field on the `SettingDefinition` model:

```python
class SettingDefinition(BaseModel):
    setting_id: str
    default: Any          # <-- separate field
    overrides: list[SettingOverride]
```

And in the JSON metadata:

```json
{
  "setting_id": "wash_vwap_threshold",
  "default": 0.02,
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    ...
  ]
}
```

This creates a structural inconsistency: the default value is stored differently from overrides, resolved differently, and maintained differently. In the proposed system, the default becomes just another pattern --- the one with zero attributes:

```json
{
  "setting_id": "wash_vwap_threshold",
  "patterns": [
    {"pattern_id": "default", "match": {}, "value": 0.02},
    {"pattern_id": "equity", "match": {"asset_class": "equity"}, "value": 0.015},
    {"pattern_id": "equity_nyse", "match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012},
    {"pattern_id": "prd_aapl", "match": {"product_id": "AAPL"}, "value": 0.01}
  ]
}
```

### 5.3 Benefits of Unified Treatment

| Aspect | Separate Default Field | Default as Zero-Attribute Pattern |
|--------|----------------------|----------------------------------|
| Resolution logic | Two code paths (check overrides, fall back to `setting.default`) | One code path (sort all patterns, take first) |
| Audit trail | Override changes tracked, default changes tracked separately | All changes tracked identically |
| Migration | Default is always the special case | No special cases |
| Validation | "Does this setting have a default?" is a field check | "Does this setting have a zero-attribute pattern?" is the same query as "does this setting have an override for equity?" |
| UX | Default is a separate input field | Default appears in the same list as all overrides, at the bottom |

### 5.4 Safety Net Rule

**Every setting MUST have a default pattern.** The system should reject any setting configuration that lacks a zero-attribute pattern. Without a default, it is possible for an entity context to match no patterns at all, resulting in a resolution failure.

Current system equivalent: the `SettingDefinition.default` field is required (not optional). The proposed system enforces the same invariant differently: validation checks that at least one pattern in the set has an empty `match` object.

---

## 6. Comparison with Current System

| Aspect | Current System | Proposed System |
|--------|---------------|-----------------|
| **Priority mechanism** | Integer `priority` field on each override (e.g., 1, 2, 100) | Computed from match attribute count at resolution time |
| **Entity key handling** | Assigned a high priority number (e.g., `priority: 100`) by convention | Auto-detected from entity metadata (`is_key: true`), always wins |
| **Default value** | Separate `setting.default` field on `SettingDefinition` | Zero-attribute pattern (empty `match: {}`) in the pattern list |
| **Tiebreaking** | `priority DESC` (manual), then list order (nondeterministic) | `matched_attribute_count DESC`, then `pattern_id ASC` (fully deterministic) |
| **Maintenance** | Manual priority number assignment; must inspect existing overrides | Automatic; add a pattern with the desired match criteria |
| **Conflict risk** | Two overrides with same priority = undefined winner | Impossible; attribute count is structural, `pattern_id` is unique |
| **Resolution strategies** | `HierarchyStrategy` and `MultiDimensionalStrategy` as separate code paths | Unified sort rule handles both; strategies become a single code path |
| **Resolution result** | `ResolutionResult` with `matched_override` or default fallback | `ResolutionResult` with winning pattern (always a pattern, even for defaults) |
| **Model enforcement** | `sort_overrides_by_priority` validator on load | No sort needed; resolution computes priority at query time |

### 6.1 Current Resolution Strategies in Detail

The current `settings_resolver.py` implements two strategies:

**HierarchyStrategy**: Requires ALL match keys to be present in the context. Sorts candidates by `(len(match), priority)` descending. This means: most match keys first, then highest priority among ties.

```python
candidates.sort(key=lambda o: (len(o.match), o.priority), reverse=True)
```

**MultiDimensionalStrategy**: Counts how many dimensions match, but ONLY if ALL dimensions match. Sorts by `(match_count, priority)` descending.

```python
candidates.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
```

Both strategies already use attribute count as the primary sort criterion. The `priority` field is already a tiebreaker, not the primary mechanism. The proposed system simply formalizes this --- recognizing that the attribute count IS the priority --- and replaces the manual `priority` tiebreaker with the deterministic `pattern_id ASC`.

---

## 7. Edge Cases and Rules

### 7.1 Empty Context

**Scenario**: The resolution engine is called with an empty entity context: `{}`.

**Behavior**: No pattern with any match criteria can match, because there are no context values to compare against. Only the default pattern (zero attributes) matches.

**Result**: Returns the default value.

**Example**: Resolving `wash_score_threshold` with context `{}` returns the default of 10, regardless of what overrides exist for equity, FX, or fixed income.

### 7.2 No Matching Pattern at All

**Scenario**: A setting has overrides for equity and FX, but no default pattern, and the entity context is `{asset_class: "commodity"}`.

**Behavior**: No pattern matches. This is a **system error**.

**Rule**: Every setting MUST have a default pattern. The system should validate this constraint when settings are loaded and reject configurations that violate it. The current system enforces this via the required `default` field on `SettingDefinition`; the proposed system enforces it by requiring at least one zero-attribute pattern.

**Error message**: `"Resolution failed for setting '{setting_id}': no matching pattern for context {context}. Ensure a default pattern exists."`

### 7.3 Overlapping Entity Key and Attribute Match

**Scenario**: Two patterns exist:
- Pattern P: `{product_id: "PRD-001"}` (entity key match)
- Pattern Q: `{asset_class: "equity", country: "US", exchange_mic: "XNYS", risk_rating: "HIGH"}` (4 attribute matches)

Context: `{product_id: "PRD-001", asset_class: "equity", country: "US", exchange_mic: "XNYS", risk_rating: "HIGH"}`

**Behavior**: Pattern P wins. Despite Pattern Q matching 4 attributes vs. Pattern P's 1 attribute, the entity key flag (`has_entity_key = 1`) sorts above any non-key pattern regardless of attribute count.

**Rationale**: Entity key matches represent deliberate, explicit overrides for a single entity. They should never be silently overridden by a broader pattern, no matter how many dimensions that broader pattern covers.

### 7.4 Multiple Entity Key Fields in Context

**Scenario**: The entity context contains multiple entity key values, such as both `product_id` and `account_id`. Two patterns exist:
- Pattern R: `{product_id: "PRD-001"}` (entity key for product)
- Pattern S: `{account_id: "ACC-0042"}` (entity key for account)

**Behavior**: Both patterns have `has_entity_key = 1`. They tie on the first sort criterion. The system falls through to `matched_attribute_count DESC` (both have count 1, so still tied), then to `pattern_id ASC` for the deterministic tiebreak.

**Alternative treatment**: If the context arises from a specific entity (e.g., the setting is being resolved "for a product"), the system can limit entity key detection to the primary entity's key field. This avoids the situation where a cross-entity key match competes unexpectedly.

### 7.5 Pattern with Entity Key AND Attributes

**Scenario**: A pattern matches both the entity key and additional attributes:
```json
{"match": {"product_id": "PRD-001", "exchange_mic": "XNYS"}}
```

**Behavior**: `has_entity_key = 1`, `matched_attribute_count = 2`. This pattern sorts above a pure entity key match with `matched_attribute_count = 1`:

```
(has_entity_key=1, count=2, ...)  >  (has_entity_key=1, count=1, ...)
```

This is correct: the pattern says "product PRD-001 specifically when traded on NYSE." That is more specific than "product PRD-001 everywhere."

### 7.6 All-or-Nothing Matching

A pattern's match criteria follow **all-or-nothing** semantics. If a pattern specifies three attributes, ALL three must match the context for the pattern to be considered. A partial match (2 out of 3) results in elimination, not a reduced count.

**Example**: Pattern `{asset_class: "equity", country: "US", exchange_mic: "XNYS"}` does NOT match context `{asset_class: "equity", country: "US", exchange_mic: "XLON"}`. Even though 2 out of 3 attributes match, the pattern is eliminated because `exchange_mic` does not match.

This is consistent with the current `_all_keys_match` and `_count_matching_dimensions` helper functions in `settings_resolver.py`, which both require all keys in the pattern to match before counting.

---

## 8. Implementation Notes

### 8.1 Resolution is Per-Entity-Context, Per-Setting

Each resolution call takes one setting ID and one entity context, and returns one resolved value. The resolution is independent across settings: the winning pattern for `wash_vwap_threshold` may differ from the winning pattern for `wash_score_threshold` even for the same entity context.

### 8.2 Cacheability

Resolution results are cacheable per `(setting_id, context_hash)` tuple. The context hash is computed from the sorted key-value pairs of the entity context dictionary. Because resolution is deterministic (same inputs always produce the same output), cached results never go stale unless the underlying setting patterns change.

Cache invalidation is straightforward: when a setting's patterns are modified (added, removed, or changed), invalidate all cache entries for that `setting_id`.

### 8.3 In-Memory Resolution

If the full set of patterns for a setting is loaded into memory, resolution requires no database query. The algorithm is:

```python
def resolve(patterns: list[Pattern], context: dict[str, str]) -> Pattern:
    candidates = []
    for p in patterns:
        if all(context.get(k) == v for k, v in p.match.items()):
            has_key = any(
                k in entity_key_fields for k in p.match
            )
            candidates.append((has_key, len(p.match), p.pattern_id, p))

    candidates.sort(key=lambda x: (-x[0], -x[1], x[2]))
    return candidates[0][3] if candidates else None
```

This is O(P * A) where P is the number of patterns and A is the average number of match attributes per pattern. For typical settings with fewer than 20 patterns and fewer than 5 attributes each, this is effectively constant time.

### 8.4 Compatibility with Current Strategies

The proposed sort rule is an **evolution** of the current `HierarchyStrategy` and `MultiDimensionalStrategy`, not a replacement. Both current strategies already sort by attribute count as the primary criterion and use priority as a tiebreaker. The proposed system:

1. Adds the `has_entity_key` criterion as the first sort key (currently handled by convention via `priority: 100`).
2. Replaces the manual `priority` tiebreaker with `pattern_id ASC`.
3. Unifies both strategies into a single sort rule that handles both hierarchy (strict all-must-match) and multi-dimensional (count-based) semantics.

Migration from the current system to the proposed system can proceed incrementally:

1. **Phase 1**: Add `has_entity_key` detection to the existing resolver without removing the `priority` field. Verify results match.
2. **Phase 2**: Replace `priority`-based tiebreaking with `pattern_id ASC`. Verify results match (they will, because current patterns rarely tie on attribute count).
3. **Phase 3**: Remove the `priority` field from `SettingOverride` and the `default` field from `SettingDefinition`. Convert defaults to zero-attribute patterns.

### 8.5 Interaction with the Match Pattern Architecture

The resolution priority rules described in this document operate on the match patterns defined in Document 04 (Match Pattern Architecture). Each match pattern defines its criteria using the universal 3-column structure (`pattern_key`, `entity`, `entity_attribute`). The resolution engine consumes these patterns and applies the single sort rule to determine the winner.

The match pattern architecture defines WHAT patterns exist and WHAT they match. The resolution priority rules define HOW to choose between them when multiple patterns match. These are complementary, not overlapping concerns.

---

## Cross-References

- **Document 04** (Match Pattern Architecture): Defines the universal pattern structure that this document's resolution rules operate on.
- **Document 05** (Calculation Instance Model): Calculation instances reference patterns; resolution determines which pattern's parameters apply.
- **Document 10** (Scoring and Alerting Pipeline): Score resolution uses the same priority rules for score step selection.
- **Document 12** (Settings Resolution Patterns): Detailed current-state analysis of `HierarchyStrategy` and `MultiDimensionalStrategy`.
- **Source**: `backend/engine/settings_resolver.py` --- current resolution implementation.
- **Source**: `backend/models/settings.py` --- `SettingOverride`, `SettingDefinition`, `ScoreStep` models.
- **Data**: `workspace/metadata/settings/thresholds/` and `workspace/metadata/settings/score_steps/` --- current setting definitions with priority-based overrides.
- **Data**: `workspace/metadata/match_patterns/` --- current match pattern definitions (9 patterns across equity, FX, fixed income, commodity, index).
