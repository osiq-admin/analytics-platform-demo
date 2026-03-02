import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Admin (S24-S29)


// ==========================================================================
// Scenario Definitions — Admin (S24-S25)
// ==========================================================================

// --------------------------------------------------------------------------
// S24: OOB vs Custom Metadata Review (Intermediate, 6 min)
// --------------------------------------------------------------------------
const S24_OOB_METADATA_REVIEW: ScenarioDefinition = {
  id: "s24_oob_metadata_review",
  name: "OOB vs Custom Metadata Review",
  description:
    "Understand the Out-of-Box (OOB) layer system — view layer badges, edit an OOB item to create a custom override, reset to OOB defaults, and use the version comparison panel to simulate an upgrade path.",
  category: "admin",
  difficulty: "intermediate",
  estimatedMinutes: 6,
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Editor — Layer System",
      content:
        "The Editor manages all configuration in the platform. A key concept is the layer system: 'OOB' (Out-of-Box) items ship with the platform, while 'Custom' items are user modifications. This separation enables safe upgrades — your customizations are preserved when the platform updates its defaults.",
      placement: "bottom",
      route: "/editor",
      action: "navigate",
      actionTarget: "[data-tour='editor-type-selector']",
      hint: "Navigate to Editor using the sidebar (under Configure).",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-layer-badge']",
      title: "Layer Badges",
      content:
        "Each metadata item displays a layer badge: 'OOB' (blue) for factory defaults, 'Custom' (purple) for user-created items, and 'Modified' (amber) for OOB items that have been customized. The badge tells you at a glance whether an item has been changed from its original state.",
      placement: "bottom",
      action: "wait",
      hint: "Look for the layer badge next to the item name. Note the color: blue = OOB, purple = Custom, amber = Modified.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Select an OOB Item",
      content:
        "Select an item with an 'OOB' badge using the item dropdown. The JSON editor shows the factory-default configuration. This is the baseline that the platform ships with — any edits you make will create a custom layer on top.",
      placement: "right",
      action: "wait",
      hint: "Use the item dropdown to select an item with a blue 'OOB' badge. Read the JSON to understand the default configuration.",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-json']",
      title: "Edit to Create a Custom Override",
      content:
        "Make a small edit to the JSON — for example, change a description or adjust a threshold value. When you save, the item's badge will change from 'OOB' (blue) to 'Modified' (amber), indicating this is now a customized version of the factory default.",
      placement: "right",
      action: "type",
      actionTarget: "[data-tour='editor-json'] .monaco-editor .inputarea",
      actionValue: "custom",
      hint: "Edit a value in the JSON editor. Watch the layer badge change from OOB to Modified after saving.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-save']",
      title: "Save the Modification",
      content:
        "Click Save to persist your change. The layer badge updates to 'Modified' — this tells reviewers and administrators that this item has been customized and differs from the factory default.",
      placement: "top",
      action: "click",
      actionTarget: "[data-tour='editor-save'] button:last-child",
      hint: "Click Save and observe the layer badge change to 'Modified' (amber).",
      delay: 2500,
    },
    {
      target: "[data-tour='editor-oob-banner']",
      title: "OOB Conflict Banner",
      content:
        "When a platform upgrade ships a new version of an item you've modified, an OOB conflict banner appears. This warns you that the factory default has changed and your customization may need review. The banner shows the version difference and offers options to resolve the conflict.",
      placement: "bottom",
      action: "wait",
      hint: "Look for the OOB conflict banner at the top of the editor. It appears when the factory default has been updated.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-reset-oob']",
      title: "Reset to OOB Default",
      content:
        "Click the Reset button to discard your customization and restore the factory default. This is useful when an upgrade provides better defaults or when a customization is no longer needed. The badge reverts from 'Modified' back to 'OOB'.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='editor-reset-oob']",
      hint: "Click the Reset to OOB button to restore the factory default. Watch the badge revert to 'OOB' (blue).",
      delay: 3000,
    },
    {
      target: "[data-tour='editor-visual']",
      title: "Version Comparison",
      content:
        "The Visual Editor includes a version comparison panel with dual dropdowns and a color-coded diff table. Compare your custom version against the OOB baseline or between different saved versions. Green rows are additions, red rows are removals, and amber rows are modifications. This is essential for upgrade planning and audit trails.",
      placement: "left",
      action: "wait",
      hint: "Open the Visual Editor tab. Use the version dropdowns to compare OOB vs Custom. Review the color-coded diff.",
      delay: 3500,
    },
    {
      target: "[data-tour='editor-type-selector']",
      title: "OOB Metadata Review Complete",
      content:
        "You've learned the layer system: OOB defaults provide a stable baseline, Custom overrides preserve your changes, and the version comparison panel enables safe upgrades. This architecture ensures platform updates never silently overwrite your customizations.",
      placement: "bottom",
      action: "wait",
      delay: 3000,
    },
  ],
};


// --------------------------------------------------------------------------
// S25: Full Platform Demo Walkthrough (Advanced, 12 min)
// --------------------------------------------------------------------------
const S25_FULL_PLATFORM_DEMO: ScenarioDefinition = {
  id: "s25_full_platform_demo",
  name: "Full Platform Demo Walkthrough",
  description:
    "Complete end-to-end demo covering the entire platform: data ingestion, entity model, pipeline execution, alert investigation, threshold tuning, model review, regulatory compliance, and governance submission — all in one guided flow.",
  category: "admin",
  difficulty: "advanced",
  estimatedMinutes: 12,
  prerequisites: ["s21_alert_investigation", "s24_oob_metadata_review"],
  steps: [
    {
      target: "[data-tour='data-list']",
      title: "Step 1: Data Ingestion",
      content:
        "We begin at the Data view — the entry point for all trade data. The platform ingests CSV files for 8 entity types: products, orders, executions, market data, venues, accounts, and traders. This raw data feeds into everything downstream.",
      placement: "right",
      route: "/data",
      action: "navigate",
      actionTarget: "[data-tour='data-list']",
      hint: "Navigate to Data to see the raw data files loaded into the platform.",
      delay: 3000,
    },
    {
      target: "[data-tour='data-preview']",
      title: "Preview Raw Data",
      content:
        "Click on a file to preview its contents. The Data view provides a quick-look grid for any loaded file — useful for verifying data quality before running detection. Notice the ISO-standard fields (ISIN, MIC) and FIX Protocol values (OrdType, ExecType).",
      placement: "left",
      action: "click",
      actionTarget:
        "[data-tour='data-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on a data file to preview it in the right panel.",
      validation: "[data-tour='data-preview']",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-list']",
      title: "Step 2: Entity Data Model",
      content:
        "The Entities view shows how data is structured. Use the Entity Details tab for Fields/Relationships, or the Relationship Graph tab for the visual entity map. Eight entities form the data model.",
      placement: "bottom",
      route: "/entities",
      action: "navigate",
      actionTarget: "[data-tour='entity-list']",
      hint: "Navigate to Entities to see the data model.",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Entity Relationships",
      content:
        "The relationship graph uses dagre auto-layout with minimap navigation and zoom controls. Click nodes to navigate between entities — the selected entity is highlighted with connected edges emphasized. Drag the divider to resize the graph pane.",
      placement: "top",
      action: "wait",
      hint: "Study the relationship graph. Trace connections from execution through order to trader and account.",
      delay: 3000,
    },
    {
      target: "[data-tour='pipeline-dag']",
      title: "Step 3: Run the Detection Pipeline",
      content:
        "The Pipeline view shows the detection DAG — the sequence of calculations and detection models that process raw data into alerts. Each node represents a calculation step; edges show dependencies. The DAG ensures calculations execute in the correct order.",
      placement: "right",
      route: "/pipeline",
      action: "navigate",
      actionTarget: "[data-tour='pipeline-dag']",
      hint: "Navigate to Pipeline to see the detection pipeline.",
      delay: 2500,
    },
    {
      target: "[data-tour='pipeline-run']",
      title: "Execute the Pipeline",
      content:
        "Click 'Run Pipeline' to execute all detection models on the loaded data. The DAG nodes animate as each calculation completes — green for success, red for failure. When finished, new alerts appear in Risk Cases.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='pipeline-run']",
      hint: "Click the Run Pipeline button. Watch the DAG nodes animate as calculations execute.",
      delay: 3500,
    },
    {
      target: "[data-tour='alert-grid']",
      title: "Step 4: Investigate Alerts",
      content:
        "Risk Cases shows all generated alerts. Sort by score to find the highest-priority cases. Each alert includes a full investigation package: score breakdown, calculation trace DAG, market data chart, related orders, and settings trace.",
      placement: "bottom",
      route: "/alerts",
      action: "navigate",
      actionTarget: "[data-tour='alert-grid']",
      hint: "Navigate to Risk Cases and sort by score to find the top alert.",
      delay: 2500,
    },
    {
      target: "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      title: "Drill Into an Alert",
      content:
        "Click the top alert to open its detail view. Review the score breakdown to understand why it triggered, the market data chart for price context, and related orders for the specific trades involved. This is the core investigation workflow.",
      placement: "bottom",
      action: "click",
      actionTarget:
        "[data-tour='alert-grid'] .ag-body-viewport .ag-row:first-child",
      hint: "Click the top alert row to open its detail panel and review the investigation data.",
      delay: 3000,
    },
    {
      target: "[data-tour='settings-list']",
      title: "Step 5: Tune Thresholds",
      content:
        "Based on the investigation, you may want to adjust detection sensitivity. Settings lets you modify thresholds — lower them to catch more activity, raise them to reduce false positives. Use the Resolution Tester to verify how changes affect specific products.",
      placement: "right",
      route: "/settings",
      action: "navigate",
      actionTarget: "[data-tour='settings-list']",
      hint: "Navigate to Settings to review and tune detection thresholds.",
      delay: 2500,
    },
    {
      target: "[data-tour='model-list']",
      title: "Step 6: Review Detection Models",
      content:
        "Models lets you review and modify the detection models that generated the alerts. Each model defines which calculations to run, how to score them, and what thresholds trigger alerts. Use the validation panel to ensure model integrity.",
      placement: "right",
      route: "/models",
      action: "navigate",
      actionTarget: "[data-tour='model-list']",
      hint: "Navigate to Models to review the detection models.",
      delay: 2500,
    },
    {
      target: "[data-tour='regulatory-cards']",
      title: "Step 7: Regulatory Compliance",
      content:
        "The Regulatory Map shows how your detection models map to regulatory obligations. Coverage cards indicate which obligations are fully covered, partially covered, or have gaps. The traceability graph provides end-to-end lineage from regulation to detection logic.",
      placement: "right",
      route: "/regulatory",
      action: "navigate",
      actionTarget: "[data-tour='regulatory-cards']",
      hint: "Navigate to the Regulatory Map to check compliance coverage.",
      delay: 2500,
    },
    {
      target: "[data-tour='regulatory-graph']",
      title: "Regulatory Traceability",
      content:
        "The traceability graph connects regulatory obligations to detection models to calculations. This proves to regulators that every required surveillance capability is implemented and can be traced to specific detection logic.",
      placement: "left",
      action: "wait",
      hint: "Review the traceability graph. Ensure all obligations have at least one connected detection model.",
      delay: 3000,
    },
    {
      target: "[data-tour='dashboard-cards']",
      title: "Step 8: Return to Dashboard",
      content:
        "Complete the loop by returning to the Dashboard. The summary metrics now reflect the full detection run — total alerts, score distributions, and model coverage. From here you can start a new investigation cycle or drill into any area for deeper analysis.",
      placement: "bottom",
      route: "/dashboard",
      action: "navigate",
      actionTarget: "[data-tour='dashboard-cards']",
      hint: "Navigate back to the Dashboard to see the full picture.",
      delay: 2500,
    },
    {
      target: "[data-tour='dashboard-triggers']",
      title: "Full Platform Demo Complete",
      content:
        "You've completed the full platform walkthrough: data ingestion → entity model → pipeline execution → alert investigation → threshold tuning → model review → regulatory compliance → dashboard summary. This end-to-end flow demonstrates every capability of the trade surveillance platform.",
      placement: "left",
      action: "wait",
      delay: 3500,
    },
  ],
};


// --------------------------------------------------------------------------
// S26: Architecture Traceability Tour (Beginner, 3 min)
// --------------------------------------------------------------------------
const S26_ARCHITECTURE_TRACE: ScenarioDefinition = {
  id: "s26_architecture_trace",
  name: "Architecture Traceability Tour",
  description:
    "Learn how to explore the architecture behind each section of the platform using the Trace toggle mode.",
  category: "admin",
  difficulty: "beginner",
  estimatedMinutes: 3,
  steps: [
    {
      target: "[data-action='trace']",
      title: "Enable Trace Mode",
      content:
        "Click the **Trace** button in the top toolbar to enable architecture traceability mode.",
      placement: "bottom",
      route: "/dashboard",
      action: "click",
      actionTarget: "[data-action='trace']",
      hint: "Click the Trace button in the top toolbar to enable architecture traceability mode.",
      delay: 2500,
    },
    {
      target: "button[title^='Architecture trace:']",
      title: "Click an Info Icon",
      content:
        "Notice the blue **i** icons that appear on each section. Click any icon on the Dashboard to open the architecture trace popup.",
      placement: "bottom",
      route: "/dashboard",
      action: "click",
      actionTarget: "button[title^='Architecture trace:']",
      hint: "Click any blue info icon on the Dashboard to open the architecture trace popup.",
      delay: 2500,
    },
    {
      target: ".animate-slide-in-right",
      title: "Explore the Trace Popup",
      content:
        "The popup shows source files, API endpoints, Zustand stores, metadata files, technologies, and a metadata-maturity rating. Scroll through the sections to explore.",
      placement: "left",
      route: "/dashboard",
      action: "wait",
      hint: "Scroll through the trace popup to see source files, APIs, stores, metadata, technologies, and maturity rating.",
      delay: 3500,
    },
    {
      target: "[data-trace^='entities.']",
      title: "Navigate to Entities",
      content:
        "Close the popup and navigate to **Entities** to see architecture traces on entity-related sections.",
      placement: "right",
      route: "/entities",
      action: "navigate",
      actionTarget: "[data-trace^='entities.']",
      hint: "Navigate to the Entities view to see architecture traces on entity-related sections.",
      delay: 2500,
    },
    {
      target: "button[title^='Architecture trace:']",
      title: "Trace Entity Architecture",
      content:
        "Click an entity section's trace icon to see how entities are fully metadata-driven — loaded from JSON files on disk with no code changes needed.",
      placement: "bottom",
      route: "/entities",
      action: "click",
      actionTarget: "button[title^='Architecture trace:']",
      hint: "Click an entity section's trace icon to see how entities are fully metadata-driven.",
      delay: 3000,
    },
  ],
};


// ==========================================================================
// S27: Medallion Architecture Walkthrough
// ==========================================================================

const S27_MEDALLION_ARCHITECTURE: ScenarioDefinition = {
  id: "s27_medallion_architecture",
  name: "S27: Medallion Architecture Walkthrough",
  description: "Explore the 11-tier medallion data architecture — tiers, contracts, transformations, and pipeline stages",
  category: "admin",
  difficulty: "beginner",
  estimatedMinutes: 3,
  steps: [
    {
      target: "[data-tour='medallion-graph']",
      title: "View Tier Graph",
      content: "The React Flow diagram shows all 11 medallion tiers arranged left-to-right.",
      route: "/medallion",
      action: "navigate",
      hint: "Navigate to the Medallion Architecture view to see the tier graph",
      delay: 2000,
    },
    {
      target: "[data-tour='medallion-graph']",
      title: "Select a Tier",
      content: "Click any tier node to inspect its properties in the detail panel.",
      route: "/medallion",
      action: "click",
      actionTarget: "[data-tour='medallion-graph'] .react-flow__node",
      hint: "Click the 'Bronze' tier node to inspect its properties",
      delay: 3000,
    },
    {
      target: "[data-tour='medallion-tier-detail']",
      title: "Review Tier Details",
      content: "The detail panel shows data state, format, retention, quality gate, access level, and related contracts.",
      route: "/medallion",
      action: "wait",
      hint: "Review the tier detail panel showing data state, format, retention, quality gate, access level, and related contracts",
      delay: 4000,
    },
  ],
};


// ==========================================================================
// S28: Upload & Profile Data (Data Onboarding)
// ==========================================================================

const S28_DATA_ONBOARDING: ScenarioDefinition = {
  id: "s28_data_onboarding",
  name: "S28: Upload & Profile Data",
  description:
    "Upload a CSV file through the Data Onboarding wizard, auto-detect its schema, profile data quality metrics, and map it to a canonical entity.",
  category: "admin",
  difficulty: "beginner",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='onboarding-wizard']",
      title: "Open Data Onboarding",
      content: "Navigate to the Data Onboarding view under the Operate section in the sidebar.",
      route: "/onboarding",
      action: "navigate",
      actionTarget: "[data-tour='onboarding-wizard']",
      hint: "Click 'Onboarding' in the sidebar under Operate.",
      delay: 2500,
    },
    {
      target: "[data-tour='onboarding-wizard']",
      title: "Upload a CSV File",
      content: "Select a CSV file using the file picker and click 'Upload & Detect' to auto-detect the schema.",
      action: "click",
      actionTarget: "[data-tour='onboarding-wizard']",
      hint: "Choose a CSV file and click the upload button.",
      delay: 2500,
    },
    {
      target: "[data-tour='onboarding-schema']",
      title: "Review Detected Schema",
      content: "The schema table shows detected column names, types, nullability, and patterns like ISIN or MIC codes.",
      action: "wait",
      hint: "Review the columns table showing auto-detected types.",
      delay: 3500,
    },
    {
      target: "[data-tour='onboarding-profile']",
      title: "Profile Data Quality",
      content: "Click 'Next: Profile Data' to run quality analysis. Review completeness, null rates, distinct counts, and the overall quality score.",
      action: "click",
      actionTarget: "[data-tour='onboarding-profile']",
      hint: "Click the profile button and review the quality metrics.",
      delay: 3000,
    },
  ],
};


// ==========================================================================
// S29: Mapping Studio — Create & Validate Mapping
// ==========================================================================

const S29_MAPPING_STUDIO: ScenarioDefinition = {
  id: "s29_mapping_studio",
  name: "S29: Create & Validate a Mapping",
  description:
    "Walk through the Mappings view to select a mapping, view field mappings, and validate completeness against entity definitions.",
  category: "admin",
  difficulty: "beginner",
  estimatedMinutes: 4,
  steps: [
    {
      target: "[data-tour='mapping-selector']",
      title: "Open Mappings",
      content: "Navigate to Mappings under the Configure section. Select an existing mapping from the dropdown to view its field mappings.",
      route: "/mappings",
      action: "navigate",
      actionTarget: "[data-tour='mapping-selector']",
      hint: "Click 'Mappings' in the sidebar under Configure.",
      delay: 2500,
    },
    {
      target: "[data-tour='mapping-selector']",
      title: "Select a Mapping",
      content: "Choose a mapping from the dropdown list. Each mapping defines source-to-target field relationships between two entities.",
      action: "click",
      actionTarget: "[data-tour='mapping-selector']",
      hint: "Click the mapping dropdown and select an existing mapping.",
      delay: 2000,
    },
    {
      target: "[data-tour='mapping-canvas']",
      title: "Review Field Mappings",
      content: "The field mapping table shows each source field, its transform type, and the target field. Transform types include direct, rename, cast, uppercase, and expression.",
      action: "wait",
      hint: "Review the mapping rows in the table.",
      delay: 3000,
    },
    {
      target: "[data-tour='mapping-validation']",
      title: "Validate Mapping",
      content: "Click 'Validate' to check the mapping against entity definitions. The validation panel shows errors, warnings, and any unmapped fields.",
      action: "click",
      actionTarget: "[data-tour='mapping-validation']",
      hint: "Click the Validate button and review the results.",
      delay: 2500,
    },
    {
      target: "[data-tour='mapping-validation']",
      title: "Review Validation Results",
      content: "The validation panel shows coverage percentage, unmapped fields, and any type mismatches. Address warnings before saving.",
      action: "wait",
      hint: "Review errors and warnings in the validation results.",
      delay: 2500,
    },
  ],
};

export const adminScenarios: Record<string, ScenarioDefinition> = {
  s24_oob_metadata_review: S24_OOB_METADATA_REVIEW,
  s25_full_platform_demo: S25_FULL_PLATFORM_DEMO,
  s26_architecture_trace: S26_ARCHITECTURE_TRACE,
  s27_medallion_architecture: S27_MEDALLION_ARCHITECTURE,
  s28_data_onboarding: S28_DATA_ONBOARDING,
  s29_mapping_studio: S29_MAPPING_STUDIO,
};
