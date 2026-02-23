import { usePipelineStore } from "../../stores/pipelineStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import PipelineDAG from "./PipelineDAG.tsx";

export default function PipelineMonitor() {
  const { steps, running, error, runPipeline } = usePipelineStore();

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pipeline Monitor</h2>
        <button
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

      {/* DAG visualization */}
      <Panel title="Execution Graph" className="flex-1 min-h-[300px]" noPadding>
        <PipelineDAG steps={steps} />
      </Panel>

      {/* Step table */}
      {steps.length > 0 && (
        <Panel title="Steps" className="max-h-48">
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
                  <td className="py-1 text-muted">{s.layer}</td>
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
