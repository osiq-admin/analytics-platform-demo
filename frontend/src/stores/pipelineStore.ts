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

export interface MetricsData {
  executionTimeSeries: { timestamp: string; value: number }[];
  completenessSeries: { timestamp: string; value: number }[];
  validitySeries: { timestamp: string; value: number }[];
  sla: { metric_id: string; status: string; current_value: number; threshold: number }[];
}

export interface PipelineEvent {
  event_type: string;
  entity: string;
  timestamp: string;
  severity: string;
  details: string | Record<string, unknown>;
  message: string;
  duration_ms?: number;
}

export interface LineageRun {
  run_id: string;
  job_name: string;
  job_namespace: string;
  event_type: string;
  event_time: string;
  duration_ms: number;
  record_count: number;
  inputs: { namespace: string; name: string; facets: Record<string, unknown> }[];
  outputs: { namespace: string; name: string; facets: Record<string, unknown> }[];
  column_lineage: { input_field: string; output_field: string; transformation: string }[];
  quality_scores: Record<string, number>;
  parent_run_id: string;
}

interface PipelineState {
  steps: PipelineStep[];
  running: boolean;
  error: string | null;
  stages: MedallionStage[];
  stageResult: StageRunResult | null;
  stageRunning: boolean;
  metrics: MetricsData | null;
  events: PipelineEvent[];
  runs: LineageRun[];
  runPipeline: () => Promise<void>;
  runCalculation: (calcId: string) => Promise<void>;
  fetchStages: () => Promise<void>;
  runStage: (stageId: string) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchRuns: () => Promise<void>;
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
    metrics: null,
    events: [],
    runs: [],

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

    fetchMetrics: async () => {
      try {
        const [execSeries, completeSeries, validSeries, slaData] = await Promise.all([
          api.get<{ metric_id: string; points: { timestamp: string; value: number }[] }>("/metrics/series/pipeline_execution_time").catch(() => null),
          api.get<{ metric_id: string; points: { timestamp: string; value: number }[] }>("/metrics/series/quality_score_completeness").catch(() => null),
          api.get<{ metric_id: string; points: { timestamp: string; value: number }[] }>("/metrics/series/quality_score_validity").catch(() => null),
          api.get<{ metric_id: string; status: string; current_value: number; threshold: number }[]>("/metrics/sla").catch(() => []),
        ]);
        set({
          metrics: {
            executionTimeSeries: execSeries?.points ?? [],
            completenessSeries: completeSeries?.points ?? [],
            validitySeries: validSeries?.points ?? [],
            sla: Array.isArray(slaData) ? slaData : [],
          },
        });
      } catch {
        set({
          metrics: {
            executionTimeSeries: [],
            completenessSeries: [],
            validitySeries: [],
            sla: [],
          },
        });
      }
    },

    fetchEvents: async () => {
      try {
        const data = await api.get<PipelineEvent[]>("/observability/events?type=pipeline_execution");
        set({ events: Array.isArray(data) ? data.slice(0, 20) : [] });
      } catch {
        set({ events: [] });
      }
    },

    fetchRuns: async () => {
      try {
        const data = await api.get<LineageRun[]>("/lineage/runs");
        set({ runs: Array.isArray(data) ? data : [] });
      } catch {
        set({ runs: [] });
      }
    },
  };
});
