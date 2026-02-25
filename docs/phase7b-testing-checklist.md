# Phase 7B — Testing Checklist

**Created**: 2026-02-25
**Status**: IN PROGRESS — M93-M112 complete (WS1-WS6), WS7 pending. Testing deferred to consolidation pass.

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

**Total backend tests as of M112**: 386 passing

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

### WS7: Guided Tours (M113-M120) — PENDING IMPLEMENTATION

| Component | File | What to Test | Priority |
|---|---|---|---|
| Tour engine dual-mode | TBD | Watch Demo + Try It Yourself modes | HIGH |
| 25 tour scenarios | TBD | Each scenario completes without errors | HIGH |
| Per-screen operation scripts | TBD | Help button, operation list renders | MEDIUM |

---

## Playwright E2E Tests Needed

### New API Endpoints to Cover
- [ ] `GET /api/data/date-range/{entity_id}` — date range for entities
- [ ] `GET /api/metadata/domain-values/*` — domain values (4 endpoints)
- [ ] `GET/PUT/DELETE /api/metadata/match-patterns/*` — match pattern CRUD
- [ ] `GET/PUT/DELETE /api/metadata/score-templates/*` — score template CRUD
- [ ] `POST /api/detection-models/dry-run` — model dry run
- [ ] `POST /api/validation/detection-model` — model validation
- [ ] `POST /api/validation/calculation` — calc validation
- [ ] `POST /api/validation/setting` — setting validation
- [ ] `GET/PUT/DELETE /api/use-cases/*` — use case CRUD
- [ ] `GET/POST/PUT /api/submissions/*` — submission CRUD + recommendations
- [ ] `POST /api/ai/suggest-calculation` — AI calc generation
- [ ] `GET /api/ai/context` — AI context builder
- [ ] `GET/POST /api/versions/*` — version history, compare, rollback

### Frontend Flows to Cover
- [ ] Create new detection model via 7-step wizard (full flow)
- [ ] Edit existing model via wizard
- [ ] Settings Manager with SuggestionInput, MatchPatternPicker, ScoreStepBuilder
- [ ] MetadataEditor visual editor form upgrades
- [ ] Model Composer ValidationPanel updates in real-time
- [ ] ExamplesDrawer opens, tabs switch, examples expand
- [ ] Dry run returns results in AG Grid
- [ ] DependencyMiniDAG renders for selected calcs
- [ ] Use Case Studio: create use case, add components, enter sample data, set expected results
- [ ] Submissions Queue: view queue, open detail, approve/reject with comment
- [ ] AI Calc Builder: enter NL description, generate, review in Monaco, refine, accept
- [ ] Version Comparison: select two versions, view color-coded diff

---

## Integration Test Scenarios

- [ ] Create a complete custom detection model from scratch via wizard (all 7 steps)
- [ ] Validate the model via the validation API (5 layers)
- [ ] Run a dry-run and verify preview alerts
- [ ] Save and deploy the model, verify alerts generate
- [ ] Edit an existing OOB model, verify changes persist
- [ ] Create and apply a match pattern to a setting override
- [ ] Create and apply a score template to a setting
- [ ] Full domain value flow: small entity (dropdown) vs large entity (search)
- [ ] Create a use case with sample data, run pipeline, verify expected results
- [ ] Submit a use case for review, verify auto-recommendations generated
- [ ] Review a submission: approve with comment, verify status transition
- [ ] Use AI Calc Builder: describe a calculation, generate, review, refine, accept
- [ ] Version a detection model, make changes, compare versions side-by-side
- [ ] Rollback a model to a previous version, verify state restored

---

## Known Issues / Spec Review Notes

These were identified during spec reviews but deferred as acceptable for a demo:

1. **M95**: `_query_distinct_values` uses f-string SQL interpolation for the `search` parameter (potential SQL injection in production, acceptable for demo)
2. **M95**: Bare `except Exception` silently swallows SQL errors in domain value queries
3. **M94**: Unknown entity returns HTTP 200 with error body instead of 404 (project convention)
4. **M94**: `insider_lookback_days` description says "Extended lookback" but value 14 is shorter than default 30
5. **M96**: No separate OOB/user layer separation for match patterns and score templates (single directory)
