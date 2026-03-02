import { useEffect, useState } from "react";
import { api } from "../../api/client.ts";
import { useNavigate } from "react-router-dom";

interface LinkedAlertsProps {
  alertIds: string[];
}

interface AlertSummary {
  alert_id: string;
  model_name: string;
  accumulated_score: number;
  timestamp: string;
  alert_fired: boolean;
}

export default function LinkedAlerts({ alertIds }: LinkedAlertsProps) {
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (alertIds.length === 0) return;
    setLoading(true);
    // Fetch each alert's summary
    Promise.all(
      alertIds.map((id) =>
        api.get<AlertSummary>(`/alerts/${id}`).catch(() => null),
      ),
    ).then((results) => {
      setAlerts(results.filter((r): r is AlertSummary => r !== null));
      setLoading(false);
    });
  }, [alertIds]);

  if (alertIds.length === 0) {
    return (
      <div className="text-xs text-muted text-center py-8">
        No linked alerts.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-xs text-muted text-center py-8">
        Loading alerts...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.length === 0 && !loading ? (
        // Fallback: just show IDs if fetch failed
        <div className="space-y-1">
          {alertIds.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2 p-2 rounded border border-border text-xs"
            >
              <span className="font-mono text-[11px]">{id}</span>
              <button
                onClick={() => navigate(`/alerts/${id}`)}
                className="ml-auto px-2 py-0.5 text-[10px] rounded border border-border text-muted hover:text-foreground"
              >
                View
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {alerts.map((a) => (
            <div
              key={a.alert_id}
              className="flex items-center gap-3 p-2 rounded border border-border text-xs"
            >
              <span className="font-mono text-[11px] w-28 truncate">
                {a.alert_id}
              </span>
              <span className="text-muted">{a.model_name || "\u2014"}</span>
              <span className="ml-auto font-mono">
                {a.accumulated_score?.toFixed(1) ?? "\u2014"}
              </span>
              <button
                onClick={() => navigate(`/alerts/${a.alert_id}`)}
                className="px-2 py-0.5 text-[10px] rounded border border-border text-muted hover:text-foreground"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
