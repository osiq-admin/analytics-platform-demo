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

---

## Feature: Wash Trading Detection (Act 1)

### Scenario: Detect Wash Trading — Full Day
```gherkin
Given account ACC-42 traded AAPL on 2024-01-15:
  | time  | side | quantity | price  |
  | 10:00 | BUY  | 1000     | 185.00 |
  | 10:30 | BUY  | 500      | 185.50 |
  | 14:00 | SELL | 1000     | 185.20 |
  | 14:30 | SELL | 500      | 185.10 |
And setting "wash_vwap_threshold" = 0.02 for equity
When wash_full_day model runs
Then it detects:
  | check              | value  | threshold | result |
  | buy_qty ≈ sell_qty | 1500/1500 | match  | PASS   |
  | vwap_proximity     | 0.0011 | 0.02     | PASS   |
  | large_activity     | 2.5x   | 2.0x     | PASS   |
And an alert is generated with score > 0.8
And the alert detail shows the VWAP comparison and order timeline
```

---

## Feature: Market Price Ramping Detection (Act 2)

### Scenario: Detect MPR During Up Trend
```gherkin
Given a detected up trend for AAPL: 10:00-11:00
And account ACC-55 aggressively bought during the up trend:
  | time  | side | quantity |
  | 10:05 | BUY  | 2000     |
  | 10:15 | BUY  | 3000     |
  | 10:25 | BUY  | 1500     |
And setting "mpr_same_side_threshold" = 80% (80% of trades on same side as trend)
When market_price_ramping model runs
Then it detects ACC-55 with 100% same-side trading (all BUY during up trend)
And the activity exceeds the large trading threshold
And an MPR alert is generated
And the alert chart shows the trend with the account's buy markers overlaid
```

---

## Feature: Insider Dealing Detection (Act 3)

### Scenario: Detect Insider Dealing Before Market Event
```gherkin
Given AAPL had a market event on 2024-01-15 (5.4% price jump)
And setting "insider_lookback_days" = 5 for equity
And account ACC-42 bought AAPL call options on 2024-01-12 and 2024-01-13:
  | date       | product   | side | value    |
  | 2024-01-12 | AAPL-C150 | BUY  | 15000.00 |
  | 2024-01-13 | AAPL-C155 | BUY  | 8000.00  |
And AAPL-C150 and AAPL-C155 are related to AAPL via "underlying" relationship
When insider_dealing model runs
Then it detects ACC-42 traded related products 2-3 days before the market event
And the total activity ($23,000) exceeds the large activity threshold
And an insider dealing alert is generated
And the alert shows: market event, lookback window, related product expansion, profit calculation
```

---

## Feature: Alert Investigation

### Scenario: Drill Down Into Alert
```gherkin
Given alert ALT-001 exists for insider dealing
When I click ALT-001 in the Alert Summary
Then I see the Alert Detail with:
  - Business description: "Account ACC-42 had unusual buying in AAPL options 3 days before earnings..."
  - Entity context: Trader J. Smith, Desk US Flow, Account ACC-42
  - Price chart: AAPL price with market event marker and ACC-42's trade markers
  - Calculation trace DAG: market_event → large_activity → insider_dealing
  - Settings resolution: lookback=5 days (equity default), threshold=2x (global)
  - Score breakdown: activity_score=0.82, event_significance=0.91, composite=0.87
  - Related orders table showing all ACC-42's AAPL option trades
And I can click any calculation node to see its formula and input values
And I can click any setting to see the full resolution trace
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
