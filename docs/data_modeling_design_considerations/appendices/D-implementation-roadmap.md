# Appendix D: Implementation Roadmap

**Document**: Appendix D of the Data Modeling Design Considerations series
**Audience**: All (planning document)
**Last updated**: 2026-03-09

---

## 1. Migration Philosophy

This roadmap describes an **incremental, backwards-compatible migration** from the current JSON-metadata-driven surveillance system to the proposed relational architecture documented in this series. Five principles govern the approach:

**No big-bang cutover.** The migration is split into 10 phases. Each phase delivers independently valuable functionality. At no point does the system enter a broken or half-migrated state. The current system continues operating exactly as it does today until the final deprecation phase, which only executes after all new capabilities have been verified.

**Additive, not replacing.** New tables, services, and APIs are created *alongside* existing ones. The current JSON-based configuration, per-calculation output tables, and hardcoded granularity all continue functioning throughout the migration. New capabilities augment the existing system rather than replacing it. Replacement happens only in Phase 10, after months of side-by-side verification.

**Each phase independently valuable.** Phase 2 gives you queryable relational tables for metadata that currently lives in JSON files. Phase 3 gives you typed match patterns with automatic specificity resolution. Phase 5 gives you reusable time windows. No phase depends on the migration being "complete" to deliver value. If the migration pauses at any phase, the system is in a valid, operational state.

**Side-by-side verification at every phase.** The core risk of any data model migration is behavioral divergence -- the new system producing different results than the old system. Every phase that touches resolution logic, calculation execution, or alert generation includes explicit side-by-side comparison: run both old and new code paths, compare outputs row-by-row, and flag any differences before cutover.

**Each phase has its own verification criteria.** No phase is "done" based on subjective judgment. Each phase defines concrete, testable success criteria: specific tables exist, specific queries return expected results, specific alerts match between old and new code paths. Phase completion is a verifiable fact, not an opinion.

---

## 2. Phase Overview

| Phase | Name | Description | Dependencies | Effort | Risk |
|---|---|---|---|---|---|
| 1 | Documentation | This document suite (complete) | None | Done | None |
| 2 | Table Schemas | Create proposed tables alongside existing JSON | Phase 1 | Small | Low |
| 3 | Match Pattern Types | Implement `pattern_type` discriminator and 3-column structure | Phase 2 | Medium | Medium |
| 4 | Calculation Instances | Formalize calc x pattern bindings | Phase 3 | Medium | Low |
| 5 | Time Windows | Elevate time windows to first-class objects | Phase 2 | Large | Medium |
| 6 | Detection Levels | Configurable grain via match patterns | Phase 3 | Medium | Low |
| 7 | Unified Results | Single `calc_results` table | Phase 4, 5 | Large | High |
| 8 | UX Wizards | Configuration wizard UIs | Phase 3, 6 | Large | Low |
| 9 | Model Migration | Migrate existing 5 models to new system | Phase 3-7 | Medium | Medium |
| 10 | Deprecation | Remove old JSON-based configuration | Phase 9 | Small | Medium |

**Effort scale**: Small = 1-2 sprints, Medium = 2-3 sprints, Large = 3-6 sprints.
**Risk scale**: Low = additive, no existing behavior changes; Medium = touches existing logic but with fallback; High = core data model change affecting downstream systems.

---

## 3. Detailed Phase Descriptions

### Phase 1: Documentation (Complete)

This document suite. Establishes the conceptual architecture, gap analysis, proposed schemas, and worked examples that all subsequent phases reference. No code changes.

**Status**: Complete. Documents 00-18 plus Appendices A-D.

---

### Phase 2: Table Schemas

**Objective**: Create all proposed relational tables in DuckDB, populate them from existing JSON metadata, and expose them through read-only API endpoints. No changes to existing system behavior.

**Deliverables**:
- DuckDB DDL for all proposed tables: `match_patterns`, `match_pattern_attributes`, `calc_definitions`, `calc_pattern_bindings`, `time_windows`, `calc_results`, `detection_level_patterns`, `score_rules`, `setting_overrides` (see Appendix A for full schemas)
- Pydantic v2 models for all new tables (in `backend/models/`)
- Migration script (`scripts/migrate_json_to_tables.py`) that reads existing JSON metadata from `workspace/metadata/` and populates the new tables:
  - 9 match patterns from `workspace/metadata/match_patterns/` --> `match_patterns` + `match_pattern_attributes`
  - 10 calculations from `workspace/metadata/calculations/` --> `calc_definitions`
  - 15 settings from `workspace/metadata/settings/` --> `setting_overrides`
  - 5 detection models from `workspace/metadata/detection_models/` --> detection model reference rows
  - 7 score templates from `workspace/metadata/score_templates/` --> `score_rules`
- Read-only FastAPI endpoints (`backend/api/proposed_schema.py`):
  - `GET /api/proposed/match-patterns` -- list all patterns with their attributes
  - `GET /api/proposed/calc-definitions` -- list all calculation definitions
  - `GET /api/proposed/settings` -- list all settings with override chains
- Backend tests verifying table creation, population, and query correctness

**Verification criteria**:
- All proposed tables exist in DuckDB with correct column types and constraints
- Migration script populates tables with all current metadata (9 patterns, 10 calcs, 15 settings, 5 models, 7 score templates)
- API endpoints return correct data, matching the source JSON files
- Existing system behavior is completely unaffected -- all 1517 backend tests pass unchanged

**Duration estimate**: 1-2 sprints

**Risk**: Low. Purely additive. New tables sit alongside existing data. No existing code is modified. The migration script reads JSON files that are already on disk and writes to new tables that nothing else queries yet.

**Key files created**:
- `backend/models/proposed_schema.py` -- Pydantic models
- `backend/api/proposed_schema.py` -- API router
- `scripts/migrate_json_to_tables.py` -- JSON-to-table migration
- `tests/test_proposed_schema.py` -- verification tests

---

### Phase 3: Match Pattern Types

**Objective**: Add the `pattern_type` discriminator to match patterns and implement the 3-column `(entity, entity_attribute, attribute_value)` structure described in Document 04. Migrate existing 9 match patterns to the new structure. Update the settings resolver to support both old (flat JSON match objects) and new (typed pattern-based) resolution.

**Deliverables**:
- Add `pattern_type` column to `match_patterns` table with values: `detection_level`, `classification`, `threshold`, `score`, `setting`, `time_window`
- Populate `match_pattern_attributes` rows for all 9 existing patterns, converting flat `{"asset_class": "equity"}` JSON into `(entity="product", entity_attribute="asset_class", attribute_value="equity")` rows
- New settings resolution path in `backend/engine/settings_resolver.py` that:
  - Accepts a context dict (e.g., `{"product_id": "PRD-001", "asset_class": "equity", "exchange_mic": "XNYS"}`)
  - Queries `match_pattern_attributes` to find matching patterns
  - Resolves by `matched_attribute_count` (more attributes matched = higher priority) instead of manual integer priority
  - Falls back to existing JSON-based resolution when no pattern-based match is found
- Dual-mode resolver: both old and new resolution paths active, with a comparison mode that logs differences

**Verification criteria**:
- All 9 existing match patterns have correct `pattern_type` assignments and `match_pattern_attributes` rows
- Settings resolution via new path produces identical results to existing resolver for all 15 settings across all 9 match patterns
- Comparison mode confirms zero divergence on the full test dataset (50 products x 15 settings = 750 resolution pairs)
- Existing resolver remains the primary path; new resolver is opt-in via configuration flag
- All existing tests pass unchanged

**Duration estimate**: 2-3 sprints

**Risk**: Medium. The core settings resolution logic is being augmented with an alternative path. The risk is mitigated by running both paths simultaneously and comparing results. The existing path is never removed in this phase -- it remains the primary resolver until Phase 10.

**Key files modified**:
- `backend/engine/settings_resolver.py` -- dual-mode resolution
- `scripts/migrate_json_to_tables.py` -- pattern type assignment logic

**Key files created**:
- `backend/services/pattern_resolver.py` -- new pattern-based resolution service
- `tests/test_pattern_resolver.py` -- side-by-side comparison tests

---

### Phase 4: Calculation Instances

**Objective**: Formalize the concept of a calculation instance as the cross-product of a calculation definition and a match pattern, as described in Document 05. Track instances with `(calc_id, pattern_id, params_hash)` tuples. Add instance-level audit logging.

**Deliverables**:
- `calc_pattern_bindings` table linking calculations to match patterns:
  ```
  calc_pattern_bindings
    +-- binding_id     (PK)
    +-- calc_id        (FK -> calc_definitions)
    +-- pattern_id     (FK -> match_patterns, nullable)
    +-- params_hash    (varchar) -- deterministic hash of resolved parameters
    +-- resolved_params (JSON)  -- snapshot of parameter values used
    +-- created_at     (timestamp)
  ```
- Modification to `backend/engine/calculation_engine.py`:
  - `_resolve_parameters()` accepts an optional match context
  - After parameter resolution, a binding row is inserted (or matched) in `calc_pattern_bindings`
  - The `params_hash` enables deduplication: if two models invoke the same calculation with the same resolved parameters, the engine recognizes the shared instance
- Instance audit logging in `workspace/metadata/_audit/`:
  - Each calculation execution logs its `binding_id`, resolved parameters, and the pattern that selected them
  - Enables full traceability: alert --> detection model --> calculation instance --> binding --> pattern --> resolved parameters

**Verification criteria**:
- All 10 calculations produce `calc_pattern_bindings` rows when executed
- Same calculation invoked by multiple models with identical parameters produces a single binding (deduplication works)
- Same calculation invoked with different parameters (e.g., different `wash_vwap_threshold` for equity vs. FX) produces separate bindings
- Calculation results are identical to pre-Phase-4 results -- the binding is observational, not behavioral
- Audit trail entries link to binding IDs
- All existing tests pass unchanged

**Duration estimate**: 1-2 sprints

**Risk**: Low. The calculation engine's execution logic is unchanged. The binding mechanism is purely observational -- it records what already happens rather than changing how it happens. The only new behavior is the insertion of binding rows, which is additive.

**Key files modified**:
- `backend/engine/calculation_engine.py` -- parameter resolution with context, binding registration

**Key files created**:
- `backend/services/instance_tracker.py` -- binding management and deduplication
- `tests/test_calculation_instances.py` -- instance tracking verification

---

### Phase 5: Time Windows

**Objective**: Elevate time windows to first-class objects with their own `time_windows` result table, as described in Document 06. Implement the distinction between simple (precomputable) and complex (on-the-fly) windows. Enable window reuse across detection models.

**Deliverables**:
- `time_windows` table:
  ```
  time_windows
    +-- window_id       (PK, varchar)
    +-- window_type     (varchar) -- "business_date", "trend", "cancellation", "market_event"
    +-- product_id      (FK, nullable)
    +-- venue_id        (FK, nullable)
    +-- window_start    (timestamp)
    +-- window_end      (timestamp)
    +-- business_date   (date)
    +-- metadata        (JSON)    -- type-specific attributes (trend_type, event_type, etc.)
    +-- computed_at     (timestamp)
  ```
- Modification to the 4 time window calculations:
  - After computing window boundaries, register each window as a row in `time_windows`
  - Return `window_id` for downstream calculations to reference
  - Simple windows (`business_date_window`): precomputable at start of pipeline run
  - Complex windows (`trend_window`, `cancellation_pattern`, `market_event_window`): registered during execution
- Window reuse service:
  - Before computing a window, check if an equivalent window already exists in `time_windows`
  - If found, skip computation and return existing `window_id`
  - Equivalence defined by `(window_type, product_id, venue_id, business_date, metadata_hash)`
- Downstream calculations modified to accept `window_id` as a join key instead of (or in addition to) direct table references

**Verification criteria**:
- All 4 time window types register rows in `time_windows` after computation
- Simple windows can be precomputed independently of detection model execution
- Window reuse eliminates redundant computation: if `wash_full_day` and `market_price_ramping` both need `business_date` windows for the same product/date, only one window is computed
- Downstream calculations (`trading_activity_aggregation`, `vwap_calc`, etc.) join correctly via `window_id`
- Detection results are identical to pre-Phase-5 results
- All existing tests pass unchanged

**Duration estimate**: 2-3 sprints

**Risk**: Medium. This phase changes the execution model by introducing a registration step between window computation and downstream consumption. The risk is that the `window_id` join path produces different row sets than the current direct table joins. Mitigated by side-by-side comparison of window boundaries and downstream result counts.

**Key files modified**:
- `backend/engine/calculation_engine.py` -- window registration after execution
- Time window calculation metadata in `workspace/metadata/calculations/time_windows/`

**Key files created**:
- `backend/services/time_window_service.py` -- window registration, reuse, and lookup
- `tests/test_time_windows.py` -- window lifecycle and reuse verification

---

### Phase 6: Detection Levels

**Objective**: Make detection granularity configurable through match patterns of type `detection_level`, as described in Document 07. Replace the hardcoded `granularity: ["product_id", "account_id"]` field with a pattern reference. Implement entity graph reachability for resolving attributes across entity relationships.

**Deliverables**:
- `detection_level_pattern` FK on detection models pointing to a match pattern of type `detection_level`
- Detection level patterns for all 5 existing models:
  - `wash_full_day` / `wash_intraday`: `{product_id, account_id}` (preserves current behavior)
  - `market_price_ramping`: `{product_id}` (removes unnecessary account dimension from trend detection)
  - `spoofing_layering`: `{product_id, venue_id}` (adds missing venue dimension)
  - `insider_dealing`: `{account_id}` (removes product dimension to enable cross-product detection)
- Entity graph reachability service (`backend/services/entity_graph.py`):
  - Builds a graph from entity relationship metadata in `workspace/metadata/entities/`
  - Given a source entity and a target attribute, finds the shortest path through the entity graph
  - Handles cardinality-aware collapse (e.g., many-to-one traversal aggregates, one-to-many traversal expands)
- Collapse strategies:
  - `first`: take the first value (for many-to-one deterministic attributes like product.asset_class)
  - `count`: count distinct values (for one-to-many relationships)
  - `exists`: boolean -- does any related entity match?
- Detection query modification to use configurable grain instead of hardcoded `granularity` array

**Verification criteria**:
- Existing models with unchanged detection level patterns (`wash_full_day`, `wash_intraday`) produce identical alerts
- Models with updated detection level patterns can be tested with both old and new grain:
  - `market_price_ramping` with `{product_id}` grain produces the same or better alerts (fewer false positives from per-account fragmentation)
  - `spoofing_layering` with `{product_id, venue_id}` grain adds venue context without breaking existing alerts
  - `insider_dealing` with `{account_id}` grain enables cross-product detection (new capability)
- Entity graph reachability correctly traverses all 8 entities and their relationships
- All existing tests pass (models default to current behavior unless detection level pattern is explicitly set)

**Duration estimate**: 2-3 sprints

**Risk**: Low for existing models, which keep their current grain. The `detection_level_pattern` FK is nullable -- models without it continue using the hardcoded `granularity` field. New grain configurations are tested on a per-model basis before being activated. Entity graph reachability is a new service with no side effects on existing code.

**Key files modified**:
- `backend/engine/detection_engine.py` -- configurable grain resolution
- Detection model metadata in `workspace/metadata/detection_models/`

**Key files created**:
- `backend/services/entity_graph.py` -- graph traversal and reachability
- `tests/test_detection_levels.py` -- grain configuration verification
- `tests/test_entity_graph.py` -- reachability and collapse strategy tests

---

### Phase 7: Unified Results

**Objective**: Create the `calc_results` table described in Document 09 and modify the calculation engine to write all outputs to this single table. Update the detection engine to query `calc_results` instead of per-calculation tables. This is the most impactful phase -- it replaces the current 10-table output model with a single unified table.

**Deliverables**:
- `calc_results` table (see Document 09 for full schema):
  ```
  calc_results
    +-- result_id       (PK)
    +-- calc_id         (FK -> calc_definitions)
    +-- window_id       (FK -> time_windows, nullable)
    +-- pattern_id      (FK -> match_patterns, nullable)
    +-- product_id      (FK, nullable)
    +-- account_id      (FK, nullable)
    +-- venue_id        (FK, nullable)
    +-- trader_id       (FK, nullable)
    +-- business_date   (date, nullable)
    +-- primary_value   (double, nullable)
    +-- secondary_value (double, nullable)
    +-- flag_value      (boolean, nullable)
    +-- computed_at     (timestamp)
  ```
- Column mapping for each of the 10 existing calculations (see Document 09 Section 3 and Appendix C):
  - `value_calc`: `primary_value` = `calculated_value`
  - `trading_activity_aggregation`: `primary_value` = `net_value`, `secondary_value` = `total_trades`
  - `vwap_calc`: `primary_value` = `vwap_buy`, `secondary_value` = `vwap_proximity`
  - `large_trading_activity`: `primary_value` = `total_value`, `flag_value` = `is_large`
  - `wash_detection`: `primary_value` = `qty_match_ratio`, `secondary_value` = `vwap_proximity`, `flag_value` = `is_wash_candidate`
  - `trend_window`: `primary_value` = `price_change_pct`
  - `cancellation_pattern`: `primary_value` = `cancel_count`
  - `market_event_window`: `primary_value` = `price_change_pct`
  - `adjusted_direction`: `primary_value` = `calculated_value`
  - `business_date_window`: registered via `time_windows` (Phase 5), not in `calc_results`
- Dual-write mode in `calculation_engine._execute()`:
  - Writes to both the existing per-calc table AND the new `calc_results` table
  - Comparison script validates row-count and value parity between old and new tables
- Detection engine modifications:
  - New query path that reads from `calc_results` using `calc_id` as discriminator
  - Old query path remains available via configuration flag
  - Side-by-side comparison of alerts generated by each path

**Verification criteria**:
- `calc_results` contains correct rows for all 10 calculations after a full pipeline run
- Row counts match between per-calc tables and `calc_results` (filtered by `calc_id`)
- `primary_value`, `secondary_value`, and `flag_value` match the corresponding columns in per-calc tables for every row
- Detection engine produces identical alerts when querying `calc_results` vs. per-calc tables
- Alert counts by model, by asset class, and by severity are identical in both paths
- The 82 current alerts are reproduced exactly by the new query path
- Performance is acceptable: `calc_results` queries complete within 2x of per-calc table queries (DuckDB columnar storage should handle the unified table efficiently)

**Duration estimate**: 3-4 sprints

**Risk**: High. This is the core data model change. Every downstream system that reads calculation results is affected: the detection engine, the alert generation pipeline, the scoring service, the API endpoints that serve calculation details to the frontend. The dual-write strategy mitigates the risk by running both paths simultaneously, but the sheer number of touchpoints makes this the highest-risk phase.

**Mitigation strategy**:
- Dual-write for at least 2 sprints before switching the detection engine to read from `calc_results`
- Automated comparison script runs on every test suite execution
- Manual verification of all 82 alerts after switching query paths
- Configuration flag allows instant rollback to per-calc table queries

**Key files modified**:
- `backend/engine/calculation_engine.py` -- dual-write to per-calc table + `calc_results`
- `backend/engine/detection_engine.py` -- new query path against `calc_results`
- `backend/api/alerts.py` -- updated to include `calc_results` traceability
- `backend/services/lakehouse_service.py` -- `calc_results` tier placement

**Key files created**:
- `backend/services/result_writer.py` -- unified result writing with column mapping
- `scripts/compare_results.py` -- side-by-side comparison automation
- `tests/test_unified_results.py` -- comprehensive parity verification

---

### Phase 8: UX Wizards

**Objective**: Build configuration wizard UIs that allow users to create and modify detection models, match patterns, thresholds, and scoring rules entirely through the browser. This phase is frontend-only -- it consumes the APIs created in Phases 2-7.

**Deliverables**:
- **New Detection Model Wizard** (8 steps):
  1. Name and description
  2. Select calculations from available calc_definitions
  3. Configure detection level (grain) via pattern selection or creation
  4. Set MUST_PASS / OPTIONAL strictness per calculation
  5. Configure score steps per calculation (from templates or custom)
  6. Set score threshold (with match-pattern-specific overrides)
  7. Define time window association
  8. Review and activate
- **New Match Pattern Wizard** (5 steps):
  1. Select pattern type (`detection_level`, `classification`, `threshold`, `score`, `setting`, `time_window`)
  2. Add attribute rows (entity, entity_attribute, attribute_value) with autocomplete from entity metadata
  3. Preview which data rows the pattern matches (impact preview)
  4. Name and describe the pattern
  5. Review and save
- **Threshold/Score Configuration UI**:
  - Edit threshold overrides per match pattern
  - Edit score step matrices with visual graduated-step editor
  - Impact preview: "changing this threshold from X to Y would affect N alerts"
- **Version History Display**:
  - Timeline of changes per match pattern, per setting, per detection model
  - Diff view between versions
  - Rollback capability

**Verification criteria**:
- A new detection model can be created entirely through the wizard UI, with no JSON editing
- A new match pattern can be created and immediately used in detection model configuration
- Threshold changes show accurate impact previews before being saved
- Version history displays correct change timeline for all configurable objects
- All wizard flows are covered by E2E Playwright tests

**Duration estimate**: 4-6 sprints

**Risk**: Low. This phase makes no backend changes. It consumes existing APIs. Frontend bugs cannot affect detection results. The wizards are additive -- existing configuration flows (JSON editing, Metadata Explorer, Settings Manager) continue working.

**Key files created**:
- `frontend/src/views/ModelWizard/` -- New detection model wizard
- `frontend/src/views/PatternWizard/` -- New match pattern wizard
- `frontend/src/components/ScoreStepEditor/` -- Visual score step matrix editor
- `frontend/src/components/ImpactPreview/` -- Alert impact preview component
- `tests/e2e/test_model_wizard.py` -- E2E wizard flow tests

---

### Phase 9: Model Migration

**Objective**: Migrate all 5 existing detection models from the current JSON-based configuration to the new relational, pattern-driven system. Each model is migrated individually, verified, and activated before proceeding to the next.

**Migration order** (most complex first, to surface edge cases early):

**1. `wash_full_day` (most complex -- 3 calculations, graduated scoring, per-asset overrides)**
- Create detection level pattern: `{product_id, account_id}` (matches current grain)
- Create `calc_pattern_bindings` for `large_trading_activity`, `wash_qty_match`, `wash_vwap_proximity`
- Migrate 4 settings with overrides to pattern-based resolution: `large_activity_multiplier`, `wash_vwap_threshold`, `quantity_match_score_steps`, `wash_score_threshold`
- Verify: identical 82 alerts (wash subset: ~14 alerts)

**2. `wash_intraday` (similar to wash_full_day, different time window)**
- Reuse detection level pattern from wash_full_day
- Reuse `calc_pattern_bindings` (same calculations, same parameters)
- Different time window association: `trend_window` instead of `business_date`
- Verify: identical alerts (wash subset)

**3. `market_price_ramping` (product-only grain opportunity)**
- Create detection level pattern: `{product_id}` (simplified from current `{product_id, account_id}`)
- Create `calc_pattern_bindings` for `trend_detection`, `large_trading_activity`, `same_side_ratio`
- Optional: test product-only grain vs. current product+account grain, compare alert quality
- Verify: at minimum, current alerts reproduced; at best, improved detection quality

**4. `spoofing_layering` (product x venue grain opportunity)**
- Create detection level pattern: `{product_id, venue_id}` (adds venue dimension)
- Create `calc_pattern_bindings` for `cancel_pattern`, `opposite_side_execution`
- Verify: current alerts reproduced with additional venue context

**5. `insider_dealing` (account-only grain opportunity)**
- Create detection level pattern: `{account_id}` (enables cross-product detection)
- Create `calc_pattern_bindings` for `market_event_detection`, `large_trading_activity`
- Verify: current alerts reproduced; cross-product detection capability demonstrated

**Verification criteria**:
- Each model produces identical alerts via the new system before the old code path is deactivated
- Side-by-side alert comparison for every model: alert count, scores, severity distribution, and context fields must match
- New grain configurations (MPR product-only, spoofing product+venue, insider account-only) are tested and documented but not activated by default until explicitly approved
- Regression test suite covers all 5 models with both old and new code paths

**Duration estimate**: 2-3 sprints

**Risk**: Medium. Each model migration is individually low-risk (the verification catches divergence), but the aggregate risk is medium because all 5 models must migrate successfully. The ordered migration (most complex first) ensures that edge cases are discovered early, when there is the most time to address them.

**Key files modified**:
- Detection model metadata in `workspace/metadata/detection_models/` -- add pattern references
- Settings metadata in `workspace/metadata/settings/` -- link to pattern-based overrides
- `backend/engine/detection_engine.py` -- per-model code path selection (old vs. new)

---

### Phase 10: Deprecation

**Objective**: Remove the old JSON-based configuration paths, per-calculation output tables, and hardcoded granularity. The system runs entirely on the new architecture.

**Deliverables**:
- Remove old settings resolution path from `backend/engine/settings_resolver.py` (the pattern-based resolver becomes the only resolver)
- Remove per-calculation table creation from `backend/engine/calculation_engine.py` (all results go to `calc_results` only)
- Remove hardcoded `granularity` field handling from `backend/engine/detection_engine.py` (all models use detection level patterns)
- Remove dual-write logic (single write to `calc_results`)
- Remove comparison scripts and dual-mode configuration flags
- Archive (do not delete) old JSON metadata files as backup:
  - `workspace/metadata/match_patterns/` --> `workspace/metadata/_archive/match_patterns/`
  - Per-calculation override arrays in settings files --> preserved in archived settings
- Clean up unused code paths, dead imports, and orphaned test fixtures
- Update all documentation to reflect the new-only architecture

**Verification criteria**:
- System runs entirely on new architecture with no references to old code paths
- All 82 alerts are produced identically to pre-deprecation state
- All backend tests pass (updated for new APIs where needed)
- All E2E tests pass
- No per-calc tables are created during pipeline execution
- Settings resolution uses only pattern-based path
- Detection grain uses only detection level patterns
- Archived JSON files are preserved in `_archive/` for reference

**Duration estimate**: 1 sprint

**Risk**: Medium. This is the final cutover. The risk is that some edge case was missed during the side-by-side comparison phases. Mitigated by the fact that Phases 3-9 have been running dual paths for months, and any divergence would have been caught. The archived JSON files provide a safety net for manual investigation if issues are discovered post-deprecation.

**Key files modified**:
- `backend/engine/settings_resolver.py` -- remove old resolution path
- `backend/engine/calculation_engine.py` -- remove per-calc table writes and dual-write logic
- `backend/engine/detection_engine.py` -- remove hardcoded granularity handling
- Test files -- update to use new APIs exclusively

---

## 4. Dependency Graph

```
Phase 1: Documentation (COMPLETE)
    |
    v
Phase 2: Table Schemas
    |
    +--------------------+--------------------+
    |                    |                    |
    v                    v                    |
Phase 3: Match       Phase 5: Time           |
Pattern Types         Windows                |
    |                    |                    |
    +--------+           |                    |
    |        |           |                    |
    v        v           |                    |
Phase 4:  Phase 6:      |                    |
Calc      Detection     |                    |
Instances Levels        |                    |
    |        |           |                    |
    +--------+-----------+                    |
    |                                         |
    v                                         |
Phase 7: Unified Results                      |
    |                                         |
    +--------+                                |
    |        |                                |
    |        v                                |
    |   Phase 8: UX Wizards  <----------------+
    |        (Phase 3, 6 required)
    |
    v
Phase 9: Model Migration
    (Phase 3-7 required)
    |
    v
Phase 10: Deprecation
    (Phase 9 required)
```

**Parallel execution opportunities**:
- Phase 3 (Match Pattern Types) and Phase 5 (Time Windows) can run in parallel after Phase 2 completes
- Phase 4 (Calculation Instances) and Phase 6 (Detection Levels) can run in parallel after Phase 3 completes
- Phase 8 (UX Wizards) can start after Phase 3 and Phase 6 complete, and run in parallel with Phases 7 and 9

**Critical path**: 1 --> 2 --> 3 --> 4 --> 7 --> 9 --> 10 (7 phases, ~12-17 sprints)

**Shortest wall-clock time** (with parallel execution): ~10-14 sprints, depending on team capacity.

---

## 5. Rollback Strategy

Each phase is designed to be independently rollable-back. The general principle is: **new capabilities are additive, old capabilities are never removed until Phase 10, and all new data can be dropped without affecting the existing system.**

### Phase 2: Table Schemas
- **Rollback**: Drop the new DuckDB tables. Delete the Pydantic models and API router. Remove the migration script.
- **Data preservation**: No data loss. The new tables are populated from existing JSON files, which are unchanged. Re-running the migration script recreates the tables at any time.
- **Impact**: Zero. No existing code references the new tables.

### Phase 3: Match Pattern Types
- **Rollback**: Disable the pattern-based resolver (flip configuration flag back to JSON-only mode). The old settings resolver remains fully functional throughout this phase.
- **Data preservation**: Pattern type assignments and `match_pattern_attributes` rows can be dropped. Original JSON match patterns are unchanged.
- **Impact**: Zero. The old resolver is the primary path; the new resolver is opt-in.

### Phase 4: Calculation Instances
- **Rollback**: Remove the instance tracker service. Stop writing to `calc_pattern_bindings`. The calculation engine's core execution logic is unchanged.
- **Data preservation**: Binding rows can be dropped. Calculation results are unaffected (bindings are observational, not behavioral).
- **Impact**: Loss of instance-level audit trail only. Calculation results are identical.

### Phase 5: Time Windows
- **Rollback**: Remove the time window registration step from the calculation engine. Downstream calculations revert to direct table joins.
- **Data preservation**: `time_windows` table rows can be dropped. The underlying `calc_*` tables (which still exist) contain the same window boundary data.
- **Impact**: Loss of window reuse optimization. Calculations run slightly more work (redundant window computation) but produce identical results.

### Phase 6: Detection Levels
- **Rollback**: Remove `detection_level_pattern` FK from detection models. The hardcoded `granularity` field remains as the fallback. Entity graph service can be deactivated without affecting existing queries.
- **Data preservation**: Detection level patterns can be dropped. Model metadata's `granularity` field was never removed.
- **Impact**: Loss of configurable grain. Models revert to `["product_id", "account_id"]` for all models.

### Phase 7: Unified Results
- **Rollback**: Disable dual-write (stop writing to `calc_results`). Switch detection engine back to per-calc table queries (flip configuration flag).
- **Data preservation**: `calc_results` rows can be dropped. Per-calc tables contain identical data (dual-write ensures parity).
- **Impact**: Loss of unified query path. Detection engine reverts to multi-table joins. Per-calc tables are still populated (dual-write was active).

### Phase 8: UX Wizards
- **Rollback**: Remove wizard UI components. Existing configuration flows (Metadata Explorer, Settings Manager, JSON editing) are unaffected.
- **Data preservation**: Any models or patterns created through wizards exist in the backend tables and are unaffected by frontend rollback.
- **Impact**: Loss of wizard UI only. All data and configuration created through wizards persists.

### Phase 9: Model Migration
- **Rollback**: Per-model rollback. Each model has a configuration flag that selects old vs. new code path. Flipping the flag reverts that model to JSON-based resolution. No data loss -- both code paths write to the same alert tables.
- **Data preservation**: Pattern-based configuration is preserved in new tables. JSON-based configuration is preserved in original files. Both are valid simultaneously.
- **Impact**: Per-model, reverts to JSON-based settings resolution and hardcoded granularity.

### Phase 10: Deprecation
- **Rollback**: This is the only phase where rollback is non-trivial. If issues are discovered post-deprecation:
  1. Restore old code paths from git history
  2. Restore archived JSON files from `workspace/metadata/_archive/`
  3. Re-enable per-calc table creation
  4. Re-enable dual-mode resolver
- **Data preservation**: Archived JSON files in `_archive/` provide complete backup. Git history preserves all removed code.
- **Impact**: Requires code restoration. This is why Phase 10 only executes after extensive verification in Phase 9.

---

## 6. Success Criteria

The overall migration is complete when ALL of the following conditions are met:

**Functional parity**:
- All 5 existing detection models (`wash_full_day`, `wash_intraday`, `market_price_ramping`, `spoofing_layering`, `insider_dealing`) produce alerts exclusively through the new system
- All 82 current alerts are reproduced with identical scores, severity, and context fields
- All 15 settings are resolvable through pattern-based resolution without fallback to JSON-based resolution
- All 10 calculation outputs are written to the unified `calc_results` table
- No per-calculation output tables (`calc_value`, `calc_adjusted_direction`, `calc_business_date_window`, etc.) are created during pipeline execution

**New capabilities verified**:
- At least one detection model uses a non-default detection level pattern (configurable grain)
- At least one new match pattern has been created through the UX wizard
- Time window reuse has been demonstrated (same window referenced by multiple models)
- Calculation instances with different parameterizations have been demonstrated (same calc, different resolved parameters)

**Technical cleanliness**:
- No remaining references to old JSON-based settings resolution in active code paths
- No remaining hardcoded `granularity` field handling in the detection engine
- No remaining per-calc table write logic in the calculation engine
- No dual-write or dual-mode configuration flags remain
- All archived JSON files are preserved in `workspace/metadata/_archive/`

**Test coverage**:
- All existing backend tests pass (updated for new APIs where applicable)
- All existing E2E tests pass
- New tests cover pattern-based resolution, unified results, configurable grain, and wizard flows
- Side-by-side comparison tests are preserved as regression tests (comparing `calc_results` against expected values rather than per-calc tables)

**Documentation**:
- All documents in this series (00-18 + Appendices A-D) are updated to reflect "current state" rather than "proposed state"
- API documentation reflects new endpoints
- Demo guide updated with wizard-based configuration flows

---

## 7. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Resolution logic produces different results after pattern-based migration | High | Medium | Side-by-side comparison for every setting across every match pattern, running in dual-mode for 2+ sprints before cutover. Automated comparison runs on every CI build. |
| Unified `calc_results` table query performance degrades for large datasets | Medium | Low | DuckDB's columnar storage is optimized for selective scans on wide tables. The `calc_id` column enables efficient partition-like filtering. Benchmarked during Phase 7 dual-write period. |
| UI wizard complexity leads to poor user experience | Low | Medium | Progressive disclosure pattern (simple defaults, advanced options hidden). Smart defaults pre-populate from existing patterns. User testing during Phase 8 before launch. |
| Migration of edge cases in existing models (unusual override combinations, literal parameters) | Medium | Medium | Comprehensive test coverage for all 15 settings x 9 match patterns x 5 detection models. The Phase 9 per-model migration order (most complex first) surfaces edge cases early. |
| Team velocity -- migration spans multiple sprints and may compete with feature work | Medium | Medium | Each phase is independently deliverable. The migration can pause between any two phases without leaving the system in an invalid state. Phases 3/5 and 4/6 can run in parallel to compress timeline. |
| Data inconsistency during dual-write period (Phase 7) | Medium | Low | Deterministic `result_id` generation enables idempotent upserts. Automated consistency checks run after every pipeline execution. Discrepancies trigger alerts before they reach production queries. |
| Entity graph reachability introduces unexpected join paths | Low | Medium | Graph traversal is limited to declared relationships in entity metadata. No automatic discovery of transitive paths beyond 2 hops. Explicit collapse strategy required for every traversal (no implicit aggregation). |
| Rollback of Phase 10 (deprecation) is complex | Medium | Low | Phase 10 only executes after Phases 3-9 have run in production for a sustained period. Archived JSON files and git history provide complete restoration capability. Rollback procedure is documented and tested before Phase 10 begins. |

---

*This roadmap is a living document. Phase timelines and scope may be adjusted based on learnings from earlier phases. The core principle -- incremental, backwards-compatible, independently valuable -- does not change.*
