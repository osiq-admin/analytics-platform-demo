import Panel from "../../../components/Panel.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import type { AlertTrace } from "../../../stores/alertStore.ts";

interface EntityContextProps {
  alert: AlertTrace;
}

export default function EntityContext({ alert }: EntityContextProps) {
  const ctx = alert.entity_context ?? {};
  return (
    <Panel title="Entity Context">
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(ctx).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-muted">{key}:</span>
            <StatusBadge label={value} variant="info" />
          </div>
        ))}
      </div>
      {Object.keys(ctx).length === 0 && (
        <p className="text-muted text-xs">No entity context available.</p>
      )}
    </Panel>
  );
}
