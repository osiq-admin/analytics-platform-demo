import { create } from "zustand";
import { api } from "../api/client.ts";

export interface UseCaseComponent {
  type: string;
  id: string;
  action: string;
  config?: Record<string, unknown> | null;
}

export interface UseCase {
  use_case_id: string;
  name: string;
  description: string;
  status: string;
  author: string;
  components: UseCaseComponent[];
  sample_data: Record<string, unknown[]>;
  expected_results: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface UseCaseState {
  useCases: UseCase[];
  loading: boolean;
  error: string | null;
  fetchUseCases: () => Promise<void>;
  saveUseCase: (uc: UseCase) => Promise<void>;
  deleteUseCase: (id: string) => Promise<void>;
  runUseCase: (id: string) => Promise<Record<string, unknown>>;
}

export const useUseCaseStore = create<UseCaseState>((set) => ({
  useCases: [],
  loading: false,
  error: null,

  fetchUseCases: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ use_cases: UseCase[] }>("/use-cases");
      set({ useCases: data.use_cases, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  saveUseCase: async (uc) => {
    await api.put(`/use-cases/${uc.use_case_id}`, uc);
    const data = await api.get<{ use_cases: UseCase[] }>("/use-cases");
    set({ useCases: data.use_cases });
  },

  deleteUseCase: async (id) => {
    await api.delete(`/use-cases/${id}`);
    const data = await api.get<{ use_cases: UseCase[] }>("/use-cases");
    set({ useCases: data.use_cases });
  },

  runUseCase: async (id) => {
    return api.post<Record<string, unknown>>(`/use-cases/${id}/run`, {});
  },
}));
