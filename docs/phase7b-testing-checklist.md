# Phase 7B — Testing Checklist

**Created**: 2026-02-25
**Status**: COMPLETE — M93-M120 all implemented. E2E tests written (84 tests, 14 classes).

This document tracks what needs testing for Phase 7B. Backend API tests are written alongside implementation. Frontend components need browser-level testing (Playwright E2E + manual walkthrough).

---

## Backend API Tests (Written & Passing)

| Milestone | Test File | Tests | Status |
|---|---|---|---|
| M94 | `tests/test_date_range.py` | 5 | PASSING |
| M95 | `tests/test_domain_values.py` | 14 | PASSING |
| M96 | `tests/test_match_patterns.py` | 6 | PASSING |
| M96 | `tests/test_score_templates.py` | 6 | PASSING |
| M102 | `tests/test_detection_dry_run.py` | 3 | PASSING |
| M105 | `tests/test_validation_service.py` | 7 | PASSING |
| M106 | `tests/test_use_cases.py` | 6 | PASSING |
| M107 | `tests/test_submissions.py` | 6 | PASSING |
| M107 | `tests/test_recommendations.py` | 5 | PASSING |
| M110 | `tests/test_ai_calc_generation.py` | 5 | PASSING |
| M112 | `tests/test_version_management.py` | 5 | PASSING |

**Total backend tests as of M120**: 386 passing

---

## Frontend Components — Browser Testing Needed

### WS2: Reusable Components (M97-M99)

| Component | File | What to Test | Priority |
|---|---|---|---|
| SuggestionInput | `frontend/src/components/SuggestionInput.tsx` | Dropdown opens, type-to-filter, keyboard nav, chip selection, freeform warning | HIGH |
| useDomainValues | `frontend/src/hooks/useDomainValues.ts` | Cache TTL, cardinality detection, debounced search | MEDIUM |
| MatchPatternPicker | `frontend/src/components/MatchPatternPicker.tsx` | Tab switching, pattern search, create new pattern, save | HIGH |
| ScoreStepBuilder | `frontend/src/components/ScoreStepBuilder.tsx` | Range bar renders, add/remove rows, reorder, gap/overlap warnings | HIGH |
| ScoreTemplatePicker | `frontend/src/components/ScoreTemplatePicker.tsx` | Template list, category grouping, apply template, save current | MEDIUM |

### WS3: Settings Manager Upgrades (M100)

| Component | File | What to Test | Priority |
|---|---|---|---|
| SettingForm upgrades | `frontend/src/views/SettingsManager/SettingForm.tsx` | SuggestionInput for match keys/values, ScoreStepBuilder for score_steps, MatchPatternPicker for overrides | HIGH |
| OverrideEditor upgrades | `frontend/src/views/SettingsManager/OverrideEditor.tsx` | Dynamic context fields from API, SuggestionInput per field | HIGH |
| SettingDetail upgrades | `frontend/src/views/SettingsManager/SettingDetail.tsx` | Read-only ScoreStepBuilder instead of plain table | MEDIUM |
| SettingsEditor upgrades | `frontend/src/views/MetadataEditor/SettingsEditor.tsx` | Same as SettingForm but in MetadataEditor context | MEDIUM |

### WS4: Model Composer Wizard (M101-M104)

| Component | File | What to Test | Priority |
|---|---|---|---|
| WizardProgress | `frontend/src/views/ModelComposer/WizardProgress.tsx` | Step indicators, click completed steps, accent current | LOW |
| DefineStep | `frontend/src/views/ModelComposer/steps/DefineStep.tsx` | Name/description inputs, time window dropdown, granularity checkboxes, context fields | HIGH |
| SelectCalcsStep | `frontend/src/views/ModelComposer/steps/SelectCalcsStep.tsx` | Group by layer, click-to-select, strictness toggle | HIGH |
| ConfigureScoringStep | `frontend/src/views/ModelComposer/steps/ConfigureScoringStep.tsx` | Per-calc threshold/score settings, ScoreStepBuilder preview | HIGH |
| QueryStep | `frontend/src/views/ModelComposer/steps/QueryStep.tsx` | Monaco editor loads, "Generate from selections" builds SQL | HIGH |
| ReviewStep | `frontend/src/views/ModelComposer/steps/ReviewStep.tsx` | All sections render with correct data | MEDIUM |
| TestRunStep | `frontend/src/views/ModelComposer/steps/TestRunStep.tsx` | "Run Test" calls dry-run API, AG Grid shows results | HIGH |
| DeployStep | `frontend/src/views/ModelComposer/steps/DeployStep.tsx` | Save button triggers save, error display works | MEDIUM |
| ValidationPanel | `frontend/src/components/ValidationPanel.tsx` | Real-time checks update as wizard state changes | MEDIUM |
| PreviewPanel | `frontend/src/components/PreviewPanel.tsx` | Recharts bar chart renders, coverage note accurate | LOW |
| DependencyMiniDAG | `frontend/src/components/DependencyMiniDAG.tsx` | React Flow graph with selected + dependency nodes | MEDIUM |
| ExamplesDrawer | `frontend/src/components/ExamplesDrawer.tsx` | Slide-in animation, tab switching, expand examples, JSON display | MEDIUM |

### WS5: Backend Services (M105-M107)

| Component | File | What to Test | Priority |
|---|---|---|---|
| ValidationService | `backend/services/validation_service.py` | 5-layer validation for models, calc validation, setting validation | HIGH |
| Use Cases API | `backend/api/use_cases.py` | CRUD, run endpoint, status transitions | HIGH |
| Submissions API | `backend/api/submissions.py` | CRUD, status lifecycle, auto-recommendations | HIGH |
| RecommendationService | `backend/services/recommendation_service.py` | Change classification, similarity, consistency, best practices | MEDIUM |

### WS6: Advanced Frontend (M108-M112) — IMPLEMENTED, BROWSER TESTING NEEDED

| Component | File | What to Test | Priority |
|---|---|---|---|
| Use Case Studio | `frontend/src/views/UseCaseStudio/index.tsx` | List view, create new, status badges | HIGH |
| UseCaseBuilder | `frontend/src/views/UseCaseStudio/UseCaseBuilder.tsx` | 5-step wizard, component selection, navigation | HIGH |
| SampleDataEditor | `frontend/src/views/UseCaseStudio/SampleDataEditor.tsx` | Monaco JSON editor, entity tabs, validation | HIGH |
| ExpectedResults | `frontend/src/views/UseCaseStudio/ExpectedResults.tsx` | Toggle, number input, textarea | MEDIUM |
| Submissions Queue | `frontend/src/views/Submissions/index.tsx` | AG Grid queue, status filtering, row selection | HIGH |
| SubmissionDetail | `frontend/src/views/Submissions/SubmissionDetail.tsx` | 5-tab detail (Summary, Components, Recommendations, Comments, Impact) | HIGH |
| ReviewActions | `frontend/src/views/Submissions/ReviewActions.tsx` | Approve/Reject/Request Changes with comment | HIGH |
| AICalcBuilder | `frontend/src/components/AICalcBuilder.tsx` | NL input, generate, example prompts | MEDIUM |
| AICalcReview | `frontend/src/components/AICalcReview.tsx` | Monaco JSON editor, summary panel, refine/accept | MEDIUM |
| VersionComparison | `frontend/src/components/VersionComparison.tsx` | Dual-dropdown version selector, color-coded diff table | LOW |

### WS7: Guided Tours (M113-M120) — IMPLEMENTED, BROWSER TESTING NEEDED

| Component | File | What to Test | Priority |
|---|---|---|---|
| ScenarioRunner | `frontend/src/components/TourEngine/ScenarioRunner.tsx` | Watch mode auto-advance, try mode validation polling, mode switching, replay | HIGH |
| ScenarioSelector | `frontend/src/components/TourEngine/ScenarioSelector.tsx` | Category accordion, difficulty filter, Watch Demo / Try It Yourself buttons, scenario counts | HIGH |
| StepOverlay | `frontend/src/components/TourEngine/StepOverlay.tsx` | Spotlight positioning, step content, navigation buttons, mode toggle, auto-play indicator | HIGH |
| OperationScripts | `frontend/src/components/TourEngine/OperationScripts.tsx` | Per-view help panel, operation list, expand/collapse | MEDIUM |
| 25 scenarios (S1-S25) | `frontend/src/data/scenarioDefinitions.ts` | Each scenario loads, steps render, watch mode completes, try mode hints display | HIGH |
| 12 view operations | `frontend/src/data/operationScripts.ts` | Each view shows correct operations, descriptions accurate | MEDIUM |
| Scenarios button in header | `frontend/src/layouts/AppLayout.tsx` | Button visible, opens ScenarioSelector, closes on start/dismiss | MEDIUM |
| tourStore scenario state | `frontend/src/stores/tourStore.ts` | registerScenarios, startScenario, endScenario, completedScenarios persistence | MEDIUM |

---

## Playwright E2E Tests — `tests/e2e/test_e2e_phase7b.py`

**File**: `tests/e2e/test_e2e_phase7b.py` — 1267 lines, 14 classes, 84 tests

### New API Endpoints (TestPhase7bApiEndpoints — 18 tests)
- [x] `GET /api/data-info/date-range/{entity_id}` — date range for entities
- [x] `GET /api/metadata/domain-values/*` — domain values (4 endpoints: match-keys, setting-ids, calculation-ids, entity/field)
- [x] `GET /api/metadata/match-patterns` — match pattern list
- [x] `GET /api/metadata/score-templates` — score template list + category filter
- [x] `POST /api/detection-models/dry-run` — model dry run (with query + empty query)
- [x] `POST /api/validation/detection-model` — model validation
- [x] `POST /api/validation/calculation` — calc validation
- [x] `POST /api/validation/setting` — setting validation
- [x] `GET /api/use-cases` — use case list
- [x] `GET /api/submissions` — submission list
- [x] `POST /api/ai/suggest-calculation` — AI calc generation
- [x] `GET /api/ai/context` — AI context builder
- [x] `GET /api/versions/{type}/{id}` — version history
- [x] `POST /api/versions/record` — record version

### CRUD Operations (TestApiCrudOperations — 2 tests, TestMatchPatternsAndScoreTemplates — 3 tests)
- [x] Use case full CRUD cycle (PUT create → GET read → DELETE)
- [x] Submission create and list
- [x] Match patterns list
- [x] Score templates list + category filter

### Frontend Flows
- [x] Model Composer wizard: Step 1 Define, Step 2 Navigate, Back, Cancel (TestModelComposerWizard — 9 tests)
- [x] Model Composer detail: click model, deploy button, layer badges (TestModelComposerDetail — 5 tests)
- [x] Settings Manager renders, list panel, setting detail (TestSettingsEnhancements — 4 tests)
- [x] MetadataEditor: type selector, JSON/Visual editors, layer badge (TestMetadataEditorEnhancements — 8 tests)
- [x] ExamplesDrawer: open/close, tab switching, content (TestExamplesDrawer — 6 tests)
- [x] Use Case Studio: renders, new button, panel (TestUseCaseStudioView — 5 tests)
- [x] Submissions Queue: renders, count panel, grid (TestSubmissionsView — 3 tests)

### Tour System & Help
- [x] Tour button visible in header (TestTourSystem — 8 tests)
- [x] Scenarios button opens selector with difficulty filters and categories
- [x] Operation Scripts help panel: "?" button, open/close, operations list (TestOperationScripts — 5 tests)

### Navigation & Views
- [x] New views render without errors (TestNewViewsRender — 6 tests)
- [x] Sidebar has Use Cases and Submissions links (TestSidebarNavigation — 4 tests)

---

## Integration Test Scenarios (covered by E2E + backend tests)

- [x] Create a complete custom detection model via wizard (Step 1-2 navigation tested)
- [x] Validate the model via the validation API (5 layers — 3 validation endpoints tested)
- [x] Run a dry-run and verify preview alerts (dry-run API tested with valid + empty query)
- [ ] Save and deploy the model, verify alerts generate (deploy button visible, full flow deferred)
- [ ] Edit an existing OOB model, verify changes persist (detail view tested, edit flow deferred)
- [x] Match patterns and score templates list and filter
- [x] Domain value flow: match-keys, setting-ids, calculation-ids, entity field values
- [x] Use case CRUD: create, read, delete via API
- [x] Submission create and list via API
- [ ] Review a submission: approve/reject with comment (UI tested, status transition deferred)
- [x] AI Calc Builder: suggest-calculation API tested
- [x] Version history: list and record via API
- [ ] Rollback a model to a previous version (version API tested, rollback flow deferred)

---

## Known Issues / Spec Review Notes

These were identified during spec reviews but deferred as acceptable for a demo:

1. **M95**: `_query_distinct_values` uses f-string SQL interpolation for the `search` parameter (potential SQL injection in production, acceptable for demo)
2. **M95**: Bare `except Exception` silently swallows SQL errors in domain value queries
3. **M94**: Unknown entity returns HTTP 200 with error body instead of 404 (project convention)
4. **M94**: `insider_lookback_days` description says "Extended lookback" but value 14 is shorter than default 30
5. **M96**: No separate OOB/user layer separation for match patterns and score templates (single directory)
