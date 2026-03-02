import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel } from "../../utils/format.ts";
import {
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
  TICK_STYLE,
} from "../../constants/chartStyles.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventRecord {
  event_id: string;
  event_type: string;
  timestamp: string;
  actor: string;
  entity: string;
  tier: string;
  details: Record<string, unknown>;
}

interface ChainResult {
  date: string;
  valid: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  "pipeline_execution",
  "quality_check",
  "data_access",
  "alert_action",
  "metadata_change",
  "masking_unmask",
];

const BAR_COLORS = [
  "var(--color-accent)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
  "var(--color-destructive)",
  "var(--color-muted)",
];

function eventTypeVariant(et: string): "info" | "warning" | "error" | "success" | "muted" {
  switch (et) {
    case "pipeline_execution":
      return "info";
    case "quality_check":
      return "success";
    case "data_access":
      return "muted";
    case "alert_action":
      return "warning";
    case "metadata_change":
      return "info";
    case "masking_unmask":
      return "error";
    default:
      return "muted";
  }
}

function last7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ---------------------------------------------------------------------------
// ObservabilityTab
// ---------------------------------------------------------------------------

export default function ObservabilityTab() {
  // --- Event log state ---
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // --- Chain integrity state ---
  const [chainResults, setChainResults] = useState<ChainResult[]>([]);
  const [chainLoading, setChainLoading] = useState(true);

  // --- Stats state ---
  const [stats, setStats] = useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // --- Fetch events ---
  const fetchEvents = useCallback(() => {
    setEventsLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (dateFilter) params.set("date", dateFilter);
    const qs = params.toString();
    api
      .get<EventRecord[]>(`/observability/events${qs ? `?${qs}` : ""}`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [typeFilter, dateFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- Fetch chain integrity ---
  useEffect(() => {
    setChainLoading(true);
    const dates = last7Days();
    Promise.all(
      dates.map((d) =>
        api
          .get<ChainResult>(`/observability/chain/verify/${d}`)
          .catch(() => ({ date: d, valid: false }))
      )
    )
      .then(setChainResults)
      .finally(() => setChainLoading(false));
  }, []);

  // --- Fetch stats ---
  useEffect(() => {
    setStatsLoading(true);
    api
      .get<Record<string, number>>("/observability/stats")
      .then(setStats)
      .catch(() => setStats({}))
      .finally(() => setStatsLoading(false));
  }, []);

  // --- Chart data ---
  const chartData = useMemo(
    () =>
      Object.entries(stats).map(([event_type, count]) => ({
        event_type,
        label: formatLabel(event_type),
        count,
      })),
    [stats]
  );

  const verifiedCount = chainResults.filter((c) => c.valid).length;

  // --- Summarise details dict to a single line ---
  const summariseDetails = (details: Record<string, unknown>): string => {
    const entries = Object.entries(details);
    if (entries.length === 0) return "--";
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Row 1: Chain Integrity + Event Distribution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hash chain integrity */}
        <Panel
          title="Hash Chain Integrity"
          dataTour="governance-observability-chain"
          dataTrace="governance.observability-chain"
        >
          {chainLoading ? (
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted">
                Chain integrity:{" "}
                <span
                  className={
                    verifiedCount === chainResults.length
                      ? "text-success font-semibold"
                      : "text-warning font-semibold"
                  }
                >
                  {verifiedCount}/{chainResults.length} days verified
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {chainResults.map((cr) => (
                  <div
                    key={cr.date}
                    className="flex items-center gap-1 border border-border rounded px-2 py-1"
                  >
                    <span className="text-[10px] text-muted font-mono">{cr.date}</span>
                    <span
                      className={cr.valid ? "text-success text-sm" : "text-destructive text-sm"}
                      aria-label={cr.valid ? "Verified" : "Failed"}
                    >
                      {cr.valid ? "\u2713" : "\u2717"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Event distribution chart */}
        <Panel
          title="Event Distribution"
          dataTour="governance-observability-stats"
          dataTrace="governance.observability-stats"
        >
          {statsLoading ? (
            <div className="flex items-center justify-center h-40">
              <LoadingSpinner size="md" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-muted text-xs">No event data available.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={TICK_STYLE}
                  />
                  <YAxis tick={TICK_STYLE} allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                  />
                  <Bar
                    dataKey="count"
                    name="Count"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={entry.event_type}
                        fill={BAR_COLORS[i % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Row 2: Event Log Table ── */}
      <Panel
        title={`Event Log (${events.length})`}
        dataTour="governance-observability-events"
        dataTrace="governance.observability-events"
      >
        {/* Filters */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-muted">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
          >
            <option value="">All</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatLabel(t)}
              </option>
            ))}
          </select>

          <label className="text-xs text-muted">Date:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
          />
          {(typeFilter || dateFilter) && (
            <button
              onClick={() => {
                setTypeFilter("");
                setDateFilter("");
              }}
              className="px-2 py-1 text-[10px] rounded border border-border text-muted hover:text-foreground hover:border-border-hover transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="md" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-muted text-xs">No events found.</p>
        ) : (
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border sticky top-0 bg-surface">
                  <th className="text-left py-1.5 px-2">Timestamp</th>
                  <th className="text-left py-1.5 px-2">Event Type</th>
                  <th className="text-left py-1.5 px-2">Actor</th>
                  <th className="text-left py-1.5 px-2">Entity</th>
                  <th className="text-left py-1.5 px-2">Tier</th>
                  <th className="text-left py-1.5 px-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr
                    key={ev.event_id}
                    className="border-b border-border/50 hover:bg-surface-hover"
                  >
                    <td className="py-1.5 px-2 text-muted text-[10px] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2">
                      <StatusBadge
                        label={formatLabel(ev.event_type)}
                        variant={eventTypeVariant(ev.event_type)}
                      />
                    </td>
                    <td className="py-1.5 px-2 text-[10px]">{ev.actor}</td>
                    <td className="py-1.5 px-2 font-mono text-[10px]">
                      {ev.entity || "--"}
                    </td>
                    <td className="py-1.5 px-2">
                      {ev.tier ? (
                        <StatusBadge label={ev.tier} variant="info" />
                      ) : (
                        <span className="text-muted text-[10px]">--</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-[10px] text-muted max-w-xs truncate">
                      {summariseDetails(ev.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
