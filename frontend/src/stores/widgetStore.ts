import { create } from "zustand";

const STORAGE_KEY = "widget-config";

interface PersistedConfig {
  visibility: Record<string, boolean>;
  chartTypes: Record<string, string>;
}

function loadConfig(): PersistedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visibility: {}, chartTypes: {} };
    const parsed = JSON.parse(raw) as PersistedConfig;
    return {
      visibility: parsed.visibility ?? {},
      chartTypes: parsed.chartTypes ?? {},
    };
  } catch {
    return { visibility: {}, chartTypes: {} };
  }
}

function saveConfig(visibility: Record<string, boolean>, chartTypes: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ visibility, chartTypes }));
}

interface WidgetState {
  visibility: Record<string, boolean>;
  chartTypes: Record<string, string>;
  toggleWidget: (id: string) => void;
  setChartType: (chartId: string, type: string) => void;
  isVisible: (id: string) => boolean;
  getChartType: (chartId: string, defaultType: string) => string;
}

export const useWidgetStore = create<WidgetState>((set, get) => {
  const initial = loadConfig();
  return {
    visibility: initial.visibility,
    chartTypes: initial.chartTypes,

    toggleWidget: (id: string) => {
      const current = get().visibility[id] ?? true;
      const updated = { ...get().visibility, [id]: !current };
      saveConfig(updated, get().chartTypes);
      set({ visibility: updated });
    },

    setChartType: (chartId: string, type: string) => {
      const updated = { ...get().chartTypes, [chartId]: type };
      saveConfig(get().visibility, updated);
      set({ chartTypes: updated });
    },

    isVisible: (id: string) => {
      return get().visibility[id] ?? true;
    },

    getChartType: (chartId: string, defaultType: string) => {
      return get().chartTypes[chartId] ?? defaultType;
    },
  };
});
