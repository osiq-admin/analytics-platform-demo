import type { AlertTrace } from "../../../stores/alertStore.ts";
import StatusBadge from "../../../components/StatusBadge.tsx";
import BusinessDescription from "./BusinessDescription.tsx";
import EntityContext from "./EntityContext.tsx";
import ScoreBreakdown from "./ScoreBreakdown.tsx";

interface AlertDetailProps {
  alert: AlertTrace;
  onBack: () => void;
}

export default function AlertDetail({ alert, onBack }: AlertDetailProps) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          Back
        </button>
        <h3 className="text-base font-semibold">Alert Detail</h3>
        <StatusBadge label={alert.model_id} variant="info" />
        <StatusBadge
          label={`Score: ${alert.accumulated_score}`}
          variant={
            alert.accumulated_score >= alert.score_threshold
              ? "error"
              : "warning"
          }
        />
        <StatusBadge label={alert.trigger_path} variant="success" />
        <span className="text-xs text-muted font-mono ml-auto">
          {alert.alert_id}
        </span>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <BusinessDescription alert={alert} />
        <EntityContext alert={alert} />
        <div className="col-span-2">
          <ScoreBreakdown alert={alert} />
        </div>
      </div>
    </div>
  );
}
