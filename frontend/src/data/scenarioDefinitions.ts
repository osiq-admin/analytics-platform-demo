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
// Master export — all scenarios keyed by ID
// ==========================================================================
export const SCENARIOS: Record<string, ScenarioDefinition> = {
  s1_view_settings: S1_VIEW_SETTINGS,
  s2_modify_threshold: S2_MODIFY_THRESHOLD,
  s3_product_override: S3_PRODUCT_OVERRIDE,
  s4_score_steps: S4_SCORE_STEPS,
  s5_match_patterns: S5_MATCH_PATTERNS,
  s6_resolution_deep_dive: S6_RESOLUTION_DEEP_DIVE,
};
