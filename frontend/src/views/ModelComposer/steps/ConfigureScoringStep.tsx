import { useState, useEffect, useCallback } from "react";
import type { SelectedCalc } from "./SelectCalcsStep.tsx";
import type { CalculationDef, ScoreStepDef } from "../../../stores/metadataStore.ts";
import SuggestionInput from "../../../components/SuggestionInput.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import ScoreStepBuilder from "../../../components/ScoreStepBuilder.tsx";
import Tooltip from "../../../components/Tooltip.tsx";

interface ConfigureScoringStepProps {
  selectedCalcs: SelectedCalc[];
  setSelectedCalcs: (calcs: SelectedCalc[]) => void;
  scoreThresholdSetting: string;
  setScoreThresholdSetting: (s: string) => void;
  calculations: CalculationDef[];
}

interface SettingOption {
  setting_id: string;
  name: string;
  value_type: string;
  default: unknown;
}

export default function ConfigureScoringStep({
  selectedCalcs,
  setSelectedCalcs,
  scoreThresholdSetting,
  setScoreThresholdSetting,
  calculations,
}: ConfigureScoringStepProps) {
  const [decimalSettings, setDecimalSettings] = useState<string[]>([]);
  const [scoreStepsSettings, setScoreStepsSettings] = useState<string[]>([]);
  const [settingDefaults, setSettingDefaults] = useState<Record<string, ScoreStepDef[] | number | string | null>>({});

  // Fetch decimal settings
  useEffect(() => {
    fetch("/api/metadata/domain-values/setting-ids?value_type=decimal")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const ids = data.settings.map((s: SettingOption) => s.setting_id);
          setDecimalSettings(ids);
          // Store defaults
          const defaults: Record<string, ScoreStepDef[] | number | string | null> = {};
          for (const s of data.settings as SettingOption[]) {
            defaults[s.setting_id] = s.default as number | string | null;
          }
          setSettingDefaults((prev) => ({ ...prev, ...defaults }));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch score_steps settings
  useEffect(() => {
    fetch("/api/metadata/domain-values/setting-ids?value_type=score_steps")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const ids = data.settings.map((s: SettingOption) => s.setting_id);
          setScoreStepsSettings(ids);
          // Store defaults
          const defaults: Record<string, ScoreStepDef[] | number | string | null> = {};
          for (const s of data.settings as SettingOption[]) {
            defaults[s.setting_id] = s.default as ScoreStepDef[];
          }
          setSettingDefaults((prev) => ({ ...prev, ...defaults }));
        }
      })
      .catch(() => {});
  }, []);

  const calcMap = new Map<string, CalculationDef>(
    calculations.map((c) => [c.calc_id, c]),
  );

  const updateCalc = useCallback(
    (calcId: string, updates: Partial<SelectedCalc>) => {
      setSelectedCalcs(
        selectedCalcs.map((c) =>
          c.calc_id === calcId ? { ...c, ...updates } : c,
        ),
      );
    },
    [selectedCalcs, setSelectedCalcs],
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">Step 3: Configure Scoring</h3>

      {/* Per-calculation scoring cards */}
      <div className="flex flex-col gap-3 overflow-auto max-h-[50vh]">
        {selectedCalcs.map((sc) => {
          const calc = calcMap.get(sc.calc_id);
          const scoreStepsDefault = sc.score_steps_setting
            ? settingDefaults[sc.score_steps_setting]
            : null;

          return (
            <div
              key={sc.calc_id}
              className="p-3 rounded border border-border bg-surface"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-foreground">
                  {calc?.name ?? sc.calc_id}
                </span>
                <StatusBadge
                  label={sc.strictness}
                  variant={sc.strictness === "MUST_PASS" ? "error" : "warning"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Threshold Setting */}
                <SuggestionInput
                  label="Threshold Setting"
                  tooltip="A decimal setting that defines the pass/fail threshold for this calculation"
                  value={sc.threshold_setting ?? ""}
                  onChange={(v) => updateCalc(sc.calc_id, { threshold_setting: v as string })}
                  suggestions={decimalSettings}
                  placeholder="Select threshold setting..."
                  allowFreeform
                />

                {/* Score Steps Setting */}
                <SuggestionInput
                  label="Score Steps Setting"
                  tooltip="A score_steps setting that maps calculation values to risk scores"
                  value={sc.score_steps_setting ?? ""}
                  onChange={(v) => updateCalc(sc.calc_id, { score_steps_setting: v as string })}
                  suggestions={scoreStepsSettings}
                  placeholder="Select score steps..."
                  allowFreeform
                />
              </div>

              {/* Value Field */}
              <div className="mt-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                    Value Field
                    <Tooltip content="The output field from the calculation used for scoring" placement="right">
                      <span className="text-muted/60 cursor-help">?</span>
                    </Tooltip>
                  </span>
                  <input
                    className="px-2 py-1.5 rounded border border-border bg-surface text-foreground text-xs focus:border-accent outline-none transition-colors"
                    value={sc.value_field ?? calc?.value_field ?? ""}
                    onChange={(e) => updateCalc(sc.calc_id, { value_field: e.target.value })}
                    placeholder={calc?.value_field || "value_field"}
                  />
                </label>
              </div>

              {/* Score Steps Preview */}
              {sc.score_steps_setting && scoreStepsDefault && Array.isArray(scoreStepsDefault) && (
                <div className="mt-3">
                  <div className="text-[11px] font-medium text-muted mb-1">Score Steps Preview</div>
                  <ScoreStepBuilder
                    value={scoreStepsDefault as ScoreStepDef[]}
                    onChange={() => {}}
                    readOnly
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alert Threshold */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-semibold text-foreground">Alert Threshold</span>
          <Tooltip content="Minimum accumulated score to generate an alert. The sum of all calculation scores must exceed this threshold." placement="right">
            <span className="text-muted/60 text-xs cursor-help">?</span>
          </Tooltip>
        </div>
        <SuggestionInput
          label="Score Threshold Setting"
          tooltip="A decimal setting that defines the minimum total score to trigger an alert"
          value={scoreThresholdSetting}
          onChange={(v) => setScoreThresholdSetting(v as string)}
          suggestions={decimalSettings}
          placeholder="Select score threshold setting..."
          allowFreeform
        />
      </div>
    </div>
  );
}
