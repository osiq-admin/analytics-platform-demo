import { create } from "zustand";
import { api } from "../api/client.ts";
import { pipelineWs } from "../api/websocket.ts";

export interface PipelineStep {
  calc_id: string;
  name: string;
  layer: string;
  status: "pending" | "running" | "done" | "error";
  duration_ms?: number;
  row_count?: number;
  error?: string;
  depends_on?: string[];
}

export interface MedallionStage {
  stage_id: string;
  name: string;
  tier_from: string | null;
  tier_to: string;
  order: number;
  depends_on: string[];
  entities: string[];
  transformation_id: string;
  contract_id: string;
}

export interface StageRunResult {
  stage_id: string;
  status: string;
  duration_ms: number;
  steps: { step: string; status: string; rows?: number; alerts?: number; fired?: number; error?: string }[];
  contract_validation: {
    passed: boolean;
    quality_score: number;
    rule_results: { rule: string; field: string; passed: boolean; violation_count: number; details: string }[];
  } | null;
  error: string;
}

interface PipelineState {
  steps: PipelineStep[];
  running: boolean;
  error: string | null;
  stages: MedallionStage[];
  stageResult: StageRunResult | null;
  stageRunning: boolean;
  runPipeline: () => Promise<void>;
  runCalculation: (calcId: string) => Promise<void>;
  fetchStages: () => Promise<void>;
  runStage: (stageId: string) => Promise<void>;
}

export const usePipelineStore = create<PipelineState>((set, get) => {
  // Listen for WebSocket progress updates
  pipelineWs.onMessage((data) => {
    const msg = data as { type: string; calc_id?: string; status?: string; duration_ms?: number; row_count?: number; error?: string };
    if (msg.type === "calc_progress" && msg.calc_id) {
      set({
        steps: get().steps.map((s) =>
          s.calc_id === msg.calc_id
            ? {
                ...s,
                status: (msg.status ?? s.status) as PipelineStep["status"],
                duration_ms: msg.duration_ms ?? s.duration_ms,
                row_count: msg.row_count ?? s.row_count,
                error: msg.error ?? s.error,
              }
            : s
        ),
      });
    }
    if (msg.type === "pipeline_done") {
      set({ running: false });
    }
  });

  return {
    steps: [],
    running: false,
    error: null,
    stages: [],
    stageResult: null,
    stageRunning: false,

    runPipeline: async () => {
      set({ running: true, error: null });
      try {
        pipelineWs.connect();
        const data = await api.post<{ steps: PipelineStep[] }>(
          "/pipeline/run"
        );
        set({ steps: data.steps });
      } catch (e) {
        set({ error: String(e), running: false });
      }
    },

    runCalculation: async (calcId: string) => {
      set({ running: true, error: null });
      try {
        pipelineWs.connect();
        await api.post(`/pipeline/run/${calcId}`);
      } catch (e) {
        set({ error: String(e), running: false });
      }
    },

    fetchStages: async () => {
      try {
        const data = await api.get<MedallionStage[]>("/pipeline/stages");
        set({ stages: data });
      } catch (e) {
        set({ error: String(e) });
      }
    },

    runStage: async (stageId: string) => {
      set({ stageRunning: true, stageResult: null, error: null });
      try {
        const result = await api.post<StageRunResult>(
          `/pipeline/stages/${stageId}/run`
        );
        set({ stageResult: result, stageRunning: false });
      } catch (e) {
        set({ error: String(e), stageRunning: false });
      }
    },
  };
});
