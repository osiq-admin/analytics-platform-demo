import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import Panel from "../../../components/Panel.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import type { AlertTrace } from "../../../stores/alertStore.ts";

interface ScoreBreakdownProps {
  alert: AlertTrace;
}

/** Format snake_case to Title Case */
function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ScoreBreakdown({ alert }: ScoreBreakdownProps) {
  const data = alert.calculation_scores.map((cs) => ({
    name: formatLabel(cs.calc_id),
    score: cs.score,
    strictness: cs.strictness,
    passed: cs.threshold_passed,
  }));

  return (
    <Panel title="Score Breakdown">
      <div className="space-y-3">
        {/* Bar chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
              <ReferenceLine
                y={alert.score_threshold}
                stroke="var(--color-destructive)"
                strokeDasharray="3 3"
                label={{ value: "Threshold", fontSize: 10, fill: "var(--color-destructive)" }}
              />
              <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.strictness === "MUST_PASS"
                        ? entry.passed
                          ? "var(--color-success)"
                          : "var(--color-destructive)"
                        : "var(--color-accent)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detail table */}
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="pb-1">Calculation</th>
              <th className="pb-1">Strictness</th>
              <th className="pb-1">Score</th>
              <th className="pb-1">Passed</th>
            </tr>
          </thead>
          <tbody>
            {alert.calculation_scores.map((cs) => (
              <tr key={cs.calc_id} className="border-b border-border/50">
                <td className="py-1">{formatLabel(cs.calc_id)}</td>
                <td className="py-1">
                  <StatusBadge
                    label={cs.strictness}
                    variant={
                      cs.strictness === "MUST_PASS" ? "error" : "warning"
                    }
                  />
                </td>
                <td className="py-1 font-mono text-accent">{cs.score}</td>
                <td className="py-1">
                  {cs.threshold_passed ? (
                    <span className="text-success">Yes</span>
                  ) : (
                    <span className="text-destructive">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td className="py-1 font-semibold text-foreground">Total</td>
              <td />
              <td className="py-1 font-mono font-semibold text-accent">{alert.accumulated_score}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        {/* Summary */}
        <div className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border">
          <span className="text-muted">Accumulated Score</span>
          <span className="font-mono text-lg text-accent">
            {alert.accumulated_score}
          </span>
        </div>
      </div>
    </Panel>
  );
}
