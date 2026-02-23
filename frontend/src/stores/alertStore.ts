import { create } from "zustand";
import { api } from "../api/client.ts";

export interface AlertSummary {
  alert_id: string;
  model_id: string;
  timestamp: string;
  product_id: string;
  account_id: string;
  asset_class: string;
  accumulated_score: number;
  score_threshold: number;
  trigger_path: string;
  alert_fired: boolean;
}

export interface AlertTrace {
  alert_id: string;
  model_id: string;
  timestamp: string;
  entity_context: Record<string, string>;
  calculation_scores: Array<{
    calc_id: string;
    score: number;
    raw_value: number;
    strictness: string;
    threshold_passed: boolean;
  }>;
  accumulated_score: number;
  score_threshold: number;
  trigger_path: string;
  alert_fired: boolean;
}

interface AlertState {
  alerts: AlertSummary[];
  selectedAlert: AlertTrace | null;
  loading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  fetchAlert: (alertId: string) => Promise<void>;
  generateAlerts: (modelId?: string) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  selectedAlert: null,
  loading: false,
  error: null,

  fetchAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<AlertSummary[]>("/alerts");
      set({ alerts: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchAlert: async (alertId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<AlertTrace>(`/alerts/${alertId}`);
      set({ selectedAlert: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  generateAlerts: async (modelId?: string) => {
    set({ loading: true, error: null });
    try {
      const path = modelId
        ? `/alerts/generate/${modelId}`
        : "/alerts/generate";
      await api.post(path);
      // Refresh alert list after generation
      const data = await api.get<AlertSummary[]>("/alerts");
      set({ alerts: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
