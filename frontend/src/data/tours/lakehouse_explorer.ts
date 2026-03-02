import type { TourDefinition } from "../../stores/tourStore.ts";


export const lakehouse_explorerTour: TourDefinition = {
  id: "lakehouse-explorer",
  name: "Lakehouse Explorer",
  description: "Explore the Apache Iceberg lakehouse — tables, schema evolution, PII governance, calculation audit, pipeline runs, and materialized views.",
  steps: [
    {
      target: "[data-tour='medallion-tab-lakehouse']",
      title: "Lakehouse Tab",
      content: "Switch to the Lakehouse tab to explore Apache Iceberg tables, governance, and pipeline data across all medallion tiers.",
      placement: "bottom",
      route: "/medallion",
    },
    {
      target: "[data-tour='lakehouse-iceberg-tables']",
      title: "Iceberg Tables",
      content: "Browse all Iceberg tables grouped by tier (Silver, Gold, Platinum, Reference, Logging, Archive). Each tier uses Iceberg for ACID transactions, time travel, and schema evolution.",
      placement: "right",
      route: "/medallion",
    },
    {
      target: "[data-tour='lakehouse-schema-evolution']",
      title: "Schema Evolution",
      content: "Track schema changes over time — column additions, removals, and type changes. Schema drift is detected by comparing entity JSON definitions against Iceberg table schemas.",
      placement: "left",
      route: "/medallion",
    },
    {
      target: "[data-tour='lakehouse-pii-governance']",
      title: "PII Governance",
      content: "Review PII field classifications (HIGH/MEDIUM/LOW), GDPR-regulated entities, crypto-shredding requirements, and retention policies. Governance tags are applied to Iceberg table properties.",
      placement: "right",
      route: "/medallion",
    },
    {
      target: "[data-tour='lakehouse-calc-audit']",
      title: "Calculation Audit",
      content: "Monitor calculation execution statistics including skip rates (fingerprint-based deduplication), execution durations, and record counts per calculation layer.",
      placement: "left",
      route: "/medallion",
    },
    {
      target: "[data-tour='lakehouse-pipeline-runs']",
      title: "Pipeline Runs",
      content: "View pipeline run history with run types (daily, backfill, correction), Iceberg branch/tag references, and affected entities and tiers.",
      placement: "right",
      route: "/medallion",
    },
    {
      target: "[data-tour='lakehouse-materialized-views']",
      title: "Materialized Views",
      content: "Check materialized view status and trigger refreshes. MVs pre-compute dashboard stats and alert summaries from Iceberg tables via DuckDB.",
      placement: "left",
      route: "/medallion",
    },
  ],
};
