import type { ViewTrace } from "../architectureRegistryTypes";

export const metadataExplorerSections: ViewTrace = {
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
};
