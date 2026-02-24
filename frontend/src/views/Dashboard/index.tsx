import { useEffect } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  type PieLabelRenderProps,
} from "recharts";
import { useDashboardStore } from "../../stores/dashboardStore.ts";
import SummaryCard from "../../components/SummaryCard.tsx";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];

/** Stable color per asset class so the chart is consistent across reloads. */
const ASSET_CLASS_COLORS: Record<string, string> = {
  equity: "#6366f1",
  fx: "#22d3ee",
  commodity: "#f59e0b",
  index: "#10b981",
  fixed_income: "#8b5cf6",
};

export default function Dashboard() {
  const { stats, loading, error, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-muted p-4">Failed to load dashboard: {error}</p>;
  }

  if (!stats) return null;

  const firedPct = stats.by_trigger.find((t) => t.trigger_path === "fired");
  const firedPercent = stats.total_alerts > 0 && firedPct
    ? Math.round((firedPct.cnt / stats.total_alerts) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4" data-tour="dashboard">
      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-4 gap-4" data-tour="dashboard-cards">
        <SummaryCard
          label="Total Alerts"
          value={stats.total_alerts}
        />
        <SummaryCard
          label="Fired %"
          value={`${firedPercent}%`}
          subtitle={`${firedPct?.cnt ?? 0} of ${stats.total_alerts} alerts`}
        />
        <SummaryCard
          label="Avg Score"
          value={stats.avg_scores?.avg_score ?? "—"}
          subtitle={`Threshold: ${stats.avg_scores?.avg_threshold ?? "—"}`}
        />
        <SummaryCard
          label="Active Models"
          value={stats.by_model.length}
        />
      </div>

      {/* Row 2: By Model (Pie) | Score Distribution (Bar) */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Alerts by Model" dataTour="dashboard-by-model">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.by_model} layout="vertical" margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-muted)" }} />
              <YAxis
                type="category"
                dataKey="model_id"
                tick={{ fontSize: 9, fill: "var(--color-muted)" }}
                width={130}
              />
              <Tooltip contentStyle={{ fontSize: 11, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <Bar dataKey="cnt" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 10, fill: "var(--color-muted)" }}>
                {stats.by_model.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Score Distribution" dataTour="dashboard-scores">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.score_distribution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 9, fill: "var(--color-muted)" }}
                tickFormatter={(v: number) => `${v}-${v + 10}`}
              />
              <YAxis tick={{ fontSize: 9, fill: "var(--color-muted)" }} width={30} />
              <Tooltip contentStyle={{ fontSize: 11, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <Bar dataKey="cnt" fill="var(--color-accent)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 3: By Trigger Path | By Asset Class */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Alerts by Trigger Path" dataTour="dashboard-triggers">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.by_trigger} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-muted)" }} />
              <YAxis
                type="category"
                dataKey="trigger_path"
                tick={{ fontSize: 9, fill: "var(--color-muted)" }}
                width={55}
              />
              <Tooltip contentStyle={{ fontSize: 11, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <Bar dataKey="cnt" fill="#22d3ee" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Alerts by Asset Class">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.by_asset}
                dataKey="cnt"
                nameKey="asset_class"
                cx="50%"
                cy="50%"
                outerRadius={65}
                label={(props: PieLabelRenderProps) => `${props.name ?? ""} (${props.value ?? 0})`}
                labelLine
                fontSize={10}
              >
                {stats.by_asset.map((entry, i) => (
                  <Cell key={i} fill={ASSET_CLASS_COLORS[entry.asset_class] ?? COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
