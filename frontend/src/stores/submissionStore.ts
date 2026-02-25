import { create } from "zustand";
import { api } from "../api/client.ts";

export interface ReviewComment {
  author: string;
  timestamp: string;
  content: string;
  type: string;
}

export interface Submission {
  submission_id: string;
  use_case_id: string;
  name: string;
  description: string;
  status: string;
  author: string;
  reviewer: string | null;
  components: Array<Record<string, unknown>>;
  validation_results: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  comments: ReviewComment[];
  tags: string[];
  expected_results: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  implemented_at: string | null;
}

interface SubmissionState {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  fetchSubmissions: () => Promise<void>;
  createSubmission: (data: Record<string, unknown>) => Promise<Submission>;
  updateStatus: (id: string, status: string, reviewer?: string, comment?: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  rerunRecommendations: (id: string) => Promise<void>;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissions: [],
  loading: false,
  error: null,

  fetchSubmissions: async () => {
    try {
      set({ loading: true });
      const data = await api.get<{ submissions: Submission[] }>("/submissions");
      set({ submissions: data.submissions, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createSubmission: async (data) => {
    const result = await api.post<Submission>("/submissions", data);
    const list = await api.get<{ submissions: Submission[] }>("/submissions");
    set({ submissions: list.submissions });
    return result;
  },

  updateStatus: async (id, status, reviewer, comment) => {
    await api.put(`/submissions/${id}/status`, { status, reviewer, comment });
    const data = await api.get<{ submissions: Submission[] }>("/submissions");
    set({ submissions: data.submissions });
  },

  deleteSubmission: async (id) => {
    await api.delete(`/submissions/${id}`);
    const data = await api.get<{ submissions: Submission[] }>("/submissions");
    set({ submissions: data.submissions });
  },

  rerunRecommendations: async (id) => {
    await api.post(`/submissions/${id}/recommend`, {});
    const data = await api.get<{ submissions: Submission[] }>("/submissions");
    set({ submissions: data.submissions });
  },
}));
