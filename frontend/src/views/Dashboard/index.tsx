import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  type PieLabelRenderProps,
} from "recharts";
import { useDashboardStore } from "../../stores/dashboardStore.ts";
import type { WidgetDefinition } from "../../stores/dashboardStore.ts";
import { useWidgetStore } from "../../stores/widgetStore.ts";
import SummaryCard from "../../components/SummaryCard.tsx";
import WidgetContainer from "../../components/WidgetContainer.tsx";
import ChartTypeSwitcher from "../../components/ChartTypeSwitcher.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TICK_STYLE } from "../../constants/chartStyles.ts";
import { formatLabel } from "../../utils/format.ts";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];

/** Stable color per asset class so the chart is consistent across reloads. */
const ASSET_CLASS_COLORS: Record<string, string> = {
  equity: "#6366f1",
  fx: "#22d3ee",
  commodity: "#f59e0b",
  index: "#10b981",
  fixed_income: "#8b5cf6",
};

/** Format a percentage to one decimal place */
function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

/* ---------- Generic table renderer ---------- */
function DataTable({ data, labelKey, valueKey, labelHeader, valueHeader }: {
  data: Record<string, unknown>[]; labelKey: string; valueKey: string;
  labelHeader?: string; valueHeader?: string;
}) {
  const total = data.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);
  return (
    <div className="overflow-auto max-h-[220px]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 px-2 text-muted font-semibold uppercase tracking-wide">{labelHeader ?? labelKey}</th>
            <th className="text-right py-1 px-2 text-muted font-semibold uppercase tracking-wide">{valueHeader ?? valueKey}</th>
            <th className="text-right py-1 px-2 text-muted font-semibold uppercase tracking-wide">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const val = Number(row[valueKey]) || 0;
            return (
              <tr key={i} className="border-b border-border/50 hover:bg-surface-elevated/50">
                <td className="py-1 px-2 text-foreground/80">{formatLabel(String(row[labelKey] ?? ""))}</td>
                <td className="py-1 px-2 text-right text-foreground">{String(val)}</td>
                <td className="py-1 px-2 text-right text-muted">{pct(val, total)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td className="py-1 px-2 text-foreground font-semibold">Total</td>
            <td className="py-1 px-2 text-right text-foreground font-semibold">{total}</td>
            <td className="py-1 px-2 text-right text-muted font-semibold">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ---------- Multi-type chart renderers ---------- */

function AlertsByModelChart({ data, chartType }: { data: { model_id: string; cnt: number }[]; chartType: string }) {
  const total = data.reduce((s, d) => s + d.cnt, 0);
  if (chartType === "table") {
    return <DataTable data={data} labelKey="model_id" valueKey="cnt" labelHeader="Model" valueHeader="Count" />;
  }
  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="cnt" nameKey="model_id" cx="50%" cy="50%" outerRadius={65}
            isAnimationActive={false} label={(p: PieLabelRenderProps) => `${formatLabel(String(p.name ?? ""))} (${p.value ?? 0}, ${pct(Number(p.value ?? 0), total)})`} labelLine fontSize={10}>
            {data.map((d, i) => <Cell key={d.model_id} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => formatLabel(v)} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="model_id" tick={TICK_STYLE} tickFormatter={(v: string) => formatLabel(v)} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Line type="monotone" dataKey="cnt" name="Count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="model_id" tick={TICK_STYLE} tickFormatter={(v: string) => formatLabel(v)} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Bar dataKey="cnt" name="Count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={d.model_id} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  /* default: horizontal_bar (original) */
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 0 }}>
        <XAxis type="number" tick={TICK_STYLE} />
        <YAxis type="category" dataKey="model_id" tick={TICK_STYLE} width={130} tickFormatter={(v: string) => formatLabel(v)} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={(value: unknown) => [`${value} (${pct(Number(value), total)})`, "Count"]} />
        <Bar dataKey="cnt" name="Count" radius={[0, 4, 4, 0]} isAnimationActive={false}
          label={{ position: "right", fontSize: 10, fill: "var(--color-muted)", formatter: (v: unknown) => `${v} (${pct(Number(v), total)})` }}>
          {data.map((d, i) => <Cell key={d.model_id} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ScoreDistributionChart({ data, chartType }: { data: { bucket: number; cnt: number }[]; chartType: string }) {
  if (chartType === "table") {
    const labeled = data.map((d) => ({ ...d, range: `${d.bucket}-${d.bucket + 10}` }));
    return <DataTable data={labeled} labelKey="range" valueKey="cnt" labelHeader="Score Range" valueHeader="Count" />;
  }
  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="bucket" tick={TICK_STYLE} tickFormatter={(v: number) => `${v}-${v + 10}`} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Line type="monotone" dataKey="cnt" name="Count" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "horizontal_bar") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 40, bottom: 0 }}>
          <XAxis type="number" tick={TICK_STYLE} />
          <YAxis type="category" dataKey="bucket" tick={TICK_STYLE} width={40}
            tickFormatter={(v: number) => `${v}-${v + 10}`} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Bar dataKey="cnt" name="Count" fill="var(--color-accent)" radius={[0, 2, 2, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  /* default: bar (vertical, original) */
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="bucket" tick={TICK_STYLE} tickFormatter={(v: number) => `${v}-${v + 10}`} />
        <YAxis tick={TICK_STYLE} width={30} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
        <Bar dataKey="cnt" name="Count" fill="var(--color-accent)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AlertsByTriggerChart({ data, chartType }: { data: { trigger_path: string; cnt: number }[]; chartType: string }) {
  const total = data.reduce((s, d) => s + d.cnt, 0);
  if (chartType === "table") {
    return <DataTable data={data} labelKey="trigger_path" valueKey="cnt" labelHeader="Trigger Path" valueHeader="Count" />;
  }
  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="cnt" nameKey="trigger_path" cx="50%" cy="50%" outerRadius={60}
            isAnimationActive={false} label={(p: PieLabelRenderProps) => `${formatLabel(String(p.name ?? ""))} (${p.value ?? 0}, ${pct(Number(p.value ?? 0), total)})`} labelLine fontSize={10}>
            {data.map((d, i) => <Cell key={d.trigger_path} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => formatLabel(v)} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="trigger_path" tick={TICK_STYLE} tickFormatter={(v: string) => formatLabel(v)} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Bar dataKey="cnt" name="Count" fill="#22d3ee" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="trigger_path" tick={TICK_STYLE} tickFormatter={(v: string) => formatLabel(v)} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Line type="monotone" dataKey="cnt" name="Count" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  /* default: horizontal_bar (original) */
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
        <XAxis type="number" tick={TICK_STYLE} />
        <YAxis type="category" dataKey="trigger_path" tick={TICK_STYLE} width={80} tickFormatter={(v: string) => formatLabel(v)} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
        <Bar dataKey="cnt" name="Count" fill="#22d3ee" radius={[0, 2, 2, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AlertsByAssetChart({ data, chartType }: { data: { asset_class: string; cnt: number }[]; chartType: string }) {
  const total = data.reduce((s, d) => s + d.cnt, 0);
  if (chartType === "table") {
    return <DataTable data={data} labelKey="asset_class" valueKey="cnt" labelHeader="Asset Class" valueHeader="Count" />;
  }
  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="asset_class" tick={TICK_STYLE} tickFormatter={(v: string) => formatLabel(v)} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Bar dataKey="cnt" name="Count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell key={entry.asset_class} fill={ASSET_CLASS_COLORS[entry.asset_class] ?? COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "horizontal_bar") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
          <XAxis type="number" tick={TICK_STYLE} />
          <YAxis type="category" dataKey="asset_class" tick={TICK_STYLE} width={80} tickFormatter={(v: string) => formatLabel(v)} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Bar dataKey="cnt" name="Count" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell key={entry.asset_class} fill={ASSET_CLASS_COLORS[entry.asset_class] ?? COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="asset_class" tick={TICK_STYLE} tickFormatter={(v: string) => formatLabel(v)} />
          <YAxis tick={TICK_STYLE} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
          <Line type="monotone" dataKey="cnt" name="Count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  /* default: pie (original) */
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="cnt" nameKey="asset_class" cx="50%" cy="50%" outerRadius={65}
          isAnimationActive={false} label={(props: PieLabelRenderProps) => `${formatLabel(String(props.name ?? ""))} (${props.value ?? 0}, ${pct(Number(props.value ?? 0), total)})`}
          labelLine fontSize={10}>
          {data.map((entry, i) => (
            <Cell key={entry.asset_class} fill={ASSET_CLASS_COLORS[entry.asset_class] ?? COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => formatLabel(v)} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ---------- Chart renderer lookup ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHART_RENDERERS: Record<string, React.ComponentType<any>> = {
  "alerts-by-model": AlertsByModelChart,
  "score-distribution": ScoreDistributionChart,
  "alerts-by-trigger": AlertsByTriggerChart,
  "alerts-by-asset": AlertsByAssetChart,
};

/** data-tour attributes per widget id */
const WIDGET_TOUR_ATTRS: Record<string, string> = {
  "alerts-by-model": "dashboard-by-model",
  "score-distribution": "dashboard-scores",
  "alerts-by-trigger": "dashboard-triggers",
};

/* ---------- Self-contained chart widget driven by metadata ---------- */

function ChartWidget({ widget, data }: { widget: WidgetDefinition; data: unknown[] }) {
  const widgetId = widget.widget_id;
  const defaultType = widget.chart_config?.default_chart_type ?? "bar";
  const availableTypes = widget.chart_config?.available_chart_types ?? ["bar"];

  const chartType = useWidgetStore((s) => s.chartTypes[widgetId] ?? defaultType);
  const visible = useWidgetStore((s) => s.visibility[widgetId] ?? true);
  const toggle = useWidgetStore((s) => s.toggleWidget);
  const setType = useWidgetStore((s) => s.setChartType);

  const Renderer = CHART_RENDERERS[widgetId];
  if (!Renderer) return null;

  return (
    <WidgetContainer
      id={widgetId} title={widget.title} visible={visible}
      onToggle={() => toggle(widgetId)}
      dataTour={WIDGET_TOUR_ATTRS[widgetId]}
      dataTrace={`dashboard.${widgetId}`}
      chartTypeSwitcher={
        <ChartTypeSwitcher chartId={widgetId} currentType={chartType}
          options={availableTypes}
          onChange={(t) => setType(widgetId, t)} />
      }
    >
      <Renderer data={data} chartType={chartType} />
    </WidgetContainer>
  );
}

/* ---------- KPI value resolver ---------- */

/**
 * Resolve a KPI data_field to a display value and optional subtitle.
 * These are the computed KPI values that the Dashboard has always displayed.
 */
function resolveKpiValue(
  dataField: string,
  stats: {
    total_alerts: number;
    by_model: { model_id: string; cnt: number }[];
    by_trigger: { trigger_path: string; cnt: number }[];
    avg_scores: { avg_score: number; avg_threshold: number };
  },
): { value: string | number; subtitle?: string } {
  switch (dataField) {
    case "total_alerts":
      return { value: stats.total_alerts };
    case "score_triggered_pct": {
      const scoreBased = stats.by_trigger.find((t) => t.trigger_path === "score_based");
      const scoreTriggeredPct = stats.total_alerts > 0 && scoreBased
        ? ((scoreBased.cnt / stats.total_alerts) * 100).toFixed(1)
        : "0";
      return {
        value: `${scoreTriggeredPct}%`,
        subtitle: `${scoreBased?.cnt ?? 0} of ${stats.total_alerts} exceeded threshold`,
      };
    }
    case "avg_score":
      return {
        value: stats.avg_scores?.avg_score ?? "\u2014",
        subtitle: `Threshold: ${stats.avg_scores?.avg_threshold ?? "\u2014"}`,
      };
    case "active_models":
      return { value: stats.by_model.length };
    default:
      return { value: "\u2014" };
  }
}

/* ---------- Chart data resolver ---------- */

/**
 * Resolve a chart widget's data_field to the actual data array from stats.
 */
function resolveChartData(
  dataField: string,
  stats: {
    by_model: { model_id: string; cnt: number }[];
    score_distribution: { bucket: number; cnt: number }[];
    by_trigger: { trigger_path: string; cnt: number }[];
    by_asset: { asset_class: string; cnt: number }[];
  },
): unknown[] {
  const DATA_MAP: Record<string, unknown[]> = {
    by_model: stats.by_model,
    score_distribution: stats.score_distribution,
    by_trigger: stats.by_trigger,
    by_asset: stats.by_asset,
  };
  return DATA_MAP[dataField] ?? [];
}

/* ---------- Fallback hardcoded widget list for config panel ---------- */

const FALLBACK_WIDGETS = [
  { id: "alerts-by-model", label: "Alerts by Model" },
  { id: "score-distribution", label: "Score Distribution" },
  { id: "alerts-by-trigger", label: "Alerts by Trigger Path" },
  { id: "alerts-by-asset", label: "Alerts by Asset Class" },
] as const;

/* ---------- Dashboard ---------- */

export default function Dashboard() {
  const { stats, loading, error, fetchStats } = useDashboardStore();
  const widgetConfig = useDashboardStore((s) => s.widgetConfig);
  const fetchWidgetConfig = useDashboardStore((s) => s.fetchWidgetConfig);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchWidgetConfig();
  }, [fetchStats, fetchWidgetConfig]);

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

  /* Derive widget lists from config (or fall back to hardcoded layout) */
  const kpiWidgets = widgetConfig
    ? widgetConfig.widgets
        .filter((w) => w.widget_type === "kpi_card")
        .sort((a, b) => a.grid.order - b.grid.order)
    : null;

  const chartWidgets = widgetConfig
    ? widgetConfig.widgets
        .filter((w) => w.widget_type === "chart")
        .sort((a, b) => a.grid.order - b.grid.order)
    : null;

  /* Config panel widget list: prefer metadata, fall back to hardcoded */
  const configPanelWidgets = chartWidgets
    ? chartWidgets.map((w) => ({ id: w.widget_id, label: w.title }))
    : FALLBACK_WIDGETS;

  return (
    <div className="flex flex-col gap-4" data-tour="dashboard">
      {/* Dashboard header with config gear */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Dashboard</h2>
        <button
          onClick={() => setShowConfig((v) => !v)}
          title="Widget settings"
          className="p-1.5 rounded border border-border bg-surface hover:bg-surface-elevated
                     text-muted hover:text-foreground transition-colors"
        >
          {/* Gear icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Config panel */}
      {showConfig && <WidgetConfigPanel widgets={configPanelWidgets} />}

      {/* Row 1: Summary Cards (always visible) */}
      <div className="grid grid-cols-4 gap-4" data-tour="dashboard-cards" data-trace="dashboard.summary-cards">
        {kpiWidgets ? (
          kpiWidgets.map((w) => {
            const { value, subtitle } = resolveKpiValue(w.data_field, stats);
            return <SummaryCard key={w.widget_id} label={w.title} value={value} subtitle={subtitle} />;
          })
        ) : (
          /* Fallback: hardcoded KPI cards (identical to original) */
          <>
            <SummaryCard label="Total Alerts" value={stats.total_alerts} />
            <SummaryCard label="Score Triggered" value={`${stats.total_alerts > 0 && stats.by_trigger.find((t) => t.trigger_path === "score_based")
              ? ((stats.by_trigger.find((t) => t.trigger_path === "score_based")!.cnt / stats.total_alerts) * 100).toFixed(1)
              : "0"}%`}
              subtitle={`${stats.by_trigger.find((t) => t.trigger_path === "score_based")?.cnt ?? 0} of ${stats.total_alerts} exceeded threshold`} />
            <SummaryCard label="Avg Score" value={stats.avg_scores?.avg_score ?? "\u2014"}
              subtitle={`Threshold: ${stats.avg_scores?.avg_threshold ?? "\u2014"}`} />
            <SummaryCard label="Active Models" value={stats.by_model.length} />
          </>
        )}
      </div>

      {/* Chart widgets: metadata-driven or fallback */}
      {chartWidgets ? (
        /* Render chart widgets from metadata in pairs (2 per row) */
        (() => {
          const rows: WidgetDefinition[][] = [];
          for (let i = 0; i < chartWidgets.length; i += 2) {
            rows.push(chartWidgets.slice(i, i + 2));
          }
          return rows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-2 gap-4">
              {row.map((w) => (
                <ChartWidget
                  key={w.widget_id}
                  widget={w}
                  data={resolveChartData(w.data_field, stats)}
                />
              ))}
            </div>
          ));
        })()
      ) : (
        /* Fallback: hardcoded chart layout (identical to original) */
        <>
          <div className="grid grid-cols-2 gap-4">
            <FallbackModelWidget data={stats.by_model} />
            <FallbackScoreWidget data={stats.score_distribution} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FallbackTriggerWidget data={stats.by_trigger} />
            <FallbackAssetWidget data={stats.by_asset} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Fallback widget wrappers (exact copies of originals) ---------- */

function FallbackModelWidget({ data }: { data: { model_id: string; cnt: number }[] }) {
  const chartType = useWidgetStore((s) => s.chartTypes["alerts-by-model"] ?? "horizontal_bar");
  const visible = useWidgetStore((s) => s.visibility["alerts-by-model"] ?? true);
  const toggle = useWidgetStore((s) => s.toggleWidget);
  const setType = useWidgetStore((s) => s.setChartType);
  return (
    <WidgetContainer
      id="alerts-by-model" title="Alerts by Model" visible={visible}
      onToggle={() => toggle("alerts-by-model")} dataTour="dashboard-by-model"
      dataTrace="dashboard.alerts-by-model"
      chartTypeSwitcher={
        <ChartTypeSwitcher chartId="alerts-by-model" currentType={chartType}
          options={["horizontal_bar", "bar", "line", "pie", "table"]}
          onChange={(t) => setType("alerts-by-model", t)} />
      }
    >
      <AlertsByModelChart data={data} chartType={chartType} />
    </WidgetContainer>
  );
}

function FallbackScoreWidget({ data }: { data: { bucket: number; cnt: number }[] }) {
  const chartType = useWidgetStore((s) => s.chartTypes["score-distribution"] ?? "bar");
  const visible = useWidgetStore((s) => s.visibility["score-distribution"] ?? true);
  const toggle = useWidgetStore((s) => s.toggleWidget);
  const setType = useWidgetStore((s) => s.setChartType);
  return (
    <WidgetContainer
      id="score-distribution" title="Score Distribution" visible={visible}
      onToggle={() => toggle("score-distribution")} dataTour="dashboard-scores"
      dataTrace="dashboard.score-distribution"
      chartTypeSwitcher={
        <ChartTypeSwitcher chartId="score-distribution" currentType={chartType}
          options={["bar", "horizontal_bar", "line", "table"]}
          onChange={(t) => setType("score-distribution", t)} />
      }
    >
      <ScoreDistributionChart data={data} chartType={chartType} />
    </WidgetContainer>
  );
}

function FallbackTriggerWidget({ data }: { data: { trigger_path: string; cnt: number }[] }) {
  const chartType = useWidgetStore((s) => s.chartTypes["alerts-by-trigger"] ?? "horizontal_bar");
  const visible = useWidgetStore((s) => s.visibility["alerts-by-trigger"] ?? true);
  const toggle = useWidgetStore((s) => s.toggleWidget);
  const setType = useWidgetStore((s) => s.setChartType);
  return (
    <WidgetContainer
      id="alerts-by-trigger" title="Alerts by Trigger Path" visible={visible}
      onToggle={() => toggle("alerts-by-trigger")} dataTour="dashboard-triggers"
      dataTrace="dashboard.alerts-by-trigger"
      chartTypeSwitcher={
        <ChartTypeSwitcher chartId="alerts-by-trigger" currentType={chartType}
          options={["horizontal_bar", "bar", "line", "pie", "table"]}
          onChange={(t) => setType("alerts-by-trigger", t)} />
      }
    >
      <AlertsByTriggerChart data={data} chartType={chartType} />
    </WidgetContainer>
  );
}

function FallbackAssetWidget({ data }: { data: { asset_class: string; cnt: number }[] }) {
  const chartType = useWidgetStore((s) => s.chartTypes["alerts-by-asset"] ?? "pie");
  const visible = useWidgetStore((s) => s.visibility["alerts-by-asset"] ?? true);
  const toggle = useWidgetStore((s) => s.toggleWidget);
  const setType = useWidgetStore((s) => s.setChartType);
  return (
    <WidgetContainer
      id="alerts-by-asset" title="Alerts by Asset Class" visible={visible}
      onToggle={() => toggle("alerts-by-asset")}
      dataTrace="dashboard.alerts-by-asset"
      chartTypeSwitcher={
        <ChartTypeSwitcher chartId="alerts-by-asset" currentType={chartType}
          options={["pie", "bar", "horizontal_bar", "line", "table"]}
          onChange={(t) => setType("alerts-by-asset", t)} />
      }
    >
      <AlertsByAssetChart data={data} chartType={chartType} />
    </WidgetContainer>
  );
}

/* ---------- Widget config panel ---------- */

function WidgetConfigPanel({ widgets }: { widgets: readonly { id: string; label: string }[] }) {
  const { isVisible, toggleWidget } = useWidgetStore();
  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
        Widget Visibility
      </div>
      <div className="grid grid-cols-2 gap-2">
        {widgets.map((w) => (
          <label key={w.id} className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
            <button
              role="switch"
              aria-checked={isVisible(w.id)}
              onClick={() => toggleWidget(w.id)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                isVisible(w.id) ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  isVisible(w.id) ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </button>
            {w.label}
          </label>
        ))}
      </div>
    </div>
  );
}
