import type { TourDefinition } from "../../stores/tourStore.ts";


export const act2_guideTour: TourDefinition = {
  id: "act2_guide",
  name: "Act 2: Model Composition",
  description: "Learn how to compose and tune detection models.",
  steps: [
    {
      target: "[data-tour='model-list']",
      title: "Act 2: Model Composition",
      content: "This guide shows how detection models are built, configured, and deployed.",
      placement: "right",
      route: "/models",
    },
    {
      target: "[data-tour='model-detail']",
      title: "Model Parameters",
      content: "Each model defines its calculation chain and strictness levels. Click Edit to view the detection SQL and modify parameters.",
      placement: "left",
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Score Steps",
      content: "Score steps define the escalation ladder — how accumulated scores trigger review, escalation, or firing.",
      placement: "bottom",
      route: "/settings",
    },
    {
      target: "[data-tour='mapping-selector']",
      title: "Input Mappings",
      content: "The Mapping Studio defines source-to-target field mappings between entities, with transform types and validation.",
      placement: "right",
      route: "/mappings",
    },
    {
      target: "[data-tour='editor-layer-badge']",
      title: "OOB Layer Separation",
      content: "Notice the layer badges — OOB items ship with the platform. When you customize one, it becomes 'Modified' and can be reset to the original.",
      placement: "bottom",
      route: "/editor",
    },
  ],
};
