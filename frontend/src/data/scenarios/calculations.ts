import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Calculations (S7-S10)


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
    "Walk through the Calculations view to understand calculation layers, dependencies, and the DAG visualization. Learn how transaction, time window, aggregation, and derived layers chain together.",
  category: "calculations",
  difficulty: "beginner",
  estimatedMinutes: 4,
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Navigate to Calculations",
      content:
        "The Calculations view is the central hub for browsing all calculation definitions. It shows the full list, a dependency DAG, and detailed views of each calculation.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Click 'Calculations' in the sidebar under the Define section.",
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
      target: ".ag-body-viewport .ag-row[row-index='7']",
      title: "Select a Derived Calculation",
      content:
        "Now let's look at a derived-layer calculation. 'Wash Detection' sits at the top of the dependency chain — it depends on aggregation-layer calcs which in turn depend on time windows and transactions.",
      placement: "right",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row[row-index='7']",
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
      target: "[data-action='filter-transaction']",
      title: "Layer Filters",
      content:
        "Use the layer filter buttons at the top to isolate calculations by layer. The 4-layer architecture enforces a clean execution order: transaction → time_window → aggregation → derived. Each layer can only depend on calculations from the same or earlier layers.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='filter-derived']",
      hint: "Click the 'Derived' filter button to show only derived-layer calculations.",
      delay: 3000,
    },
    {
      target: "[data-action='filter-all']",
      title: "DAG Exploration Complete",
      content:
        "You now understand the calculation layer hierarchy and dependency graph. The DAG ensures calculations execute in the correct order: transactions first, then time windows, aggregations, and finally derived scores. Next, try creating a calculation (S8) or exploring AI-assisted creation (S9).",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='filter-all']",
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
    "Create a new derived-layer calculation using the Editor. Write SQL logic with $param references, define inputs and outputs, then verify the result in Calculations.",
  category: "calculations",
  difficulty: "intermediate",
  estimatedMinutes: 8,
  prerequisites: ["s7_explore_calc_dag"],
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Open the Editor",
      content:
        "We'll create a new calculation using the Editor. This gives you full control over the calculation definition including SQL logic, parameters, inputs, and outputs.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to Editor using the sidebar (under Configure).",
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
      title: "Switch to Calculations Form",
      content:
        "For a guided creation experience, let's use the Calculations view's built-in form. Navigate to Calculations where you can click '+ New Calculation'.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Navigate to Calculations using the sidebar.",
      delay: 2500,
    },
    {
      target: "[data-action='new-calculation']",
      title: "Create New Calculation",
      content:
        "Click '+ New Calculation' to open the creation form. This provides a structured form with fields for every part of the calculation definition.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='new-calculation']",
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
      target: ".space-y-3 label:nth-last-of-type(2) input",
      title: "Add Dependencies",
      content:
        "List the calc IDs this calculation depends on, separated by commas. Since our SQL references calc_business_date_window, add 'business_date_window'. The pipeline will ensure dependencies execute first.",
      placement: "left",
      action: "type",
      actionTarget: ".space-y-3 label:nth-last-of-type(2) input",
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
      target: "[data-action='create-calculation']",
      title: "Save the Calculation",
      content:
        "Click 'Create Calculation' to persist the new definition. The system validates required fields (calc_id, name) and saves the JSON to the backend. It will appear in the calculation list and DAG immediately.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='create-calculation']",
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
    "Use the Assistant to generate a calculation from natural language. Describe what you want to compute, review the AI-generated definition with confidence scoring, refine if needed, and save.",
  category: "calculations",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  prerequisites: ["s7_explore_calc_dag"],
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Navigate to Assistant",
      content:
        "The Assistant can help generate calculation definitions from natural language descriptions. It understands the platform's calculation structure, layers, and parameter syntax.",
      placement: "right",
      route: "/assistant",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Click 'Assistant' in the sidebar to open the AI query interface.",
      delay: 2500,
    },
    {
      target: "[data-tour='assistant-scenarios']",
      title: "Assistant Modes",
      content:
        "The Assistant runs in mock mode for this demo — pre-scripted conversations demonstrate the capabilities. In a live deployment, it connects to Claude API for real-time generation. Mock scenarios show calculation generation, data exploration, and more.",
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
      title: "Verify in Calculations",
      content:
        "After accepting an AI-generated calculation, navigate to Calculations to verify it appears in the list and DAG. The calculation integrates seamlessly with manually created ones.",
      placement: "right",
      route: "/metadata",
      action: "navigate",
      actionTarget: "[data-tour='sidebar']",
      hint: "Navigate to Calculations to verify the new calculation appears in the list.",
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
      hint: "Navigate to Calculations using the sidebar.",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row[row-index='2']",
      title: "Select business_date_window",
      content:
        "Click on 'Business Date Window' — a time_window layer calculation that uses a $cutoff_time parameter. This parameter determines what time of day marks the boundary between business dates.",
      placement: "right",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row[row-index='2']",
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
        "Let's switch to the Editor to see the full JSON definition, including the parameters block that maps $param names to their settings sources.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to Editor using the sidebar.",
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
        "Now let's trace to the other end — Settings. Navigate here and look for 'business_date_cutoff'. This is where the actual parameter value is configured, with possible overrides per asset class or exchange.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to Settings and look for the 'business_date_cutoff' setting.",
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
      hint: "Navigate to Pipeline to see how parameters are resolved during execution.",
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

export const calculationsScenarios: Record<string, ScenarioDefinition> = {
  s7_explore_calc_dag: S7_EXPLORE_CALC_DAG,
  s8_create_manual_calc: S8_CREATE_MANUAL_CALC,
  s9_ai_calc_builder: S9_AI_CALC_BUILDER,
  s10_parameterize_calc: S10_PARAMETERIZE_CALC,
};
