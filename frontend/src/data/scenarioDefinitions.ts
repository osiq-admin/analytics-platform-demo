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
// Scenario Definitions — Entities (S19-S20)
// ==========================================================================

// --------------------------------------------------------------------------
// S19: Explore Entity Data Model (Beginner, 5 min)
// --------------------------------------------------------------------------
const S19_EXPLORE_ENTITY_MODEL: ScenarioDefinition = {
  id: "s19_explore_entity_model",
  name: "Explore Entity Data Model",
  description:
    "Walk through the Entity Designer to understand the platform's 8-entity data model — fields, types, relationships, and how entities connect via foreign keys.",
  category: "entities",
  difficulty: "beginner",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='entity-list']",
      title: "Entity Designer Overview",
      content:
        "Welcome to the Entity Designer. The top pane lists all 8 entities in a full-width grid. Below is the detail pane showing Fields and Relationships tabs. Switch to the Relationship Graph tab (top-right) for the visual entity graph.",
      placement: "bottom",
      route: "/entities",
      action: "navigate",
      actionTarget: "[data-tour='entity-list']",
      hint: "Navigate to the Entity Designer using the sidebar (under Explore).",
      delay: 3000,
    },
    {
      target: "[data-tour='entity-list'] .ag-body-viewport .ag-row:first-child",
      title: "Select the Product Entity",
      content:
        "Click on 'product' to view its field definitions. Products are the core instruments — 50 rows covering equities, FX, and futures with ISO-standard identifiers.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='entity-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on the 'product' entity in the list to select it.",
      validation: "[data-tour='entity-fields']",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-fields']",
      title: "Product Fields — ISO Identifiers",
      content:
        "The Fields tab shows all 17 columns for the product entity. Notice the industry-standard fields: ISIN, CFI, and MIC. The Domain column shows which fields have constrained value sets. Click any field row to open the Domain Values pane — view metadata-defined values and data-only values from the database.",
      placement: "bottom",
      action: "wait",
      hint: "Review the field definitions grid. Look for ISIN, CFI, and MIC columns — these are ISO-standard identifiers.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Relationship Graph",
      content:
        "The relationship graph uses dagre auto-layout with minimap and zoom controls. Product is highlighted with its connected edges. Click any node to navigate to that entity. Drag the divider to resize the graph pane.",
      placement: "top",
      action: "wait",
      hint: "Look at the relationship graph to see how product connects to other entities.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-list'] .ag-body-viewport .ag-row:nth-child(2)",
      title: "Select the Execution Entity",
      content:
        "Click on 'execution' to see its 13 fields. Executions represent trade fills — 509 rows with FIX Protocol fields like exec_type and capacity. Each execution references an order via the order_id foreign key.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='entity-list'] .ag-body-viewport .ag-row:nth-child(2)",
      hint: "Click on the 'execution' entity to view its fields.",
      validation: "[data-tour='entity-fields']",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-fields']",
      title: "Foreign Key: order_id",
      content:
        "Notice the order_id field — this is a foreign key linking each execution to its parent order. The execution also has venue_mic (FK to venue), enabling cross-venue analysis. These relationships power the detection models' ability to correlate trading activity across entities.",
      placement: "bottom",
      action: "wait",
      hint: "Find the order_id and venue_mic fields in the grid. These are foreign keys to the order and venue entities.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Full Relationship Map",
      content:
        "The graph highlights execution's connections with accent-colored edges: order_id points to order, venue_mic points to venue. Unrelated nodes are dimmed for focus. Use the minimap to orient yourself, or click nodes to navigate between entities. Drag the divider to resize.",
      placement: "top",
      action: "wait",
      hint: "Study the relationship graph to see execution's foreign keys. Trace the path: execution → order → trader/account.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-list']",
      title: "Entity Data Model Complete",
      content:
        "You've explored the core entities and their relationships. The 8-entity model covers: instruments (product), trading (order, execution), market data (md_eod, md_intraday), participants (trader, account), and infrastructure (venue). Next, try importing and previewing raw data (S20).",
      placement: "right",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S20: Import and Preview Data (Beginner, 4 min)
// --------------------------------------------------------------------------
const S20_IMPORT_PREVIEW_DATA: ScenarioDefinition = {
  id: "s20_import_preview_data",
  name: "Import and Preview Data",
  description:
    "Explore raw data files, preview CSV contents in the Data Manager, verify loaded tables in the Schema Explorer, and run a query in the SQL Console.",
  category: "entities",
  difficulty: "beginner",
  estimatedMinutes: 4,
  prerequisites: ["s19_explore_entity_model"],
  steps: [
    {
      target: "[data-tour='data-list']",
      title: "Data Manager — File List",
      content:
        "The Data Manager shows all data files loaded into the platform. The left panel lists CSV and Parquet files for each entity — execution.csv, product.csv, order.csv, and more. Each file corresponds to one of the 8 entities you explored in the Entity Designer.",
      placement: "right",
      route: "/data",
      action: "navigate",
      actionTarget: "[data-tour='data-list']",
      hint: "Navigate to the Data Manager using the sidebar (under Explore).",
      delay: 3000,
    },
    {
      target: "[data-tour='data-list'] .ag-body-viewport .ag-row:first-child",
      title: "Preview execution.csv",
      content:
        "Click on execution.csv to preview its contents. The AG Grid on the right will show the raw data with all 13 columns — execution_id, order_id, product_id, venue_mic, price, quantity, exec_type, capacity, and more.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='data-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on execution.csv (or the first file) to preview its data.",
      validation: "[data-tour='data-preview']",
      delay: 2500,
    },
    {
      target: "[data-tour='data-preview']",
      title: "Inspect Column Count and Data",
      content:
        "The preview grid shows 509 execution rows with 13 columns. Scroll horizontally to see all fields. Notice the FIX Protocol fields: exec_type (TRADE, CANCEL), capacity (AGENCY, PRINCIPAL), and the venue_mic linking to ISO 10383 venue codes.",
      placement: "left",
      action: "wait",
      hint: "Scroll through the preview grid. Count the columns and note the FIX Protocol field values.",
      delay: 3500,
    },
    {
      target: "[data-tour='data-list'] .ag-body-viewport .ag-row:nth-child(3)",
      title: "Preview product.csv",
      content:
        "Now click on product.csv to preview the instrument master data. This file has 50 rows covering equities, FX pairs, and futures, each with ISO identifiers (ISIN, CFI, MIC) and instrument-specific fields (underlying, strike, expiry).",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='data-list'] .ag-body-viewport .ag-row:nth-child(3)",
      hint: "Click on product.csv to preview the instrument master data.",
      validation: "[data-tour='data-preview']",
      delay: 2500,
    },
    {
      target: "[data-tour='data-preview']",
      title: "ISO-Standard Fields",
      content:
        "Notice the ISO-standard fields in product.csv: ISIN (e.g., US0378331005 for AAPL), CFI code (ESVUFR for equity), and primary_mic (XNGS for NASDAQ). These standards ensure the demo data mirrors real-world trade surveillance data formats.",
      placement: "left",
      action: "wait",
      hint: "Find the ISIN, CFI, and primary_mic columns. Note the standard codes used.",
      delay: 3500,
    },
    {
      target: "[data-tour='sql-editor']",
      title: "Query the Data",
      content:
        "Now let's query the loaded data using the SQL Console. DuckDB makes all CSV and Parquet files queryable via SQL. Try a simple query to see how entities join together.",
      placement: "right",
      route: "/sql",
      action: "navigate",
      actionTarget: "[data-tour='sql-editor']",
      hint: "Navigate to the SQL Console using the sidebar (under Explore).",
      delay: 2500,
    },
    {
      target: "[data-tour='sql-presets']",
      title: "Use a Preset Query",
      content:
        "The preset queries provide ready-made examples. Select one to see how entities are queried and joined — for example, a query that joins executions with products to show trading volume by instrument.",
      placement: "left",
      action: "click",
      actionTarget: "[data-tour='sql-presets'] button:first-child",
      hint: "Click a preset query button to load a pre-written SQL statement into the editor.",
      delay: 2500,
    },
    {
      target: "[data-tour='sql-results']",
      title: "View Query Results",
      content:
        "The results grid shows the query output with full AG Grid features — sorting, filtering, and column resizing. You've now traced the full data path: raw files → Data Manager → Schema Explorer → SQL Console. The same data feeds into the detection pipeline and alert generation.",
      placement: "top",
      action: "wait",
      hint: "Review the query results. Try modifying the SQL and running it again.",
      delay: 3000,
    },
  ],
};

// ==========================================================================
// Scenario Definitions — Investigation (S21-S23)
// ==========================================================================

// --------------------------------------------------------------------------
// S21: Alert Investigation Workflow (Beginner, 8 min)
// --------------------------------------------------------------------------
const S21_ALERT_INVESTIGATION: ScenarioDefinition = {
  id: "s21_alert_investigation",
  name: "Alert Investigation Workflow",
  description:
    "Full investigation flow from the Dashboard summary metrics through the Risk Case Manager — sort, drill into an alert, review score breakdown, calculation trace DAG, market data chart, related orders, and settings trace.",
  category: "investigation",
  difficulty: "beginner",
  estimatedMinutes: 8,
  steps: [
    {
      target: "[data-tour='dashboard-cards']",
      title: "Dashboard — Summary Metrics",
      content:
        "Start your investigation on the Dashboard. The summary cards show key metrics: total alerts generated, alerts by severity, average score, and detection model coverage. These give you a high-level view of the current alert landscape before drilling in.",
      placement: "bottom",
      route: "/dashboard",
      action: "navigate",
      actionTarget: "[data-tour='dashboard-cards']",
      hint: "Navigate to the Dashboard using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='dashboard-by-model']",
      title: "Alerts by Detection Model",
      content:
        "The 'Alerts by Model' chart breaks down alerts across the 5 detection models: Wash Trading (Full Day), Wash Trading (Intraday), Market Price Ramping, Insider Dealing, and Spoofing/Layering. Note which model generates the most alerts — this indicates where to focus your investigation.",
      placement: "right",
      action: "wait",
      hint: "Review the chart to identify which detection model has the most alerts.",
      delay: 3500,
    },
    {
      target: "[data-tour='dashboard-scores']",
      title: "Score Distribution",
      content:
        "The score distribution histogram shows how alert scores are spread across ranges. Scores near the top (80-100) are high-confidence alerts that warrant immediate attention. A healthy distribution shows most alerts in the mid-range with fewer extreme scores.",
      placement: "left",
      action: "wait",
      hint: "Look at the score distribution. Identify the score range with the most alerts.",
      delay: 3500,
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Risk Case Manager — Alert Grid",
      content:
        "Navigate to the Risk Case Manager to see individual alerts. The AG Grid displays every alert with columns for score, model, product, alert date, and status. We'll sort by score to find the highest-priority cases.",
      placement: "bottom",
      route: "/alerts",
      action: "navigate",
      actionTarget: "[data-tour='alert-grid']",
      hint: "Navigate to the Risk Case Manager using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='alert-grid'] .ag-header-cell:first-child",
      title: "Sort by Score",
      content:
        "Click the Score column header to sort alerts by score descending. The highest-scoring alerts appear first — these have the strongest detection signals and should be investigated first.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='alert-grid'] .ag-header-cell:first-child",
      hint: "Click the Score column header to sort alerts. Click again to reverse the sort order.",
      delay: 2500,
    },
    {
      target: "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      title: "Open the Top Alert",
      content:
        "Click on the highest-scoring alert to open its detail view. The detail panel provides everything needed for investigation: score breakdown, calculation trace, market data, related orders, and settings context.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on the top row (highest score) to open the alert detail view.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Score Breakdown",
      content:
        "The Score Breakdown panel shows how the total alert score was calculated. Each contributing calculation has its own sub-score, weight, and contribution to the final score. This explains *why* this alert was generated and which signals were strongest.",
      placement: "left",
      action: "wait",
      hint: "Review the score breakdown. Identify which calculation contributed the most to the total score.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Calculation Trace DAG",
      content:
        "The Calculation Trace DAG visualizes the dependency graph of calculations that produced this alert. Nodes represent individual calculations, edges show data flow. This lets you trace the logic from raw market data through intermediate calculations to the final alert score.",
      placement: "left",
      action: "wait",
      hint: "Study the DAG to understand the calculation pipeline. Follow the arrows from inputs to outputs.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Market Data Chart",
      content:
        "The OHLC candlestick chart shows the product's market data around the alert date. Price action, volume, and the alert event are overlaid. Look for unusual patterns — price spikes before the alert, abnormal volume, or price reversals that correlate with the suspicious activity.",
      placement: "left",
      action: "wait",
      hint: "Examine the candlestick chart. Look for price/volume anomalies around the alert date.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Related Orders",
      content:
        "The Related Orders table shows all orders and executions linked to this alert — the specific trades that triggered the detection. Check order types (MARKET vs LIMIT), timing, quantities, and whether the same account appears on both sides (wash trading indicator).",
      placement: "left",
      action: "wait",
      hint: "Review the related orders. Look for suspicious patterns: same account, opposing sides, close timestamps.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Settings Trace",
      content:
        "The Settings Trace shows which threshold values were applied to generate this alert and how they resolved. It reveals the full resolution chain: default → asset class override → product-specific override. This helps you understand whether the alert reflects standard or customized sensitivity.",
      placement: "left",
      action: "wait",
      hint: "Check the settings trace to see which thresholds applied and whether any overrides were active.",
      delay: 3500,
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Investigation Complete",
      content:
        "You've completed a full alert investigation: Dashboard overview → Risk Case Manager → score breakdown → calculation trace → market data → related orders → settings trace. This workflow covers every dimension needed to assess whether an alert represents genuine market abuse or a false positive.",
      placement: "bottom",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S22: Cross-Alert Analysis (Intermediate, 6 min)
// --------------------------------------------------------------------------
const S22_CROSS_ALERT_ANALYSIS: ScenarioDefinition = {
  id: "s22_cross_alert_analysis",
  name: "Cross-Alert Analysis",
  description:
    "Compare alerts across detection models to find patterns — filter alerts by model, analyze scores with SQL queries, and use the AI Assistant to identify cross-model correlations.",
  category: "investigation",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  prerequisites: ["s21_alert_investigation"],
  steps: [
    {
      target: "[data-tour='alert-grid']",
      title: "Start with the Alert Grid",
      content:
        "We'll compare alerts across detection models to identify patterns. The Risk Case Manager grid shows all alerts — we'll filter by model to isolate specific detection types and compare their characteristics.",
      placement: "bottom",
      route: "/alerts",
      action: "navigate",
      actionTarget: "[data-tour='alert-grid']",
      hint: "Navigate to the Risk Case Manager.",
      delay: 2500,
    },
    {
      target: "[data-tour='alert-filters']",
      title: "Filter by Detection Model",
      content:
        "Use the column filters to isolate alerts from a single detection model — for example, 'Wash Trading (Full Day)'. This lets you analyze one model's output in isolation. Notice the score range and product distribution for this model type.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='alert-filters']",
      hint: "Click the filter icon on the Model column. Select 'Wash Trading (Full Day)' to filter.",
      delay: 3000,
    },
    {
      target: "[data-tour='alert-grid'] .ag-body-viewport",
      title: "Compare Scores Within Model",
      content:
        "With the filter active, compare the scores across alerts from the same model. Look for clustering — are most scores in a narrow range (consistent detection) or widely spread (variable signal strength)? High-variance models may need threshold tuning.",
      placement: "bottom",
      action: "wait",
      hint: "Review the filtered results. Note the score range and any clustering patterns.",
      delay: 3500,
    },
    {
      target: "[data-tour='sql-editor']",
      title: "Analyze with SQL",
      content:
        "Switch to the SQL Console for deeper analysis. Run an analytical query to aggregate alerts by model — for example, 'SELECT model, COUNT(*) as count, AVG(score) as avg_score, MIN(score), MAX(score) FROM alerts GROUP BY model'. This reveals cross-model patterns that aren't visible in the grid.",
      placement: "right",
      route: "/sql",
      action: "navigate",
      actionTarget: "[data-tour='sql-editor']",
      hint: "Navigate to the SQL Console and write a GROUP BY query to compare alert statistics across models.",
      delay: 3000,
    },
    {
      target: "[data-tour='sql-results']",
      title: "Review Aggregate Statistics",
      content:
        "The query results show aggregate metrics per model: alert count, average score, min/max scores. Compare models side by side — a model with very high average scores might be too sensitive, while one with few alerts might have thresholds set too high.",
      placement: "top",
      action: "wait",
      hint: "Review the aggregated results. Compare average scores and alert counts across detection models.",
      delay: 3500,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Ask the AI Assistant",
      content:
        "Use the AI Assistant to ask about cross-model patterns. Try: 'Which products have alerts from multiple detection models?' or 'Are there traders who appear frequently across different alert types?' The assistant can synthesize patterns across the entire data set.",
      placement: "right",
      route: "/assistant",
      action: "navigate",
      actionTarget: "[data-tour='assistant-chat']",
      hint: "Navigate to the AI Assistant and ask about cross-model alert patterns.",
      delay: 3000,
    },
    {
      target: "[data-tour='assistant-scenarios']",
      title: "Use Built-in Scenarios",
      content:
        "The AI Assistant has built-in analysis scenarios that run pre-defined investigative queries. These cover common patterns: trader-level risk aggregation, product heat maps, and temporal clustering. Select a scenario to see a structured analysis without writing custom queries.",
      placement: "left",
      action: "wait",
      hint: "Browse the scenario buttons on the right. Click one to run a pre-built analysis.",
      delay: 3000,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Cross-Alert Analysis Complete",
      content:
        "You've analyzed alerts across models using three approaches: grid filtering for visual comparison, SQL queries for aggregate statistics, and AI-assisted pattern recognition. This multi-tool approach reveals correlations that single-view analysis would miss.",
      placement: "right",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S23: Regulatory Coverage Audit (Advanced, 7 min)
// --------------------------------------------------------------------------
const S23_REGULATORY_AUDIT: ScenarioDefinition = {
  id: "s23_regulatory_audit",
  name: "Regulatory Coverage Audit",
  description:
    "Audit regulatory coverage using the Regulatory Map — review obligation cards, explore the traceability graph, identify coverage gaps, and navigate to the Model Composer to address them.",
  category: "investigation",
  difficulty: "advanced",
  estimatedMinutes: 7,
  prerequisites: ["s21_alert_investigation"],
  steps: [
    {
      target: "[data-tour='regulatory-cards']",
      title: "Regulatory Obligations Overview",
      content:
        "The Regulatory Map shows all regulatory obligations that your surveillance system must cover. Each card represents an obligation (e.g., MAR Article 12 — Market Manipulation) with its coverage status: covered (green), partial (amber), or gap (red).",
      placement: "right",
      route: "/regulatory",
      action: "navigate",
      actionTarget: "[data-tour='regulatory-cards']",
      hint: "Navigate to the Regulatory Map using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-cards']",
      title: "Review Coverage Status",
      content:
        "Scan the obligation cards for their coverage status badges. Green cards have full model coverage — every required detection scenario is implemented. Amber cards have partial coverage — some but not all scenarios are addressed. Red cards represent gaps requiring immediate attention.",
      placement: "right",
      action: "wait",
      hint: "Look at the coverage badges on each card. Count how many are green, amber, and red.",
      delay: 3500,
    },
    {
      target: "[data-tour='regulatory-graph']",
      title: "Traceability Graph",
      content:
        "The traceability graph uses smoothstep edges with labels showing relationship types (contains, detected by, uses). Use the MiniMap (bottom-right) and zoom Controls to navigate. Follow the edges from regulation → article → detection model → calculation. Red nodes indicate coverage gaps.",
      placement: "bottom",
      action: "wait",
      hint: "Study the graph. Use edge labels to understand relationships. Look for red (uncovered) article nodes.",
      delay: 4000,
    },
    {
      target: "[data-tour='regulatory-detail']",
      title: "Drill Into a Node",
      content:
        "Click any node in the graph to see its details in the bottom pane, including descriptions from the regulation registry. The detail pane shows type, label, jurisdiction, coverage status, and full description text. Drag the divider to resize the panes.",
      placement: "top",
      action: "click",
      actionTarget: ".react-flow__node:first-child",
      hint: "Click a node in the graph to view its full details and description.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-details-grid']",
      title: "Regulation Details Table",
      content:
        "Switch to the Regulation Details tab for a structured table view. The AG Grid shows all regulations and articles with coverage status badges. Click any row to see the full article description in the bottom pane.",
      placement: "bottom",
      action: "wait",
      hint: "Click the 'Regulation Details' tab to see the structured table view.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-suggestions']",
      title: "Review AI Suggestions",
      content:
        "The Suggestions panel shows AI-generated recommendations for improving coverage. Suggestions may include: creating a new detection model, adding calculations to an existing model, or adjusting thresholds. Each suggestion includes a rationale and priority level.",
      placement: "left",
      action: "wait",
      hint: "Read the AI suggestions. Note which ones address coverage gaps and their priority levels.",
      delay: 3500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Navigate to Model Composer",
      content:
        "To address a coverage gap, navigate to the Model Composer where you can create or modify detection models. The gap analysis from the Regulatory Map tells you exactly what detection capability is missing — now you'll implement it.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to the Model Composer to create or modify a detection model that addresses the gap.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Address the Gap",
      content:
        "In the Model Composer, you can create a new detection model or enhance an existing one based on the regulatory suggestions. Add the required calculations, configure thresholds, and define the detection query. When saved, the model will automatically appear in the Regulatory Map's traceability graph.",
      placement: "right",
      action: "wait",
      hint: "Review existing models and identify which one to enhance, or create a new model for the uncovered obligation.",
      delay: 3500,
    },
    {
      target: "[data-tour='regulatory-cards']",
      title: "Regulatory Audit Complete",
      content:
        "You've completed a full regulatory coverage audit: reviewed obligation cards, explored the traceability graph, identified gaps, reviewed AI suggestions, and navigated to the Model Composer to address shortfalls. This closed-loop workflow ensures continuous regulatory compliance.",
      placement: "right",
      route: "/regulatory",
      action: "navigate",
      actionTarget: "[data-tour='regulatory-cards']",
      hint: "Return to the Regulatory Map to verify the coverage status has improved.",
      delay: 3000,
    },
  ],
};

// ==========================================================================
// Scenario Definitions — Admin (S24-S25)
// ==========================================================================

// --------------------------------------------------------------------------
// S24: OOB vs Custom Metadata Review (Intermediate, 6 min)
// --------------------------------------------------------------------------
const S24_OOB_METADATA_REVIEW: ScenarioDefinition = {
  id: "s24_oob_metadata_review",
  name: "OOB vs Custom Metadata Review",
  description:
    "Understand the Out-of-Box (OOB) layer system — view layer badges, edit an OOB item to create a custom override, reset to OOB defaults, and use the version comparison panel to simulate an upgrade path.",
  category: "admin",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Metadata Editor — Layer System",
      content:
        "The Metadata Editor manages all configuration in the platform. A key concept is the layer system: 'OOB' (Out-of-Box) items ship with the platform, while 'Custom' items are user modifications. This separation enables safe upgrades — your customizations are preserved when the platform updates its defaults.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to the Metadata Editor using the sidebar (under Configure).",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-layer-badge']",
      title: "Layer Badges",
      content:
        "Each metadata item displays a layer badge: 'OOB' (blue) for factory defaults, 'Custom' (purple) for user-created items, and 'Modified' (amber) for OOB items that have been customized. The badge tells you at a glance whether an item has been changed from its original state.",
      placement: "bottom",
      action: "wait",
      hint: "Look for the layer badge next to the item name. Note the color: blue = OOB, purple = Custom, amber = Modified.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Select an OOB Item",
      content:
        "Select an item with an 'OOB' badge using the item dropdown. The JSON editor shows the factory-default configuration. This is the baseline that the platform ships with — any edits you make will create a custom layer on top.",
      placement: "right",
      action: "wait",
      hint: "Use the item dropdown to select an item with a blue 'OOB' badge. Read the JSON to understand the default configuration.",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Edit to Create a Custom Override",
      content:
        "Make a small edit to the JSON — for example, change a description or adjust a threshold value. When you save, the item's badge will change from 'OOB' (blue) to 'Modified' (amber), indicating this is now a customized version of the factory default.",
      placement: "right",
      action: "type",
      actionTarget: "[data-tour='editor-json'] .monaco-editor textarea",
      actionValue: "custom",
      hint: "Edit a value in the JSON editor. Watch the layer badge change from OOB to Modified after saving.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-save']",
      title: "Save the Modification",
      content:
        "Click Save to persist your change. The layer badge updates to 'Modified' — this tells reviewers and administrators that this item has been customized and differs from the factory default.",
      placement: "top",
      action: "click",
      actionTarget: "[data-tour='editor-save'] button:last-child",
      hint: "Click Save and observe the layer badge change to 'Modified' (amber).",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-oob-banner']",
      title: "OOB Conflict Banner",
      content:
        "When a platform upgrade ships a new version of an item you've modified, an OOB conflict banner appears. This warns you that the factory default has changed and your customization may need review. The banner shows the version difference and offers options to resolve the conflict.",
      placement: "bottom",
      action: "wait",
      hint: "Look for the OOB conflict banner at the top of the editor. It appears when the factory default has been updated.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-reset-oob']",
      title: "Reset to OOB Default",
      content:
        "Click the Reset button to discard your customization and restore the factory default. This is useful when an upgrade provides better defaults or when a customization is no longer needed. The badge reverts from 'Modified' back to 'OOB'.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='editor-reset-oob']",
      hint: "Click the Reset to OOB button to restore the factory default. Watch the badge revert to 'OOB' (blue).",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-visual']",
      title: "Version Comparison",
      content:
        "The Visual Editor includes a version comparison panel with dual dropdowns and a color-coded diff table. Compare your custom version against the OOB baseline or between different saved versions. Green rows are additions, red rows are removals, and amber rows are modifications. This is essential for upgrade planning and audit trails.",
      placement: "left",
      action: "wait",
      hint: "Open the Visual Editor tab. Use the version dropdowns to compare OOB vs Custom. Review the color-coded diff.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "OOB Metadata Review Complete",
      content:
        "You've learned the layer system: OOB defaults provide a stable baseline, Custom overrides preserve your changes, and the version comparison panel enables safe upgrades. This architecture ensures platform updates never silently overwrite your customizations.",
      placement: "bottom",
      action: "wait",
      delay: 3000,
    },
  ],
};

// --------------------------------------------------------------------------
// S25: Full Platform Demo Walkthrough (Advanced, 12 min)
// --------------------------------------------------------------------------
const S25_FULL_PLATFORM_DEMO: ScenarioDefinition = {
  id: "s25_full_platform_demo",
  name: "Full Platform Demo Walkthrough",
  description:
    "Complete end-to-end demo covering the entire platform: data ingestion, entity model, pipeline execution, alert investigation, threshold tuning, model review, regulatory compliance, and governance submission — all in one guided flow.",
  category: "admin",
  difficulty: "advanced",
  estimatedMinutes: 12,
  prerequisites: ["s21_alert_investigation", "s24_oob_metadata_review"],
  steps: [
    {
      target: "[data-tour='data-list']",
      title: "Step 1: Data Ingestion",
      content:
        "We begin at the Data Manager — the entry point for all trade data. The platform ingests CSV files for 8 entity types: products, orders, executions, market data, venues, accounts, and traders. This raw data feeds into everything downstream.",
      placement: "right",
      route: "/data",
      action: "navigate",
      actionTarget: "[data-tour='data-list']",
      hint: "Navigate to the Data Manager to see the raw data files loaded into the platform.",
      delay: 3000,
    },
    {
      target: "[data-tour='data-preview']",
      title: "Preview Raw Data",
      content:
        "Click on a file to preview its contents. The Data Manager provides a quick-look grid for any loaded file — useful for verifying data quality before running detection. Notice the ISO-standard fields (ISIN, MIC) and FIX Protocol values (OrdType, ExecType).",
      placement: "left",
      action: "click",
      actionTarget:
        "[data-tour='data-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on a data file to preview it in the right panel.",
      validation: "[data-tour='data-preview']",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-list']",
      title: "Step 2: Entity Data Model",
      content:
        "The Entity Designer shows how data is structured. Use the Entity Details tab for Fields/Relationships, or the Relationship Graph tab for the visual entity map. Eight entities form the data model.",
      placement: "bottom",
      route: "/entities",
      action: "navigate",
      actionTarget: "[data-tour='entity-list']",
      hint: "Navigate to the Entity Designer to see the data model.",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Entity Relationships",
      content:
        "The relationship graph uses dagre auto-layout with minimap navigation and zoom controls. Click nodes to navigate between entities — the selected entity is highlighted with connected edges emphasized. Drag the divider to resize the graph pane.",
      placement: "top",
      action: "wait",
      hint: "Study the relationship graph. Trace connections from execution through order to trader and account.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Step 3: Run the Detection Pipeline",
      content:
        "The Pipeline Monitor shows the detection DAG — the sequence of calculations and detection models that process raw data into alerts. Each node represents a calculation step; edges show dependencies. The DAG ensures calculations execute in the correct order.",
      placement: "right",
      route: "/pipeline",
      action: "navigate",
      actionTarget: "[data-tour='pipeline-dag']",
      hint: "Navigate to the Pipeline Monitor to see the detection pipeline.",
      delay: 2500,
    },
    {
      target: "[data-tour='pipeline-run']",
      title: "Execute the Pipeline",
      content:
        "Click 'Run Pipeline' to execute all detection models on the loaded data. The DAG nodes animate as each calculation completes — green for success, red for failure. When finished, new alerts appear in the Risk Case Manager.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='pipeline-run']",
      hint: "Click the Run Pipeline button. Watch the DAG nodes animate as calculations execute.",
      delay: 3500,
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Step 4: Investigate Alerts",
      content:
        "The Risk Case Manager shows all generated alerts. Sort by score to find the highest-priority cases. Each alert includes a full investigation package: score breakdown, calculation trace DAG, market data chart, related orders, and settings trace.",
      placement: "bottom",
      route: "/alerts",
      action: "navigate",
      actionTarget: "[data-tour='alert-grid']",
      hint: "Navigate to the Risk Case Manager and sort by score to find the top alert.",
      delay: 2500,
    },
    {
      target: "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      title: "Drill Into an Alert",
      content:
        "Click the top alert to open its detail view. Review the score breakdown to understand why it triggered, the market data chart for price context, and related orders for the specific trades involved. This is the core investigation workflow.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      hint: "Click the top alert row to open its detail panel and review the investigation data.",
      delay: 3000,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Step 5: Tune Thresholds",
      content:
        "Based on the investigation, you may want to adjust detection sensitivity. The Settings Manager lets you modify thresholds — lower them to catch more activity, raise them to reduce false positives. Use the Resolution Tester to verify how changes affect specific products.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to the Settings Manager to review and tune detection thresholds.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Step 6: Review Detection Models",
      content:
        "The Model Composer lets you review and modify the detection models that generated the alerts. Each model defines which calculations to run, how to score them, and what thresholds trigger alerts. Use the validation panel to ensure model integrity.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to the Model Composer to review the detection models.",
      delay: 2500,
    },
    {
      target: "[data-tour='regulatory-cards']",
      title: "Step 7: Regulatory Compliance",
      content:
        "The Regulatory Map shows how your detection models map to regulatory obligations. Coverage cards indicate which obligations are fully covered, partially covered, or have gaps. The traceability graph provides end-to-end lineage from regulation to detection logic.",
      placement: "right",
      route: "/regulatory",
      action: "navigate",
      actionTarget: "[data-tour='regulatory-cards']",
      hint: "Navigate to the Regulatory Map to check compliance coverage.",
      delay: 2500,
    },
    {
      target: "[data-tour='regulatory-graph']",
      title: "Regulatory Traceability",
      content:
        "The traceability graph connects regulatory obligations to detection models to calculations. This proves to regulators that every required surveillance capability is implemented and can be traced to specific detection logic.",
      placement: "left",
      action: "wait",
      hint: "Review the traceability graph. Ensure all obligations have at least one connected detection model.",
      delay: 3000,
    },
    {
      target: "[data-tour='dashboard-cards']",
      title: "Step 8: Return to Dashboard",
      content:
        "Complete the loop by returning to the Dashboard. The summary metrics now reflect the full detection run — total alerts, score distributions, and model coverage. From here you can start a new investigation cycle or drill into any area for deeper analysis.",
      placement: "bottom",
      route: "/dashboard",
      action: "navigate",
      actionTarget: "[data-tour='dashboard-cards']",
      hint: "Navigate back to the Dashboard to see the full picture.",
      delay: 2500,
    },
    {
      target: "[data-tour='dashboard-triggers']",
      title: "Full Platform Demo Complete",
      content:
        "You've completed the full platform walkthrough: data ingestion → entity model → pipeline execution → alert investigation → threshold tuning → model review → regulatory compliance → dashboard summary. This end-to-end flow demonstrates every capability of the trade surveillance platform.",
      placement: "left",
      action: "wait",
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
  s19_explore_entity_model: S19_EXPLORE_ENTITY_MODEL,
  s20_import_preview_data: S20_IMPORT_PREVIEW_DATA,
  s21_alert_investigation: S21_ALERT_INVESTIGATION,
  s22_cross_alert_analysis: S22_CROSS_ALERT_ANALYSIS,
  s23_regulatory_audit: S23_REGULATORY_AUDIT,
  s24_oob_metadata_review: S24_OOB_METADATA_REVIEW,
  s25_full_platform_demo: S25_FULL_PLATFORM_DEMO,
};
