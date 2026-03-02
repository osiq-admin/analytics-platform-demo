import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 17. Medallion Architecture
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// 18. Data Onboarding
// --------------------------------------------------------------------------
export const onboardingOperations: ViewOperations = {
  viewId: "onboarding",
  label: "Data Onboarding",
  operations: [
    {
      id: "upload_file",
      name: "Upload Data File",
      description:
        "Upload a CSV, JSON, Parquet, or Excel file. The system auto-detects the schema and stages the file for profiling.",
    },
    {
      id: "detect_schema",
      name: "Auto-Detect Schema",
      description:
        "View the auto-detected column names, data types, nullability, and patterns (ISIN, MIC, ISO8601) from PyArrow inference.",
    },
    {
      id: "profile_quality",
      name: "Profile Data Quality",
      description:
        "Run quality profiling to see completeness, null rates, distinct counts, min/max values, and an overall quality score for each column.",
    },
    {
      id: "map_entity",
      name: "Map to Target Entity",
      description:
        "Select the canonical entity (execution, order, product, etc.) that this data file maps to for the Silver tier.",
    },
    {
      id: "confirm_ingest",
      name: "Confirm & Ingest",
      description:
        "Review the summary and confirm ingestion. The data is staged to the Landing tier with a data contract draft.",
      scenarioId: "s28_data_onboarding",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "CSV, JSON, Parquet, and Excel formats are supported — the connector auto-selects the right parser",
    "Schema patterns (ISIN, MIC, LEI) are auto-detected from sample values",
    "Quality profiling shows per-column statistics including null rates and value distribution",
    "FIX protocol and streaming connectors are available as architectural stubs",
  ],
};
