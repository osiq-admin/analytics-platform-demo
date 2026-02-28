import { useEffect } from "react";
import { usePipelineStore } from "../../stores/pipelineStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import PipelineDAG from "./PipelineDAG.tsx";
import { formatLabel } from "../../utils/format.ts";

export default function PipelineMonitor() {
  const { steps, running, error, runPipeline, stages, stageResult, stageRunning, fetchStages, runStage } = usePipelineStore();

  useEffect(() => { void fetchStages(); }, [fetchStages]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pipeline Monitor</h2>
        <button
          data-tour="pipeline-run"
          data-trace="pipeline.run-button"
          onClick={() => { void runPipeline(); }}
          disabled={running}
          className="px-3 py-1.5 text-xs rounded border border-accent text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
        >
          {running ? (
            <span className="flex items-center gap-1">
              <LoadingSpinner size="sm" /> Running...
            </span>
          ) : (
            "Run Pipeline"
          )}
        </button>
      </div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Medallion pipeline stages */}
      {stages.length > 0 && (
        <Panel title="Pipeline Stages" dataTour="pipeline-stages" dataTrace="pipeline.medallion-stages" tooltip="Medallion pipeline stages from metadata">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {stages.map((s, i) => (
              <div key={s.stage_id} className="flex items-center gap-2">
                {i > 0 && (
                  <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <button
                  onClick={() => { void runStage(s.stage_id); }}
                  disabled={stageRunning}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors whitespace-nowrap ${
                    stageResult?.stage_id === s.stage_id
                      ? stageResult.status === "completed"
                        ? "border-green-500 text-green-400 bg-green-500/10"
                        : "border-red-500 text-red-400 bg-red-500/10"
                      : "border-border text-muted hover:border-blue-500 hover:text-blue-400"
                  }`}
                  title={`Run ${s.name}`}
                >
                  {s.name}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Contract validation results */}
      {stageResult?.contract_validation && (
        <Panel title={`Contract Validation — ${stageResult.stage_id}`} dataTrace="pipeline.contract-validation">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageResult.contract_validation.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {stageResult.contract_validation.passed ? "PASSED" : "FAILED"}
            </span>
            <span className="text-xs text-muted">
              Quality Score: {stageResult.contract_validation.quality_score}%
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-1">Rule</th>
                <th className="pb-1">Field</th>
                <th className="pb-1">Status</th>
                <th className="pb-1">Violations</th>
                <th className="pb-1">Details</th>
              </tr>
            </thead>
            <tbody>
              {stageResult.contract_validation.rule_results.map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1">{r.rule}</td>
                  <td className="py-1 font-mono">{r.field}</td>
                  <td className="py-1">
                    <span className={r.passed ? "text-green-400" : "text-red-400"}>
                      {r.passed ? "pass" : "fail"}
                    </span>
                  </td>
                  <td className="py-1 font-mono">{r.violation_count}</td>
                  <td className="py-1 text-muted">{r.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* DAG visualization */}
      <Panel title="Execution Graph" className="h-[350px] shrink-0" noPadding dataTour="pipeline-dag" tooltip="DAG visualization of calculation execution order" dataTrace="pipeline.execution-dag">
        <PipelineDAG steps={steps} />
      </Panel>

      {/* Step table */}
      {steps.length > 0 && (
        <Panel title="Steps" className="flex-1 overflow-y-auto" dataTrace="pipeline.steps-table">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-1">Calculation</th>
                <th className="pb-1">Layer</th>
                <th className="pb-1">Status</th>
                <th className="pb-1">Duration</th>
                <th className="pb-1">Rows</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.calc_id} className="border-b border-border/50">
                  <td className="py-1">{s.name}</td>
                  <td className="py-1 text-muted">{formatLabel(s.layer)}</td>
                  <td className="py-1">
                    <span
                      className={
                        s.status === "done"
                          ? "text-success"
                          : s.status === "error"
                            ? "text-destructive"
                            : s.status === "running"
                              ? "text-warning"
                              : "text-muted"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-1 font-mono">
                    {s.duration_ms != null ? `${s.duration_ms}ms` : "-"}
                  </td>
                  <td className="py-1 font-mono">
                    {s.row_count != null ? s.row_count : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
