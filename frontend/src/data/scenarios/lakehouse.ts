import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Lakehouse (S33)


// --------------------------------------------------------------------------
// S33: Lakehouse Data Governance (Intermediate, 4 min)
// --------------------------------------------------------------------------
const S33_LAKEHOUSE_DATA_GOVERNANCE: ScenarioDefinition = {
  id: "s33_lakehouse_data_governance",
  name: "Lakehouse Data Governance",
  description:
    "Explore the Apache Iceberg lakehouse — browse Iceberg tables, review PII governance classifications, and inspect calculation audit logs.",
  category: "lakehouse",
  difficulty: "intermediate",
  estimatedMinutes: 4,
  steps: [
    {
      target: "[data-tour='medallion-tab-lakehouse']",
      title: "Switch to Lakehouse Tab",
      content:
        "Navigate to the Medallion Overview and switch to the Lakehouse tab to explore Apache Iceberg table management and governance.",
      placement: "bottom",
      route: "/medallion",
      action: "click",
      actionTarget: "[data-tour='medallion-tab-lakehouse']",
      hint: "Click the 'Lakehouse' tab at the top right of the Medallion Overview.",
      delay: 2000,
    },
    {
      target: "[data-tour='lakehouse-iceberg-tables']",
      title: "Browse Iceberg Tables",
      content:
        "Iceberg tables are grouped by tier — Silver (canonical entities), Gold (calculated results), Reference (golden records), Logging (audit trails). Each table supports ACID transactions, time travel, and schema evolution.",
      placement: "right",
      action: "wait",
      hint: "Review the Iceberg Tables panel showing tables organized by medallion tier.",
      delay: 3000,
    },
    {
      target: "[data-tour='lakehouse-pii-governance']",
      title: "Review PII Governance",
      content:
        "The PII Governance panel shows classified PII fields across all entities. Fields are tagged with classification levels (HIGH/MEDIUM/LOW), regulation applicability (GDPR, MiFID II), crypto-shredding requirements, and retention periods.",
      placement: "left",
      action: "wait",
      hint: "Look at the PII Governance panel to see which entity fields contain personally identifiable information.",
      delay: 3500,
    },
    {
      target: "[data-tour='lakehouse-calc-audit']",
      title: "Inspect Calculation Audit",
      content:
        "The Calculation Audit panel shows execution statistics including total executions, skip count (fingerprint-based deduplication), and skip rate. The result log table shows individual calculation executions with status, record counts, and durations.",
      placement: "right",
      action: "wait",
      hint: "Check the Calculation Audit panel for execution statistics and the result log.",
      delay: 3000,
    },
    {
      target: "[data-tour='lakehouse-pipeline-runs']",
      title: "View Pipeline Runs",
      content:
        "Pipeline runs track each execution with run type (daily, backfill, correction), Iceberg branch/tag references, and the list of entities and tiers affected. Branches enable isolated processing; tags mark successful completions.",
      placement: "left",
      action: "wait",
      hint: "Review the Pipeline Runs panel to see run history with branch and tag information.",
      delay: 3000,
    },
    {
      target: "[data-tour='lakehouse-materialized-views']",
      title: "Materialized Views",
      content:
        "Materialized views pre-compute aggregations from Iceberg tables into DuckDB tables for fast dashboard queries. Click 'Refresh All' to trigger a refresh of all configured MVs.",
      placement: "top",
      action: "wait",
      hint: "Check MV status and use the Refresh All button to update materialized views.",
      delay: 2000,
    },
  ],
};

export const lakehouseScenarios: Record<string, ScenarioDefinition> = {
  s33_lakehouse_data_governance: S33_LAKEHOUSE_DATA_GOVERNANCE,
};
