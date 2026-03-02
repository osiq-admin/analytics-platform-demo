import type { ViewTrace } from "../architectureRegistryTypes";

export const crossCuttingSections: ViewTrace = {
  viewId: "app",
  viewName: "Application Shell",
  route: "/",
  sections: [
    {
      id: "app.sidebar",
      displayName: "Navigation Sidebar",
      viewId: "app",
      description:
        "Main navigation sidebar with 5 groups containing 20 view links. Groups: Define, Ingest, Detect, Investigate, Advanced. Navigation structure loaded from metadata API with fallback.",
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
        { path: "frontend/src/data/tours/index.ts", role: "Tour step definitions (barrel)" },
        { path: "frontend/src/data/scenarios/index.ts", role: "Guided scenario definitions (barrel)" },
        { path: "frontend/src/data/operations/index.ts", role: "View operation scripts (barrel)" },
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
          path: "frontend/src/data/tours/index.ts",
          category: "config",
          role: "Tour step definitions for 31 guided scenarios (barrel)",
        },
        {
          path: "frontend/src/data/scenarios/index.ts",
          category: "config",
          role: "Scenario definitions linking tours to views (barrel)",
        },
        {
          path: "frontend/src/data/operations/index.ts",
          category: "config",
          role: "Operation scripts for 116 operations across 19 views (barrel)",
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
};
