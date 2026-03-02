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
  description?: string;
  covered?: boolean;
  layer?: string;
}

export interface TraceabilityEdge {
  source: string;
  target: string;
  type: "contains" | "detected_by" | "uses_calc";
}

/* ---------- Suggestion Types ---------- */

export interface Gap {
  regulation: string;
  article: string;
  title: string;
  description: string;
  suggestion: string;
}

export interface Improvement {
  model_id: string;
  model_name: string;
  current_calc_count: number;
  suggestion: string;
  suggested_calcs: string[];
  impact: string;
}

export interface SuggestionData {
  gaps: Gap[];
  improvements: Improvement[];
  unused_calcs: Array<{
    calc_id: string;
    name: string;
    layer: string;
    regulatory_tags: string[];
  }>;
  summary: {
    gap_count: number;
    improvement_count: number;
    unused_calc_count: number;
    total_suggestions: number;
  };
}

/* ---------- Compliance Matrix Types ---------- */

export interface EvidenceLink {
  type: string;
  path: string;
  description: string;
}

export interface ComplianceControl {
  control_id: string;
  control_name: string;
  description: string;
  platform_capability: string;
  compliance_level: string;
  evidence_links: EvidenceLink[];
  gap_notes?: string | null;
}

export interface ComplianceStandard {
  standard_id: string;
  name: string;
  category: string;
  compliance_level: string;
  controls: ComplianceControl[];
}

export interface ComplianceMatrixSummary {
  total_standards: number;
  total_controls: number;
  full_count: number;
  partial_count: number;
  gap_count: number;
  compliance_percentage: number;
}

export interface ComplianceMatrixData {
  matrix_id: string;
  summary: ComplianceMatrixSummary;
  standards: ComplianceStandard[];
}

export interface BCBS239Principle {
  principle_number: number;
  principle_name: string;
  description: string;
  compliance_level: string;
  platform_capabilities: string[];
  evidence_links: EvidenceLink[];
  gap_notes?: string | null;
}

export interface BCBS239Data {
  mapping_id: string;
  overall_compliance: {
    total_principles: number;
    full_count: number;
    partial_count: number;
    gap_count: number;
    compliance_score: number;
  };
  principles: BCBS239Principle[];
}

/* ---------- State ---------- */

interface RegulatoryState {
  regulations: Regulation[];
  coverage: CoverageSummary | null;
  graphNodes: TraceabilityNode[];
  graphEdges: TraceabilityEdge[];
  suggestions: SuggestionData | null;
  complianceMatrix: ComplianceMatrixData | null;
  bcbs239: BCBS239Data | null;
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  fetchComplianceData: () => Promise<void>;
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
  suggestions: null,
  complianceMatrix: null,
  bcbs239: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [registry, graph, suggestions] = await Promise.all([
        api.get<RegistryResponse>("/metadata/regulatory/registry"),
        api.get<GraphResponse>("/metadata/regulatory/traceability-graph"),
        api.get<SuggestionData>("/metadata/regulatory/suggestions"),
      ]);
      set({
        regulations: registry.regulations ?? [],
        coverage: graph.summary,
        graphNodes: graph.nodes,
        graphEdges: graph.edges,
        suggestions,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchSuggestions: async () => {
    try {
      const suggestions = await api.get<SuggestionData>(
        "/metadata/regulatory/suggestions"
      );
      set({ suggestions });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchComplianceData: async () => {
    try {
      const [matrix, bcbs] = await Promise.all([
        api.get<ComplianceMatrixData>("/metadata/standards/compliance-matrix"),
        api.get<BCBS239Data>("/metadata/standards/bcbs239"),
      ]);
      set({ complianceMatrix: matrix, bcbs239: bcbs });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
