import type { ViewTrace } from "../architectureRegistryTypes";

export const metadataEditorSections: ViewTrace = {
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
};
