import type { ViewOperations } from "../components/TourEngine/OperationScripts.tsx";

// ==========================================================================
// Operation Scripts — Per-view help metadata (M119)
// ==========================================================================
// Each view defines 3-6 operations and 2-4 tips that appear in the (?) panel.
// Operations may link to guided scenarios (S1-S29) via scenarioId.
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
      {
        id: "view_navigation_config",
        name: "View Navigation Config",
        description:
          "Sidebar navigation is loaded from metadata at workspace/metadata/navigation/main.json. Edit the JSON to add, remove, or reorder views and groups — no code changes needed. The API endpoint GET /api/metadata/navigation serves the configuration.",
      },
      {
        id: "configure_widgets",
        name: "Configure Dashboard Widgets",
        description:
          "Dashboard widgets (KPI cards and charts) are defined in metadata at workspace/metadata/widgets/dashboard.json. Edit the JSON to add, remove, reorder, or reconfigure widgets — no code changes needed. The API endpoint GET/PUT /api/metadata/widgets/dashboard manages the configuration.",
      },
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
      },
    ],
    tips: [
      "Charts are interactive — hover for detailed tooltips with exact values",
      "Click the chart type switcher to toggle between bar, line, and pie views",
      "Use the time range selector to focus on specific detection windows",
      "Widget layout is metadata-driven — edit workspace/metadata/widgets/dashboard.json to customize",
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
          "Explore all 8 entities (product, execution, order, md_intraday, md_eod, venue, account, trader) and their field definitions in the full-width entity list.",
        scenarioId: "s19_explore_entity_model",
      },
      {
        id: "view_fields",
        name: "View Field Details",
        description:
          "Select an entity to see all fields with their types, constraints, descriptions, and whether they are primary keys or foreign keys. The detail pane appears below the entity list — drag the divider to resize.",
      },
      {
        id: "explore_relationships",
        name: "Explore Relationships",
        description:
          "Switch to the Relationship Graph tab to see the full entity graph with dagre auto-layout, minimap, and zoom controls. Click nodes to navigate between entities. Drag the divider to resize the graph pane.",
      },
      {
        id: "manage_domain_values",
        name: "Manage Domain Values",
        description:
          "Click any field row to open the Domain Values pane. View metadata-defined values (editable) and data-only values (found in the database but not in metadata). Add or remove domain values — changes save to the entity JSON immediately.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
      },
    ],
    tips: [
      "Click any entity to see its Fields and Relationships tabs in the detail pane below the list",
      "Switch to the Relationship Graph tab to see dagre auto-layout, minimap, zoom controls — click nodes to navigate between entities",
      "Drag the horizontal divider between panes to resize. Sizes persist across sessions.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
        id: "select_mapping",
        name: "Select or create a mapping",
        description:
          "Choose an existing mapping from the dropdown or click 'New Mapping' to create one. Select source and target entities.",
      },
      {
        id: "map_fields",
        name: "Map source to target fields",
        description:
          "For each row, select a source field, set the transform type, and choose the target field. Use 'Add Row' for new mappings.",
      },
      {
        id: "set_transform",
        name: "Set field transform type",
        description:
          "Change the transform type for a field mapping: direct (copy as-is), rename, cast (type conversion), uppercase, expression, etc.",
      },
      {
        id: "validate_mapping",
        name: "Validate mapping completeness",
        description:
          "Click 'Validate' to check the mapping against entity definitions. Shows errors, warnings, and unmapped fields.",
      },
      {
        id: "save_mapping",
        name: "Save mapping definition",
        description:
          "Click 'Save' to persist the mapping definition to disk. Changes the status from draft to saved.",
      },
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
      },
    ],
    tips: [
      "Mappings are persisted as JSON metadata in workspace/metadata/mappings/",
      "Validate after saving to check for unmapped fields",
      "The onboarding wizard auto-creates mappings when uploading data",
      "Transform types include: direct, rename, cast, uppercase, concat, expression",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
        name: "Explore Traceability Graph",
        description:
          "Navigate the interactive graph with smoothstep edges, edge labels, MiniMap, and zoom controls. Click nodes to see details with descriptions in the bottom pane. Drag the divider to resize.",
      },
      {
        id: "browse_regulation_details",
        name: "Browse Regulation Details",
        description:
          "Switch to the Regulation Details tab for a structured AG Grid table of all regulations and articles. Shows coverage status with color badges. Click a row to see the full article description.",
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
      {
        id: "view_iso_standards",
        name: "View ISO Standards",
        description:
          "Browse ISO standards registry (ISO 6166, 10383, 10962, 4217, 3166-1, 8601) with field mappings and validation rules.",
      },
      {
        id: "view_compliance_requirements",
        name: "View Compliance Requirements",
        description:
          "Browse granular compliance requirements mapped to detection models, calculations, and entity fields. Each requirement links to its implementation (model, calc, or field). Status shows implemented, partial, or planned.",
      },
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
      },
    ],
    tips: [
      "Green nodes indicate covered articles; red indicates gaps requiring attention",
      "Click any node to see details with descriptions in the full-width bottom pane",
      "Use the tab switcher to toggle between the Traceability Map and Regulation Details table",
      "Drag the horizontal divider between panes to resize. Sizes persist across sessions.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
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
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
      },
    ],
    tips: [
      "The assistant understands the full platform schema — ask about any entity or field",
      "Try 'Explain this alert' with an alert ID for a plain-language investigation summary",
      "Use 'Suggest improvements' to get AI-powered recommendations for detection models",
      "The assistant can generate complex SQL including joins, aggregations, and window functions",
    ],
  },

  // --------------------------------------------------------------------------
  // 17. Medallion Architecture
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 18. Data Onboarding
  // --------------------------------------------------------------------------
  onboarding: {
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
  },

  medallion: {
    viewId: "medallion",
    label: "Medallion Architecture",
    operations: [
      {
        id: "view_tier_graph",
        name: "View Tier Graph",
        description:
          "The React Flow diagram shows all 11 medallion tiers arranged left-to-right. Edges between tiers represent data contracts. The core flow is Landing → Bronze → Silver → Gold → Platinum, with side branches for Quarantine, Reference, Sandbox, Logging, Metrics, and Archive.",
      },
      {
        id: "inspect_tier",
        name: "Inspect Tier Details",
        description:
          "Click any tier node to see its properties in the detail panel: data state (raw, typed, canonical, aggregated, etc.), storage format, retention policy, quality gate, access level, and whether the tier is mutable or append-only.",
      },
      {
        id: "view_contracts",
        name: "View Data Contracts",
        description:
          "Select a tier to see its data contracts — agreements defining field mappings, quality rules, SLAs (freshness, completeness), ownership, and classification for data flowing between tiers.",
      },
      {
        id: "view_pipeline_stages",
        name: "View Pipeline Stages",
        description:
          "Select a tier to see related pipeline stages — the ordered execution steps that move data between tiers, including dependency chains and parallel execution flags.",
      },
      {
        id: "architecture_trace",
        name: "Explore Architecture Trace",
        description:
          "Toggle Architecture Traceability Mode (Ctrl+Shift+A) to see which sections of this view are metadata-driven. The tier graph and detail panel are fully metadata-driven from workspace/metadata/medallion/.",
      },
    ],
    tips: [
      "The medallion architecture defines 11 tiers for data lifecycle management — from raw ingestion to cold archive storage.",
      "Data contracts enforce quality rules and SLAs at each tier boundary.",
      "Pipeline stages define the ordered execution plan for moving data through tiers.",
      "Side tiers (Quarantine, Reference, Sandbox) handle special cases outside the main flow.",
    ],
  },
};
