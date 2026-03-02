import type { ViewTrace } from "../architectureRegistryTypes";

export const entityDesignerSections: ViewTrace = {
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
};
