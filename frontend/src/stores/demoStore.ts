import { create } from "zustand";
import { api } from "../api/client.ts";

export interface DemoState {
  current_checkpoint: string;
  checkpoints: string[];
  loading: boolean;
  error: string | null;
  fetchState: () => Promise<void>;
  reset: () => Promise<void>;
  step: () => Promise<void>;
  jumpTo: (checkpoint: string) => Promise<void>;
  skipToEnd: () => Promise<void>;
}

export const useDemoStore = create<DemoState>((set) => ({
  current_checkpoint: "pristine",
  checkpoints: [],
  loading: false,
  error: null,

  fetchState: async () => {
    try {
      const data = await api.get<{
        current_checkpoint: string;
        checkpoints: string[];
      }>("/demo/state");
      set({
        current_checkpoint: data.current_checkpoint,
        checkpoints: data.checkpoints,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  reset: async () => {
    set({ loading: true, error: null });
    try {
      await api.post("/demo/reset");
      const data = await api.get<{
        current_checkpoint: string;
        checkpoints: string[];
      }>("/demo/state");
      set({
        current_checkpoint: data.current_checkpoint,
        checkpoints: data.checkpoints,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  step: async () => {
    set({ loading: true, error: null });
    try {
      await api.post("/demo/step");
      const data = await api.get<{
        current_checkpoint: string;
        checkpoints: string[];
      }>("/demo/state");
      set({
        current_checkpoint: data.current_checkpoint,
        checkpoints: data.checkpoints,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  jumpTo: async (checkpoint: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/demo/jump/${checkpoint}`);
      set({ current_checkpoint: checkpoint, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  skipToEnd: async () => {
    set({ loading: true, error: null });
    try {
      await api.post("/demo/skip-to-end");
      const data = await api.get<{
        current_checkpoint: string;
        checkpoints: string[];
      }>("/demo/state");
      set({
        current_checkpoint: data.current_checkpoint,
        checkpoints: data.checkpoints,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
