import type { ScenarioDefinition } from "../stores/tourStore.ts";

// ==========================================================================
// Scenario Definitions — Settings & Thresholds (S1-S6)
// ==========================================================================
// Each scenario works in dual mode:
//   - "Watch Demo" (auto-play): actions execute automatically
//   - "Try It Yourself" (interactive): hints guide the user
// ==========================================================================

// --------------------------------------------------------------------------
// S1: View Settings Overview (Beginner, 3 min)
// --------------------------------------------------------------------------
const S1_VIEW_SETTINGS: ScenarioDefinition = {
  id: "s1_view_settings",
  name: "View Settings Overview",
  description:
    "Walk through the Settings Manager UI — understand the layout, search for settings, and view details including score steps and the resolution tester.",
  category: "settings",
  difficulty: "beginner",
  estimatedMinutes: 3,
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Settings Manager",
      content:
        "Welcome to the Settings Manager. This is the central hub for all detection thresholds and scoring parameters. The left panel lists every setting in the system.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings view using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport .ag-row:first-child",
      title: "Browse the Settings List",
      content:
        "Each row shows a setting's ID, name, value type (decimal, integer, score_steps), default value, and metadata layer (OOB or Custom). Click any row to view its details.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on the first setting in the list to select it.",
      validation: "[data-tour='settings-score-steps']",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Default Value & Score Steps",
      content:
        "The detail panel shows the setting's default value. For score_steps settings, you'll see a visual range bar and editable table showing how metric values map to scores (e.g., 0-60% = score 0, 60-75% = score 3).",
      placement: "bottom",
      action: "wait",
      hint: "Look at the Default Value panel on the right to see how the setting is configured.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(6)",
      title: "Select a Threshold Setting",
      content:
        "Now let's look at a threshold setting. Threshold settings use simple decimal values instead of score steps. They define the cutoff points that trigger alerts.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(6)",
      hint: "Click on a different setting further down the list to see a threshold-type setting.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Resolution Tester",
      content:
        "The Resolution Tester lets you check how a setting resolves for a specific context. Enter an asset class (e.g., 'equity') or product ID and click Resolve to see which value applies and why.",
      placement: "left",
      action: "wait",
      hint: "Scroll down to find the Resolution Tester panel. It shows context fields like Asset Class and Product ID.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Settings Overview Complete",
      content:
        "You've seen the three key components: the settings list, detail view with score steps or default values, and the resolution tester. Next, try modifying a threshold (S2) or creating an override (S3).",
      placement: "right",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S2: Modify a Threshold Setting (Beginner, 5 min)
// --------------------------------------------------------------------------
const S2_MODIFY_THRESHOLD: ScenarioDefinition = {
  id: "s2_modify_threshold",
  name: "Modify a Threshold Setting",
  description:
    "Change a wash trading threshold and understand the impact. Learn the flow from Settings Manager to the Metadata Editor and back.",
  category: "settings",
  difficulty: "beginner",
  estimatedMinutes: 5,
  prerequisites: ["s1_view_settings"],
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Find the Wash Score Threshold",
      content:
        "We'll modify the Wash Trading Score Threshold — the minimum accumulated score needed to generate a wash trading alert. Currently set to 10 by default.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings view.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport",
      title: "Select wash_score_threshold",
      content:
        "Find and click 'Wash Trading Score Threshold' in the list. It has setting_id 'wash_score_threshold' with a decimal default of 10.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(11)",
      hint: "Scroll through the list and click on the 'Wash Trading Score Threshold' row.",
      validation: "[data-tour='settings-score-steps']",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Current Default Value",
      content:
        "The default value is 10 — meaning a product's accumulated wash trading score must reach 10 before an alert fires. Overrides for equity (8) and FX (12) already exist, adjusting sensitivity per asset class.",
      placement: "bottom",
      action: "wait",
      hint: "Review the current default value displayed in the detail panel.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "Open the Metadata Editor",
      content:
        "To edit this setting's raw definition, let's switch to the Metadata Editor. This gives you full control over the JSON structure.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to the Metadata Editor using the sidebar (under Configure).",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "Select Settings Type",
      content:
        "Click the 'Settings' tab to switch the editor to show setting definitions.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='editor-type-selector'] button:nth-child(3)",
      hint: "Click the 'Settings' button in the type selector bar.",
      validation: "[data-tour='editor-json']",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Find wash_score_threshold",
      content:
        "Use the item dropdown to select 'Wash Trading Score Threshold'. The JSON editor will show the full definition including overrides.",
      placement: "right",
      action: "wait",
      hint: "Use the dropdown selector next to the type tabs to find 'Wash Trading Score Threshold'.",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Edit the Default Value",
      content:
        "In the JSON editor, find the \"default\" field and change it from 10 to 9. This lowers the alert threshold globally, making the system more sensitive to wash trading signals.",
      placement: "right",
      action: "type",
      actionTarget: "[data-tour='editor-json'] .monaco-editor textarea",
      actionValue: "9",
      autoFillData: { default: "9" },
      hint: "Locate the '\"default\": 10' line in the JSON and change 10 to 9.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-save']",
      title: "Save the Change",
      content:
        "Check that the JSON validity indicator shows green (Valid JSON), then click Save to persist your change to the backend.",
      placement: "top",
      action: "click",
      actionTarget: "[data-tour='editor-save'] button:last-child",
      hint: "Click the Save button at the bottom of the editor.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Verify the Change",
      content:
        "Navigate back to Settings Manager to confirm the default value now shows 9. Use the Resolution Tester to check that the new default applies when no override matches.",
      placement: "left",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-resolver']",
      hint: "Go back to the Settings view and select wash_score_threshold to verify your change.",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S3: Create a Product Override (Intermediate, 7 min)
// --------------------------------------------------------------------------
const S3_PRODUCT_OVERRIDE: ScenarioDefinition = {
  id: "s3_product_override",
  name: "Create a Product Override",
  description:
    "Create a product-specific threshold override for equity instruments. Learn how match patterns, priorities, and the resolution tester work together.",
  category: "settings",
  difficulty: "intermediate",
  estimatedMinutes: 7,
  prerequisites: ["s1_view_settings"],
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Start with the Settings List",
      content:
        "We'll create a product-specific override for the Wash VWAP Threshold. This setting already has overrides for different asset classes — we'll add one targeting a specific product.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings Manager.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport",
      title: "Select wash_vwap_threshold",
      content:
        "Find and click 'Wash VWAP Threshold'. This setting controls how close to VWAP a trade must be to trigger a wash trading signal. Default: 0.02 (2%).",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(6)",
      hint: "Click on the 'Wash VWAP Threshold' row in the settings list.",
      validation: "[data-tour='settings-score-steps']",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Review Existing Overrides",
      content:
        "Notice the existing overrides: equity = 0.015, equity + XNYS = 0.012, product AAPL = 0.01, fixed_income = 0.01. Each has a priority — higher priority overrides win when multiple match.",
      placement: "bottom",
      action: "wait",
      hint: "Scroll through the detail panel to see the existing overrides and their match patterns.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Switch to Edit Mode",
      content:
        "Click the Edit button on the detail panel to enter edit mode. This opens the full setting form where you can add overrides.",
      placement: "right",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click the 'Edit' button next to the setting name.",
      delay: 2500,
    },
    {
      target: "button:has-text('+ Add Override')",
      title: "Add a New Override",
      content:
        "Scroll down to the Overrides section and click '+ Add Override'. This creates a new blank override row where you can define match criteria and a custom value.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('+ Add Override')",
      hint: "Find the Overrides panel and click the '+ Add Override' button.",
      delay: 2500,
    },
    {
      target: ".space-y-2 > div:last-child",
      title: "Configure the Match Pattern",
      content:
        "In the new override, use the match pattern fields to set asset_class = 'derivative'. This targets all derivative instruments with a custom threshold.",
      placement: "bottom",
      action: "type",
      actionTarget: ".space-y-2 > div:last-child input:first-of-type",
      actionValue: "derivative",
      autoFillData: {
        key: "asset_class",
        value: "derivative",
      },
      hint: "Set the match key to 'asset_class' and the value to 'derivative'.",
      delay: 3000,
    },
    {
      target: ".space-y-2 > div:last-child label:has-text('Value') input",
      title: "Set the Override Value",
      content:
        "Set the override value to 0.025. This gives derivatives a wider VWAP proximity threshold (2.5%) since they naturally have more price variance than equities.",
      placement: "bottom",
      action: "type",
      actionTarget:
        ".space-y-2 > div:last-child label:has-text('Value') input",
      actionValue: "0.025",
      autoFillData: { value: "0.025" },
      hint: "Enter 0.025 in the Value field for this override.",
      delay: 2500,
    },
    {
      target: "button:has-text('Save Changes')",
      title: "Save the Override",
      content:
        "Click 'Save Changes' to persist the new override. The system will save the updated setting with all its overrides to the backend.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Save Changes')",
      hint: "Click the 'Save Changes' button at the bottom of the form.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Test with Resolution Tester",
      content:
        "Now test the resolution. Enter asset_class = 'derivative' in the Resolution Tester and click Resolve. You should see your new override value (0.025) applied instead of the default (0.02).",
      placement: "left",
      action: "wait",
      autoFillData: { asset_class: "derivative" },
      hint: "In the Resolution Tester, type 'derivative' in the Asset Class field and click Resolve.",
      validation: "[data-tour='settings-resolver']",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Override Created Successfully",
      content:
        "The resolution shows 'override' instead of 'default', confirming your new rule is active. The 'Why' field explains which override matched and at what priority. Product overrides always take priority over asset-class level overrides.",
      placement: "left",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S4: Score Steps Configuration (Intermediate, 6 min)
// --------------------------------------------------------------------------
const S4_SCORE_STEPS: ScenarioDefinition = {
  id: "s4_score_steps",
  name: "Score Steps Configuration",
  description:
    "Configure score escalation steps for wash trading scoring. Learn how value ranges map to risk scores using the visual ScoreStepBuilder.",
  category: "settings",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  prerequisites: ["s1_view_settings"],
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Navigate to Score Steps",
      content:
        "Score steps define how raw metric values translate to risk scores. We'll configure the 'Same Side Percentage Score Steps' used by the Market Price Ramping model.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings Manager.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport",
      title: "Select same_side_pct_score_steps",
      content:
        "Find and click 'Same Side Percentage Score Steps'. This setting maps the percentage of same-direction trades to a risk score (0-10).",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(4)",
      hint: "Click on the 'Same Side Percentage Score Steps' row.",
      validation: "[data-tour='settings-score-steps']",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Understanding the Visual Range Bar",
      content:
        "The colored bar visualizes score ranges. Green (low scores) covers 0-60%, yellow (moderate) covers 60-75%, orange (high) 75-90%, and red (critical) 90%+. Each segment shows its assigned score.",
      placement: "bottom",
      action: "wait",
      hint: "Examine the colored range bar — each color represents a different risk level.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "The Score Steps Table",
      content:
        "Below the bar, the table shows exact boundaries: Min Value, Max Value, and Score. A null max_value means 'infinity'. Scores should increase monotonically — the system warns about gaps and overlaps.",
      placement: "bottom",
      action: "wait",
      hint: "Look at the table below the bar. Note how min/max values define contiguous ranges.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Enter Edit Mode",
      content:
        "Click the Edit button to modify the score steps. In edit mode, you can adjust ranges, add new tiers, remove tiers, and reorder them.",
      placement: "right",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click the 'Edit' button to switch to the editable form.",
      delay: 2500,
    },
    {
      target: "button:has-text('+ Add Tier')",
      title: "Add a New Score Tier",
      content:
        "Click '+ Add Tier' to insert a new scoring range. We'll add a tier for the 50-60% range with score 1 — capturing trades that are borderline but worth flagging.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('+ Add Tier')",
      hint: "Click the '+ Add Tier' button below the score steps table.",
      autoFillData: {
        min_value: "0.5",
        max_value: "0.6",
        score: "1",
      },
      delay: 2500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Check for Gaps and Overlaps",
      content:
        "The system automatically validates ranges. If there's a gap between tiers, you'll see a warning icon. Overlapping ranges show a red indicator. Fix any issues before saving.",
      placement: "bottom",
      action: "wait",
      hint: "Check if any warning messages appear below the score steps table. Adjust min/max values to eliminate gaps.",
      delay: 3000,
    },
    {
      target: "button:has-text('Apply Template')",
      title: "Score Templates",
      content:
        "Use the Score Template picker to quickly apply pre-built scoring curves. Templates include 'Conservative' (fewer high scores), 'Aggressive' (more high scores), and 'Linear' (evenly distributed).",
      placement: "bottom",
      action: "wait",
      hint: "Look for the 'Apply Template' button next to '+ Add Tier'. Templates can replace all current steps at once.",
      delay: 3000,
    },
    {
      target: "button:has-text('Save Changes')",
      title: "Save Score Steps",
      content:
        "Click 'Save Changes' to persist the updated score step configuration. The detection engine will use these new ranges the next time the pipeline runs.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Save Changes')",
      hint: "Click 'Save Changes' to apply your score step modifications.",
      delay: 2500,
    },
  ],
};

// --------------------------------------------------------------------------
// S5: Match Pattern Library (Intermediate, 5 min)
// --------------------------------------------------------------------------
const S5_MATCH_PATTERNS: ScenarioDefinition = {
  id: "s5_match_patterns",
  name: "Match Pattern Library",
  description:
    "Browse, create, and apply match patterns for setting overrides. Match patterns define which entities an override targets.",
  category: "settings",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  prerequisites: ["s1_view_settings"],
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Settings with Overrides",
      content:
        "Match patterns define the targeting criteria for overrides — which asset classes, products, or venues an override applies to. Let's explore the pattern library.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings Manager.",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport",
      title: "Select a Setting with Overrides",
      content:
        "Select 'Wash VWAP Threshold' — it has multiple overrides with different match patterns targeting equity, fixed_income, and specific products.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(6)",
      hint: "Click on 'Wash VWAP Threshold' in the settings list.",
      validation: "[data-tour='settings-score-steps']",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Enter Edit Mode",
      content:
        "Click Edit to access the override editor where you can use the Match Pattern Picker.",
      placement: "right",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click the 'Edit' button to open the form editor.",
      delay: 2500,
    },
    {
      target: "button:has-text('Pick Pattern')",
      title: "Open the Match Pattern Picker",
      content:
        "Each override has a 'Pick Pattern...' button that opens the Match Pattern Library. This library stores reusable patterns so you don't have to recreate common match criteria.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Pick Pattern')",
      hint: "Click the 'Pick Pattern...' button on any override row.",
      delay: 2500,
    },
    {
      target: ".z-50.bg-surface-elevated",
      title: "Browse Existing Patterns",
      content:
        "The 'Use Existing Pattern' tab shows saved patterns. Each pattern has a label, description, match criteria badges, and a usage count. OOB patterns ship with the platform; User patterns are custom.",
      placement: "bottom",
      action: "wait",
      hint: "Browse the list of existing patterns. Notice the OOB/User badges and match criteria shown on each pattern.",
      delay: 3500,
    },
    {
      target: ".z-50.bg-surface-elevated",
      title: "Create a New Match Pattern",
      content:
        "Switch to the 'Create New Match' tab. Here you can build a custom pattern by adding key-value criteria. The key dropdown suggests available match dimensions (asset_class, product, exchange_mic, etc.).",
      placement: "bottom",
      action: "click",
      actionTarget:
        ".z-50.bg-surface-elevated button:has-text('Create New Match')",
      hint: "Click the 'Create New Match' tab at the top of the picker popup.",
      delay: 2500,
    },
    {
      target: ".z-50.bg-surface-elevated",
      title: "Build a Match Criteria",
      content:
        "Select 'asset_class' as the key and 'commodity' as the value. The preview area shows the resulting match badge. You can add multiple criteria for multi-dimensional targeting.",
      placement: "bottom",
      action: "wait",
      autoFillData: {
        key: "asset_class",
        value: "commodity",
      },
      hint: "Select 'asset_class' from the key dropdown and type 'commodity' for the value.",
      delay: 3000,
    },
    {
      target: ".z-50.bg-surface-elevated",
      title: "Save as Reusable Pattern",
      content:
        "Check 'Save as reusable pattern' to add this to the library. Give it a label like 'Commodity Instruments' and an optional description. Other overrides can then reuse this pattern.",
      placement: "bottom",
      action: "wait",
      autoFillData: {
        label: "Commodity Instruments",
        description: "Targets all commodity asset class instruments",
      },
      hint: "Check the 'Save as reusable pattern' checkbox, then fill in the label and description fields.",
      delay: 3000,
    },
    {
      target: ".z-50.bg-surface-elevated button:has-text('Apply')",
      title: "Apply the Pattern",
      content:
        "Click 'Apply & Save Pattern' to apply this match criteria to the current override and save it to the library for future use.",
      placement: "bottom",
      action: "click",
      actionTarget:
        ".z-50.bg-surface-elevated button:has-text('Apply')",
      hint: "Click the 'Apply & Save Pattern' button at the bottom of the picker.",
      delay: 2500,
    },
  ],
};

// --------------------------------------------------------------------------
// S6: Multi-Dimension Settings Resolution (Advanced, 8 min)
// --------------------------------------------------------------------------
const S6_RESOLUTION_DEEP_DIVE: ScenarioDefinition = {
  id: "s6_resolution_deep_dive",
  name: "Multi-Dimension Settings Resolution",
  description:
    "Test complex settings resolution with hierarchy, multi-dimension, and product-specific rules. Understand how overrides cascade and which rule wins.",
  category: "settings",
  difficulty: "advanced",
  estimatedMinutes: 8,
  prerequisites: ["s1_view_settings", "s3_product_override"],
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Resolution Deep Dive",
      content:
        "Settings resolution determines which value applies for a given context. The system evaluates: product-specific overrides (highest priority) > multi-dimension matches > hierarchy matches > default value.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings Manager.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport",
      title: "Select wash_vwap_threshold",
      content:
        "Select the Wash VWAP Threshold — it has the richest override set: asset class overrides, combined asset class + venue overrides, and a product-specific override for AAPL.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='settings-list'] .ag-body-viewport .ag-row:nth-child(6)",
      hint: "Click on 'Wash VWAP Threshold'.",
      validation: "[data-tour='settings-score-steps']",
      delay: 2500,
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Override Hierarchy",
      content:
        "Notice the priority levels: asset_class='equity' (P1, value 0.015), asset_class='equity' + exchange_mic='XNYS' (P2, value 0.012), and product='AAPL' (P100, value 0.01). Higher priority always wins.",
      placement: "bottom",
      action: "wait",
      hint: "Review all overrides listed in the detail panel. Pay attention to the priority (P) numbers.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Test 1: No Context (Default)",
      content:
        "First, test with empty context — leave all fields blank and click Resolve. The system returns the default value (0.02) since no overrides match an empty context.",
      placement: "left",
      action: "click",
      actionTarget: "[data-tour='settings-resolver'] button:has-text('Resolve')",
      hint: "Clear all fields in the Resolution Tester and click Resolve. You should see the default value returned.",
      delay: 3000,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Test 2: Asset Class Match",
      content:
        "Now enter asset_class = 'equity' and resolve. The system should return 0.015 (the equity override at priority 1). The 'Why' field explains: matched override with asset_class=equity.",
      placement: "left",
      action: "wait",
      autoFillData: { asset_class: "equity" },
      hint: "Type 'equity' in the Asset Class field and click Resolve.",
      validation: "[data-tour='settings-resolver']",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Test 3: Multi-Dimension Match",
      content:
        "Now add exchange_mic = 'XNYS' alongside asset_class = 'equity'. The P2 override (equity + XNYS = 0.012) wins over the P1 override (equity only = 0.015) because it has higher priority.",
      placement: "left",
      action: "wait",
      autoFillData: {
        asset_class: "equity",
        exchange_mic: "XNYS",
      },
      hint: "Keep 'equity' in Asset Class and type 'XNYS' in Exchange MIC, then Resolve.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Test 4: Product-Specific Override",
      content:
        "Enter product_id = 'AAPL' with asset_class = 'equity'. The product override (P100, value 0.01) trumps everything — product-specific rules always take the highest priority.",
      placement: "left",
      action: "wait",
      autoFillData: {
        asset_class: "equity",
        product_id: "AAPL",
      },
      hint: "Type 'AAPL' in the Product ID field while keeping 'equity' in Asset Class, then Resolve.",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Test 5: Non-Matching Context",
      content:
        "Try asset_class = 'cryptocurrency' — there's no override for this asset class, so the system falls back to the default value (0.02). The 'Why' field explains: no matching override found.",
      placement: "left",
      action: "wait",
      autoFillData: { asset_class: "cryptocurrency" },
      hint: "Clear the fields, type 'cryptocurrency' in Asset Class, and Resolve to see the default fallback.",
      delay: 3000,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Resolution Order Summary",
      content:
        "The resolution order is: (1) Product-specific overrides (highest priority, P100), (2) Multi-dimension matches (P2+), (3) Single-dimension hierarchy matches (P1), (4) Default value (fallback). This ensures granular control while maintaining sane defaults.",
      placement: "right",
      action: "wait",
      delay: 3500,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Resolution Deep Dive Complete",
      content:
        "You now understand the full resolution cascade. Product-specific rules always win, followed by multi-dimension, then single-dimension, and finally the default. Use the Resolution Tester to validate any override configuration before deploying.",
      placement: "right",
      action: "wait",
      delay: 3000,
    },
  ],
};

// ==========================================================================
// Scenario Definitions — Calculations (S7-S10)
// ==========================================================================

// --------------------------------------------------------------------------
// S7: Explore Calculation DAG (Beginner, 4 min)
// --------------------------------------------------------------------------
const S7_EXPLORE_CALC_DAG: ScenarioDefinition = {
  id: "s7_explore_calc_dag",
  name: "Explore Calculation DAG",
  description:
    "Walk through the Metadata Explorer to understand calculation layers, dependencies, and the DAG visualization. Learn how transaction, time window, aggregation, and derived layers chain together.",
  category: "calculations",
  difficulty: "beginner",
  estimatedMinutes: 4,
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Navigate to Metadata Explorer",
      content:
        "The Metadata Explorer is the central hub for browsing all calculation definitions. It shows the full list, a dependency DAG, and detailed views of each calculation.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Click 'Metadata Explorer' in the sidebar under the Analyze section.",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row:first-child",
      title: "The Calculations List",
      content:
        "The left panel lists every calculation in the system. Each row shows the calc ID, name, layer (transaction, time_window, aggregation, derived), dependency count, and whether it's OOB (out-of-box) or user-created.",
      placement: "right",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:first-child",
      hint: "Click on the first calculation in the list to select it.",
      delay: 3000,
    },
    {
      target: ".text-base.font-semibold",
      title: "Calculation Detail",
      content:
        "The detail panel shows the selected calculation's name, description, layer badge, and calc_id. Transaction layer calcs like 'Value Calculation' have no dependencies — they operate directly on raw entity data (executions, products).",
      placement: "left",
      action: "wait",
      hint: "Read the detail panel on the right. Notice the layer badge and description.",
      delay: 3500,
    },
    {
      target: ".ag-body-viewport .ag-row:nth-child(8)",
      title: "Select a Derived Calculation",
      content:
        "Now let's look at a derived-layer calculation. 'Wash Detection' sits at the top of the dependency chain — it depends on aggregation-layer calcs which in turn depend on time windows and transactions.",
      placement: "right",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:nth-child(8)",
      hint: "Scroll down and click on 'Wash Detection' (or any derived-layer calc with dependencies).",
      delay: 2500,
    },
    {
      target: ".text-base.font-semibold",
      title: "Dependencies Panel",
      content:
        "The Dependencies section lists the calc IDs this calculation depends on. Wash Detection depends on 'large_trading_activity' and 'vwap_calc' — both aggregation-layer calcs. The pipeline must execute those first.",
      placement: "left",
      action: "wait",
      hint: "Look at the Dependencies section below the description. Each badge links to an upstream calculation.",
      delay: 3500,
    },
    {
      target: "[data-tour='pipeline-dag'] .react-flow__renderer, .react-flow__renderer",
      title: "The Calculation DAG",
      content:
        "The center panel shows the full dependency DAG (Directed Acyclic Graph). Nodes are color-coded by layer: indigo = transaction, amber = time_window, green = aggregation, red = derived. Arrows show data flow from upstream to downstream.",
      placement: "left",
      action: "wait",
      hint: "Look at the center DAG panel. Notice how arrows flow from bottom (transaction) to top (derived).",
      delay: 4000,
    },
    {
      target: "button:has-text('Transaction')",
      title: "Layer Filters",
      content:
        "Use the layer filter buttons at the top to isolate calculations by layer. The 4-layer architecture enforces a clean execution order: transaction → time_window → aggregation → derived. Each layer can only depend on calculations from the same or earlier layers.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Derived')",
      hint: "Click the 'Derived' filter button to show only derived-layer calculations.",
      delay: 3000,
    },
    {
      target: "button:has-text('All')",
      title: "DAG Exploration Complete",
      content:
        "You now understand the calculation layer hierarchy and dependency graph. The DAG ensures calculations execute in the correct order: transactions first, then time windows, aggregations, and finally derived scores. Next, try creating a calculation (S8) or exploring AI-assisted creation (S9).",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('All')",
      hint: "Click 'All' to reset the filter and see all calculations again.",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S8: Create a Manual Calculation (Intermediate, 8 min)
// --------------------------------------------------------------------------
const S8_CREATE_MANUAL_CALC: ScenarioDefinition = {
  id: "s8_create_manual_calc",
  name: "Create a Manual Calculation",
  description:
    "Create a new derived-layer calculation using the Metadata Editor. Write SQL logic with $param references, define inputs and outputs, then verify the result in the Metadata Explorer.",
  category: "calculations",
  difficulty: "intermediate",
  estimatedMinutes: 8,
  prerequisites: ["s7_explore_calc_dag"],
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Open the Metadata Editor",
      content:
        "We'll create a new calculation using the Metadata Editor. This gives you full control over the calculation definition including SQL logic, parameters, inputs, and outputs.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to the Metadata Editor using the sidebar (under Configure).",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "Select Calculations Type",
      content:
        "Click the 'Calculations' tab to switch the editor to show calculation definitions. You can browse existing calculations or create new ones.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='editor-type-selector'] button:nth-child(2)",
      hint: "Click the 'Calculations' button in the type selector bar.",
      validation: "[data-tour='editor-json']",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Browse Existing Calculations",
      content:
        "The JSON editor shows the definition of the currently selected calculation. Use the item dropdown to browse existing ones like 'value_calc' or 'wash_detection'. Notice the structure: calc_id, name, layer, inputs, output, logic, parameters, depends_on.",
      placement: "right",
      action: "wait",
      hint: "Use the dropdown selector to browse different calculation definitions. Study the JSON structure.",
      delay: 3500,
    },
    {
      target: "[data-tour='sidebar']",
      title: "Switch to Metadata Explorer Form",
      content:
        "For a guided creation experience, let's use the Metadata Explorer's built-in form. Navigate to the Metadata Explorer where you can click '+ New Calculation'.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Navigate to the Metadata Explorer using the sidebar.",
      delay: 2500,
    },
    {
      target: "button:has-text('+ New Calculation')",
      title: "Create New Calculation",
      content:
        "Click '+ New Calculation' to open the creation form. This provides a structured form with fields for every part of the calculation definition.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('+ New Calculation')",
      hint: "Click the '+ New Calculation' button at the top of the Calculations panel.",
      delay: 2500,
    },
    {
      target: ".space-y-3 label:first-child input",
      title: "Fill in Calc ID and Name",
      content:
        "Enter a calc_id like 'cancellation_ratio' and a descriptive name like 'Order Cancellation Ratio'. The calc_id must be unique and use snake_case — it's used as the internal identifier throughout the system.",
      placement: "left",
      action: "type",
      actionTarget: ".space-y-3 label:first-child input",
      actionValue: "cancellation_ratio",
      autoFillData: {
        calc_id: "cancellation_ratio",
        name: "Order Cancellation Ratio",
      },
      hint: "Type 'cancellation_ratio' in the Calc ID field and 'Order Cancellation Ratio' in the Name field.",
      delay: 3000,
    },
    {
      target: ".space-y-3 select",
      title: "Set the Layer",
      content:
        "Select 'derived' as the layer. Derived calculations sit at the top of the dependency chain and typically combine outputs from aggregation-layer calculations. They produce the final scores used by detection models.",
      placement: "left",
      action: "select",
      actionTarget: ".space-y-3 select",
      actionValue: "derived",
      hint: "Select 'derived' from the Layer dropdown.",
      delay: 2500,
    },
    {
      target: ".space-y-3 textarea:first-of-type",
      title: "Write SQL Logic",
      content:
        "Enter the SQL logic. Use $param_name syntax for configurable parameters — these will be resolved from settings at runtime. Example: 'SELECT account_id, COUNT(CASE WHEN status = \\'cancelled\\' THEN 1 END)::FLOAT / COUNT(*) AS cancel_ratio FROM calc_business_date_window WHERE business_date >= $lookback_start GROUP BY account_id'.",
      placement: "left",
      action: "wait",
      autoFillData: {
        description: "Calculates the ratio of cancelled orders to total orders per account over a configurable lookback period.",
        logic: "SELECT account_id, COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::FLOAT / COUNT(*) AS cancel_ratio FROM calc_business_date_window WHERE business_date >= $lookback_start GROUP BY account_id",
      },
      hint: "Enter a description and SQL query in the respective fields. Use $param_name for configurable values.",
      delay: 4000,
    },
    {
      target: ".space-y-3 label:has-text('Dependencies') input",
      title: "Add Dependencies",
      content:
        "List the calc IDs this calculation depends on, separated by commas. Since our SQL references calc_business_date_window, add 'business_date_window'. The pipeline will ensure dependencies execute first.",
      placement: "left",
      action: "type",
      actionTarget: ".space-y-3 label:has-text('Dependencies') input",
      actionValue: "business_date_window",
      autoFillData: {
        depends_on: "business_date_window",
        value_field: "cancel_ratio",
        storage: "calc_cancellation_ratio",
      },
      hint: "Type 'business_date_window' in the Dependencies field. Fill in 'cancel_ratio' for Value Field and 'calc_cancellation_ratio' for Storage Table.",
      delay: 3000,
    },
    {
      target: "button:has-text('Create Calculation')",
      title: "Save the Calculation",
      content:
        "Click 'Create Calculation' to persist the new definition. The system validates required fields (calc_id, name) and saves the JSON to the backend. It will appear in the calculation list and DAG immediately.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Create Calculation')",
      hint: "Click the 'Create Calculation' button at the bottom of the form.",
      delay: 2500,
    },
  ],
};

// --------------------------------------------------------------------------
// S9: AI-Assisted Calculation (Intermediate, 6 min)
// --------------------------------------------------------------------------
const S9_AI_CALC_BUILDER: ScenarioDefinition = {
  id: "s9_ai_calc_builder",
  name: "AI-Assisted Calculation",
  description:
    "Use the AI Assistant to generate a calculation from natural language. Describe what you want to compute, review the AI-generated definition with confidence scoring, refine if needed, and save.",
  category: "calculations",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  prerequisites: ["s7_explore_calc_dag"],
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Navigate to AI Assistant",
      content:
        "The AI Assistant can help generate calculation definitions from natural language descriptions. It understands the platform's calculation structure, layers, and parameter syntax.",
      placement: "right",
      route: "/assistant",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Click 'AI Assistant' in the sidebar to open the AI query interface.",
      delay: 2500,
    },
    {
      target: "[data-tour='assistant-scenarios']",
      title: "AI Assistant Modes",
      content:
        "The AI Assistant runs in mock mode for this demo — pre-scripted conversations demonstrate the capabilities. In a live deployment, it connects to Claude API for real-time generation. Mock scenarios show calculation generation, data exploration, and more.",
      placement: "bottom",
      action: "wait",
      hint: "Look at the scenario picker at the top. It shows pre-built conversations you can load.",
      delay: 3500,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Describe Your Calculation",
      content:
        "In a live session, you would type a natural language description like: 'Calculate the ratio of cancelled orders to total orders per account over the last 5 business days'. The AI parses this into a structured calculation definition.",
      placement: "right",
      action: "wait",
      hint: "Look at the chat panel. In live mode, you would type your calculation description here.",
      delay: 3500,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "AI Generation Process",
      content:
        "The AI Calc Builder (behind the scenes) follows a structured process: (1) Parse the NL description into intent, (2) Determine the correct layer (transaction/time_window/aggregation/derived), (3) Generate SQL logic with $param references, (4) Define inputs, outputs, and dependencies, (5) Assign a confidence score.",
      placement: "right",
      action: "wait",
      hint: "The AI generation pipeline is multi-step: NL parsing, layer selection, SQL generation, and confidence scoring.",
      delay: 4000,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Review the Generated Definition",
      content:
        "The AI returns a complete calculation JSON with: calc_id (auto-generated from description), name, layer, SQL logic, parameters with $param syntax, inputs referencing upstream calcs, output table definition, depends_on array, and a confidence score (high/medium/low).",
      placement: "right",
      action: "wait",
      hint: "In a live session, the AI would display the generated JSON here for review. Check the confidence badge and suggestions list.",
      delay: 3500,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Refine and Iterate",
      content:
        "If the AI's suggestion needs adjustment, you can refine it: ask for different parameter names, change the layer, modify the SQL logic, or add more dependencies. The AI learns from your refinements to produce better results.",
      placement: "right",
      action: "wait",
      hint: "You can ask follow-up questions to refine the generated calculation. Example: 'Change the lookback to 10 days instead of 5'.",
      delay: 3000,
    },
    {
      target: "[data-tour='sidebar']",
      title: "Verify in Metadata Explorer",
      content:
        "After accepting an AI-generated calculation, navigate to the Metadata Explorer to verify it appears in the list and DAG. The calculation integrates seamlessly with manually created ones.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Navigate to the Metadata Explorer to verify the new calculation appears in the list.",
      delay: 2500,
    },
    {
      target: ".react-flow__renderer",
      title: "AI Calc Builder Complete",
      content:
        "AI-generated calculations appear in the DAG alongside manual ones. The system treats them identically — same layer ordering, same dependency resolution, same parameter binding. The AI simply accelerates the authoring process from minutes to seconds.",
      placement: "left",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S10: Parameterize a Calculation (Advanced, 7 min)
// --------------------------------------------------------------------------
const S10_PARAMETERIZE_CALC: ScenarioDefinition = {
  id: "s10_parameterize_calc",
  name: "Parameterize a Calculation",
  description:
    "Understand how calculations use $param settings references for dynamic behavior. Trace a parameter from its SQL usage through to the settings engine and see how changing a setting value affects calculation output.",
  category: "calculations",
  difficulty: "advanced",
  estimatedMinutes: 7,
  prerequisites: ["s7_explore_calc_dag"],
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Parameters Deep Dive",
      content:
        "Calculations use $param_name syntax in their SQL logic to reference configurable values from the settings engine. This lets you tune behavior (thresholds, time windows, cutoffs) without editing SQL. Let's trace this end-to-end.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Navigate to the Metadata Explorer.",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row:nth-child(3)",
      title: "Select business_date_window",
      content:
        "Click on 'Business Date Window' — a time_window layer calculation that uses a $cutoff_time parameter. This parameter determines what time of day marks the boundary between business dates.",
      placement: "right",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:nth-child(3)",
      hint: "Find and click 'Business Date Window' in the calculations list.",
      delay: 2500,
    },
    {
      target: ".text-base.font-semibold",
      title: "Examine the Calculation Detail",
      content:
        "The Business Date Window calc determines the business date for each execution. Its SQL contains '$cutoff_time' — a parameter that resolves to a time like '17:00:00'. Executions after the cutoff roll to the next business date.",
      placement: "left",
      action: "wait",
      hint: "Read the description. It mentions 'configurable cutoff time' — that's the $cutoff_time parameter.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "View the Raw JSON",
      content:
        "Let's switch to the Metadata Editor to see the full JSON definition, including the parameters block that maps $param names to their settings sources.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to the Metadata Editor.",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "Select Calculations Type",
      content:
        "Switch to the Calculations type and find 'business_date_window'. Look for the 'parameters' block in the JSON — it maps $cutoff_time to setting_id 'business_date_cutoff' with a default of '17:00:00'.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='editor-type-selector'] button:nth-child(2)",
      hint: "Click 'Calculations' in the type selector, then select 'business_date_window' from the dropdown.",
      validation: "[data-tour='editor-json']",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-json']",
      title: "The Parameters Block",
      content:
        "In the JSON, find: \"parameters\": { \"cutoff_time\": { \"source\": \"setting\", \"setting_id\": \"business_date_cutoff\", \"default\": \"17:00:00\" } }. This tells the pipeline: resolve $cutoff_time from the 'business_date_cutoff' setting, falling back to 17:00 if not found.",
      placement: "right",
      action: "wait",
      hint: "Scroll through the JSON to find the 'parameters' object. Note how 'source' is 'setting' and 'setting_id' links to the settings engine.",
      delay: 4000,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Find the Referenced Setting",
      content:
        "Now let's trace to the other end — the Settings Manager. Navigate here and look for 'business_date_cutoff'. This is where the actual parameter value is configured, with possible overrides per asset class or exchange.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings Manager and look for the 'business_date_cutoff' setting.",
      delay: 3000,
    },
    {
      target: "[data-tour='settings-list'] .ag-body-viewport",
      title: "Settings Drive Calculations",
      content:
        "The settings engine resolves the value based on context (asset class, product, venue). If equity instruments have a cutoff of '16:00:00' while FX uses '17:00:00', the same SQL logic produces different business dates. No code changes needed — just settings.",
      placement: "right",
      action: "wait",
      hint: "Browse the settings list. The business_date_cutoff setting may have overrides for different asset classes.",
      delay: 3500,
    },
    {
      target: "[data-tour='pipeline-run']",
      title: "Pipeline Parameter Resolution",
      content:
        "When the pipeline runs, it: (1) reads each calculation's parameters block, (2) queries the settings engine for the resolved value per context, (3) substitutes $param placeholders in the SQL, (4) executes the query. This decouples logic from configuration.",
      placement: "bottom",
      route: "/pipeline",
      action: "navigate",
      actionTarget: "[data-tour='pipeline-run']",
      hint: "Navigate to the Pipeline Monitor to see how parameters are resolved during execution.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Parameterization Complete",
      content:
        "You now understand the full parameter lifecycle: SQL $param syntax → parameters block (maps to setting_id) → settings engine (resolves with overrides) → pipeline substitution → query execution. This architecture lets business users tune detection sensitivity without touching SQL.",
      placement: "bottom",
      action: "wait",
      delay: 3000,
    },
  ],
};

// ==========================================================================
// Scenario Definitions — Detection Models (S11-S14)
// ==========================================================================

// --------------------------------------------------------------------------
// S11: Full Model Creation Wizard (Intermediate, 10 min)
// --------------------------------------------------------------------------
const S11_FULL_MODEL_WIZARD: ScenarioDefinition = {
  id: "s11_full_model_wizard",
  name: "Full Model Creation Wizard",
  description:
    "Walk through creating a complete detection model using all 7 wizard steps — from defining the model to deploying it. Covers name, calculations, scoring, SQL query generation, review, dry-run testing, and save.",
  category: "detection_models",
  difficulty: "intermediate",
  estimatedMinutes: 10,
  steps: [
    {
      target: "[data-tour='model-list']",
      title: "Model Composer Overview",
      content:
        "Welcome to the Model Composer — the central hub for building and deploying detection models. The left panel lists existing models (Wash Trading, MPR, Insider Dealing, Spoofing). We'll create a brand-new model from scratch.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to the Model Composer using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='model-list'] button:first-child",
      title: "Start Creating a New Model",
      content:
        "Click '+ New Model' to open the 7-step creation wizard. This structured flow ensures every detection model has a complete definition before deployment.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='model-list'] button:first-child",
      hint: "Click the '+ New Model' button at the top of the model list.",
      delay: 2500,
    },
    {
      target: ".space-y-3 label:first-child input",
      title: "Step 1: Define — Name & Description",
      content:
        "Enter a model name like 'Order Cancellation Surge' and a description. The model_id is auto-generated from the name in snake_case. Choose a time window (e.g., business_date_window) and check the granularity dimensions (product_id, account_id).",
      placement: "left",
      action: "type",
      actionTarget: ".space-y-3 label:first-child input",
      actionValue: "Order Cancellation Surge",
      autoFillData: {
        name: "Order Cancellation Surge",
        description: "Detects accounts with abnormally high order cancellation ratios over a configurable lookback period.",
      },
      hint: "Fill in the Name field with 'Order Cancellation Surge'. Add a description, select a time window, and check the granularity boxes.",
      delay: 3500,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Calculations",
      content:
        "Click 'Next' to proceed to Step 2: Calculations. The wizard validates that the name is filled before allowing you to continue.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click the 'Next' button at the bottom to proceed to the Calculations step.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Step 2: Select Calculations",
      content:
        "Calculations are grouped by layer (transaction, time_window, aggregation, derived). Click to select 3-4 calcs that feed into your model. Toggle each calc's strictness between MUST_PASS (required for alert) and OPTIONAL (contributes to score but doesn't block).",
      placement: "left",
      action: "wait",
      hint: "Click on 3-4 calculations from different layers. Toggle the strictness for each one using the MUST_PASS/OPTIONAL button.",
      delay: 4000,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Scoring",
      content:
        "With calculations selected, click 'Next' to configure scoring thresholds. Each selected calculation needs a threshold or score-steps mapping.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to proceed to the Scoring configuration step.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Step 3: Configure Scoring",
      content:
        "Set the overall score threshold setting (e.g., 'wash_score_threshold'). For each calculation, configure its threshold_setting and score_steps_setting. The ScoreStepBuilder preview on the right shows how values will map to risk scores.",
      placement: "left",
      action: "wait",
      autoFillData: {
        score_threshold_setting: "wash_score_threshold",
      },
      hint: "Enter a score threshold setting name. Configure threshold and score step settings for each selected calculation.",
      delay: 3500,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Query",
      content:
        "Click 'Next' to move to the Query step where you can write or auto-generate the detection SQL.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to proceed to the Query step.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Step 4: Generate SQL Query",
      content:
        "The Monaco SQL editor lets you write custom detection logic, or click 'Generate from selections' to auto-build a query from your selected calculations. The generated SQL joins calculation outputs, applies thresholds, and produces a final score.",
      placement: "left",
      action: "wait",
      hint: "Click 'Generate from selections' to auto-build the SQL query, or write custom SQL in the Monaco editor.",
      delay: 3500,
    },
    {
      target: "button:has-text('Next')",
      title: "Review & Test",
      content:
        "Click 'Next' twice to pass through the Review step (read-only summary of all settings) and reach the Test Run step.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to proceed through Review to the Test Run step.",
      delay: 2500,
    },
  ],
};

// --------------------------------------------------------------------------
// S12: Clone and Modify Existing Model (Beginner, 6 min)
// --------------------------------------------------------------------------
const S12_CLONE_MODIFY_MODEL: ScenarioDefinition = {
  id: "s12_clone_modify_model",
  name: "Clone and Modify Existing Model",
  description:
    "Select an existing detection model, explore its composition, then edit it to understand how models are structured. Learn the relationship between calculations, scoring, and strictness.",
  category: "detection_models",
  difficulty: "beginner",
  estimatedMinutes: 6,
  prerequisites: ["s11_full_model_wizard"],
  steps: [
    {
      target: "[data-tour='model-list']",
      title: "Browse Existing Models",
      content:
        "The model list shows all 5 detection models. Each entry displays the model name, an OOB/Custom badge, and a calculation count. We'll explore and modify the 'Wash Trading (Full Day)' model.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to the Model Composer.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list'] button:nth-child(2)",
      title: "Select Wash Trading (Full Day)",
      content:
        "Click on 'Wash Trading (Full Day)' — the platform's primary wash trading detection model. It uses multiple aggregation and derived calculations with MUST_PASS and OPTIONAL strictness levels.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='model-list'] button:nth-child(2)",
      hint: "Click on 'Wash Trading (Full Day)' in the model list.",
      validation: "[data-tour='model-detail']",
      delay: 2500,
    },
    {
      target: "[data-tour='model-detail']",
      title: "Review the Model Configuration",
      content:
        "The detail panel shows the model's name, description, and its Calculations & Scoring section. Each calculation row shows the calc name, its layer, and its strictness badge (MUST_PASS in red, OPTIONAL in yellow). This composition determines what triggers alerts.",
      placement: "left",
      action: "wait",
      hint: "Read through the model's configuration. Note which calculations are MUST_PASS vs OPTIONAL.",
      delay: 3500,
    },
    {
      target: "button:has-text('Edit')",
      title: "Enter Edit Mode",
      content:
        "Click 'Edit' to open the model in the 7-step wizard pre-filled with its current configuration. This lets you modify any aspect of the model — name, calculations, scoring, or query.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click the 'Edit' button to open the model in the wizard editor.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Review the Define Step",
      content:
        "Step 1 shows the existing model's name, description, time window, and granularity settings — all pre-filled. You can modify any field. Notice the time_window is set to 'business_date_window' and granularity includes product_id and account_id.",
      placement: "left",
      action: "wait",
      hint: "Review the pre-filled fields. Try changing the description to see how the form works.",
      delay: 3500,
    },
    {
      target: "button:has-text('Next')",
      title: "Go to Calculations Step",
      content:
        "Click 'Next' to navigate to the Calculations step where you can add or remove calculations from the model.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to proceed to the Calculations step.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Modify the Calculation Selection",
      content:
        "The currently selected calculations are highlighted. Try clicking a new calculation to add it, or click an existing one to deselect it. Toggle the strictness between MUST_PASS and OPTIONAL to adjust how each calculation affects alert generation.",
      placement: "left",
      action: "wait",
      hint: "Add or remove a calculation from the selection. Toggle strictness on one of the selected calcs.",
      delay: 4000,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Scoring",
      content:
        "Proceed to the Scoring step to see how thresholds are configured for each selected calculation. Adjusting these values changes the model's sensitivity.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to see the scoring configuration.",
      delay: 2500,
    },
    {
      target: "button:has-text('Cancel')",
      title: "Editing Complete",
      content:
        "You've seen how to edit an existing model's definition, calculations, and scoring. Click 'Cancel' to discard changes, or continue through the wizard and click 'Save Changes' at Step 7 to persist modifications.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Cancel')",
      hint: "Click 'Cancel' to exit without saving, or continue through the wizard to save.",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S13: Add Calculation to Model (Intermediate, 5 min)
// --------------------------------------------------------------------------
const S13_ADD_CALC_TO_MODEL: ScenarioDefinition = {
  id: "s13_add_calc_to_model",
  name: "Add Calculation to Model",
  description:
    "Add a new calculation to an existing detection model and understand its impact. Use the Validation, Preview, and Dependency panels to verify the change, then run a dry test.",
  category: "detection_models",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  prerequisites: ["s11_full_model_wizard"],
  steps: [
    {
      target: "[data-tour='model-list']",
      title: "Select a Model to Extend",
      content:
        "We'll add a new calculation to an existing model to see how it changes the detection logic. Start by selecting a model from the list.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to the Model Composer.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list'] button:nth-child(4)",
      title: "Select Market Price Ramping",
      content:
        "Click on 'Market Price Ramping' — a model that detects systematic price manipulation patterns. It currently uses aggregation-layer calculations for same-side trading and price impact.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='model-list'] button:nth-child(4)",
      hint: "Click on 'Market Price Ramping' in the model list.",
      validation: "[data-tour='model-detail']",
      delay: 2500,
    },
    {
      target: "button:has-text('Edit')",
      title: "Enter Edit Mode",
      content:
        "Click 'Edit' to open the wizard in edit mode. The right panel will switch to show three tabs: Validate, Preview, and Deps — these help you assess changes in real time.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click the 'Edit' button next to the model name.",
      delay: 2500,
    },
    {
      target: "button:has-text('Next')",
      title: "Navigate to Calculations",
      content:
        "Click 'Next' to skip past the Define step and go directly to the Calculations selection where we'll add a new calc.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to move to Step 2: Calculations.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Select an Additional Calculation",
      content:
        "Find a calculation that isn't currently selected — for example, 'Large Trading Activity' from the aggregation layer. Click it to add it to the model. Set its strictness to OPTIONAL so it contributes to the overall score without being a hard requirement.",
      placement: "left",
      action: "wait",
      hint: "Click on an unselected calculation to add it. Toggle its strictness to OPTIONAL.",
      delay: 3500,
    },
    {
      target: "button:has-text('Validate')",
      title: "Check the Validation Panel",
      content:
        "Switch to the Validate tab on the right panel. The ValidationPanel shows real-time completeness checks: whether the model has a name, enough calculations, scoring configured, and a query. Green checks mean ready; yellow warnings need attention.",
      placement: "left",
      action: "click",
      actionTarget: "button:has-text('Validate')",
      hint: "Click the 'Validate' tab in the right panel to see completeness checks.",
      delay: 3000,
    },
    {
      target: "button:has-text('Deps')",
      title: "Review the Dependency DAG",
      content:
        "Switch to the Deps tab to see the DependencyMiniDAG. This React Flow graph shows how your selected calculations depend on each other. Adding a new calc may introduce new upstream dependencies that the pipeline must resolve.",
      placement: "left",
      action: "click",
      actionTarget: "button:has-text('Deps')",
      hint: "Click the 'Deps' tab to view the dependency graph for selected calculations.",
      delay: 3500,
    },
    {
      target: "button:has-text('Next')",
      title: "Configure and Test",
      content:
        "Proceed through Scoring (Step 3) to configure the new calculation's threshold, then continue to the Test Run step (Step 6). Click 'Run Test' to execute a dry run and see how the added calculation affects alert generation in the AG Grid preview.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Continue through the wizard steps. At Step 6 (Test Run), click 'Run Test' to see the impact.",
      delay: 3000,
    },
    {
      target: "button:has-text('Cancel')",
      title: "Impact Assessment Complete",
      content:
        "You've seen how adding a calculation affects the model's validation status, dependency graph, and test results. The right-panel tabs (Validate, Preview, Deps) give real-time feedback as you build. Save or cancel to finish.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Cancel')",
      hint: "Click 'Cancel' to exit, or continue to Step 7 to save your changes.",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S14: Model Best Practices Review (Advanced, 7 min)
// --------------------------------------------------------------------------
const S14_MODEL_BEST_PRACTICES: ScenarioDefinition = {
  id: "s14_model_best_practices",
  name: "Model Best Practices Review",
  description:
    "Review model composition best practices using the Examples drawer, Validation panel, Preview panel, and Dependency DAG. Learn how to build well-structured detection models with balanced scoring and clean dependencies.",
  category: "detection_models",
  difficulty: "advanced",
  estimatedMinutes: 7,
  prerequisites: ["s11_full_model_wizard"],
  steps: [
    {
      target: "[data-tour='model-list']",
      title: "Model Composition Best Practices",
      content:
        "Well-built detection models follow key principles: balanced calculation selection across layers, appropriate strictness assignments, clean dependency graphs, and meaningful score distributions. Let's explore the tools that help achieve this.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to the Model Composer.",
      delay: 3000,
    },
    {
      target: "button:has-text('Examples')",
      title: "Open the Examples Drawer",
      content:
        "Click 'Examples' to open the slide-out drawer. It contains annotated examples of models, settings, and calculations — each with explanations of why they're structured that way. These serve as reference patterns for building new models.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Examples')",
      hint: "Click the 'Examples' button in the top-right header area.",
      delay: 2500,
    },
    {
      target: ".fixed.inset-0",
      title: "Browse Model Examples",
      content:
        "The Examples drawer shows pre-built model configurations with annotations. Each example includes: the model definition, why certain calculations were chosen, how strictness levels were assigned, and scoring rationale. Use these as templates for new models.",
      placement: "left",
      action: "wait",
      hint: "Browse through the model examples. Read the annotations to understand the design rationale.",
      delay: 4000,
    },
    {
      target: "button:has-text('Close Examples')",
      title: "Close Examples and Start Creating",
      content:
        "Close the drawer and start creating a new model to apply what you've learned from the examples.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Close Examples')",
      hint: "Click 'Close Examples' to close the drawer.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list'] button:first-child",
      title: "Create a New Model",
      content:
        "Click '+ New Model' to open the wizard. We'll use the right-panel tools to validate our model as we build it.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='model-list'] button:first-child",
      autoFillData: {
        name: "Cross-Venue Surveillance",
        description: "Detects suspicious trading patterns across multiple venues for the same instrument.",
      },
      hint: "Click '+ New Model' and fill in a model name like 'Cross-Venue Surveillance'.",
      delay: 2500,
    },
    {
      target: "button:has-text('Validate')",
      title: "Use the Validation Panel",
      content:
        "The Validate tab on the right shows real-time completeness checks. As you fill in each wizard step, validations turn green. Best practice: all checks should be green before deploying. Missing fields (no description, no query) trigger yellow warnings.",
      placement: "left",
      action: "click",
      actionTarget: "button:has-text('Validate')",
      hint: "Click the 'Validate' tab in the right panel. Watch how validations update as you fill in the form.",
      delay: 3500,
    },
    {
      target: "button:has-text('Preview')",
      title: "Check Score Distribution",
      content:
        "Switch to the Preview tab to see a Recharts simulation of how scores would distribute across your selected calculations. Best practice: avoid models where all score weight concentrates in one calculation — aim for balanced contributions across multiple calcs.",
      placement: "left",
      action: "click",
      actionTarget: "button:has-text('Preview')",
      hint: "Click the 'Preview' tab to see the score distribution simulation.",
      delay: 3500,
    },
    {
      target: "button:has-text('Deps')",
      title: "Inspect the Dependency Graph",
      content:
        "Switch to the Deps tab to see the DependencyMiniDAG. Best practice: avoid circular patterns and excessive depth. A well-designed model selects calculations from 2-3 layers with clear upstream-to-downstream flow. Overlapping dependencies (two calcs sharing the same upstream) indicate potential redundancy.",
      placement: "left",
      action: "click",
      actionTarget: "button:has-text('Deps')",
      hint: "Click the 'Deps' tab to inspect the dependency graph. Look for clean layer separation.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Query Auto-Generation",
      content:
        "At Step 4 (Query), the 'Generate from selections' button auto-builds SQL that joins all selected calculation outputs. Best practice: review the generated SQL to understand the join logic, then customize thresholds and filters for your specific use case.",
      placement: "left",
      action: "wait",
      hint: "When you reach Step 4, use 'Generate from selections' to auto-build the query, then review the generated SQL.",
      delay: 3500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Best Practices Summary",
      content:
        "Key takeaways: (1) Use Examples as templates, (2) Keep Validation green before deploy, (3) Balance score distribution via Preview, (4) Ensure clean dependencies via the DAG, (5) Review auto-generated queries. These tools make it easy to build robust, well-structured detection models.",
      placement: "right",
      action: "wait",
      delay: 3500,
    },
  ],
};

// ==========================================================================
// Scenario Definitions — Use Cases & Submissions (S15-S18)
// ==========================================================================

// --------------------------------------------------------------------------
// S15: Create a Use Case (Beginner, 6 min)
// --------------------------------------------------------------------------
const S15_CREATE_USE_CASE: ScenarioDefinition = {
  id: "s15_create_use_case",
  name: "Create a Use Case",
  description:
    "Walk through creating a new detection use case with the 5-step wizard — define the name, select components, enter sample data, set expected results, and save as draft.",
  category: "use_cases",
  difficulty: "beginner",
  estimatedMinutes: 6,
  steps: [
    {
      target: ".w-72",
      title: "Use Case Studio",
      content:
        "Welcome to the Use Case Studio. This is where you define, test, and manage detection use cases. The left panel lists all existing use cases with their status badges (draft, ready, submitted, approved, rejected). The center area shows details or the creation wizard.",
      placement: "right",
      route: "/use-cases",
      action: "navigate",
      actionTarget: ".w-72",
      hint: "Navigate to the Use Case Studio using the sidebar.",
      delay: 3000,
    },
    {
      target: ".w-72 .space-y-1 button:first-child",
      title: "Start Creating a New Use Case",
      content:
        "Click '+ New Use Case' to open the 5-step creation wizard. This structured flow ensures every use case has a complete definition with components, sample data, and expected results before it can be submitted for review.",
      placement: "right",
      action: "click",
      actionTarget: ".w-72 .space-y-1 button:first-child",
      hint: "Click the '+ New Use Case' button at the top of the use case list.",
      delay: 2500,
    },
    {
      target: ".space-y-3 label:first-child input",
      title: "Step 1: Describe — Name & Details",
      content:
        "Enter a name like 'Wash Trading — Same Account, Same Day' and add a description explaining what this use case tests. You can also set the author name and add tags (e.g., 'wash-trading', 'equity') to categorize the use case.",
      placement: "left",
      action: "type",
      actionTarget: ".space-y-3 label:first-child input",
      actionValue: "Wash Trading — Same Account, Same Day",
      autoFillData: {
        name: "Wash Trading — Same Account, Same Day",
        description:
          "Tests detection of wash trades where the same account buys and sells the same instrument within a single trading day.",
        author: "Demo User",
      },
      hint: "Fill in the Name field with a descriptive use case name. Add a description, author, and optional tags.",
      delay: 3500,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Components",
      content:
        "Click 'Next' to proceed to Step 2: Components. The wizard validates that the name is filled before allowing you to continue.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click the 'Next' button to proceed to the Components step.",
      delay: 2500,
    },
    {
      target: ".space-y-4 h4:first-of-type",
      title: "Step 2: Select Components",
      content:
        "Components are grouped by type: Detection Models, Calculations, and Settings. Click to select the components this use case should include. For a wash trading use case, select the 'Wash Trading (Full Day)' detection model and related calculations like 'Self-Trade Ratio' and 'Same-Day Turnaround'.",
      placement: "left",
      action: "wait",
      hint: "Click on a detection model and 2-3 related calculations to include them in the use case.",
      delay: 4000,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Sample Data",
      content:
        "Click 'Next' to proceed to Step 3: Sample Data. Here you'll define the test data that the use case will run against.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to proceed to the Sample Data step.",
      delay: 2500,
    },
    {
      target: ".monaco-themed",
      title: "Step 3: Enter Sample Data",
      content:
        "The Monaco JSON editor lets you define sample data for each entity type. Use the entity tabs above the editor to switch between data sets (e.g., executions, orders, products). The JSON must be valid — a red parse error banner appears if the syntax is incorrect.",
      placement: "left",
      action: "wait",
      hint: "Review the sample data JSON in the editor. Switch between entity tabs to see different data sets. Edit the JSON to add or modify test records.",
      delay: 4000,
    },
    {
      target: "button:has-text('Next')",
      title: "Advance to Expected Results",
      content:
        "Click 'Next' to proceed to Step 4: Expected Results. This is where you define what the use case should produce when run.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Click 'Next' to proceed to the Expected Results step.",
      delay: 2500,
    },
    {
      target: ".space-y-4 label:first-of-type",
      title: "Step 4: Set Expected Results",
      content:
        "Toggle 'Should alerts fire?' to Yes, then set the expected alert count (e.g., 2). Add notes explaining why: 'Account A001 has 3 self-trades on 2024-01-15 with matching buy/sell patterns.' These expectations are checked when you run the use case.",
      placement: "left",
      action: "wait",
      autoFillData: {
        should_fire: "true",
        expected_alert_count: "2",
        notes: "Account A001 has 3 self-trades on 2024-01-15 with matching buy/sell patterns exceeding the wash_self_trade_ratio threshold.",
      },
      hint: "Click 'Yes' for should alerts fire, enter the expected alert count, and add notes explaining the expected outcome.",
      delay: 3500,
    },
    {
      target: "button:has-text('Save Use Case')",
      title: "Step 5: Review & Save",
      content:
        "The Review step shows a summary of everything you've configured — name, components, sample data, and expected results. Click 'Save Use Case' to save it as a draft. The use case will appear in the left panel with a 'draft' status badge.",
      placement: "top",
      action: "click",
      actionTarget: "button:has-text('Next')",
      hint: "Review the summary, then click 'Save Use Case' to save. The use case is created with 'draft' status.",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S16: Submit Use Case for Review (Intermediate, 5 min)
// --------------------------------------------------------------------------
const S16_SUBMIT_USE_CASE: ScenarioDefinition = {
  id: "s16_submit_use_case",
  name: "Submit Use Case for Review",
  description:
    "Take a draft use case through the review readiness flow — review its contents, verify completeness, and submit it for governance review. Verify it appears in the Submissions Queue.",
  category: "use_cases",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  prerequisites: ["s15_create_use_case"],
  steps: [
    {
      target: ".w-72",
      title: "Select a Draft Use Case",
      content:
        "The use case list shows all use cases with their status badges. Look for one with a 'draft' status (gray badge). We'll take this draft through the review submission flow.",
      placement: "right",
      route: "/use-cases",
      action: "navigate",
      actionTarget: ".w-72",
      hint: "Navigate to the Use Case Studio and identify a use case with 'draft' status.",
      delay: 3000,
    },
    {
      target: ".w-72 .space-y-1 button:nth-child(2)",
      title: "Open the Draft Use Case",
      content:
        "Click on the draft use case to view its detail panel. The center area will show the use case header with its name, status badge, description, and action buttons (Edit, Delete, Run).",
      placement: "right",
      action: "click",
      actionTarget: ".w-72 .space-y-1 button:nth-child(2)",
      hint: "Click on a draft use case in the list to view its details.",
      delay: 2500,
    },
    {
      target: ".flex-1.flex.flex-col.gap-3",
      title: "Review Use Case Contents",
      content:
        "The detail view shows everything about this use case: components (detection models, calculations, settings), sample data entities with row counts, and expected results (should fire, alert count, notes). Verify that all sections are properly configured before proceeding.",
      placement: "left",
      action: "wait",
      hint: "Read through the Components, Sample Data, and Expected Results panels. Verify the use case is complete.",
      delay: 3500,
    },
    {
      target: "button:has-text('Run')",
      title: "Test Before Submitting",
      content:
        "Before submitting, click 'Run' to execute the use case pipeline on its sample data. The result badge will show the number of alerts generated (e.g., '2 alerts') or an error. Compare this against the expected results to confirm the use case works correctly.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Run')",
      hint: "Click 'Run' to test the use case. Check that the generated alert count matches the expected results.",
      delay: 3500,
    },
    {
      target: "button:has-text('Edit')",
      title: "Edit to Mark as Ready",
      content:
        "To change the status from 'draft' to ready for submission, click 'Edit' to open the wizard. In a full workflow, you would update the status field to 'ready' and then save. The status badge will update to show 'ready' (blue).",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click 'Edit' to open the use case in the wizard. Review and confirm all fields are complete.",
      delay: 2500,
    },
    {
      target: "button:has-text('Save Use Case')",
      title: "Save and Submit",
      content:
        "After verifying all steps are complete, save the use case. In the full governance flow, saving a 'ready' use case triggers the submission creation. The submission will appear in the Submissions Queue (/submissions) for reviewer action.",
      placement: "top",
      action: "wait",
      hint: "Navigate through the wizard steps and click 'Save Use Case' to save. Then navigate to /submissions to verify the submission was created.",
      delay: 3000,
    },
    {
      target: ".flex-1.flex.flex-col.gap-3",
      title: "Verify in Submissions Queue",
      content:
        "Navigate to the Submissions Queue to confirm the submission was created. You should see a new row in the AG Grid with the use case name, 'pending' status, and today's date. The submission is now ready for reviewer action.",
      placement: "left",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".flex-1.flex.flex-col.gap-3",
      hint: "Navigate to /submissions and look for the new submission row in the grid. Confirm it shows 'pending' status.",
      delay: 3500,
    },
  ],
};

// --------------------------------------------------------------------------
// S17: Review a Submission (Intermediate, 7 min)
// --------------------------------------------------------------------------
const S17_REVIEW_SUBMISSION: ScenarioDefinition = {
  id: "s17_review_submission",
  name: "Review a Submission",
  description:
    "Act as a governance reviewer — examine a pending submission's summary, components, auto-generated recommendations, impact analysis, write a comment, and approve or request changes.",
  category: "use_cases",
  difficulty: "intermediate",
  estimatedMinutes: 7,
  prerequisites: ["s16_submit_use_case"],
  steps: [
    {
      target: ".flex-1.flex.flex-col.gap-3 h2",
      title: "Submissions Review Queue",
      content:
        "Welcome to the Submissions Review Queue — the governance hub where submitted use cases are reviewed before deployment. The AG Grid shows all submissions with columns for ID, Name, Author, Status, Components count, and Created date.",
      placement: "bottom",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".flex-1.flex.flex-col.gap-3 h2",
      hint: "Navigate to the Submissions Queue using the sidebar.",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row:first-child",
      title: "Select a Pending Submission",
      content:
        "Click on a submission row to open its detail panel below the grid. Look for one with 'pending' or 'in_review' status — these are awaiting reviewer action. The grid supports sorting and filtering by any column.",
      placement: "bottom",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:first-child",
      hint: "Click on a submission row with 'pending' status to open its detail view.",
      validation: ".flex.border-b.border-border",
      delay: 2500,
    },
    {
      target: ".flex.border-b.border-border button:first-child",
      title: "Summary Tab",
      content:
        "The Summary tab shows the submission's name, ID, status, description, author, reviewer assignment, use case reference, component count, and timestamps. This gives you a quick overview before diving into specifics.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:first-child",
      hint: "Read the Summary tab to understand what this submission contains and who authored it.",
      delay: 3000,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(2)",
      title: "Components Tab",
      content:
        "Switch to the Components tab to see every component included in this submission — detection models, calculations, settings, and entities. Each component shows its type badge, ID, action (include/create/reference), and optional configuration details.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(2)",
      hint: "Click the 'Components' tab to review the components bundled in this submission.",
      delay: 3000,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(3)",
      title: "Recommendations Tab",
      content:
        "The Recommendations tab shows auto-generated analysis produced when the submission was created. These include change classification (new vs. modified), similarity checks against existing use cases, consistency validation, and best-practice adherence. Click 'Re-run' to regenerate recommendations.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(3)",
      hint: "Click the 'Recommendations' tab to see auto-generated analysis. Note severity badges (critical, high, medium, low).",
      delay: 3500,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(5)",
      title: "Impact Tab",
      content:
        "The Impact tab shows a breakdown of component types (how many models, calculations, settings), lists referenced vs. newly created components, and displays expected results. This helps assess the scope and risk of deploying this use case.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(5)",
      hint: "Click the 'Impact' tab to review the deployment impact analysis — component types, references, and expected results.",
      delay: 3500,
    },
    {
      target: ".border-t.border-border textarea",
      title: "Write a Review Comment",
      content:
        "In the Review Actions section at the bottom, write a comment explaining your review decision. For example: 'Components and sample data look complete. Recommendation severities are acceptable. Approved for deployment.' Comments are timestamped and attached to the submission history.",
      placement: "top",
      action: "type",
      actionTarget: ".border-t.border-border textarea",
      actionValue: "Components and sample data verified. Wash trading logic is sound. Approved for deployment.",
      hint: "Type a review comment in the text area at the bottom of the detail panel.",
      delay: 3000,
    },
    {
      target: ".border-t.border-border .flex.gap-2 button:first-child",
      title: "Approve the Submission",
      content:
        "Click 'Approve' to approve the submission for deployment. You can also 'Request Changes' (sends it back to the author) or 'Reject' (permanently declines). The status badge will update to 'approved' (green) and the comment will be logged.",
      placement: "top",
      action: "click",
      actionTarget: ".border-t.border-border .flex.gap-2 button:first-child",
      hint: "Click the 'Approve' button to approve the submission. Watch the status badge change to 'approved'.",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S18: Implement Feedback (Advanced, 8 min)
// --------------------------------------------------------------------------
const S18_IMPLEMENT_FEEDBACK: ScenarioDefinition = {
  id: "s18_implement_feedback",
  name: "Implement Feedback",
  description:
    "Handle a 'changes requested' submission — read reviewer comments, navigate back to the Use Case Studio, make the requested changes, and resubmit for another review cycle.",
  category: "use_cases",
  difficulty: "advanced",
  estimatedMinutes: 8,
  prerequisites: ["s17_review_submission"],
  steps: [
    {
      target: ".ag-body-viewport",
      title: "Find a Submission with Requested Changes",
      content:
        "In the Submissions Queue, look for a submission with 'in_review' status (amber badge). This indicates a reviewer has requested changes before approval. Click on it to see the feedback.",
      placement: "bottom",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".ag-body-viewport",
      hint: "Navigate to /submissions and find a submission with 'in_review' status (amber badge).",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row:first-child",
      title: "Open the Submission",
      content:
        "Click on the submission row to open its detail panel. We need to read the reviewer's comments to understand what changes are required.",
      placement: "bottom",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:first-child",
      hint: "Click on the submission with requested changes to view its details.",
      validation: ".flex.border-b.border-border",
      delay: 2500,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(4)",
      title: "Read Reviewer Comments",
      content:
        "Switch to the Comments tab to read the reviewer's feedback. Each comment shows the author, type (approval/rejection/comment), timestamp, and content. The most recent comment will explain what changes are needed — for example, 'Add more sample data for edge cases' or 'Update expected alert count'.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(4)",
      hint: "Click the 'Comments' tab to read the reviewer's feedback. Note the specific changes requested.",
      delay: 3500,
    },
    {
      target: ".flex.border-b.border-border button:first-child",
      title: "Note the Use Case Reference",
      content:
        "Switch back to the Summary tab and note the 'Use Case' ID field. This links the submission to its source use case in the Use Case Studio. You'll navigate there next to make the requested changes.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:first-child",
      hint: "Note the Use Case ID from the Summary tab. You'll need this to find the right use case to edit.",
      delay: 3000,
    },
    {
      target: ".w-72",
      title: "Navigate to Use Case Studio",
      content:
        "Switch to the Use Case Studio to find and edit the original use case. The left panel lists all use cases — find the one matching the submission's use case ID.",
      placement: "right",
      route: "/use-cases",
      action: "navigate",
      actionTarget: ".w-72",
      hint: "Navigate to /use-cases and find the use case that matches the submission.",
      delay: 2500,
    },
    {
      target: ".w-72 .space-y-1 button:nth-child(2)",
      title: "Select the Use Case to Edit",
      content:
        "Click on the use case that corresponds to the submission. Its status may show 'submitted' or 'draft'. Review the current contents to understand what needs to change based on the reviewer's feedback.",
      placement: "right",
      action: "click",
      actionTarget: ".w-72 .space-y-1 button:nth-child(2)",
      hint: "Click on the use case to view its current contents before editing.",
      delay: 2500,
    },
    {
      target: "button:has-text('Edit')",
      title: "Enter Edit Mode",
      content:
        "Click 'Edit' to open the use case in the 5-step wizard with all fields pre-filled. Navigate to the step that needs changes — for example, Step 3 (Sample Data) to add more test records, or Step 4 (Expected Results) to update the alert count.",
      placement: "bottom",
      action: "click",
      actionTarget: "button:has-text('Edit')",
      hint: "Click 'Edit' to open the wizard. Navigate to the step that needs changes.",
      delay: 2500,
    },
    {
      target: ".flex-1.flex.flex-col.min-w-0",
      title: "Make the Requested Changes",
      content:
        "Apply the reviewer's requested changes. Common modifications include: adding edge-case sample data (Step 3), adjusting expected alert counts (Step 4), adding missing components (Step 2), or improving the description (Step 1). Use the 'Back' and 'Next' buttons to navigate between steps.",
      placement: "left",
      action: "wait",
      hint: "Make the changes requested by the reviewer. Navigate between wizard steps using Back/Next.",
      delay: 4000,
    },
    {
      target: "button:has-text('Save Use Case')",
      title: "Save the Updated Use Case",
      content:
        "After making all requested changes, navigate to Step 5 (Review & Save) and click 'Save Use Case'. The updated use case will be saved and can be resubmitted. In the governance flow, saving triggers a new submission that replaces the previous one.",
      placement: "top",
      action: "wait",
      hint: "Navigate to the final step and click 'Save Use Case' to save your changes.",
      delay: 3000,
    },
    {
      target: ".flex-1.flex.flex-col.gap-3 h2",
      title: "Verify Resubmission",
      content:
        "Navigate back to the Submissions Queue to verify the updated submission. You should see a new or updated entry with 'pending' status, reflecting the changes you made. The reviewer can now re-evaluate the submission with the improvements applied.",
      placement: "bottom",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".flex-1.flex.flex-col.gap-3 h2",
      hint: "Navigate to /submissions and verify the updated submission appears with 'pending' status.",
      delay: 3500,
    },
  ],
};

// ==========================================================================
// Master export — all scenarios keyed by ID
// ==========================================================================
export const SCENARIOS: Record<string, ScenarioDefinition> = {
  s1_view_settings: S1_VIEW_SETTINGS,
  s2_modify_threshold: S2_MODIFY_THRESHOLD,
  s3_product_override: S3_PRODUCT_OVERRIDE,
  s4_score_steps: S4_SCORE_STEPS,
  s5_match_patterns: S5_MATCH_PATTERNS,
  s6_resolution_deep_dive: S6_RESOLUTION_DEEP_DIVE,
  s7_explore_calc_dag: S7_EXPLORE_CALC_DAG,
  s8_create_manual_calc: S8_CREATE_MANUAL_CALC,
  s9_ai_calc_builder: S9_AI_CALC_BUILDER,
  s10_parameterize_calc: S10_PARAMETERIZE_CALC,
  s11_full_model_wizard: S11_FULL_MODEL_WIZARD,
  s12_clone_modify_model: S12_CLONE_MODIFY_MODEL,
  s13_add_calc_to_model: S13_ADD_CALC_TO_MODEL,
  s14_model_best_practices: S14_MODEL_BEST_PRACTICES,
  s15_create_use_case: S15_CREATE_USE_CASE,
  s16_submit_use_case: S16_SUBMIT_USE_CASE,
  s17_review_submission: S17_REVIEW_SUBMISSION,
  s18_implement_feedback: S18_IMPLEMENT_FEEDBACK,
};
