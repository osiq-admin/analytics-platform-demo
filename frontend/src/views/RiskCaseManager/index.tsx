import { useEffect, useState } from "react";
import {
  useAlertStore,
  type AlertSummary,
  type AlertTrace,
} from "../../stores/alertStore.ts";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import AlertSummaryGrid from "./AlertSummary.tsx";
import AlertDetail from "./AlertDetail/index.tsx";

export default function RiskCaseManager() {
  const { alerts, loading, error, fetchAlerts, generateAlerts } =
    useAlertStore();
  const [selectedTrace, setSelectedTrace] = useState<AlertTrace | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSelect = async (alert: AlertSummary) => {
    try {
      const trace = await api.get<AlertTrace>(`/alerts/${alert.alert_id}`);
      setSelectedTrace(trace);
    } catch {
      // fallback: show what we have from summary
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Alert detail view
  if (selectedTrace) {
    return (
      <AlertDetail
        alert={selectedTrace}
        onBack={() => setSelectedTrace(null)}
      />
    );
  }

  // Alert summary view
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between" data-tour="alert-filters" data-trace="alerts.filters">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Risk Case Manager</h2>
          <StatusBadge label={`${alerts.length} alerts`} variant="info" />
        </div>
        <button
          onClick={() => { void generateAlerts(); }}
          className="px-3 py-1.5 text-xs rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
        >
          Generate Alerts
        </button>
      </div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <Panel title="Alerts" className="flex-1 min-h-0" noPadding dataTour="alert-grid" dataTrace="alerts.summary-grid" tooltip="All generated risk alerts with severity and status">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No alerts generated yet. Run the pipeline and generate alerts.
          </div>
        ) : (
          <AlertSummaryGrid alerts={alerts} onSelect={handleSelect} />
        )}
      </Panel>
    </div>
  );
}
