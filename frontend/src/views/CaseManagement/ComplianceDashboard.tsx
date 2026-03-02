import { useEffect } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCaseStore } from "../../stores/caseStore.ts";
import {
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
  TICK_STYLE,
} from "../../constants/chartStyles.ts";

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#6b7280"];
const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

export default function ComplianceDashboard() {
  const { cases, stats, fetchCases, fetchStats } = useCaseStore();

  useEffect(() => {
    fetchCases();
    fetchStats();
  }, [fetchCases, fetchStats]);

  // Build priority pie data
  const priorityData = PRIORITY_ORDER.filter(
    (p) => (stats?.by_priority[p] ?? 0) > 0,
  ).map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: stats?.by_priority[p] ?? 0,
  }));

  // Build trend data from cases (group by week)
  const trendData = buildTrendData(cases);

  // SLA at-risk/breached cases
  const slaCases = cases.filter(
    (c) =>
      c.sla.sla_status === "at_risk" || c.sla.sla_status === "breached",
  );

  return (
    <div className="space-y-4 overflow-auto" data-tour="cases-dashboard">
      {/* Summary cards */}
      <div
        className="grid grid-cols-5 gap-3"
        data-tour="cases-dashboard-cards"
      >
        <SummaryCard
          label="Open Cases"
          value={stats?.by_status["open"] ?? 0}
        />
        <SummaryCard
          label="Overdue SLAs"
          value={stats?.overdue_sla ?? 0}
          alert={!!stats && stats.overdue_sla > 0}
        />
        <SummaryCard
          label="Pending Reports"
          value={stats?.pending_reports ?? 0}
        />
        <SummaryCard
          label="Resolution Rate"
          value={`${((stats?.resolution_rate ?? 0) * 100).toFixed(0)}%`}
        />
        <SummaryCard
          label="Archived Cases"
          value={stats?.archived_cases ?? 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Case Volume Trend */}
        <div className="border border-border rounded p-3">
          <h3 className="text-xs font-medium text-muted mb-2">
            Case Volume Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="week"
                tick={TICK_STYLE}
                stroke="var(--color-border)"
              />
              <YAxis tick={TICK_STYLE} stroke="var(--color-border)" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
              />
              <Area
                type="monotone"
                dataKey="opened"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stackId="2"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="escalated"
                stackId="3"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, color: "var(--color-muted)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="border border-border rounded p-3">
          <h3 className="text-xs font-medium text-muted mb-2">
            Priority Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {priorityData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SLA Tracking */}
      <div className="border border-border rounded p-3">
        <h3 className="text-xs font-medium text-muted mb-2">
          SLA Tracking — At Risk / Breached ({slaCases.length})
        </h3>
        {slaCases.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">
            All cases are within SLA targets.
          </p>
        ) : (
          <div className="overflow-auto max-h-[200px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-1 px-2">Case ID</th>
                  <th className="py-1 px-2">Title</th>
                  <th className="py-1 px-2">Status</th>
                  <th className="py-1 px-2">Priority</th>
                  <th className="py-1 px-2">SLA Status</th>
                  <th className="py-1 px-2">SLA Hours</th>
                </tr>
              </thead>
              <tbody>
                {slaCases.map((c) => (
                  <tr
                    key={c.case_id}
                    className="border-b border-border/50 hover:bg-muted/5"
                  >
                    <td className="py-1 px-2 font-mono">{c.case_id}</td>
                    <td className="py-1 px-2">{c.title}</td>
                    <td className="py-1 px-2 capitalize">{c.status}</td>
                    <td className="py-1 px-2 capitalize">{c.priority}</td>
                    <td className="py-1 px-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          c.sla.sla_status === "breached"
                            ? "bg-red-500/15 text-red-500 border-red-500/30"
                            : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                        }`}
                      >
                        {c.sla.sla_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-1 px-2">{c.sla.sla_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lakehouse Status */}
      <div className="border border-border rounded p-3">
        <h3 className="text-xs font-medium text-muted mb-2">
          Lakehouse Tier Distribution
        </h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="border border-border rounded p-2 text-center">
            <div className="text-muted">Gold (Alerts)</div>
            <div className="text-lg font-semibold">
              {stats?.total_linked_alerts ?? 0}
            </div>
          </div>
          <div className="border border-border rounded p-2 text-center">
            <div className="text-muted">Sandbox (Active Cases)</div>
            <div className="text-lg font-semibold">
              {(stats?.total_cases ?? 0) - (stats?.archived_cases ?? 0)}
            </div>
          </div>
          <div className="border border-border rounded p-2 text-center">
            <div className="text-muted">Archive (Retained)</div>
            <div className="text-lg font-semibold">
              {stats?.archived_cases ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function SummaryCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className={`border rounded p-3 text-center ${
        alert
          ? "border-red-500/40 bg-red-500/5"
          : "border-border"
      }`}
    >
      <div className="text-[10px] text-muted uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`text-xl font-semibold mt-1 ${
          alert ? "text-red-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function buildTrendData(
  cases: { status: string; created_at: string }[],
): { week: string; opened: number; resolved: number; escalated: number }[] {
  const weekMap = new Map<
    string,
    { opened: number; resolved: number; escalated: number }
  >();
  for (const c of cases) {
    const d = new Date(c.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    const entry = weekMap.get(key) ?? { opened: 0, resolved: 0, escalated: 0 };
    entry.opened++;
    if (c.status === "resolved" || c.status === "closed") entry.resolved++;
    if (c.status === "escalated") entry.escalated++;
    weekMap.set(key, entry);
  }
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({ week, ...data }));
}
