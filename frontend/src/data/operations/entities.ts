import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 2. Entity Designer
// --------------------------------------------------------------------------
export const entitiesOperations: ViewOperations = {
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
};
