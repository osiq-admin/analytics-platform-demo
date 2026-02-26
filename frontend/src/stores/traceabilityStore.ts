import { create } from "zustand";

interface TraceabilityState {
  isActive: boolean;
  activeTraceId: string | null;
  toggle: () => void;
  openTrace: (sectionId: string) => void;
  closeTrace: () => void;
}

export const useTraceabilityStore = create<TraceabilityState>((set) => ({
  isActive: (() => {
    try {
      return localStorage.getItem("traceability.active") === "true";
    } catch {
      return false;
    }
  })(),
  activeTraceId: null,
  toggle: () =>
    set((s) => {
      const next = !s.isActive;
      localStorage.setItem("traceability.active", String(next));
      return { isActive: next, activeTraceId: null };
    }),
  openTrace: (sectionId) => set({ activeTraceId: sectionId }),
  closeTrace: () => set({ activeTraceId: null }),
}));
