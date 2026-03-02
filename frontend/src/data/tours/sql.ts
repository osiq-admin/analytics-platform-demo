import type { TourDefinition } from "../../stores/tourStore.ts";


export const sqlTour: TourDefinition = {
  id: "sql",
  name: "SQL Console Tour",
  description: "Query the analytical database directly.",
  steps: [
    {
      target: "[data-tour='sql-editor']",
      title: "SQL Editor",
      content: "Write and execute SQL queries against the DuckDB analytical database. Supports all standard SQL.",
      placement: "bottom",
      route: "/sql",
    },
    {
      target: "[data-tour='sql-presets']",
      title: "Query Presets",
      content: "Quick-access preset queries for common analytical tasks — calculations, alerts, and entity exploration.",
      placement: "right",
    },
    {
      target: "[data-tour='sql-results']",
      title: "Results Grid",
      content: "Query results displayed in a sortable, resizable data grid. Supports large result sets.",
      placement: "top",
    },
  ],
};
