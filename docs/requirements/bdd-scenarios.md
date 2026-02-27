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
