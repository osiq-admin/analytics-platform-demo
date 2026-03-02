import Panel from "../../components/Panel.tsx";
import { formatLabel } from "../../utils/format.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KPIDefinition {
  kpi_id: string;
  name: string;
  description: string;
  category: string;
  sql_template: string;
  dimensions: { field: string; label: string }[];
  schedule: string;
  source_tier: string;
  output_format: string;
}

export interface KPIDataPoint {
  dimension_values: Record<string, string>;
  metric_name: string;
  metric_value: number | string;
  period: string;
}

export interface KPIDataset {
  kpi_id: string;
  name: string;
  category: string;
  generated_at: string;
  period: string;
  data_points: KPIDataPoint[];
  record_count: number;
}

export interface PlatinumConfig {
  tier_id: string;
  kpi_definitions: KPIDefinition[];
  last_generated: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  alert_summary: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  model_effectiveness: "bg-green-500/20 text-green-400 border-green-500/30",
  score_distribution: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  regulatory_report: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlatinumTabProps {
  platinumConfig: PlatinumConfig | null;
  datasets: KPIDataset[];
  selectedKpi: string;
  selectedDataset: KPIDataset | null;
  generating: boolean;
  onSelectKpi: (kpiId: string) => void;
  onGenerateAll: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlatinumTab({
  platinumConfig,
  datasets,
  selectedKpi,
  selectedDataset,
  generating,
  onSelectKpi,
  onGenerateAll,
}: PlatinumTabProps) {
  const kpiDefs = platinumConfig?.kpi_definitions ?? [];

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0" data-tour="analytics-platinum" data-trace="analytics-tiers.platinum">
      {/* KPI summary cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-foreground">
          KPI Definitions ({kpiDefs.length})
        </h2>
        <button
          onClick={onGenerateAll}
          disabled={generating}
          className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate All"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {kpiDefs.map((kpi) => {
          const ds = datasets.find((d) => d.kpi_id === kpi.kpi_id);
          const isSelected = selectedKpi === kpi.kpi_id;
          return (
            <button
              key={kpi.kpi_id}
              onClick={() => onSelectKpi(kpi.kpi_id)}
              className={`text-left p-3 rounded border transition-colors ${
                isSelected
                  ? "bg-accent/10 border-accent"
                  : "bg-surface border-border hover:border-border-hover"
              }`}
            >
              <div className="text-xs font-medium text-foreground truncate">{kpi.name}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded border ${
                    CATEGORY_COLORS[kpi.category] ?? "text-muted border-border"
                  }`}
                >
                  {formatLabel(kpi.category)}
                </span>
              </div>
              <div className="text-[10px] text-muted mt-1.5">
                {ds ? `${ds.data_points.length} data points` : "No data yet"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail table */}
      {selectedDataset && (
        <Panel
          title={`${selectedDataset.name} — Data Points`}
          dataTour="analytics-platinum-detail"
          dataTrace="analytics-tiers.platinum-detail"
          className="flex-1 min-h-0"
          noPadding
        >
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1.5 px-3">Metric</th>
                  <th className="text-left py-1.5 px-3">Value</th>
                  <th className="text-left py-1.5 px-3">Period</th>
                  <th className="text-left py-1.5 px-3">Dimensions</th>
                </tr>
              </thead>
              <tbody>
                {selectedDataset.data_points.map((dp, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface-hover">
                    <td className="py-1.5 px-3 text-foreground">{dp.metric_name || "—"}</td>
                    <td className="py-1.5 px-3 font-mono text-foreground">{String(dp.metric_value)}</td>
                    <td className="py-1.5 px-3 text-muted">{dp.period || "—"}</td>
                    <td className="py-1.5 px-3 text-muted">
                      {Object.entries(dp.dimension_values).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          {formatLabel(k)}: {v}
                        </span>
                      ))}
                      {Object.keys(dp.dimension_values).length === 0 && "—"}
                    </td>
                  </tr>
                ))}
                {selectedDataset.data_points.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted">
                      No data points. Click Generate All to compute.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
