import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 22. Analytics Tiers
// --------------------------------------------------------------------------
export const analytics_tiersOperations: ViewOperations = {
  viewId: "analytics-tiers",
  label: "Analytics Tiers",
  operations: [
    {
      id: "browse_platinum_kpis",
      name: "Browse Platinum KPIs",
      description:
        "View pre-built KPI datasets aggregated from Gold tier detection results, including record counts, freshness, and aggregation type.",
    },
    {
      id: "view_kpi_dataset",
      name: "View KPI Dataset Details",
      description:
        "Select a Platinum KPI dataset to see its columns, aggregation logic, source tier, and last refresh timestamp.",
    },
    {
      id: "create_sandbox",
      name: "Create Sandbox",
      description:
        "Provision an isolated sandbox environment cloned from production data to test threshold or model changes safely.",
      scenarioId: "s33_lakehouse_data_governance",
    },
    {
      id: "run_sandbox_comparison",
      name: "Run Sandbox Comparison",
      description:
        "Execute a sandbox run and compare results side-by-side with production — alert counts, score distributions, and threshold impact.",
    },
    {
      id: "view_retention_policies",
      name: "View Retention Policies",
      description:
        "Review archive retention policies per tier — hot, warm, and cold storage durations, compression, and regulatory hold flags.",
    },
    {
      id: "export_archive",
      name: "Export Archive Dataset",
      description:
        "Export an archived dataset in Parquet format for external analysis or regulatory submission.",
    },
  ],
  tips: [
    "Platinum KPIs are pre-aggregated from Gold tier detection results — they refresh automatically after pipeline runs.",
    "Sandboxes clone production data so you can test threshold changes without affecting live alerts.",
    "Archive retention policies ensure regulatory compliance — datasets in regulatory hold cannot be deleted.",
    "Use the comparison view to see how sandbox threshold changes would affect alert volumes before deploying.",
  ],
};
