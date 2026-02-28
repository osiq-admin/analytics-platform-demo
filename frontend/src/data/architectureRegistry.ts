// ==========================================================================
// Architecture Traceability — Section Registry
// ==========================================================================
// Centralized registry of all traceable sections across the application.
// Each entry documents the files, APIs, stores, data sources, technologies,
// and metadata-maturity rating for a UI section identified by data-trace.
//
// 90 sections across 19 views + 3 cross-cutting components.
// ==========================================================================

import type { TraceableSection, ViewTrace } from "./architectureRegistryTypes.ts";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const VIEW_TRACES: ViewTrace[] = [
  // =========================================================================
  // VIEW 1: Dashboard
  // =========================================================================
  {
    viewId: "dashboard",
    viewName: "Dashboard",
    route: "/dashboard",
    sections: [
      {
        id: "dashboard.summary-cards",
        displayName: "Summary Metrics",
        viewId: "dashboard",
        description:
          "Four KPI cards displaying total alerts, score-triggered percentage, average score, and active model count. Card layout and labels are metadata-driven (loaded from widget API at /api/metadata/widgets/dashboard) with hardcoded fallback; data comes from SQL aggregation over alert results.",
        files: [
          { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders KPI card grid" },
          { path: "frontend/src/stores/dashboardStore.ts", role: "Fetches and caches dashboard stats" },
          { path: "backend/api/dashboard.py", role: "Aggregates alert data via DuckDB SQL" },
        ],
        stores: [
          {
            name: "dashboardStore",
            path: "frontend/src/stores/dashboardStore.ts",
            role: "Provides stats object with summary metrics",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/dashboard/stats",
            role: "Returns aggregated alert statistics",
            routerFile: "backend/api/dashboard.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/alerts/summary.parquet",
            category: "results",
            role: "Parquet file with alert summary data produced by detection engine",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "KPI cards are defined in widget metadata (workspace/metadata/widgets/dashboard.json) including labels, metric keys, and grid positions. Dashboard fetches config from /api/metadata/widgets/dashboard and renders accordingly with fallback. Data comes from SQL aggregation over engine-produced results.",
        metadataOpportunities: [
          "Add icon and format specifiers to KPI card widget metadata",
          "Support custom KPI formulas defined in widget metadata",
        ],
      },
      {
        id: "dashboard.alerts-by-model",
        displayName: "Alerts by Model",
        viewId: "dashboard",
        description:
          "Chart showing alert count per detection model. Supports 5 chart types (bar, horizontal_bar, line, pie, table) via widget store. Data sourced from dashboard stats by_model breakdown.",
        files: [
          { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders chart widget" },
          { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart-type toggle container" },
          { path: "frontend/src/stores/dashboardStore.ts", role: "Provides stats.by_model data" },
          { path: "frontend/src/stores/widgetStore.ts", role: "Persists chart type selection" },
        ],
        stores: [
          {
            name: "dashboardStore",
            path: "frontend/src/stores/dashboardStore.ts",
            role: "Provides by_model alert breakdown",
          },
          {
            name: "widgetStore",
            path: "frontend/src/stores/widgetStore.ts",
            role: "Manages chart type toggle state (bar/horizontal_bar/line/pie/table)",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/dashboard/stats",
            role: "Returns alert stats including by_model breakdown",
            routerFile: "backend/api/dashboard.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/alerts/summary.parquet",
            category: "results",
            role: "Source data for model-level alert aggregation",
          },
        ],
        technologies: [{ name: "Recharts", role: "Renders BarChart, LineChart, and PieChart visualizations" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Chart widget defined in metadata (workspace/metadata/widgets/dashboard.json) with default chart type, available types, color palette, and grid position. Dashboard loads config from /api/metadata/widgets/dashboard. Color palette loaded from /api/metadata/theme/palettes/default. Data from metadata-driven detection models.",
        metadataOpportunities: [
          "Support custom chart renderers loaded dynamically from metadata",
        ],
      },
      {
        id: "dashboard.score-distribution",
        displayName: "Score Distribution",
        viewId: "dashboard",
        description:
          "Histogram of alert scores bucketed into 10-wide ranges (0-10, 10-20, etc.). Visualizes the distribution of detection confidence across all alerts.",
        files: [
          { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders score distribution chart" },
          { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart container" },
          { path: "frontend/src/stores/dashboardStore.ts", role: "Provides score distribution data" },
          { path: "frontend/src/stores/widgetStore.ts", role: "Manages chart type toggle" },
        ],
        stores: [
          {
            name: "dashboardStore",
            path: "frontend/src/stores/dashboardStore.ts",
            role: "Provides score distribution buckets",
          },
          {
            name: "widgetStore",
            path: "frontend/src/stores/widgetStore.ts",
            role: "Manages chart type toggle state",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/dashboard/stats",
            role: "Returns score distribution data",
            routerFile: "backend/api/dashboard.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/alerts/summary.parquet",
            category: "results",
            role: "Alert scores for distribution calculation",
          },
        ],
        technologies: [{ name: "Recharts", role: "Renders histogram / bar chart" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Chart widget defined in metadata with default chart type, available types, and grid position. Score bucket boundaries are still code-driven; underlying data is from metadata-driven detection.",
        metadataOpportunities: ["Make score bucket boundaries configurable via settings metadata"],
      },
      {
        id: "dashboard.alerts-by-trigger",
        displayName: "Alerts by Trigger",
        viewId: "dashboard",
        description:
          "Chart showing alert count grouped by trigger path (score-based vs rule-based). Helps understand which trigger mechanisms produce the most alerts.",
        files: [
          { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders trigger breakdown chart" },
          { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart container" },
          { path: "frontend/src/stores/dashboardStore.ts", role: "Provides by_trigger data" },
          { path: "frontend/src/stores/widgetStore.ts", role: "Manages chart type toggle" },
        ],
        stores: [
          {
            name: "dashboardStore",
            path: "frontend/src/stores/dashboardStore.ts",
            role: "Provides by_trigger alert breakdown",
          },
          {
            name: "widgetStore",
            path: "frontend/src/stores/widgetStore.ts",
            role: "Manages chart type toggle state",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/dashboard/stats",
            role: "Returns alert stats including by_trigger breakdown",
            routerFile: "backend/api/dashboard.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/alerts/summary.parquet",
            category: "results",
            role: "Alert data for trigger-based aggregation",
          },
        ],
        technologies: [{ name: "Recharts", role: "Renders BarChart / PieChart" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Chart widget defined in metadata with default chart type and grid position. Trigger paths derive from metadata-driven model definitions.",
        metadataOpportunities: ["Allow trigger categories to be defined in model metadata"],
      },
      {
        id: "dashboard.alerts-by-asset",
        displayName: "Alerts by Asset Class",
        viewId: "dashboard",
        description:
          "Chart showing alert count grouped by asset class (equities, FX, futures). Provides cross-asset view of detection activity.",
        files: [
          { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders asset class chart" },
          { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart container" },
          { path: "frontend/src/stores/dashboardStore.ts", role: "Provides by_asset data" },
          { path: "frontend/src/stores/widgetStore.ts", role: "Manages chart type toggle" },
        ],
        stores: [
          {
            name: "dashboardStore",
            path: "frontend/src/stores/dashboardStore.ts",
            role: "Provides by_asset_class alert breakdown",
          },
          {
            name: "widgetStore",
            path: "frontend/src/stores/widgetStore.ts",
            role: "Manages chart type toggle state",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/dashboard/stats",
            role: "Returns alert stats including by_asset breakdown",
            routerFile: "backend/api/dashboard.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/alerts/summary.parquet",
            category: "results",
            role: "Alert data for asset-class aggregation",
          },
        ],
        technologies: [{ name: "Recharts", role: "Renders BarChart / PieChart" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Chart widget defined in metadata with default chart type and grid position. Asset classes come from entity metadata.",
        metadataOpportunities: ["Derive asset class categories dynamically from product entity metadata"],
      },
    ],
  },

  // =========================================================================
  // VIEW 2: Entity Designer
  // =========================================================================
  {
    viewId: "entities",
    viewName: "Entity Designer",
    route: "/entities",
    sections: [
      {
        id: "entities.entity-list",
        displayName: "Entity List",
        viewId: "entities",
        description:
          "AG Grid table of all entity definitions with layer badges (OOB/custom). Displays ID, name, field count, and layer columns. Fully sourced from entity JSON metadata files.",
        files: [
          { path: "frontend/src/views/EntityDesigner/index.tsx", role: "Main view layout and entity selection" },
          { path: "frontend/src/views/EntityDesigner/EntityList.tsx", role: "AG Grid entity list component" },
          { path: "frontend/src/stores/metadataStore.ts", role: "Fetches and caches entity metadata" },
          { path: "backend/api/metadata.py", role: "Serves entity metadata from JSON files" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides entities array from metadata API",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/entities",
            role: "Returns all entity definitions",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity definition JSON files (one per entity)",
            editHint: "Add/edit JSON files to add/modify entities",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Renders sortable/filterable entity table" }],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Entity list is entirely populated from JSON metadata files. Adding a new entity JSON file automatically makes it appear.",
      },
      {
        id: "entities.entity-detail",
        displayName: "Entity Detail",
        viewId: "entities",
        description:
          "Read-only display of the selected entity's fields, data types, constraints, and relationships. All information rendered directly from entity metadata.",
        files: [
          { path: "frontend/src/views/EntityDesigner/EntityDetail.tsx", role: "Renders entity field details" },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides selected entity data" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides entity object with fields and relationships",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity definitions with field schemas",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All displayed fields, types, and constraints come directly from entity metadata. No hardcoded field definitions.",
      },
      {
        id: "entities.entity-form",
        displayName: "Entity Form",
        viewId: "entities",
        description:
          "Create/edit form for entity definitions. Allows editing entity name, description, fields, and relationships. Saves back to metadata JSON.",
        files: [
          { path: "frontend/src/views/EntityDesigner/EntityForm.tsx", role: "Entity creation/editing form" },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides saveEntity action" },
          { path: "backend/api/metadata.py", role: "Handles entity save/update" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides saveEntity action and entity data",
          },
        ],
        apis: [
          {
            method: "PUT",
            path: "/api/metadata/entities/{id}",
            role: "Saves entity definition to JSON file",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Target for entity save operations",
            editHint: "Form writes to these files",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Form structure adapts to entity schema. New fields are added dynamically without code changes.",
      },
      {
        id: "entities.relationship-graph",
        displayName: "Relationship Graph",
        viewId: "entities",
        description:
          "React Flow DAG visualizing relationships between entities (FK references, composition). Nodes represent entities, edges represent relationships. Layout computed by Dagre.",
        files: [
          {
            path: "frontend/src/views/EntityDesigner/RelationshipGraph.tsx",
            role: "React Flow graph of entity relationships",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides entity relationship data" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides entities with relationship metadata",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity definitions containing relationship declarations",
          },
        ],
        technologies: [
          { name: "React Flow", role: "Interactive node-edge graph rendering" },
          { name: "Dagre", role: "Automatic hierarchical graph layout" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Graph nodes and edges are built entirely from relationship metadata in entity JSON files. Adding a relationship to an entity JSON automatically updates the graph.",
      },
      {
        id: "entities.domain-values",
        displayName: "Domain Values",
        viewId: "entities",
        description:
          "Right-side pane for viewing and managing field domain values. Bridges metadata-defined fields with data-discovered actual values from CSV files.",
        files: [
          {
            path: "frontend/src/views/EntityDesigner/DomainValuesPane.tsx",
            role: "Domain values display and management UI",
          },
          {
            path: "frontend/src/hooks/useDomainValues.ts",
            role: "Hook for fetching domain values from API",
          },
          { path: "backend/api/data_info.py", role: "Discovers domain values from data files" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/data-info/domain-values/{entity}/{field}",
            role: "Returns distinct values for an entity field from data",
            routerFile: "backend/api/data_info.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity field definitions to know which fields exist",
          },
          {
            path: "workspace/data/csv/*.csv",
            category: "data",
            role: "Actual data files scanned for distinct values",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Field list comes from entity metadata; actual values are discovered from data. The bridge between metadata definitions and real data is the core value.",
      },
      {
        id: "entities.view-tabs",
        displayName: "View Tabs",
        viewId: "entities",
        description:
          "Tab selector toggling between Details view and Relationships graph view. Tab definitions loaded from view config metadata API with fallback to hardcoded.",
        files: [
          { path: "frontend/src/views/EntityDesigner/index.tsx", role: "Tab rendering with metadata-driven labels" },
          { path: "frontend/src/hooks/useViewTabs.ts", role: "Hook for metadata-driven tab definitions" },
          { path: "frontend/src/hooks/useLocalStorage.ts", role: "Persists tab selection to localStorage" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/view_config/entity_designer",
            role: "Returns tab definitions for entity designer",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          { path: "workspace/metadata/view_config/entity_designer.json", category: "metadata", role: "Tab definitions (id, label, icon, default)" },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation: "Tab definitions (id, label, icon, default) loaded from metadata JSON via API. Tab selection state handled by frontend useLocalStorage hook.",
        metadataOpportunities: [
          "Add tab visibility/ordering configuration to metadata",
        ],
      },
    ],
  },

  // =========================================================================
  // VIEW 3: Metadata Explorer
  // =========================================================================
  {
    viewId: "metadata",
    viewName: "Metadata Explorer",
    route: "/metadata",
    sections: [
      {
        id: "metadata.calculation-list",
        displayName: "Calculation List",
        viewId: "metadata",
        description:
          "AG Grid table of all calculation definitions with calculation type filter (transaction, time_window, aggregation, derived). Shows ID, name, layer, dependency count, and OOB badge.",
        files: [
          { path: "frontend/src/views/MetadataExplorer/index.tsx", role: "Main view layout" },
          {
            path: "frontend/src/views/MetadataExplorer/CalculationList.tsx",
            role: "AG Grid calculation list component",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Fetches calculation metadata" },
          { path: "backend/api/metadata.py", role: "Serves calculation metadata from JSON files" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides calculations array from metadata API",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/calculations",
            role: "Returns all calculation definitions",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Calculation definition JSON files organized by category",
            editHint: "Add JSON files to add new calculations",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Renders sortable/filterable calculation table" }],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Calculation list is entirely populated from JSON metadata. New calculation files are automatically discovered and displayed.",
      },
      {
        id: "metadata.calculation-detail",
        displayName: "Calculation Detail",
        viewId: "metadata",
        description:
          "Read-only display of selected calculation including SQL logic, input/output fields, dependencies, and configuration. All information from calculation metadata.",
        files: [
          {
            path: "frontend/src/views/MetadataExplorer/CalculationDetail.tsx",
            role: "Renders calculation detail panels",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides selected calculation data" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides calculation object with fields and logic",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Calculation definitions with SQL logic and dependencies",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All displayed properties come from calculation metadata JSON. Adding fields to a calculation definition automatically exposes them.",
      },
      {
        id: "metadata.calculation-form",
        displayName: "Calculation Form",
        viewId: "metadata",
        description:
          "Create/edit form for calculation definitions. Allows editing name, SQL logic, dependencies, input/output schemas. Saves to metadata JSON.",
        files: [
          {
            path: "frontend/src/views/MetadataExplorer/CalculationForm.tsx",
            role: "Calculation creation/editing form",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides save action" },
          { path: "backend/api/metadata.py", role: "Handles calculation save" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides save action for calculations",
          },
        ],
        apis: [
          {
            method: "PUT",
            path: "/api/metadata/calculations/{id}",
            role: "Saves calculation definition",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Target files for calculation saves",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Form adapts to calculation schema. Metadata defines what fields exist.",
      },
      {
        id: "metadata.calculation-dag",
        displayName: "Calculation DAG",
        viewId: "metadata",
        description:
          "Dependency graph showing calculation execution ordering. Nodes are calculations, edges are depends_on references. Used to understand calculation pipeline flow.",
        files: [
          {
            path: "frontend/src/views/MetadataExplorer/CalculationDAG.tsx",
            role: "React Flow DAG of calculation dependencies",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides calculation dependency data" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides calculations with depends_on arrays",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Calculation definitions with depends_on relationships",
          },
        ],
        technologies: [
          { name: "React Flow", role: "Interactive dependency graph rendering" },
          { name: "Dagre", role: "Automatic hierarchical layout for DAG" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "DAG edges are built from depends_on arrays in calculation metadata. Adding a dependency to metadata automatically creates a new edge.",
      },
    ],
  },

  // =========================================================================
  // VIEW 4: Settings Manager
  // =========================================================================
  {
    viewId: "settings",
    viewName: "Settings Manager",
    route: "/settings",
    sections: [
      {
        id: "settings.settings-list",
        displayName: "Settings List",
        viewId: "settings",
        description:
          "AG Grid table of all settings definitions with layer badges. Shows setting name, value type, default value, override count, and scope.",
        files: [
          { path: "frontend/src/views/SettingsManager/index.tsx", role: "Main view layout" },
          {
            path: "frontend/src/views/SettingsManager/SettingsList.tsx",
            role: "AG Grid settings list component",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Fetches settings metadata" },
          { path: "backend/api/metadata.py", role: "Serves settings metadata" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides settings array from metadata API",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/settings",
            role: "Returns all setting definitions",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/settings/**/*.json",
            category: "settings",
            role: "Setting definition JSON files with defaults and overrides",
            editHint: "Add JSON files to define new settings",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Renders sortable/filterable settings table" }],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Settings list populated entirely from JSON files. New setting files automatically appear.",
      },
      {
        id: "settings.setting-detail",
        displayName: "Setting Detail",
        viewId: "settings",
        description:
          "Display of selected setting including value type, default value, description, override hierarchy, and resolution rules.",
        files: [
          {
            path: "frontend/src/views/SettingsManager/SettingDetail.tsx",
            role: "Renders setting detail panels",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides selected setting data" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides setting object with overrides",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/settings/**/*.json",
            category: "settings",
            role: "Setting definitions with override hierarchies",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All setting properties, overrides, and resolution rules come from metadata.",
      },
      {
        id: "settings.setting-form",
        displayName: "Setting Form",
        viewId: "settings",
        description:
          "Create/edit form for setting definitions. Supports editing value type, default, description, and override rules. Saves to metadata JSON.",
        files: [
          {
            path: "frontend/src/views/SettingsManager/SettingForm.tsx",
            role: "Setting creation/editing form",
          },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides save action" },
          { path: "backend/api/metadata.py", role: "Handles setting save" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides save action for settings",
          },
        ],
        apis: [
          {
            method: "PUT",
            path: "/api/metadata/settings/{id}",
            role: "Saves setting definition",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/settings/**/*.json",
            category: "settings",
            role: "Target files for setting saves",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Form adapts to setting schema. Override rules are metadata-defined.",
      },
      {
        id: "settings.override-editor",
        displayName: "Resolution Tester",
        viewId: "settings",
        description:
          "Tests setting resolution for a given entity context. User provides product/entity identifiers and sees the resolved value with full resolution trace (which override matched and why). Core metadata-first feature demonstrating the settings resolution engine.",
        files: [
          {
            path: "frontend/src/views/SettingsManager/OverrideEditor.tsx",
            role: "Resolution tester UI with entity context input",
          },
          {
            path: "frontend/src/components/SuggestionInput.tsx",
            role: "Auto-complete input for entity IDs",
          },
          { path: "backend/api/metadata.py", role: "Resolves setting for entity context" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides setting data for resolution",
          },
        ],
        apis: [
          {
            method: "POST",
            path: "/api/metadata/settings/{id}/resolve",
            role: "Resolves setting value for given entity context",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/settings/**/*.json",
            category: "settings",
            role: "Setting definitions with override rules for resolution",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Core metadata-first feature. Resolution logic follows metadata-defined override hierarchies: product-specific > hierarchy/multi-dim > default.",
      },
    ],
  },

  // =========================================================================
  // VIEW 5: Mapping Studio
  // =========================================================================
  {
    viewId: "mappings",
    viewName: "Mapping Studio",
    route: "/mappings",
    sections: [
      {
        id: "mapping-studio.mapping-selector",
        displayName: "Mapping Selector",
        viewId: "mappings",
        description:
          "Dropdown to select or create a mapping definition. Lists all mapping files from metadata. Choose source and target entities. Source Tier and Target Tier selectors filter mappings by medallion tier pair (e.g., Bronze-to-Silver, Silver-to-Gold).",
        files: [
          { path: "frontend/src/views/MappingStudio/index.tsx", role: "Main view with mapping selector and CRUD controls" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/mappings/",
            role: "Returns list of mapping definitions",
            routerFile: "backend/api/mappings.py",
          },
          {
            method: "GET",
            path: "/api/metadata/entities",
            role: "Returns entity list for source/target selection",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/mappings/*.json",
            category: "metadata",
            role: "Mapping definition files",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Mapping list and entity options come entirely from metadata. Add mapping templates for common patterns.",
      },
      {
        id: "mapping-studio.field-canvas",
        displayName: "Field Mapping Canvas",
        viewId: "mappings",
        description:
          "Editable table for source-to-target field mappings with 11 transform types (direct, rename, cast, cast_decimal, cast_date, cast_time, uppercase, lowercase, concat, expression, multiply). Each row maps a source field to a target field.",
        files: [
          { path: "frontend/src/views/MappingStudio/index.tsx", role: "Field mapping table with inline editing" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/mappings/{id}",
            role: "Returns a single mapping definition with field rows",
            routerFile: "backend/api/mappings.py",
          },
          {
            method: "GET",
            path: "/api/metadata/entities/{id}",
            role: "Returns entity fields for source/target dropdowns",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/mappings/*.json",
            category: "metadata",
            role: "Mapping field definitions with transform types",
          },
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity field schemas for source/target columns",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Field mappings and entity schemas are fully metadata-driven. Add drag-and-drop between source and target columns.",
      },
      {
        id: "mapping-studio.validation",
        displayName: "Validation Results",
        viewId: "mappings",
        description:
          "Validates mapping completeness against entity definitions. Shows errors, warnings, unmapped fields, and coverage percentage.",
        files: [
          { path: "frontend/src/views/MappingStudio/index.tsx", role: "Validation panel with error/warning display" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/mappings/{id}/validate",
            role: "Validates mapping against entity definitions",
            routerFile: "backend/api/mappings.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/mappings/*.json",
            category: "metadata",
            role: "Mapping definitions to validate",
          },
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity schemas for validation rules",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Validation rules derived from entity metadata and mapping definitions. Add auto-fix suggestions for validation errors.",
      },
    ],
  },

  // =========================================================================
  // VIEW 6: Pipeline Monitor
  // =========================================================================
  {
    viewId: "pipeline",
    viewName: "Pipeline Monitor",
    route: "/pipeline",
    sections: [
      {
        id: "pipeline.execution-dag",
        displayName: "Execution DAG",
        viewId: "pipeline",
        description:
          "React Flow graph visualizing pipeline execution flow with true dependency edges from the depends_on field in calculation metadata. Nodes represent calculation steps with execution status (pending/running/complete/error). Edges reflect actual upstream/downstream relationships, not a linear chain.",
        files: [
          {
            path: "frontend/src/views/PipelineMonitor/PipelineDAG.tsx",
            role: "React Flow pipeline execution graph",
          },
          { path: "frontend/src/stores/pipelineStore.ts", role: "Provides pipeline DAG and status" },
          { path: "backend/api/pipeline.py", role: "Returns pipeline DAG structure" },
        ],
        stores: [
          {
            name: "pipelineStore",
            path: "frontend/src/stores/pipelineStore.ts",
            role: "Provides DAG structure and execution status",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/pipeline/dag",
            role: "Returns pipeline execution DAG structure",
            routerFile: "backend/api/pipeline.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Calculation depends_on relationships defining pipeline order",
          },
        ],
        technologies: [
          { name: "React Flow", role: "Interactive pipeline DAG rendering" },
          { name: "Dagre", role: "Automatic hierarchical DAG layout" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "DAG structure and edges derive from calculation depends_on metadata. Adding or changing calculation dependencies automatically updates the graph topology.",
      },
      {
        id: "pipeline.steps-table",
        displayName: "Pipeline Steps",
        viewId: "pipeline",
        description:
          "Table of pipeline execution steps with real-time status updates via WebSocket. Shows step name, status, duration, and row counts. Step names come from calculation metadata.",
        files: [
          { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Main view with steps table" },
          { path: "frontend/src/stores/pipelineStore.ts", role: "Manages pipeline state and WebSocket" },
          { path: "backend/api/pipeline.py", role: "Provides pipeline status" },
          { path: "backend/api/ws.py", role: "WebSocket endpoint for real-time updates" },
        ],
        stores: [
          {
            name: "pipelineStore",
            path: "frontend/src/stores/pipelineStore.ts",
            role: "Manages pipeline steps, status, and WebSocket connection",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/pipeline/status",
            role: "Returns current pipeline execution status",
            routerFile: "backend/api/pipeline.py",
          },
          {
            method: "WS",
            path: "/ws/pipeline",
            role: "Real-time pipeline status updates",
            routerFile: "backend/api/ws.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Step names derived from calculation metadata",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Step names come from calculation metadata; status, duration, and runtime behavior are code-driven.",
      },
      {
        id: "pipeline.run-button",
        displayName: "Run Pipeline",
        viewId: "pipeline",
        description:
          "Button to trigger full pipeline execution. Initiates the calculation and detection engine sequence.",
        files: [
          { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Run button and trigger logic" },
          { path: "frontend/src/stores/pipelineStore.ts", role: "Provides runPipeline action" },
          { path: "backend/api/pipeline.py", role: "Handles pipeline execution trigger" },
        ],
        stores: [
          {
            name: "pipelineStore",
            path: "frontend/src/stores/pipelineStore.ts",
            role: "Provides runPipeline action",
          },
        ],
        apis: [
          {
            method: "POST",
            path: "/api/pipeline/run",
            role: "Triggers pipeline execution",
            routerFile: "backend/api/pipeline.py",
          },
        ],
        dataSources: [],
        technologies: [],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Pipeline trigger is an infrastructure operation. The pipeline itself executes metadata-driven calculations, but the button is a fixed UI element.",
      },
      {
        id: "pipeline.medallion-stages",
        displayName: "Medallion Stage Progress",
        viewId: "pipeline",
        description:
          "Horizontal row of stage buttons showing all medallion pipeline stages loaded from pipeline_stages.json metadata. Each stage button triggers the Pipeline Orchestrator with arrow separators between stages.",
        files: [
          { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Renders stage buttons with arrow separators" },
          { path: "backend/services/pipeline_orchestrator.py", role: "Metadata-driven stage dispatcher" },
          { path: "backend/api/pipeline.py", role: "Stage execution API endpoints" },
        ],
        stores: [
          {
            name: "pipelineStore",
            path: "frontend/src/stores/pipelineStore.ts",
            role: "Fetches stages and runs stage execution",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/pipeline/stages",
            role: "List pipeline stages",
            routerFile: "backend/api/pipeline.py",
          },
          {
            method: "POST",
            path: "/api/pipeline/stages/{stage_id}/run",
            role: "Execute pipeline stage",
            routerFile: "backend/api/pipeline.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/medallion/pipeline_stages.json",
            category: "metadata",
            role: "Pipeline stage definitions",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Pipeline stages, transformations, and dispatch all driven by metadata JSON. Adding a stage to pipeline_stages.json automatically makes it appear.",
      },
      {
        id: "pipeline.contract-validation",
        displayName: "Contract Validation Status",
        viewId: "pipeline",
        description:
          "Shows data contract validation results after running a pipeline stage. Quality rules from contract metadata evaluated against DuckDB tables.",
        files: [
          { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Renders contract validation table" },
          { path: "backend/services/contract_validator.py", role: "Evaluates quality rules against DuckDB" },
        ],
        stores: [
          {
            name: "pipelineStore",
            path: "frontend/src/stores/pipelineStore.ts",
            role: "Stores stage run result",
          },
        ],
        apis: [
          {
            method: "POST",
            path: "/api/pipeline/stages/{stage_id}/run",
            role: "Returns contract validation",
            routerFile: "backend/api/pipeline.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/medallion/contracts",
            category: "metadata",
            role: "Data contract definitions",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Contract rules, field mappings, and SLA thresholds all from metadata JSON. Validation logic is generic — driven entirely by contract definitions.",
      },
    ],
  },

  // =========================================================================
  // VIEW 7: Schema Explorer
  // =========================================================================
  {
    viewId: "schema",
    viewName: "Schema Explorer",
    route: "/schema",
    sections: [
      {
        id: "schema.tables-list",
        displayName: "Tables List",
        viewId: "schema",
        description:
          "AG Grid table listing all DuckDB tables with name and type columns. Provides runtime introspection of the database schema independent of metadata definitions.",
        files: [
          { path: "frontend/src/views/SchemaExplorer/index.tsx", role: "Main view with tables list" },
          { path: "backend/api/query.py", role: "Introspects DuckDB for table information" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/query/tables",
            role: "Returns list of DuckDB tables with metadata",
            routerFile: "backend/api/query.py",
          },
        ],
        dataSources: [],
        technologies: [{ name: "AG Grid", role: "Renders table list" }],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Runtime DuckDB introspection. Tables exist because of data loading, not metadata definitions directly.",
      },
      {
        id: "schema.columns-grid",
        displayName: "Columns Grid",
        viewId: "schema",
        description:
          "Column details for selected table including column name, data type, and nullable flag. Runtime schema introspection via DuckDB.",
        files: [
          { path: "frontend/src/views/SchemaExplorer/index.tsx", role: "Renders column details grid" },
          { path: "backend/api/query.py", role: "Returns column schema for selected table" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/query/tables/{table}/schema",
            role: "Returns column schema for a specific table",
            routerFile: "backend/api/query.py",
          },
        ],
        dataSources: [],
        technologies: [{ name: "AG Grid", role: "Renders column details" }],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Pure runtime introspection of DuckDB schema. Infrastructure tool for developers.",
      },
    ],
  },

  // =========================================================================
  // VIEW 8: SQL Console
  // =========================================================================
  {
    viewId: "sql",
    viewName: "SQL Console",
    route: "/sql",
    sections: [
      {
        id: "sql.query-editor",
        displayName: "Query Editor",
        viewId: "sql",
        description:
          "Monaco SQL editor with syntax highlighting and Ctrl+Enter execution. Provides direct DuckDB SQL access for ad-hoc queries.",
        files: [
          { path: "frontend/src/views/SQLConsole/index.tsx", role: "Main view layout and execution logic" },
          { path: "frontend/src/views/SQLConsole/QueryEditor.tsx", role: "Monaco editor component for SQL" },
          { path: "backend/api/query.py", role: "Executes SQL queries against DuckDB" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/query/execute",
            role: "Executes arbitrary SQL and returns results",
            routerFile: "backend/api/query.py",
          },
        ],
        dataSources: [],
        technologies: [{ name: "Monaco Editor", role: "SQL code editor with syntax highlighting" }],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Developer/analyst tool for direct SQL access. No metadata involvement in the editor itself.",
      },
      {
        id: "sql.results-grid",
        displayName: "Results Grid",
        viewId: "sql",
        description:
          "AG Grid with dynamic columns generated from SQL query results. Column definitions are created at runtime based on the result set schema.",
        files: [
          {
            path: "frontend/src/views/SQLConsole/ResultsGrid.tsx",
            role: "Dynamic AG Grid for query results",
          },
        ],
        stores: [],
        apis: [],
        dataSources: [],
        technologies: [{ name: "AG Grid", role: "Dynamic column grid from SQL results" }],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Grid columns are dynamically created from SQL result schema. Pure infrastructure.",
      },
      {
        id: "sql.presets",
        displayName: "Query Presets",
        viewId: "sql",
        description:
          "Preset SQL query buttons providing common queries (e.g., alert summary, trade analysis). Loaded from backend preset definitions.",
        files: [
          { path: "frontend/src/views/SQLConsole/index.tsx", role: "Renders preset buttons" },
          { path: "backend/api/query.py", role: "Returns preset query definitions from metadata" },
          { path: "backend/models/query_presets.py", role: "QueryPreset Pydantic model" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/query/presets",
            role: "Returns preset queries loaded from workspace/metadata/query_presets/",
            routerFile: "backend/api/query.py",
          },
        ],
        dataSources: [
          { path: "workspace/metadata/query_presets/default.json", category: "metadata", role: "Preset query definitions" },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Preset queries are loaded from workspace/metadata/query_presets/*.json via MetadataService. New presets can be added by editing JSON — no code changes needed.",
        metadataOpportunities: [],
      },
      {
        id: "sql.chat-panel",
        displayName: "AI Chat",
        viewId: "sql",
        description:
          "AI assistant panel for SQL help. Uses the shared ChatPanel component with mock or live AI mode. Can suggest queries based on schema context.",
        files: [
          { path: "frontend/src/views/SQLConsole/index.tsx", role: "Integrates chat panel into SQL view" },
          { path: "frontend/src/views/AIAssistant/ChatPanel.tsx", role: "Shared chat UI component" },
          { path: "backend/api/ai.py", role: "AI chat endpoint (mock or live)" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/ai/chat",
            role: "Processes AI chat messages",
            routerFile: "backend/api/ai.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/ai_mock_sequences.json",
            category: "config",
            role: "Mock AI response sequences for demo mode",
          },
        ],
        technologies: [],
        metadataMaturity: "mixed",
        maturityExplanation:
          "Mock sequences are metadata-like configuration, but the chat UI and AI logic are code-driven.",
        metadataOpportunities: [
          "Allow chat context prompts to reference metadata schema definitions dynamically",
        ],
      },
    ],
  },

  // =========================================================================
  // VIEW 9: Model Composer
  // =========================================================================
  {
    viewId: "models",
    viewName: "Model Composer",
    route: "/models",
    sections: [
      {
        id: "models.model-list",
        displayName: "Model List",
        viewId: "models",
        description:
          "Custom button list of detection models with layer badges (OOB/custom). Shows model name, layer badge, and calculation count for each model.",
        files: [
          { path: "frontend/src/views/ModelComposer/index.tsx", role: "Main view layout with model list" },
          { path: "frontend/src/stores/metadataStore.ts", role: "Fetches detection model metadata" },
          { path: "backend/api/metadata.py", role: "Serves detection model metadata" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides detection models array from metadata API",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/detection-models",
            role: "Returns all detection model definitions",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Detection model JSON definitions",
            editHint: "Add JSON files to define new detection models",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Model list populated entirely from detection model JSON files. New model files are automatically discovered.",
      },
      {
        id: "models.model-detail",
        displayName: "Model Detail",
        viewId: "models",
        description:
          "Detailed view of selected detection model showing name, description, and a calculations-and-scoring panel listing each referenced calculation with its strictness badge.",
        files: [
          { path: "frontend/src/views/ModelComposer/index.tsx", role: "Renders model detail panels" },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides selected model data" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides detection model object with full configuration",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Detection model definitions with scoring and calculation references",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All displayed model properties come from detection model metadata JSON.",
      },
      {
        id: "models.create-wizard",
        displayName: "Create/Edit Wizard",
        viewId: "models",
        description:
          "Multi-step wizard (7 steps) for creating or editing detection models. Steps: Define, Select Calculations, Configure Scoring, Query, Test Run, Review, Deploy. Wizard structure driven by model JSON schema.",
        files: [
          {
            path: "frontend/src/views/ModelComposer/ModelCreateForm.tsx",
            role: "Wizard container managing step flow",
          },
          {
            path: "frontend/src/views/ModelComposer/WizardProgress.tsx",
            role: "Step progress indicator",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/DefineStep.tsx",
            role: "Step 1: Basic model definition",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/SelectCalcsStep.tsx",
            role: "Step 2: Select calculations",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/ConfigureScoringStep.tsx",
            role: "Step 3: Configure scoring rules",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/QueryStep.tsx",
            role: "Step 4: Define query patterns",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/TestRunStep.tsx",
            role: "Step 5: Test run the model",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/ReviewStep.tsx",
            role: "Step 6: Review configuration",
          },
          {
            path: "frontend/src/views/ModelComposer/steps/DeployStep.tsx",
            role: "Step 7: Deploy model",
          },
          { path: "backend/api/metadata.py", role: "Handles model create/update" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides model CRUD operations",
          },
        ],
        apis: [
          {
            method: "POST",
            path: "/api/metadata/detection-models",
            role: "Creates new detection model",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "PUT",
            path: "/api/metadata/detection-models/{id}",
            role: "Updates existing detection model",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Target for model create/update saves",
          },
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Available calculations for step 2 selection",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Wizard steps driven by model JSON schema. Calculation selection from metadata. Scoring configuration references metadata-defined calculations.",
      },
      {
        id: "models.validation-panel",
        displayName: "Validation Panel",
        viewId: "models",
        description:
          "Validates detection model configuration against schema and business rules. Checks calculation references, scoring consistency, and required fields.",
        files: [
          { path: "frontend/src/views/ModelComposer/index.tsx", role: "Displays validation results" },
          { path: "backend/api/validation.py", role: "Performs model validation" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides model data for validation",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Model definitions to validate",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Validation checks metadata references (calculation IDs, field names) but some rules are code-driven.",
      },
      {
        id: "models.preview-panel",
        displayName: "Preview Panel",
        viewId: "models",
        description:
          "Preview of model configuration showing how the model will appear and behave once deployed. Read-only summary of all model settings.",
        files: [
          { path: "frontend/src/views/ModelComposer/index.tsx", role: "Renders model preview" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides model configuration for preview",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Model definition rendered in preview",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Preview content comes from model metadata but display formatting is code-driven.",
      },
      {
        id: "models.dependency-dag",
        displayName: "Dependency DAG",
        viewId: "models",
        description:
          "Mini DAG showing the selected model's calculation dependency tree. Visualizes how calculations feed into the model's scoring logic.",
        files: [
          { path: "frontend/src/views/ModelComposer/index.tsx", role: "Integrates mini DAG" },
          {
            path: "frontend/src/components/DependencyMiniDAG.tsx",
            role: "Reusable mini DAG component",
          },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides model calculation references",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Model calculation references for DAG edges",
          },
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Calculation definitions for DAG nodes",
          },
        ],
        technologies: [{ name: "React Flow", role: "Mini dependency graph rendering" }],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "DAG edges derive from model's calculation references and calculation depends_on arrays. All metadata.",
      },
      {
        id: "models.ai-chat",
        displayName: "AI Assistant",
        viewId: "models",
        description:
          "Chat panel for AI-assisted model composition. Can suggest calculations, scoring rules, and configuration improvements. Uses shared ChatPanel component.",
        files: [
          { path: "frontend/src/views/ModelComposer/index.tsx", role: "Integrates chat panel" },
          { path: "frontend/src/views/AIAssistant/ChatPanel.tsx", role: "Shared chat UI component" },
          { path: "backend/api/ai.py", role: "AI chat endpoint" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/ai/chat",
            role: "Processes AI chat messages for model composition help",
            routerFile: "backend/api/ai.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/ai_mock_sequences.json",
            category: "config",
            role: "Mock AI responses for demo mode",
          },
        ],
        technologies: [],
        metadataMaturity: "mixed",
        maturityExplanation:
          "Mock sequences are metadata-like config; chat UI and AI interaction logic are code-driven.",
        metadataOpportunities: [
          "Feed model metadata context into AI prompts automatically",
          "Allow mock sequences to be model-specific",
        ],
      },
    ],
  },

  // =========================================================================
  // VIEW 10: Data Manager
  // =========================================================================
  {
    viewId: "data",
    viewName: "Data Manager",
    route: "/data",
    sections: [
      {
        id: "data.tables-list",
        displayName: "Data Sources",
        viewId: "data",
        description:
          "Table listing all data files/tables available in DuckDB. Column definitions loaded from grid metadata JSON via API with fallback to hardcoded columns.",
        files: [
          { path: "frontend/src/views/DataManager/index.tsx", role: "Main view with tables list" },
          { path: "frontend/src/hooks/useGridColumns.ts", role: "Hook for metadata-driven grid columns" },
          { path: "backend/api/query.py", role: "Returns DuckDB table information" },
          { path: "backend/api/metadata.py", role: "Grid column metadata API" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/query/tables",
            role: "Returns list of DuckDB tables",
            routerFile: "backend/api/query.py",
          },
          {
            method: "GET",
            path: "/api/metadata/grids/data_manager",
            role: "Returns grid column configuration for data manager",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          { path: "workspace/metadata/grids/data_manager.json", category: "metadata", role: "Grid column definitions for table list" },
        ],
        technologies: [{ name: "AG Grid", role: "Renders table list" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Grid columns loaded from metadata JSON via API. DuckDB table listing still from runtime introspection. Fallback to hardcoded columns if API fails.",
        metadataOpportunities: [
          "Link tables to entity metadata to show metadata coverage",
        ],
      },
      {
        id: "data.data-grid",
        displayName: "Data Preview",
        viewId: "data",
        description:
          "Preview rows from selected data table. Executes a SELECT * LIMIT 50 query and renders results in AG Grid. Column definitions are generated dynamically from the SQL result set schema.",
        files: [
          { path: "frontend/src/views/DataManager/index.tsx", role: "Data preview with SQL execution" },
          { path: "frontend/src/hooks/useGridColumns.ts", role: "Hook for metadata-driven grid columns" },
          { path: "backend/api/query.py", role: "Executes SELECT query for preview" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/query/execute",
            role: "Executes SQL for data preview",
            routerFile: "backend/api/query.py",
          },
        ],
        dataSources: [
          { path: "workspace/metadata/grids/data_manager.json", category: "metadata", role: "Grid column definitions shared with tables list" },
        ],
        technologies: [{ name: "AG Grid", role: "Dynamic column grid for data preview" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Grid column metadata available via API. Dynamic preview columns still generated from SQL result schema. Formatting rules from metadata where applicable.",
        metadataOpportunities: [
          "Apply domain value labels from entity metadata to preview columns",
        ],
      },
    ],
  },

  // =========================================================================
  // VIEW 11: Use Case Studio
  // =========================================================================
  {
    viewId: "use-cases",
    viewName: "Use Case Studio",
    route: "/use-cases",
    sections: [
      {
        id: "use-cases.use-case-list",
        displayName: "Use Case List",
        viewId: "use-cases",
        description:
          "Custom button list of use cases showing name, status badge, component count, and tags. Loaded from use case JSON metadata files.",
        files: [
          { path: "frontend/src/views/UseCaseStudio/index.tsx", role: "Main view with use case list" },
          { path: "frontend/src/stores/useCaseStore.ts", role: "Fetches and manages use case data" },
          { path: "backend/api/use_cases.py", role: "Serves use case metadata" },
        ],
        stores: [
          {
            name: "useCaseStore",
            path: "frontend/src/stores/useCaseStore.ts",
            role: "Provides use cases array and CRUD actions",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/use-cases",
            role: "Returns all use case definitions",
            routerFile: "backend/api/use_cases.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/use_cases/*.json",
            category: "metadata",
            role: "Use case JSON definition files",
            editHint: "Add JSON files to create new use cases",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Use case list populated entirely from JSON files on disk. New files automatically discovered.",
      },
      {
        id: "use-cases.builder",
        displayName: "Use Case Builder",
        viewId: "use-cases",
        description:
          "Multi-step wizard for creating and editing use cases. Steps include defining the case, selecting the model, providing sample data, and specifying expected results.",
        files: [
          {
            path: "frontend/src/views/UseCaseStudio/UseCaseBuilder.tsx",
            role: "Multi-step use case creation wizard",
          },
          {
            path: "frontend/src/views/UseCaseStudio/SampleDataEditor.tsx",
            role: "Sample data editing step",
          },
          {
            path: "frontend/src/views/UseCaseStudio/ExpectedResults.tsx",
            role: "Expected results definition step",
          },
          { path: "frontend/src/stores/useCaseStore.ts", role: "Provides save actions" },
          { path: "backend/api/use_cases.py", role: "Handles use case save" },
        ],
        stores: [
          {
            name: "useCaseStore",
            path: "frontend/src/stores/useCaseStore.ts",
            role: "Provides use case CRUD and model references",
          },
        ],
        apis: [
          {
            method: "PUT",
            path: "/api/use-cases/{id}",
            role: "Saves/updates use case definition",
            routerFile: "backend/api/use_cases.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/use_cases/*.json",
            category: "metadata",
            role: "Use case definitions (target for saves)",
          },
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Detection models available for use case association",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Use cases reference metadata-defined models; wizard steps are code-driven but content adapts to metadata.",
      },
      {
        id: "use-cases.sample-data",
        displayName: "Sample Data",
        viewId: "use-cases",
        description:
          "Editor for sample test data within a use case. Allows defining input data rows that will be used to test detection model execution.",
        files: [
          {
            path: "frontend/src/views/UseCaseStudio/SampleDataEditor.tsx",
            role: "Sample data grid editor",
          },
        ],
        stores: [
          {
            name: "useCaseStore",
            path: "frontend/src/stores/useCaseStore.ts",
            role: "Provides sample data within use case",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/use_cases/*.json",
            category: "metadata",
            role: "Use case files containing sample_data arrays",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Column structure derives from entity metadata; data values are user-defined test data.",
      },
      {
        id: "use-cases.expected-results",
        displayName: "Expected Results",
        viewId: "use-cases",
        description:
          "Define expected alert outcomes for a use case. Specifies which alerts should trigger, expected scores, and expected trigger paths for validation.",
        files: [
          {
            path: "frontend/src/views/UseCaseStudio/ExpectedResults.tsx",
            role: "Expected results definition form",
          },
        ],
        stores: [
          {
            name: "useCaseStore",
            path: "frontend/src/stores/useCaseStore.ts",
            role: "Provides expected results within use case",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/use_cases/*.json",
            category: "metadata",
            role: "Use case files containing expected_results",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Expected results reference metadata-defined models and scoring; the result format adapts to model configuration.",
      },
    ],
  },

  // =========================================================================
  // VIEW 12: Risk Case Manager
  // =========================================================================
  {
    viewId: "alerts",
    viewName: "Risk Case Manager",
    route: "/alerts",
    sections: [
      {
        id: "alerts.summary-grid",
        displayName: "Alerts Grid",
        viewId: "alerts",
        description:
          "AG Grid of all alerts with columns for alert ID, detection model, product, score, trigger path, asset class, and timestamp. Core view for alert triage.",
        files: [
          { path: "frontend/src/views/RiskCaseManager/index.tsx", role: "Main view layout with alert grid" },
          { path: "frontend/src/views/RiskCaseManager/AlertSummary.tsx", role: "Alert summary grid component" },
          { path: "frontend/src/stores/alertStore.ts", role: "Fetches and manages alert data" },
          { path: "backend/api/alerts.py", role: "Serves alert data from Parquet" },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alerts array, selection, and filtering",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/alerts",
            role: "Returns all alerts with summary data",
            routerFile: "backend/api/alerts.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/alerts/summary.parquet",
            category: "results",
            role: "Alert summary data produced by detection engine",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Renders sortable/filterable alert table" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Alerts are produced by metadata-driven detection models. Grid columns are partly hardcoded but data is from metadata-driven engine output.",
      },
      {
        id: "alerts.filters",
        displayName: "Alert Filters",
        viewId: "alerts",
        description:
          "Alert summary grid with metadata-driven column definitions and filter types. Column config loaded from grid metadata API with fallback to hardcoded.",
        files: [
          { path: "frontend/src/views/RiskCaseManager/index.tsx", role: "Filter bar rendering" },
          { path: "frontend/src/views/RiskCaseManager/AlertSummary.tsx", role: "Alert summary grid with metadata columns" },
          { path: "frontend/src/hooks/useGridColumns.ts", role: "Hook for metadata-driven grid columns" },
          { path: "frontend/src/stores/alertStore.ts", role: "Manages filter state" },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides filter state and actions",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/grids/risk_case_manager",
            role: "Returns alert grid column and filter configuration",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          { path: "workspace/metadata/grids/risk_case_manager.json", category: "metadata", role: "Alert grid column definitions with filter types" },
        ],
        technologies: [{ name: "AG Grid", role: "Renders alert summary grid" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Column definitions and filter types loaded from grid metadata JSON. Custom cellRenderers (score badge, trigger badge) remain in frontend code. Fallback to hardcoded on API error.",
        metadataOpportunities: [
          "Make filter operator options configurable per deployment",
        ],
      },
      {
        id: "alerts.detail-header",
        displayName: "Alert Header",
        viewId: "alerts",
        description:
          "Header section of alert detail showing alert ID, detection model name, product, composite score, and trigger path. Quick-reference summary for the selected alert.",
        files: [
          { path: "frontend/src/views/RiskCaseManager/AlertDetail/index.tsx", role: "Alert detail header section" },
          { path: "frontend/src/stores/alertStore.ts", role: "Provides selected alert data" },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides selected alert summary",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace files with full detail data",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Header content comes from metadata-driven detection output. Panel layout, emphasis, and investigation hints now load from model alert_detail_layout metadata via API, with hardcoded fallback.",
      },
      {
        id: "alerts.business-description",
        displayName: "Business Description",
        viewId: "alerts",
        description:
          "Human-readable explanation of what the alert means in business terms. Description sourced from the detection model's metadata definition.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/BusinessDescription.tsx",
            role: "Renders business description from model metadata",
          },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alert trace with business context",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace containing business description from model metadata",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Description text comes from detection model metadata. Template interpolation is code-driven.",
      },
      {
        id: "alerts.entity-context",
        displayName: "Entity Context",
        viewId: "alerts",
        description:
          "Dynamic grid displaying entity fields relevant to the alert (product details, account info, trader info). Fields and values from alert trace entity_context section.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/EntityContext.tsx",
            role: "Dynamic entity context grid",
          },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alert trace entity context data",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace with entity_context containing related entity data",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Entity fields and their values come entirely from the alert trace entity_context, which is populated by the metadata-driven detection engine.",
      },
      {
        id: "alerts.calculation-trace",
        displayName: "Calculation Trace",
        viewId: "alerts",
        description:
          "React Flow DAG showing the calculation execution trace for this alert. Each node shows the calculation name, result, and contribution to the score. Core traceability feature.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/CalculationTrace.tsx",
            role: "React Flow calculation trace DAG",
          },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alert trace calculation data",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace with calculation execution results",
          },
        ],
        technologies: [
          { name: "React Flow", role: "Interactive calculation trace DAG" },
          { name: "Dagre", role: "Automatic DAG layout" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Calculation nodes and edges come from trace data produced by metadata-driven engine. Trace structure mirrors metadata-defined calculation dependencies.",
      },
      {
        id: "alerts.market-data",
        displayName: "Market Data",
        viewId: "alerts",
        description:
          "Candlestick chart showing OHLCV market data for the product associated with the alert. Chart type and field mapping configured per detection model via market_data_config metadata.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/MarketDataChart.tsx",
            role: "TradingView candlestick chart for market data",
          },
          { path: "backend/api/data.py", role: "Serves market data for product" },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides product ID for market data lookup",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/data/market/{productId}",
            role: "Returns OHLCV market data for product",
            routerFile: "backend/api/data.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/data/csv/md_eod.csv",
            category: "data",
            role: "End-of-day market data (OHLCV) for candlestick chart",
          },
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "market_data_config per detection model defines chart type, fields, and overlay behavior",
          },
        ],
        technologies: [
          { name: "TradingView Lightweight Charts", role: "Financial candlestick chart rendering" },
        ],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Chart type (candlestick/line), price fields, volume field, and trade overlay settings are defined per detection model in market_data_config metadata. Chart rendering code in frontend.",
        metadataOpportunities: [
          "Add indicator configuration (moving averages, VWAP) to market_data_config metadata",
        ],
      },
      {
        id: "alerts.trade-volume",
        displayName: "Trade Volume",
        viewId: "alerts",
        description:
          "Bar chart showing trade volume over time for the product associated with the alert. Contextualizes the alert with trading activity patterns.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/TradeVolumeChart.tsx",
            role: "Recharts bar chart for trade volume",
          },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides trade volume data from alert context",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace containing trade volume context data",
          },
        ],
        technologies: [{ name: "Recharts", role: "Bar chart for trade volume visualization" }],
        metadataMaturity: "code-driven",
        maturityExplanation:
          "Chart configuration and data transformation are hardcoded in the component.",
        metadataOpportunities: [
          "Make chart type and aggregation configurable via model metadata",
        ],
      },
      {
        id: "alerts.settings-trace",
        displayName: "Settings Trace",
        viewId: "alerts",
        description:
          "Settings resolution audit log showing which settings were resolved for this alert, their values, and which override level matched. Key metadata traceability feature.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/SettingsTrace.tsx",
            role: "Renders settings resolution trace table",
          },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alert trace settings data",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace with settings_trace showing resolution audit",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Settings trace comes from the metadata-driven resolution engine. Shows exactly which metadata-defined override matched and why.",
      },
      {
        id: "alerts.score-breakdown",
        displayName: "Score Breakdown",
        viewId: "alerts",
        description:
          "Bar chart and table showing how individual calculation scores combine into the composite alert score. Shows weight, raw score, and weighted contribution per calculation.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/ScoreBreakdown.tsx",
            role: "Score breakdown chart and table",
          },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alert trace score data",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/alerts/traces/*.json",
            category: "results",
            role: "Alert trace with score_breakdown from scoring engine",
          },
        ],
        technologies: [{ name: "Recharts", role: "Bar chart for score visualization" }],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Score weights and calculation references come from metadata-driven model scoring configuration. Breakdown structure mirrors model metadata.",
      },
      {
        id: "alerts.related-orders",
        displayName: "Related Orders",
        viewId: "alerts",
        description:
          "AG Grid showing orders and executions related to the alert. Column definitions loaded from grid metadata JSON via API with fallback to hardcoded.",
        files: [
          {
            path: "frontend/src/views/RiskCaseManager/AlertDetail/RelatedOrders.tsx",
            role: "Related orders/executions grid with metadata columns",
          },
          { path: "frontend/src/hooks/useGridColumns.ts", role: "Hook for metadata-driven grid columns" },
          { path: "backend/api/data.py", role: "Returns related orders and executions" },
        ],
        stores: [
          {
            name: "alertStore",
            path: "frontend/src/stores/alertStore.ts",
            role: "Provides alert context for order lookup",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/data/orders",
            role: "Returns related orders and executions",
            routerFile: "backend/api/data.py",
          },
          {
            method: "GET",
            path: "/api/metadata/grids/related_executions",
            role: "Returns execution grid column definitions",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/grids/related_orders",
            role: "Returns order grid column definitions",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/data/csv/order.csv",
            category: "data",
            role: "Order data for related order lookup",
          },
          {
            path: "workspace/data/csv/execution.csv",
            category: "data",
            role: "Execution data for trade details",
          },
          {
            path: "workspace/metadata/grids/related_executions.json",
            category: "metadata",
            role: "Execution grid column definitions",
          },
          {
            path: "workspace/metadata/grids/related_orders.json",
            category: "metadata",
            role: "Order grid column definitions",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Renders related orders table" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Grid column definitions loaded from metadata JSON via API. Custom cellRenderers (side badge, price formatter) remain in frontend. Fallback to hardcoded on API error.",
        metadataOpportunities: [
          "Derive related order queries from entity relationship metadata",
          "Use entity metadata for column labels and formatting",
        ],
      },
    ],
  },

  // =========================================================================
  // VIEW 13: AI Assistant
  // =========================================================================
  {
    viewId: "assistant",
    viewName: "AI Assistant",
    route: "/assistant",
    sections: [
      {
        id: "assistant.chat-panel",
        displayName: "Chat Panel",
        viewId: "assistant",
        description:
          "Full-page chat UI with message bubbles, code blocks, and SQL execution. Supports both live Claude API and mock demo mode with pre-scripted sequences.",
        files: [
          { path: "frontend/src/views/AIAssistant/index.tsx", role: "Main AI assistant view" },
          { path: "frontend/src/views/AIAssistant/ChatPanel.tsx", role: "Chat UI with message rendering" },
          { path: "backend/api/ai.py", role: "AI chat endpoint (mock or live)" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/ai/chat",
            role: "Processes chat messages via mock or live AI",
            routerFile: "backend/api/ai.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/ai_mock_sequences.json",
            category: "config",
            role: "Pre-scripted mock AI conversation sequences for demo mode",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Mock sequences are metadata-driven configuration. AI context auto-generates from live metadata state via /api/ai/context-summary (entities, models, calcs, settings, format rules, navigation). Chat UI and message parsing are code-driven.",
        metadataOpportunities: [
          "Define chat capabilities as metadata (available tools, SQL access scope)",
        ],
      },
      {
        id: "assistant.mock-player",
        displayName: "Mock Player",
        viewId: "assistant",
        description:
          "Scenario selector for mock demo mode. Allows choosing from pre-scripted conversation sequences to demonstrate AI capabilities without live API access.",
        files: [
          { path: "frontend/src/views/AIAssistant/MockPlayer.tsx", role: "Mock scenario selector and player" },
          { path: "backend/api/ai.py", role: "Returns available mock sequences" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/ai/mock-sequences",
            role: "Returns available mock conversation sequences",
            routerFile: "backend/api/ai.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/ai_mock_sequences.json",
            category: "config",
            role: "Mock sequence definitions with messages and SQL",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Mock sequences are defined in a JSON config file. Adding new sequences does not require code changes.",
      },
      {
        id: "assistant.query-preview",
        displayName: "Query Preview",
        viewId: "assistant",
        description:
          "SQL execution results panel within AI assistant. Displays results when the AI generates and executes SQL queries as part of the conversation.",
        files: [
          { path: "frontend/src/views/AIAssistant/QueryPreview.tsx", role: "SQL query results display" },
          { path: "backend/api/query.py", role: "Executes SQL queries from AI" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/query/execute",
            role: "Executes SQL queries generated by AI",
            routerFile: "backend/api/query.py",
          },
        ],
        dataSources: [],
        technologies: [{ name: "AG Grid", role: "Dynamic result grid for AI query output" }],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Infrastructure component for displaying SQL results. Query execution is a runtime operation.",
      },
    ],
  },

  // =========================================================================
  // VIEW 14: Metadata Editor
  // =========================================================================
  {
    viewId: "editor",
    viewName: "Metadata Editor",
    route: "/editor",
    sections: [
      {
        id: "editor.type-selector",
        displayName: "Type Selector",
        viewId: "editor",
        description:
          "Dropdown to select metadata type category: entities, calculations, settings, or detection models. Type list is hardcoded.",
        files: [
          { path: "frontend/src/views/MetadataEditor/index.tsx", role: "Type selector rendering" },
        ],
        stores: [],
        apis: [],
        dataSources: [],
        technologies: [],
        metadataMaturity: "code-driven",
        maturityExplanation:
          "The list of metadata types (entities, calculations, settings, detection-models) is hardcoded in the component.",
        metadataOpportunities: [
          "Discover available metadata types dynamically from the backend file system or API",
        ],
      },
      {
        id: "editor.item-list",
        displayName: "Item List",
        viewId: "editor",
        description:
          "Dropdown to select a specific metadata item within the chosen type. Items loaded dynamically from metadata API based on selected type.",
        files: [
          { path: "frontend/src/views/MetadataEditor/index.tsx", role: "Item selector dropdown" },
          { path: "frontend/src/stores/metadataStore.ts", role: "Provides metadata items by type" },
          { path: "backend/api/metadata.py", role: "Serves metadata items by type" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides metadata items for selected type",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/{type}",
            role: "Returns all items for a metadata type",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/**/*.json",
            category: "metadata",
            role: "All metadata JSON files discovered by type",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Item list is dynamically loaded from metadata files. New files appear automatically.",
      },
      {
        id: "editor.json-panel",
        displayName: "JSON Editor",
        viewId: "editor",
        description:
          "Monaco editor for direct JSON editing of metadata files. Provides syntax highlighting, validation, and formatting. The raw editing experience for metadata authors.",
        files: [
          {
            path: "frontend/src/views/MetadataEditor/JsonPanel.tsx",
            role: "Monaco JSON editor component",
          },
        ],
        stores: [],
        apis: [],
        dataSources: [],
        technologies: [{ name: "Monaco Editor", role: "JSON editor with syntax highlighting" }],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Infrastructure editing tool. Monaco provides the JSON editing capability for any metadata type.",
      },
      {
        id: "editor.visual-panel",
        displayName: "Visual Editor",
        viewId: "editor",
        description:
          "Type-specific form editors providing a structured editing experience. Different editor components for entities, calculations, settings, and detection models. Forms render from metadata schema.",
        files: [
          {
            path: "frontend/src/views/MetadataEditor/VisualPanel.tsx",
            role: "Visual editor switcher based on type",
          },
          {
            path: "frontend/src/views/MetadataEditor/EntityEditor.tsx",
            role: "Entity-specific visual editor",
          },
          {
            path: "frontend/src/views/MetadataEditor/CalculationEditor.tsx",
            role: "Calculation-specific visual editor",
          },
          {
            path: "frontend/src/views/MetadataEditor/SettingsEditor.tsx",
            role: "Settings-specific visual editor",
          },
          {
            path: "frontend/src/views/MetadataEditor/DetectionModelEditor.tsx",
            role: "Detection model-specific visual editor",
          },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides metadata item for editing",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/metadata/**/*.json",
            category: "metadata",
            role: "Metadata files being edited",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Form fields render from metadata schema, but each editor component is type-specific code. Adding a new metadata type requires a new editor component.",
      },
      {
        id: "editor.oob-version",
        displayName: "OOB Version",
        viewId: "editor",
        description:
          "Out-of-box version comparison panel. Shows the original OOB version alongside the current customized version, with diff highlighting. Core feature of the metadata layering system.",
        files: [
          {
            path: "frontend/src/views/MetadataEditor/OobVersionPanel.tsx",
            role: "OOB vs custom comparison panel",
          },
          { path: "backend/api/metadata.py", role: "Provides OOB version and diff" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides metadata layer information",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/oob-version",
            role: "Returns OOB version of a metadata item",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/layers/{type}/{id}/info",
            role: "Returns layer info (OOB vs custom)",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/layers/{type}/{id}/diff",
            role: "Returns JSON diff between OOB and custom",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/**/*.json",
            category: "metadata",
            role: "Current metadata files (custom layer)",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "OOB layer system is a core metadata architecture feature. Comparison and diff are driven entirely by metadata file layers.",
      },
      {
        id: "editor.save-controls",
        displayName: "Save Controls",
        viewId: "editor",
        description:
          "Save and validate buttons for committing metadata edits. Saves either JSON or visual editor content back to metadata files.",
        files: [
          { path: "frontend/src/views/MetadataEditor/index.tsx", role: "Save/validate button rendering" },
          { path: "backend/api/metadata.py", role: "Handles metadata save" },
        ],
        stores: [
          {
            name: "metadataStore",
            path: "frontend/src/stores/metadataStore.ts",
            role: "Provides save action",
          },
        ],
        apis: [
          {
            method: "PUT",
            path: "/api/metadata/{type}/{id}",
            role: "Saves metadata item",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [],
        technologies: [],
        metadataMaturity: "infrastructure",
        maturityExplanation:
          "Save/validate buttons are infrastructure controls for the metadata editing workflow.",
      },
    ],
  },

  // =========================================================================
  // VIEW 15: Regulatory Map
  // =========================================================================
  {
    viewId: "regulatory",
    viewName: "Regulatory Map",
    route: "/regulatory",
    sections: [
      {
        id: "regulatory.summary-cards",
        displayName: "Coverage Summary",
        viewId: "regulatory",
        description:
          "Four KPI cards showing regulation coverage metrics: Total Requirements, Covered, Uncovered, and Coverage %. All derived from regulatory metadata.",
        files: [
          { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Summary cards rendering" },
          { path: "frontend/src/stores/regulatoryStore.ts", role: "Fetches regulatory coverage data" },
          { path: "backend/api/metadata.py", role: "Calculates regulatory coverage" },
        ],
        stores: [
          {
            name: "regulatoryStore",
            path: "frontend/src/stores/regulatoryStore.ts",
            role: "Provides coverage statistics",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/regulatory/coverage",
            role: "Returns regulatory coverage summary metrics",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/iso",
            role: "Returns ISO standards registry with field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/fix",
            role: "Returns FIX protocol field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/compliance",
            role: "Returns compliance requirements with implementation mappings",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/regulations/*.json",
            category: "metadata",
            role: "Regulation definition files with article and model mappings",
          },
          {
            path: "workspace/metadata/standards/iso_mapping.json",
            category: "metadata",
            role: "ISO standards registry with field mappings and validation rules",
          },
          {
            path: "workspace/metadata/standards/fix_protocol.json",
            category: "metadata",
            role: "FIX protocol field mappings with regulatory relevance",
          },
          {
            path: "workspace/metadata/standards/compliance_requirements.json",
            category: "metadata",
            role: "Granular compliance requirements mapped to implementations",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All coverage metrics computed from regulation metadata files and their references to detection models.",
      },
      {
        id: "regulatory.traceability-graph",
        displayName: "Traceability Graph",
        viewId: "regulatory",
        description:
          "React Flow graph showing the full regulatory traceability chain: regulations -> articles -> detection models -> calculations. The core visualization of metadata-driven regulatory coverage.",
        files: [
          { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Traceability graph rendering" },
          { path: "frontend/src/stores/regulatoryStore.ts", role: "Provides traceability graph data" },
          { path: "backend/api/metadata.py", role: "Builds traceability graph from metadata" },
        ],
        stores: [
          {
            name: "regulatoryStore",
            path: "frontend/src/stores/regulatoryStore.ts",
            role: "Provides graph nodes and edges from API",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/regulatory/traceability-graph",
            role: "Returns traceability graph (nodes + edges) for React Flow",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/iso",
            role: "Returns ISO standards registry with field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/fix",
            role: "Returns FIX protocol field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/compliance",
            role: "Returns compliance requirements with implementation mappings",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/regulations/*.json",
            category: "metadata",
            role: "Regulation definitions with article-to-model mappings",
          },
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Detection model definitions referenced by regulations",
          },
          {
            path: "workspace/metadata/calculations/**/*.json",
            category: "metadata",
            role: "Calculation definitions referenced by models",
          },
          {
            path: "workspace/metadata/standards/iso_mapping.json",
            category: "metadata",
            role: "ISO standards with field-level mappings to entity fields",
          },
          {
            path: "workspace/metadata/standards/fix_protocol.json",
            category: "metadata",
            role: "FIX protocol fields with regulatory relevance tags",
          },
          {
            path: "workspace/metadata/standards/compliance_requirements.json",
            category: "metadata",
            role: "Compliance requirements linked to detection models and calculations",
          },
        ],
        technologies: [
          { name: "React Flow", role: "Interactive traceability graph rendering" },
          { name: "Dagre", role: "Automatic hierarchical graph layout" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Graph is derived entirely from metadata relationships: regulations reference articles, articles map to models, models reference calculations. All metadata.",
      },
      {
        id: "regulatory.coverage-grid",
        displayName: "Coverage Grid",
        viewId: "regulatory",
        description:
          "AG Grid showing regulation details with columns: Regulation, Jurisdiction, Article, Title, and Coverage status badge. Tabular view of regulatory compliance.",
        files: [
          { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Coverage grid rendering" },
          { path: "frontend/src/stores/regulatoryStore.ts", role: "Provides regulation registry data" },
          { path: "backend/api/metadata.py", role: "Returns regulatory registry" },
        ],
        stores: [
          {
            name: "regulatoryStore",
            path: "frontend/src/stores/regulatoryStore.ts",
            role: "Provides regulation registry with coverage details",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/regulatory/registry",
            role: "Returns full regulatory registry with coverage status",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/iso",
            role: "Returns ISO standards registry with field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/fix",
            role: "Returns FIX protocol field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/compliance",
            role: "Returns compliance requirements with implementation mappings",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/regulations/*.json",
            category: "metadata",
            role: "Regulation definitions for registry display",
          },
          {
            path: "workspace/metadata/standards/iso_mapping.json",
            category: "metadata",
            role: "ISO standards referenced by regulation field requirements",
          },
          {
            path: "workspace/metadata/standards/fix_protocol.json",
            category: "metadata",
            role: "FIX protocol fields with regulatory relevance",
          },
          {
            path: "workspace/metadata/standards/compliance_requirements.json",
            category: "metadata",
            role: "Compliance requirements with coverage status",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Regulatory coverage table" }],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Grid content populated entirely from regulation metadata. Adding a regulation JSON file automatically updates the grid.",
      },
      {
        id: "regulatory.suggestions",
        displayName: "Suggestions",
        viewId: "regulatory",
        description:
          "Coverage gap analysis and improvement suggestions. Identifies unmapped regulatory articles and suggests which detection models could address them.",
        files: [
          { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Suggestions panel rendering" },
          { path: "frontend/src/stores/regulatoryStore.ts", role: "Provides suggestions data" },
          { path: "backend/api/metadata.py", role: "Analyzes coverage gaps" },
        ],
        stores: [
          {
            name: "regulatoryStore",
            path: "frontend/src/stores/regulatoryStore.ts",
            role: "Provides coverage gap suggestions",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/regulatory/suggestions",
            role: "Returns coverage gap analysis and suggestions",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/iso",
            role: "Returns ISO standards registry with field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/fix",
            role: "Returns FIX protocol field mappings",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/standards/compliance",
            role: "Returns compliance requirements with implementation mappings",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/regulations/*.json",
            category: "metadata",
            role: "Regulation metadata for gap analysis",
          },
          {
            path: "workspace/metadata/detection_models/*.json",
            category: "metadata",
            role: "Available models for mapping suggestions",
          },
          {
            path: "workspace/metadata/standards/iso_mapping.json",
            category: "metadata",
            role: "ISO standards for compliance gap identification",
          },
          {
            path: "workspace/metadata/standards/fix_protocol.json",
            category: "metadata",
            role: "FIX protocol mappings for regulatory gap analysis",
          },
          {
            path: "workspace/metadata/standards/compliance_requirements.json",
            category: "metadata",
            role: "Compliance requirements for gap analysis and suggestions",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Suggestions are computed by analyzing metadata relationships. Gap detection is purely metadata-based.",
      },
    ],
  },

  // =========================================================================
  // VIEW 16: Submissions
  // =========================================================================
  {
    viewId: "submissions",
    viewName: "Submissions",
    route: "/submissions",
    sections: [
      {
        id: "submissions.grid",
        displayName: "Submissions Grid",
        viewId: "submissions",
        description:
          "AG Grid listing all metadata change submissions with ID, name, author, status, components count, and created date. Submissions represent proposed metadata changes for review.",
        files: [
          { path: "frontend/src/views/Submissions/index.tsx", role: "Main view with submissions grid" },
          { path: "frontend/src/stores/submissionStore.ts", role: "Fetches and manages submissions" },
          { path: "backend/api/submissions.py", role: "Serves submission data" },
        ],
        stores: [
          {
            name: "submissionStore",
            path: "frontend/src/stores/submissionStore.ts",
            role: "Provides submissions array and CRUD actions",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/submissions",
            role: "Returns all submissions",
            routerFile: "backend/api/submissions.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/submissions/*.json",
            category: "metadata",
            role: "Submission JSON files on disk",
            editHint: "Submissions created via API or UI",
          },
        ],
        technologies: [{ name: "AG Grid", role: "Renders submissions table" }],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Submissions are stored as JSON files and represent metadata change proposals. The submission format is somewhat flexible but the workflow is code-driven.",
      },
      {
        id: "submissions.detail",
        displayName: "Submission Detail",
        viewId: "submissions",
        description:
          "Tabbed detail view of a submission showing summary, components (proposed changes), recommendations, reviewer comments, and impact analysis.",
        files: [
          {
            path: "frontend/src/views/Submissions/SubmissionDetail.tsx",
            role: "Tabbed submission detail panel",
          },
          { path: "frontend/src/stores/submissionStore.ts", role: "Provides submission detail data" },
        ],
        stores: [
          {
            name: "submissionStore",
            path: "frontend/src/stores/submissionStore.ts",
            role: "Provides selected submission with full details",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "workspace/submissions/*.json",
            category: "metadata",
            role: "Submission files with full detail",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Submission content comes from metadata-like JSON files. Tab structure and display layout are code-driven.",
      },
      {
        id: "submissions.review-actions",
        displayName: "Review Actions",
        viewId: "submissions",
        description:
          "Approve, reject, and implement action buttons for submission review workflow. Includes recommendation generation and status transitions.",
        files: [
          {
            path: "frontend/src/views/Submissions/ReviewActions.tsx",
            role: "Review action buttons and workflow logic",
          },
          { path: "frontend/src/stores/submissionStore.ts", role: "Provides status update actions" },
          { path: "backend/api/submissions.py", role: "Handles status updates and recommendations" },
        ],
        stores: [
          {
            name: "submissionStore",
            path: "frontend/src/stores/submissionStore.ts",
            role: "Provides updateStatus and recommend actions",
          },
        ],
        apis: [
          {
            method: "PUT",
            path: "/api/submissions/{id}/status",
            role: "Updates submission status (approve/reject)",
            routerFile: "backend/api/submissions.py",
          },
          {
            method: "POST",
            path: "/api/submissions/{id}/recommend",
            role: "Generates recommendations for submission",
            routerFile: "backend/api/submissions.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/submissions/*.json",
            category: "metadata",
            role: "Submission files updated by review actions",
          },
          {
            path: "workspace/metadata/workflows/submission.json",
            category: "metadata",
            role: "Workflow state definitions with transitions and badge variants",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Workflow states (labels, badge variants, allowed transitions) loaded from metadata JSON via API. Submission content is metadata-driven. Review action logic remains in code.",
        metadataOpportunities: [
          "Add custom actions per workflow state from metadata",
        ],
      },
    ],
  },

  // =========================================================================
  // CROSS-CUTTING: Application Shell
  // =========================================================================
  {
    viewId: "app",
    viewName: "Application Shell",
    route: "/",
    sections: [
      {
        id: "app.sidebar",
        displayName: "Navigation Sidebar",
        viewId: "app",
        description:
          "Main navigation sidebar with 8 groups containing 19 view links. Groups: Overview, Define, Configure, Operate, Compose, Investigate, Governance, AI. Navigation structure loaded from metadata API with fallback.",
        files: [
          { path: "frontend/src/layouts/Sidebar.tsx", role: "Sidebar navigation component (loads from metadata)" },
          { path: "frontend/src/stores/navigationStore.ts", role: "Fetches navigation config from API" },
        ],
        stores: [
          {
            name: "navigationStore",
            path: "frontend/src/stores/navigationStore.ts",
            role: "Provides navigation groups from metadata API",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/navigation",
            role: "Returns navigation manifest with groups and view items",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/navigation/main.json",
            category: "metadata",
            role: "Navigation manifest defining sidebar groups and view links",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Navigation structure (groups, labels, paths, ordering) loaded from workspace/metadata/navigation/main.json via API. Sidebar has hardcoded fallback for resilience. Adding/reordering views requires only JSON changes.",
        metadataOpportunities: [
          "Allow role-based visibility via metadata configuration",
        ],
      },
      {
        id: "app.demo-toolbar",
        displayName: "Demo Toolbar",
        viewId: "app",
        description:
          "Progression controls for the demo workflow. Buttons for reset, step forward, skip to end, and act jump. Allows walking through the detection pipeline step by step.",
        files: [
          { path: "frontend/src/components/DemoToolbar.tsx", role: "Demo control buttons" },
          { path: "frontend/src/stores/demoStore.ts", role: "Manages demo progression state" },
          { path: "backend/api/demo.py", role: "Handles demo state and snapshots" },
        ],
        stores: [
          {
            name: "demoStore",
            path: "frontend/src/stores/demoStore.ts",
            role: "Provides demo state, reset, step, and skip actions",
          },
        ],
        apis: [
          {
            method: "GET",
            path: "/api/demo/state",
            role: "Returns current demo state",
            routerFile: "backend/api/demo.py",
          },
          {
            method: "POST",
            path: "/api/demo/reset",
            role: "Resets demo to initial state",
            routerFile: "backend/api/demo.py",
          },
          {
            method: "POST",
            path: "/api/demo/step",
            role: "Advances demo by one step",
            routerFile: "backend/api/demo.py",
          },
          {
            method: "POST",
            path: "/api/demo/skip-to-end",
            role: "Skips demo to final state",
            routerFile: "backend/api/demo.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/demo/default.json",
            category: "metadata",
            role: "Demo checkpoint definitions with labels, descriptions, and ordering",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Demo checkpoints (labels, descriptions, ordering) defined in metadata JSON accessible via API. Toolbar button rendering and state progression logic remain in code.",
        metadataOpportunities: [
          "Add custom demo flows for different audience types",
        ],
      },
      {
        id: "app.toolbar",
        displayName: "Application Toolbar",
        viewId: "app",
        description:
          "Top toolbar with Tour, Scenarios, Trace, and theme toggle buttons. Tours and scenarios are loaded from TypeScript data files. Architecture trace toggle activates the traceability overlay.",
        files: [
          { path: "frontend/src/layouts/AppLayout.tsx", role: "Toolbar rendering and tour integration" },
          { path: "frontend/src/stores/tourStore.ts", role: "Manages tour state" },
          { path: "frontend/src/stores/traceabilityStore.ts", role: "Manages trace overlay state" },
          { path: "frontend/src/data/tourDefinitions.ts", role: "Tour step definitions" },
          { path: "frontend/src/data/scenarioDefinitions.ts", role: "Guided scenario definitions" },
          { path: "frontend/src/data/operationScripts.ts", role: "View operation scripts" },
        ],
        stores: [
          {
            name: "tourStore",
            path: "frontend/src/stores/tourStore.ts",
            role: "Manages active tour, step index, visibility",
          },
          {
            name: "traceabilityStore",
            path: "frontend/src/stores/traceabilityStore.ts",
            role: "Manages trace overlay enabled state and selected section",
          },
        ],
        apis: [],
        dataSources: [
          {
            path: "frontend/src/data/tourDefinitions.ts",
            category: "config",
            role: "Tour step definitions for 31 guided scenarios",
          },
          {
            path: "frontend/src/data/scenarioDefinitions.ts",
            category: "config",
            role: "Scenario definitions linking tours to views",
          },
          {
            path: "frontend/src/data/operationScripts.ts",
            category: "config",
            role: "Operation scripts for 116 operations across 19 views",
          },
        ],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Tours and scenarios are data-driven (TypeScript data files compiled into bundle + JSON registry served via /api/metadata/tours). Tour/scenario counts and categories accessible via metadata API. Toolbar layout code-driven.",
        metadataOpportunities: [
          "Load tour/scenario definitions from the backend as true metadata",
          "Make toolbar buttons configurable via metadata",
        ],
      },
    ],
  },
  // =========================================================================
  // VIEW 17: Medallion Overview
  // =========================================================================
  {
    viewId: "medallion",
    viewName: "Medallion Overview",
    route: "/medallion",
    sections: [
      {
        id: "medallion.title",
        displayName: "View Header",
        viewId: "medallion",
        description:
          "Static header text rendered in code. Could be loaded from view_config metadata in the future.",
        files: [
          { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders view header" },
        ],
        stores: [],
        apis: [],
        dataSources: [],
        technologies: [],
        metadataMaturity: "code-driven",
        maturityExplanation:
          "Static header text rendered in code",
        metadataOpportunities: [
          "Load view title from view_config metadata",
        ],
      },
      {
        id: "medallion.tier-graph",
        displayName: "Tier Architecture Graph",
        viewId: "medallion",
        description:
          "React Flow diagram showing all 11 tiers of the medallion architecture. Tiers are arranged left-to-right from raw data (Landing) through processed (Gold/Platinum) to operational tiers (Logging, Metrics, Archive). Edges show data contracts between tiers. Layout is computed dynamically with dagre auto-layout.",
        files: [
          { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders React Flow graph with tier nodes and contract edges" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/medallion/tiers",
            role: "Returns all 11 tier definitions",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/medallion/contracts",
            role: "Returns data contracts between tiers",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/medallion/tiers.json",
            category: "metadata",
            role: "Tier definitions with data state, storage format, retention, quality gate, access level",
          },
          {
            path: "workspace/metadata/medallion/contracts",
            category: "metadata",
            role: "Data contract JSON files defining field mappings, quality rules, and SLAs between tiers",
          },
        ],
        technologies: [
          { name: "React Flow", role: "Interactive graph rendering with dagre auto-layout" },
          { name: "dagre", role: "Directed graph layout algorithm" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All 11 tiers, edges, and contract counts are loaded from medallion metadata JSON files. Layout is computed dynamically from the data.",
        metadataOpportunities: [],
      },
      {
        id: "medallion.tier-detail",
        displayName: "Tier Detail Panel",
        viewId: "medallion",
        description:
          "Detail panel showing properties of the selected tier: data state, storage format, retention policy, quality gate, access level, mutability. Related data contracts and pipeline stages are displayed below, with a Run Stage action button to execute pipeline stages directly from the tier detail.",
        files: [
          { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders tier detail panel with contracts and pipeline stages" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/medallion/tiers",
            role: "Returns tier definitions for detail display",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/medallion/contracts",
            role: "Returns contracts related to the selected tier",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/medallion/pipeline-stages",
            role: "Returns pipeline stages for the selected tier",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/medallion/tiers.json",
            category: "metadata",
            role: "Tier properties displayed in the detail panel",
          },
          {
            path: "workspace/metadata/medallion/contracts",
            category: "metadata",
            role: "Data contracts shown for the selected tier",
          },
          {
            path: "workspace/metadata/medallion/pipeline_stages.json",
            category: "metadata",
            role: "Pipeline stages related to the selected tier",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Tier properties, data contracts, and pipeline stages are all loaded from medallion metadata. No hardcoded data.",
        metadataOpportunities: [],
      },
    ],
  },

  // =========================================================================
  // VIEW 18: Data Onboarding
  // =========================================================================
  {
    viewId: "onboarding",
    viewName: "Data Onboarding",
    route: "/onboarding",
    sections: [
      {
        id: "onboarding.steps",
        displayName: "Onboarding Wizard Steps",
        viewId: "onboarding",
        description:
          "5-step wizard guiding the user through file upload, schema detection, quality profiling, entity mapping, and ingestion confirmation. Step transitions are managed by React state machine in the view component.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders wizard steps and manages step state transitions" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/onboarding/upload",
            role: "Accepts file upload and returns detected schema",
            routerFile: "backend/api/onboarding.py",
          },
        ],
        dataSources: [],
        technologies: [
          { name: "React", role: "Component state machine for wizard step progression" },
        ],
        metadataMaturity: "code-driven",
        maturityExplanation:
          "Wizard step sequence and transitions are hardcoded in the React component. Step definitions could be externalized to metadata in the future.",
        metadataOpportunities: [
          "Externalize wizard step definitions to metadata JSON",
          "Make connector types configurable via metadata",
        ],
      },
      {
        id: "onboarding.schema",
        displayName: "Schema Detection",
        viewId: "onboarding",
        description:
          "Auto-detects column names, data types, nullability, and domain patterns (ISIN, MIC, ISO8601, LEI) from uploaded file samples using PyArrow type inference and connector metadata.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders detected schema table with column types and patterns" },
          { path: "backend/api/onboarding.py", role: "Runs PyArrow schema inference on uploaded files" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/onboarding/upload",
            role: "Returns auto-detected schema with column types and patterns",
            routerFile: "backend/api/onboarding.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/standards/iso",
            category: "metadata",
            role: "ISO standard patterns used for column value recognition (ISIN, MIC, LEI, etc.)",
          },
        ],
        technologies: [
          { name: "PyArrow", role: "Schema inference engine for CSV, Parquet, and JSON files" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Schema detection uses PyArrow auto-inference combined with ISO standard pattern metadata for domain recognition. Column types and patterns are derived entirely from data and metadata — no hardcoded schema definitions.",
        metadataOpportunities: [],
      },
      {
        id: "onboarding.profile",
        displayName: "Data Quality Profile",
        viewId: "onboarding",
        description:
          "Profiles each column for completeness, null rates, distinct counts, min/max values, and computes an overall quality score. Uses PyArrow compute functions for statistics.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders quality profile table with per-column statistics and overall score" },
          { path: "backend/api/onboarding.py", role: "Computes column-level quality statistics using PyArrow compute" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/onboarding/profile",
            role: "Returns per-column quality statistics and overall quality score",
            routerFile: "backend/api/onboarding.py",
          },
        ],
        dataSources: [],
        technologies: [
          { name: "PyArrow", role: "Compute functions for column-level statistics (null counts, distinct, min/max)" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Quality profiling output is computed entirely from the uploaded data using PyArrow compute functions. Statistics and quality scores are derived from data — no hardcoded quality rules.",
        metadataOpportunities: [],
      },
      {
        id: "onboarding.title",
        displayName: "View Header",
        viewId: "onboarding",
        description:
          "Static header displaying 'Data Onboarding' title with a step counter badge showing current progress through the 5-step wizard.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders view header with step badge" },
        ],
        stores: [],
        apis: [],
        dataSources: [],
        technologies: [],
        metadataMaturity: "code-driven",
        maturityExplanation:
          "Header text and step counter are hardcoded in the component.",
        metadataOpportunities: [
          "Load view title from view_config metadata",
        ],
      },
      {
        id: "onboarding.select-source",
        displayName: "Select Source",
        viewId: "onboarding",
        description:
          "Step 1 panel for file upload and connector selection. Shows available connectors loaded from the onboarding API and a file input for CSV/Parquet/JSON upload.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders file upload and connector cards" },
          { path: "backend/api/onboarding.py", role: "Lists available connectors and handles file upload" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/onboarding/connectors",
            role: "Returns available data connectors",
            routerFile: "backend/api/onboarding.py",
          },
          {
            method: "POST",
            path: "/api/onboarding/upload",
            role: "Accepts file upload and returns detected schema",
            routerFile: "backend/api/onboarding.py",
          },
        ],
        dataSources: [],
        technologies: [],
        metadataMaturity: "mixed",
        maturityExplanation:
          "Connector list is loaded from the API (metadata-driven), but the upload UI and step flow are code-driven.",
        metadataOpportunities: [],
      },
      {
        id: "onboarding.map-entity",
        displayName: "Map to Entity",
        viewId: "onboarding",
        description:
          "Step 4 panel for mapping uploaded columns to a target entity. Entity selector loads available entities from metadata API; auto-suggests field mappings by matching column names.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders entity selector and field mapping table" },
          { path: "backend/api/metadata.py", role: "Returns entity list and field definitions" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/metadata/entities",
            role: "Returns available entities for mapping target",
            routerFile: "backend/api/metadata.py",
          },
          {
            method: "GET",
            path: "/api/metadata/entities/{id}",
            role: "Returns entity fields for mapping suggestions",
            routerFile: "backend/api/metadata.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/entities/*.json",
            category: "metadata",
            role: "Entity definitions used as mapping targets",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Entity list and field definitions are loaded from metadata. Auto-mapping uses entity field names for suggestions. Mapping creates a draft mapping definition in the mappings API.",
        metadataOpportunities: [],
      },
      {
        id: "onboarding.confirm",
        displayName: "Confirmation",
        viewId: "onboarding",
        description:
          "Step 5 panel showing onboarding summary after confirmation: filename, format, row count, column count, quality score, and target entity. Includes a reset button to start a new upload.",
        files: [
          { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders confirmation summary with job details" },
          { path: "backend/api/onboarding.py", role: "Confirms onboarding job and sets target entity" },
        ],
        stores: [],
        apis: [
          {
            method: "POST",
            path: "/api/onboarding/jobs/{job_id}/confirm",
            role: "Confirms the onboarding job with target entity",
            routerFile: "backend/api/onboarding.py",
          },
        ],
        dataSources: [],
        technologies: [],
        metadataMaturity: "mixed",
        maturityExplanation:
          "Confirmation summary data comes from the onboarding job result. Layout is code-driven.",
        metadataOpportunities: [],
      },
    ],
  },
  // =========================================================================
  // VIEW: Data Quality
  // =========================================================================
  {
    viewId: "quality",
    viewName: "Data Quality",
    route: "/quality",
    sections: [
      {
        id: "quality.entity-scores",
        displayName: "Quality Scores",
        viewId: "quality",
        description:
          "Weighted quality scores per entity and data contract using ISO 8000/25012 dimensions",
        files: [
          { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders quality scorecards with per-contract weighted scores" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/quality/scores",
            role: "Returns quality scores for all entities and data contracts",
            routerFile: "backend/api/quality.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/quality/dimensions.json",
            category: "metadata",
            role: "Quality dimension definitions and weights for ISO 25012 scoring",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Quality dimensions and rule-to-dimension mapping both loaded from metadata",
        metadataOpportunities: [],
      },
      {
        id: "quality.spider-chart",
        displayName: "Quality Spider Chart",
        viewId: "quality",
        description:
          "Radar chart showing per-dimension quality scores for selected entity",
        files: [
          { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders Recharts radar chart for quality dimension breakdown" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/quality/scores/{contract_id}",
            role: "Returns per-dimension quality scores for a specific data contract",
            routerFile: "backend/api/quality.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/metadata/quality/dimensions.json",
            category: "metadata",
            role: "Dimension definitions, thresholds, and weight configuration",
          },
        ],
        technologies: [
          { name: "Recharts", role: "RadarChart component for spider/radar visualization" },
        ],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "Dimension definitions, thresholds, and scores all from metadata/API",
        metadataOpportunities: [],
      },
      {
        id: "quality.quarantine-queue",
        displayName: "Quarantine Queue",
        viewId: "quality",
        description:
          "Queue of records that failed quality validation with retry and override actions",
        files: [
          { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders quarantine table with retry/override action buttons" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/quality/quarantine",
            role: "Returns quarantined records with failure details",
            routerFile: "backend/api/quality.py",
          },
        ],
        dataSources: [
          {
            path: "workspace/quarantine/*.json",
            category: "data",
            role: "Quarantined record files with failure reasons and metadata",
          },
        ],
        technologies: [],
        metadataMaturity: "fully-metadata-driven",
        maturityExplanation:
          "All quarantine records and actions managed through JSON files and API",
        metadataOpportunities: [],
      },
      {
        id: "quality.data-profiling",
        displayName: "Data Profiling",
        viewId: "quality",
        description:
          "Per-field data profiling statistics with entity and tier selection",
        files: [
          { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders per-field profiling table with null counts, distinct values, min/max" },
        ],
        stores: [],
        apis: [
          {
            method: "GET",
            path: "/api/quality/profile/{entity}",
            role: "Returns per-field profiling statistics for an entity",
            routerFile: "backend/api/quality.py",
          },
        ],
        dataSources: [],
        technologies: [],
        metadataMaturity: "mostly-metadata-driven",
        maturityExplanation:
          "Profiling computed from DuckDB tables, entity list is hardcoded",
        metadataOpportunities: [
          "Entity list could be loaded from metadata instead of hardcoded",
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Flat lookup helpers
// ---------------------------------------------------------------------------

const _sectionMap = new Map<string, TraceableSection>();

function _rebuildMap() {
  _sectionMap.clear();
  for (const vt of VIEW_TRACES) {
    for (const s of vt.sections) {
      _sectionMap.set(s.id, s);
    }
  }
}

/** Look up a single section by its data-trace ID */
export function getTraceSection(id: string): TraceableSection | undefined {
  if (_sectionMap.size === 0 && VIEW_TRACES.length > 0) _rebuildMap();
  return _sectionMap.get(id);
}

/** Get all sections for a given view ID */
export function getViewSections(viewId: string): TraceableSection[] {
  const vt = VIEW_TRACES.find((v) => v.viewId === viewId);
  return vt?.sections ?? [];
}
