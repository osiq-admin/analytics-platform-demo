import type { TourDefinition } from "../../stores/tourStore.ts";

export const overviewTour: TourDefinition = {
  id: "overview",
  name: "App Overview",
  description: "Get oriented with the main areas of the analytics platform.",
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Navigation Sidebar",
      content: "The sidebar organizes views into 6 workflow-ordered groups: Define, Ingest, Govern, Detect, Investigate, and Advanced.",
      placement: "right",
    },
    {
      target: "[data-tour='demo-toolbar']",
      title: "Demo Controls",
      content: "Use these controls to step through the demo scenario. Reset starts fresh, Step advances one checkpoint, End skips to the final state.",
      placement: "bottom",
    },
    {
      target: "[data-tour='theme-toggle']",
      title: "Theme & Tour",
      content: "Toggle light/dark mode, or start a guided tour for the current view.",
      placement: "bottom",
    },
    {
      target: "[data-tour='theme-toggle']",
      title: "Architecture Traceability",
      content: "Click the Trace button to overlay architecture info icons on every section. Each icon reveals which files, APIs, metadata, stores, and technologies control that section, plus a metadata-maturity analysis.",
      placement: "bottom" as const,
    },
  ],
};
