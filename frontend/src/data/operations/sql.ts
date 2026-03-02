import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 9. SQL Console
// --------------------------------------------------------------------------
export const sqlOperations: ViewOperations = {
  viewId: "sql",
  label: "SQL Console",
  operations: [
    {
      id: "write_queries",
      name: "Write SQL Queries",
      description:
        "Use the Monaco-powered SQL editor with syntax highlighting, auto-complete, and table/column suggestions to write DuckDB queries.",
    },
    {
      id: "use_presets",
      name: "Use Query Presets",
      description:
        "Browse and run preset queries for common investigation tasks: top alerts, model comparisons, data quality checks, and more.",
    },
    {
      id: "view_results",
      name: "View Query Results",
      description:
        "Results display in an AG Grid table with sorting, filtering, and column resizing. Export to CSV for further analysis.",
    },
    {
      id: "use_ai_sql",
      name: "Use AI SQL Assistant",
      description:
        "Describe what you want in natural language and let the AI assistant generate the SQL query for you.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Press Ctrl+Enter / Cmd+Enter to execute the current query",
    "The auto-complete suggests table names, columns, and SQL keywords as you type",
    "Use the preset library to jumpstart common analytical queries",
    "Query results are limited to 1000 rows by default — add LIMIT to override",
  ],
};
