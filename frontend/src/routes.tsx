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
import UseCaseStudio from "./views/UseCaseStudio/index.tsx";
import RiskCaseManager from "./views/RiskCaseManager/index.tsx";
import AIAssistant from "./views/AIAssistant/index.tsx";
import Dashboard from "./views/Dashboard/index.tsx";
import MetadataEditor from "./views/MetadataEditor/index.tsx";
import Submissions from "./views/Submissions/index.tsx";

// Lazy-loaded views
const RegulatoryMap = lazy(() => import("./views/RegulatoryMap/index.tsx"));
const MedallionOverview = lazy(() => import("./views/MedallionOverview/index.tsx"));
const DataOnboarding = lazy(() => import("./views/DataOnboarding/index.tsx"));
const DataQuality = lazy(() => import("./views/DataQuality/index.tsx"));
const ReferenceData = lazy(() => import("./views/ReferenceData/index.tsx"));
const AnalyticsTiers = lazy(() => import("./views/AnalyticsTiers/index.tsx"));

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // Default route
      { index: true, element: <Dashboard /> },

      // Define — entity schemas, calculations, settings, reference data
      { path: "entities", element: <EntityDesigner /> },
      { path: "metadata", element: <MetadataExplorer /> },
      { path: "settings", element: <SettingsManager /> },
      { path: "reference", element: <Suspense fallback={null}><ReferenceData /></Suspense> },

      // Ingest — onboarding, mappings, quality, medallion tiers
      { path: "onboarding", element: <Suspense fallback={null}><DataOnboarding /></Suspense> },
      { path: "mappings", element: <MappingStudio /> },
      { path: "quality", element: <Suspense fallback={null}><DataQuality /></Suspense> },
      { path: "medallion", element: <Suspense fallback={null}><MedallionOverview /></Suspense> },
      { path: "analytics-tiers", element: <Suspense fallback={null}><AnalyticsTiers /></Suspense> },

      // Detect — models, use cases, pipeline, dashboard
      { path: "models", element: <ModelComposer /> },
      { path: "use-cases", element: <UseCaseStudio /> },
      { path: "pipeline", element: <PipelineMonitor /> },
      { path: "dashboard", element: <Dashboard /> },

      // Investigate — risk cases, submissions, regulatory
      { path: "alerts", element: <RiskCaseManager /> },
      { path: "alerts/:alertId", element: <RiskCaseManager /> },
      { path: "submissions", element: <Submissions /> },
      { path: "regulatory", element: <Suspense fallback={null}><RegulatoryMap /></Suspense> },

      // Advanced — schema, SQL, data, editor, AI assistant
      { path: "schema", element: <SchemaExplorer /> },
      { path: "sql", element: <SQLConsole /> },
      { path: "data", element: <DataManager /> },
      { path: "editor", element: <MetadataEditor /> },
      { path: "assistant", element: <AIAssistant /> },
    ],
  },
];
