import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import { useNavigationStore } from "../stores/navigationStore.ts";

// Fallback navigation if API is unavailable — mirrors workspace/metadata/navigation/main.json
const FALLBACK_NAVIGATION = [
  { title: "Define", items: [{ label: "Entities", path: "/entities" }, { label: "Calculations", path: "/metadata" }, { label: "Settings", path: "/settings" }, { label: "Reference Data", path: "/reference" }] },
  { title: "Ingest", items: [{ label: "Onboarding", path: "/onboarding" }, { label: "Mappings", path: "/mappings" }, { label: "Data Quality", path: "/quality" }, { label: "Medallion", path: "/medallion" }, { label: "Analytics Tiers", path: "/analytics-tiers" }] },
  { title: "Detect", items: [{ label: "Models", path: "/models" }, { label: "Use Cases", path: "/use-cases" }, { label: "Pipeline", path: "/pipeline" }, { label: "Dashboard", path: "/dashboard" }] },
  { title: "Investigate", items: [{ label: "Risk Cases", path: "/alerts" }, { label: "Submissions", path: "/submissions" }, { label: "Regulatory Map", path: "/regulatory" }] },
  { title: "Advanced", items: [{ label: "Schema", path: "/schema" }, { label: "SQL Console", path: "/sql" }, { label: "Data", path: "/data" }, { label: "Editor", path: "/editor" }, { label: "Assistant", path: "/assistant" }] },
];

export default function Sidebar() {
  const { groups, fetchNavigation } = useNavigationStore();

  useEffect(() => {
    fetchNavigation();
  }, [fetchNavigation]);

  const navigation = groups.length > 0 ? groups : FALLBACK_NAVIGATION;

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface overflow-y-auto" data-tour="sidebar" data-trace="app.sidebar">
      <div className="px-4 py-4">
        <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
          Surveillance
        </h1>
        <p className="text-xs text-muted mt-0.5">Analytics Platform</p>
      </div>

      <nav className="px-2 pb-4">
        {navigation.map((group) => (
          <div key={group.title} className="mb-3">
            <h2 className="px-2 mb-1 text-[10px] font-semibold tracking-widest text-muted uppercase">
              {group.title}
            </h2>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    "block px-2 py-1.5 rounded text-sm transition-colors",
                    isActive
                      ? "bg-accent/15 text-accent font-medium"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
