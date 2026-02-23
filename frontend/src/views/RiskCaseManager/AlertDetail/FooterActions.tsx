import { useState } from "react";
import type { AlertTrace } from "../../../stores/alertStore.ts";

interface FooterActionsProps {
  alert: AlertTrace;
  onViewRelatedAlerts?: () => void;
}

export default function FooterActions({ alert, onViewRelatedAlerts }: FooterActionsProps) {
  const [showRaw, setShowRaw] = useState(false);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(alert, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${alert.alert_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="px-3 py-1.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          {showRaw ? "Hide Raw Data" : "Raw Data"}
        </button>
        {onViewRelatedAlerts && (
          <button
            onClick={onViewRelatedAlerts}
            className="px-3 py-1.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
          >
            Related Alerts
          </button>
        )}
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          Export JSON
        </button>
      </div>
      {showRaw && (
        <pre className="text-[10px] font-mono bg-background border border-border rounded p-3 max-h-64 overflow-auto text-muted">
          {JSON.stringify(alert, null, 2)}
        </pre>
      )}
    </div>
  );
}
