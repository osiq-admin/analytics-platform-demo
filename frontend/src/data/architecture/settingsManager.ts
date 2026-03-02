import type { ViewTrace } from "../architectureRegistryTypes";

export const settingsManagerSections: ViewTrace = {
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
};
