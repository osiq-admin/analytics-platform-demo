import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 14. Regulatory Map
// --------------------------------------------------------------------------
export const regulatoryOperations: ViewOperations = {
  viewId: "regulatory",
  label: "Regulatory Map",
  operations: [
    {
      id: "view_coverage",
      name: "View Regulatory Coverage",
      description:
        "See which regulatory requirements (MAR, MiFID II, Dodd-Frank) are covered by the current detection model portfolio.",
      scenarioId: "s23_regulatory_audit",
    },
    {
      id: "explore_graph",
      name: "Explore Traceability Graph",
      description:
        "Navigate the interactive graph with smoothstep edges, edge labels, MiniMap, and zoom controls. Click nodes to see details with descriptions in the bottom pane. Drag the divider to resize.",
    },
    {
      id: "browse_regulation_details",
      name: "Browse Regulation Details",
      description:
        "Switch to the Regulation Details tab for a structured AG Grid table of all regulations and articles. Shows coverage status with color badges. Click a row to see the full article description.",
    },
    {
      id: "identify_gaps",
      name: "Identify Coverage Gaps",
      description:
        "Find regulatory requirements that are not yet covered by any detection model — prioritize model development.",
    },
    {
      id: "review_suggestions",
      name: "Review Model Suggestions",
      description:
        "See AI-generated suggestions for new detection models that would address identified regulatory gaps.",
    },
    {
      id: "view_iso_standards",
      name: "View ISO Standards",
      description:
        "Browse ISO standards registry (ISO 6166, 10383, 10962, 4217, 3166-1, 8601) with field mappings and validation rules.",
    },
    {
      id: "view_compliance_requirements",
      name: "View Compliance Requirements",
      description:
        "Browse granular compliance requirements mapped to detection models, calculations, and entity fields. Each requirement links to its implementation (model, calc, or field). Status shows implemented, partial, or planned.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Green nodes indicate covered articles; red indicates gaps requiring attention",
    "Click any node to see details with descriptions in the full-width bottom pane",
    "Use the tab switcher to toggle between the Traceability Map and Regulation Details table",
    "Drag the horizontal divider between panes to resize. Sizes persist across sessions.",
    "The gap analysis prioritizes requirements by regulatory importance and risk",
  ],
};
