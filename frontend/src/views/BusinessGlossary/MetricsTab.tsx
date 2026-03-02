import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel } from "../../utils/format.ts";
import {
  useGlossaryStore,
  type SemanticMetric,
} from "../../stores/glossaryStore.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierVariant(tier: string): "info" | "warning" | "success" | "muted" {
  switch (tier) {
    case "platinum":
      return "info";
    case "gold":
      return "success";
    case "silver":
      return "warning";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MetricsTab() {
  const { metrics, loading, fetchMetrics, fetchDimensions } = useGlossaryStore();
  const [selectedMetric, setSelectedMetric] = useState<SemanticMetric | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchDimensions();
  }, [fetchMetrics, fetchDimensions]);

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      <div
        className="flex-1 min-w-0"
        data-tour="glossary-metrics-list"
        data-trace="glossary.semantic-metrics"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1.5 px-2">Metric</th>
              <th className="text-left py-1.5 px-2">Source Tier</th>
              <th className="text-left py-1.5 px-2">Unit</th>
              <th className="text-left py-1.5 px-2">Dimensions</th>
              <th className="text-left py-1.5 px-2">BCBS 239</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr
                key={m.metric_id}
                className={`border-b border-border/50 cursor-pointer ${
                  selectedMetric?.metric_id === m.metric_id ? "bg-accent/10" : "hover:bg-surface-hover"
                }`}
                onClick={() => setSelectedMetric(m)}
              >
                <td className="py-1.5 px-2 font-medium">{m.business_name}</td>
                <td className="py-1.5 px-2">
                  <StatusBadge label={m.source_tier} variant={tierVariant(m.source_tier)} />
                </td>
                <td className="py-1.5 px-2 text-muted">{m.unit}</td>
                <td className="py-1.5 px-2 text-muted">{m.dimensions.length}</td>
                <td className="py-1.5 px-2 text-muted">{formatLabel(m.bcbs239_principle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMetric && (
        <div className="w-72 shrink-0 border-l border-border pl-3">
          <h3 className="text-sm font-semibold mb-1">{selectedMetric.business_name}</h3>
          <p className="text-xs text-muted mb-3">{selectedMetric.definition}</p>

          <div className="mb-3">
            <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Formula</h4>
            <code className="text-[10px] bg-surface rounded px-2 py-1 block font-mono">
              {selectedMetric.formula}
            </code>
          </div>

          <div className="mb-3">
            <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Source</h4>
            <div className="text-xs">
              <StatusBadge label={selectedMetric.source_tier} variant={tierVariant(selectedMetric.source_tier)} />
              <span className="ml-2 text-muted">
                {selectedMetric.source_entities.map(formatLabel).join(", ")}
              </span>
            </div>
          </div>

          {selectedMetric.dimensions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Dimensions</h4>
              <div className="flex flex-wrap gap-1">
                {selectedMetric.dimensions.map((d) => (
                  <span key={d} className="text-[10px] bg-surface rounded px-1.5 py-0.5">
                    {formatLabel(d)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-muted mt-3 pt-2 border-t border-border">
            <div>Owner: {formatLabel(selectedMetric.owner)}</div>
            <div>BCBS 239: {formatLabel(selectedMetric.bcbs239_principle)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
