import type { ViewTrace } from "../architectureRegistryTypes";

export const dataManagerSections: ViewTrace = {
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
};
