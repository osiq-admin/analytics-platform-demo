# Analytics Platform Demo — Comprehensive Roadmap & Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the analytics platform from a functional demo into a metadata-driven, explainable, AI-assisted trade surveillance system with production-grade infrastructure, security, and regulatory traceability.

**Architecture:** The system will be fully metadata-driven — entities, calculations, detection models, settings, UI layouts, regulatory mappings, and scoring are all defined as metadata and can be modified at runtime without code changes. OOB (out-of-box) and user-defined configurations are cleanly separated so upgrades don't regress customizations. Every calculation and alert is fully explainable with drill-down to underlying data, logic, settings, and regulatory context.

**Tech Stack:** Python FastAPI + DuckDB (backend), React 19 + TypeScript + Vite (frontend). Existing metadata JSON + Pydantic models. No new database technology (DuckDB sufficient for demo).

---

## Current State Assessment

**What's built (Phases 1-6, M0-M65):**
- 8 entities (product, execution, order, md_eod, md_intraday, venue, account, trader)
- 10 calculations across 4 layers (transaction → time_window → aggregation → derived)
- 5 detection models (wash trading x2, spoofing, market price ramping, insider dealing)
- 12 frontend views, 193+ tests, E2E Playwright verified
- Settings system with hierarchical overrides (already exemplary metadata-driven design)

**What's already metadata-driven (~70%):**
- Calculation definitions: JSON with SQL logic, inputs, outputs, DAG dependencies
- Detection models: JSON with query, scoring, alert templates
- Settings: JSON with hierarchical overrides, priority system, context-aware resolution
- Entity definitions: JSON with field schemas, relationships, domain values

**Critical gaps for fully dynamic system:**
- `CALC_VALUE_COLUMNS` dict hardcoded in `detection_engine.py:18-27` (blocks dynamic calc addition)
- Entity context fields hardcoded in `detection_engine.py:90-92`
- Frontend fetches metadata but doesn't use it to render UIs
- No metadata write/edit APIs (read-only currently)
- No SQL parameterization (injection risk + can't inject settings into calc SQL)
- No explainability traces, no regulatory tagging, no OOB/user separation

---

## Roadmap Phases

### Phase 7: Dynamic Metadata Foundation
*Remove hardcodings, add metadata CRUD APIs, enable runtime configuration*

### Phase 8: Explainability & Drill-Down
*Full calculation traces, settings resolution traces, alert explainability UI*

### Phase 9: Metadata Editor & Visual Configuration
*Side-by-side JSON + visual editor, toggle views/widgets, chart type switching*

### Phase 10: Regulatory Traceability & Model Tagging
*Map calculations → models → regulations, suggestion engine*

### Phase 11: OOB vs User-Defined Separation
*Layer architecture (base → tenant → user), upgrade-safe customizations*

### Phase 12: AI-Assisted Configuration
*LLM understands system metadata, suggests calculations, orchestrates integrations*

### Phase 13: Alert Tuning & Distribution Analysis
*Scoring calibration, threshold optimization, back-testing, sandbox mode*

### Phase 14: Additional Detection Models
*Expand from 5 to 15 models covering full regulatory spectrum*

### Phase 15: Security Hardening
*Authentication, SQL injection fixes, CORS, rate limiting, input validation*

### Phase 16: Testing Framework Expansion
*Frontend tests, API security tests, performance tests, E2E automation*

### Phase 17: Cloud & Deployment Infrastructure
*Docker, CI/CD, health checks, structured logging*

### Phase 18: Advanced Analytics & Dashboarding
*Result analysis, advanced dashboard widgets, comparative views*

### Phase 19: Case Management Workflow
*Triage → investigation → case → resolution → regulatory filing*

### Phase 20: Productization
*Multi-tenant readiness, configuration management, plugin architecture*

---

## Phase 7: Dynamic Metadata Foundation

**Goal:** Remove all hardcodings from engines, add full CRUD APIs for metadata, enable adding calculations/models/entities at runtime without code changes.

**Critical files:**
- `backend/engine/detection_engine.py` — remove `CALC_VALUE_COLUMNS`, hardcoded context fields
- `backend/engine/calculation_engine.py` — add SQL parameter substitution
- `backend/models/calculations.py` — add `value_field`, `regulatory_tags`
- `backend/models/detection.py` — add `context_fields`, `regulatory_coverage`
- `backend/api/metadata.py` — add PUT/DELETE endpoints, dependency checker
- `workspace/metadata/calculations/**/*.json` — add `value_field` to all 10 calcs
- `workspace/metadata/detection_models/*.json` — add `context_fields` to all 5 models

### Task 7.1: Add `value_field` to CalculationDefinition and remove hardcoded dict

**Files:**
- Modify: `backend/models/calculations.py` — add `value_field: str` field
- Modify: `backend/engine/detection_engine.py:18-27` — remove `CALC_VALUE_COLUMNS` dict, read from metadata
- Modify: `workspace/metadata/calculations/**/*.json` — add `value_field` to all 10 calculation JSONs
- Test: `tests/test_detection_engine.py`

**Step 1:** Add `value_field: str` to `CalculationDefinition` in `backend/models/calculations.py`

**Step 2:** Update all 10 calculation JSON files to include `value_field`:
- `large_trading_activity.json` → `"value_field": "total_value"`
- `wash_qty_match.json` → `"value_field": "qty_match_ratio"`
- `wash_vwap_proximity.json` → `"value_field": "vwap_proximity"`
- `trend_detection.json` → `"value_field": "price_change_pct"`
- `same_side_ratio.json` → `"value_field": "same_side_pct"`
- `market_event_detection.json` → `"value_field": "price_change_pct"`
- `cancel_pattern.json` → `"value_field": "cancel_count"`
- `opposite_side_execution.json` → `"value_field": "total_value"`
- `vwap_calc.json` → `"value_field": "vwap"`
- `wash_detection.json` → `"value_field": "wash_score"`

**Step 3:** Update `detection_engine.py` to read `value_field` from loaded calc metadata instead of `CALC_VALUE_COLUMNS` dict. Replace line 149: `value_column = CALC_VALUE_COLUMNS.get(mc.calc_id, mc.calc_id)` with lookup from metadata service.

**Step 4:** Run tests: `uv run pytest tests/test_detection_engine.py -v`

**Step 5:** Commit

### Task 7.2: Add `context_fields` to DetectionModelDefinition

**Files:**
- Modify: `backend/models/detection.py` — add `context_fields: list[str]`
- Modify: `backend/engine/detection_engine.py:90-92` — read from model metadata
- Modify: `workspace/metadata/detection_models/*.json` — add `context_fields` to all 5 models
- Test: `tests/test_detection_engine.py`

**Step 1:** Add `context_fields: list[str]` to `DetectionModelDefinition`

**Step 2:** Update all 5 detection model JSONs with appropriate context fields:
```json
"context_fields": ["product_id", "account_id", "trader_id", "business_date", "asset_class", "instrument_type"]
```

**Step 3:** Update `detection_engine.py:90-92` to use `model.context_fields` instead of hardcoded list

**Step 4:** Run tests, commit

### Task 7.3: Add metadata CRUD APIs

**Files:**
- Modify: `backend/api/metadata.py` — add PUT/DELETE endpoints
- Modify: `backend/services/metadata_service.py` — add save/delete/validate methods
- Test: `tests/test_integration_e2e.py` — add API tests

**New endpoints:**
- `PUT /api/metadata/calculations/{calc_id}` — save/update calculation definition
- `DELETE /api/metadata/calculations/{calc_id}` — delete with dependency check
- `GET /api/metadata/calculations/{calc_id}/dependents` — what depends on this calc?
- `PUT /api/metadata/entities/{entity_id}` — update entity definition
- `PUT /api/metadata/settings/{setting_id}` — update setting definition
- `POST /api/metadata/validate` — pre-save validation (SQL syntax, dependency check)

**Step 1:** Add `save_calculation()`, `delete_calculation()`, `get_dependents()` to metadata service

**Step 2:** Add dependency checker that scans all detection models and calcs for references

**Step 3:** Add API endpoints with Pydantic validation

**Step 4:** Add tests for CRUD operations

**Step 5:** Run full test suite, commit

### Task 7.4: Add SQL parameter substitution for calculations

**Files:**
- Modify: `backend/engine/calculation_engine.py` — add parameter resolution before SQL execution
- Modify: `backend/models/calculations.py` — enhance `parameters` field schema
- Test: `tests/test_calculation_engine.py`

**Design:** Calculations can reference settings in their `parameters` dict. Before executing SQL, resolve settings and substitute into SQL using named parameters (`:param_name` syntax with DuckDB's prepared statement support).

```python
# In calculation JSON:
"parameters": {
  "threshold": {"source": "setting", "setting_id": "wash_vwap_threshold"}
}
# In SQL: WHERE vwap_proximity < :threshold
```

**Step 1:** Update `parameters` field schema to support `{"source": "setting"|"context", "setting_id": "...", "field": "..."}`

**Step 2:** Add parameter resolution in `calculation_engine.py` before `cursor.execute(sql)` — resolve settings, build param dict, use DuckDB prepared statements

**Step 3:** Run tests, commit

---

## Phase 8: Explainability & Drill-Down

**Goal:** Every alert, calculation result, and score is fully explainable. Users can drill from an alert down to the raw data, SQL executed, settings resolved, and scoring logic applied.

**Key principle:** "Show your work" — every number on screen should be clickable to see how it was computed.

### Task 8.1: Enhance AlertTrace with full execution details

**Files:**
- Modify: `backend/engine/detection_engine.py` — capture SQL, settings, intermediate results
- Modify: `backend/models/detection.py` — enhance `AlertTrace` model
- Modify: `backend/api/alerts.py` — expose trace details in API
- Test: `tests/test_detection_engine.py`

**AlertTrace additions:**
```python
class AlertTrace:
    # Existing fields...
    executed_sql: str          # Actual SQL that was run (not template)
    sql_row_count: int         # How many rows the query returned
    resolved_settings: dict    # Setting ID → resolved value + override reason
    calculation_traces: list[CalculationTrace]  # Per-calc execution details
    scoring_breakdown: list[ScoreStep]  # Which score step matched and why
    entity_context_source: dict  # Where each context field came from
```

```python
class CalculationTrace:
    calc_id: str
    layer: str
    sql_executed: str
    input_row_count: int
    output_row_count: int
    execution_time_ms: int
    value_field: str
    computed_value: float
    threshold_setting_id: str | None
    threshold_value: float | None
    passed: bool
    score_awarded: int
```

### Task 8.2: Add calculation trace API endpoint

**Files:**
- Create: `backend/api/trace.py` — new trace endpoints
- Modify: `backend/main.py` — register trace router
- Test: `tests/test_trace_api.py`

**New endpoints:**
- `GET /api/trace/alert/{alert_id}` — full explainability trace for an alert
- `GET /api/trace/calculation/{calc_id}?product_id=X&date=Y` — calculation result trace
- `GET /api/trace/settings/{setting_id}?context=...` — settings resolution trace (which override matched and why)

### Task 8.3: Frontend explainability drill-down UI

**Files:**
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/` — add drill-down panels
- Create: `frontend/src/components/ExplainabilityPanel.tsx` — reusable trace viewer
- Create: `frontend/src/components/SQLViewer.tsx` — syntax-highlighted SQL display
- Create: `frontend/src/components/SettingsTraceViewer.tsx` — settings resolution tree

**UI design:**
- Each score in the alert detail becomes clickable
- Clicking opens an explainability panel showing: SQL executed, rows matched, settings used, score steps
- Settings show full resolution hierarchy: default → override → why this override matched
- Raw data rows that triggered the alert are shown in a mini data grid

---

## Phase 9: Metadata Editor & Visual Configuration

**Goal:** Side-by-side raw JSON + visual editor for all metadata. Toggle views/widgets on and off. Switch chart types on the fly. No rebuild needed.

### Task 9.1: Metadata Editor view (JSON + visual side-by-side)

**Files:**
- Create: `frontend/src/views/MetadataEditor/index.tsx` — main editor view
- Create: `frontend/src/views/MetadataEditor/JsonPanel.tsx` — Monaco JSON editor (left)
- Create: `frontend/src/views/MetadataEditor/VisualPanel.tsx` — visual rendering (right)
- Create: `frontend/src/views/MetadataEditor/EntityEditor.tsx` — entity field editor
- Create: `frontend/src/views/MetadataEditor/CalculationEditor.tsx` — calc SQL + DAG editor
- Create: `frontend/src/views/MetadataEditor/SettingsEditor.tsx` — override hierarchy editor
- Create: `frontend/src/views/MetadataEditor/DetectionModelEditor.tsx` — model composer

**Design:**
- Left panel: Monaco editor showing raw JSON (syntax highlighting, validation)
- Right panel: Visual rendering of the same data (form fields, DAG diagram, override tree)
- Changes in either panel sync to the other in real-time
- Save button calls PUT API to persist changes
- Validation errors shown inline in both panels
- Diff view showing changes from saved version

### Task 9.2: Toggleable dashboard widgets

**Files:**
- Modify: `frontend/src/views/Dashboard/index.tsx` — add widget toggle system
- Create: `frontend/src/components/WidgetContainer.tsx` — generic widget wrapper with toggle
- Create: `frontend/src/stores/widgetStore.ts` — persist widget visibility preferences

**Design:**
- Each dashboard widget wrapped in `WidgetContainer` with visibility toggle
- Settings panel (gear icon) lists all available widgets with on/off switches
- Widget visibility persisted to localStorage
- Widgets can be reordered via drag-and-drop

### Task 9.3: Dynamic chart type switching

**Files:**
- Modify: `frontend/src/views/Dashboard/index.tsx` — add chart type selector to each chart
- Create: `frontend/src/components/ChartTypeSwitcher.tsx` — dropdown for chart format
- Modify: all chart components — support multiple render modes

**Design:**
- Each chart gets a small dropdown (top-right corner): Bar, Line, Pie, Table, Horizontal Bar
- Chart data is format-agnostic; only the renderer changes
- Selection persisted to localStorage
- Some chart types have constraints (e.g., pie only for categorical data)

---

## Phase 10: Regulatory Traceability & Model Tagging

**Goal:** Every calculation is tagged with which models use it, which regulations those models cover, and suggestions can be made for adjustments.

### Task 10.1: Add regulatory tags to metadata

**Files:**
- Modify: `backend/models/calculations.py` — add `regulatory_tags: list[str]`
- Modify: `backend/models/detection.py` — add `regulatory_coverage: list[dict]`
- Modify: all calculation and model JSONs — add tags

**Schema:**
```json
// In calculation JSON:
"regulatory_tags": ["MiFID II Art. 16", "MAR Art. 12"]

// In detection model JSON:
"regulatory_coverage": [
  {"regulation": "MAR", "article": "Art. 12(1)(a)", "description": "Wash trading prohibition"},
  {"regulation": "MiFID II", "article": "Art. 16(2)", "description": "Surveillance obligation"}
]
```

### Task 10.2: Calculation-to-model dependency view

**Files:**
- Create: `frontend/src/views/RegulatoryMap/index.tsx` — regulatory traceability view
- Modify: `backend/api/metadata.py` — add dependency graph endpoint

**New endpoint:**
- `GET /api/metadata/dependency-graph` — returns full graph of calc → model → regulation

**UI:** Interactive graph showing: Regulations → Detection Models → Calculations → Entities, with clickable nodes that open the metadata editor

### Task 10.3: Suggestion engine for model adjustments

**Files:**
- Create: `backend/services/suggestion_service.py` — analyze model coverage gaps
- Create: `backend/api/suggestions.py` — suggestion endpoints

**Design:**
- Analyze which regulations have no detection model coverage
- Suggest calculations that could improve model precision (based on unused entity fields)
- Suggest threshold adjustments based on alert distribution analysis

---

## Phase 11: OOB vs User-Defined Separation

**Goal:** Clean separation between vendor-provided (OOB) and user-customized metadata. Upgrades to OOB don't affect user changes.

### Task 11.1: Three-layer metadata architecture

**Files:**
- Modify: `backend/services/metadata_service.py` — implement layer resolution
- Create: `workspace/metadata/oob/` — out-of-box defaults (read-only for users)
- Create: `workspace/metadata/user/` — user customizations (override layer)

**Design:**
```
Layer 1 (OOB):     workspace/metadata/oob/calculations/value_calc.json
Layer 2 (User):    workspace/metadata/user/calculations/value_calc.json  (overrides)
Resolved:          Merge OOB + User, User wins on conflicts
```

- Each metadata file has `"layer": "oob"` or `"layer": "user"` tag
- OOB files are immutable during upgrades — user files never touched
- Metadata service resolves by merging: OOB defaults + User overrides
- UI shows which fields are OOB vs customized (different background color)
- "Reset to OOB" button available per field

### Task 11.2: Version compatibility tracking

**Files:**
- Create: `workspace/metadata/oob/VERSION` — OOB version metadata
- Modify: `backend/services/metadata_service.py` — version compatibility checks

**Design:**
- OOB metadata has a version number (SemVer)
- On upgrade, compare old vs new OOB versions, report what changed
- User overrides remain intact across upgrades
- Breaking changes (removed fields, renamed calcs) flagged with migration guidance

---

## Phase 12: AI-Assisted Configuration

**Goal:** LLM understands the system's metadata schema, can suggest calculations, help configure models, and utilize the dynamic nature of the system.

### Task 12.1: System metadata context for AI

**Files:**
- Modify: `backend/services/ai_service.py` — enhance with metadata context
- Create: `backend/services/ai_context_builder.py` — builds system context for LLM

**Design:**
- When user asks AI a question, system context includes:
  - Available entities and their fields
  - Existing calculations and their SQL logic
  - Detection models and their scoring
  - Available settings and current values
  - Regulatory coverage map
- AI can answer: "What settings affect wash trading detection?" or "How would I add a new calculation for bid-ask spread?"

### Task 12.2: AI calculation suggestion

**Files:**
- Modify: `backend/api/ai.py` — add calculation suggestion endpoint
- Modify: `frontend/src/views/AIAssistant/` — add suggestion UI

**Design:**
- User describes a calculation in natural language: "I want to detect when a trader's volume exceeds 3x their 30-day average"
- AI generates: calculation JSON (SQL, inputs, outputs, dependencies), suggested settings (thresholds), model integration points
- User reviews in metadata editor, adjusts, saves
- AI explains which entities provide the data, which models could use the calc, and which regulations it addresses

### Task 12.3: AI tuning recommendations

**Design:**
- AI analyzes alert distribution, false positive rates, score distributions
- Recommends threshold adjustments: "Reducing wash_vwap_threshold from 0.02 to 0.015 would increase alerts by ~15% but improve detection of subtle wash trades"
- Shows impact simulation before applying changes

---

## Phase 13: Alert Tuning & Distribution Analysis

**Goal:** Analyze alert distribution, calibrate scoring, optimize thresholds, sandbox testing.

### Task 13.1: Alert distribution analysis dashboard

**Files:**
- Modify: `frontend/src/views/Dashboard/index.tsx` — add distribution charts
- Modify: `backend/api/dashboard.py` — add distribution endpoints

**New charts:**
- Score distribution histogram (by model)
- Alert volume by day/week/month (trend)
- True positive vs false positive rates (if dispositions exist)
- Heat map: alerts by product x model
- Score calibration curve

### Task 13.2: Threshold simulation (sandbox mode)

**Files:**
- Create: `backend/services/simulation_service.py` — re-run detection with different thresholds
- Create: `backend/api/simulation.py` — simulation endpoints
- Create: `frontend/src/views/Simulation/index.tsx` — sandbox UI

**Design:**
- User adjusts thresholds in a sandbox environment
- System re-runs detection models against historical data with new thresholds
- Shows side-by-side comparison: "With current thresholds: 430 alerts. With proposed: 285 alerts. Difference: -145 (34% reduction)"
- No production impact until user applies changes

### Task 13.3: Back-testing framework

**Design:**
- Run detection models against historical snapshots
- Compare alert sets across different parameter configurations
- Generate calibration reports: precision, recall, F1 score (if labeled data available)

---

## Phase 14: Additional Detection Models

**Goal:** Expand from 5 to 15 models covering the full regulatory spectrum.

| # | Model | Regulation | Priority |
|---|-------|-----------|----------|
| D1 | Benchmark Manipulation | MAR Art. 12, IOSCO | High |
| D2 | Momentum Ignition | MiFID II RTS 25 | High |
| D3 | Quote Stuffing | MAR Art. 12(1)(c) | High |
| D4 | Cross-Product Manipulation | MAR Art. 12(1)(b) | Medium |
| D5 | Marking the Close | FINRA Rule 5210 | Medium |
| D6 | Painting the Tape | SEC Rule 10b-5 | Medium |
| D7 | Unusual Volume | General surveillance | Medium |
| D8 | Price Dislocation | General surveillance | Low |
| D9 | Concentrated Position | Risk management | Low |
| D10 | Best Execution Monitoring | MiFID II Art. 27 | Low |

Each model is purely metadata-defined (JSON) using the dynamic architecture from Phase 7. No code changes needed — just add JSON definitions and supporting calculations.

---

## Phase 15: Security Hardening

### Task 15.1: Fix SQL injection vulnerabilities (CRITICAL)

**Files:**
- Modify: `backend/services/query_service.py:39-46` — use parameterized queries
- Modify: `backend/api/query.py` — add SQL validation (SELECT-only for raw queries)
- Test: `tests/test_sql_injection.py` — negative test cases

### Task 15.2: Add API authentication

**Files:**
- Create: `backend/middleware/auth.py` — JWT middleware
- Modify: `backend/main.py` — register auth middleware
- Modify: all `backend/api/` routes — require authentication

### Task 15.3: Add CORS, rate limiting, input validation

**Files:**
- Modify: `backend/main.py` — add CORSMiddleware with restricted origins
- Create: `backend/middleware/rate_limit.py` — slowapi integration
- Modify: `backend/api/query.py` — add Pydantic Field constraints (limit max 10000, table name whitelist)

---

## Phase 16: Testing Framework Expansion

### Task 16.1: Frontend component tests

**Files:**
- Add to `frontend/package.json`: vitest, @testing-library/react
- Create: `frontend/src/**/__tests__/` — component test files
- Target: 50+ component tests

### Task 16.2: API security tests

**Files:**
- Create: `tests/test_security.py` — SQL injection, XSS, CORS, auth tests
- Target: 20+ negative test cases

### Task 16.3: E2E Playwright automation

**Files:**
- Create: `tests/e2e/` — automated Playwright tests
- Target: 15+ E2E scenarios covering all 12 views

### Task 16.4: Performance tests

**Files:**
- Create: `tests/performance/` — k6 load test scripts
- Target: 100 concurrent users, <500ms p95 latency

---

## Phase 17: Cloud & Deployment Infrastructure

### Task 17.1: Docker containerization

**Files:**
- Create: `Dockerfile` — multi-stage build (frontend + backend)
- Create: `docker-compose.yml` — local containerized development
- Create: `.dockerignore`

### Task 17.2: CI/CD pipeline

**Files:**
- Create: `.github/workflows/test.yml` — run tests on PR
- Create: `.github/workflows/build.yml` — build Docker image on merge to main

### Task 17.3: Health checks & structured logging

**Files:**
- Modify: `backend/main.py` — add readiness/liveness probes, structured JSON logging
- Create: `backend/middleware/logging.py` — request ID correlation

---

## Phase 18: Advanced Analytics & Dashboarding

### Task 18.1: Customizable dashboard layout

- User-configurable widget positions (drag-and-drop grid)
- Saved dashboard views (per user/role)
- Widget library with add/remove

### Task 18.2: Comparative analysis views

- Overlay multiple products/accounts/time periods
- Peer group analysis (trader vs desk average)
- Before/after views for detection effectiveness

### Task 18.3: Result analysis tools

- Alert aging analysis (how long from detection to resolution)
- Model effectiveness comparison
- Score distribution deep-dive with statistical analysis

---

## Phase 19: Case Management Workflow

| Step | Feature | Description |
|------|---------|-------------|
| 1 | Case Lifecycle | Triage → Investigation → Case → Resolution → Filing |
| 2 | Case Assignment | Workload balancing, escalation rules |
| 3 | Investigation Workspace | Timeline builder, evidence collection, narrative editor |
| 4 | SAR/STR Generation | Auto-generate suspicious activity reports |
| 5 | Audit Trail | Complete action log |
| 6 | Case Linking | Link related alerts across models/time |
| 7 | Disposition Codes | True Positive, False Positive, Escalated |
| 8 | SLA Tracking | Time-to-triage, regulatory deadlines |

---

## Phase 20: Productization

### Task 20.1: Multi-tenant architecture
- Tenant middleware, per-tenant workspace isolation
- Tenant-specific metadata (using Phase 11 layer architecture)

### Task 20.2: Configuration management
- Environment-based config (pydantic-settings with .env)
- Feature flags for gradual feature rollout
- Secrets management integration

### Task 20.3: Plugin architecture
- Runtime-loadable calculation plugins
- Custom entity type registration
- Extension point system for detection models

---

## Data Model Extensions (Backlog)

| # | Entity | Description | Dependency |
|---|--------|-------------|-----------|
| E1 | News Feed | Market news for correlation | Phase 14 |
| E2 | Quotes | Level 2 order book | Phase 14 |
| E3 | Order Versioning | Track amendments | Phase 7 |
| E4 | Communications | Email/chat metadata | Phase 19 |
| E5 | Beneficial Ownership | Account→UBO chain | Phase 19 |
| E6 | Watchlist | Restricted/grey/insider lists | Phase 19 |
| E7 | Regulatory Calendar | Earnings, fixing windows | Phase 14 |
| E8 | Position | End-of-day positions | Phase 18 |

---

## Visualization Backlog

| # | Feature | Description | Phase |
|---|---------|-------------|-------|
| V1 | Order Book Depth | Bid/ask depth around suspicious orders | Phase 14 |
| V2 | Trade Timeline | Millisecond execution timeline | Phase 8 |
| V3 | Network Graph | Account/trader relationships | Phase 18 |
| V4 | Heatmaps | Volume/alert concentration | Phase 18 |
| V5 | Comparative Charts | Multi-product overlays | Phase 18 |
| V6 | Annotation Layer | Analyst marks on charts | Phase 19 |
| V7 | Geographic Map | Jurisdiction analysis | Phase 20 |

---

## Regulatory Reporting Backlog

| # | Feature | Regulation | Phase |
|---|---------|-----------|-------|
| R1 | Transaction Reporting | MiFIR Art. 26 | Phase 19 |
| R2 | Order Record Keeping | RTS 25 | Phase 10 |
| R3 | STOR Generation | MAR Art. 16 | Phase 19 |
| R4 | CAT Reporting | FINRA CAT | Phase 19 |
| R5 | Regulatory Dashboard | Multi-regulation KPIs | Phase 18 |
| R6 | Data Retention Policies | GDPR, MiFID II | Phase 20 |

---

## Demo & Presentation Backlog

| # | Feature | Description |
|---|---------|-------------|
| P1 | Guided Demo Mode | Pre-scripted walkthrough with narration |
| P2 | Scenario Library | Multiple pre-built scenarios |
| P3 | Live Data Simulation | Streaming real-time alert generation |
| P4 | Comparison Mode | Before/after detection effectiveness |
| P5 | Performance Metrics | Detection rates, false positive rates |

---

## Known Technical Debt

| # | Issue | Location | Phase |
|---|-------|----------|-------|
| T1 | SQL string formatting (injection risk) | `query_service.py:39-46` | Phase 15 |
| T2 | No input validation on API endpoints | `backend/api/*.py` | Phase 15 |
| T3 | DuckDB single-writer lock | `backend/db.py` | Phase 20 |
| T4 | Market data time range defaults to current date | `TimeRangeSelector.tsx` | Phase 7 |
| T5 | No error boundaries in React | `frontend/src/views/**` | Phase 16 |
| T6 | Stale `asset_class` in settings overrides | `workspace/metadata/settings/` | Phase 7 |
| T7 | Demo state file not validated | `backend/api/demo.py` | Phase 15 |

---

## Priority Matrix (User to Assign)

| Priority | Suggested Phases | Rationale |
|----------|-----------------|-----------|
| **P0 — Must Have** | Phase 7 (Dynamic Foundation) | Everything else depends on this |
| **P1 — Should Have** | Phase 8 (Explainability), Phase 9 (Metadata Editor) | Core differentiators |
| **P2 — Important** | Phase 10 (Regulatory), Phase 11 (OOB), Phase 12 (AI) | Advanced capabilities |
| **P3 — Enhance** | Phase 13-14 (Tuning, Models), Phase 15-17 (Security, Test, Cloud) | Production readiness |
| **P4 — Future** | Phase 18-20 (Analytics, Cases, Productization) | Long-term vision |

---

## Verification Plan

After each phase:
1. `npm run build` — no TypeScript errors
2. `uv run pytest tests/ -v` — all tests pass
3. Playwright E2E verification of affected views
4. Metadata editor: create/edit/save round-trip test
5. Explainability: drill-down from alert to raw data verified
6. Regression: existing demo checkpoints still work

---

## Research Sources

- NICE Actimize SURVEIL-X (generative AI integration, 2025)
- Behavox AI Risk Policies (60%+ alert reduction)
- SteelEye module-based architecture
- Trapets drill-down dashboards and white-box models
- OneTick source code transparency for all models
- Salesforce metadata-driven multitenant architecture
- FINRA CAT reporting requirements and field mapping
- MiFID II RTS 25 time synchronization and order record keeping
- MAR Art. 12/16 surveillance and STOR obligations
- Industry calibration: 30-50% false positive reduction via systematic tuning

*Total items: ~100+ across 14 phases + backlogs. Ready for user prioritization.*
