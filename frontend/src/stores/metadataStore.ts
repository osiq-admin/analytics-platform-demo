import { create } from "zustand";
import { api } from "../api/client.ts";

export interface FieldDef {
  name: string;
  type: string;
  description?: string;
  is_key?: boolean;
  nullable?: boolean;
  domain_values?: string[] | null;
}

export interface RelationshipDef {
  target_entity: string;
  join_fields: Record<string, string>;
  relationship_type: string;
}

export interface EntityDef {
  entity_id: string;
  name: string;
  description?: string;
  fields: FieldDef[];
  relationships?: RelationshipDef[];
  subtypes?: string[];
}

export interface CalculationDef {
  calc_id: string;
  name: string;
  layer: string;
  description: string;
  inputs: Array<Record<string, unknown>>;
  output: Record<string, unknown>;
  logic: string;
  parameters: Record<string, unknown>;
  display: Record<string, unknown>;
  storage: string;
  value_field: string;
  depends_on: string[];
}

export interface SettingOverride {
  match: Record<string, string>;
  value: unknown;
  priority: number;
}

export interface SettingDef {
  setting_id: string;
  name: string;
  description?: string;
  value_type: string;
  default: unknown;
  match_type?: string;
  overrides?: SettingOverride[];
}

export interface ModelCalculation {
  calc_id: string;
  strictness: "MUST_PASS" | "OPTIONAL";
  threshold_setting?: string | null;
  score_steps_setting?: string | null;
  value_field?: string | null;
}

export interface DetectionModelDef {
  model_id: string;
  name: string;
  description: string;
  time_window?: string;
  granularity?: string[];
  calculations: ModelCalculation[];
  score_threshold_setting?: string;
  context_fields?: string[];
  query?: string;
  alert_template?: Record<string, unknown>;
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
  saveDetectionModel: (model: Record<string, unknown>) => Promise<void>;
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

  saveDetectionModel: async (model) => {
    await api.post("/metadata/detection-models", model);
    // Refresh the list
    const data = await api.get<DetectionModelDef[]>("/metadata/detection-models");
    set({ detectionModels: data });
  },
}));
