import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 13. Risk Case Manager (Alerts)
// --------------------------------------------------------------------------
export const alertsOperations: ViewOperations = {
  viewId: "alerts",
  label: "Risk Case Manager",
  operations: [
    {
      id: "browse_alerts",
      name: "Browse Alerts",
      description:
        "Explore all generated alerts with sorting, filtering, and grouping by model, severity, date, or status.",
      scenarioId: "s21_alert_investigation",
    },
    {
      id: "filter_alerts",
      name: "Filter & Search",
      description:
        "Use the filter bar to narrow alerts by model, score range, date, status (open/escalated/closed), or free-text search.",
    },
    {
      id: "investigate_alert",
      name: "Investigate Alert Detail",
      description:
        "Click an alert to see its full investigation view: score breakdown, triggered rules, related trades, and market data context.",
      scenarioId: "s21_alert_investigation",
    },
    {
      id: "view_trace",
      name: "View Alert Trace",
      description:
        "Examine the complete audit trail showing how the alert was generated — from raw data through calculations to the final score.",
    },
    {
      id: "review_market_data",
      name: "Review Market Data",
      description:
        "View OHLC candlestick charts and intraday price data around the alert time window to assess market context.",
      scenarioId: "s22_cross_alert_analysis",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "The score breakdown shows exactly which rules contributed to the alert score",
    "Use the trace view to understand the full detection pipeline for any alert",
    "OHLC charts highlight the alert time window with a shaded region",
    "Cross-alert analysis finds related alerts that may indicate coordinated activity",
  ],
};
