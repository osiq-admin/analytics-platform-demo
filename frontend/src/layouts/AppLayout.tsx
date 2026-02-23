import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import DemoToolbar from "../components/DemoToolbar.tsx";
import TourOverlay from "../components/TourOverlay.tsx";
import OnboardingModal from "../components/OnboardingModal.tsx";
import { useTheme } from "../hooks/useTheme.ts";
import { useTourStore } from "../stores/tourStore.ts";
import { TOURS } from "../data/tourDefinitions.ts";

/** Map pathname segments to tour IDs */
function getTourIdForPath(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  const map: Record<string, string> = {
    entities: "entities",
    settings: "settings",
    models: "models",
    alerts: "alerts",
    sql: "sql",
    pipeline: "pipeline",
    schema: "schema",
    mappings: "mappings",
    data: "data",
    assistant: "assistant",
    dashboard: "dashboard",
  };
  return map[seg] ?? "overview";
}

export default function AppLayout() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const { startTour, activeTour, definitions, registerTours } = useTourStore();

  useEffect(() => {
    registerTours(TOURS);
  }, [registerTours]);

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
          <div data-tour="demo-toolbar"><DemoToolbar /></div>
          <div className="flex items-center gap-2" data-tour="theme-toggle">
            <button
              onClick={handleTour}
              className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Start guided tour for this view"
            >
              Tour
            </button>
            <button
              onClick={toggle}
              className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
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
      <OnboardingModal />
    </div>
  );
}
