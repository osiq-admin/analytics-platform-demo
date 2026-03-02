import type { ViewTrace } from "../architectureRegistryTypes";

export const useCaseStudioSections: ViewTrace = {
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
};
