import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 11. Use Case Studio
// --------------------------------------------------------------------------
export const use_casesOperations: ViewOperations = {
  viewId: "use-cases",
  label: "Use Case Studio",
  operations: [
    {
      id: "create_use_case",
      name: "Create Use Case",
      description:
        "Define a new detection use case: describe the surveillance scenario, expected behavior, and acceptance criteria.",
      scenarioId: "s15_create_use_case",
    },
    {
      id: "add_sample_data",
      name: "Add Sample Data",
      description:
        "Attach sample trade data that demonstrates the detection scenario — used for testing and validation.",
    },
    {
      id: "set_expected_results",
      name: "Set Expected Results",
      description:
        "Define what the detection model should find: expected alerts, scores, and triggered rules.",
    },
    {
      id: "run_use_case",
      name: "Run Use Case",
      description:
        "Execute the use case against the detection engine and compare actual results with expected outcomes.",
    },
    {
      id: "submit_use_case",
      name: "Submit for Review",
      description:
        "Submit a completed use case to the review queue for approval by compliance or model validation teams.",
      scenarioId: "s16_submit_use_case",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Use cases serve as living documentation of detection requirements",
    "Sample data should cover both positive (alert expected) and negative (no alert) scenarios",
    "Expected results must specify exact scores and triggered rules for validation",
    "Submitted use cases appear in the Submissions Queue for review",
  ],
};
