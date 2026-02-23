import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "analytics-theme";

function getSnapshot(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

let listeners: Array<() => void> = [];
function subscribe(cb: () => void) {
  listeners = [...listeners, cb];
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((l) => l());
}

// Apply on load
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", getSnapshot());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return { theme, toggle, setTheme } as const;
}
