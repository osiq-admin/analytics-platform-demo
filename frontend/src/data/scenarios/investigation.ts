import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Investigation (S21-S23)


// ==========================================================================
// Scenario Definitions — Investigation (S21-S23)
// ==========================================================================

// --------------------------------------------------------------------------
// S21: Alert Investigation Workflow (Beginner, 8 min)
// --------------------------------------------------------------------------
const S21_ALERT_INVESTIGATION: ScenarioDefinition = {
  id: "s21_alert_investigation",
  name: "Alert Investigation Workflow",
  description:
    "Full investigation flow from the Dashboard summary metrics through Risk Cases — sort, drill into an alert, review score breakdown, calculation trace DAG, market data chart, related orders, and settings trace.",
  category: "investigation",
  difficulty: "beginner",
  estimatedMinutes: 8,
  steps: [
    {
      target: "[data-tour='dashboard-cards']",
      title: "Dashboard — Summary Metrics",
      content:
        "Start your investigation on the Dashboard. The summary cards show key metrics: total alerts generated, alerts by severity, average score, and detection model coverage. These give you a high-level view of the current alert landscape before drilling in.",
      placement: "bottom",
      route: "/dashboard",
      action: "navigate",
      actionTarget: "[data-tour='dashboard-cards']",
      hint: "Navigate to the Dashboard using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='dashboard-by-model']",
      title: "Alerts by Detection Model",
      content:
        "The 'Alerts by Model' chart breaks down alerts across the 5 detection models: Wash Trading — Full Day, Wash Trading — Intraday, Market Price Ramping, Insider Dealing, and Spoofing / Layering. Note which model generates the most alerts — this indicates where to focus your investigation.",
      placement: "right",
      action: "wait",
      hint: "Review the chart to identify which detection model has the most alerts.",
      delay: 3500,
    },
    {
      target: "[data-tour='dashboard-scores']",
      title: "Score Distribution",
      content:
        "The score distribution histogram shows how alert scores are spread across ranges. Scores near the top (80-100) are high-confidence alerts that warrant immediate attention. A healthy distribution shows most alerts in the mid-range with fewer extreme scores.",
      placement: "left",
      action: "wait",
      hint: "Look at the score distribution. Identify the score range with the most alerts.",
      delay: 3500,
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Risk Cases — Alert Grid",
      content:
        "Navigate to Risk Cases to see individual alerts. The AG Grid displays every alert with columns for score, model, product, alert date, and status. We'll sort by score to find the highest-priority cases.",
      placement: "bottom",
      route: "/alerts",
      action: "navigate",
      actionTarget: "[data-tour='alert-grid']",
      hint: "Navigate to Risk Cases using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='alert-grid'] .ag-header-cell:first-child",
      title: "Sort by Score",
      content:
        "Click the Score column header to sort alerts by score descending. The highest-scoring alerts appear first — these have the strongest detection signals and should be investigated first.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='alert-grid'] .ag-header-cell:first-child",
      hint: "Click the Score column header to sort alerts. Click again to reverse the sort order.",
      delay: 2500,
    },
    {
      target: "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      title: "Open the Top Alert",
      content:
        "Click on the highest-scoring alert to open its detail view. The detail panel provides everything needed for investigation: score breakdown, calculation trace, market data, related orders, and settings context.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on the top row (highest score) to open the alert detail view.",
      delay: 2500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Score Breakdown",
      content:
        "The Score Breakdown panel shows how the total alert score was calculated. Each contributing calculation has its own sub-score, weight, and contribution to the final score. This explains *why* this alert was generated and which signals were strongest.",
      placement: "left",
      action: "wait",
      hint: "Review the score breakdown. Identify which calculation contributed the most to the total score.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Calculation Trace DAG",
      content:
        "The Calculation Trace DAG visualizes the dependency graph of calculations that produced this alert. Nodes represent individual calculations, edges show data flow. This lets you trace the logic from raw market data through intermediate calculations to the final alert score.",
      placement: "left",
      action: "wait",
      hint: "Study the DAG to understand the calculation pipeline. Follow the arrows from inputs to outputs.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Market Data Chart",
      content:
        "The OHLC candlestick chart shows the product's market data around the alert date. Price action, volume, and the alert event are overlaid. Look for unusual patterns — price spikes before the alert, abnormal volume, or price reversals that correlate with the suspicious activity.",
      placement: "left",
      action: "wait",
      hint: "Examine the candlestick chart. Look for price/volume anomalies around the alert date.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Related Orders",
      content:
        "The Related Orders table shows all orders and executions linked to this alert — the specific trades that triggered the detection. Check order types (MARKET vs LIMIT), timing, quantities, and whether the same account appears on both sides (wash trading indicator).",
      placement: "left",
      action: "wait",
      hint: "Review the related orders. Look for suspicious patterns: same account, opposing sides, close timestamps.",
      delay: 3500,
    },
    {
      target: ".flex-1.overflow-auto",
      title: "Settings Trace",
      content:
        "The Settings Trace shows which threshold values were applied to generate this alert and how they resolved. It reveals the full resolution chain: default → asset class override → product-specific override. This helps you understand whether the alert reflects standard or customized sensitivity.",
      placement: "left",
      action: "wait",
      hint: "Check the settings trace to see which thresholds applied and whether any overrides were active.",
      delay: 3500,
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Investigation Complete",
      content:
        "You've completed a full alert investigation: Dashboard overview → Risk Cases → score breakdown → calculation trace → market data → related orders → settings trace. This workflow covers every dimension needed to assess whether an alert represents genuine market abuse or a false positive.",
      placement: "bottom",
      action: "wait",
      delay: 3000,
    },
  ],
};


// --------------------------------------------------------------------------
// S22: Cross-Alert Analysis (Intermediate, 6 min)
// --------------------------------------------------------------------------
const S22_CROSS_ALERT_ANALYSIS: ScenarioDefinition = {
  id: "s22_cross_alert_analysis",
  name: "Cross-Alert Analysis",
  description:
    "Compare alerts across detection models to find patterns — filter alerts by model, analyze scores with SQL queries, and use the Assistant to identify cross-model correlations.",
  category: "investigation",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  prerequisites: ["s21_alert_investigation"],
  steps: [
    {
      target: "[data-tour='alert-grid']",
      title: "Start with the Alert Grid",
      content:
        "We'll compare alerts across detection models to identify patterns. Risk Cases grid shows all alerts — we'll filter by model to isolate specific detection types and compare their characteristics.",
      placement: "bottom",
      route: "/alerts",
      action: "navigate",
      actionTarget: "[data-tour='alert-grid']",
      hint: "Navigate to Risk Cases using the sidebar.",
      delay: 2500,
    },
    {
      target: "[data-tour='alert-filters']",
      title: "Filter by Detection Model",
      content:
        "Use the column filters to isolate alerts from a single detection model — for example, 'Wash Trading — Full Day'. This lets you analyze one model's output in isolation. Notice the score range and product distribution for this model type.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='alert-filters']",
      hint: "Click the filter icon on the Model column. Select 'Wash Trading — Full Day' to filter.",
      delay: 3000,
    },
    {
      target: "[data-tour='alert-grid'] .ag-body-viewport",
      title: "Compare Scores Within Model",
      content:
        "With the filter active, compare the scores across alerts from the same model. Look for clustering — are most scores in a narrow range (consistent detection) or widely spread (variable signal strength)? High-variance models may need threshold tuning.",
      placement: "bottom",
      action: "wait",
      hint: "Review the filtered results. Note the score range and any clustering patterns.",
      delay: 3500,
    },
    {
      target: "[data-tour='sql-editor']",
      title: "Analyze with SQL",
      content:
        "Switch to the SQL Console for deeper analysis. Run an analytical query to aggregate alerts by model — for example, 'SELECT model, COUNT(*) as count, AVG(score) as avg_score, MIN(score), MAX(score) FROM alerts GROUP BY model'. This reveals cross-model patterns that aren't visible in the grid.",
      placement: "right",
      route: "/sql",
      action: "navigate",
      actionTarget: "[data-tour='sql-editor']",
      hint: "Navigate to the SQL Console and write a GROUP BY query to compare alert statistics across models.",
      delay: 3000,
    },
    {
      target: "[data-tour='sql-results']",
      title: "Review Aggregate Statistics",
      content:
        "The query results show aggregate metrics per model: alert count, average score, min/max scores. Compare models side by side — a model with very high average scores might be too sensitive, while one with few alerts might have thresholds set too high.",
      placement: "top",
      action: "wait",
      hint: "Review the aggregated results. Compare average scores and alert counts across detection models.",
      delay: 3500,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Ask the Assistant",
      content:
        "Use the Assistant to ask about cross-model patterns. Try: 'Which products have alerts from multiple detection models?' or 'Are there traders who appear frequently across different alert types?' The Assistant can synthesize patterns across the entire data set.",
      placement: "right",
      route: "/assistant",
      action: "navigate",
      actionTarget: "[data-tour='assistant-chat']",
      hint: "Navigate to the Assistant and ask about cross-model alert patterns.",
      delay: 3000,
    },
    {
      target: "[data-tour='assistant-scenarios']",
      title: "Use Built-in Scenarios",
      content:
        "The Assistant has built-in analysis scenarios that run pre-defined investigative queries. These cover common patterns: trader-level risk aggregation, product heat maps, and temporal clustering. Select a scenario to see a structured analysis without writing custom queries.",
      placement: "left",
      action: "wait",
      hint: "Browse the scenario buttons on the right. Click one to run a pre-built analysis.",
      delay: 3000,
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "Cross-Alert Analysis Complete",
      content:
        "You've analyzed alerts across models using three approaches: grid filtering for visual comparison, SQL queries for aggregate statistics, and AI-assisted pattern recognition. This multi-tool approach reveals correlations that single-view analysis would miss.",
      placement: "right",
      action: "wait",
      delay: 3000,
    },
  ],
};


// --------------------------------------------------------------------------
// S23: Regulatory Coverage Audit (Advanced, 7 min)
// --------------------------------------------------------------------------
const S23_REGULATORY_AUDIT: ScenarioDefinition = {
  id: "s23_regulatory_audit",
  name: "Regulatory Coverage Audit",
  description:
    "Audit regulatory coverage using the Regulatory Map — review obligation cards, explore the traceability graph, identify coverage gaps, and navigate to Models to address them.",
  category: "investigation",
  difficulty: "advanced",
  estimatedMinutes: 7,
  prerequisites: ["s21_alert_investigation"],
  steps: [
    {
      target: "[data-tour='regulatory-cards']",
      title: "Regulatory Obligations Overview",
      content:
        "The Regulatory Map shows all regulatory obligations that your surveillance system must cover. Each card represents an obligation (e.g., MAR Article 12 — Market Manipulation) with its coverage status: covered (green), partial (amber), or gap (red).",
      placement: "right",
      route: "/regulatory",
      action: "navigate",
      actionTarget: "[data-tour='regulatory-cards']",
      hint: "Navigate to the Regulatory Map using the sidebar.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-cards']",
      title: "Review Coverage Status",
      content:
        "Scan the obligation cards for their coverage status badges. Green cards have full model coverage — every required detection scenario is implemented. Amber cards have partial coverage — some but not all scenarios are addressed. Red cards represent gaps requiring immediate attention.",
      placement: "right",
      action: "wait",
      hint: "Look at the coverage badges on each card. Count how many are green, amber, and red.",
      delay: 3500,
    },
    {
      target: "[data-tour='regulatory-graph']",
      title: "Traceability Graph",
      content:
        "The traceability graph uses smoothstep edges with labels showing relationship types (contains, detected by, uses). Use the MiniMap (bottom-right) and zoom Controls to navigate. Follow the edges from regulation → article → detection model → calculation. Red nodes indicate coverage gaps.",
      placement: "bottom",
      action: "wait",
      hint: "Study the graph. Use edge labels to understand relationships. Look for red (uncovered) article nodes.",
      delay: 4000,
    },
    {
      target: "[data-tour='regulatory-detail']",
      title: "Drill Into a Node",
      content:
        "Click any node in the graph to see its details in the bottom pane, including descriptions from the regulation registry. The detail pane shows type, label, jurisdiction, coverage status, and full description text. Drag the divider to resize the panes.",
      placement: "top",
      action: "click",
      actionTarget: ".react-flow__node:first-child",
      hint: "Click a node in the graph to view its full details and description.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-details-grid']",
      title: "Regulation Details Table",
      content:
        "Switch to the Regulation Details tab for a structured table view. The AG Grid shows all regulations and articles with coverage status badges. Click any row to see the full article description in the bottom pane.",
      placement: "bottom",
      action: "wait",
      hint: "Click the 'Regulation Details' tab to see the structured table view.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-suggestions']",
      title: "Review AI Suggestions",
      content:
        "The Suggestions panel shows AI-generated recommendations for improving coverage. Suggestions may include: creating a new detection model, adding calculations to an existing model, or adjusting thresholds. Each suggestion includes a rationale and priority level.",
      placement: "left",
      action: "wait",
      hint: "Read the AI suggestions. Note which ones address coverage gaps and their priority levels.",
      delay: 3500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Navigate to Models",
      content:
        "To address a coverage gap, navigate to Models where you can create or modify detection models. The gap analysis from the Regulatory Map tells you exactly what detection capability is missing — now you'll implement it.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to Models to create or modify a detection model that addresses the gap.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Address the Gap",
      content:
        "In Models, you can create a new detection model or enhance an existing one based on the regulatory suggestions. Add the required calculations, configure thresholds, and define the detection query. When saved, the model will automatically appear in the Regulatory Map's traceability graph.",
      placement: "right",
      action: "wait",
      hint: "Review existing models and identify which one to enhance, or create a new model for the uncovered obligation.",
      delay: 3500,
    },
    {
      target: "[data-tour='standards-summary']",
      title: "Standards Compliance Matrix",
      content:
        'Click the "Standards Compliance" tab to review the detailed compliance matrix and BCBS 239 principle mapping. See how the platform aligns with 18 international standards across 48 controls with evidence links.',
      placement: "bottom",
      route: "/regulatory",
      action: "wait",
      hint: "Click the Standards Compliance tab to see the compliance matrix, BCBS 239 principles, and gap analysis.",
      delay: 3000,
    },
    {
      target: "[data-tour='regulatory-cards']",
      title: "Regulatory Audit Complete",
      content:
        "You've completed a full regulatory coverage audit: reviewed obligation cards, explored the traceability graph, identified gaps, reviewed AI suggestions, examined standards compliance, and navigated to Models to address shortfalls. This closed-loop workflow ensures continuous regulatory compliance.",
      placement: "right",
      route: "/regulatory",
      action: "navigate",
      actionTarget: "[data-tour='regulatory-cards']",
      hint: "Return to the Regulatory Map to verify the coverage status has improved.",
      delay: 3000,
    },
  ],
};

export const investigationScenarios: Record<string, ScenarioDefinition> = {
  s21_alert_investigation: S21_ALERT_INVESTIGATION,
  s22_cross_alert_analysis: S22_CROSS_ALERT_ANALYSIS,
  s23_regulatory_audit: S23_REGULATORY_AUDIT,
};
