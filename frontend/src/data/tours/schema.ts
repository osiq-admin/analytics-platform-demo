import type { TourDefinition } from "../../stores/tourStore.ts";


export const schemaTour: TourDefinition = {
  id: "schema",
  name: "Schema Explorer Tour",
  description: "Browse the analytical database schema.",
  steps: [
    {
      target: "[data-tour='schema-tables']",
      title: "Table List",
      content: "All tables in the DuckDB database — raw data, calculated results, and detection outputs.",
      placement: "right",
      route: "/schema",
    },
    {
      target: "[data-tour='schema-columns']",
      title: "Column Details",
      content: "Select a table to see its columns, data types, and nullability.",
      placement: "left",
    },
  ],
};
