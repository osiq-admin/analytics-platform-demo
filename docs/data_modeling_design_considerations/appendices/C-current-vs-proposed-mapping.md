# Appendix C -- Current vs. Proposed Mapping

**Audience**: Data Engineers, Architects
**Last updated**: 2026-03-09
**Series**: Data Modeling Design Considerations, Appendix C
**Prerequisites**: Documents 02 (Current State), 03 (Gap Analysis), 04 (Match Pattern Architecture), 05 (Calculation Instance Model), 08 (Resolution Priority Rules)

---

## 1. Metadata Files to Proposed Tables

This section maps every current metadata directory and file to its proposed table or storage location in the redesigned system. The "Migration Notes" column describes what changes and what is extracted.

### 1.1 Entity Metadata (No Change)

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/entities/account.json` | JSON (9 fields, 2 relationships) | No change (kept as JSON metadata) | Entity definitions remain JSON. Fields `account_type`, `risk_rating`, `registration_country`, `mifid_client_category` become matchable attributes in `match_pattern_attributes`. |
| `workspace/metadata/entities/execution.json` | JSON (13 fields, 6 relationships) | No change (kept as JSON metadata) | Fields `side`, `exec_type`, `capacity` become matchable attributes. Relationship graph paths (execution->product, execution->venue) enable entity reachability. |
| `workspace/metadata/entities/md_eod.json` | JSON (10 fields, 0 relationships) | No change (kept as JSON metadata) | No matchable domain values. Used as input data by `market_event_window` calculation. |
| `workspace/metadata/entities/md_intraday.json` | JSON (8 fields, 1 relationship) | No change (kept as JSON metadata) | Field `trade_condition` has domain value `["@"]`. Used as input by `trend_window` calculation. |
| `workspace/metadata/entities/order.json` | JSON (14 fields, 5 relationships) | No change (kept as JSON metadata) | Fields `side`, `order_type`, `status`, `time_in_force` become matchable attributes in `match_pattern_attributes`. |
| `workspace/metadata/entities/product.json` | JSON (18 fields, 5 relationships) | No change (kept as JSON metadata) | Fields `asset_class`, `instrument_type`, `exchange_mic`, `currency`, `regulatory_scope` become matchable attributes. Product is the most pattern-referenced entity. |
| `workspace/metadata/entities/trader.json` | JSON (6 fields, 3 relationships) | No change (kept as JSON metadata) | Fields `desk`, `trader_type` become matchable attributes. |
| `workspace/metadata/entities/venue.json` | JSON (8 fields, 3 relationships) | No change (kept as JSON metadata) | Fields `country`, `asset_classes` become matchable attributes. `mic` is the entity key for venue-level overrides. |

**Summary**: All 8 entity JSON files remain as-is. They define the entity graph that match patterns reference. No data migration required.

### 1.2 Calculation Files

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/calculations/transaction/value_calc.json` | JSON with `calc_id`, `layer`, `logic`, `parameters`, `inputs`, `output` | `calc_definitions` row | Extract `calc_id="value_calc"`, `layer="transaction"`, `logic` (SQL), `parameters={}` (empty -- no settings-sourced params). No `calc_pattern_bindings` needed. |
| `workspace/metadata/calculations/transaction/adjusted_direction.json` | JSON | `calc_definitions` row | Extract `calc_id="adjusted_direction"`, `layer="transaction"`, `parameters={}`. Depends on `value_calc`. No bindings needed. |
| `workspace/metadata/calculations/time_windows/business_date_window.json` | JSON with `parameters.cutoff_time.source="setting"` | `calc_definitions` row + `calc_pattern_bindings` rows | Extract calc definition. Create bindings for each match pattern context that resolves `business_date_cutoff`: default (empty pattern), `exchange_mic=XNYS`, `exchange_mic=XLON`, `asset_class=fx`. |
| `workspace/metadata/calculations/time_windows/cancellation_pattern.json` | JSON with `parameters.cancel_threshold.source="setting"` | `calc_definitions` row + `calc_pattern_bindings` rows | Extract calc definition. Create bindings for each context that resolves `cancel_count_threshold`: default, `asset_class=equity`, `instrument_type=call_option`, `instrument_type=put_option`, `asset_class=fixed_income`, `asset_class=index`. |
| `workspace/metadata/calculations/time_windows/market_event_window.json` | JSON with mixed params: `price_change_threshold` (literal), `lookback_days` (setting), `lookforward_days` (literal) | `calc_definitions` row + `calc_pattern_bindings` rows | Literal params stay inline. Setting-sourced `lookback_days` -> bindings for `insider_lookback_days` resolution contexts. |
| `workspace/metadata/calculations/time_windows/trend_window.json` | JSON with `parameters.trend_multiplier.source="setting"` | `calc_definitions` row + `calc_pattern_bindings` rows | Create bindings for each context that resolves `trend_sensitivity`: default, `asset_class=equity`, `asset_class=fx`, `asset_class=fixed_income`, `asset_class=index`. |
| `workspace/metadata/calculations/aggregations/trading_activity_aggregation.json` | JSON with `parameters={}` | `calc_definitions` row | No parameters, no bindings needed. Pure aggregation SQL. |
| `workspace/metadata/calculations/aggregations/vwap_calc.json` | JSON with `parameters={}` | `calc_definitions` row | No parameters, no bindings needed. Pure aggregation SQL. |
| `workspace/metadata/calculations/derived/large_trading_activity.json` | JSON with `parameters.activity_multiplier.source="setting"` | `calc_definitions` row + `calc_pattern_bindings` rows | Create bindings for each context that resolves `large_activity_multiplier`: default, `asset_class=equity`, `asset_class=fx`, `asset_class=commodity`, `asset_class=fixed_income`, `asset_class=index`. |
| `workspace/metadata/calculations/derived/wash_detection.json` | JSON with `qty_threshold` (literal 0.5) and `vwap_threshold` (setting) | `calc_definitions` row + `calc_pattern_bindings` rows | Literal `qty_threshold` stays inline. Setting-sourced `vwap_threshold` -> bindings for each `wash_vwap_threshold` context: default, `asset_class=equity`, `{asset_class=equity, exchange_mic=XNYS}`, `product=AAPL`, `asset_class=fixed_income`, `asset_class=index`. |

**Summary**: 10 calculation JSON files become 10 `calc_definitions` rows. 6 of 10 calculations have setting-sourced parameters and require `calc_pattern_bindings` rows. 4 calculations (value_calc, adjusted_direction, trading_activity_aggregation, vwap_calc) have no bindings. Total estimated bindings: ~35 rows.

### 1.3 Detection Model Files

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/detection_models/wash_full_day.json` | JSON with `model_id`, `granularity`, `calculations[]`, `score_threshold_setting`, `query` | `detection_models` row + `model_calculations` rows + `model_pattern_bindings` rows | Split: model definition -> `detection_models`. `granularity: ["product_id", "account_id"]` -> `detection_level_pattern` FK pointing to a 2-row pattern in `match_pattern_attributes`. `calculations[3]` -> 3 `model_calculations` rows. `score_threshold_setting` -> `model_pattern_bindings` with type `threshold`. |
| `workspace/metadata/detection_models/wash_intraday.json` | JSON (same structure) | `detection_models` row + `model_calculations` rows + `model_pattern_bindings` rows | Same decomposition. Shares calc definitions with `wash_full_day` but uses `trend_window` time window instead of `business_date`. |
| `workspace/metadata/detection_models/market_price_ramping.json` | JSON | `detection_models` row + `model_calculations` rows + `model_pattern_bindings` rows | `granularity: ["product_id", "account_id"]` -> detection level pattern. 3 calculations (trend_detection MUST_PASS, large_trading_activity OPTIONAL, same_side_ratio OPTIONAL). `score_threshold_setting: "mpr_score_threshold"` -> threshold binding. |
| `workspace/metadata/detection_models/insider_dealing.json` | JSON | `detection_models` row + `model_calculations` rows + `model_pattern_bindings` rows | `granularity: ["product_id", "account_id"]` -> detection level pattern. 2 calculations (market_event_detection MUST_PASS, large_trading_activity OPTIONAL). |
| `workspace/metadata/detection_models/spoofing_layering.json` | JSON | `detection_models` row + `model_calculations` rows + `model_pattern_bindings` rows | `granularity: ["product_id", "account_id"]` -> detection level pattern. 2 calculations (cancel_pattern MUST_PASS, opposite_side_execution OPTIONAL). |

**Summary**: 5 detection model JSON files become 5 `detection_models` rows, 13 `model_calculations` rows (sum of all calculations[] arrays across models), and ~15 `model_pattern_bindings` rows (detection_level + classification + threshold per model).

### 1.4 Settings Files -- Thresholds

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/settings/thresholds/business_date_cutoff.json` | JSON: `default="17:00"`, `match_type="hierarchy"`, 3 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | Default becomes a zero-attribute pattern. Each override's flat `match` dict is restructured into `match_pattern_attributes` rows. Override `{"exchange_mic": "XNYS"} -> "21:00"` becomes pattern with 1 attribute row: `(entity=product, entity_attribute=exchange_mic, attribute_value=XNYS)`. The value `"21:00"` goes into `calc_settings.param_value`. |
| `workspace/metadata/settings/thresholds/cancel_count_threshold.json` | JSON: `default=5`, 5 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | 5 overrides become 5 patterns, each with 1 attribute row. Example: `{"asset_class": "equity"} -> 3` becomes pattern with `(entity=product, entity_attribute=asset_class, attribute_value=equity)` and `calc_settings.param_value=3`. |
| `workspace/metadata/settings/thresholds/insider_lookback_days.json` | JSON: `default=30`, 5 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | Same decomposition. 5 single-attribute patterns. |
| `workspace/metadata/settings/thresholds/wash_vwap_threshold.json` | JSON: `default=0.02`, 5 overrides including 1 multi-key and 1 product-specific | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | Multi-key override `{"asset_class": "equity", "exchange_mic": "XNYS"} -> 0.012` becomes pattern with 2 attribute rows. Product-specific `{"product": "AAPL"} -> 0.01` becomes entity key pattern: `(entity=product, entity_attribute=product_id, attribute_value=AAPL)`. Manual `priority: 100` is eliminated -- entity key wins automatically via resolution rules. |
| `workspace/metadata/settings/thresholds/large_activity_multiplier.json` | JSON: `default=2.0`, 5 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | 5 single-attribute patterns for asset classes. |
| `workspace/metadata/settings/thresholds/trend_sensitivity.json` | JSON: `default=3.5`, 4 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | 4 single-attribute patterns. |

**Summary**: 6 threshold setting files produce: 6 default `calc_settings` rows (zero-attribute patterns), 27 override `calc_settings` rows, 27 `match_patterns` rows, and ~29 `match_pattern_attributes` rows (most are single-attribute; `wash_vwap_threshold` has one 2-attribute pattern).

### 1.5 Settings Files -- Score Steps

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/settings/score_steps/market_event_score_steps.json` | JSON: `default=[4 steps]`, 0 overrides | `score_steps` rows + zero-attribute `match_pattern` | Default step array `[{min:0, max:1.5, score:0}, {min:1.5, max:3.0, score:3}, {min:3.0, max:5.0, score:7}, {min:5.0, max:null, score:10}]` becomes 4 `score_steps` rows linked to a zero-attribute pattern. |
| `workspace/metadata/settings/score_steps/quantity_match_score_steps.json` | JSON: `default=[4 steps]`, 0 overrides | `score_steps` rows + zero-attribute `match_pattern` | 4 default steps, no overrides. Straightforward extraction. |
| `workspace/metadata/settings/score_steps/vwap_proximity_score_steps.json` | JSON: `default=[4 steps]`, 0 overrides | `score_steps` rows + zero-attribute `match_pattern` | 4 default steps with inverted scale (lower proximity = higher score). |
| `workspace/metadata/settings/score_steps/large_activity_score_steps.json` | JSON: `default=[4 steps]`, 1 override for `asset_class=equity` with different step array | `score_steps` rows (default + override) + `match_patterns` + `match_pattern_attributes` | Default: 4 rows linked to zero-attribute pattern. Equity override: 4 rows linked to pattern `(entity=product, entity_attribute=asset_class, attribute_value=equity)`. Total: 8 `score_steps` rows, 2 patterns. |
| `workspace/metadata/settings/score_steps/same_side_pct_score_steps.json` | JSON: `default=[4 steps]`, 0 overrides | `score_steps` rows + zero-attribute `match_pattern` | 4 default steps, no overrides. |

**Summary**: 5 score step setting files produce: 24 `score_steps` rows (5 default arrays of 4 steps + 1 override array of 4 steps), 6 `match_patterns` rows, and 1 `match_pattern_attributes` row (the equity override for `large_activity_score_steps`).

### 1.6 Settings Files -- Score Thresholds

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/settings/score_thresholds/insider_score_threshold.json` | JSON: `default=10`, 0 overrides | `calc_settings` row + zero-attribute `match_pattern` | Single default value, no overrides. |
| `workspace/metadata/settings/score_thresholds/spoofing_score_threshold.json` | JSON: `default=12`, 3 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | Default + 3 asset-class overrides (equity=10, fixed_income=7, index=6). |
| `workspace/metadata/settings/score_thresholds/wash_score_threshold.json` | JSON: `default=10`, 4 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | Default + 4 asset-class overrides (equity=8, fx=12, fixed_income=8, index=7). |
| `workspace/metadata/settings/score_thresholds/mpr_score_threshold.json` | JSON: `default=18`, 4 overrides | `calc_settings` rows + `match_patterns` + `match_pattern_attributes` | Default + 4 asset-class overrides (equity=16, commodity=14, fixed_income=7, index=6). |

**Summary**: 4 score threshold files produce: 4 default `calc_settings` rows, 11 override `calc_settings` rows, 11 `match_patterns` rows, and 11 `match_pattern_attributes` rows.

### 1.7 Match Pattern Files

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/match_patterns/commodity_instruments.json` | JSON: `match: {"asset_class": "commodity"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row: `(entity=product, entity_attribute=asset_class, attribute_value=commodity)`. Add `pattern_type` discriminator based on usage context. |
| `workspace/metadata/match_patterns/equity_nyse.json` | JSON: `match: {"asset_class": "equity", "exchange_mic": "XNYS"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 2 attribute rows: `(product, asset_class, equity)` AND `(product, exchange_mic, XNYS)`. |
| `workspace/metadata/match_patterns/equity_stocks.json` | JSON: `match: {"asset_class": "equity"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row. |
| `workspace/metadata/match_patterns/fixed_income_all.json` | JSON: `match: {"asset_class": "fixed_income"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row. |
| `workspace/metadata/match_patterns/fixed_income_bonds.json` | JSON: `match: {"asset_class": "fixed_income", "instrument_type": "bond"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 2 attribute rows: `(product, asset_class, fixed_income)` AND `(product, instrument_type, bond)`. |
| `workspace/metadata/match_patterns/fx_instruments.json` | JSON: `match: {"asset_class": "fx"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row. |
| `workspace/metadata/match_patterns/index_instruments.json` | JSON: `match: {"asset_class": "index"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row. |
| `workspace/metadata/match_patterns/nasdaq_listed.json` | JSON: `match: {"exchange_mic": "XNAS"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row: `(product, exchange_mic, XNAS)`. Note: entity explicitly set to `product` in proposed model. |
| `workspace/metadata/match_patterns/nyse_listed.json` | JSON: `match: {"exchange_mic": "XNYS"}` | `match_patterns` + `match_pattern_attributes` | 1 pattern row + 1 attribute row: `(product, exchange_mic, XNYS)`. |

**Summary**: 9 match pattern JSON files become 9 `match_patterns` rows and 11 `match_pattern_attributes` rows (7 single-attribute + 2 dual-attribute patterns). Currently these patterns are **not referenced** by any settings override -- the proposed system connects them via `calc_pattern_bindings`.

### 1.8 Score Template Files

| Current File/Directory | Current Format | Proposed Table | Migration Notes |
|---|---|---|---|
| `workspace/metadata/score_templates/count_high.json` | JSON: `template_id`, `value_category`, `steps[4]` | `score_steps` (as template references) | Templates become reusable step sets. Each template's `steps` array is stored as `score_steps` rows with a `template_id` reference. Calculations can reference a template instead of inlining step arrays. |
| `workspace/metadata/score_templates/count_low.json` | JSON | `score_steps` (as template references) | Same pattern. |
| `workspace/metadata/score_templates/percentage_standard.json` | JSON | `score_steps` (as template references) | Same pattern. |
| `workspace/metadata/score_templates/ratio_binary.json` | JSON: 2 steps (not 4) | `score_steps` (as template references) | Binary template has only 2 steps: `[0, 0.5) -> 0` and `[0.5, 1.0) -> 10`. |
| `workspace/metadata/score_templates/ratio_graduated.json` | JSON | `score_steps` (as template references) | Same pattern. |
| `workspace/metadata/score_templates/volume_fx.json` | JSON | `score_steps` (as template references) | FX-specific thresholds 10x higher than standard. |
| `workspace/metadata/score_templates/volume_standard.json` | JSON | `score_steps` (as template references) | Standard volume thresholds. |

**Summary**: 7 score template files become reusable step sets in `score_steps` with a `template_id` column. Total: 7 templates x ~4 steps each = ~27 `score_steps` rows. Templates are a proposed addition -- the current system does not reference them from detection models.

---

## 2. Settings Resolver to Proposed Resolution

This section maps every component of the current settings resolution system to its proposed equivalent. The proposed system **unifies** the two current resolution strategies (hierarchy and multi-dimensional) into a single algorithm.

| Current Component | Location | Proposed Component | Change Description |
|---|---|---|---|
| `SettingDefinition.match_type` (`"hierarchy"` or `"multi_dimensional"`) | `backend/models/settings.py` line 25 | **Eliminated** | The `match_type` discriminator is no longer needed. Both strategies reduce to the same algorithm: sort by `matched_attribute_count` DESC, `pattern_id` ASC. The distinction was artificial -- see Section 2.1 below. |
| `SettingOverride.match` (flat `dict[str, str]`) | `backend/models/settings.py` line 14 | `match_pattern_attributes` rows | Each key-value pair in the flat match dict becomes a row: `(pattern_id, entity, entity_attribute, attribute_value)`. The `entity` column is added -- currently implicit. |
| `SettingOverride.priority` (manually-assigned integer) | `backend/models/settings.py` line 16 | **Computed from `matched_attribute_count`** | Manual priority integers (1, 2, 100) are replaced by automatic priority derived from the number of matching attribute rows. Entity key matches (e.g., `product_id=AAPL`) always win. See document 08. |
| `SettingOverride.value` (the resolved parameter value) | `backend/models/settings.py` line 15 | `calc_settings.param_value` | The value moves from inline on the override to a separate row in `calc_settings`, linked to a `match_pattern` via `pattern_id`. |
| `SettingDefinition.default` (fallback value) | `backend/models/settings.py` line 24 | Zero-attribute pattern (no rows in `match_pattern_attributes`) | A default is represented by a `calc_settings` row whose `pattern_id` points to a `match_patterns` row with zero child rows in `match_pattern_attributes`. Zero attributes = matches everything = lowest priority. |
| `_all_keys_match(match, context)` | `backend/engine/settings_resolver.py` line 20-21 | Subset check against pattern attributes | `_all_keys_match` checks `all(context.get(k) == v for k, v in match.items())`. Proposed: check that all `match_pattern_attributes` rows for a pattern have their `attribute_value` present in the entity context. Semantically identical, structurally different. |
| `_count_matching_dimensions(match, context)` | `backend/engine/settings_resolver.py` lines 24-29 | `COUNT(*)` of matching attribute rows | Current: counts matching keys and returns 0 if not all match. Proposed: `COUNT(*)` of `match_pattern_attributes` rows where the entity context satisfies the predicate. Returns 0 if any row fails (same all-or-nothing semantics). |
| `HierarchyStrategy.resolve()` | `backend/engine/settings_resolver.py` lines 40-54 | **Single resolution algorithm** | Hierarchy sorts by `(len(o.match), o.priority)` descending. Proposed: sort by `(has_entity_key DESC, matched_attribute_count DESC, pattern_id ASC)`. The hierarchy concept is subsumed by count-based priority. |
| `MultiDimensionalStrategy.resolve()` | `backend/engine/settings_resolver.py` lines 57-72 | **Same single algorithm** | Multi-dimensional sorts by `(match_count, o.priority)` descending. Proposed: same sort as hierarchy. Both strategies already count attributes -- the only difference was the all-or-nothing gate in hierarchy mode. In the proposed system, the all-or-nothing gate is always applied (a pattern matches only if ALL its attributes match), making the two strategies identical. |
| `RESOLUTION_STRATEGIES` registry | `backend/engine/settings_resolver.py` lines 79-82 | **Eliminated** | The strategy registry with `"hierarchy"` and `"multi_dimensional"` entries is no longer needed. One algorithm handles all cases. |
| `SettingsResolver.resolve(setting, context)` | `backend/engine/settings_resolver.py` lines 90-118 | Same interface, different internals | The public API remains `resolve(setting, context) -> ResolutionResult`. Internally, the resolution queries `match_patterns` + `match_pattern_attributes` instead of iterating `setting.overrides`. |
| `SettingsResolver.evaluate_score(steps, value)` | `backend/engine/settings_resolver.py` lines 120-130 | **No change** | Score step evaluation (range lookup) is unchanged. The algorithm `min_v <= value < max_v` remains identical. |
| `SettingDefinition.overrides` (list sorted by priority desc) | `backend/models/settings.py` lines 29-31 | **Eliminated** | Overrides are no longer inline on the setting definition. They live in `calc_settings` rows linked to `match_patterns`. The `@model_validator` that sorts by priority is no longer needed. |

### 2.1 Why Hierarchy and Multi-Dimensional Unify

The current system has two resolution strategies that differ in one detail:

| Aspect | HierarchyStrategy | MultiDimensionalStrategy |
|---|---|---|
| All keys must match? | Yes (`_all_keys_match`) | Yes (`_count_matching_dimensions` returns 0 if not all match) |
| Sort by match count? | Yes (`len(o.match)`) | Yes (`match_count`) |
| Tiebreak by priority? | Yes (`o.priority`) | Yes (`o.priority`) |

Both strategies require all keys to match (the multi-dimensional strategy's `_count_matching_dimensions` returns 0 when any key fails). Both sort by match count descending. Both tiebreak by priority descending. The only observable difference is the tiebreak value: hierarchy uses `priority`, while the proposed system uses `pattern_id ASC` (deterministic, no manual assignment).

Since both strategies already implement the same core algorithm, the proposed system drops the `match_type` discriminator and uses one algorithm everywhere.

---

## 3. Detection Engine to Proposed Pipeline

This section maps the current detection engine (file: `backend/engine/detection_engine.py`) to the proposed pipeline.

| Current Component | Location | Proposed Component | Change Description |
|---|---|---|---|
| `model.granularity` (`list[str]`, e.g. `["product_id", "account_id"]`) | `backend/models/detection.py` line 32 | `detection_level_pattern` FK on `detection_models` | The flat list of column names becomes a reference to a `match_patterns` row of type `detection_level`. Each list entry becomes a `match_pattern_attributes` row with `attribute_value=NULL` (NULL = grouping key). Example: `["product_id", "account_id"]` -> 2 attribute rows: `(product, product_id, NULL)` and `(account, account_id, NULL)`. |
| `model.query` (hardcoded SQL string) | `backend/models/detection.py` line 39 | Generated from `detection_level` + classification patterns | The hardcoded SQL template is replaced by a query generator that reads the detection level pattern (GROUP BY dimensions), classification pattern (WHERE filters), and calculation dependencies (JOIN conditions) from metadata. The SQL is assembled at runtime. |
| `model.context_fields` (`list[str]`) | `backend/models/detection.py` lines 35-37 | Derived from detection level entity attributes | Currently a static list like `["product_id", "account_id", "business_date", "asset_class", "instrument_type"]`. Proposed: automatically derived by traversing the entity graph from the detection level's grouping entities. If the detection level groups by `product_id` and `account_id`, the engine walks product's attributes and account's attributes to build the context field list. |
| `model.calculations[]` (inline `ModelCalculation` array) | `backend/models/detection.py` lines 19-24 | `model_calculations` table rows | Each `ModelCalculation` object in the JSON array becomes a row in `model_calculations` with FK to the model and calc. |
| `ModelCalculation.strictness` (`MUST_PASS` / `OPTIONAL`) | `backend/models/detection.py` line 21 | Same (`strictness` column on `model_calculations`) | No change to the enum or its semantics. |
| `ModelCalculation.score_steps_setting` (setting_id string) | `backend/models/detection.py` line 23 | `calc_pattern_bindings` with `binding_type='score'` | The inline `score_steps_setting` reference becomes a binding row that connects the calculation to a match pattern of type `score`, which in turn resolves to the correct score step array via the entity context. |
| `ModelCalculation.threshold_setting` (setting_id string) | `backend/models/detection.py` line 22 | `calc_pattern_bindings` with `binding_type='threshold'` | Same transformation as score_steps_setting but for threshold resolution. |
| `DetectionEngine._evaluate_candidate(model, row, count)` | `backend/engine/detection_engine.py` lines 121-174 | Same logic, different data source | The method signature and core algorithm remain the same. The difference is where entity context comes from: currently extracted from `row` columns; proposed: extracted from `row` columns AND enriched by the detection level pattern's entity attribute metadata. |
| `DetectionEngine._evaluate_calculation(mc, row, context)` | `backend/engine/detection_engine.py` lines 176-229 | Same logic, resolves via pattern instead of setting | Currently calls `self._resolver.resolve(setting, context)` where `context` is built from query row columns. Proposed: same call, but `context` is enriched with additional attributes resolved via entity graph traversal from the match pattern. |
| `DetectionEngine._resolve_score_threshold(model, context)` | `backend/engine/detection_engine.py` lines 231-238 | Same, but pattern-based resolution | Currently loads the score threshold setting and resolves with entity context. Proposed: the score threshold setting is resolved through a `model_pattern_bindings` row of type `threshold`, which provides the match pattern context. The `SettingsResolver.resolve()` call is the same. |
| `DetectionEngine._execute_query(sql)` | `backend/engine/detection_engine.py` lines 60-71 | Proposed: query is generated, not static | Currently executes the model's hardcoded `query` string. Proposed: the query is assembled from detection level (GROUP BY), classification (WHERE), and calculation dependencies (JOINs). The execution method itself is unchanged. |
| `DetectionEngine.evaluate_model(model_id)` | `backend/engine/detection_engine.py` lines 30-46 | Same orchestration, richer metadata | Loads model -> executes query -> evaluates candidates. Proposed: additionally loads detection level pattern, classification pattern, and calculation bindings before executing. |

---

## 4. Alert Service to Proposed Trace Structure

This section maps every field in the current `AlertTrace` model (file: `backend/models/alerts.py`) to the proposed structure.

| Current AlertTrace Field | Type | Proposed | Change |
|---|---|---|---|
| `alert_id` | `str` (e.g. `"ALT-1A2B3C4D"`) | `alert_id` | No change. UUID-based identifier. |
| `model_id` | `str` (e.g. `"wash_full_day"`) | `model_id` | No change. FK to `detection_models`. |
| `model_name` | `str` | `model_name` | No change. Human-readable display name. |
| `timestamp` | `datetime` | `timestamp` | No change. Alert generation time. |
| `entity_context` | `dict[str, str]` (e.g. `{"product_id": "AAPL", "account_id": "ACC-001", "asset_class": "equity"}`) | `entity_context` | No change to field. Values are the same. The difference is how the context is assembled (from detection level pattern traversal, not just query columns). |
| `calculation_scores` | `list[CalculationScore]` | `calculation_scores` | No change to structure. Each entry still has `calc_id`, `computed_value`, `threshold`, `threshold_passed`, `score`, `score_step_matched`, `strictness`. |
| `accumulated_score` | `float` | `accumulated_score` | No change. Sum of all calculation scores. |
| `score_threshold` | `float` | `score_threshold` | No change. The resolved minimum score for alert generation. |
| `trigger_path` | `str` (`"all_passed"`, `"score_based"`, `"none"`) | `trigger_path` | No change. |
| `alert_fired` | `bool` | `alert_fired` | No change. |
| `executed_sql` | `str` | `executed_sql` | No change to field. The SQL content will differ (generated vs. hardcoded), but the field type and purpose are the same. |
| `sql_row_count` | `int` | `sql_row_count` | No change. |
| `resolved_settings` | `dict[str, Any]` (setting_id -> {value, why, matched_override}) | `resolved_settings` -- **enhanced with `pattern_id`** | Each entry gains a `pattern_id` field identifying which `match_patterns` row drove the resolution. Currently, the `matched_override` dict contains the flat match object; proposed: it contains the `pattern_id` and the match pattern attributes. |
| `settings_trace` | `list[SettingsTraceEntry]` | `settings_trace` + **NEW `pattern_trace`** | Split into two traces: (1) `settings_trace` retains setting-level resolution info (setting_id, setting_name, resolved_value, why). (2) New `pattern_trace` records which `match_patterns` and `match_pattern_attributes` rows were evaluated, which matched, and the `matched_attribute_count` that determined priority. |
| `calculation_traces` | `list[CalculationTraceEntry]` | `calculation_traces` -- **enhanced with `instance_id`** | Each `CalculationTraceEntry` gains an `instance_id` field (from the `calc_instances` table) that uniquely identifies the parameterized calculation instance. This enables "which instance of this calculation produced this result?" traceability. |
| `scoring_breakdown` | `list[dict]` | `scoring_breakdown` | No change. Per-calculation score details. |
| `entity_context_source` | `dict[str, str]` | `entity_context_source` | No change. Maps context field names to their source query columns. |
| `calculation_trace` (legacy) | `dict[str, Any]` | `calculation_trace` | No change. Legacy field for backwards compatibility. |
| `related_data` | `dict[str, Any]` | `related_data` | No change. |

### New Fields in Proposed AlertTrace

| New Field | Type | Purpose |
|---|---|---|
| `pattern_trace` | `list[PatternTraceEntry]` | Records which match patterns were evaluated during settings resolution, which attributes matched, the `matched_attribute_count` for each, and which pattern won. Enables "why was this threshold chosen over that one?" explainability. |
| `detection_level_pattern_id` | `str` | FK to the `match_patterns` row that defined the alert's grouping grain. Enables "what grain was this alert generated at?" queries. |
| `classification_pattern_id` | `str | None` | FK to the classification pattern that filtered the data (NULL = all data, no filter). |

### Proposed `PatternTraceEntry` Structure

```python
class PatternTraceEntry(BaseModel):
    pattern_id: str
    pattern_type: str  # "setting", "threshold", "score"
    setting_id: str | None = None
    attributes_evaluated: list[dict]  # [{entity, entity_attribute, attribute_value, matched: bool}]
    matched_attribute_count: int
    was_selected: bool  # True if this pattern won the resolution
    reason: str  # "3 of 3 attributes matched, count=3, pattern_id=equity_nyse"
```

---

## 5. Concrete Migration Example: `wash_vwap_threshold`

This section traces one complete setting through the entire current and proposed systems, verifying behavioral equivalence.

### 5.1 Current JSON (Full File Content)

File: `workspace/metadata/settings/thresholds/wash_vwap_threshold.json`

```json
{
  "setting_id": "wash_vwap_threshold",
  "name": "Wash VWAP Threshold",
  "description": "VWAP proximity threshold for wash trading detection. Trades within this percentage of VWAP are considered suspicious.",
  "value_type": "decimal",
  "default": 0.02,
  "match_type": "hierarchy",
  "overrides": [
    {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
    {"match": {"asset_class": "equity", "exchange_mic": "XNYS"}, "value": 0.012, "priority": 2},
    {"match": {"product": "AAPL"}, "value": 0.01, "priority": 100},
    {"match": {"asset_class": "fixed_income"}, "value": 0.01, "priority": 1,
     "description": "Tighter threshold for fixed income -- less volatile markets"},
    {"match": {"asset_class": "index"}, "value": 0.015, "priority": 1,
     "description": "Slightly tighter threshold for index instruments"}
  ]
}
```

### 5.2 Proposed Tables (Exact Rows)

#### `match_patterns` rows

| pattern_id | pattern_type | description |
|---|---|---|
| `wash_vwap_default` | `setting` | Default wash VWAP threshold (all products) |
| `wash_vwap_equity` | `setting` | Wash VWAP threshold for equity instruments |
| `wash_vwap_equity_nyse` | `setting` | Wash VWAP threshold for equity on NYSE |
| `wash_vwap_aapl` | `setting` | Wash VWAP threshold for AAPL specifically |
| `wash_vwap_fixed_income` | `setting` | Wash VWAP threshold for fixed income |
| `wash_vwap_index` | `setting` | Wash VWAP threshold for index instruments |

#### `match_pattern_attributes` rows

| pattern_id | entity | entity_attribute | attribute_value |
|---|---|---|---|
| `wash_vwap_default` | *(no rows -- zero-attribute pattern = matches everything)* | | |
| `wash_vwap_equity` | `product` | `asset_class` | `equity` |
| `wash_vwap_equity_nyse` | `product` | `asset_class` | `equity` |
| `wash_vwap_equity_nyse` | `product` | `exchange_mic` | `XNYS` |
| `wash_vwap_aapl` | `product` | `product_id` | `AAPL` |
| `wash_vwap_fixed_income` | `product` | `asset_class` | `fixed_income` |
| `wash_vwap_index` | `product` | `asset_class` | `index` |

Total: 6 `match_patterns` rows, 6 `match_pattern_attributes` rows (the default pattern has zero attribute rows).

#### `calc_settings` rows

| setting_id | pattern_id | param_value |
|---|---|---|
| `wash_vwap_threshold` | `wash_vwap_default` | `0.02` |
| `wash_vwap_threshold` | `wash_vwap_equity` | `0.015` |
| `wash_vwap_threshold` | `wash_vwap_equity_nyse` | `0.012` |
| `wash_vwap_threshold` | `wash_vwap_aapl` | `0.01` |
| `wash_vwap_threshold` | `wash_vwap_fixed_income` | `0.01` |
| `wash_vwap_threshold` | `wash_vwap_index` | `0.015` |

### 5.3 Current Resolution Code Path

For context `{"asset_class": "equity", "exchange_mic": "XNYS"}`:

```
1. SettingsResolver.resolve(setting, context)
   |
   2. strategy = RESOLUTION_STRATEGIES["hierarchy"]  # from setting.match_type
   |
   3. HierarchyStrategy.resolve(overrides, context)
      |
      4. For each override, call _all_keys_match(override.match, context):
         |
         | Override: {"asset_class": "equity"}
         |   _all_keys_match({"asset_class": "equity"}, {"asset_class": "equity", "exchange_mic": "XNYS"})
         |   -> context.get("asset_class") == "equity" -> True
         |   -> ALL match -> CANDIDATE (match count = 1)
         |
         | Override: {"asset_class": "equity", "exchange_mic": "XNYS"}
         |   _all_keys_match({"asset_class": "equity", "exchange_mic": "XNYS"}, {"asset_class": "equity", "exchange_mic": "XNYS"})
         |   -> context.get("asset_class") == "equity" -> True
         |   -> context.get("exchange_mic") == "XNYS" -> True
         |   -> ALL match -> CANDIDATE (match count = 2)
         |
         | Override: {"product": "AAPL"}
         |   _all_keys_match({"product": "AAPL"}, {"asset_class": "equity", "exchange_mic": "XNYS"})
         |   -> context.get("product") == "AAPL" -> False (key "product" not in context)
         |   -> NOT all match -> SKIP
         |
         | Override: {"asset_class": "fixed_income"}
         |   -> context.get("asset_class") == "fixed_income" -> False
         |   -> SKIP
         |
         | Override: {"asset_class": "index"}
         |   -> context.get("asset_class") == "index" -> False
         |   -> SKIP
      |
      5. Sort candidates by (len(match) DESC, priority DESC):
         | Candidate 1: match={"asset_class": "equity", "exchange_mic": "XNYS"}, len=2, priority=2
         | Candidate 2: match={"asset_class": "equity"}, len=1, priority=1
         | Sorted: [(2, 2), (1, 1)] -> Candidate 1 wins
      |
      6. Return override with value 0.012
   |
   7. ResolutionResult(setting_id="wash_vwap_threshold", value=0.012,
        why="Matched override: {asset_class=equity, exchange_mic=XNYS} (priority 2)")
```

**Result**: `0.012`

### 5.4 Proposed Resolution

For the same context `{"asset_class": "equity", "exchange_mic": "XNYS"}`:

```
1. Load all match_patterns linked to setting_id="wash_vwap_threshold" via calc_settings
   |
2. For each pattern, evaluate match_pattern_attributes against context:
   |
   | Pattern: wash_vwap_default (0 attributes)
   |   -> 0 attributes to check -> ALL match (vacuously true)
   |   -> matched_attribute_count = 0, has_entity_key = FALSE
   |
   | Pattern: wash_vwap_equity (1 attribute: product.asset_class=equity)
   |   -> Check: context has asset_class? Yes. Value = "equity"? Yes.
   |   -> matched_attribute_count = 1, has_entity_key = FALSE
   |
   | Pattern: wash_vwap_equity_nyse (2 attributes: product.asset_class=equity, product.exchange_mic=XNYS)
   |   -> Check: context has asset_class=equity? Yes.
   |   -> Check: context has exchange_mic=XNYS? Yes.
   |   -> matched_attribute_count = 2, has_entity_key = FALSE
   |
   | Pattern: wash_vwap_aapl (1 attribute: product.product_id=AAPL)
   |   -> Check: context has product_id=AAPL? No ("product_id" not in context).
   |   -> NOT all attributes match -> SKIP (matched_attribute_count = 0)
   |
   | Pattern: wash_vwap_fixed_income (1 attribute: product.asset_class=fixed_income)
   |   -> Check: context has asset_class=fixed_income? No (context has "equity").
   |   -> SKIP
   |
   | Pattern: wash_vwap_index (1 attribute: product.asset_class=index)
   |   -> Check: context has asset_class=index? No.
   |   -> SKIP
   |
3. Sort matching patterns by (has_entity_key DESC, matched_attribute_count DESC, pattern_id ASC):
   |
   | wash_vwap_equity_nyse: (FALSE, 2, "wash_vwap_equity_nyse")
   | wash_vwap_equity:      (FALSE, 1, "wash_vwap_equity")
   | wash_vwap_default:     (FALSE, 0, "wash_vwap_default")
   |
   | Winner: wash_vwap_equity_nyse (highest matched_attribute_count = 2)
   |
4. Look up calc_settings for (wash_vwap_threshold, wash_vwap_equity_nyse):
   -> param_value = 0.012
```

**Result**: `0.012`

### 5.5 Equivalence Verification

| Context | Current Result | Proposed Result | Match? |
|---|---|---|---|
| `{"asset_class": "equity", "exchange_mic": "XNYS"}` | `0.012` (2-key override, priority 2) | `0.012` (2-attribute pattern, count=2) | YES |
| `{"asset_class": "equity"}` | `0.015` (1-key override, priority 1) | `0.015` (1-attribute pattern, count=1) | YES |
| `{"product": "AAPL"}` (current key) / `{"product_id": "AAPL"}` (proposed key) | `0.01` (entity key, priority 100) | `0.01` (entity key pattern, has_entity_key=TRUE) | YES |
| `{"asset_class": "fixed_income"}` | `0.01` (1-key override, priority 1) | `0.01` (1-attribute pattern, count=1) | YES |
| `{"asset_class": "index"}` | `0.015` (1-key override, priority 1) | `0.015` (1-attribute pattern, count=1) | YES |
| `{"asset_class": "commodity"}` | `0.02` (default -- no match) | `0.02` (default -- zero-attribute pattern) | YES |
| `{}` (empty context) | `0.02` (default -- no match) | `0.02` (default -- zero-attribute pattern) | YES |
| `{"asset_class": "equity", "exchange_mic": "XNYS", "product_id": "AAPL"}` | `0.01` (priority 100 wins) | `0.01` (entity key wins via has_entity_key=TRUE) | YES |

All 8 test cases produce identical results. The proposed resolution is a behavioral superset of the current system.

**Note on key naming**: The current system uses `"product"` as the match key for AAPL (`{"product": "AAPL"}`), while the proposed system uses the actual entity attribute name `"product_id"` with explicit entity reference `entity=product`. During migration, the flat key `"product"` must be mapped to `(entity=product, entity_attribute=product_id, attribute_value=AAPL)`.

---

## 6. What Stays the Same

This section documents all components that are preserved unchanged or extended without breaking changes.

### 6.1 Entity JSON Metadata Files -- No Changes

All 8 entity definition files in `workspace/metadata/entities/` remain as-is:

- `account.json` (9 fields, 2 relationships)
- `execution.json` (13 fields, 6 relationships)
- `md_eod.json` (10 fields, 0 relationships)
- `md_intraday.json` (8 fields, 1 relationship)
- `order.json` (14 fields, 5 relationships)
- `product.json` (18 fields, 5 relationships)
- `trader.json` (6 fields, 3 relationships)
- `venue.json` (8 fields, 3 relationships)

Entity definitions drive the entity relationship graph that match patterns reference, but the definitions themselves do not change. Field names, types, relationships, and domain values are all preserved.

### 6.2 Calculation SQL Logic -- No Changes to Formulas

All 10 calculation SQL templates remain unchanged:

| Calculation | Layer | SQL Logic Change? |
|---|---|---|
| `value_calc` | transaction | No change -- `CASE WHEN instrument_type IN ('call_option', 'put_option') THEN price * contract_size * quantity ...` |
| `adjusted_direction` | transaction | No change -- `CASE WHEN instrument_type = 'put_option' AND side = 'BUY' THEN 'SELL' ...` |
| `business_date_window` | time_window | No change to logic -- `CASE WHEN execution_time > $cutoff_time THEN ... END`. Parameter substitution mechanism changes (pattern-based vs. setting-based), but the SQL template is identical. |
| `cancellation_pattern` | time_window | No change -- `HAVING COUNT(*) >= $cancel_threshold`. Same SQL, different parameter source. |
| `market_event_window` | time_window | No change -- price change and volume spike detection logic preserved. |
| `trend_window` | time_window | No change -- `CASE WHEN close_price > open_price + (price_stddev * $trend_multiplier) THEN 'up' ...` |
| `trading_activity_aggregation` | aggregation | No change -- SUM/COUNT GROUP BY logic preserved. |
| `vwap_calc` | aggregation | No change -- VWAP = SUM(price * quantity) / SUM(quantity) logic preserved. |
| `large_trading_activity` | derived | No change -- `CASE WHEN total_value > avg_daily_value * $activity_multiplier THEN TRUE ...` |
| `wash_detection` | derived | No change -- quantity match ratio and VWAP proximity logic preserved. |

### 6.3 MUST_PASS / OPTIONAL Strictness Model -- No Changes

The `Strictness` enum (`backend/models/detection.py`):

```python
class Strictness(StrEnum):
    MUST_PASS = "MUST_PASS"
    OPTIONAL = "OPTIONAL"
```

The semantics are identical:
- `MUST_PASS`: calculation must pass (threshold_passed = True) for the alert to fire, regardless of accumulated score
- `OPTIONAL`: calculation contributes to the score but is not required to pass

The trigger logic in `_determine_trigger()` is preserved:
```python
must_pass_ok = all(
    cs.threshold_passed
    for cs, mc in zip(calc_scores, model_calcs)
    if mc.strictness == Strictness.MUST_PASS
)
alert_fired = must_pass_ok and (all_passed or score_ok)
```

### 6.4 Score Evaluation Algorithm -- No Changes

The `evaluate_score()` method on `SettingsResolver` is unchanged:

```python
def evaluate_score(self, steps: list[ScoreStep], value: float) -> float:
    for step in steps:
        min_v = step.min_value if step.min_value is not None else float("-inf")
        max_v = step.max_value if step.max_value is not None else float("inf")
        if min_v <= value < max_v:
            return step.score
        if max_v == float("inf") and value >= min_v:
            return step.score
    return 0.0
```

The four-tier graduated scale (0, 3, 7, 10) and the range semantics (inclusive lower, exclusive upper) are preserved. Score step arrays are loaded from `score_steps` table rows instead of inline JSON, but the evaluation algorithm is identical.

### 6.5 Alert Trace Structure -- Extended, Not Replaced

The `AlertTrace` model (`backend/models/alerts.py`) is extended with new fields but all existing fields are preserved:

| Preserved Field | Type | Notes |
|---|---|---|
| `alert_id` | `str` | UUID-based, unchanged |
| `model_id` | `str` | FK to detection model |
| `model_name` | `str` | Display name |
| `timestamp` | `datetime` | Generation time |
| `entity_context` | `dict[str, str]` | Context key-values |
| `calculation_scores` | `list[CalculationScore]` | Per-calc scores |
| `accumulated_score` | `float` | Sum of scores |
| `score_threshold` | `float` | Alert firing threshold |
| `trigger_path` | `str` | Trigger mechanism |
| `alert_fired` | `bool` | Alert decision |
| `executed_sql` | `str` | Query that ran |
| `sql_row_count` | `int` | Row count |
| `resolved_settings` | `dict[str, Any]` | Setting resolutions (enhanced) |
| `calculation_traces` | `list[CalculationTraceEntry]` | Per-calc traces (enhanced) |
| `scoring_breakdown` | `list[dict]` | Score details |
| `entity_context_source` | `dict[str, str]` | Context field sources |
| `settings_trace` | `list[SettingsTraceEntry]` | Settings audit trail |
| `calculation_trace` | `dict[str, Any]` | Legacy trace (kept) |
| `related_data` | `dict[str, Any]` | Related data (kept) |

New fields (`pattern_trace`, `detection_level_pattern_id`, `classification_pattern_id`) are additive. Existing API consumers continue to work without modification.

### 6.6 Pydantic Models -- Extended with New Fields

All existing Pydantic models are preserved and extended:

| Model | File | Extension |
|---|---|---|
| `ScoreStep` | `backend/models/settings.py` | No change |
| `SettingOverride` | `backend/models/settings.py` | Deprecated but kept for backwards compatibility |
| `SettingDefinition` | `backend/models/settings.py` | New optional fields for proposed resolution |
| `Strictness` | `backend/models/detection.py` | No change |
| `ModelCalculation` | `backend/models/detection.py` | No change |
| `DetectionModelDefinition` | `backend/models/detection.py` | New `detection_level_pattern_id` field |
| `CalculationScore` | `backend/models/alerts.py` | No change |
| `SettingsTraceEntry` | `backend/models/alerts.py` | Enhanced with `pattern_id` field |
| `CalculationTraceEntry` | `backend/models/alerts.py` | Enhanced with `instance_id` field |
| `AlertTrace` | `backend/models/alerts.py` | New `pattern_trace`, `detection_level_pattern_id`, `classification_pattern_id` fields |

### 6.7 Dual Storage Pattern -- No Changes

The existing triple-storage pattern continues:

| Storage | Role | Change? |
|---|---|---|
| DuckDB | In-process analytical engine | No change |
| Parquet | Persistent columnar storage | No change |
| JSON | Metadata definitions (entities, settings, calculations, models) | Extended with new metadata types (match_patterns, calc_pattern_bindings), but existing JSON files are preserved |

### 6.8 Regulatory Coverage -- No Changes

All `regulatory_coverage` arrays on detection models are preserved:

| Model | Regulations Covered |
|---|---|
| `wash_full_day` | MAR Art. 12(1)(a), MiFID II Art. 16(2), MiFID II RTS 25, SEC 9(a)(2) |
| `wash_intraday` | MAR Art. 12(1)(a), MiFID II Art. 16(2), SEC 9(a)(2) |
| `market_price_ramping` | MAR Art. 12(1)(b), Dodd-Frank 747, FINRA Rule 5210 |
| `insider_dealing` | MAR Art. 14, MAR Art. 16, MiFID II Art. 16(2), SEC Rule 10b-5 |
| `spoofing_layering` | MAR Art. 12(1)(c), Dodd-Frank 747, MiFID II RTS 25 |

Regulatory tags on calculations are also preserved. The proposed system adds traceability (which pattern drove which threshold) but does not alter the regulatory mapping itself.

---

## Cross-References

| Document | Relationship to This Appendix |
|---|---|
| 02 Current State Analysis | Provides the baseline that this appendix maps FROM |
| 03 Gap Analysis | Identifies gaps that this mapping addresses |
| 04 Match Pattern Architecture | Defines the 3-column structure that flat match dicts map TO |
| 05 Calculation Instance Model | Defines `calc_pattern_bindings` and instance tracking |
| 08 Resolution Priority Rules | Defines the sort rule that replaces manual priority integers |
| 09 Unified Results Schema | Defines `calc_results` star schema that calculation output maps TO |
| 10 Scoring and Alerting Pipeline | Defines how score patterns replace inline score step settings |
| 11 Entity Relationship Graph | Defines entity reachability used for context enrichment |
| 12 Settings Resolution Patterns | Detailed mapping of hierarchy/multi-dimensional unification |
| Appendix A | Full DDL for all proposed tables referenced in this document |
| Appendix B | Worked examples that use the mappings defined here |
| Appendix D | Phased implementation roadmap for executing this migration |
