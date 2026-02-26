import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import DemoToolbar from "../components/DemoToolbar.tsx";
import TourOverlay from "../components/TourOverlay.tsx";
import OnboardingModal from "../components/OnboardingModal.tsx";
import OperationScripts from "../components/TourEngine/OperationScripts.tsx";
import ScenarioSelector from "../components/TourEngine/ScenarioSelector.tsx";
import ScenarioRunner from "../components/TourEngine/ScenarioRunner.tsx";
import TraceToggleButton from "../components/TraceabilityMode/TraceToggleButton.tsx";
import TraceOverlay from "../components/TraceabilityMode/TraceOverlay.tsx";
import { useTheme } from "../hooks/useTheme.ts";
import { useTourStore } from "../stores/tourStore.ts";
import { TOURS } from "../data/tourDefinitions.ts";
import { SCENARIOS } from "../data/scenarioDefinitions.ts";
import { VIEW_OPERATIONS } from "../data/operationScripts.ts";

/** Map pathname segments to tour IDs */
function getTourIdForPath(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  const map: Record<string, string> = {
    dashboard: "dashboard",
    entities: "entities",
    metadata: "overview",
    settings: "settings",
    mappings: "mappings",
    editor: "editor",
    pipeline: "pipeline",
    schema: "schema",
    sql: "sql",
    models: "models",
    "use-cases": "overview",
    data: "data",
    alerts: "alerts",
    regulatory: "regulatory",
    submissions: "overview",
    assistant: "assistant",
  };
  return map[seg] ?? "overview";
}

export default function AppLayout() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [showScenarios, setShowScenarios] = useState(false);
  const { startTour, activeTour, definitions, registerTours, registerScenarios, activeScenario } = useTourStore();

  useEffect(() => {
    registerTours(TOURS);
    registerScenarios(SCENARIOS);
  }, [registerTours, registerScenarios]);

  // Derive view ID for operation scripts
  const viewId = location.pathname.replace("/", "") || "dashboard";
  const viewOps = VIEW_OPERATIONS[viewId] ?? null;

  const handleTour = () => {
    if (activeTour) return; // already running
    const tourId = getTourIdForPath(location.pathname);
    if (tourId && definitions[tourId]) {
      startTour(tourId);
    } else if (definitions["overview"]) {
      startTour("overview");
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top toolbar */}
        <header className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-border bg-surface">
          {/* Left: Demo progression controls */}
          <div data-tour="demo-toolbar" data-trace="app.demo-toolbar"><DemoToolbar /></div>

          {/* Right: Help & settings */}
          <div className="flex items-center gap-1.5 text-xs" data-tour="theme-toggle" data-trace="app.toolbar">
            {/* Learning tools */}
            <button
              onClick={handleTour}
              className="px-2 py-0.5 rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Start guided tour — interactive walkthrough of the current view's features and controls"
            >
              Tour
            </button>
            <button
              onClick={() => setShowScenarios(true)}
              className="px-2 py-0.5 rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Browse scenarios — 26 guided workflows covering surveillance use cases (entity setup, model tuning, alert investigation, etc.)"
            >
              Scenarios
            </button>
            <TraceToggleButton />

            {/* Divider */}
            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="px-2 py-0.5 rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>

      <TourOverlay />
      <TraceOverlay />
      <OnboardingModal />
      <OperationScripts viewOperations={viewOps} />
      <ScenarioSelector open={showScenarios} onClose={() => setShowScenarios(false)} />
      {activeScenario && <ScenarioRunner />}
    </div>
  );
}
