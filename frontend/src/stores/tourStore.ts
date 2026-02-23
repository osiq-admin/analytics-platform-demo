import { create } from "zustand";

export interface TourStep {
  target: string;       // CSS selector
  title: string;
  content: string;
  placement?: string;
  route?: string;       // navigate to this route before showing step
}

export interface TourDefinition {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
}

interface TourState {
  activeTour: string | null;
  currentStep: number;
  completedTours: string[];
  definitions: Record<string, TourDefinition>;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  registerTours: (tours: Record<string, TourDefinition>) => void;
}

const loadCompleted = (): string[] => {
  try { return JSON.parse(localStorage.getItem("tours.completed") ?? "[]"); }
  catch { return []; }
};

export const useTourStore = create<TourState>((set, get) => ({
  activeTour: null,
  currentStep: 0,
  completedTours: loadCompleted(),
  definitions: {},

  registerTours: (tours) => set({ definitions: { ...get().definitions, ...tours } }),

  startTour: (tourId) => set({ activeTour: tourId, currentStep: 0 }),

  nextStep: () => {
    const { activeTour, currentStep, definitions } = get();
    if (!activeTour) return;
    const tour = definitions[activeTour];
    if (currentStep < tour.steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().endTour();
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) set({ currentStep: currentStep - 1 });
  },

  skipTour: () => set({ activeTour: null, currentStep: 0 }),

  endTour: () => {
    const { activeTour, completedTours } = get();
    if (activeTour && !completedTours.includes(activeTour)) {
      const updated = [...completedTours, activeTour];
      localStorage.setItem("tours.completed", JSON.stringify(updated));
      set({ activeTour: null, currentStep: 0, completedTours: updated });
    } else {
      set({ activeTour: null, currentStep: 0 });
    }
  },
}));
