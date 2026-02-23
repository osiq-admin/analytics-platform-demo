import { create } from "zustand";
import { api } from "../api/client.ts";

export interface EntityDef {
  entity_id: string;
  name: string;
  fields: Array<{ name: string; type: string }>;
}

export interface CalculationDef {
  calc_id: string;
  name: string;
  layer: string;
  description: string;
  depends_on: string[];
}

export interface SettingDef {
  setting_id: string;
  name: string;
  value_type: string;
  default: unknown;
}

export interface DetectionModelDef {
  model_id: string;
  name: string;
  description: string;
  calculations: Array<{
    calc_id: string;
    strictness: string;
  }>;
}

interface MetadataState {
  entities: EntityDef[];
  calculations: CalculationDef[];
  settings: SettingDef[];
  detectionModels: DetectionModelDef[];
  loading: boolean;
  error: string | null;
  fetchEntities: () => Promise<void>;
  fetchCalculations: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchDetectionModels: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useMetadataStore = create<MetadataState>((set) => ({
  entities: [],
  calculations: [],
  settings: [],
  detectionModels: [],
  loading: false,
  error: null,

  fetchEntities: async () => {
    try {
      const data = await api.get<EntityDef[]>("/metadata/entities");
      set({ entities: data });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchCalculations: async () => {
    try {
      const data = await api.get<CalculationDef[]>("/metadata/calculations");
      set({ calculations: data });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchSettings: async () => {
    try {
      const data = await api.get<SettingDef[]>("/metadata/settings");
      set({ settings: data });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchDetectionModels: async () => {
    try {
      const data = await api.get<DetectionModelDef[]>(
        "/metadata/detection-models"
      );
      set({ detectionModels: data });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [entities, calculations, settings, detectionModels] =
        await Promise.all([
          api.get<EntityDef[]>("/metadata/entities"),
          api.get<CalculationDef[]>("/metadata/calculations"),
          api.get<SettingDef[]>("/metadata/settings"),
          api.get<DetectionModelDef[]>("/metadata/detection-models"),
        ]);
      set({
        entities,
        calculations,
        settings,
        detectionModels,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
