import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import ScoreStepBuilder from "../../components/ScoreStepBuilder.tsx";
import type { SettingDef, ScoreStepDef } from "../../stores/metadataStore.ts";

interface SettingDetailProps {
  setting: SettingDef & {
    match_type?: string;
    overrides?: Array<{
      match: Record<string, string>;
      value: unknown;
      priority: number;
    }>;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

interface ScoreStep {
  min_value: number | null;
  max_value: number | null;
  score: number;
}

export default function SettingDetail({ setting, onEdit, onDelete }: SettingDetailProps) {
  const isScoreSteps =
    setting.value_type === "score_steps" && Array.isArray(setting.default);
  const steps = isScoreSteps ? (setting.default as ScoreStep[]) : [];
  // Convert to ScoreStepDef for ScoreStepBuilder (coerce nullable min_value to number)
  const scoreStepDefs: ScoreStepDef[] = steps.map((s) => ({
    min_value: s.min_value ?? 0,
    max_value: s.max_value,
    score: s.score,
  }));

  return (
    <div className="flex flex-col gap-3 overflow-auto">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{setting.name}</h3>
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-2 shrink-0">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-xs rounded font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
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
          <ScoreStepBuilder
            value={scoreStepDefs}
            onChange={() => {}}
            readOnly
          />
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
