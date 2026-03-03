import { useEffect } from "react";
import { usePipelineStore } from "../../stores/pipelineStore.ts";
import { formatTimestamp } from "../../utils/format.ts";

const STATUS_BADGE: Record<string, string> = {
  pipeline_execution: "bg-blue-500/20 text-blue-400",
  data_ingestion: "bg-cyan-500/20 text-cyan-400",
  contract_validation: "bg-purple-500/20 text-purple-400",
  quality_check: "bg-green-500/20 text-green-400",
  alert_generation: "bg-amber-500/20 text-amber-400",
  error: "bg-red-500/20 text-red-400",
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
  critical: "bg-red-600",
};

export default function EventTimeline() {
  const events = usePipelineStore((s) => s.events);
  const fetchEvents = usePipelineStore((s) => s.fetchEvents);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  if (!events || events.length === 0) {
    return (
      <div className="text-xs text-muted py-4 text-center">
        No recent pipeline events
      </div>
    );
  }

  return (
    <div className="relative max-h-[400px] overflow-y-auto">
      {/* Vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

      <div className="flex flex-col gap-2 pl-8">
        {events.slice(0, 20).map((evt, i) => (
          <div key={i} className="relative flex items-start gap-3">
            {/* Timeline dot */}
            <div
              className={`absolute -left-5 top-1.5 w-2 h-2 rounded-full ${SEVERITY_DOT[evt.severity] ?? SEVERITY_DOT.info}`}
            />

            {/* Event card */}
            <div className="flex-1 rounded border border-border bg-surface-elevated p-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[evt.event_type] ?? STATUS_BADGE.pipeline_execution}`}
                  >
                    {evt.event_type.replace(/_/g, " ")}
                  </span>
                  {evt.entity && (
                    <span className="text-xs text-foreground/80 font-mono">
                      {evt.entity}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted whitespace-nowrap">
                  {formatTimestamp(evt.timestamp)}
                </span>
              </div>
              <div className="text-xs text-muted">
                {typeof evt.details === "string"
                  ? evt.details
                  : typeof evt.details === "object" && evt.details != null
                    ? Object.entries(evt.details as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(", ")
                    : evt.message || "Pipeline event recorded"}
              </div>
              {evt.duration_ms != null && evt.duration_ms > 0 && (
                <div className="text-[10px] text-muted mt-0.5">
                  Duration: <span className="font-mono">{evt.duration_ms}ms</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
