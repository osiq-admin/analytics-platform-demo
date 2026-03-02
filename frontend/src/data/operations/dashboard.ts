import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";

// --------------------------------------------------------------------------
// 1. Dashboard
// --------------------------------------------------------------------------
export const dashboardOperations: ViewOperations = {
  viewId: "dashboard",
  label: "Dashboard",
  operations: [
    {
      id: "view_summary",
      name: "View Alert Summary",
      description:
        "Review key metrics at a glance: total alerts, score-triggered percentage, average scores, and active detection models.",
      scenarioId: "s21_alert_investigation",
    },
    {
      id: "compare_models",
      name: "Compare Model Performance",
      description:
        "Use the Alerts by Model chart to compare detection model effectiveness across wash trading, spoofing, insider dealing, and ramping.",
    },
    {
      id: "analyze_scores",
      name: "Analyze Score Distribution",
      description:
        "Examine how alert scores are distributed to understand detection sensitivity and identify scoring calibration issues.",
    },
    {
      id: "review_triggers",
      name: "Review Trigger Analysis",
      description:
        "See which detection rules fire most frequently and identify patterns across the alert population.",
    },
    {
      id: "view_navigation_config",
      name: "View Navigation Config",
      description:
        "Sidebar navigation is loaded from metadata at workspace/metadata/navigation/main.json. Edit the JSON to add, remove, or reorder views and groups — no code changes needed. The API endpoint GET /api/metadata/navigation serves the configuration.",
    },
    {
      id: "configure_widgets",
      name: "Configure Dashboard Widgets",
      description:
        "Dashboard widgets (KPI cards and charts) are defined in metadata at workspace/metadata/widgets/dashboard.json. Edit the JSON to add, remove, reorder, or reconfigure widgets — no code changes needed. The API endpoint GET/PUT /api/metadata/widgets/dashboard manages the configuration.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Charts are interactive — hover for detailed tooltips with exact values",
    "Click the chart type switcher to toggle between bar, line, and pie views",
    "Use the time range selector to focus on specific detection windows",
    "Widget layout is metadata-driven — edit workspace/metadata/widgets/dashboard.json to customize",
  ],
};
