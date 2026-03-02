import { create } from "zustand";
import { api } from "../api/client.ts";

export interface CaseAnnotation {
  annotation_id: string;
  author: string;
  timestamp: string;
  type: "note" | "disposition" | "escalation" | "evidence";
  content: string;
  metadata: Record<string, unknown>;
}

export interface CaseSLAInfo {
  due_date: string | null;
  sla_hours: number;
  sla_status: "on_track" | "at_risk" | "breached";
}

export interface Case {
  case_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignee: string;
  alert_ids: string[];
  annotations: CaseAnnotation[];
  sla: CaseSLAInfo;
  disposition: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface CaseStats {
  total_cases: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  overdue_sla: number;
  at_risk_sla: number;
  resolution_rate: number;
  archived_cases: number;
  pending_reports: number;
  total_linked_alerts: number;
}

interface CaseState {
  cases: Case[];
  selectedCase: Case | null;
  loading: boolean;
  error: string | null;
  stats: CaseStats | null;
  fetchCases: () => Promise<void>;
  fetchCase: (caseId: string) => Promise<void>;
  createCase: (data: {
    title: string;
    alert_ids: string[];
    priority?: string;
    category?: string;
    description?: string;
  }) => Promise<Case>;
  updateStatus: (caseId: string, status: string) => Promise<void>;
  addAnnotation: (
    caseId: string,
    annotation: { type: string; content: string },
  ) => Promise<void>;
  deleteCase: (caseId: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  selectCase: (c: Case | null) => void;
}

export const useCaseStore = create<CaseState>((set) => ({
  cases: [],
  selectedCase: null,
  loading: false,
  error: null,
  stats: null,

  fetchCases: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ cases: Case[] }>("/cases");
      set({ cases: data.cases, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchCase: async (caseId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<Case>(`/cases/${caseId}`);
      set({ selectedCase: data, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createCase: async (data) => {
    const created = await api.post<Case>("/cases", data);
    const list = await api.get<{ cases: Case[] }>("/cases");
    set({ cases: list.cases });
    return created;
  },

  updateStatus: async (caseId, status) => {
    await api.put(`/cases/${caseId}/status`, { status });
    const list = await api.get<{ cases: Case[] }>("/cases");
    set((s) => {
      const updated = list.cases.find((c) => c.case_id === caseId);
      return {
        cases: list.cases,
        selectedCase:
          s.selectedCase?.case_id === caseId
            ? (updated ?? s.selectedCase)
            : s.selectedCase,
      };
    });
  },

  addAnnotation: async (caseId, annotation) => {
    await api.post(`/cases/${caseId}/annotate`, annotation);
    const list = await api.get<{ cases: Case[] }>("/cases");
    set((s) => {
      const updated = list.cases.find((c) => c.case_id === caseId);
      return {
        cases: list.cases,
        selectedCase:
          s.selectedCase?.case_id === caseId
            ? (updated ?? s.selectedCase)
            : s.selectedCase,
      };
    });
  },

  deleteCase: async (caseId) => {
    await api.delete(`/cases/${caseId}`);
    const list = await api.get<{ cases: Case[] }>("/cases");
    set((s) => ({
      cases: list.cases,
      selectedCase:
        s.selectedCase?.case_id === caseId ? null : s.selectedCase,
    }));
  },

  fetchStats: async () => {
    try {
      const stats = await api.get<CaseStats>("/cases/stats");
      set({ stats });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  selectCase: (c) => set({ selectedCase: c }),
}));
