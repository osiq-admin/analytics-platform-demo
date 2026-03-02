import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Pipeline (S30)


// ==========================================================================
// S30: Pipeline Orchestration — Silver-to-Gold Execution
// ==========================================================================

const S30_PIPELINE_ORCHESTRATION: ScenarioDefinition = {
  id: "s30_pipeline_orchestration",
  name: "Pipeline Orchestration",
  description:
    "Run the Silver-to-Gold pipeline stage, observe calculation DAG execution, detection model evaluation, and contract validation — all driven by metadata.",
  category: "pipeline",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='pipeline-stages']",
      title: "Pipeline Stages",
      content:
        "The medallion pipeline stages are loaded from pipeline_stages.json metadata. Each stage defines a tier-to-tier transformation with dependencies.",
      placement: "bottom",
      route: "/pipeline",
      action: "navigate",
      actionTarget: "[data-tour='pipeline-stages']",
      hint: "Navigate to Pipeline using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Execution DAG",
      content:
        "The DAG visualization shows true dependency edges from the depends_on field in calculation metadata — not a linear chain.",
      placement: "bottom",
      action: "wait",
      hint: "Observe the DAG panel.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-run']",
      title: "Run the Pipeline",
      content:
        "Click Run Pipeline to execute the full calculation DAG with SettingsResolver parameter substitution.",
      placement: "left",
      action: "click",
      actionTarget: "[data-tour='pipeline-run']",
      hint: "Click the Run Pipeline button.",
      delay: 5000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Observe DAG Execution",
      content:
        "Watch the DAG nodes update with status colors: green for completed, red for errors.",
      placement: "bottom",
      action: "wait",
      hint: "Watch the DAG panel as calculations execute.",
      delay: 4000,
    },
    {
      target: "[data-tour='medallion-graph']",
      title: "Medallion Architecture",
      content:
        "Navigate to the Medallion Overview to see the 11-tier architecture with execution status indicators.",
      placement: "bottom",
      route: "/medallion",
      action: "navigate",
      actionTarget: "[data-tour='medallion-graph']",
      hint: "Navigate to the Medallion Architecture view.",
      delay: 3000,
    },
    {
      target: "[data-tour='medallion-tier-detail']",
      title: "Tier Detail + Run Stage",
      content:
        "Click the Gold tier to see its data contracts, pipeline stages, and a Run Stage button. The Pipeline Orchestrator reads stage metadata to dispatch the correct transformation.",
      placement: "left",
      action: "wait",
      hint: "Click on the Gold tier node, then look at the detail panel.",
      delay: 4000,
    },
  ],
};

export const pipelineScenarios: Record<string, ScenarioDefinition> = {
  s30_pipeline_orchestration: S30_PIPELINE_ORCHESTRATION,
};
