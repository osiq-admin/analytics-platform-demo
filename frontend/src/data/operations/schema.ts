import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 8. Schema Explorer
// --------------------------------------------------------------------------
export const schemaOperations: ViewOperations = {
  viewId: "schema",
  label: "Schema Explorer",
  operations: [
    {
      id: "browse_tables",
      name: "Browse Tables",
      description:
        "Explore all DuckDB tables in the analytics database — entity tables, calculation results, alert outputs, and system tables.",
    },
    {
      id: "view_columns",
      name: "View Column Details",
      description:
        "Select a table to see its full column list with data types, nullability, and descriptions.",
    },
    {
      id: "check_data_types",
      name: "Check Data Types",
      description:
        "Review column data types to understand the physical schema — important for writing SQL queries and creating calculations.",
    },
    {
      id: "preview_data",
      name: "Preview Table Data",
      description:
        "View sample rows from any table to understand the data content and validate the schema against actual data.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Tables are grouped by category: entities, calculations, alerts, and system",
    "Column types follow DuckDB conventions — VARCHAR, DOUBLE, INTEGER, TIMESTAMP, etc.",
    "Use the schema explorer to verify table structures before writing SQL queries",
  ],
};
