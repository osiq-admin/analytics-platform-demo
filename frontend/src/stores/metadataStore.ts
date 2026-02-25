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

export interface LayerInfo {
  is_oob: boolean;
  has_override: boolean;
  oob_version: string | null;
  layer: string;
}

export interface EntityDef {
  entity_id: string;
  name: string;
  description?: string;
  fields: FieldDef[];
  relationships?: RelationshipDef[];
  subtypes?: string[];
  metadata_layer?: string;
  _layer?: LayerInfo;
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
  regulatory_tags: string[];
  metadata_layer?: string;
  _layer?: LayerInfo;
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
  metadata_layer?: string;
  _layer?: LayerInfo;
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
  regulatory_coverage?: RegulatoryCoverage[];
  metadata_layer?: string;
  _layer?: LayerInfo;
}

export interface RegulatoryCoverage {
  regulation: string;
  article: string;
  description?: string;
}

export interface MatchPatternDef {
  pattern_id: string;
  label: string;
  description: string;
  match: Record<string, string>;
  usage_count: number;
  layer: string;
  created_at: string;
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
  saveEntity: (entity: EntityDef) => Promise<void>;
  deleteEntity: (entityId: string) => Promise<void>;
  saveCalculation: (calc: CalculationDef) => Promise<void>;
  deleteCalculation: (calcId: string) => Promise<void>;
  saveSetting: (setting: SettingDef) => Promise<void>;
  deleteSetting: (settingId: string) => Promise<void>;
  updateDetectionModel: (model: Record<string, unknown>) => Promise<void>;
  deleteDetectionModel: (modelId: string) => Promise<void>;
  getCalculationDependents: (calcId: string) => Promise<{ calculations: string[]; detection_models: string[] }>;
  getSettingDependents: (settingId: string) => Promise<{ calculations: string[]; detection_models: string[] }>;
  fetchOobManifest: () => Promise<Record<string, unknown>>;
  getLayerInfo: (type: string, id: string) => Promise<LayerInfo>;
  resetToOob: (type: string, id: string) => Promise<void>;
  getDiff: (type: string, id: string) => Promise<{ has_diff: boolean; changes: Array<Record<string, unknown>> }>;
  matchPatterns: MatchPatternDef[];
  fetchMatchPatterns: () => Promise<void>;
  saveMatchPattern: (pattern: MatchPatternDef) => Promise<void>;
  deleteMatchPattern: (patternId: string) => Promise<void>;
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
    const data = await api.get<DetectionModelDef[]>("/metadata/detection-models");
    set({ detectionModels: data });
  },

  saveEntity: async (entity) => {
    await api.put(`/metadata/entities/${entity.entity_id}`, entity);
    const data = await api.get<EntityDef[]>("/metadata/entities");
    set({ entities: data });
  },

  deleteEntity: async (entityId) => {
    await api.delete(`/metadata/entities/${entityId}`);
    const data = await api.get<EntityDef[]>("/metadata/entities");
    set({ entities: data });
  },

  saveCalculation: async (calc) => {
    await api.put(`/metadata/calculations/${calc.calc_id}`, calc);
    const data = await api.get<CalculationDef[]>("/metadata/calculations");
    set({ calculations: data });
  },

  deleteCalculation: async (calcId) => {
    await api.delete(`/metadata/calculations/${calcId}`);
    const data = await api.get<CalculationDef[]>("/metadata/calculations");
    set({ calculations: data });
  },

  saveSetting: async (setting) => {
    await api.put(`/metadata/settings/${setting.setting_id}`, setting);
    const data = await api.get<SettingDef[]>("/metadata/settings");
    set({ settings: data });
  },

  deleteSetting: async (settingId) => {
    await api.delete(`/metadata/settings/${settingId}`);
    const data = await api.get<SettingDef[]>("/metadata/settings");
    set({ settings: data });
  },

  updateDetectionModel: async (model) => {
    const modelId = model.model_id as string;
    await api.put(`/metadata/detection-models/${modelId}`, model);
    const data = await api.get<DetectionModelDef[]>("/metadata/detection-models");
    set({ detectionModels: data });
  },

  deleteDetectionModel: async (modelId) => {
    await api.delete(`/metadata/detection-models/${modelId}`);
    const data = await api.get<DetectionModelDef[]>("/metadata/detection-models");
    set({ detectionModels: data });
  },

  getCalculationDependents: async (calcId) => {
    return api.get<{ calculations: string[]; detection_models: string[] }>(
      `/metadata/calculations/${calcId}/dependents`
    );
  },

  getSettingDependents: async (settingId) => {
    return api.get<{ calculations: string[]; detection_models: string[] }>(
      `/metadata/settings/${settingId}/dependents`
    );
  },

  fetchOobManifest: async () => {
    return api.get<Record<string, unknown>>("/metadata/oob-manifest");
  },

  getLayerInfo: async (type, id) => {
    return api.get<LayerInfo>(`/metadata/layers/${type}/${id}/info`);
  },

  resetToOob: async (type, id) => {
    await api.post(`/metadata/layers/${type}/${id}/reset`, {});
  },

  getDiff: async (type, id) => {
    return api.get<{ has_diff: boolean; changes: Array<Record<string, unknown>> }>(
      `/metadata/layers/${type}/${id}/diff`
    );
  },

  matchPatterns: [],

  fetchMatchPatterns: async () => {
    try {
      const data = await api.get<{ patterns: MatchPatternDef[] }>("/metadata/match-patterns");
      set({ matchPatterns: data.patterns });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveMatchPattern: async (pattern) => {
    await api.put(`/metadata/match-patterns/${pattern.pattern_id}`, pattern);
    const data = await api.get<{ patterns: MatchPatternDef[] }>("/metadata/match-patterns");
    set({ matchPatterns: data.patterns });
  },

  deleteMatchPattern: async (patternId) => {
    await api.delete(`/metadata/match-patterns/${patternId}`);
    const data = await api.get<{ patterns: MatchPatternDef[] }>("/metadata/match-patterns");
    set({ matchPatterns: data.patterns });
  },
}));
