import { Suspense, lazy } from "react";
import { type RouteObject } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.tsx";

// Eager-loaded views
import EntityDesigner from "./views/EntityDesigner/index.tsx";
import MetadataExplorer from "./views/MetadataExplorer/index.tsx";
import SettingsManager from "./views/SettingsManager/index.tsx";
import MappingStudio from "./views/MappingStudio/index.tsx";
import PipelineMonitor from "./views/PipelineMonitor/index.tsx";
import SchemaExplorer from "./views/SchemaExplorer/index.tsx";
import SQLConsole from "./views/SQLConsole/index.tsx";
import ModelComposer from "./views/ModelComposer/index.tsx";
import DataManager from "./views/DataManager/index.tsx";
import RiskCaseManager from "./views/RiskCaseManager/index.tsx";
import AIAssistant from "./views/AIAssistant/index.tsx";
import Dashboard from "./views/Dashboard/index.tsx";
import MetadataEditor from "./views/MetadataEditor/index.tsx";

// Lazy-loaded views
const RegulatoryMap = lazy(() => import("./views/RegulatoryMap/index.tsx"));

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // Overview
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },

      // Define
      { path: "entities", element: <EntityDesigner /> },
      { path: "metadata", element: <MetadataExplorer /> },

      // Configure
      { path: "settings", element: <SettingsManager /> },
      { path: "mappings", element: <MappingStudio /> },
      { path: "editor", element: <MetadataEditor /> },

      // Operate
      { path: "pipeline", element: <PipelineMonitor /> },
      { path: "schema", element: <SchemaExplorer /> },
      { path: "sql", element: <SQLConsole /> },

      // Compose
      { path: "models", element: <ModelComposer /> },
      { path: "data", element: <DataManager /> },

      // Investigate
      { path: "alerts", element: <RiskCaseManager /> },
      { path: "alerts/:alertId", element: <RiskCaseManager /> },

      // Governance
      { path: "regulatory", element: <Suspense fallback={null}><RegulatoryMap /></Suspense> },

      // AI
      { path: "assistant", element: <AIAssistant /> },
    ],
  },
];
