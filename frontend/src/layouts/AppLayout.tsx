import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import DemoToolbar from "../components/DemoToolbar.tsx";
import { useTheme } from "../hooks/useTheme.ts";

export default function AppLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top toolbar */}
        <header className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-border bg-surface">
          <DemoToolbar />
          <div className="flex items-center gap-2">
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
    </div>
  );
}
