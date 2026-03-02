import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// ---------------------------------------------------------------------------
// Data Lineage Operations (10)
// ---------------------------------------------------------------------------
export const lineageOperations: ViewOperations = {
  viewId: "lineage",
  label: "Data Lineage",
  operations: [
    {
      id: "view_tier_lineage",
      name: "View Entity Tier Lineage with Quality Overlay",
      description:
        "Select an entity from the entity chips to see its data flow through Landing → Bronze → Silver → Gold. Each tier node shows ISO 8000 quality scores (completeness, validity, accuracy, consistency, timeliness, uniqueness).",
      scenarioId: "s36_explore_lineage",
    },
    {
      id: "toggle_regulatory",
      name: "Toggle Regulatory Compliance Overlay",
      description:
        "Click the Regulatory button to show which regulations (MAR Art.16, MiFID II RTS 25, Dodd-Frank, FINRA) require which data fields. Badges appear on nodes and fields.",
      scenarioId: "s36_explore_lineage",
    },
    {
      id: "view_coverage",
      name: "View Surveillance Coverage Matrix",
      description:
        "Click Surveillance Coverage to open the products × abuse types matrix. Green cells = covered by detection models, red cells = gaps. Includes regulatory gap analysis.",
      scenarioId: "s36_explore_lineage",
    },
    {
      id: "trace_field",
      name: "Trace Field Transformation Chain",
      description:
        "Switch to the Field Tracing tab, select an entity and field, then click Trace to see how the field transforms through each tier with data types, expressions, and quality scores at each hop.",
      scenarioId: "s37_trace_regulatory_field",
    },
    {
      id: "browse_tier_transitions",
      name: "Browse Tier Transition Mappings",
      description:
        "In the Field Tracing tab, view all field mappings for a specific tier transition (e.g., Bronze → Silver) to understand how source fields map to target fields with transformation types.",
    },
    {
      id: "explore_calc_chain",
      name: "Explore Calculation → Alert Chain",
      description:
        "In the Lineage Explorer, calc and detection model nodes appear below Gold tier. The chain shows entity fields → calculation inputs → calc DAG → detection model scoring → alert aggregates.",
    },
    {
      id: "run_impact_analysis",
      name: "Run Impact Analysis (Weighted BFS)",
      description:
        "Switch to Impact Analysis tab, select a node, choose direction (upstream/downstream/both), and click Analyze. MUST_PASS edges propagate hard impact (red), OPTIONAL edges propagate soft impact (amber).",
      scenarioId: "s38_analyze_impact",
    },
    {
      id: "whatif_threshold",
      name: "Use What-If Threshold Simulator",
      description:
        "In the Impact Analysis tab, select a detection setting, adjust the threshold slider, and preview projected alert count changes before making actual modifications.",
      scenarioId: "s38_analyze_impact",
    },
    {
      id: "alert_explainability",
      name: "View Alert Explainability Tunnel",
      description:
        "Click any alert node in the graph (or navigate from Risk Case Manager → View Full Lineage) to see the full data-to-alert provenance chain highlighted. Non-relevant nodes dim to opacity 0.15.",
      scenarioId: "s39_alert_explainability",
    },
    {
      id: "navigate_from_rcm",
      name: "Navigate from Risk Case Manager to Lineage",
      description:
        "In Risk Case Manager, click an alert → find 'View Full Lineage' in the Calculation Trace panel → one click takes you to the DataLineage view with the alert's provenance chain highlighted.",
      scenarioId: "s39_alert_explainability",
    },
  ],
  tips: [
    "Use the entity multi-select to view multiple entities simultaneously in the hero graph.",
    "Layer toggle chips let you compose the graph: add Fields for column-level lineage, Entity FKs for cross-entity relationships, or Regulations for compliance mapping.",
    "Double-click a tier node in the hero graph to switch to Field Tracing for that entity.",
    "The What-If simulator shows projected alert counts — it doesn't change actual thresholds.",
  ],
};
