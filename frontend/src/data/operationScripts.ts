import type { ViewOperations } from "../components/TourEngine/OperationScripts.tsx";

// ==========================================================================
// Operation Scripts — Per-view help metadata (M119)
// ==========================================================================
// Each view defines 3-6 operations and 2-4 tips that appear in the (?) panel.
// Operations may link to guided scenarios (S1-S25) via scenarioId.
// ==========================================================================

export const VIEW_OPERATIONS: Record<string, ViewOperations> = {
  // --------------------------------------------------------------------------
  // 1. Dashboard
  // --------------------------------------------------------------------------
  dashboard: {
    viewId: "dashboard",
    label: "Dashboard",
    operations: [
      {
        id: "view_summary",
        name: "View Alert Summary",
        description:
          "Review key metrics at a glance: total alerts, score-triggered percentage, average scores, and active detection models.",
        scenarioId: "s21_alert_investigation",
      },
      {
        id: "compare_models",
        name: "Compare Model Performance",
        description:
          "Use the Alerts by Model chart to compare detection model effectiveness across wash trading, spoofing, insider dealing, and ramping.",
      },
      {
        id: "analyze_scores",
        name: "Analyze Score Distribution",
        description:
          "Examine how alert scores are distributed to understand detection sensitivity and identify scoring calibration issues.",
      },
      {
        id: "review_triggers",
        name: "Review Trigger Analysis",
        description:
          "See which detection rules fire most frequently and identify patterns across the alert population.",
      },
    ],
    tips: [
      "Charts are interactive — hover for detailed tooltips with exact values",
      "Click the chart type switcher to toggle between bar, line, and pie views",
      "Use the time range selector to focus on specific detection windows",
    ],
  },

  // --------------------------------------------------------------------------
  // 2. Entity Designer
  // --------------------------------------------------------------------------
  entities: {
    viewId: "entities",
    label: "Entity Designer",
    operations: [
      {
        id: "browse_entities",
        name: "Browse Entities",
        description:
          "Explore all 8 entities (product, execution, order, md_intraday, md_eod, venue, account, trader) and their field definitions.",
        scenarioId: "s19_explore_entities",
      },
      {
        id: "view_fields",
        name: "View Field Details",
        description:
          "Select an entity to see all fields with their types, constraints, descriptions, and whether they are primary keys or foreign keys.",
      },
      {
        id: "explore_relationships",
        name: "Explore Relationships",
        description:
          "Use the relationship graph to visualize how entities connect — order to execution, product to market data, trader to account.",
      },
      {
        id: "search_fields",
        name: "Search Across Fields",
        description:
          "Use the search bar to find specific fields across all entities — helpful for tracing data lineage.",
      },
      {
        id: "import_preview",
        name: "Import & Preview Data",
        description:
          "Import CSV data for any entity and preview the rows before committing changes.",
        scenarioId: "s20_import_preview_data",
      },
    ],
    tips: [
      "Click any entity card to expand its field list in the detail panel",
      "The relationship graph highlights foreign key connections between entities",
      "Use the field search to quickly locate columns like 'trader_id' across all entities",
    ],
  },

  // --------------------------------------------------------------------------
  // 3. Metadata Explorer (Calculations)
  // --------------------------------------------------------------------------
  metadata: {
    viewId: "metadata",
    label: "Metadata Explorer",
    operations: [
      {
        id: "browse_calcs",
        name: "Browse Calculations",
        description:
          "Explore all detection calculations organized by metadata layer (OOB, Custom). View SQL, description, and parameters for each.",
        scenarioId: "s7_explore_calc_dag",
      },
      {
        id: "view_dag",
        name: "View Calculation DAG",
        description:
          "Visualize the directed acyclic graph showing how calculations depend on each other and flow through the detection pipeline.",
        scenarioId: "s7_explore_calc_dag",
      },
      {
        id: "filter_by_layer",
        name: "Filter by Metadata Layer",
        description:
          "Switch between OOB (out-of-box) and Custom layers to see which calculations are system-provided vs. user-defined.",
      },
      {
        id: "check_dependencies",
        name: "Check Dependencies",
        description:
          "Select a calculation to see its upstream inputs and downstream consumers — essential for impact analysis before changes.",
      },
      {
        id: "create_calculation",
        name: "Create a Calculation",
        description:
          "Define a new calculation with SQL, parameters, and input mappings. Use AI assistance for complex expressions.",
        scenarioId: "s8_create_manual_calc",
      },
    ],
    tips: [
      "The DAG view auto-highlights the selected calculation and its dependency chain",
      "Double-click a DAG node to navigate directly to that calculation's detail panel",
      "Filter by layer to quickly find customizable vs. locked calculations",
    ],
  },

  // --------------------------------------------------------------------------
  // 4. Settings Manager
  // --------------------------------------------------------------------------
  settings: {
    viewId: "settings",
    label: "Settings Manager",
    operations: [
      {
        id: "browse_settings",
        name: "Browse Settings",
        description:
          "Explore all detection thresholds, score steps, and configuration parameters. Filter by type, model, or search by name.",
        scenarioId: "s1_view_settings",
      },
      {
        id: "view_score_steps",
        name: "View Score Steps",
        description:
          "For score_steps settings, see the visual range bar and editable table showing how metric values map to risk scores.",
        scenarioId: "s4_score_steps",
      },
      {
        id: "test_resolution",
        name: "Test Setting Resolution",
        description:
          "Use the Resolution Tester to check how a setting resolves for a specific asset class, product, or account context.",
        scenarioId: "s6_multi_dim_resolution",
      },
      {
        id: "manage_overrides",
        name: "Manage Overrides",
        description:
          "Create product-specific or hierarchy-based overrides that take priority over default values.",
        scenarioId: "s3_create_override",
      },
      {
        id: "use_pattern_library",
        name: "Use Pattern Library",
        description:
          "Browse the pattern library for common threshold configurations and apply them as templates.",
        scenarioId: "s5_match_patterns",
      },
    ],
    tips: [
      "Product-specific overrides always win over hierarchy and default values",
      "The Resolution Tester shows exactly which value applies and why — great for debugging",
      "Score steps settings have a visual bar chart showing the score-to-value mapping",
      "Use the search bar to quickly find settings by name or ID",
    ],
  },

  // --------------------------------------------------------------------------
  // 5. Mapping Studio
  // --------------------------------------------------------------------------
  mappings: {
    viewId: "mappings",
    label: "Mapping Studio",
    operations: [
      {
        id: "select_calc",
        name: "Select a Calculation",
        description:
          "Choose a calculation from the list to view and edit its input mappings — which entity fields feed into which calculation parameters.",
      },
      {
        id: "map_inputs",
        name: "Map Input Fields",
        description:
          "Connect entity fields to calculation parameters by selecting source entities and columns for each input.",
      },
      {
        id: "drag_drop_mapping",
        name: "Drag-and-Drop Mapping",
        description:
          "Use the visual drag-and-drop interface to create or modify field mappings between entities and calculations.",
      },
      {
        id: "save_mappings",
        name: "Save Mappings",
        description:
          "Save your mapping configuration. Mappings are persisted as metadata and used during pipeline execution.",
      },
    ],
    tips: [
      "Drag fields from the entity panel to the calculation input slots to create mappings",
      "Invalid type mappings are highlighted in red — types must be compatible",
      "Each calculation parameter shows its expected data type for guidance",
    ],
  },

  // --------------------------------------------------------------------------
  // 6. Metadata Editor
  // --------------------------------------------------------------------------
  editor: {
    viewId: "editor",
    label: "Metadata Editor",
    operations: [
      {
        id: "switch_types",
        name: "Switch Metadata Types",
        description:
          "Toggle between different metadata types: calculations, settings, models, entities, and mappings to edit their JSON definitions.",
        scenarioId: "s24_oob_metadata_review",
      },
      {
        id: "edit_json",
        name: "Edit JSON Definitions",
        description:
          "Use the Monaco code editor to directly edit metadata JSON with syntax highlighting, validation, and auto-complete.",
      },
      {
        id: "use_visual_editor",
        name: "Use Visual Editor",
        description:
          "Switch to the visual editor for a form-based editing experience — easier for non-technical users to modify metadata.",
      },
      {
        id: "compare_layers",
        name: "Compare Metadata Layers",
        description:
          "View differences between OOB and Custom layers side-by-side to understand what has been customized.",
      },
      {
        id: "reset_oob",
        name: "Reset to OOB Defaults",
        description:
          "Revert a custom metadata item back to its original out-of-box definition.",
      },
    ],
    tips: [
      "The visual editor and JSON editor stay in sync — changes in one appear in the other",
      "Use Ctrl+S / Cmd+S to save from the JSON editor",
      "The diff view highlights exactly which fields changed between OOB and Custom",
      "Resetting to OOB removes all custom overrides for that item",
    ],
  },

  // --------------------------------------------------------------------------
  // 7. Pipeline Monitor
  // --------------------------------------------------------------------------
  pipeline: {
    viewId: "pipeline",
    label: "Pipeline Monitor",
    operations: [
      {
        id: "view_pipeline_dag",
        name: "View Pipeline DAG",
        description:
          "Visualize the full detection pipeline as a directed graph — from data ingestion through calculations to alert generation.",
      },
      {
        id: "run_pipeline",
        name: "Run Pipeline",
        description:
          "Execute the detection pipeline and watch each stage process in real-time. See timing, row counts, and status for every step.",
      },
      {
        id: "check_status",
        name: "Check Execution Status",
        description:
          "Review the status of each pipeline stage: pending, running, completed, or failed. Click a node for detailed execution logs.",
      },
      {
        id: "view_execution_history",
        name: "View Execution History",
        description:
          "Browse past pipeline runs to compare timing, identify bottlenecks, and track changes in detection results over time.",
      },
    ],
    tips: [
      "Green nodes are completed, yellow are running, red indicate failures",
      "Click any pipeline node to see its execution log and row counts",
      "The pipeline DAG updates in real-time during execution",
    ],
  },

  // --------------------------------------------------------------------------
  // 8. Schema Explorer
  // --------------------------------------------------------------------------
  schema: {
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
    ],
    tips: [
      "Tables are grouped by category: entities, calculations, alerts, and system",
      "Column types follow DuckDB conventions — VARCHAR, DOUBLE, INTEGER, TIMESTAMP, etc.",
      "Use the schema explorer to verify table structures before writing SQL queries",
    ],
  },

  // --------------------------------------------------------------------------
  // 9. SQL Console
  // --------------------------------------------------------------------------
  sql: {
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
    ],
    tips: [
      "Press Ctrl+Enter / Cmd+Enter to execute the current query",
      "The auto-complete suggests table names, columns, and SQL keywords as you type",
      "Use the preset library to jumpstart common analytical queries",
      "Query results are limited to 1000 rows by default — add LIMIT to override",
    ],
  },

  // --------------------------------------------------------------------------
  // 10. Model Composer
  // --------------------------------------------------------------------------
  models: {
    viewId: "models",
    label: "Model Composer",
    operations: [
      {
        id: "create_model",
        name: "Create Detection Model",
        description:
          "Build a new detection model from scratch using the wizard — define name, description, detection logic, thresholds, and scoring rules.",
        scenarioId: "s11_full_model_wizard",
      },
      {
        id: "edit_model",
        name: "Edit Existing Model",
        description:
          "Select a model to modify its calculations, settings, score weights, and alert generation rules.",
        scenarioId: "s12_clone_modify_model",
      },
      {
        id: "add_calc_to_model",
        name: "Add Calculation to Model",
        description:
          "Attach new calculations to a model to expand its detection coverage or add scoring dimensions.",
        scenarioId: "s13_add_calc_to_model",
      },
      {
        id: "run_dry_test",
        name: "Run Dry Test",
        description:
          "Execute a model against sample data without generating live alerts to verify detection logic before deployment.",
      },
      {
        id: "view_examples",
        name: "View Model Examples",
        description:
          "Browse pre-built model examples (wash trading, spoofing, insider dealing, ramping) for reference and learning.",
        scenarioId: "s14_model_best_practices",
      },
    ],
    tips: [
      "Start with the wizard for guided model creation — it walks through each step",
      "Clone an existing model to use it as a starting point for customization",
      "The dry test validates detection logic without affecting the alert database",
      "Check the validation panel for missing fields or configuration issues",
    ],
  },

  // --------------------------------------------------------------------------
  // 11. Use Case Studio
  // --------------------------------------------------------------------------
  "use-cases": {
    viewId: "use-cases",
    label: "Use Case Studio",
    operations: [
      {
        id: "create_use_case",
        name: "Create Use Case",
        description:
          "Define a new detection use case: describe the surveillance scenario, expected behavior, and acceptance criteria.",
        scenarioId: "s15_create_use_case",
      },
      {
        id: "add_sample_data",
        name: "Add Sample Data",
        description:
          "Attach sample trade data that demonstrates the detection scenario — used for testing and validation.",
      },
      {
        id: "set_expected_results",
        name: "Set Expected Results",
        description:
          "Define what the detection model should find: expected alerts, scores, and triggered rules.",
      },
      {
        id: "run_use_case",
        name: "Run Use Case",
        description:
          "Execute the use case against the detection engine and compare actual results with expected outcomes.",
      },
      {
        id: "submit_use_case",
        name: "Submit for Review",
        description:
          "Submit a completed use case to the review queue for approval by compliance or model validation teams.",
        scenarioId: "s16_submit_use_case",
      },
    ],
    tips: [
      "Use cases serve as living documentation of detection requirements",
      "Sample data should cover both positive (alert expected) and negative (no alert) scenarios",
      "Expected results must specify exact scores and triggered rules for validation",
      "Submitted use cases appear in the Submissions Queue for review",
    ],
  },

  // --------------------------------------------------------------------------
  // 12. Data Manager
  // --------------------------------------------------------------------------
  data: {
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
    ],
    tips: [
      "CSV files are human-editable; Parquet files are used by the detection engine",
      "The statistics panel highlights potential data quality issues automatically",
      "Use the file browser tree to navigate the workspace directory structure",
    ],
  },

  // --------------------------------------------------------------------------
  // 13. Risk Case Manager (Alerts)
  // --------------------------------------------------------------------------
  alerts: {
    viewId: "alerts",
    label: "Risk Case Manager",
    operations: [
      {
        id: "browse_alerts",
        name: "Browse Alerts",
        description:
          "Explore all generated alerts with sorting, filtering, and grouping by model, severity, date, or status.",
        scenarioId: "s21_alert_investigation",
      },
      {
        id: "filter_alerts",
        name: "Filter & Search",
        description:
          "Use the filter bar to narrow alerts by model, score range, date, status (open/escalated/closed), or free-text search.",
      },
      {
        id: "investigate_alert",
        name: "Investigate Alert Detail",
        description:
          "Click an alert to see its full investigation view: score breakdown, triggered rules, related trades, and market data context.",
        scenarioId: "s21_alert_investigation",
      },
      {
        id: "view_trace",
        name: "View Alert Trace",
        description:
          "Examine the complete audit trail showing how the alert was generated — from raw data through calculations to the final score.",
      },
      {
        id: "review_market_data",
        name: "Review Market Data",
        description:
          "View OHLC candlestick charts and intraday price data around the alert time window to assess market context.",
        scenarioId: "s22_cross_alert_analysis",
      },
    ],
    tips: [
      "The score breakdown shows exactly which rules contributed to the alert score",
      "Use the trace view to understand the full detection pipeline for any alert",
      "OHLC charts highlight the alert time window with a shaded region",
      "Cross-alert analysis finds related alerts that may indicate coordinated activity",
    ],
  },

  // --------------------------------------------------------------------------
  // 14. Regulatory Map
  // --------------------------------------------------------------------------
  regulatory: {
    viewId: "regulatory",
    label: "Regulatory Map",
    operations: [
      {
        id: "view_coverage",
        name: "View Regulatory Coverage",
        description:
          "See which regulatory requirements (MAR, MiFID II, Dodd-Frank) are covered by the current detection model portfolio.",
        scenarioId: "s23_regulatory_audit",
      },
      {
        id: "explore_graph",
        name: "Explore Regulatory Graph",
        description:
          "Navigate the interactive graph linking regulations to detection models, calculations, and alert types.",
      },
      {
        id: "identify_gaps",
        name: "Identify Coverage Gaps",
        description:
          "Find regulatory requirements that are not yet covered by any detection model — prioritize model development.",
      },
      {
        id: "review_suggestions",
        name: "Review Model Suggestions",
        description:
          "See AI-generated suggestions for new detection models that would address identified regulatory gaps.",
      },
    ],
    tips: [
      "Green connections indicate full coverage; red indicates gaps requiring attention",
      "Click any regulation node to see all linked models and their coverage status",
      "The gap analysis prioritizes requirements by regulatory importance and risk",
    ],
  },

  // --------------------------------------------------------------------------
  // 15. Submissions Queue
  // --------------------------------------------------------------------------
  submissions: {
    viewId: "submissions",
    label: "Submissions Queue",
    operations: [
      {
        id: "browse_queue",
        name: "Browse Submission Queue",
        description:
          "View all submitted use cases, model changes, and configuration updates awaiting review and approval.",
        scenarioId: "s17_review_submission",
      },
      {
        id: "review_submission",
        name: "Review a Submission",
        description:
          "Open a submission to review its details: changes made, test results, impact analysis, and submitter notes.",
        scenarioId: "s17_review_submission",
      },
      {
        id: "approve_reject",
        name: "Approve or Reject",
        description:
          "Make a decision on a submission: approve for deployment, reject with feedback, or request changes.",
        scenarioId: "s18_implement_feedback",
      },
      {
        id: "write_comments",
        name: "Write Review Comments",
        description:
          "Add comments to a submission with specific feedback, questions, or required changes before approval.",
      },
    ],
    tips: [
      "Submissions are sorted by priority and submission date by default",
      "The impact analysis shows which alerts and models would be affected by the change",
      "Rejected submissions include feedback that the submitter can address and resubmit",
    ],
  },

  // --------------------------------------------------------------------------
  // 16. AI Assistant
  // --------------------------------------------------------------------------
  assistant: {
    viewId: "assistant",
    label: "AI Assistant",
    operations: [
      {
        id: "ask_questions",
        name: "Ask Questions",
        description:
          "Ask the AI assistant about the platform, detection models, data schema, regulatory requirements, or investigation workflows.",
      },
      {
        id: "use_scenarios",
        name: "Use Guided Scenarios",
        description:
          "Select from pre-built conversation scenarios that walk through common tasks like model building, alert investigation, or settings configuration.",
        scenarioId: "s25_full_platform_walkthrough",
      },
      {
        id: "explore_analysis",
        name: "Explore AI Analysis",
        description:
          "Let the assistant analyze alerts, suggest detection improvements, or explain complex calculation logic in plain language.",
      },
      {
        id: "generate_sql",
        name: "Generate SQL Queries",
        description:
          "Describe what data you need in natural language and the assistant will generate optimized DuckDB SQL queries.",
      },
    ],
    tips: [
      "The assistant understands the full platform schema — ask about any entity or field",
      "Try 'Explain this alert' with an alert ID for a plain-language investigation summary",
      "Use 'Suggest improvements' to get AI-powered recommendations for detection models",
      "The assistant can generate complex SQL including joins, aggregations, and window functions",
    ],
  },
};
