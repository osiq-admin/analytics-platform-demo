import type { TourDefinition } from "../../stores/tourStore.ts";


// Demo workflow guides
export const act1_guideTour: TourDefinition = {
  id: "act1_guide",
  name: "Act 1: Data-to-Alerts Workflow",
  description: "Walk through the complete pipeline from raw data to generated alerts.",
  steps: [
    {
      target: "[data-tour='sidebar']",
      title: "Act 1: Data to Alerts",
      content: "This guide walks you through the core workflow — from viewing raw data to investigating generated alerts.",
      placement: "right",
    },
    {
      target: "[data-tour='data-list']",
      title: "Step 1: Raw Data",
      content: "Start by exploring the raw data tables. These database tables contain executions, orders, products, and market data.",
      placement: "right",
      route: "/data",
    },
    {
      target: "[data-tour='entity-list']",
      title: "Step 2: Data Model",
      content: "The Entity Designer shows how data is structured with Fields and Relationships tabs. Click an entity to see its schema, or click nodes in the relationship graph.",
      placement: "right",
      route: "/entities",
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Step 3: Run Pipeline",
      content: "The Pipeline Monitor shows the calculation DAG. Click 'Run Pipeline' to execute all calculations and generate alerts.",
      placement: "bottom",
      route: "/pipeline",
    },
    {
      target: "[data-tour='schema-tables']",
      title: "Step 4: View Results",
      content: "After the pipeline runs, the Schema Explorer shows calculated tables alongside raw data tables.",
      placement: "right",
      route: "/schema",
    },
    {
      target: "[data-tour='sql-editor']",
      title: "Step 5: Query Data",
      content: "Use the SQL Console to explore calculation results. Try: SELECT * FROM calc_value LIMIT 10",
      placement: "bottom",
      route: "/sql",
    },
    {
      target: "[data-tour='settings-list']",
      title: "Step 6: Scoring Settings",
      content: "Settings control how raw detection signals are scored. Thresholds determine when alerts fire.",
      placement: "right",
      route: "/settings",
    },
    {
      target: "[data-tour='model-list']",
      title: "Step 7: Detection Models",
      content: "Models combine calculations, settings, and scoring logic to detect suspicious patterns like wash trading or spoofing.",
      placement: "right",
      route: "/models",
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Step 8: Review Alerts",
      content: "The Risk Case Manager shows all generated alerts. Click any alert to investigate its details.",
      placement: "bottom",
      route: "/alerts",
    },
  ],
};
