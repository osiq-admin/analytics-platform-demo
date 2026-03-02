import type { TourDefinition } from "../../stores/tourStore.ts";


export const regulatoryTour: TourDefinition = {
  id: "regulatory",
  name: "Regulatory Traceability Tour",
  description: "Explore the regulatory coverage map and gap analysis.",
  steps: [
    {
      target: "[data-tour='regulatory-cards']",
      title: "Coverage Summary",
      content: "At a glance: how many regulatory requirements are covered by detection models, and how many have gaps.",
      placement: "bottom",
      route: "/regulatory",
    },
    {
      target: "[data-tour='regulatory-graph']",
      title: "Traceability Graph",
      content: "Interactive graph showing the full chain: Regulations → Articles → Detection Models → Calculations. Smoothstep edges with labels show relationship types. Use the MiniMap (bottom-right) and zoom Controls to navigate. Red nodes indicate coverage gaps.",
      placement: "bottom",
    },
    {
      target: "[data-tour='regulatory-detail']",
      title: "Node Details",
      content: "Click any node in the graph to see its details — regulation info, model parameters, calculation metadata, and descriptions. The detail pane is below the graph — drag the divider to resize.",
      placement: "top",
    },
    {
      target: "[data-tour='regulatory-details-grid']",
      title: "Regulation Details Table",
      content: "Switch to the Regulation Details tab for a structured table view of all regulations and articles. Shows regulation name, jurisdiction, article, title, and coverage status. Click any row to see the full article description below.",
      placement: "bottom",
    },
    {
      target: "[data-tour='regulatory-suggestions']",
      title: "Suggestions & Gap Analysis",
      content: "Automated suggestions for improving regulatory coverage — coverage gaps that need new models, and existing models that could be strengthened.",
      placement: "top",
    },
  ],
};
