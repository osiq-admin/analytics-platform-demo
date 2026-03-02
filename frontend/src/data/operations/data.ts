import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 12. Data Manager
// --------------------------------------------------------------------------
export const dataOperations: ViewOperations = {
  viewId: "data",
  label: "Data Manager",
  operations: [
    {
      id: "browse_files",
      name: "Browse Data Files",
      description:
        "Explore all data files in the workspace: CSV source files, Parquet engine files, JSON metadata, and alert traces.",
    },
    {
      id: "preview_data",
      name: "Preview Data",
      description:
        "Select any data file to preview its contents in a grid view with sorting, filtering, and column statistics.",
      scenarioId: "s20_import_preview_data",
    },
    {
      id: "view_statistics",
      name: "View Data Statistics",
      description:
        "See column-level statistics: min, max, mean, distinct count, null percentage — useful for data quality assessment.",
    },
    {
      id: "manage_sources",
      name: "Manage Data Sources",
      description:
        "Add, remove, or refresh data sources. Re-generate CSV data or re-import from external feeds.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "CSV files are human-editable; Parquet files are used by the detection engine",
    "The statistics panel highlights potential data quality issues automatically",
    "Use the file browser tree to navigate the workspace directory structure",
  ],
};
