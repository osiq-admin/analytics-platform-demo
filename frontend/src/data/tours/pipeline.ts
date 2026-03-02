import type { TourDefinition } from "../../stores/tourStore.ts";


export const pipelineTour: TourDefinition = {
  id: "pipeline",
  name: "Pipeline Monitor Tour",
  description: "Visualize and run the calculation pipeline.",
  steps: [
    {
      target: "[data-tour='pipeline-dag']",
      title: "Pipeline DAG",
      content: "Directed acyclic graph showing the calculation pipeline. Each node is a calculation step with dependencies.",
      placement: "bottom",
      route: "/pipeline",
    },
    {
      target: "[data-tour='pipeline-run']",
      title: "Run Pipeline",
      content: "Execute the full calculation and detection pipeline. Progress updates in real-time.",
      placement: "left",
    },
    {
      target: "[data-tour='pipeline-stages']",
      title: "Medallion Pipeline Stages",
      content: "The pipeline stages are shown as a row of clickable stage buttons loaded from medallion metadata. Click any stage button to execute that tier-to-tier transformation individually.",
      placement: "bottom",
    },
  ],
};
