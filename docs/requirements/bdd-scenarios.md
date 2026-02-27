# BDD Scenarios

## Feature: Calculation Metadata Definition

### Scenario: Define a Value Calculation
```gherkin
Given the platform is running
When I navigate to Metadata Explorer
And I create a new calculation with:
  | field       | value                                          |
  | calc_id     | value_calc                                     |
  | name        | Value Calculation                               |
  | layer       | transaction                                     |
  | description | Calculates transaction value by instrument type |
And I define inputs from entity "execution": price, quantity, instrument_type
And I define logic as a SQL template with instrument-type-based value formulas
And I save the calculation
Then the calculation metadata is saved to workspace/metadata/calculations/transaction/value_calc.json
And the calculation appears in the calculation DAG
And the calculation is available for use by other calculations

### Scenario: Calculation Cannot Depend on Itself
```gherkin
Given the platform is running
When I create a calculation "loop_calc"
And I add "loop_calc" as a dependency of itself
Then the system rejects the definition with a cycle detection error
```

### Scenario: Calculation Can Depend on Other Calculations
```gherkin
Given "value_calc" and "adjusted_direction" calculations exist
When I create "trading_activity_aggregation"
And I add "value_calc" and "adjusted_direction" as dependencies
Then the calculation is accepted
And the DAG shows trading_activity_aggregation depending on both
```

---

## Feature: Settings Resolution

### Scenario: Product-Specific Override Always Wins
```gherkin
Given a setting "vwap_threshold" with:
  | scope                          | value |
  | default                        | 0.02  |
  | asset_class=equity             | 0.015 |
  | product_id=AAPL                | 0.01  |
When I resolve "vwap_threshold" for context {product_id: "AAPL", asset_class: "equity"}
Then the resolved value is 0.01
And the resolution trace shows "product-specific override matched"
```

### Scenario: Hierarchy Resolution (Most Specific Wins)
```gherkin
Given a setting "lookback_days" with match_type "hierarchy" and:
  | scope                          | value | priority |
  | default                        | 7     | 0        |
  | asset_class=equity             | 5     | 1        |
  | asset_class=equity,exchange=NYSE | 3   | 2        |
When I resolve "lookback_days" for context {asset_class: "equity", exchange: "NYSE"}
Then the resolved value is 3
And the resolution trace shows "hierarchy: asset_class=equity,exchange=NYSE (priority 2)"
```

### Scenario: Multi-Dimensional Resolution (Most Matches Wins)
```gherkin
Given a setting "activity_threshold" with match_type "multi_dimensional" and:
  | scope                                    | value | matches |
  | asset_class=equity                       | 3x    | 1       |
  | asset_class=equity,region=US             | 2.5x  | 2       |
  | instrument_type=option,region=US          | 2x    | 2       |
When I resolve "activity_threshold" for context {asset_class: "equity", region: "US", instrument_type: "stock"}
Then the resolved value is 2.5x
And the resolution trace shows "multi_dimensional: 2 dimension matches (asset_class + region)"
```

### Scenario: Default Fallback When No Override Matches
```gherkin
Given a setting "cancel_threshold" with default 0.8 and overrides only for equity
When I resolve "cancel_threshold" for context {asset_class: "fx"}
Then the resolved value is 0.8
And the resolution trace shows "default fallback (no matching override)"
```

---

## Feature: Data Mapping

### Scenario: Map Source CSV to Canonical Fields
```gherkin
Given a calculation "value_calc" requires canonical fields: price, quantity, instrument_type
And a source file "trades.csv" has columns: trade_price, trade_qty, type
When I open Mapping Studio and select "value_calc"
Then I see the required canonical fields listed
When I drag "trade_price" onto "price"
And I drag "trade_qty" onto "quantity"
And I drag "type" onto "instrument_type"
Then all required fields show green (mapped)
When I click "Save Mapping"
Then the mapping is saved to workspace/metadata/mappings/value_calc_mapping.json
And the calculation status changes to "ready"
```

### Scenario: Incomplete Mapping is Rejected
```gherkin
Given a calculation requires 3 canonical fields
When I map only 2 of them
And I try to save the mapping
Then the system shows a validation error: "Missing mapping for field: instrument_type"
And the save is blocked
```

---

## Feature: Calculation Pipeline Execution

### Scenario: Run Full Pipeline with Progress
```gherkin
Given all calculations are defined and data is mapped
When I click "Run Pipeline" in the Pipeline Monitor
Then I see real-time progress updates:
  | layer        | step                  | progress |
  | transaction  | value_calc            | 100%     |
  | transaction  | adjusted_direction    | 100%     |
  | time_windows | business_date         | 100%     |
  | aggregations | trading_activity      | 100%     |
  | aggregations | vwap                  | 100%     |
  | derived      | large_trading_activity| 100%     |
  | derived      | wash_detection        | 100%     |
And the Pipeline Monitor DAG animates through each layer
And calculation results are saved to workspace/results/
And results are queryable in SQL Console
```

### Scenario: Layer 1 — Value Calculation by Instrument Type
```gherkin
Given execution data with:
  | product | instrument_type | price  | quantity | contract_size |
  | AAPL    | stock           | 185.50 | 100      | 1             |
  | AAPL-C  | option          | 3.50   | 10       | 100           |
When value_calc runs
Then results show:
  | product | calculated_value |
  | AAPL    | 18550.00         |
  | AAPL-C  | 3500.00          |
```

### Scenario: Layer 2 — Detect Business Date Window
```gherkin
Given setting "business_date_cutoff" = "17:00" for exchange "NYSE"
And execution at 2024-01-15 16:30:00 EST on NYSE
When business_date_window calculation runs
Then the execution is assigned business_date = "2024-01-15"
And window_start = "2024-01-15 00:00:00" and window_end = "2024-01-15 17:00:00"
```

### Scenario: Layer 2 — Detect Price Trend Window
```gherkin
Given intraday market data for AAPL showing:
  | time     | price  |
  | 10:00    | 185.00 |
  | 10:30    | 186.50 |
  | 11:00    | 188.00 |
  | 11:30    | 187.00 |
  | 12:00    | 185.50 |
When trend_window calculation runs with sensitivity setting
Then it detects:
  | product | trend_type | window_start | window_end |
  | AAPL    | up         | 10:00        | 11:00      |
  | AAPL    | down       | 11:00        | 12:00      |
```

### Scenario: Layer 2 — Detect Market Event
```gherkin
Given MD EOD for AAPL:
  | date       | close  | prev_close | change_pct |
  | 2024-01-14 | 185.00 | 183.00     | 1.09%      |
  | 2024-01-15 | 195.00 | 185.00     | 5.41%      |
And setting "market_event_threshold" = 3% price change
And setting "market_event_lookback_days" = 5
When market_event calculation runs
Then it detects event: {product: "AAPL", event_date: "2024-01-15", type: "significant_price_change", lookback_start: "2024-01-10"}
```

---

## Feature: Detection Model Composition

### Scenario: Compose Insider Dealing Model from Existing Calculations
```gherkin
Given calculations exist: value_calc, market_event, trading_activity_aggregation, large_trading_activity
And related_products definitions exist for AAPL (underlying → options)
When I open Model Composer
And I select "large_trading_activity" and "market_event" as building blocks
And I compose the query: "large activity in related products during market event lookback window"
And I configure threshold from settings "insider_lookback_days"
And I define the alert template with business description
And I click "Deploy"
Then the model definition is saved to workspace/metadata/detection_models/insider_dealing.json
And the detection engine runs the model query
And alerts are generated for matching patterns
And alerts appear in Risk Case Manager within seconds
```

### Scenario: Near-Instant Alert Generation After Model Deployment
```gherkin
Given all calculation results are pre-computed
When I deploy a new detection model
Then alerts are generated within 3 seconds
And the alert count badge updates in the sidebar
```

### Scenario: Configure Score Steps for a Calculation
```gherkin
Given I am composing a detection model in Model Composer
When I select "large_trading_activity" as a building block
And I configure score steps from settings "large_activity_score_steps" for equity:
  | min_value | max_value | score |
  | 0         | 10000     | 0     |
  | 10000     | 100000    | 3     |
  | 100000    | 500000    | 7     |
  | 500000    | null      | 10    |
Then the score steps are entity-attribute-dependent (resolved via settings engine)
And different entity contexts (e.g., FX vs equity) can have different score step ranges
```

### Scenario: Tag Calculations as MUST_PASS or OPTIONAL
```gherkin
Given I am composing a detection model with 3 calculations:
  | calculation             | strictness |
  | quantity_match          | MUST_PASS  |
  | vwap_proximity          | MUST_PASS  |
  | large_trading_activity  | OPTIONAL   |
When I save the model configuration
Then the model definition records each calculation's strictness tag
And MUST_PASS calculations act as gate conditions
And OPTIONAL calculations contribute only to the accumulated score
```

### Scenario: Alert Triggers via Score When Not All Thresholds Pass
```gherkin
Given a detection model "wash_full_day" with:
  | calculation            | strictness | threshold | actual | passed | score |
  | quantity_match         | MUST_PASS  | 90%       | 95%    | YES    | 8     |
  | vwap_proximity         | MUST_PASS  | 0.02      | 0.005  | YES    | 9     |
  | large_trading_activity | OPTIONAL   | 2.0x      | 1.5x   | NO     | 3     |
And the model score_threshold setting resolves to 15 for this entity context
When the detection engine evaluates this model
Then must_pass_ok = true (quantity_match and vwap_proximity both passed)
And all_passed = false (large_trading_activity did not pass)
And accumulated_score = 20 (8 + 9 + 3)
And score_ok = true (20 >= 15)
And alert_fires = true (must_pass_ok AND score_ok)
And the alert trace records the trigger path as "score-based"
```

### Scenario: Alert Does NOT Trigger When MUST_PASS Fails
```gherkin
Given a detection model with:
  | calculation    | strictness | threshold | actual | passed | score |
  | quantity_match | MUST_PASS  | 90%       | 70%    | NO     | 2     |
  | vwap_proximity | MUST_PASS  | 0.02      | 0.005  | YES    | 9     |
And accumulated_score = 11 which exceeds the score_threshold of 10
When the detection engine evaluates this model
Then must_pass_ok = false (quantity_match did not pass)
And alert_fires = false (must_pass_ok is required)
And no alert is generated
```

### Scenario: Score Steps Resolve Differently Per Entity Context
```gherkin
Given setting "large_activity_score_steps" with:
  | context                | steps                                          |
  | default                | [0→0, 10000→3, 100000→7, 500000→10]           |
  | asset_class=fx         | [0→0, 50000→3, 500000→7, 2000000→10]          |
When I resolve score steps for {asset_class: "equity", value: 150000}
Then the score is 7 (using default steps: 100000-500000 range)
When I resolve score steps for {asset_class: "fx", value: 150000}
Then the score is 3 (using FX steps: 50000-500000 range)
And each resolution trace records which score step definition was used
```

### Scenario: Score Threshold Resolved via Settings Engine
```gherkin
Given a detection model "insider_dealing" with score_threshold setting "insider_score_threshold"
And setting "insider_score_threshold" with:
  | scope              | value |
  | default            | 15    |
  | asset_class=equity | 12    |
When the detection engine evaluates for {asset_class: "equity"}
Then the score threshold used is 12
And the resolution trace shows "hierarchy: asset_class=equity"
```

---

## Feature: Wash Trading Detection (Act 1)

### Scenario: Detect Wash Trading — Full Day with Graduated Scoring
```gherkin
Given account ACC-42 traded AAPL on 2024-01-15:
  | time  | side | quantity | price  |
  | 10:00 | BUY  | 1000     | 185.00 |
  | 10:30 | BUY  | 500      | 185.50 |
  | 14:00 | SELL | 1000     | 185.20 |
  | 14:30 | SELL | 500      | 185.10 |
And setting "wash_vwap_threshold" = 0.02 for equity
And the wash_full_day model has calculations:
  | calculation        | strictness | threshold |
  | quantity_match     | MUST_PASS  | 90%       |
  | vwap_proximity     | MUST_PASS  | 0.02      |
  | large_activity     | OPTIONAL   | 2.0x      |
When wash_full_day model runs
Then it detects:
  | check              | value     | threshold | passed | score |
  | quantity_match     | 100%      | 90%       | YES    | 10    |
  | vwap_proximity     | 0.0011    | 0.02      | YES    | 9     |
  | large_activity     | 2.5x      | 2.0x      | YES    | 7     |
And must_pass_ok = true
And accumulated_score = 26, score_threshold = 15
And alert_fires = true (all_passed path: all thresholds passed)
And the alert detail shows the VWAP comparison, order timeline, and score breakdown
```

---

## Feature: Market Price Ramping Detection (Act 2)

### Scenario: Detect MPR During Up Trend with Graduated Scoring
```gherkin
Given a detected up trend for AAPL: 10:00-11:00
And account ACC-55 aggressively bought during the up trend:
  | time  | side | quantity |
  | 10:05 | BUY  | 2000     |
  | 10:15 | BUY  | 3000     |
  | 10:25 | BUY  | 1500     |
And the market_price_ramping model has calculations:
  | calculation        | strictness | threshold |
  | trend_detected     | MUST_PASS  | exists    |
  | same_side_pct      | MUST_PASS  | 80%       |
  | large_activity     | OPTIONAL   | 2.0x      |
When market_price_ramping model runs
Then it detects:
  | check          | value | threshold | passed | score |
  | trend_detected | yes   | exists    | YES    | 10    |
  | same_side_pct  | 100%  | 80%       | YES    | 10    |
  | large_activity | 3.2x  | 2.0x      | YES    | 8     |
And must_pass_ok = true, accumulated_score = 28
And an MPR alert is generated via all_passed path
And the alert chart shows the trend with the account's buy markers overlaid
And the alert detail includes score breakdown per calculation
```

---

## Feature: Insider Dealing Detection (Act 3)

### Scenario: Detect Insider Dealing Before Market Event with Graduated Scoring
```gherkin
Given AAPL had a market event on 2024-01-15 (5.4% price jump)
And setting "insider_lookback_days" = 5 for equity
And account ACC-42 bought AAPL call options on 2024-01-12 and 2024-01-13:
  | date       | product   | side | value    |
  | 2024-01-12 | AAPL-C150 | BUY  | 15000.00 |
  | 2024-01-13 | AAPL-C155 | BUY  | 8000.00  |
And AAPL-C150 and AAPL-C155 are related to AAPL via "underlying" relationship
And the insider_dealing model has calculations:
  | calculation         | strictness | threshold        |
  | market_event        | MUST_PASS  | event exists     |
  | lookback_activity   | MUST_PASS  | within window    |
  | related_products    | OPTIONAL   | has relationship |
  | large_activity      | OPTIONAL   | 2.0x             |
When insider_dealing model runs
Then it detects:
  | check             | value    | threshold      | passed | score |
  | market_event      | 5.4%     | 3% change      | YES    | 10    |
  | lookback_activity | 2-3 days | within 5 days  | YES    | 8     |
  | related_products  | options  | relationship   | YES    | 7     |
  | large_activity    | $23,000  | 2.0x           | YES    | 7     |
And must_pass_ok = true, accumulated_score = 32
And an insider dealing alert is generated
And the alert shows: market event, lookback window, related product expansion, profit calculation, and score breakdown
```

---

## Feature: Alert Investigation

### Scenario: Drill Down Into Alert with Score Breakdown
```gherkin
Given alert ALT-001 exists for insider dealing
When I click ALT-001 in the Alert Summary
Then I see the Alert Detail with:
  - Business description: "Account ACC-42 had unusual buying in AAPL options 3 days before earnings..."
  - Entity context: Trader J. Smith, Desk US Flow, Account ACC-42
  - Price chart: AAPL price with market event marker and ACC-42's trade markers
  - Calculation trace DAG: market_event → large_activity → insider_dealing
  - Settings resolution: lookback=5 days (equity default), threshold=2x (global)
  - Score breakdown showing per-calculation scores with MUST_PASS/OPTIONAL tags:
    | calculation       | strictness | score | max | passed |
    | market_event      | MUST_PASS  | 10    | 10  | YES    |
    | lookback_activity | MUST_PASS  | 8     | 10  | YES    |
    | related_products  | OPTIONAL   | 7     | 10  | YES    |
    | large_activity    | OPTIONAL   | 7     | 10  | YES    |
  - Trigger path: "all_passed" (all thresholds passed)
  - Accumulated score: 32, score threshold: 12 (equity)
  - Related orders table showing all ACC-42's AAPL option trades
And I can click any calculation node to see its formula, input values, and score steps
And I can click any setting to see the full resolution trace (including score step resolution)
```

### Scenario: Configurable Widget Layout
```gherkin
Given I am viewing Alert Detail for ALT-001
When I drag the "Score Breakdown" widget to a different position
And I remove the "Processing Logs" widget
Then the layout is saved
When I navigate away and return to ALT-001
Then the custom layout is preserved
```

---

## Feature: AI Query Assistant

### Scenario: Generate SQL Query in Live Mode
```gherkin
Given the AI Assistant is configured with a valid API key
And calculation results are available in DuckDB
When I type in the AI chat: "Show me all accounts that had large buying in AAPL-related products before the market event"
Then the AI generates a SQL query referencing:
  - calc_large_trading_activity table
  - calc_market_events table
  - related_products table
And I can click [Run Query] to see results
And I can click [Save as Model] to create a detection model from this query
```

### Scenario: Mock AI Demo Without API Key
```gherkin
Given no API key is configured
When I open the AI Assistant
Then it shows in "Mock Mode"
When I click "Next" in the mock conversation
Then it shows a pre-scripted question and AI response
And the generated SQL is real and executable
When I click [Run Query]
Then real results appear from DuckDB
```

---

## Feature: Demo Controls

### Scenario: Reset Demo to Start
```gherkin
Given the demo is at state "ACT2_MPR_ALERTS"
When I click "Reset" in the demo toolbar
And I confirm the reset
Then the workspace is restored to pristine state
And all alerts are cleared
And all calculation results are removed
And the state indicator shows "PRISTINE"
And the reset completes in under 3 seconds
```

### Scenario: Skip to Full Demo End State
```gherkin
Given the demo is at state "PRISTINE"
When I click "Skip to End"
Then the workspace is restored to the "final" snapshot
And all 5 detection models are deployed
And alerts are visible in Risk Case Manager
And all calculation results are queryable
And the state indicator shows "COMPLETE"
```

### Scenario: Step Through Demo One Checkpoint at a Time
```gherkin
Given the demo is at state "DATA_MAPPED"
When I click "Step ▶"
Then the pipeline runs for the next layer
And the state advances to "ACT1_PIPELINE_RUNNING"
And the Pipeline Monitor shows progress
When I click "Step ▶" again
Then the state advances to the next checkpoint
```

---

## Feature: Domain Value Suggestions

### Scenario: Autocomplete Suggestions for Entity Fields
```gherkin
Given I am editing a setting override in Settings Manager
When I click on the "asset_class" input field
Then I see a dropdown of known asset_class values from entity metadata
And the values include: equity, fx, commodity, option, future, fixed_income, index
When I type "eq"
Then the dropdown filters to show only "equity"
When I select "equity"
Then the input is filled with "equity"
```

### Scenario: Tiered Loading Based on Cardinality
```gherkin
Given entity "product" has 50 distinct product_id values
When I request domain values for product_id
Then all 50 values are loaded as a full dropdown (cardinality ≤ 50)
Given entity "execution" has 509 distinct execution_id values
When I request domain values for execution_id
Then values are loaded as a searchable input with server-side filtering (cardinality > 500)
```

---

## Feature: Match Pattern Library

### Scenario: Reuse an Existing Match Pattern
```gherkin
Given 9 OOB match patterns exist in the pattern bank
When I open the MatchPatternPicker in Settings Manager
Then I see a searchable list of existing patterns with usage counts
When I select "US Equity Markets" pattern
Then the match criteria are populated: {asset_class: "equity", country: "US"}
And I can adjust values for my specific override
```

### Scenario: Save a New Match Pattern
```gherkin
Given I have defined a custom match criteria {asset_class: "fx", region: "APAC"}
When I click "Save as Pattern" in the MatchPatternPicker
And I enter label "APAC FX Markets" and description "All FX products in Asia-Pacific"
Then the pattern is saved to the pattern bank
And it appears in future pattern picker searches
```

---

## Feature: Score Step Builder

### Scenario: Visual Score Step Configuration
```gherkin
Given I am configuring score steps for a setting
When I open the ScoreStepBuilder
Then I see a visual range bar showing score tiers
And an editable table with min_value, max_value, and score columns
When I add a new row: min=100000, max=500000, score=7
Then the range bar updates to show the new tier
And gap/overlap detection runs automatically
```

### Scenario: Gap and Overlap Detection
```gherkin
Given score steps: [0-10000: 0, 10000-100000: 3, 200000-500000: 7]
When the validation runs
Then it detects a gap between 100000 and 200000
And highlights the gap in the visual range bar
And shows a warning: "Gap detected between ranges 100000-200000"
```

### Scenario: Apply Score Template
```gherkin
Given 7 OOB score templates exist (e.g., "Standard Volume Tiers", "Ratio Thresholds")
When I click "Use Template" in the ScoreStepBuilder
Then I see templates filtered by value_category matching my setting type
When I select "Standard Volume Tiers"
Then the score steps are populated from the template
And I can adjust individual values while keeping the tier structure
```

---

## Feature: Model Composer Wizard

### Scenario: Create Detection Model via 7-Step Wizard
```gherkin
Given I click "+ New Model" in Model Composer
Then I see a 7-step wizard: Define, Select Calcs, Scoring, Query, Review, Test, Deploy
When I complete Step 1 (name, description, regulatory tags)
And Step 2 (select 3 calculations with MUST_PASS/OPTIONAL)
And Step 3 (configure score steps and threshold setting)
And Step 4 (review/edit SQL query in Monaco editor)
And Step 5 (review summary with validation checks)
And Step 6 (run test execution and see results in AG Grid)
And Step 7 (deploy to production)
Then the model is saved and alerts are generated
And the validation panel shows all checks passed
```

### Scenario: Live Validation During Wizard
```gherkin
Given I am on Step 1 of the Model Composer wizard
When I leave the name field empty
Then the validation panel shows: "Name is required"
When I enter a name
Then the validation check turns green
And the overall validation score updates in real-time
```

### Scenario: Preview Panel Shows Score Distribution
```gherkin
Given I have selected 3 calculations with score steps
When I switch to the Preview tab in the right panel
Then I see a Recharts bar chart showing simulated score distribution
And the score threshold line is marked
And a summary shows estimated alert count
```

---

## Feature: Use Case Studio

### Scenario: Create a Custom Detection Use Case
```gherkin
Given I navigate to Use Case Studio
When I click "New Use Case"
Then I see a 5-step wizard: Define, Components, Sample Data, Expected Results, Validate
When I define name "High-Value FX Wash" and description
And I add 2 calculation components with parameters
And I define sample data for testing
And I set expected outcomes (alert count, score range)
And I click "Validate"
Then the use case is saved and validation runs against sample data
And results show whether expected outcomes match actual
```

### Scenario: AI-Assisted Calculation Building
```gherkin
Given I am in the AI Calc Builder
When I type "Detect accounts with FX trading volume exceeding 3x their 30-day average"
Then the AI generates a calculation proposal with:
  - calc_id, name, layer, SQL template
  - Input entities and fields
  - Parameter suggestions (threshold, lookback period)
  - Regulatory tag suggestions
When I click "Refine"
Then the AI adjusts based on my feedback
When I click "Validate & Save"
Then the 5-layer validation runs (static, schema, sandbox, impact, regression)
And the calculation is saved to the user metadata layer
```

---

## Feature: Submission Review Pipeline

### Scenario: Submit a Use Case for Review
```gherkin
Given I have a validated use case "High-Value FX Wash"
When I click "Submit for Review"
Then the submission enters the review queue with status "pending"
And the system generates recommendations:
  - Change classification (new model vs modification)
  - Similarity analysis (% overlap with existing models)
  - Impact assessment (estimated alert volume)
  - Risk rating (low/medium/high based on scope)
```

### Scenario: Review and Approve a Submission
```gherkin
Given submission "High-Value FX Wash" is in the review queue
When I open the submission detail
Then I see 5 tabs: Overview, Validation, Recommendations, Components, History
When I review the validation results and recommendations
And I click "Approve"
Then the submission status changes to "approved"
And the "Implement" button becomes available
When I click "Implement"
Then the use case components are deployed to the system
And alerts begin generating
```

---

## Feature: Version Management

### Scenario: View Version History
```gherkin
Given a calculation "value_calc" has been modified 3 times
When I open Version Management for value_calc
Then I see a version history list with timestamps and descriptions
When I select two versions for comparison
Then I see a side-by-side diff showing what changed
```

### Scenario: Rollback to Previous Version
```gherkin
Given calculation "value_calc" has version 3 (current) and version 2 (previous)
When I click "Rollback to v2"
And I confirm the rollback
Then version 2 becomes the active version
And a new version 4 is created (copy of v2) for audit trail
```

---

## Feature: Guided Tour System

### Scenario: Watch Demo Mode (Auto-Play)
```gherkin
Given I open the Scenario Selector
And I select scenario "Configure Score Threshold" in category "Settings & Thresholds"
When I choose "Watch Demo" mode
Then the tour auto-navigates to Settings Manager
And highlights the first element with a spotlight overlay
And shows step description with title and content
And auto-advances through all steps with smooth transitions
When the scenario completes
Then a completion message is shown
And the scenario is marked as completed in the selector
```

### Scenario: Try It Yourself Mode (Interactive)
```gherkin
Given I select scenario "Create Your First Detection Model"
When I choose "Try It Yourself" mode
Then the tour shows the first step with a hint
And waits for me to perform the action manually
When I complete the action (e.g., click "+ New Model")
Then the tour validates my action and advances to the next step
If I perform the wrong action
Then the tour shows a corrective hint
```

### Scenario: Per-View Operation Scripts
```gherkin
Given I am on the Settings Manager view
When I click the "?" help button
Then I see a list of 3-8 operations available on this view
Each operation has a title and description
And describes what the user can do on this specific view
```

---

## Feature: OOB vs User Layer Separation

### Scenario: OOB Items are Protected
```gherkin
Given a calculation "value_calc" with metadata_layer "oob"
When I try to delete it
Then the system shows: "Cannot delete OOB items. Create a user-layer override instead."
When I edit it
Then the changes are saved as a user-layer override
And the original OOB definition is preserved
And a "Custom" badge appears next to the item
```

### Scenario: Reset to OOB Default
```gherkin
Given calculation "value_calc" has a user-layer override
When I click "Reset to OOB"
Then the user-layer override is removed
And the OOB default is restored
And the badge changes from "Custom" to "OOB"
```

---

## Feature: SQL Query Presets from Metadata

### Scenario: Presets Loaded from Metadata
```gherkin
Given the platform is running
And query presets are defined in workspace/metadata/query_presets/default.json
When I navigate to SQL Console
And I open the presets dropdown
Then I see presets matching the metadata file
And each preset has a name and SQL query
```

### Scenario: Adding a New Preset via Metadata
```gherkin
Given 3 presets exist in the metadata file
When I add a 4th preset to workspace/metadata/query_presets/default.json
And I reload the SQL Console
Then the new preset appears in the dropdown
```

---

## Feature: Dashboard Widget Configuration

### Scenario: Dashboard Renders from Widget Metadata
```gherkin
Given widget configuration exists at workspace/metadata/widgets/dashboard.json
When I navigate to Dashboard
Then KPI cards render matching the widget config
And chart widgets render in the order specified by metadata
```

### Scenario: Reordering Dashboard Widgets
```gherkin
Given widgets A (order=1) and B (order=2) in dashboard config
When I change widget B order to 0
And I reload the Dashboard
Then widget B appears before widget A
```

---

## Feature: Navigation from Metadata

### Scenario: Sidebar Renders from Navigation Manifest
```gherkin
Given navigation is defined in workspace/metadata/navigation/main.json
When the application loads
Then the sidebar shows groups matching the navigation manifest
And each group shows items in the defined order
```

### Scenario: Adding a New View to Navigation
```gherkin
Given 16 views in the navigation manifest
When I add a 17th view entry to the manifest
And I reload the application
Then the sidebar shows 17 navigation items
```

---

## Feature: Format Rules from Metadata

### Scenario: Labels Format According to Rules
```gherkin
Given format rules define model_id as "snake_to_title"
When model_id "wash_intraday" is displayed in the UI
Then it appears as "Wash Intraday"
```

### Scenario: Numeric Values Format According to Rules
```gherkin
Given format rules define score with precision 2
When accumulated_score 85.678 is displayed
Then it appears as "85.68"
```

---

## Feature: Model-Specific Alert Layouts

### Scenario: Wash Trading Alert Shows Relevant Panels
```gherkin
Given a wash trading alert exists
When I view the alert detail
Then the panel order matches wash_intraday.alert_detail_layout.panels
And the "scores" panel is visually emphasized
```

### Scenario: Different Models Show Different Layouts
```gherkin
Given alerts from wash_intraday and insider_dealing models
When I view each alert's detail
Then each displays panels in a different order
And each highlights different emphasis sections
```

---

## Feature: Settings Resolution Strategy Pattern

### Scenario: Custom Resolution Strategy
```gherkin
Given a new "weighted" resolution strategy is registered in RESOLUTION_STRATEGIES
And a setting uses match_type "weighted"
When I resolve the setting with context
Then the weighted strategy is used instead of hierarchy or multi-dimensional
```

---

## Feature: Metadata Audit Trail

### Scenario: Saving Metadata Creates Audit Record
```gherkin
Given the platform is running
When I save an entity definition via the API
Then an audit record is created in workspace/metadata/_audit/
And the record contains timestamp, metadata_type, item_id, action, and new_value
```

### Scenario: Updating Metadata Records Previous Value
```gherkin
Given entity "test_entity" exists with name "V1"
When I update the entity name to "V2"
Then the audit record contains action "updated"
And the audit record contains previous_value with name "V1"
And the audit record contains new_value with name "V2"
```

### Scenario: Querying Audit History via API
```gherkin
Given several metadata changes have been recorded
When I call GET /api/metadata/audit?metadata_type=entity&item_id=test_entity
Then I receive a list of audit records filtered by entity type and item ID
```

---

## Feature: AI Context Summary from Metadata

### Scenario: Context Summary Reflects Current Metadata
```gherkin
Given the platform has 8 entities and 5 detection models defined in metadata
When I call GET /api/ai/context-summary
Then the response includes entity count and names
And the response includes detection model names
And the context updates automatically when metadata changes
```

---

# Phase 2: Compliance Metadata & Metadata-Driven UI (M151-M170)

---

## Feature: ISO Standards Registry

### Scenario: Browse ISO Standards Used by the Platform
```gherkin
Given the platform is running
When I call GET /api/metadata/standards/iso
Then the response contains 6 ISO standard entries
And each entry includes iso_standard, standard_name, field_path, description, entities_using, and validation_rules
And the standards include ISO 6166 (ISIN), ISO 10383 (MIC), ISO 10962 (CFI), ISO 4217 (Currency), ISO 3166-1 (Country), and ISO 8601 (Date/Time)
```

### Scenario: Validate ISIN Format Against ISO 6166 Rules
```gherkin
Given ISO standard "ISO 6166" defines validation rules:
  | field  | value                      |
  | length | 12                         |
  | format | ^[A-Z]{2}[A-Z0-9]{9}[0-9]$ |
When I validate ISIN "US0378331005" against the rules
Then the validation passes (12 characters, matches regex)
When I validate ISIN "12345" against the rules
Then the validation fails (wrong length, wrong format)
```

### Scenario: Cross-Reference ISO Standard with Entities
```gherkin
Given ISO standard "ISO 10383" (MIC) is in the registry
Then the entities_using field lists: venue, product, execution, order
And the fields_using field lists: mic, exchange_mic, venue_mic
And the regulatory_relevance includes "MiFID II RTS 25" and "MAR Art. 16"
And the detection_models_using includes wash_full_day, wash_intraday, and spoofing_layering
```

### Scenario: ISO Standard Links to Detection Models
```gherkin
Given ISO standard "ISO 8601" (Date/Time) is in the registry
Then detection_models_using lists all 5 models: wash_full_day, wash_intraday, insider_dealing, market_price_ramping, spoofing_layering
And entities_using lists: execution, order, md_eod, md_intraday
And fields_using includes exec_time, exec_date, order_time, order_date, trade_date, timestamp
```

---

## Feature: FIX Protocol Registry

### Scenario: Browse FIX Protocol Field Mappings
```gherkin
Given the platform is running
When I call GET /api/metadata/standards/fix
Then the response contains 6 FIX protocol field entries
And each entry includes field_number, field_name, description, domain_values, entities_using, and regulatory_relevance
```

### Scenario: Verify FIX Field Domain Value Alignment
```gherkin
Given FIX field 40 (OrdType) maps to entity "order" field "order_type"
Then the domain_values are ["MARKET", "LIMIT"]
And the order entity metadata also defines order_type with matching domain values
When I load order data
Then all order_type values conform to the FIX field 40 domain
```

### Scenario: FIX Protocol Covers Order Lifecycle
```gherkin
Given FIX fields in the registry:
  | FIX Tag | Name       | Entity    | Platform Field |
  | 40      | OrdType    | order     | order_type     |
  | 54      | Side       | order     | side           |
  | 39      | OrdStatus  | order     | status         |
  | 59      | TimeInForce| order     | time_in_force  |
  | 150     | ExecType   | execution | exec_type      |
  | 1057    | Aggressor  | execution | capacity       |
Then every order lifecycle field is traceable to a FIX Protocol tag
And each field's regulatory_relevance references MiFID II RTS 25 or MAR Art. 16
```

---

## Feature: Compliance Requirements

### Scenario: View Compliance Requirements with Implementation Status
```gherkin
Given the platform is running
When I call GET /api/metadata/standards/compliance
Then the response contains 14 compliance requirements
And each requirement includes requirement_id, regulation, article, requirement_text, implementation, implementation_id, and status
And requirements with status "implemented" have a corresponding detection model or entity field
```

### Scenario: Compliance Requirement References Detection Model
```gherkin
Given compliance requirement "mar_12_1_a_wash" exists
Then it references regulation "MAR", article "Art. 12(1)(a)"
And implementation type is "detection_model" with implementation_id "wash_full_day"
And evidence_type is "alert_with_score"
And validation_frequency is "real-time"
And status is "implemented"
```

### Scenario: Identify Partially Implemented Requirements
```gherkin
Given compliance requirements are loaded
When I filter requirements where status = "partial"
Then I see:
  | requirement_id           | regulation | article  | reason                                    |
  | mifid2_rts25_clock_sync  | MiFID II   | RTS 25   | Clock synchronisation not fully verified   |
  | emir_9_reporting         | EMIR       | Art. 9   | Derivative reporting fields present but not fully validated |
And each partial requirement identifies what is missing for full compliance
```

### Scenario: Multi-Regulation Coverage for Single Model
```gherkin
Given detection model "wash_full_day" is referenced by compliance requirements
When I filter requirements by implementation_id = "wash_full_day"
Then I find requirements from multiple regulations:
  | requirement_id       | regulation |
  | mar_12_1_a_wash      | MAR        |
  | mifid2_16_2_org      | MiFID II   |
  | sec_9a2_wash         | SEC        |
And this demonstrates multi-jurisdiction coverage from a single model
```

---

## Feature: Enhanced Regulations

### Scenario: Regulatory Registry Includes EMIR and SEC
```gherkin
Given the platform is running
When I call GET /api/metadata/regulations
Then the response contains 6 regulations: MAR, MiFID II, Dodd-Frank, FINRA, EMIR, SEC
And each regulation has id, name, full_name, jurisdiction, source_url, and articles
```

### Scenario: Multi-Jurisdiction Coverage Across EU and US
```gherkin
Given regulations in the registry:
  | regulation | jurisdiction |
  | MAR        | EU           |
  | MiFID II   | EU           |
  | EMIR       | EU           |
  | Dodd-Frank | US           |
  | FINRA      | US           |
  | SEC        | US           |
When I group regulations by jurisdiction
Then EU has 3 regulations (MAR, MiFID II, EMIR)
And US has 3 regulations (Dodd-Frank, FINRA, SEC)
```

### Scenario: EMIR Derivative Reporting Articles
```gherkin
Given regulation "EMIR" (EU Regulation 648/2012) is in the registry
Then it includes 2 articles:
  | article  | title                      | detection_pattern      |
  | Art. 9   | Reporting Obligation       | derivative_reporting   |
  | Art. 11  | Risk Mitigation Techniques | risk_mitigation        |
And the source_url points to the official EUR-Lex publication
```

### Scenario: SEC Insider Trading and Wash Trading Articles
```gherkin
Given regulation "SEC" is in the registry
Then it includes 2 articles:
  | article    | title               | detection_pattern |
  | Rule 10b-5 | Insider Trading     | insider_dealing   |
  | §9(a)(2)   | Market Manipulation | wash_trading      |
And each article's detection_pattern maps to an existing detection model
```

### Scenario: Regulation Source URLs Are Traceable
```gherkin
Given all 6 regulations have source_url fields
Then each URL points to an authoritative legal source:
  | regulation | source_domain          |
  | MAR        | eur-lex.europa.eu      |
  | MiFID II   | eur-lex.europa.eu      |
  | EMIR       | eur-lex.europa.eu      |
  | Dodd-Frank | congress.gov           |
  | FINRA      | finra.org              |
  | SEC        | sec.gov                |
```

---

## Feature: Account MiFID Classification

### Scenario: Account Has MiFID II Client Category
```gherkin
Given account entity has a "mifid_client_category" field
And the field has domain values: retail, professional, eligible_counterparty
When I load account data
Then each account is assigned a MiFID II client category
And institutional accounts are classified as "professional"
And hedge fund accounts are classified as "eligible_counterparty"
And retail accounts are classified as "retail"
```

### Scenario: Account Compliance Status Tracks Review State
```gherkin
Given account entity has a "compliance_status" field
And the field has domain values: active, under_review, restricted, suspended
When I query accounts
Then most accounts have compliance_status "active"
And accounts under investigation may show "under_review"
And the compliance_status is visible in the account entity grid
```

### Scenario: MiFID Classification Drives Regulatory Scope
```gherkin
Given account ACC-42 has mifid_client_category "professional"
And account ACC-42 has compliance_status "active"
When an alert fires for ACC-42
Then the alert entity context includes the MiFID classification
And investigators can assess regulatory obligations based on client category
And "eligible_counterparty" accounts have different reporting thresholds than "retail"
```

---

## Feature: Product Regulatory Scope

### Scenario: Product Has Regulatory Jurisdiction Tag
```gherkin
Given product entity has a "regulatory_scope" field
And the field has domain values: EU, US, UK, APAC, MULTI
When I load product data
Then NYSE-listed products have regulatory_scope "US"
And XLON-listed products have regulatory_scope "UK"
And XETR-listed products have regulatory_scope "EU"
```

### Scenario: Regulatory Scope Derived from Venue Jurisdiction
```gherkin
Given product "AAPL" is listed on exchange_mic "XNGS" (NASDAQ)
When XNGS is in the US jurisdiction
Then product AAPL has regulatory_scope "US"
And SEC rules apply to AAPL surveillance
```

### Scenario: Detection Models Support Multi-Jurisdiction
```gherkin
Given detection model "wash_full_day" has regulatory_coverage entries:
  | regulation | article      |
  | MAR        | Art. 12(1)(a)|
  | MiFID II   | Art. 16(2)   |
  | MiFID II   | RTS 25       |
  | SEC        | §9(a)(2)     |
When the model detects a wash trade for a product with regulatory_scope "US"
Then the alert references SEC §9(a)(2) as the applicable regulation
When the same model detects a wash trade for a product with regulatory_scope "EU"
Then the alert references MAR Art. 12(1)(a) as the applicable regulation
```

---

## Feature: Grid Column Metadata

### Scenario: Data Manager Columns Loaded from Metadata API
```gherkin
Given grid column metadata exists at workspace/metadata/grids/data_manager.json
When I call GET /api/metadata/grids/data_manager_tables
Then the response includes columns with field, header_name, flex, width, and filter_type
And the default_sort_field is "name" with direction "asc"
When I navigate to Data Manager
Then the AG Grid renders columns matching the metadata definition
```

### Scenario: Alert Summary Grid Columns from Metadata
```gherkin
Given grid metadata for risk_case_manager defines 8 columns:
  | field              | header_name | filter_type           |
  | alert_id           | Alert ID    | agTextColumnFilter    |
  | model_id           | Model       | agTextColumnFilter    |
  | product_id         | Product     | agTextColumnFilter    |
  | account_id         | Account     | agTextColumnFilter    |
  | accumulated_score  | Score       | agNumberColumnFilter  |
  | score_threshold    | Threshold   | agNumberColumnFilter  |
  | trigger_path       | Trigger     | agTextColumnFilter    |
  | timestamp          | Time        | agDateColumnFilter    |
When I navigate to Risk Case Manager
Then the alert summary grid renders these 8 columns
And numeric columns align right (numericColumn type)
And the grid sorts by timestamp descending by default
```

### Scenario: Related Execution Columns from Metadata
```gherkin
Given grid metadata for related_executions defines 12 columns
When I view an alert detail with related executions
Then the execution grid renders columns including exec ID, order ID, date, time, side, qty, price, venue, exec type, capacity, product, and account
And the side column renders as a styled badge (value_format: "side_badge")
And the price column formats to 2 decimal places (value_format: "decimal_2")
```

### Scenario: Related Order Columns from Metadata
```gherkin
Given grid metadata for related_orders defines 11 columns
When I view an alert detail with related orders
Then the order grid renders columns including order ID, date, time, side, qty, type, limit price, TIF, trader, product, and account
And each column's width and filter type matches the metadata definition
```

### Scenario: Adding a Column via Metadata Updates the Grid
```gherkin
Given the data_manager grid metadata has 2 columns
When I add a 3rd column {"field": "row_count", "header_name": "Rows", "width": 80} to the metadata
And I reload Data Manager
Then the grid renders 3 columns including the new "Rows" column
```

---

## Feature: Alert Filter Metadata

### Scenario: Alert Summary Filters Driven by Column Metadata
```gherkin
Given risk_case_manager grid metadata defines filter_type for each column
When I navigate to Risk Case Manager
Then the model_id column has a text filter (agTextColumnFilter)
And the accumulated_score column has a number filter (agNumberColumnFilter)
And the timestamp column has a date filter (agDateColumnFilter)
And I can filter alerts by typing in the model_id filter
And I can filter alerts by score range using the number filter
```

### Scenario: Value Format Rules Applied to Grid Cells
```gherkin
Given grid metadata for risk_case_manager specifies value_format on columns:
  | field        | value_format |
  | model_id     | label        |
  | trigger_path | label        |
  | timestamp    | timestamp    |
When alerts are rendered in the grid
Then model_id "wash_full_day" displays as "Wash Full Day" (snake_to_title format)
And trigger_path "score_based" displays as "Score Based"
And timestamp values display in formatted date-time format
```

---

## Feature: View Tab Metadata

### Scenario: Entity Designer Tabs Loaded from API
```gherkin
Given view tab metadata exists at workspace/metadata/view_config/entity_designer.json
When I call GET /api/metadata/view-config/entity_designer
Then the response includes 2 tabs:
  | id            | label             | icon  | default |
  | details       | Entity Details    | table | true    |
  | relationships | Relationship Graph| link  | false   |
When I navigate to Entity Designer
Then the detail panel shows 2 tabs matching the metadata
And the "Entity Details" tab is selected by default
```

### Scenario: Model Composer Tabs Loaded from API
```gherkin
Given view tab metadata exists at workspace/metadata/view_config/model_composer.json
When I call GET /api/metadata/view-config/model_composer
Then the response includes 3 tabs:
  | id           | label    | icon       | default |
  | validation   | Validate | check      | true    |
  | preview      | Preview  | eye        | false   |
  | dependencies | Deps     | git-branch | false   |
When I navigate to Model Composer
Then the right panel shows 3 tabs matching the metadata
And the "Validate" tab is selected by default
```

### Scenario: Adding a New Tab via Metadata
```gherkin
Given Entity Designer has 2 tabs defined in metadata
When I add a 3rd tab {"id": "audit", "label": "Audit Log", "icon": "clock"} to the metadata
And I reload Entity Designer
Then the detail panel shows 3 tabs including "Audit Log"
```

---

## Feature: Color Palette Metadata

### Scenario: Chart Colors Loaded from Theme Palette
```gherkin
Given theme palette metadata exists at workspace/metadata/theme/palettes.json
When I call GET /api/metadata/theme/palettes
Then the response includes chart_colors array with 7 hex values
And the chart_colors start with "#6366f1" (indigo) and include cyan, amber, red, emerald, violet, pink
When I navigate to Dashboard
Then chart series use colors from the palette in order
```

### Scenario: Asset Class Colors from Palette
```gherkin
Given the palette defines asset_class_colors:
  | asset_class  | color   |
  | equity       | #6366f1 |
  | fx           | #22d3ee |
  | commodity    | #f59e0b |
  | index        | #10b981 |
  | fixed_income | #8b5cf6 |
When I view charts grouped by asset class
Then each asset class renders in its assigned color
And colors are consistent across all views (Dashboard, Regulatory Map, charts)
```

### Scenario: Graph Node Colors from Palette
```gherkin
Given the palette defines graph_node_colors:
  | node_type        | color   |
  | regulation       | #3b82f6 |
  | article_covered  | #22c55e |
  | article_uncovered| #ef4444 |
  | detection_model  | #f97316 |
  | calculation      | #a855f7 |
When I navigate to Regulatory Map
Then regulation nodes render in blue (#3b82f6)
And covered article nodes render in green (#22c55e)
And uncovered article nodes render in red (#ef4444)
And detection model nodes render in orange (#f97316)
```

### Scenario: Layer Badge Variants from Palette
```gherkin
Given the palette defines layer_badge_variants:
  | layer  | variant |
  | oob    | info    |
  | user   | warning |
  | custom | success |
When I view metadata items with layer badges
Then OOB items show an "info" (blue) badge
And user-defined items show a "warning" (amber) badge
And custom items show a "success" (green) badge
```

---

## Feature: Submission Workflow Metadata

### Scenario: Workflow States Loaded from Metadata
```gherkin
Given submission workflow metadata exists at workspace/metadata/workflows/submission.json
When I call GET /api/metadata/workflows/submission
Then the response includes 5 workflow states: pending, in_review, approved, rejected, implemented
And each state has id, label, badge_variant, and transitions
```

### Scenario: Valid State Transitions Enforced by Metadata
```gherkin
Given the submission workflow defines transitions:
  | from_state | allowed_transitions              |
  | pending    | in_review, approved, rejected    |
  | in_review  | approved, rejected               |
  | approved   | implemented                      |
  | rejected   | pending                          |
  | implemented| (none — terminal state)          |
When a submission is in state "in_review"
And I attempt to transition to "implemented"
Then the transition is rejected because "implemented" is not in the allowed transitions for "in_review"
When I transition to "approved" instead
Then the transition succeeds
```

### Scenario: Badge Variants Match Workflow States
```gherkin
Given the workflow metadata assigns badge_variant to each state:
  | state       | badge_variant |
  | pending     | info          |
  | in_review   | warning       |
  | approved    | success       |
  | rejected    | error         |
  | implemented | success       |
When I view the submission review queue
Then each submission's status badge renders with the correct variant color
And "Pending" shows as blue (info)
And "Rejected" shows as red (error)
And "Approved" shows as green (success)
```

### Scenario: Rejected Submission Can Be Resubmitted
```gherkin
Given a submission in state "rejected"
When I review the rejection reason
And I click "Resubmit"
Then the submission transitions back to "pending"
And the transition is valid per the workflow metadata (rejected → pending)
And the submission re-enters the review queue
```

---

## Feature: Demo Checkpoints Metadata

### Scenario: Demo Checkpoints Loaded from Metadata
```gherkin
Given demo checkpoint metadata exists at workspace/metadata/demo/default.json
When I call GET /api/metadata/demo/default
Then the response includes 8 ordered checkpoints:
  | id               | label            | order |
  | pristine         | Pristine         | 0     |
  | data_loaded      | Data Loaded      | 1     |
  | pipeline_run     | Pipeline Run     | 2     |
  | alerts_generated | Alerts Generated | 3     |
  | act1_complete    | Act 1 Complete   | 4     |
  | model_deployed   | Model Deployed   | 5     |
  | act2_complete    | Act 2 Complete   | 6     |
  | final            | Final            | 7     |
```

### Scenario: Demo Toolbar Renders Checkpoints from Metadata
```gherkin
Given demo checkpoint metadata is loaded
When I view the demo toolbar
Then the progress bar shows all 8 checkpoints in metadata order
And each checkpoint label matches the metadata label field
And checkpoint descriptions are available on hover
```

### Scenario: Demo Stepper Follows Metadata Order
```gherkin
Given the demo is at checkpoint "data_loaded" (order=1)
When I click "Step" in the demo toolbar
Then the demo advances to "pipeline_run" (order=2)
And the checkpoint ordering is determined by the metadata "order" field
When I click "Step" again
Then the demo advances to "alerts_generated" (order=3)
```

### Scenario: Adding a Custom Checkpoint via Metadata
```gherkin
Given the demo has 8 checkpoints
When I add a checkpoint {"id": "data_validated", "label": "Data Validated", "description": "All data quality checks passed", "order": 1.5} to the metadata
And I reload the demo toolbar
Then the new checkpoint appears between "Data Loaded" (order=1) and "Pipeline Run" (order=2)
```

---

## Feature: Tour Registry Metadata

### Scenario: Tour Registry Loaded from Metadata
```gherkin
Given tour registry metadata exists at workspace/metadata/tours/registry.json
When I call GET /api/metadata/tours/registry
Then the response includes 19 tours with tour_id, view_path, title, and step_count
And scenario metadata shows 26 total scenarios across 7 categories
```

### Scenario: Tour Registry Matches View Paths
```gherkin
Given the tour registry defines tours for views:
  | tour_id    | view_path   | title                  |
  | dashboard  | /dashboard  | Dashboard Tour         |
  | entities   | /entities   | Entity Designer Tour   |
  | settings   | /settings   | Settings Manager Tour  |
  | alerts     | /alerts     | Risk Case Manager Tour |
  | sql        | /sql        | SQL Console Tour       |
  | regulatory | /regulatory | Regulatory Traceability Tour |
When I navigate to any view with a matching tour
Then the tour help button (?) is available in the toolbar
And clicking it launches the tour defined in the registry
```

### Scenario: Scenario Categories Organized in Registry
```gherkin
Given the tour registry defines scenario categories:
  | category         | count |
  | Settings         | 6     |
  | Calculations     | 4     |
  | Detection Models | 4     |
  | Use Cases        | 4     |
  | Entities         | 2     |
  | Investigation    | 3     |
  | Administration   | 3     |
Then the total scenario count is 26
And the Scenario Selector groups scenarios by these categories
```

---

## Feature: Detection Model Market Data Configuration

### Scenario: Model Specifies Market Data Chart Type
```gherkin
Given detection model "wash_full_day" has market_data_config:
  | field          | value                                |
  | chart_type     | candlestick                          |
  | time_field     | timestamp                            |
  | price_fields   | {open, high, low, close}             |
  | volume_field   | volume                               |
  | overlay_trades | true                                 |
When I view an alert detail for wash_full_day
Then the market data chart renders as a candlestick chart
And trade markers overlay on the price chart
And volume is shown below the price chart
```

### Scenario: Different Models Use Different Chart Configurations
```gherkin
Given all 5 detection models have market_data_config
When I view alerts from different models
Then each model's alert detail renders the chart according to its market_data_config
And all models use candlestick charts with trade overlay
And the chart configuration is metadata-driven, not hardcoded
```

---

## Feature: Multi-Jurisdiction Regulatory Coverage on Models

### Scenario: Detection Model Lists All Applicable Regulations
```gherkin
Given detection model "insider_dealing" has regulatory_coverage:
  | regulation | article      | description                               |
  | MAR        | Art. 14      | Prohibition of insider dealing             |
  | MiFID II   | Art. 16(2)   | Organisational surveillance requirements   |
  | SEC        | Rule 10b-5   | Fraud in connection with securities trading|
When I view the model in Model Composer
Then the regulatory coverage section lists all 3 regulations
And each regulation shows the article reference and description
```

### Scenario: All Five Models Have Regulatory Coverage
```gherkin
Given the platform has 5 detection models
When I load all model definitions
Then each model has a non-empty regulatory_coverage array
And the coverage spans both EU and US jurisdictions:
  | model                | regulations_covered          |
  | wash_full_day        | MAR, MiFID II, SEC           |
  | wash_intraday        | MAR, MiFID II                |
  | market_price_ramping | MAR, MiFID II, FINRA         |
  | insider_dealing      | MAR, MiFID II, SEC           |
  | spoofing_layering    | MAR, MiFID II, Dodd-Frank    |
And the Regulatory Map graph shows these coverage relationships
```
