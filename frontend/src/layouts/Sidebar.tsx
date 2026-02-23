import { NavLink } from "react-router-dom";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Define",
    items: [
      { label: "Entities", path: "/entities" },
      { label: "Calculations", path: "/metadata" },
    ],
  },
  {
    title: "Configure",
    items: [
      { label: "Settings", path: "/settings" },
      { label: "Mappings", path: "/mappings" },
    ],
  },
  {
    title: "Operate",
    items: [
      { label: "Pipeline", path: "/pipeline" },
      { label: "Schema", path: "/schema" },
      { label: "SQL Console", path: "/sql" },
    ],
  },
  {
    title: "Compose",
    items: [
      { label: "Models", path: "/models" },
      { label: "Data", path: "/data" },
    ],
  },
  {
    title: "Investigate",
    items: [{ label: "Risk Cases", path: "/alerts" }],
  },
  {
    title: "AI",
    items: [{ label: "Assistant", path: "/assistant" }],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface overflow-y-auto">
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
