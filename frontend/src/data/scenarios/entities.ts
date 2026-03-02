import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Entities (S19-S20)


// ==========================================================================
// Scenario Definitions — Entities (S19-S20)
// ==========================================================================

// --------------------------------------------------------------------------
// S19: Explore Entity Data Model (Beginner, 5 min)
// --------------------------------------------------------------------------
const S19_EXPLORE_ENTITY_MODEL: ScenarioDefinition = {
  id: "s19_explore_entity_model",
  name: "Explore Entity Data Model",
  description:
    "Walk through the Entities view to understand the platform's 8-entity data model — fields, types, relationships, and how entities connect via foreign keys.",
  category: "entities",
  difficulty: "beginner",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='entity-list']",
      title: "Entities Overview",
      content:
        "Welcome to Entities. The top pane lists all 8 entities in a full-width grid. Below is the detail pane showing Fields and Relationships tabs. Switch to the Relationship Graph tab (top-right) for the visual entity graph.",
      placement: "bottom",
      route: "/entities",
      action: "navigate",
      actionTarget: "[data-tour='entity-list']",
      hint: "Navigate to Entities using the sidebar (under Define).",
      delay: 3000,
    },
    {
      target: "[data-tour='entity-list'] .ag-body-viewport .ag-row:first-child",
      title: "Select the Product Entity",
      content:
        "Click on 'product' to view its field definitions. Products are the core instruments — 50 rows covering equities, FX, and futures with ISO-standard identifiers.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='entity-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on the 'product' entity in the list to select it.",
      validation: "[data-tour='entity-fields']",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-fields']",
      title: "Product Fields — ISO Identifiers",
      content:
        "The Fields tab shows all 18 columns for the product entity. Notice the industry-standard fields: ISIN, CFI, and MIC. The Domain column shows which fields have constrained value sets. Click any field row to open the Domain Values pane — view metadata-defined values and data-only values from the database.",
      placement: "bottom",
      action: "wait",
      hint: "Review the field definitions grid. Look for ISIN, CFI, and MIC columns — these are ISO-standard identifiers.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Relationship Graph",
      content:
        "The relationship graph uses dagre auto-layout with minimap and zoom controls. Product is highlighted with its connected edges. Click any node to navigate to that entity. Drag the divider to resize the graph pane.",
      placement: "top",
      action: "wait",
      hint: "Look at the relationship graph to see how product connects to other entities.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-list'] .ag-body-viewport .ag-row[row-index='1']",
      title: "Select the Execution Entity",
      content:
        "Click on 'execution' to see its 13 fields. Executions represent trade fills — 761 rows with FIX Protocol fields like exec_type and capacity. Each execution references an order via the order_id foreign key.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='entity-list'] .ag-body-viewport .ag-row[row-index='1']",
      hint: "Click on the 'execution' entity to view its fields.",
      validation: "[data-tour='entity-fields']",
      delay: 2500,
    },
    {
      target: "[data-tour='entity-fields']",
      title: "Foreign Key: order_id",
      content:
        "Notice the order_id field — this is a foreign key linking each execution to its parent order. The execution also has venue_mic (FK to venue), enabling cross-venue analysis. These relationships power the detection models' ability to correlate trading activity across entities.",
      placement: "bottom",
      action: "wait",
      hint: "Find the order_id and venue_mic fields in the grid. These are foreign keys to the order and venue entities.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Full Relationship Map",
      content:
        "The graph highlights execution's connections with accent-colored edges: order_id points to order, venue_mic points to venue. Unrelated nodes are dimmed for focus. Use the minimap to orient yourself, or click nodes to navigate between entities. Drag the divider to resize.",
      placement: "top",
      action: "wait",
      hint: "Study the relationship graph to see execution's foreign keys. Trace the path: execution → order → trader/account.",
      delay: 3500,
    },
    {
      target: "[data-tour='entity-list']",
      title: "Entity Data Model Complete",
      content:
        "You've explored the core entities and their relationships. The 8-entity model covers: instruments (product), trading (order, execution), market data (md_eod, md_intraday), participants (trader, account), and infrastructure (venue). Next, try importing and previewing raw data (S20).",
      placement: "right",
      action: "wait",
      delay: 3000,
    },
  ],
};


// --------------------------------------------------------------------------
// S20: Import and Preview Data (Beginner, 4 min)
// --------------------------------------------------------------------------
const S20_IMPORT_PREVIEW_DATA: ScenarioDefinition = {
  id: "s20_import_preview_data",
  name: "Import and Preview Data",
  description:
    "Explore raw data files, preview CSV contents in the Data view, verify loaded tables in Schema, and run a query in SQL Console.",
  category: "entities",
  difficulty: "beginner",
  estimatedMinutes: 4,
  prerequisites: ["s19_explore_entity_model"],
  steps: [
    {
      target: "[data-tour='data-list']",
      title: "Data — File List",
      content:
        "The Data view shows all data files loaded into the platform. The left panel lists CSV and Parquet files for each entity — execution.csv, product.csv, order.csv, and more. Each file corresponds to one of the 8 entities you explored in Entities.",
      placement: "right",
      route: "/data",
      action: "navigate",
      actionTarget: "[data-tour='data-list']",
      hint: "Navigate to Data using the sidebar (under Compose).",
      delay: 3000,
    },
    {
      target: "[data-tour='data-list'] .ag-body-viewport .ag-row:first-child",
      title: "Preview execution.csv",
      content:
        "Click on execution.csv to preview its contents. The AG Grid on the right will show the raw data with all 13 columns — execution_id, order_id, product_id, venue_mic, price, quantity, exec_type, capacity, and more.",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='data-list'] .ag-body-viewport .ag-row:first-child",
      hint: "Click on execution.csv (or the first file) to preview its data.",
      validation: "[data-tour='data-preview']",
      delay: 2500,
    },
    {
      target: "[data-tour='data-preview']",
      title: "Inspect Column Count and Data",
      content:
        "The preview grid shows 761 execution rows with 13 columns. Scroll horizontally to see all fields. Notice the FIX Protocol fields: exec_type (TRADE, CANCEL), capacity (AGENCY, PRINCIPAL), and the venue_mic linking to ISO 10383 venue codes.",
      placement: "left",
      action: "wait",
      hint: "Scroll through the preview grid. Count the columns and note the FIX Protocol field values.",
      delay: 3500,
    },
    {
      target: "[data-tour='data-list'] .ag-body-viewport .ag-row[row-index='2']",
      title: "Preview product.csv",
      content:
        "Now click on product.csv to preview the instrument master data. This file has 50 rows covering equities, FX pairs, and futures, each with ISO identifiers (ISIN, CFI, MIC) and instrument-specific fields (underlying, strike, expiry).",
      placement: "right",
      action: "click",
      actionTarget:
        "[data-tour='data-list'] .ag-body-viewport .ag-row[row-index='2']",
      hint: "Click on product.csv to preview the instrument master data.",
      validation: "[data-tour='data-preview']",
      delay: 2500,
    },
    {
      target: "[data-tour='data-preview']",
      title: "ISO-Standard Fields",
      content:
        "Notice the ISO-standard fields in product.csv: ISIN (e.g., US0378331005 for AAPL), CFI code (ESXXXX for equity), and exchange_mic (XNYS for NYSE). These standards ensure the demo data mirrors real-world trade surveillance data formats.",
      placement: "left",
      action: "wait",
      hint: "Find the ISIN, CFI, and exchange_mic columns. Note the standard codes used.",
      delay: 3500,
    },
    {
      target: "[data-tour='sql-editor']",
      title: "Query the Data",
      content:
        "Now let's query the loaded data using the SQL Console. DuckDB makes all CSV and Parquet files queryable via SQL. Try a simple query to see how entities join together.",
      placement: "right",
      route: "/sql",
      action: "navigate",
      actionTarget: "[data-tour='sql-editor']",
      hint: "Navigate to SQL Console using the sidebar (under Operate).",
      delay: 2500,
    },
    {
      target: "[data-tour='sql-presets']",
      title: "Use a Preset Query",
      content:
        "The preset queries provide ready-made examples. Select one to see how entities are queried and joined — for example, a query that joins executions with products to show trading volume by instrument.",
      placement: "left",
      action: "click",
      actionTarget: "[data-tour='sql-presets'] button:first-child",
      hint: "Click a preset query button to load a pre-written SQL statement into the editor.",
      delay: 2500,
    },
    {
      target: "[data-tour='sql-results']",
      title: "View Query Results",
      content:
        "The results grid shows the query output with full AG Grid features — sorting, filtering, and column resizing. You've now traced the full data path: raw files → Data → Schema → SQL Console. The same data feeds into the detection pipeline and alert generation.",
      placement: "top",
      action: "wait",
      hint: "Review the query results. Try modifying the SQL and running it again.",
      delay: 3000,
    },
  ],
};

export const entitiesScenarios: Record<string, ScenarioDefinition> = {
  s19_explore_entity_model: S19_EXPLORE_ENTITY_MODEL,
  s20_import_preview_data: S20_IMPORT_PREVIEW_DATA,
};
