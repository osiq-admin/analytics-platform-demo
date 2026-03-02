import type { ViewTrace } from "../architectureRegistryTypes";

export const schemaExplorerSections: ViewTrace = {
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
};
