import type { TourDefinition } from "../../stores/tourStore.ts";


export const modelsTour: TourDefinition = {
  id: "models",
  name: "Model Composer Tour",
  description: "Build and deploy detection models.",
  steps: [
    {
      target: "[data-tour='model-list']",
      title: "Detection Models",
      content: "All detection models in the system. Each model combines calculations, thresholds, and scoring logic.",
      placement: "right",
      route: "/models",
    },
    {
      target: "[data-tour='model-detail']",
      title: "Model Configuration",
      content: "View and edit model parameters: calculation chain with strictness levels, scoring logic, and deploy & run actions.",
      placement: "left",
    },
  ],
};
