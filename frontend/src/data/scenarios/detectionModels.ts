import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Detection Models (S11-S14)


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
      title: "Models Overview",
      content:
        "Welcome to Models — the central hub for building and deploying detection models. The left panel lists existing models (Wash Trading, MPR, Insider Dealing, Spoofing). We'll create a brand-new model from scratch.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to Models using the sidebar.",
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
      target: "[data-action='next']",
      title: "Advance to Calculations",
      content:
        "Click 'Next' to proceed to Step 2: Calculations. The wizard validates that the name is filled before allowing you to continue.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
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
      target: "[data-action='next']",
      title: "Advance to Scoring",
      content:
        "With calculations selected, click 'Next' to configure scoring thresholds. Each selected calculation needs a threshold or score-steps mapping.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
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
      target: "[data-action='next']",
      title: "Advance to Query",
      content:
        "Click 'Next' to move to the Query step where you can write or auto-generate the detection SQL.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
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
      target: "[data-action='next']",
      title: "Review & Test",
      content:
        "Click 'Next' twice to pass through the Review step (read-only summary of all settings) and reach the Test Run step.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
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
        "The model list shows all 5 detection models. Each entry displays the model name, an OOB/Custom badge, and a calculation count. We'll explore and modify the 'Wash Trading — Full Day' model.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to Models using the sidebar.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list'] button:nth-child(2)",
      title: "Select Wash Trading — Full Day",
      content:
        "Click on 'Wash Trading — Full Day' — the platform's primary wash trading detection model. It uses multiple aggregation and derived calculations with MUST_PASS and OPTIONAL strictness levels.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='model-list'] button:nth-child(2)",
      hint: "Click on 'Wash Trading — Full Day' in the model list.",
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
      target: "[data-action='edit']",
      title: "Enter Edit Mode",
      content:
        "Click 'Edit' to open the model in the 7-step wizard pre-filled with its current configuration. This lets you modify any aspect of the model — name, calculations, scoring, or query.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='edit']",
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
      target: "[data-action='next']",
      title: "Go to Calculations Step",
      content:
        "Click 'Next' to navigate to the Calculations step where you can add or remove calculations from the model.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
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
      target: "[data-action='next']",
      title: "Advance to Scoring",
      content:
        "Proceed to the Scoring step to see how thresholds are configured for each selected calculation. Adjusting these values changes the model's sensitivity.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
      hint: "Click 'Next' to see the scoring configuration.",
      delay: 2500,
    },
    {
      target: "[data-action='cancel']",
      title: "Editing Complete",
      content:
        "You've seen how to edit an existing model's definition, calculations, and scoring. Click 'Cancel' to discard changes, or continue through the wizard and click 'Save Changes' at Step 7 to persist modifications.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='cancel']",
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
      hint: "Navigate to Models using the sidebar.",
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
      target: "[data-action='edit']",
      title: "Enter Edit Mode",
      content:
        "Click 'Edit' to open the wizard in edit mode. The right panel will switch to show three tabs: Validate, Preview, and Deps — these help you assess changes in real time.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='edit']",
      hint: "Click the 'Edit' button next to the model name.",
      delay: 2500,
    },
    {
      target: "[data-action='next']",
      title: "Navigate to Calculations",
      content:
        "Click 'Next' to skip past the Define step and go directly to the Calculations selection where we'll add a new calc.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
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
      target: "[data-action='tab-validation']",
      title: "Check the Validation Panel",
      content:
        "Switch to the Validate tab on the right panel. The ValidationPanel shows real-time completeness checks: whether the model has a name, enough calculations, scoring configured, and a query. Green checks mean ready; yellow warnings need attention.",
      placement: "left",
      action: "click",
      actionTarget: "[data-action='tab-validation']",
      hint: "Click the 'Validate' tab in the right panel to see completeness checks.",
      delay: 3000,
    },
    {
      target: "[data-action='tab-dependencies']",
      title: "Review the Dependency DAG",
      content:
        "Switch to the Deps tab to see the DependencyMiniDAG. This React Flow graph shows how your selected calculations depend on each other. Adding a new calc may introduce new upstream dependencies that the pipeline must resolve.",
      placement: "left",
      action: "click",
      actionTarget: "[data-action='tab-dependencies']",
      hint: "Click the 'Deps' tab to view the dependency graph for selected calculations.",
      delay: 3500,
    },
    {
      target: "[data-action='next']",
      title: "Configure and Test",
      content:
        "Proceed through Scoring (Step 3) to configure the new calculation's threshold, then continue to the Test Run step (Step 6). Click 'Run Test' to execute a dry run and see how the added calculation affects alert generation in the AG Grid preview.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
      hint: "Continue through the wizard steps. At Step 6 (Test Run), click 'Run Test' to see the impact.",
      delay: 3000,
    },
    {
      target: "[data-action='cancel']",
      title: "Impact Assessment Complete",
      content:
        "You've seen how adding a calculation affects the model's validation status, dependency graph, and test results. The right-panel tabs (Validate, Preview, Deps) give real-time feedback as you build. Save or cancel to finish.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='cancel']",
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
      hint: "Navigate to Models using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-action='examples']",
      title: "Open the Examples Drawer",
      content:
        "Click 'Examples' to open the slide-out drawer. It contains annotated examples of models, settings, and calculations — each with explanations of why they're structured that way. These serve as reference patterns for building new models.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='examples']",
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
      target: "[data-action='close-examples']",
      title: "Close Examples and Start Creating",
      content:
        "Close the drawer and start creating a new model to apply what you've learned from the examples.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='close-examples']",
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
      target: "[data-action='tab-validation']",
      title: "Use the Validation Panel",
      content:
        "The Validate tab on the right shows real-time completeness checks. As you fill in each wizard step, validations turn green. Best practice: all checks should be green before deploying. Missing fields (no description, no query) trigger yellow warnings.",
      placement: "left",
      action: "click",
      actionTarget: "[data-action='tab-validation']",
      hint: "Click the 'Validate' tab in the right panel. Watch how validations update as you fill in the form.",
      delay: 3500,
    },
    {
      target: "[data-action='tab-preview']",
      title: "Check Score Distribution",
      content:
        "Switch to the Preview tab to see a Recharts simulation of how scores would distribute across your selected calculations. Best practice: avoid models where all score weight concentrates in one calculation — aim for balanced contributions across multiple calcs.",
      placement: "left",
      action: "click",
      actionTarget: "[data-action='tab-preview']",
      hint: "Click the 'Preview' tab to see the score distribution simulation.",
      delay: 3500,
    },
    {
      target: "[data-action='tab-dependencies']",
      title: "Inspect the Dependency Graph",
      content:
        "Switch to the Deps tab to see the DependencyMiniDAG. Best practice: avoid circular patterns and excessive depth. A well-designed model selects calculations from 2-3 layers with clear upstream-to-downstream flow. Overlapping dependencies (two calcs sharing the same upstream) indicate potential redundancy.",
      placement: "left",
      action: "click",
      actionTarget: "[data-action='tab-dependencies']",
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

export const detectionModelsScenarios: Record<string, ScenarioDefinition> = {
  s11_full_model_wizard: S11_FULL_MODEL_WIZARD,
  s12_clone_modify_model: S12_CLONE_MODIFY_MODEL,
  s13_add_calc_to_model: S13_ADD_CALC_TO_MODEL,
  s14_model_best_practices: S14_MODEL_BEST_PRACTICES,
};
