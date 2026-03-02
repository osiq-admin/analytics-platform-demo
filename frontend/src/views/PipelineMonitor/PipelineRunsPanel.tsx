import { useEffect, useState } from "react";
import { usePipelineStore } from "../../stores/pipelineStore.ts";
import { formatTimestamp } from "../../utils/format.ts";

const EVENT_TYPE_BADGE: Record<string, string> = {
  START: "bg-blue-500/20 text-blue-400",
  COMPLETE: "bg-green-500/20 text-green-400",
  FAIL: "bg-red-500/20 text-red-400",
};

export default function PipelineRunsPanel() {
  const runs = usePipelineStore((s) => s.runs);
  const fetchRuns = usePipelineStore((s) => s.fetchRuns);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  if (!runs || runs.length === 0) {
    return (
      <div className="text-xs text-muted py-4 text-center">
        No pipeline runs recorded
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[500px]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted border-b border-border">
            <th className="pb-1 pr-2">Run ID</th>
            <th className="pb-1 pr-2">Job</th>
            <th className="pb-1 pr-2">Type</th>
            <th className="pb-1 pr-2">Time</th>
            <th className="pb-1 pr-2">Duration</th>
            <th className="pb-1 pr-2">Records</th>
            <th className="pb-1">Quality</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.run_id;
            return (
              <RunRow
                key={run.run_id}
                run={run}
                isExpanded={isExpanded}
                onToggle={() => setExpandedRunId(isExpanded ? null : run.run_id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface LineageRun {
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

function RunRow({
  run,
  isExpanded,
  onToggle,
}: {
  run: LineageRun;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const truncatedId = run.run_id.length > 12 ? `${run.run_id.slice(0, 12)}...` : run.run_id;
  const qualityKeys = Object.keys(run.quality_scores ?? {});
  const avgQuality = qualityKeys.length > 0
    ? (Object.values(run.quality_scores).reduce((s, v) => s + v, 0) / qualityKeys.length).toFixed(1)
    : null;

  return (
    <>
      <tr
        className="border-b border-border/50 cursor-pointer hover:bg-surface-elevated/50 transition-colors"
        onClick={onToggle}
        title={run.run_id}
      >
        <td className="py-1.5 pr-2 font-mono">{truncatedId}</td>
        <td className="py-1.5 pr-2">{run.job_name}</td>
        <td className="py-1.5 pr-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${EVENT_TYPE_BADGE[run.event_type] ?? "bg-border text-muted"}`}>
            {run.event_type}
          </span>
        </td>
        <td className="py-1.5 pr-2 text-muted whitespace-nowrap">
          {formatTimestamp(run.event_time)}
        </td>
        <td className="py-1.5 pr-2 font-mono">
          {run.duration_ms > 0 ? `${run.duration_ms}ms` : "-"}
        </td>
        <td className="py-1.5 pr-2 font-mono">
          {run.record_count > 0 ? run.record_count : "-"}
        </td>
        <td className="py-1.5">
          {avgQuality != null ? (
            <span className={`font-mono ${Number(avgQuality) >= 95 ? "text-green-400" : Number(avgQuality) >= 80 ? "text-amber-400" : "text-red-400"}`}>
              {avgQuality}%
            </span>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="py-2 px-4 bg-surface">
            <RunDetail run={run} />
          </td>
        </tr>
      )}
    </>
  );
}

function RunDetail({ run }: { run: LineageRun }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Input/Output datasets */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-1">
            Input Datasets ({run.inputs?.length ?? 0})
          </div>
          {(run.inputs ?? []).length > 0 ? (
            <ul className="text-xs space-y-0.5">
              {run.inputs.map((ds, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="font-mono text-foreground/80">
                    {ds.namespace}:{ds.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted">None</span>
          )}
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-1">
            Output Datasets ({run.outputs?.length ?? 0})
          </div>
          {(run.outputs ?? []).length > 0 ? (
            <ul className="text-xs space-y-0.5">
              {run.outputs.map((ds, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="font-mono text-foreground/80">
                    {ds.namespace}:{ds.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted">None</span>
          )}
        </div>
      </div>

      {/* Column lineage count */}
      {(run.column_lineage ?? []).length > 0 && (
        <div className="text-xs text-muted">
          Column lineage mappings: <span className="font-mono text-foreground/80">{run.column_lineage.length}</span>
        </div>
      )}

      {/* Quality scores */}
      {Object.keys(run.quality_scores ?? {}).length > 0 && (
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-1">
            Quality Scores
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(run.quality_scores).map(([dim, score]) => (
              <span
                key={dim}
                className={`px-2 py-0.5 rounded border text-xs font-mono ${
                  score >= 95
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : score >= 80
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {dim}: {score.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
