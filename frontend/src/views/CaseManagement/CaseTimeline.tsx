import StatusBadge from "../../components/StatusBadge.tsx";
import type { CaseAnnotation } from "../../stores/caseStore.ts";

interface CaseTimelineProps {
  annotations: CaseAnnotation[];
}

function typeVariant(t: string) {
  switch (t) {
    case "escalation":
      return "error" as const;
    case "disposition":
      return "success" as const;
    case "evidence":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function CaseTimeline({ annotations }: CaseTimelineProps) {
  if (annotations.length === 0) {
    return (
      <div className="text-xs text-muted text-center py-8">
        No annotations yet.
      </div>
    );
  }

  const sorted = [...annotations].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="space-y-3">
      {sorted.map((ann) => (
        <div
          key={ann.annotation_id}
          className="flex gap-3 p-2 rounded border border-border bg-muted/5"
        >
          <div className="shrink-0 pt-0.5">
            <StatusBadge label={ann.type} variant={typeVariant(ann.type)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="font-medium text-foreground">{ann.author}</span>
              <span>{formatTimestamp(ann.timestamp)}</span>
            </div>
            <p className="text-xs mt-1">{ann.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
