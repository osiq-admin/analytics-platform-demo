import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { SettingDef } from "../../stores/metadataStore.ts";

interface SettingDetailProps {
  setting: SettingDef & {
    match_type?: string;
    overrides?: Array<{
      match: Record<string, string>;
      value: unknown;
      priority: number;
    }>;
  };
}

interface ScoreStep {
  min_value: number | null;
  max_value: number | null;
  score: number;
}

export default function SettingDetail({ setting }: SettingDetailProps) {
  const isScoreSteps =
    setting.value_type === "score_steps" && Array.isArray(setting.default);
  const steps = isScoreSteps ? (setting.default as ScoreStep[]) : [];

  return (
    <div className="flex flex-col gap-3 overflow-auto">
      <div>
        <h3 className="text-base font-semibold">{setting.name}</h3>
        <div className="flex gap-2 mt-2">
          <StatusBadge label={setting.value_type} variant="info" />
          {setting.match_type && (
            <StatusBadge label={setting.match_type} variant="muted" />
          )}
        </div>
      </div>

      {/* Default value */}
      <Panel title="Default Value" dataTour="settings-score-steps" tooltip="Default value or score step configuration">
        {isScoreSteps ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-1">Min</th>
                <th className="pb-1">Max</th>
                <th className="pb-1">Score</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1">{step.min_value ?? "-inf"}</td>
                  <td className="py-1">{step.max_value ?? "+inf"}</td>
                  <td className="py-1 font-mono text-accent">{step.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className="text-sm font-mono">{JSON.stringify(setting.default)}</span>
        )}
      </Panel>

      {/* Overrides */}
      {setting.overrides && setting.overrides.length > 0 && (
        <Panel title={`Overrides (${setting.overrides.length})`}>
          <div className="space-y-2">
            {setting.overrides.map((ov, i) => (
              <div
                key={i}
                className="p-2 rounded border border-border/50 bg-background text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex gap-1">
                    {Object.entries(ov.match).map(([k, v]) => (
                      <StatusBadge
                        key={k}
                        label={`${k}=${v}`}
                        variant="warning"
                      />
                    ))}
                  </div>
                  <span className="text-muted">P{ov.priority}</span>
                </div>
                <div className="font-mono text-foreground">
                  {Array.isArray(ov.value)
                    ? `[${(ov.value as ScoreStep[]).length} steps]`
                    : String(ov.value)}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
