import { useState, useEffect } from "react";
import type { SettingOverride, ScoreStepDef } from "../../stores/metadataStore.ts";
import SuggestionInput from "../../components/SuggestionInput.tsx";
import MatchPatternPicker from "../../components/MatchPatternPicker.tsx";
import ScoreStepBuilder from "../../components/ScoreStepBuilder.tsx";
import Tooltip from "../../components/Tooltip.tsx";

interface EditorProps {
  value: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

const VALUE_TYPES = ["decimal", "integer", "string", "boolean", "score_steps", "list"];
const MATCH_TYPES = ["hierarchy", "multi_dimensional"];

const inputCls =
  "px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm w-full";
const labelCls = "text-sm text-[var(--color-text)] font-medium";
const btnCls =
  "px-3 py-1.5 rounded text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors";
const btnDangerCls =
  "px-2 py-1 rounded text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors";

/** Render a type-aware value input */
function ValueInput({
  valueType,
  currentValue,
  onValueChange,
  className,
}: {
  valueType: string;
  currentValue: unknown;
  onValueChange: (v: unknown) => void;
  className?: string;
}) {
  const cls = className ?? inputCls;

  if (valueType === "boolean") {
    return (
      <div className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          checked={!!currentValue}
          onChange={(e) => onValueChange(e.target.checked)}
          className="accent-[var(--color-accent)]"
        />
        <span className="text-sm text-[var(--color-text)]">
          {currentValue ? "true" : "false"}
        </span>
      </div>
    );
  }

  if (valueType === "decimal" || valueType === "integer") {
    return (
      <input
        type="number"
        className={cls}
        value={currentValue != null ? String(currentValue) : ""}
        step={valueType === "decimal" ? "0.01" : "1"}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onValueChange(null);
          } else {
            onValueChange(valueType === "integer" ? parseInt(raw, 10) : parseFloat(raw));
          }
        }}
        placeholder={valueType === "decimal" ? "0.00" : "0"}
      />
    );
  }

  // string / score_steps / list — just text
  return (
    <input
      className={cls}
      value={currentValue != null ? String(currentValue) : ""}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder="Value"
    />
  );
}

export default function SettingsEditor({ value, onChange }: EditorProps) {
  const valueType = String(value.value_type ?? "string");
  const overrides = (value.overrides as SettingOverride[] | undefined) ?? [];

  const update = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...value, ...patch });
  };

  // Fetch match keys for SuggestionInput domain values
  const [matchKeysData, setMatchKeysData] = useState<Array<{ key: string; entity: string; domain_values: string[] | null }>>([]);
  useEffect(() => {
    fetch("/api/metadata/domain-values/match-keys")
      .then((r) => r.json())
      .then((d) => setMatchKeysData(d.match_keys || []))
      .catch(() => {});
  }, []);
  const matchKeyNames = [...new Set(matchKeysData.map((mk) => mk.key))];

  /* ── Override helpers ── */
  const updateOverride = (idx: number, patch: Partial<SettingOverride>) => {
    const next = overrides.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    update({ overrides: next });
  };

  const addOverride = () => {
    const newOvr: SettingOverride = {
      match: {},
      value: valueType === "boolean" ? false : valueType === "decimal" || valueType === "integer" ? 0 : "",
      priority: overrides.length + 1,
    };
    update({ overrides: [...overrides, newOvr] });
  };

  const removeOverride = (idx: number) => {
    update({ overrides: overrides.filter((_, i) => i !== idx) });
  };

  /* ── Match pattern helpers ── */
  const updateMatchKey = (ovrIdx: number, oldKey: string, newKey: string, val: string) => {
    const ovr = overrides[ovrIdx];
    const entries = Object.entries(ovr.match).map(([k, v]) =>
      k === oldKey ? [newKey, val] : [k, v]
    );
    updateOverride(ovrIdx, { match: Object.fromEntries(entries) });
  };

  const addMatchKey = (ovrIdx: number) => {
    const ovr = overrides[ovrIdx];
    updateOverride(ovrIdx, { match: { ...ovr.match, "": "" } });
  };

  const removeMatchKey = (ovrIdx: number, key: string) => {
    const ovr = overrides[ovrIdx];
    const copy = { ...ovr.match };
    delete copy[key];
    updateOverride(ovrIdx, { match: copy });
  };

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* ── Name ── */}
      <div>
        <Tooltip content="Display name for the setting">
          <label className={labelCls}>Name</label>
        </Tooltip>
        <input
          className={inputCls}
          value={String(value.name ?? "")}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Setting name"
        />
      </div>

      {/* ── Description ── */}
      <div>
        <Tooltip content="Purpose of this setting">
          <label className={labelCls}>Description</label>
        </Tooltip>
        <input
          className={inputCls}
          value={String(value.description ?? "")}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Setting description"
        />
      </div>

      {/* ── Value Type ── */}
      <div>
        <Tooltip content="Data type for the setting value">
          <label className={labelCls}>Value Type</label>
        </Tooltip>
        <select
          className={inputCls}
          value={valueType}
          onChange={(e) => update({ value_type: e.target.value })}
        >
          {VALUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* ── Match Type ── */}
      <div>
        <Tooltip content="How overrides are matched to context">
          <label className={labelCls}>Match Type</label>
        </Tooltip>
        <select
          className={inputCls}
          value={String(value.match_type ?? "hierarchy")}
          onChange={(e) => update({ match_type: e.target.value })}
        >
          {MATCH_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* ── Default Value ── */}
      <div>
        <Tooltip content="Value when no override matches">
          <label className={labelCls}>Default Value</label>
        </Tooltip>
        {valueType === "score_steps" ? (
          <ScoreStepBuilder
            value={
              Array.isArray(value.default)
                ? (value.default as ScoreStepDef[])
                : []
            }
            onChange={(steps) => update({ default: steps })}
          />
        ) : (
          <ValueInput
            valueType={valueType}
            currentValue={value.default}
            onValueChange={(v) => update({ default: v })}
          />
        )}
      </div>

      {/* ── Overrides ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Tooltip content="Context-specific value overrides">
            <span className={labelCls}>Overrides ({overrides.length})</span>
          </Tooltip>
          <button className={btnCls} onClick={addOverride}>
            + Add Override
          </button>
        </div>

        {overrides.map((ovr, idx) => (
          <div
            key={idx}
            className="border border-[var(--color-border)] rounded p-3 space-y-3 bg-[var(--color-surface)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text)] opacity-70">
                Override #{idx + 1}
              </span>
              <button className={btnDangerCls} onClick={() => removeOverride(idx)}>
                Remove
              </button>
            </div>

            {/* Match Pattern Picker */}
            <MatchPatternPicker
              onSelect={(match) => updateOverride(idx, { match })}
              currentMatch={ovr.match}
            />

            {/* Match Patterns */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text)] opacity-70">Match Patterns</span>
                <button
                  className="text-xs text-[var(--color-accent)] hover:underline"
                  onClick={() => addMatchKey(idx)}
                >
                  + Add
                </button>
              </div>
              {Object.entries(ovr.match).map(([k, v], mIdx) => (
                <div key={mIdx} className="flex items-center gap-2">
                  <SuggestionInput
                    value={k}
                    onChange={(newKey) => updateMatchKey(idx, k, Array.isArray(newKey) ? newKey[0] || "" : newKey, v)}
                    suggestions={matchKeyNames}
                    placeholder="key (e.g. asset_class)"
                    allowFreeform={true}
                    className="flex-1"
                  />
                  <span className="text-xs text-[var(--color-text)] opacity-50">=</span>
                  <SuggestionInput
                    value={v}
                    onChange={(newVal) => updateMatchKey(idx, k, k, Array.isArray(newVal) ? newVal[0] || "" : newVal)}
                    entityId={matchKeysData.find((mk) => mk.key === k)?.entity}
                    fieldName={k}
                    placeholder="value"
                    allowFreeform={true}
                    className="flex-1"
                  />
                  <button className={btnDangerCls} onClick={() => removeMatchKey(idx, k)}>
                    &times;
                  </button>
                </div>
              ))}
              {Object.keys(ovr.match).length === 0 && (
                <p className="text-xs text-[var(--color-text)] opacity-40 italic">
                  No match patterns. Click &quot;+ Add&quot; to specify criteria.
                </p>
              )}
            </div>

            {/* Override Value */}
            <div>
              <label className="text-xs text-[var(--color-text)] opacity-70">Value</label>
              {valueType === "score_steps" ? (
                <ScoreStepBuilder
                  value={
                    Array.isArray(ovr.value)
                      ? (ovr.value as ScoreStepDef[])
                      : []
                  }
                  onChange={(steps) => updateOverride(idx, { value: steps })}
                />
              ) : (
                <ValueInput
                  valueType={valueType}
                  currentValue={ovr.value}
                  onValueChange={(v) => updateOverride(idx, { value: v })}
                />
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-[var(--color-text)] opacity-70">Priority</label>
              <input
                type="number"
                className={inputCls}
                value={ovr.priority}
                onChange={(e) => updateOverride(idx, { priority: parseInt(e.target.value, 10) || 0 })}
                min={0}
                step={1}
              />
            </div>
          </div>
        ))}

        {overrides.length === 0 && (
          <p className="text-xs text-[var(--color-text)] opacity-50 italic">
            No overrides defined. The default value will be used everywhere.
          </p>
        )}
      </div>
    </div>
  );
}
