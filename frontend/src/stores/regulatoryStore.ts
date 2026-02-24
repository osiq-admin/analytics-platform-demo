import { create } from "zustand";
import { api } from "../api/client.ts";

/* ---------- Types ---------- */

export interface RegulationArticle {
  id: string;
  article: string;
  title: string;
  description?: string;
  detection_pattern?: string;
}

export interface Regulation {
  id: string;
  name: string;
  full_name: string;
  jurisdiction: string;
  articles: RegulationArticle[];
}

export interface CoverageSummary {
  total_articles: number;
  covered: number;
  uncovered: number;
  coverage_pct: number;
  covered_articles: string[];
  uncovered_articles: string[];
}

export interface TraceabilityNode {
  id: string;
  type: "regulation" | "article" | "detection_model" | "calculation";
  label: string;
  full_name?: string;
  jurisdiction?: string;
  title?: string;
  covered?: boolean;
  layer?: string;
}

export interface TraceabilityEdge {
  source: string;
  target: string;
  type: "contains" | "detected_by" | "uses_calc";
}

/* ---------- State ---------- */

interface RegulatoryState {
  regulations: Regulation[];
  coverage: CoverageSummary | null;
  graphNodes: TraceabilityNode[];
  graphEdges: TraceabilityEdge[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
}

interface RegistryResponse {
  regulations: Regulation[];
}

interface GraphResponse {
  nodes: TraceabilityNode[];
  edges: TraceabilityEdge[];
  summary: CoverageSummary;
}

export const useRegulatoryStore = create<RegulatoryState>((set) => ({
  regulations: [],
  coverage: null,
  graphNodes: [],
  graphEdges: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [registry, graph] = await Promise.all([
        api.get<RegistryResponse>("/metadata/regulatory/registry"),
        api.get<GraphResponse>("/metadata/regulatory/traceability-graph"),
      ]);
      set({
        regulations: registry.regulations ?? [],
        coverage: graph.summary,
        graphNodes: graph.nodes,
        graphEdges: graph.edges,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
