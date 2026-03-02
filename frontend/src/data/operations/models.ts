import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 10. Model Composer
// --------------------------------------------------------------------------
export const modelsOperations: ViewOperations = {
  viewId: "models",
  label: "Model Composer",
  operations: [
    {
      id: "create_model",
      name: "Create Detection Model",
      description:
        "Build a new detection model from scratch using the wizard — define name, description, detection logic, thresholds, and scoring rules.",
      scenarioId: "s11_full_model_wizard",
    },
    {
      id: "edit_model",
      name: "Edit Existing Model",
      description:
        "Select a model to modify its calculations, settings, score weights, and alert generation rules.",
      scenarioId: "s12_clone_modify_model",
    },
    {
      id: "add_calc_to_model",
      name: "Add Calculation to Model",
      description:
        "Attach new calculations to a model to expand its detection coverage or add scoring dimensions.",
      scenarioId: "s13_add_calc_to_model",
    },
    {
      id: "run_dry_test",
      name: "Run Dry Test",
      description:
        "Execute a model against sample data without generating live alerts to verify detection logic before deployment.",
    },
    {
      id: "view_examples",
      name: "View Model Examples",
      description:
        "Browse pre-built model examples (wash trading, spoofing, insider dealing, ramping) for reference and learning.",
      scenarioId: "s14_model_best_practices",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Start with the wizard for guided model creation — it walks through each step",
    "Clone an existing model to use it as a starting point for customization",
    "The dry test validates detection logic without affecting the alert database",
    "Check the validation panel for missing fields or configuration issues",
  ],
};
