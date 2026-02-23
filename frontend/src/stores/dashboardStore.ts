import { create } from "zustand";
import { api } from "../api/client.ts";

interface DashboardStats {
  total_alerts: number;
  by_model: { model_id: string; cnt: number }[];
  by_trigger: { trigger_path: string; cnt: number }[];
  avg_scores: { avg_score: number; avg_threshold: number };
  score_distribution: { bucket: number; cnt: number }[];
  by_asset: { asset_class: string; cnt: number }[];
}

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await api.get<DashboardStats>("/dashboard/stats");
      set({ stats, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
