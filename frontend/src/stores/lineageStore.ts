import { create } from "zustand";
import { api } from "../api/client.ts";

// ─── Types ───

export type LineageTab = "explorer" | "field-tracing" | "impact-analysis";

export interface QualityOverlayData {
  overall_score: number;
  dimensions: Record<string, number>;
  sla_status: "met" | "warning" | "breach";
  sla_actual: string;
  record_count: number;
  last_updated: string;
}

export interface LineageNode {
  id: string;
  label: string;
  node_type: string;
  tier: string;
  entity: string;
  quality: QualityOverlayData | null;
  data_steward: string;
  data_owner: string;
  version_hash: string;
  regulatory_tags: string[];
  metadata: Record<string, unknown>;
}

export interface LineageEdge {
  source: string;
  target: string;
  edge_type: string;
  weight: "hard" | "soft";
  label: string;
  metadata: Record<string, unknown>;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layers: string[];
  total_nodes: number;
  total_edges: number;
}

export interface FieldTrace {
  entity: string;
  field: string;
  chain: { tier: string; field_name: string; transform: string; expression: string; data_type: string; quality_score: number }[];
  regulatory_tags: string[];
}

export interface ImpactAnalysis {
  origin: LineageNode;
  direction: string;
  affected_nodes: LineageNode[];
  affected_edges: LineageEdge[];
  impact_summary: Record<string, number>;
  hard_impact_count: number;
  soft_impact_count: number;
  regulatory_impact: string[];
}

export interface SettingsImpactPreview {
  setting_id: string;
  parameter: string;
  current_value: number;
  proposed_value: number;
  current_alert_count: number;
  projected_alert_count: number;
  delta: number;
  affected_models: string[];
  affected_products: string[];
}

export interface CoverageCell {
  product_id: string;
  abuse_type: string;
  covered: boolean;
  model_ids: string[];
  alert_count: number;
  regulations: string[];
}

export interface SurveillanceCoverage {
  products: { id: string; name: string; asset_class: string; isin: string }[];
  abuse_types: string[];
  cells: CoverageCell[];
  coverage_pct: number;
  regulatory_gaps: { regulation: string; gap_description: string }[];
}

// ─── Store ───

interface LineageState {
  // Unified graph
  unifiedGraph: LineageGraph | null;
  tierGraph: LineageGraph | null;
  selectedEntity: string;
  selectedEntities: string[];
  selectedNode: string | null;
  selectedEdge: string | null;

  // Field lineage
  fieldTraces: FieldTrace[];
  selectedField: string | null;

  // Impact analysis + what-if
  impactResult: ImpactAnalysis | null;
  impactDirection: "upstream" | "downstream" | "both";
  settingsPreview: SettingsImpactPreview | null;

  // Surveillance coverage
  coverage: SurveillanceCoverage | null;

  // Alert explainability
  alertLineage: LineageGraph | null;
  selectedAlertId: string | null;

  // Quality overlay
  qualityOverlay: Record<string, QualityOverlayData>;

  // UI state
  activeTab: LineageTab;
  activeLayers: string[];
  showRegulatoryOverlay: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  fetchUnifiedGraph: (entities?: string[], layers?: string[]) => Promise<void>;
  fetchTierLineage: (entity: string) => Promise<void>;
  fetchFieldLineage: (entity: string) => Promise<void>;
  traceField: (entity: string, field: string) => Promise<void>;
  fetchImpact: (nodeId: string, direction: string) => Promise<void>;
  fetchAlertLineage: (alertId: string) => Promise<void>;
  fetchCoverage: () => Promise<void>;
  previewThresholdChange: (settingId: string, param: string, value: number) => Promise<void>;
  fetchQualityOverlay: (entity: string) => Promise<void>;
  setActiveTab: (tab: LineageTab) => void;
  setSelectedEntity: (entity: string) => void;
  setSelectedEntities: (entities: string[]) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setSelectedField: (field: string | null) => void;
  setImpactDirection: (dir: "upstream" | "downstream" | "both") => void;
  toggleLayer: (layer: string) => void;
  toggleRegulatoryOverlay: () => void;
}

const ALL_LAYERS = ["tier_flow", "field_mapping", "calc_chain", "entity_fk", "setting_impact", "regulatory_req"];

export const useLineageStore = create<LineageState>((set, get) => ({
  unifiedGraph: null,
  tierGraph: null,
  selectedEntity: "execution",
  selectedEntities: ["execution"],
  selectedNode: null,
  selectedEdge: null,
  fieldTraces: [],
  selectedField: null,
  impactResult: null,
  impactDirection: "both",
  settingsPreview: null,
  coverage: null,
  alertLineage: null,
  selectedAlertId: null,
  qualityOverlay: {},
  activeTab: "explorer",
  activeLayers: ["tier_flow", "calc_chain"],
  showRegulatoryOverlay: false,
  loading: false,
  error: null,

  fetchUnifiedGraph: async (entities, layers) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      (entities ?? get().selectedEntities).forEach((e) => params.append("entities", e));
      (layers ?? get().activeLayers).forEach((l) => params.append("layers", l));
      const data = await api.get<LineageGraph>(`/lineage/graph?${params}`);
      set({ unifiedGraph: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchTierLineage: async (entity) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<LineageGraph>(`/lineage/tiers/${entity}`);
      set({ tierGraph: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchFieldLineage: async (entity) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<FieldTrace[]>(`/lineage/fields/${entity}`);
      set({ fieldTraces: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  traceField: async (entity, field) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<FieldTrace>(`/lineage/fields/${entity}/${field}`);
      set({ fieldTraces: [data], selectedField: field, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchImpact: async (nodeId, direction) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<ImpactAnalysis>(`/lineage/impact/${encodeURIComponent(nodeId)}?direction=${direction}`);
      set({ impactResult: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchAlertLineage: async (alertId) => {
    set({ loading: true, error: null, selectedAlertId: alertId });
    try {
      const data = await api.get<LineageGraph>(`/lineage/alert/${alertId}`);
      set({ alertLineage: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchCoverage: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<SurveillanceCoverage>("/lineage/coverage");
      set({ coverage: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  previewThresholdChange: async (settingId, param, value) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post<SettingsImpactPreview>("/lineage/settings/preview", {
        setting_id: settingId,
        parameter: param,
        proposed_value: value,
      });
      set({ settingsPreview: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchQualityOverlay: async (entity) => {
    try {
      const data = await api.get<Record<string, QualityOverlayData>>(`/lineage/tiers/${entity}/quality`);
      set((s) => ({ qualityOverlay: { ...s.qualityOverlay, ...data } }));
    } catch {
      // Non-critical
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setSelectedEntities: (entities) => set({ selectedEntities: entities }),
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
  setSelectedEdge: (edgeId) => set({ selectedEdge: edgeId }),
  setSelectedField: (field) => set({ selectedField: field }),
  setImpactDirection: (dir) => set({ impactDirection: dir }),

  toggleLayer: (layer) =>
    set((s) => ({
      activeLayers: s.activeLayers.includes(layer)
        ? s.activeLayers.filter((l) => l !== layer)
        : [...s.activeLayers, layer],
    })),

  toggleRegulatoryOverlay: () => set((s) => ({ showRegulatoryOverlay: !s.showRegulatoryOverlay })),
}));

export { ALL_LAYERS };
