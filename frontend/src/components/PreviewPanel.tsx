import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CalculationDef } from "../stores/metadataStore.ts";

interface PreviewPanelProps {
  selectedCalcs: Array<{
    calc_id: string;
    strictness: string;
    score_steps_setting?: string;
    value_field?: string;
  }>;
  scoreThresholdSetting: string;
  calculations: CalculationDef[];
}

const COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export default function PreviewPanel({
  selectedCalcs,
  scoreThresholdSetting,
  calculations,
}: PreviewPanelProps) {
  const calcMap = useMemo(
    () => new Map(calculations.map((c) => [c.calc_id, c])),
    [calculations],
  );

  const chartData = useMemo(() => {
    return selectedCalcs.map((sc) => {
      const calc = calcMap.get(sc.calc_id);
      return {
        name: calc?.name ?? sc.calc_id,
        maxScore: 10,
        strictness: sc.strictness,
      };
    });
  }, [selectedCalcs, calcMap]);

  const totalMaxScore = chartData.length * 10;

  // Stacked contribution data for horizontal bar
  const contributionData = useMemo(() => {
    if (selectedCalcs.length === 0) return [];
    const row: Record<string, string | number> = { name: "Score" };
    selectedCalcs.forEach((sc) => {
      const calc = calcMap.get(sc.calc_id);
      row[calc?.name ?? sc.calc_id] = 10;
    });
    return [row];
  }, [selectedCalcs, calcMap]);

  if (selectedCalcs.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted">
        Select calculations to see score preview
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Score simulation bar chart */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2">
          Max Score per Calculation
        </h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fontSize: 9, fill: "var(--color-muted)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--color-foreground)",
                }}
              />
              <Bar dataKey="maxScore" radius={[0, 3, 3, 0]}>
                {chartData.map((_entry, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stacked contribution bar */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2">
          Contribution Breakdown
        </h4>
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contributionData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--color-foreground)",
                }}
              />
              {selectedCalcs.map((sc, idx) => {
                const calc = calcMap.get(sc.calc_id);
                return (
                  <Bar
                    key={sc.calc_id}
                    dataKey={calc?.name ?? sc.calc_id}
                    stackId="a"
                    fill={COLORS[idx % COLORS.length]}
                    radius={
                      idx === 0 && idx === selectedCalcs.length - 1
                        ? [3, 3, 3, 3]
                        : idx === 0
                          ? [3, 0, 0, 3]
                          : idx === selectedCalcs.length - 1
                            ? [0, 3, 3, 0]
                            : [0, 0, 0, 0]
                    }
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data coverage note */}
      <div className="text-xs text-muted border-t border-border pt-2 space-y-1">
        <p>
          <span className="font-medium text-foreground">{selectedCalcs.length}</span> of{" "}
          <span className="font-medium text-foreground">{calculations.length}</span> calculations
          configured.
        </p>
        <p>
          Total max possible score:{" "}
          <span className="font-medium text-foreground">{totalMaxScore}</span>
        </p>
        {scoreThresholdSetting && (
          <p>
            Threshold setting:{" "}
            <span className="font-medium text-accent">{scoreThresholdSetting}</span>
          </p>
        )}
      </div>
    </div>
  );
}
