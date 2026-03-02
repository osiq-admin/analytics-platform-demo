import type { TourDefinition } from "../../stores/tourStore.ts";


export const medallionTour: TourDefinition = {
  id: "medallion",
  name: "Medallion Architecture",
  description: "Explore the 11-tier medallion data architecture with data contracts, transformations, and pipeline stages",
  steps: [
    {
      target: "[data-tour='medallion-graph']",
      title: "Tier Architecture Graph",
      content: "This React Flow diagram shows all 11 tiers of the medallion architecture. Tiers are arranged left-to-right from raw data (Landing) through processed (Gold/Platinum) to operational tiers (Logging, Metrics, Archive). Edges show data contracts between tiers.",
      placement: "bottom",
      route: "/medallion",
    },
    {
      target: "[data-tour='medallion-tier-detail']",
      title: "Tier Detail Panel",
      content: "Click any tier node to see its properties: data state, storage format, retention policy, quality gate, and access level. Related data contracts and pipeline stages are shown below.",
      placement: "left",
      route: "/medallion",
    },
    {
      target: "[data-tour='medallion-run-stage']",
      title: "Run Pipeline Stage",
      content: "Execute a pipeline stage directly from the tier detail panel. The orchestrator reads stage metadata to dispatch the correct transformation.",
      placement: "left",
    },
  ],
};
