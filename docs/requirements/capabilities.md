# Capabilities & User Stories

## Capability 1: Entity & Metadata Management

### US-1.1: Define Canonical Entities
**As a** platform administrator
**I want to** define canonical entities with their attributes and types
**So that** all incoming data is mapped to a standardized model

**Acceptance Criteria:**
- [ ] Can create entity definitions with name, attributes, types, and descriptions
- [ ] Can define subtypes for attribute extensions (e.g., equity-specific fields)
- [ ] Can define domain values (asset classes, instrument types, order types, etc.)
- [ ] Entity definitions are stored as JSON files in `workspace/metadata/entities/`
- [ ] Entity definitions are viewable in the Entity Designer UI

### US-1.2: Define Related Product Relationships
**As a** platform administrator
**I want to** define how products are related (underlying, index, FX reverse, swap legs, manual groups)
**So that** detection models can expand surveillance to related instruments

**Acceptance Criteria:**
- [ ] Can define relationship types: underlying, composite/index, FX reverse pairs, swap legs, sector/issuer, manual groups
- [ ] FX reverse pair detection cascades to all FX products on those currency pairs
- [ ] Related products are queryable from any calculation
- [ ] Relationship definitions stored in `workspace/metadata/related_products/`

### US-1.3: Define Calculation Metadata
**As a** platform administrator / quant
**I want to** define calculations entirely as metadata (inputs, outputs, logic, parameters, display, storage)
**So that** new calculations can be added without code changes

**Acceptance Criteria:**
- [ ] Calculation metadata includes: calc_id, name, layer, inputs, outputs, logic (SQL template), parameters, display config, storage config
- [ ] Calculations can reference entity fields, settings, and other calculation results
- [ ] Calculation dependencies form a valid DAG (no cycles)
- [ ] Calculations are viewable as an interactive DAG in Metadata Explorer

---

## Capability 2: Settings Resolution

### US-2.1: Configure Settings with Matching Patterns
**As a** platform administrator
**I want to** define settings (thresholds, cutoffs, parameters) with entity-attribute-based overrides
**So that** different entity combinations get appropriate configurations

**Acceptance Criteria:**
- [ ] Settings have a default value that always applies
- [ ] Overrides are defined with matching patterns (entity attribute key-value pairs)
- [ ] Product-specific overrides always win
- [ ] Support for "hierarchy" match type (most specific wins)
- [ ] Support for "multi_dimensional" match type (most matches wins)
- [ ] Resolution trace is recorded for every setting resolution

### US-2.2: View Settings Resolution
**As a** compliance analyst
**I want to** see exactly which setting value was applied and why
**So that** I can understand and audit the detection logic

**Acceptance Criteria:**
- [ ] Settings Manager shows all settings with their defaults and overrides
- [ ] Can simulate resolution for a given entity context
- [ ] Resolution trace shows: which override matched, its priority, why it won

---

## Capability 3: Data Ingestion & Mapping

### US-3.1: Map Source Data to Canonical Fields
**As a** data engineer
**I want to** drag-and-drop map source data columns to canonical entity fields
**So that** calculations can run on standardized data

**Acceptance Criteria:**
- [ ] Can select a calculation and see its required canonical fields
- [ ] Can browse available source data files (CSV columns)
- [ ] Can drag source columns onto canonical fields
- [ ] Mapping validation: completeness check, type compatibility
- [ ] Mapping definition saved as JSON in `workspace/metadata/mappings/`
- [ ] Saving a mapping enables the calculation

### US-3.2: Manage Source Data
**As a** data engineer
**I want to** view, edit, and reload source data
**So that** I can adjust demo data and see updated results

**Acceptance Criteria:**
- [ ] CSV files viewable in Data Manager with AG Grid
- [ ] Can edit CSV data inline
- [ ] Reload regenerates Parquet from CSV
- [ ] Can always reset to original data via demo controls

---

## Capability 4: Calculation Pipeline

### US-4.1: Execute Calculation Pipeline
**As a** platform operator
**I want to** run the calculation pipeline and see progress in real-time
**So that** I can monitor data flowing through the system

**Acceptance Criteria:**
- [ ] Pipeline executes layer by layer: L1 → L2 → L3 → L3.5
- [ ] Real-time progress via WebSocket (Pipeline Monitor)
- [ ] Each layer's results saved as Parquet and registered in DuckDB
- [ ] Pipeline Monitor shows animated DAG with execution progress
- [ ] Log viewer shows processing details

### US-4.2: Query Calculation Results
**As a** compliance analyst / quant
**I want to** run SQL queries against calculation results
**So that** I can explore the data and verify calculations

**Acceptance Criteria:**
- [ ] SQL Console with Monaco Editor and SQL syntax highlighting
- [ ] Table name autocompletion from DuckDB schema
- [ ] Results displayed in AG Grid
- [ ] Pre-defined illustrative queries for each demo step
- [ ] Schema Explorer shows all tables, columns, types

---

## Capability 5: Detection Model Composition

### US-5.1: Compose Detection Models from Existing Calculations
**As a** compliance analyst / quant
**I want to** create new detection models instantly by composing existing calculation results
**So that** new surveillance scenarios can be deployed without new calculations

**Acceptance Criteria:**
- [ ] Model Composer shows available calculation results as building blocks
- [ ] Can compose SQL query selecting from calculation result tables
- [ ] Can configure thresholds (from settings or custom)
- [ ] Can tag each calculation as MUST_PASS or OPTIONAL
- [ ] Can configure score steps per calculation (graduated scoring based on value ranges)
- [ ] Can set a score threshold for the model (entity-attribute-dependent via settings)
- [ ] Can define alert template (description, sections, display)
- [ ] Deploying a model immediately generates alerts
- [ ] Near-instant results after deployment
- [ ] Alerts trigger via two paths: all-thresholds-pass OR accumulated-score exceeds threshold

### US-5.2: Deploy a Detection Model
**As a** platform operator
**I want to** deploy a detection model and see alerts generated
**So that** I can demonstrate the full end-to-end flow

**Acceptance Criteria:**
- [ ] "Deploy" button in Model Composer
- [ ] Model definition saved as JSON in `workspace/metadata/detection_models/`
- [ ] Detection engine evaluates model query against calculation results
- [ ] Alerts appear in Risk Case Manager within seconds

---

## Capability 6: Alert Investigation (Risk Case Manager)

### US-6.1: View All Alerts
**As a** compliance analyst
**I want to** see a summary of all generated alerts with filtering and sorting
**So that** I can prioritize my investigation work

**Acceptance Criteria:**
- [ ] Alert Summary grid: ID, model, score, severity, entity, product, timestamp
- [ ] Filter by: detection model, score range, entity, date range
- [ ] Sort by any column
- [ ] Color-coded severity
- [ ] Click row → navigate to Alert Detail

### US-6.2: Investigate Alert with Full Drill-Down
**As a** compliance analyst
**I want to** drill into an alert and see every detail of how it was detected
**So that** I can make informed investigation decisions

**Acceptance Criteria:**
- [ ] Business description — human-readable, business-oriented explanation
- [ ] Entity context — trader, account, product, desk, business unit
- [ ] Product details including related products
- [ ] Financial charts: price + volume with trade markers and time window highlighting
- [ ] Calculation trace DAG: interactive graph with formulas, input values, output values
- [ ] Settings resolution trace: which thresholds applied and why
- [ ] Score breakdown: visual component score chart
- [ ] Related orders & executions table
- [ ] Links to processing logs and raw data
- [ ] All widgets configurable (add/remove, reposition via react-grid-layout)

### US-6.3: Dynamic Alert Structure
**As a** compliance analyst
**I want to** see alert details that adapt to the detection model that generated them
**So that** relevant information is always shown regardless of model type

**Acceptance Criteria:**
- [ ] Alert detail structure driven by detection model metadata
- [ ] Different models show different relevant widgets
- [ ] Calculation trace shows only the calculations involved in that specific alert
- [ ] Description template uses values from the actual alert data

---

## Capability 7: AI Query Assistant

### US-7.1: Generate Queries from Natural Language (Live Mode)
**As a** compliance analyst
**I want to** describe what I want to find in natural language and get a SQL query
**So that** I don't need to know the exact table/column names

**Acceptance Criteria:**
- [ ] Chat interface in SQL Console and Model Composer
- [ ] AI receives full metadata context (entity schemas, DB schema, calc definitions)
- [ ] AI generates valid SQL queries against DuckDB
- [ ] Generated queries can be run, edited, or saved as models
- [ ] Requires API key configuration in Settings

### US-7.2: Mock AI Demo Sequence (Mock Mode)
**As a** demo presenter
**I want to** demonstrate the AI assistant without requiring an API key
**So that** the demo works in any environment

**Acceptance Criteria:**
- [ ] Pre-scripted conversation sequences stored in JSON
- [ ] Steps through mock conversation on click
- [ ] Generated queries are real and deployable
- [ ] Produces same actions as live mode (run, edit, save as model)
- [ ] Graceful fallback when no API key configured

---

## Capability 8: Demo Controls

### US-8.1: Demo State Management
**As a** demo presenter
**I want to** control the demo flow with reset, resume, skip, and step controls
**So that** I can deliver a smooth, rehearsed presentation

**Acceptance Criteria:**
- [ ] **Reset**: restore workspace to pristine state (< 3 seconds)
- [ ] **Resume**: continue from last checkpoint
- [ ] **Skip to End**: show full final state with all models and alerts
- [ ] **Step**: advance one checkpoint at a time
- [ ] **Jump to Act N**: jump to the start of any act
- [ ] Current state indicator in the demo toolbar
- [ ] Confirmation dialog for destructive actions

### US-8.2: Artifact Visibility
**As a** demo presenter
**I want to** show the generated artifacts (metadata, data, results) outside the system
**So that** the audience understands what's being created under the hood

**Acceptance Criteria:**
- [ ] All metadata as readable JSON files on disk
- [ ] All source data as editable CSV files
- [ ] Calculation results queryable via SQL Console
- [ ] Alert traces as JSON files
- [ ] File organization is clean and self-explanatory

---

## Capability 9: Documentation & Deployability

### US-9.1: Single Command Launch
**As a** anyone
**I want to** launch the entire demo with one command
**So that** it works on any machine without complex setup

**Acceptance Criteria:**
- [ ] `./start.sh` launches everything
- [ ] Works on macOS, Linux, Windows (WSL)
- [ ] Prerequisites: Python 3.11+, Node 18+ (checked by start.sh)
- [ ] No Docker required
- [ ] Launch time < 10 seconds to usable UI

### US-9.2: Comprehensive Documentation
**As a** developer / demo presenter
**I want to** have complete documentation
**So that** anyone can understand, run, and extend the platform

**Acceptance Criteria:**
- [ ] Google-style docstrings on all code
- [ ] README at root, backend, frontend, workspace levels
- [ ] Demo guide with step-by-step instructions
- [ ] Data dictionary with all entity/field descriptions
- [ ] API documentation (auto-generated from FastAPI)

---

## Capability 10: Use Case Studio & AI-Assisted Building

### US-10.1: Create Custom Detection Use Cases
**As a** compliance analyst / quant
**I want to** build and validate custom detection scenarios with sample data and expected outcomes
**So that** I can prototype new surveillance ideas before deploying them

**Acceptance Criteria:**
- [ ] 5-step wizard: Define, Components, Sample Data, Expected Results, Validate
- [ ] Components reference existing calculations with configurable parameters
- [ ] Sample data editor with Monaco JSON input
- [ ] Expected outcomes validation against actual results
- [ ] Use cases saved as JSON in workspace

### US-10.2: AI-Assisted Calculation Builder
**As a** compliance analyst
**I want to** describe a calculation in natural language and have AI generate the metadata
**So that** I can create calculations without writing SQL manually

**Acceptance Criteria:**
- [ ] Natural language input field
- [ ] AI generates calc_id, name, layer, SQL template, inputs, outputs, parameters
- [ ] Iterative refinement loop (refine button)
- [ ] 5-layer validation before save (static, schema, sandbox, impact, regression)
- [ ] Saved to user metadata layer

---

## Capability 11: Submission Review Pipeline

### US-11.1: Submit for Review
**As a** compliance analyst
**I want to** submit my use case or calculation for review before it affects the production system
**So that** changes go through a governed approval process

**Acceptance Criteria:**
- [ ] Submit button on validated use cases
- [ ] Automatic system recommendations (change classification, similarity, impact, risk)
- [ ] Submission enters review queue with "pending" status
- [ ] Reviewer can view 5-tab detail: Overview, Validation, Recommendations, Components, History

### US-11.2: Review and Approve Submissions
**As a** reviewer / administrator
**I want to** review, approve, or reject submissions with feedback
**So that** only validated and approved changes reach the production system

**Acceptance Criteria:**
- [ ] Submissions queue with AG Grid (filterable, sortable)
- [ ] Approve/Reject/Request Revisions actions
- [ ] One-click implementation for approved submissions
- [ ] Full audit trail of review decisions

---

## Capability 12: Guided Tour & Scenario System

### US-12.1: Guided Scenarios (Watch Demo / Try It Yourself)
**As a** new user or demo presenter
**I want to** follow guided scenarios that walk me through platform features
**So that** I can learn the platform step-by-step

**Acceptance Criteria:**
- [ ] 25 guided scenarios across 7 categories
- [ ] Dual-mode per scenario: Watch Demo (auto-play) and Try It Yourself (interactive)
- [ ] Spotlight overlay highlighting target elements
- [ ] Step counter, progress indicator, navigation controls
- [ ] Completion tracking persisted to localStorage
- [ ] Scenario Selector accessible from top toolbar

### US-12.2: Per-View Operation Scripts
**As a** user on any view
**I want to** see what operations are available on the current view
**So that** I know what I can do without reading documentation

**Acceptance Criteria:**
- [ ] "?" help button on each view
- [ ] 3-8 operations listed per view with title and description
- [ ] 71 total operations across 16 views
- [ ] Contextual — shows only operations relevant to current view

---

## Capability 13: Version Management

### US-13.1: Version Tracking and Comparison
**As a** platform administrator
**I want to** track version history of metadata items and compare versions
**So that** I can audit changes and understand what was modified

**Acceptance Criteria:**
- [ ] Version history list with timestamps and descriptions
- [ ] Side-by-side diff view between any two versions
- [ ] Rollback to any previous version
- [ ] Audit trail maintained (rollback creates new version)

---

## Capability 14: Validation Service

### US-14.1: 5-Layer Metadata Validation
**As a** platform administrator
**I want to** validate metadata changes through multiple safety layers before saving
**So that** invalid or dangerous changes are caught before affecting the system

**Acceptance Criteria:**
- [ ] Layer 1: Static analysis (syntax, required fields)
- [ ] Layer 2: Schema compatibility (field types, references)
- [ ] Layer 3: Sandbox execution (test SQL runs without errors)
- [ ] Layer 4: Impact analysis (what would change if applied)
- [ ] Layer 5: Regression safety (existing functionality preserved)
- [ ] User-layer failures never block OOB operation

---

## Capability 15: OOB vs User Layer Separation

### US-15.1: Layer Architecture
**As a** platform administrator
**I want to** separate vendor-provided (OOB) metadata from user customizations
**So that** upgrades don't overwrite my changes

**Acceptance Criteria:**
- [ ] OOB layer (read-only for users) and User layer (customizable)
- [ ] Layer badges (OOB/Custom) visible on all metadata items
- [ ] Edit of OOB items creates user-layer override
- [ ] "Reset to OOB" button removes user override
- [ ] OOB manifest tracking all vendor-provided items
- [ ] Version tracking for OOB upgrades
