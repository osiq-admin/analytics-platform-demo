import type { ViewTrace } from "../architectureRegistryTypes";

export const mappingStudioSections: ViewTrace = {
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
};
