import { useEffect, useRef, useState } from "react";
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
import { useGovernanceStore } from "../stores/governanceStore.ts";
import { TOURS } from "../data/tours";
import { SCENARIOS } from "../data/scenarios";
import { VIEW_OPERATIONS } from "../data/operations";

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
    medallion: "medallion",
    onboarding: "onboarding",
    quality: "data-quality",
    "analytics-tiers": "analytics-tiers",
    reference: "reference-data",
    governance: "governance",
    glossary: "glossary",
    lineage: "lineage",
    cases: "cases",
  };
  return map[seg] ?? "overview";
}

const ROLE_ICONS: Record<string, string> = {
  analyst: "\u{1F441}",
  compliance_officer: "\u{1F6E1}",
  data_engineer: "\u{1F527}",
  admin: "\u{1F451}",
};

const ROLE_COLORS: Record<string, string> = {
  analyst: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  compliance_officer: "bg-green-500/15 text-green-400 border-green-500/30",
  data_engineer: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function AppLayout() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [showScenarios, setShowScenarios] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const { startTour, activeTour, definitions, registerTours, registerScenarios, activeScenario } = useTourStore();
  const { currentRole, roles, fetchRoles, switchRole } = useGovernanceStore();

  useEffect(() => {
    registerTours(TOURS);
    registerScenarios(SCENARIOS);
  }, [registerTours, registerScenarios]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // Close role menu on outside click
  useEffect(() => {
    if (!showRoleMenu) return;
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setShowRoleMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRoleMenu]);

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

            {/* Role switcher */}
            <div className="relative" ref={roleMenuRef} data-tour="role-switcher" data-trace="app.role-switcher">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`px-2 py-0.5 rounded border text-xs transition-colors ${ROLE_COLORS[currentRole] || "border-border text-muted"}`}
                title="Switch RBAC role — controls data masking and access levels"
              >
                {ROLE_ICONS[currentRole] || ""}{" "}
                {roles.find(r => r.role_id === currentRole)?.display_name || currentRole || "Role"}
              </button>
              {showRoleMenu && roles.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-border bg-surface shadow-lg z-50">
                  {roles.map(r => (
                    <button
                      key={r.role_id}
                      onClick={() => { switchRole(r.role_id); setShowRoleMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/20 transition-colors flex items-center gap-2 ${r.role_id === currentRole ? "bg-accent/10 font-medium" : ""}`}
                    >
                      <span>{ROLE_ICONS[r.role_id] || ""}</span>
                      <span className="flex-1">{r.display_name}</span>
                      {r.role_id === currentRole && <span className="text-accent text-[10px]">Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
