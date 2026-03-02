import { useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { usePipelineStore } from "../../stores/pipelineStore.ts";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TICK_STYLE } from "../../constants/chartStyles.ts";

/** SLA status badge color classes */
const SLA_COLORS: Record<string, string> = {
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MetricsPanel() {
  const metrics = usePipelineStore((s) => s.metrics);
  const fetchMetrics = usePipelineStore((s) => s.fetchMetrics);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  if (!metrics) {
    return (
      <div className="text-xs text-muted py-4 text-center">
        Loading metrics...
      </div>
    );
  }

  const { executionTimeSeries, sla } = metrics;

  return (
    <div className="flex flex-col gap-4">
      {/* SLA Compliance Badge */}
      {sla && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted uppercase tracking-wide font-semibold">SLA Status</span>
          {sla.map((s: { metric_id: string; status: string; current_value: number; threshold: number }) => (
            <span
              key={s.metric_id}
              className={`px-2 py-0.5 rounded border text-xs font-medium ${SLA_COLORS[s.status] ?? SLA_COLORS.amber}`}
              title={`${s.metric_id}: ${s.current_value} (threshold: ${s.threshold})`}
            >
              {s.metric_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: {s.status.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Execution Time Trend */}
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-2">
            Execution Time (30d)
          </div>
          {executionTimeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={executionTimeSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tick={TICK_STYLE}
                  tickFormatter={(v: string) => v.slice(5, 10)}
                />
                <YAxis tick={TICK_STYLE} width={40} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(value: unknown) => [`${value}ms`, "Duration"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Duration (ms)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted py-8 text-center">No execution time data</div>
          )}
        </div>

        {/* Quality Score Trends */}
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wide font-semibold mb-2">
            Quality Scores (30d)
          </div>
          {(metrics.completenessSeries.length > 0 || metrics.validitySeries.length > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={mergeQualitySeries(metrics.completenessSeries, metrics.validitySeries)}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="timestamp"
                  tick={TICK_STYLE}
                  tickFormatter={(v: string) => v.slice(5, 10)}
                />
                <YAxis tick={TICK_STYLE} width={40} domain={[0, 100]} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="completeness"
                  name="Completeness"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="validity"
                  name="Validity"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted py-8 text-center">No quality score data</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Merge two time series arrays into one array with shared timestamps. */
function mergeQualitySeries(
  completeness: { timestamp: string; value: number }[],
  validity: { timestamp: string; value: number }[],
): { timestamp: string; completeness: number; validity: number }[] {
  const map = new Map<string, { completeness: number; validity: number }>();
  for (const p of completeness) {
    const entry = map.get(p.timestamp) ?? { completeness: 0, validity: 0 };
    entry.completeness = p.value;
    map.set(p.timestamp, entry);
  }
  for (const p of validity) {
    const entry = map.get(p.timestamp) ?? { completeness: 0, validity: 0 };
    entry.validity = p.value;
    map.set(p.timestamp, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, vals]) => ({ timestamp, ...vals }));
}
