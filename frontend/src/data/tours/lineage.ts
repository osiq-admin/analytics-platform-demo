import type { TourDefinition } from "../../stores/tourStore.ts";


// --------------------------------------------------------------------------
// Data Lineage Tour (5 steps)
// --------------------------------------------------------------------------
export const lineageTour: TourDefinition = {
  id: "lineage",
  name: "Data Lineage Tour",
  description: "Explore end-to-end data flow: tier pipeline, field tracing, impact analysis, and alert explainability.",
  steps: [
    {
      target: "[data-tour='lineage-hero-graph']",
      title: "Hero Graph",
      content: "This is your data pipeline — every node shows real-time quality, every edge shows transformations. Tier swim lanes flow left-to-right from Landing through Bronze, Silver, Gold.",
      placement: "bottom",
      route: "/lineage",
    },
    {
      target: "[data-tour='lineage-regulatory-toggle']",
      title: "Regulatory Overlay",
      content: "Toggle to see which regulations (MAR, MiFID II, Dodd-Frank, FINRA) require which data fields. Regulation badges appear on nodes and edges.",
      placement: "bottom",
      route: "/lineage",
    },
    {
      target: "[data-tour='lineage-field-trace']",
      title: "Field Tracing",
      content: "Click any field to trace its journey through every tier. See data type transformations, quality scores at each hop, and regulatory annotations.",
      placement: "bottom",
      route: "/lineage",
    },
    {
      target: "[data-tour='lineage-impact-graph']",
      title: "Impact Analysis",
      content: "Select a node and see everything it affects. MUST_PASS edges propagate hard impact (breaks pipeline), OPTIONAL edges propagate soft impact (degrades quality).",
      placement: "bottom",
      route: "/lineage",
    },
    {
      target: "[data-tour='lineage-whatif']",
      title: "Alert Explainability",
      content: "Click any alert to see the exact data path that produced it — from source data through tiers, calculations, and detection models. Full provenance, fully auditable.",
      placement: "top",
      route: "/lineage",
    },
  ],
};
