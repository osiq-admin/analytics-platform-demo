import Panel from "../../../components/Panel.tsx";
import type { AlertTrace } from "../../../stores/alertStore.ts";
import { formatLabel, formatTimestamp } from "../../../utils/format.ts";

interface BusinessDescriptionProps {
  alert: AlertTrace;
}

export default function BusinessDescription({
  alert,
}: BusinessDescriptionProps) {
  return (
    <Panel title="Business Description">
      <div className="text-xs space-y-2">
        <p>
          <span className="text-muted">Model:</span>{" "}
          <span className="font-medium">{formatLabel(alert.model_id)}</span>
        </p>
        <p>
          <span className="text-muted">Trigger:</span>{" "}
          <span
            className={
              alert.trigger_path === "all_passed"
                ? "text-success"
                : "text-warning"
            }
          >
            {alert.trigger_path === "all_passed"
              ? "All calculations passed thresholds"
              : "Score-based trigger (accumulated score exceeded threshold)"}
          </span>
        </p>
        <p>
          <span className="text-muted">Score:</span>{" "}
          <span className="font-mono text-accent">
            {alert.accumulated_score}
          </span>{" "}
          / threshold{" "}
          <span className="font-mono">{alert.score_threshold}</span>
        </p>
        <p>
          <span className="text-muted">Time:</span> {formatTimestamp(alert.timestamp)}
        </p>
      </div>
    </Panel>
  );
}
