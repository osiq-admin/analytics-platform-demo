import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Lineage (S36-S39)


// ==========================================================================
// S36: Explore End-to-End Lineage
// ==========================================================================

const S36_EXPLORE_LINEAGE: ScenarioDefinition = {
  id: "s36_explore_lineage",
  name: "Explore End-to-End Lineage",
  description:
    "Navigate to Data Lineage, select execution entity, explore the hero graph with tier swim lanes, click edges to see field mappings, toggle regulatory overlay, and explore the surveillance coverage matrix.",
  category: "lineage",
  difficulty: "beginner",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='lineage-view']",
      title: "Data Lineage View",
      content: "Navigate to the Data Lineage view to see the end-to-end data pipeline.",
      action: "navigate",
      route: "/lineage",
      placement: "center",
      hint: "Navigate to Data Lineage",
      delay: 500,
    },
    {
      target: "[data-tour='lineage-toolbar']",
      title: "Entity & Layer Selection",
      content: "Use entity chips to select which entities to visualize. Toggle layer chips to add field mappings, calculation chains, or regulatory requirements.",
      action: "wait",
      placement: "bottom",
      hint: "Select entities and layers",
      delay: 1500,
    },
    {
      target: "[data-tour='lineage-hero-graph']",
      title: "Hero Graph Exploration",
      content: "The tier swim lane graph shows data flowing through Landing → Bronze → Silver → Gold. Quality badges on each node show ISO 8000 scores. Click an edge to see field mapping details.",
      action: "wait",
      placement: "bottom",
      hint: "Explore the graph — click nodes and edges",
      delay: 2000,
    },
    {
      target: "[data-tour='lineage-regulatory-toggle']",
      title: "Regulatory Overlay",
      content: "Toggle the regulatory overlay to see which regulations apply to each data node and field.",
      action: "click",
      placement: "bottom",
      hint: "Click the Regulatory button",
      delay: 1000,
    },
    {
      target: "[data-tour='lineage-coverage-btn']",
      title: "Surveillance Coverage Matrix",
      content: "Click to open the products × abuse types coverage matrix. Green cells = covered by detection models, red = gaps requiring attention.",
      action: "click",
      placement: "bottom",
      hint: "Click Surveillance Coverage",
      delay: 1000,
    },
  ],
};


// ==========================================================================
// S37: Trace a Regulatory-Required Field
// ==========================================================================

const S37_TRACE_FIELD: ScenarioDefinition = {
  id: "s37_trace_regulatory_field",
  name: "Trace a Regulatory-Required Field",
  description:
    "Switch to Field Tracing tab, select execution.price, follow the transformation chain through tiers, note quality scores at each hop, check regulatory badges.",
  category: "lineage",
  difficulty: "intermediate",
  estimatedMinutes: 4,
  steps: [
    {
      target: "[data-tour='lineage-tabs']",
      title: "Switch to Field Tracing",
      content: "Click the Field Tracing tab to explore field-level provenance.",
      action: "navigate",
      route: "/lineage",
      placement: "bottom",
      hint: "Click the Field Tracing tab",
      delay: 500,
    },
    {
      target: "[data-tour='lineage-field-trace']",
      title: "Select Entity & Field",
      content: "Choose 'execution' from the entity dropdown, then select 'price' from the field dropdown. Click Trace to follow the field through all tiers.",
      action: "wait",
      placement: "bottom",
      hint: "Select execution entity and price field",
      delay: 1500,
    },
    {
      target: "[data-tour='lineage-field-trace']",
      title: "Review Field Chain",
      content: "The chain shows: Landing (price, string) → Bronze (price, decimal, CAST) → Silver (exec_price, decimal, VALIDATE) → Gold (agg_value, decimal, AGGREGATE). Quality scores appear at each hop.",
      action: "wait",
      placement: "bottom",
      hint: "Follow the transformation chain",
      delay: 2000,
    },
  ],
};


// ==========================================================================
// S38: Analyze Impact of a Change
// ==========================================================================

const S38_IMPACT_ANALYSIS: ScenarioDefinition = {
  id: "s38_analyze_impact",
  name: "Analyze Impact of a Change",
  description:
    "Switch to Impact Analysis tab, select a Gold tier node, run downstream impact, observe hard vs soft impact counts, use the what-if slider to simulate a threshold change.",
  category: "lineage",
  difficulty: "advanced",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='lineage-tabs']",
      title: "Switch to Impact Analysis",
      content: "Click the Impact Analysis tab to explore change impact.",
      action: "navigate",
      route: "/lineage",
      placement: "bottom",
      hint: "Click the Impact Analysis tab",
      delay: 500,
    },
    {
      target: "[data-tour='lineage-impact-direction']",
      title: "Set Direction",
      content: "Choose 'downstream' to see what depends on your selected node. 'Upstream' shows what feeds into it. 'Both' shows the full blast radius.",
      action: "wait",
      placement: "bottom",
      hint: "Select a direction",
      delay: 1000,
    },
    {
      target: "[data-tour='lineage-impact-graph']",
      title: "Review Impact",
      content: "Hard-impact nodes (via MUST_PASS edges) are highlighted in red — these break the pipeline if changed. Soft-impact nodes (via OPTIONAL edges) are amber — they degrade quality.",
      action: "wait",
      placement: "bottom",
      hint: "Observe hard vs soft impact distinction",
      delay: 2000,
    },
    {
      target: "[data-tour='lineage-whatif']",
      title: "What-If Simulator",
      content: "Select a setting, adjust the threshold slider, and preview how alert counts would change. Before modifying detection thresholds, see the blast radius.",
      action: "wait",
      placement: "top",
      hint: "Use the what-if slider",
      delay: 1500,
    },
  ],
};


// ==========================================================================
// S39: Alert Explainability Tunnel
// ==========================================================================

const S39_ALERT_EXPLAINABILITY: ScenarioDefinition = {
  id: "s39_alert_explainability",
  name: "Alert Explainability Tunnel",
  description:
    "Navigate to Risk Case Manager, click an alert, click 'View Full Lineage', observe the highlighted provenance chain from source data to the specific alert.",
  category: "lineage",
  difficulty: "intermediate",
  estimatedMinutes: 4,
  steps: [
    {
      target: "[data-tour='risk-case-list']",
      title: "Start at Risk Cases",
      content: "Navigate to the Risk Case Manager and click on any alert to see its details.",
      action: "navigate",
      route: "/alerts",
      placement: "center",
      hint: "Navigate to Risk Cases and click an alert",
      delay: 500,
    },
    {
      target: "[data-tour='calculation-trace']",
      title: "View Calculation Trace",
      content: "In the alert detail panel, find the Calculation Trace section showing how the alert score was computed.",
      action: "wait",
      placement: "right",
      hint: "Find the calculation trace panel",
      delay: 1500,
    },
    {
      target: "[data-tour='lineage-hero-graph']",
      title: "Full Provenance Chain",
      content: "Click 'View Full Lineage' to jump to the Data Lineage view. The exact path from source data → tiers → calcs → model → this alert is highlighted. All other nodes dim to show the explainability tunnel.",
      action: "wait",
      placement: "bottom",
      hint: "Observe the highlighted provenance chain",
      delay: 2000,
    },
  ],
};


export const lineageScenarios: Record<string, ScenarioDefinition> = {
  s36_explore_lineage: S36_EXPLORE_LINEAGE,
  s37_trace_regulatory_field: S37_TRACE_FIELD,
  s38_analyze_impact: S38_IMPACT_ANALYSIS,
  s39_alert_explainability: S39_ALERT_EXPLAINABILITY,
};
