import { create } from "zustand";
import { api } from "../api/client.ts";

/* ---------- Types ---------- */

export interface TechnicalMapping {
  entity: string;
  field: string;
  relationship: string;
  description: string;
}

export interface ISO11179Element {
  object_class: string;
  property: string;
  representation: string;
  data_element_concept: string;
  naming_convention: string;
}

export interface FIBOAlignment {
  fibo_class: string;
  fibo_namespace: string;
  fibo_description: string;
}

export interface GlossaryTerm {
  term_id: string;
  business_name: string;
  definition: string;
  category: string;
  domain: string;
  status: string;
  owner: string;
  steward: string;
  synonyms: string[];
  related_terms: string[];
  regulatory_references: string[];
  technical_mappings: TechnicalMapping[];
  iso_11179: ISO11179Element;
  fibo_alignment: FIBOAlignment;
  bcbs239_principle: string;
  created_date: string;
  last_updated: string;
}

export interface GlossaryCategory {
  category_id: string;
  display_name: string;
  description: string;
  icon: string;
  order: number;
  term_count: number;
}

export interface SemanticMetric {
  metric_id: string;
  business_name: string;
  definition: string;
  formula: string;
  source_tier: string;
  source_entities: string[];
  unit: string;
  format: string;
  dimensions: string[];
  owner: string;
  glossary_term_id: string;
  bcbs239_principle: string;
}

export interface SemanticDimension {
  dimension_id: string;
  business_name: string;
  definition: string;
  source_entity: string;
  source_field: string;
  values: string[];
  glossary_term_id: string;
}

export interface DMBOKArea {
  area_id: string;
  name: string;
  description: string;
  coverage: string;
  platform_capabilities: string[];
  implementing_phases: number[];
  implementing_views: string[];
}

export interface ComplianceStandard {
  standard_id: string;
  name: string;
  full_name: string;
  category: string;
  compliance_level: string;
  fields_mapped?: string[];
  regulatory_drivers?: string[];
  implementing_phases?: number[];
  notes?: string;
  gap_description?: string;
  suggested_phase?: string;
}

export interface EntityGap {
  entity_id: string;
  current_field_count: number;
  gaps: {
    field_name: string;
    type: string;
    standard: string;
    regulatory_need: string;
    priority: string;
    glossary_term_id: string;
  }[];
}

/* ---------- State ---------- */

interface GlossaryState {
  terms: GlossaryTerm[];
  categories: GlossaryCategory[];
  metrics: SemanticMetric[];
  dimensions: SemanticDimension[];
  dmbok: DMBOKArea[];
  standards: ComplianceStandard[];
  gapStandards: ComplianceStandard[];
  entityGaps: EntityGap[];
  loading: boolean;
  error: string | null;
  fetchTerms: (category?: string, search?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchMetrics: (tier?: string) => Promise<void>;
  fetchDimensions: () => Promise<void>;
  fetchDMBOK: () => Promise<void>;
  fetchStandards: () => Promise<void>;
  fetchEntityGaps: () => Promise<void>;
}

export const useGlossaryStore = create<GlossaryState>((set) => ({
  terms: [],
  categories: [],
  metrics: [],
  dimensions: [],
  dmbok: [],
  standards: [],
  gapStandards: [],
  entityGaps: [],
  loading: false,
  error: null,

  fetchTerms: async (category?: string, search?: string) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const qs = params.toString();
      const data = await api.get<{ terms: GlossaryTerm[] }>(
        `/glossary/terms${qs ? `?${qs}` : ""}`
      );
      set({ terms: data.terms ?? [], loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const data = await api.get<{ categories: GlossaryCategory[] }>("/glossary/categories");
      set({ categories: data.categories ?? [] });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchMetrics: async (tier?: string) => {
    set({ loading: true, error: null });
    try {
      const qs = tier ? `?tier=${tier}` : "";
      const data = await api.get<{ metrics: SemanticMetric[] }>(`/glossary/metrics${qs}`);
      set({ metrics: data.metrics ?? [], loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchDimensions: async () => {
    try {
      const data = await api.get<{ dimensions: SemanticDimension[] }>("/glossary/dimensions");
      set({ dimensions: data.dimensions ?? [] });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchDMBOK: async () => {
    try {
      const data = await api.get<{ knowledge_areas: DMBOKArea[] }>("/glossary/dmbok");
      set({ dmbok: data.knowledge_areas ?? [] });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchStandards: async () => {
    try {
      const data = await api.get<{
        standards: ComplianceStandard[];
        gap_standards: ComplianceStandard[];
      }>("/glossary/standards");
      set({
        standards: data.standards ?? [],
        gapStandards: data.gap_standards ?? [],
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchEntityGaps: async () => {
    try {
      const data = await api.get<{ entities: EntityGap[] }>("/glossary/entity-gaps");
      set({ entityGaps: data.entities ?? [] });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
