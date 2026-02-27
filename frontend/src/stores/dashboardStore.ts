import { create } from "zustand";
import { api } from "../api/client.ts";

/* ---------- Dashboard stats types ---------- */

interface DashboardStats {
  total_alerts: number;
  by_model: { model_id: string; cnt: number }[];
  by_trigger: { trigger_path: string; cnt: number }[];
  avg_scores: { avg_score: number; avg_threshold: number };
  score_distribution: { bucket: number; cnt: number }[];
  by_asset: { asset_class: string; cnt: number }[];
}

/* ---------- Widget config types (matches Pydantic models) ---------- */

export interface WidgetGridConfig {
  col_span: number;
  order: number;
}

export interface ChartConfig {
  x_field: string;
  y_field: string;
  default_chart_type: string;
  available_chart_types: string[];
  color_palette: string;
}

export interface FormatConfig {
  type: string;
  precision: number;
  suffix?: string;
  prefix?: string;
}

export interface WidgetDefinition {
  widget_id: string;
  widget_type: string;
  title: string;
  data_field: string;
  format?: FormatConfig | null;
  chart_config?: ChartConfig | null;
  grid: WidgetGridConfig;
}

export interface ViewWidgetConfig {
  view_id: string;
  widgets: WidgetDefinition[];
}

/* ---------- Store ---------- */

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  widgetConfig: ViewWidgetConfig | null;
  fetchStats: () => Promise<void>;
  fetchWidgetConfig: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  loading: false,
  error: null,
  widgetConfig: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await api.get<DashboardStats>("/dashboard/stats");
      set({ stats, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchWidgetConfig: async () => {
    try {
      const config = await api.get<ViewWidgetConfig>("/metadata/widgets/dashboard");
      set({ widgetConfig: config });
    } catch (e) {
      // Silently fail — the Dashboard will fall back to hardcoded layout
      console.warn("Failed to load widget config, using fallback:", e);
    }
  },
}));
