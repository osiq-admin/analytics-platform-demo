import { create } from "zustand";

// ---------------------------------------------------------------------------
// Tour types (existing)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Scenario types (new — dual-mode tour engine)
// ---------------------------------------------------------------------------

export type TourMode = "watch" | "try";

export type ScenarioAction = "click" | "type" | "select" | "navigate" | "wait";

export type ScenarioCategory =
  | "settings"
  | "calculations"
  | "detection_models"
  | "use_cases"
  | "entities"
  | "investigation"
  | "admin"
  | "pipeline";

export type ScenarioDifficulty = "beginner" | "intermediate" | "advanced";

export interface ScenarioStep extends TourStep {
  /** Auto-action performed in watch mode */
  action?: ScenarioAction;
  /** CSS selector for the action target (may differ from spotlight target) */
  actionTarget?: string;
  /** Value for type/select actions */
  actionValue?: string;
  /** Hint text shown in "try" mode instead of auto-executing */
  hint?: string;
  /** CSS selector that must exist for step to be "complete" in try mode */
  validation?: string;
  /** Form fields to auto-fill in watch mode */
  autoFillData?: Record<string, string>;
  /** Ms delay before auto-advancing in watch mode (default 2500) */
  delay?: number;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  difficulty: ScenarioDifficulty;
  estimatedMinutes: number;
  steps: ScenarioStep[];
  /** Scenario IDs that should be completed first */
  prerequisites?: string[];
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface TourState {
  // --- existing tour fields ---
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

  // --- scenario fields ---
  mode: TourMode;
  activeScenario: string | null;
  scenarioStep: number;
  scenarioDefinitions: Record<string, ScenarioDefinition>;
  completedScenarios: string[];
  isAutoPlaying: boolean;

  setMode: (mode: TourMode) => void;
  startScenario: (id: string) => void;
  nextScenarioStep: () => void;
  prevScenarioStep: () => void;
  skipScenario: () => void;
  endScenario: () => void;
  toggleAutoPlay: () => void;
  resetScenario: () => void;
  registerScenarios: (scenarios: Record<string, ScenarioDefinition>) => void;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const loadCompleted = (): string[] => {
  try { return JSON.parse(localStorage.getItem("tours.completed") ?? "[]"); }
  catch { return []; }
};

const loadCompletedScenarios = (): string[] => {
  try { return JSON.parse(localStorage.getItem("scenarios.completed") ?? "[]"); }
  catch { return []; }
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTourStore = create<TourState>((set, get) => ({
  // ---- existing tour state ----
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

  // ---- scenario state ----
  mode: "watch",
  activeScenario: null,
  scenarioStep: 0,
  scenarioDefinitions: {},
  completedScenarios: loadCompletedScenarios(),
  isAutoPlaying: false,

  setMode: (mode) => set({ mode }),

  registerScenarios: (scenarios) =>
    set({ scenarioDefinitions: { ...get().scenarioDefinitions, ...scenarios } }),

  startScenario: (id) => {
    const { scenarioDefinitions } = get();
    if (!scenarioDefinitions[id]) return;
    // End any active tour when starting a scenario
    set({
      activeScenario: id,
      scenarioStep: 0,
      isAutoPlaying: get().mode === "watch",
      activeTour: null,
      currentStep: 0,
    });
  },

  nextScenarioStep: () => {
    const { activeScenario, scenarioStep, scenarioDefinitions } = get();
    if (!activeScenario) return;
    const scenario = scenarioDefinitions[activeScenario];
    if (!scenario) return;
    if (scenarioStep < scenario.steps.length - 1) {
      set({ scenarioStep: scenarioStep + 1 });
    } else {
      get().endScenario();
    }
  },

  prevScenarioStep: () => {
    const { scenarioStep } = get();
    if (scenarioStep > 0) set({ scenarioStep: scenarioStep - 1 });
  },

  skipScenario: () =>
    set({ activeScenario: null, scenarioStep: 0, isAutoPlaying: false }),

  endScenario: () => {
    const { activeScenario, completedScenarios } = get();
    if (activeScenario && !completedScenarios.includes(activeScenario)) {
      const updated = [...completedScenarios, activeScenario];
      localStorage.setItem("scenarios.completed", JSON.stringify(updated));
      set({
        activeScenario: null,
        scenarioStep: 0,
        isAutoPlaying: false,
        completedScenarios: updated,
      });
    } else {
      set({ activeScenario: null, scenarioStep: 0, isAutoPlaying: false });
    }
  },

  toggleAutoPlay: () => set({ isAutoPlaying: !get().isAutoPlaying }),

  resetScenario: () => {
    const { activeScenario } = get();
    if (!activeScenario) return;
    set({ scenarioStep: 0, isAutoPlaying: get().mode === "watch" });
  },
}));
