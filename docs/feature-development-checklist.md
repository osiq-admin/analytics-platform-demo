# Feature Development Checklist

**Purpose**: Every new feature MUST complete every applicable item on this checklist before it is considered done. Reference this document at the start of every feature branch. Update this document when a new broad system (like tours, scenarios, or a new view category) is added.

**Last Updated**: 2026-02-26 (M128 — 572 total tests: 390 backend + 182 E2E, 26 scenarios, 16 views, 74 traced architecture sections)

---

## How to Use This Checklist

1. **Copy** the relevant sections into your feature plan or PR description
2. **Check off** each item as you complete it (`[x]`)
3. **Mark N/A** for items that genuinely don't apply (with a reason)
4. **Never skip** a section without explaining why
5. **Update this checklist** if you add a new broad system that future features must integrate with (see Section 10)

---

## 1. Backend Implementation

- [ ] **API endpoints**: New routes added to `backend/api/` with proper request/response models
- [ ] **Pydantic models**: Request/response schemas in `backend/models/` with validation
- [ ] **Service layer**: Business logic in `backend/services/` (not in route handlers)
- [ ] **Metadata files**: New JSON metadata added to `workspace/metadata/` following existing patterns
- [ ] **Data generation**: If new entity/data — update `scripts/generate_data.py` and regenerate CSVs
- [ ] **Snapshot generation**: If new demo state — update `scripts/generate_snapshots.py`
- [ ] **Backend unit tests**: Written in `tests/test_<feature>.py`, covering happy path + edge cases
- [ ] **Run all backend tests**: `uv run pytest tests/ --ignore=tests/e2e -v` — ALL PASSING (currently 390)
- [ ] **Architecture traceability**: If adding new sections/panels, add `data-trace` attributes and registry entries (see Section 10)

---

## 2. Frontend Implementation

- [ ] **View component**: New view in `frontend/src/views/<ViewName>/index.tsx`
- [ ] **Zustand store**: State management in `frontend/src/stores/<feature>Store.ts` (if needed)
- [ ] **API integration**: Fetch calls using existing patterns (`/api/...` endpoints)
- [ ] **AG Grid**: Use `ag-theme-custom` class, follow global defaults from `agGridDefaults.ts`
- [ ] **Responsive layout**: Test at 1440px and 1024px widths
- [ ] **Dark/light theme**: Verify both themes work (use CSS variables, not hardcoded colors)
- [ ] **Error states**: Handle loading, empty, and error states gracefully
- [ ] **Frontend build**: `cd frontend && npm run build` — CLEAN (no errors, no type errors)

---

## 3. Sidebar & Navigation

- [ ] **Navigation entry**: Add to `workspace/metadata/navigation/main.json` under the correct group (sidebar loads from metadata API)
- [ ] **Route**: Add to `frontend/src/App.tsx` router configuration
- [ ] **Section grouping**: Place under correct category (Overview/Define/Configure/Operate/Compose/Investigate/Governance/AI)
- [ ] **Active state**: Verify the sidebar link highlights when on that view

---

## 4. Testing — Backend

- [ ] **Unit tests**: `tests/test_<feature>.py` — minimum 5 tests per new service/endpoint
- [ ] **API endpoint tests**: Test each new route (GET, POST, PUT, DELETE as applicable)
- [ ] **Edge cases**: Empty inputs, missing fields, invalid data, not-found resources
- [ ] **Integration tests**: Test interaction between services where applicable
- [ ] **Run full suite**: `uv run pytest tests/ --ignore=tests/e2e -v` — ALL PASSING (currently 390)
- [ ] **Architecture registry**: If new sections/panels added, update `architectureRegistry.ts` entries

---

## 5. Testing — E2E Playwright

- [ ] **New test class**: Add to appropriate E2E file in `tests/e2e/`
- [ ] **View rendering test**: New view loads without console errors
- [ ] **API endpoint tests**: Test new endpoints via `page.evaluate()` fetch calls
- [ ] **UI interaction tests**: Click, type, navigate — verify expected state changes
- [ ] **AG Grid tests**: Verify grid renders with expected columns and row count
- [ ] **Viewport tests**: Test at both 1440px and 1024px if layout-sensitive
- [ ] **Run E2E suite**: `uv run pytest tests/e2e/ -v` — ALL PASSING (currently 182)
- [ ] **Visual verification**: MANDATORY — Run with Playwright MCP browser to screenshot and verify every UI change visually. Do NOT skip this step.

---

## 6. Guided Tours & Scenarios

### 6a. Per-View Tour (contextual help)

- [ ] **Tour definition**: Add tour for new view in `frontend/src/data/tourDefinitions.ts`
- [ ] **Tour ID mapping**: Add path → tour ID in `AppLayout.tsx:getTourIdForPath()`
- [ ] **data-tour attributes**: Add `data-tour="<id>"` to key elements the tour highlights
- [ ] **Tour content**: 4-8 steps covering the view's purpose, key panels, and actions

### 6b. Operation Scripts (per-view help panel)

- [ ] **View operations**: Add operations for new view in `frontend/src/data/operationScripts.ts`
- [ ] **Operation list**: 3-8 operations per view describing what the user can do
- [ ] **Verify "?" button**: Confirm the help panel shows correct operations for the view

### 6c. Guided Scenarios (Watch Demo / Try It Yourself)

- [ ] **New scenarios**: Add 1-3 scenarios in `frontend/src/data/scenarioDefinitions.ts`
- [ ] **Category assignment**: Place under correct category (Entities, Settings, Calculations, Detection Models, Use Cases, Investigation, Administration)
- [ ] **Difficulty level**: Assign beginner/intermediate/advanced
- [ ] **Step count & time estimate**: Accurate step count and ~N min estimate
- [ ] **Watch mode steps**: Each step has `target`, `title`, `content`, and optional `action`
- [ ] **Try mode hints**: Each step has `tryHint` for validation in Try It Yourself mode
- [ ] **Prerequisites**: Set `requires` array if scenario depends on completing another first
- [ ] **Scenario count update**: Update scenario count in `ScenarioSelector` header if hardcoded

### 6d. Tooltips & Contextual Help

- [ ] **Panel headers**: Add `?` help button to new panels (see existing pattern in EntityDesigner)
- [ ] **AG Grid tooltips**: Enable `tooltipField` or `tooltipValueGetter` on columns with truncated content
- [ ] **Button titles**: Add `title` attribute to action buttons for hover hints

---

## 7. Demo & Presentation

### 7a. Demo Data

- [ ] **Sample data**: New feature has realistic demo data (not empty states)
- [ ] **Demo toolbar integration**: If feature has state, integrate with Reset/Step/End demo flow
- [ ] **Snapshot state**: Ensure demo snapshots include the feature's data

### 7b. Demo Guide

- [ ] **Update demo-guide.md**: Add new Act or extend existing Act in `docs/demo-guide.md`
- [ ] **Talking points**: Include what to highlight, what questions to expect
- [ ] **Screenshot-worthy moments**: Note which states are good for visual demo

### 7c. Visual Walkthrough

- [ ] **Playwright MCP walkthrough**: Navigate to new view, take screenshots at key states
- [ ] **Both themes**: Screenshot in dark theme (default) and light theme if significant
- [ ] **Multiple viewports**: Verify at 1440px and 1024px

---

## 8. Documentation & Tracking

### 8a. Progress Tracker

- [ ] **Update progress.md**: Add milestone entries with status, task counts
- [ ] **Phase status**: Update the Overall Status table
- [ ] **Test count**: Update total test counts (backend + E2E)

### 8b. Testing Checklist (per-phase)

- [ ] **Create/update testing checklist**: `docs/phase<N>-testing-checklist.md`
- [ ] **Backend test matrix**: List all test files, test counts, status
- [ ] **Frontend test matrix**: List all components needing browser testing
- [ ] **E2E test matrix**: List all Playwright test classes and what they cover
- [ ] **Integration scenarios**: List end-to-end flows that cross multiple components

### 8c. BDD Scenarios

- [ ] **Update BDD scenarios**: Add Gherkin scenarios to `docs/requirements/bdd-scenarios.md`
- [ ] **Cover happy path**: Standard user flow through the feature
- [ ] **Cover edge cases**: Error states, empty data, invalid inputs

### 8d. Data Dictionary & Schemas

- [ ] **Update data-dictionary.md**: If new entities or fields added
- [ ] **Update entity-schemas.md**: If entity structure changed
- [ ] **Update calculation-schemas.md**: If new calculations added

### 8e. Roadmap

- [ ] **Update roadmap**: Mark phase complete in `docs/plans/2026-02-24-comprehensive-roadmap.md`
- [ ] **Next phase**: Ensure the next phase description is still accurate

---

## 9. Git, CI & Release

- [ ] **Frontend build clean**: `cd frontend && npm run build` — 0 errors
- [ ] **Backend tests green**: `uv run pytest tests/ --ignore=tests/e2e -v` — ALL PASSING
- [ ] **E2E tests green**: `uv run pytest tests/e2e/ -v` — ALL PASSING
- [ ] **Commit**: Conventional Commits format (`feat`, `fix`, `docs`, `test`, `chore`)
- [ ] **Push**: `git push origin <branch>`
- [ ] **Merge to main**: Squash merge, verify main is green
- [ ] **Push main**: `git push origin main`
- [ ] **Update CLAUDE.md**: If test counts, view counts, or architecture changed
- [ ] **Update memory**: Update `MEMORY.md` with new state, key decisions, file paths

---

## 10. Broad System Integration Triggers

**These are systems that require updates whenever certain types of features are added. When you add a new broad system, add it to this list.**

### When Adding a New View:
- [ ] Sidebar link + route (Section 3)
- [ ] Tour definition + tour ID mapping (Section 6a)
- [ ] Operation scripts for the view (Section 6b)
- [ ] 1-3 guided scenarios (Section 6c)
- [ ] E2E test class for the view (Section 5)
- [ ] Demo guide Act update (Section 7b)

### When Adding a New Entity:
- [ ] Entity JSON in `workspace/metadata/entities/`
- [ ] Data generation in `scripts/generate_data.py`
- [ ] Relationships defined in entity JSON
- [ ] Entity Designer shows it in the grid + relationship graph
- [ ] Schema Explorer shows the DuckDB table
- [ ] Data Dictionary updated (`docs/schemas/data-dictionary.md`)
- [ ] E2E test for entity rendering

### When Adding a New Calculation:
- [ ] Calculation JSON in `workspace/metadata/calculations/<layer>/`
- [ ] DAG dependencies defined
- [ ] Metadata Explorer shows it with correct layer badge
- [ ] Calculation DAG graph includes it
- [ ] Detection models can reference it
- [ ] Calculation schema updated (`docs/schemas/calculation-schemas.md`)

### When Adding a New Detection Model:
- [ ] Model JSON in `workspace/metadata/detection_models/`
- [ ] Detection engine supports the model's query
- [ ] Model Composer shows it in the model list
- [ ] Model detail view shows calculations + scoring
- [ ] Alerts generate for the model via Pipeline
- [ ] Risk Case Manager can display its alerts
- [ ] Regulatory Map: tag with applicable regulations
- [ ] BDD scenario for the model's detection logic

### When Adding a New Setting:
- [ ] Setting JSON in `workspace/metadata/settings/`
- [ ] Settings Manager shows it in the grid
- [ ] Resolution tester works with the setting
- [ ] If score_steps: ScoreStepBuilder renders the visual range bar
- [ ] Overrides work with match patterns

### When Adding a New API Endpoint:
- [ ] Route handler in `backend/api/`
- [ ] Pydantic model for request/response
- [ ] Backend unit test
- [ ] E2E API test via `page.evaluate()` fetch
- [ ] Frontend integration (if user-facing)

### When Modifying the Tour System:
- [ ] All existing scenarios still work (run through Scenarios browser)
- [ ] Scenario count in UI is accurate
- [ ] New scenarios follow Watch/Try dual-mode pattern
- [ ] Operation scripts updated for affected views

### When Changing AG Grid Configuration:
- [ ] Global defaults still apply (`agGridDefaults.ts`)
- [ ] Per-view column overrides still work
- [ ] Tooltips visible on hover
- [ ] Column resize works
- [ ] Both dark and light themes render correctly

### When Modifying Any View Section:
- [ ] Update or add `data-trace` attribute on the section wrapper (e.g., `data-trace="dashboard-summary-cards"`)
- [ ] Update the section entry in `frontend/src/data/architectureRegistry.ts`
- [ ] Verify `metadataMaturity` rating is still accurate after changes
- [ ] If new files/APIs/metadata involved, add them to the registry entry's `sourceFiles`, `apiEndpoints`, `metadataSources`, or `technologies` arrays
- [ ] If adding a completely new section/panel, create a new registry entry with all fields

### When Adding a New View:
*(Additional to existing "When Adding a New View" trigger above)*
- [ ] Add `data-trace` attributes to all major sections in the new view (3-6 sections typical)
- [ ] Add registry entries for each section in `frontend/src/data/architectureRegistry.ts`
- [ ] Assign accurate `metadataMaturity` ratings with explanations
- [ ] Add `architecture_trace` operation to the view in `operationScripts.ts`

---

## Quick Reference: Test Commands

```bash
# Backend tests (390+)
uv run pytest tests/ --ignore=tests/e2e -v

# E2E Playwright tests (182+)
uv run pytest tests/e2e/ -v

# Single E2E test class
uv run pytest tests/e2e/test_e2e_phase7b.py::TestTourSystem -v

# Frontend build
cd frontend && npm run build

# Start app for manual testing
./start.sh

# Generate fresh data
uv run python -m scripts.generate_data
uv run python -m scripts.generate_snapshots
```

---

## Checklist Version History

| Date | Change | By |
|---|---|---|
| 2026-02-25 | Initial creation — covers all systems through Phase 7B (M120) | Claude Opus 4.6 |
| 2026-02-26 | Updated for M124 (F-021 Entity Designer layout redesign) | Claude Opus 4.6 |
| 2026-02-26 | Updated for M128 (Architecture Traceability Mode) — added view section trigger, updated test counts to 572 (390+182), 26 scenarios | Claude Opus 4.6 |
