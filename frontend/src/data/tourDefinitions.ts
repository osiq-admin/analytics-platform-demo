import type { TourDefinition } from "../stores/tourStore.ts";

export const TOURS: Record<string, TourDefinition> = {
  overview: {
    id: "overview",
    name: "App Overview",
    description: "Get oriented with the main areas of the analytics platform.",
    steps: [
      {
        target: "[data-tour='sidebar']",
        title: "Navigation Sidebar",
        content: "The sidebar organizes views into workflow phases: Define, Configure, Operate, Compose, and Investigate.",
        placement: "right",
      },
      {
        target: "[data-tour='demo-toolbar']",
        title: "Demo Controls",
        content: "Use these controls to step through the demo scenario. Reset starts fresh, Step advances one checkpoint, End skips to the final state.",
        placement: "bottom",
      },
      {
        target: "[data-tour='theme-toggle']",
        title: "Theme & Tour",
        content: "Toggle light/dark mode, or start a guided tour for the current view.",
        placement: "bottom",
      },
      {
        target: "[data-tour='theme-toggle']",
        title: "Architecture Traceability",
        content: "Click the Trace button to overlay architecture info icons on every section. Each icon reveals which files, APIs, metadata, stores, and technologies control that section, plus a metadata-maturity analysis.",
        placement: "bottom" as const,
      },
    ],
  },

  dashboard: {
    id: "dashboard",
    name: "Dashboard Tour",
    description: "Explore the summary dashboard.",
    steps: [
      {
        target: "[data-tour='dashboard-cards']",
        title: "Summary Metrics",
        content: "Key performance indicators: total alerts generated, score-triggered percentage (alerts exceeding threshold), average scores, and active detection models.",
        placement: "bottom",
        route: "/dashboard",
      },
      {
        target: "[data-tour='dashboard-by-model']",
        title: "Alerts by Model",
        content: "Distribution of alerts across detection models — see which models fire most frequently.",
        placement: "right",
      },
      {
        target: "[data-tour='dashboard-scores']",
        title: "Score Distribution",
        content: "Histogram showing how alert scores are distributed. Peaks near thresholds may indicate tuning opportunities.",
        placement: "left",
      },
      {
        target: "[data-tour='dashboard-triggers']",
        title: "Trigger Paths",
        content: "Shows how alerts were triggered — score-based (exceeded threshold) or all-passed (all calculations passed their criteria).",
        placement: "right",
      },
    ],
  },

  entities: {
    id: "entities",
    name: "Entity Designer Tour",
    description: "Learn about the data model and entity definitions.",
    steps: [
      {
        target: "[data-tour='entity-list']",
        title: "Entity List",
        content:
          "All data entities in the system. Each entity represents a table (execution, order, product, market data). Use the tab switcher above to toggle between Entity Details and the Relationship Graph.",
        placement: "bottom",
        route: "/entities",
      },
      {
        target: "[data-tour='entity-fields']",
        title: "Field Definitions",
        content:
          "Each entity has typed fields with nullability, keys, and domain values — shown in the Fields tab. The Domain column shows how many values are defined. Click any field row to open the Domain Values pane, where you can view, add, and remove metadata-defined values, and see data-only values from the database. Switch to the Relationships tab to see foreign key connections.",
        placement: "top",
      },
      {
        target: "[data-tour='entity-relationships']",
        title: "Relationships",
        content:
          "Switch to the Relationship Graph tab to see the full entity graph with dagre auto-layout, minimap, and zoom controls. Click a node to select that entity across both tabs.",
        placement: "top",
      },
    ],
  },

  settings: {
    id: "settings",
    name: "Settings Manager Tour",
    description: "Understand how scoring thresholds and overrides work.",
    steps: [
      {
        target: "[data-tour='settings-list']",
        title: "Settings & Overrides",
        content: "Configure detection thresholds and scoring parameters. Overrides let you customize per product, asset class, or account.",
        placement: "right",
        route: "/settings",
      },
      {
        target: "[data-tour='settings-score-steps']",
        title: "Score Steps",
        content: "Score steps define the escalation ladder: how accumulated scores map to trigger paths (review → escalate → fire).",
        placement: "bottom",
      },
      {
        target: "[data-tour='settings-resolver']",
        title: "Resolution Tester",
        content: "Test how settings resolve for a specific context (product + asset class). See which override wins and why.",
        placement: "left",
      },
    ],
  },

  models: {
    id: "models",
    name: "Model Composer Tour",
    description: "Build and deploy detection models.",
    steps: [
      {
        target: "[data-tour='model-list']",
        title: "Detection Models",
        content: "All detection models in the system. Each model combines calculations, thresholds, and scoring logic.",
        placement: "right",
        route: "/models",
      },
      {
        target: "[data-tour='model-detail']",
        title: "Model Configuration",
        content: "View and edit model parameters: calculation chain, strictness level, and deployment status.",
        placement: "left",
      },
    ],
  },

  alerts: {
    id: "alerts",
    name: "Risk Case Manager Tour",
    description: "Investigate and manage alerts.",
    steps: [
      {
        target: "[data-tour='alert-grid']",
        title: "Alert Grid",
        content: "All generated alerts with sortable columns. Click any row to open the detailed investigation view.",
        placement: "bottom",
        route: "/alerts",
      },
      {
        target: "[data-tour='alert-filters']",
        title: "Filtering & Sorting",
        content: "Use column headers to sort and filter alerts by model, score, trigger path, or date.",
        placement: "bottom",
      },
    ],
  },

  sql: {
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
  },

  pipeline: {
    id: "pipeline",
    name: "Pipeline Monitor Tour",
    description: "Visualize and run the calculation pipeline.",
    steps: [
      {
        target: "[data-tour='pipeline-dag']",
        title: "Pipeline DAG",
        content: "Directed acyclic graph showing the calculation pipeline. Each node is a calculation step with dependencies.",
        placement: "bottom",
        route: "/pipeline",
      },
      {
        target: "[data-tour='pipeline-run']",
        title: "Run Pipeline",
        content: "Execute the full calculation and detection pipeline. Progress updates in real-time.",
        placement: "left",
      },
    ],
  },

  schema: {
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
  },

  mappings: {
    id: "mappings",
    name: "Mapping Studio Tour",
    description: "Create and validate source-to-target field mappings between entities.",
    steps: [
      {
        target: "[data-tour='mapping-selector']",
        title: "Mapping Selector",
        content: "Select an existing mapping definition from the dropdown, or click 'New Mapping' to create one. Choose source and target entities to define the mapping scope.",
        placement: "right",
        route: "/mappings",
      },
      {
        target: "[data-tour='mapping-canvas']",
        title: "Field Mapping Canvas",
        content: "Edit source-to-target field mappings in the table. Each row maps a source field to a target field with a transform type (direct, rename, cast, uppercase, expression). Use 'Add Row' for new mappings.",
        placement: "bottom",
      },
      {
        target: "[data-tour='mapping-validation']",
        title: "Validation Panel",
        content: "Click 'Validate' to check mapping completeness against entity definitions. Shows errors, warnings, and unmapped fields that need attention.",
        placement: "top",
      },
    ],
  },

  data: {
    id: "data",
    name: "Data Manager Tour",
    description: "Browse and preview raw data files.",
    steps: [
      {
        target: "[data-tour='data-list']",
        title: "Data Files",
        content: "CSV data files loaded into the system: executions, orders, products, and market data.",
        placement: "right",
        route: "/data",
      },
      {
        target: "[data-tour='data-preview']",
        title: "Data Preview",
        content: "Click any file to preview its contents in a data grid. Shows first 100 rows.",
        placement: "left",
      },
    ],
  },

  assistant: {
    id: "assistant",
    name: "AI Assistant Tour",
    description: "Get AI-powered help with analysis.",
    steps: [
      {
        target: "[data-tour='assistant-chat']",
        title: "AI Chat",
        content: "Ask questions about the data, alerts, or system behavior. The AI can query the database and explain results.",
        placement: "left",
        route: "/assistant",
      },
      {
        target: "[data-tour='assistant-scenarios']",
        title: "Scenario Presets",
        content: "Pre-built analysis scenarios to explore common investigation workflows.",
        placement: "bottom",
      },
    ],
  },

  editor: {
    id: "editor",
    name: "Metadata Editor Tour",
    description: "Edit metadata with side-by-side JSON and visual editors.",
    steps: [
      {
        target: "[data-tour='editor-type-selector']",
        title: "Metadata Type Selector",
        content: "Switch between Entities, Calculations, Settings, and Detection Models. Each type has its own visual editor.",
        placement: "bottom",
        route: "/editor",
      },
      {
        target: "[data-tour='editor-json']",
        title: "JSON Editor",
        content: "Edit raw JSON directly with Monaco Editor — full syntax highlighting, validation, and auto-format.",
        placement: "right",
      },
      {
        target: "[data-tour='editor-visual']",
        title: "Visual Editor",
        content: "The visual editor syncs bidirectionally with JSON. Changes in either panel update the other in real-time.",
        placement: "left",
      },
      {
        target: "[data-tour='editor-save']",
        title: "Save & Validate",
        content: "The status indicator shows JSON validity. Click Save to persist changes to the backend.",
        placement: "top",
      },
    ],
  },

  regulatory: {
    id: "regulatory",
    name: "Regulatory Traceability Tour",
    description: "Explore the regulatory coverage map and gap analysis.",
    steps: [
      {
        target: "[data-tour='regulatory-cards']",
        title: "Coverage Summary",
        content: "At a glance: how many regulatory requirements are covered by detection models, and how many have gaps.",
        placement: "bottom",
        route: "/regulatory",
      },
      {
        target: "[data-tour='regulatory-graph']",
        title: "Traceability Graph",
        content: "Interactive graph showing the full chain: Regulations → Articles → Detection Models → Calculations. Smoothstep edges with labels show relationship types. Use the MiniMap (bottom-right) and zoom Controls to navigate. Red nodes indicate coverage gaps.",
        placement: "bottom",
      },
      {
        target: "[data-tour='regulatory-detail']",
        title: "Node Details",
        content: "Click any node in the graph to see its details — regulation info, model parameters, calculation metadata, and descriptions. The detail pane is below the graph — drag the divider to resize.",
        placement: "top",
      },
      {
        target: "[data-tour='regulatory-details-grid']",
        title: "Regulation Details Table",
        content: "Switch to the Regulation Details tab for a structured table view of all regulations and articles. Shows regulation name, jurisdiction, article, title, and coverage status. Click any row to see the full article description below.",
        placement: "bottom",
      },
      {
        target: "[data-tour='regulatory-suggestions']",
        title: "Suggestions & Gap Analysis",
        content: "Automated suggestions for improving regulatory coverage — coverage gaps that need new models, and existing models that could be strengthened.",
        placement: "top",
      },
    ],
  },

  // Demo workflow guides
  act1_guide: {
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
        content: "Start by exploring the raw data files. These CSV files contain executions, orders, products, and market data.",
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
  },

  act2_guide: {
    id: "act2_guide",
    name: "Act 2: Model Composition",
    description: "Learn how to compose and tune detection models.",
    steps: [
      {
        target: "[data-tour='model-list']",
        title: "Act 2: Model Composition",
        content: "This guide shows how detection models are built, configured, and deployed.",
        placement: "right",
        route: "/models",
      },
      {
        target: "[data-tour='model-detail']",
        title: "Model Parameters",
        content: "Each model defines its calculation chain, detection SQL, and strictness level.",
        placement: "left",
      },
      {
        target: "[data-tour='settings-score-steps']",
        title: "Score Steps",
        content: "Score steps define the escalation ladder — how accumulated scores trigger review, escalation, or firing.",
        placement: "bottom",
        route: "/settings",
      },
      {
        target: "[data-tour='mapping-selector']",
        title: "Input Mappings",
        content: "The Mapping Studio defines source-to-target field mappings between entities, with transform types and validation.",
        placement: "right",
        route: "/mappings",
      },
      {
        target: "[data-tour='editor-layer-badge']",
        title: "OOB Layer Separation",
        content: "Notice the layer badges — OOB items ship with the platform. When you customize one, it becomes 'Modified' and can be reset to the original.",
        placement: "bottom",
        route: "/editor",
      },
    ],
  },

  oob: {
    id: "oob",
    name: "OOB vs Custom Metadata Tour",
    description: "Learn how out-of-box metadata is separated from user customizations.",
    steps: [
      {
        target: "[data-tour='editor-type-selector']",
        title: "Metadata Types",
        content: "All metadata types (Entities, Calculations, Settings, Models) support OOB/User layer separation.",
        placement: "bottom",
        route: "/editor",
      },
      {
        target: "[data-tour='editor-layer-badge']",
        title: "Layer Badge",
        content: "The layer badge shows the item's provenance: OOB (shipped with the platform), Modified (OOB with your edits), or Custom (user-created).",
        placement: "bottom",
      },
      {
        target: "[data-tour='editor-oob-banner']",
        title: "OOB Info Banner",
        content: "When you select an out-of-box item, this banner reminds you that editing will create a user override — the original is preserved.",
        placement: "bottom",
      },
      {
        target: "[data-tour='editor-json']",
        title: "Edit an OOB Item",
        content: "Try editing a field in the JSON editor. When you save, your changes are stored as a user override. The original OOB definition stays untouched.",
        placement: "right",
      },
      {
        target: "[data-tour='editor-reset-oob']",
        title: "Reset to OOB",
        content: "After modifying an OOB item, the Reset button appears. Click it to discard your override and restore the original out-of-box definition.",
        placement: "top",
      },
      {
        target: "[data-tour='oob-version-panel']",
        title: "OOB Version & Upgrade",
        content: "The version panel shows which OOB package is installed, how many items are included, and how many you've customized.",
        placement: "right",
      },
      {
        target: "[data-tour='oob-upgrade-btn']",
        title: "Simulate Upgrade",
        content: "Click 'Simulate Upgrade' to preview what would happen if a new OOB version were installed — added items, modified items, and potential conflicts with your overrides.",
        placement: "bottom",
      },
    ],
  },

  ux_features: {
    id: "ux_features",
    name: "Grid & Layout Features",
    description: "Explore the data grid features — resize columns, view tooltips, and navigate between views.",
    steps: [
      {
        target: "[data-tour='entity-list']",
        title: "Resizable Columns",
        content: "Drag column borders to resize. Columns auto-fit to the available space but you can adjust them.",
        placement: "right",
        route: "/entities",
      },
      {
        target: "[data-tour='entity-relationships']",
        title: "Relationship Graph",
        content: "Switch to the Relationship Graph tab to see the full entity graph with dagre auto-layout, minimap, and zoom controls. Click nodes to navigate between entities. Drag the divider to resize.",
        placement: "top",
      },
      {
        target: "[data-tour='calc-layer-badge']",
        title: "Layer Badges",
        content: "Color-coded badges indicate item provenance — OOB (shipped) vs Custom (user-created).",
        placement: "right",
        route: "/metadata",
      },
      {
        target: "[data-tour='editor-json']",
        title: "Dual Editors",
        content: "The Metadata Editor provides both JSON and Visual editing modes side by side.",
        placement: "bottom",
        route: "/editor",
      },
      {
        target: "[data-tour='alert-filters']",
        title: "Alert Grid",
        content: "The Risk Case Manager shows all alerts with sortable columns. Hover truncated cells to see full content in tooltips.",
        placement: "bottom",
        route: "/alerts",
      },
    ],
  },

  act3_guide: {
    id: "act3_guide",
    name: "Act 3: Investigation & Analysis",
    description: "Deep-dive into alert investigation tools.",
    steps: [
      {
        target: "[data-tour='alert-grid']",
        title: "Act 3: Investigation",
        content: "This guide shows the investigation workflow for analyzing alerts in detail.",
        placement: "bottom",
        route: "/alerts",
      },
      {
        target: "[data-tour='dashboard-cards']",
        title: "Dashboard Overview",
        content: "Start with the dashboard for a high-level view of alert volume and distribution.",
        placement: "bottom",
        route: "/dashboard",
      },
      {
        target: "[data-tour='assistant-chat']",
        title: "AI-Powered Analysis",
        content: "Use the AI Assistant to ask questions about specific alerts or run analytical queries.",
        placement: "left",
        route: "/assistant",
      },
    ],
  },

  medallion: {
    id: "medallion",
    name: "Medallion Architecture",
    description: "Explore the 11-tier medallion data architecture with data contracts, transformations, and pipeline stages",
    steps: [
      {
        target: "[data-tour='medallion-graph']",
        title: "Tier Architecture Graph",
        content: "This React Flow diagram shows all 11 tiers of the medallion architecture. Tiers are arranged left-to-right from raw data (Landing) through processed (Gold/Platinum) to operational tiers (Logging, Metrics, Archive). Edges show data contracts between tiers.",
        placement: "bottom",
        route: "/medallion",
      },
      {
        target: "[data-tour='medallion-tier-detail']",
        title: "Tier Detail Panel",
        content: "Click any tier node to see its properties: data state, storage format, retention policy, quality gate, and access level. Related data contracts and pipeline stages are shown below.",
        placement: "left",
        route: "/medallion",
      },
    ],
  },

  onboarding: {
    id: "onboarding",
    name: "Data Onboarding",
    description: "Walk through the guided data onboarding wizard — upload files, auto-detect schema, profile data quality, and map to canonical entities.",
    steps: [
      {
        target: "[data-tour='onboarding-wizard']",
        title: "Onboarding Wizard",
        content: "The 5-step wizard guides you through uploading data files, detecting their schema, profiling quality, mapping to entities, and confirming ingestion to the Landing tier.",
        route: "/onboarding",
      },
      {
        target: "[data-tour='onboarding-schema']",
        title: "Schema Detection",
        content: "After uploading a file, the system auto-detects column names, types, and patterns (ISIN, MIC, ISO8601, etc.) using PyArrow inference.",
        route: "/onboarding",
      },
      {
        target: "[data-tour='onboarding-profile']",
        title: "Data Profile",
        content: "The profiler analyzes completeness, null rates, distinct counts, min/max values, and overall quality score for every column.",
        route: "/onboarding",
      },
    ],
  },
};
