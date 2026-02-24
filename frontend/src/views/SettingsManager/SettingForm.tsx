import { useState } from "react";
import type { SettingDef, SettingOverride } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";

interface SettingFormProps {
  setting: SettingDef;
  isNew: boolean;
  onSave: (setting: SettingDef) => Promise<void>;
  onCancel: () => void;
}

const VALUE_TYPES = ["decimal", "integer", "string", "boolean", "score_steps", "list"];
const MATCH_TYPES = ["hierarchy", "multi_dimensional"];

const inputCls =
  "px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs w-full";
const btnCls =
  "px-3 py-1.5 rounded text-xs font-medium border border-border bg-surface text-foreground hover:bg-background transition-colors";

export default function SettingForm({ setting, isNew, onSave, onCancel }: SettingFormProps) {
  const [settingId, setSettingId] = useState(setting.setting_id);
  const [name, setName] = useState(setting.name);
  const [description, setDescription] = useState(setting.description ?? "");
  const [valueType, setValueType] = useState(setting.value_type);
  const [matchType, setMatchType] = useState(setting.match_type ?? "hierarchy");
  const [defaultValue, setDefaultValue] = useState(
    typeof setting.default === "object" ? JSON.stringify(setting.default) : String(setting.default ?? "")
  );
  const [overrides, setOverrides] = useState<SettingOverride[]>(setting.overrides ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseDefault = (raw: string): unknown => {
    if (valueType === "decimal") return parseFloat(raw) || 0;
    if (valueType === "integer") return parseInt(raw, 10) || 0;
    if (valueType === "boolean") return raw === "true";
    if (valueType === "score_steps" || valueType === "list") {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  };

  const addOverride = () => {
    setOverrides((prev) => [
      ...prev,
      { match: {}, value: parseDefault("0"), priority: prev.length + 1 },
    ]);
  };

  const updateOverride = (idx: number, patch: Partial<SettingOverride>) => {
    setOverrides((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const removeOverride = (idx: number) => {
    setOverrides((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMatchKey = (ovrIdx: number) => {
    const ovr = overrides[ovrIdx];
    updateOverride(ovrIdx, { match: { ...ovr.match, "": "" } });
  };

  const updateMatchKey = (ovrIdx: number, oldKey: string, newKey: string, val: string) => {
    const ovr = overrides[ovrIdx];
    const entries = Object.entries(ovr.match).map(([k, v]) =>
      k === oldKey ? [newKey, val] : [k, v]
    );
    updateOverride(ovrIdx, { match: Object.fromEntries(entries) });
  };

  const removeMatchKey = (ovrIdx: number, key: string) => {
    const ovr = overrides[ovrIdx];
    const copy = { ...ovr.match };
    delete copy[key];
    updateOverride(ovrIdx, { match: copy });
  };

  const handleSave = async () => {
    if (!settingId || !name) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        setting_id: settingId,
        name,
        description,
        value_type: valueType,
        match_type: matchType,
        default: parseDefault(defaultValue),
        overrides,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 overflow-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {isNew ? "New Setting" : `Edit: ${setting.name}`}
        </h3>
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        {/* Setting ID */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Setting ID</span>
          <input
            className={inputCls}
            value={settingId}
            onChange={(e) => setSettingId(e.target.value)}
            placeholder="e.g. my_setting"
            disabled={!isNew}
          />
        </label>

        {/* Name */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Name</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Setting name"
          />
        </label>

        {/* Description */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Description</span>
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Setting description"
          />
        </label>

        {/* Value Type */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Value Type</span>
          <select
            className={inputCls}
            value={valueType}
            onChange={(e) => setValueType(e.target.value)}
          >
            {VALUE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {/* Match Type */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Match Type</span>
          <select
            className={inputCls}
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
          >
            {MATCH_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {/* Default Value */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Default Value</span>
          <input
            className={inputCls}
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            placeholder={valueType === "decimal" ? "0.00" : "value"}
          />
        </label>

        {/* Overrides */}
        <Panel
          title={`Overrides (${overrides.length})`}
          actions={
            <button className={btnCls} onClick={addOverride}>
              + Add Override
            </button>
          }
        >
          {overrides.length === 0 ? (
            <p className="text-xs text-muted italic">No overrides defined.</p>
          ) : (
            <div className="space-y-2">
              {overrides.map((ovr, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border border-border bg-background text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">Override #{idx + 1}</span>
                    <button
                      onClick={() => removeOverride(idx)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Match patterns */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Match Patterns</span>
                      <button
                        className="text-xs text-accent hover:underline"
                        onClick={() => addMatchKey(idx)}
                      >
                        + Add
                      </button>
                    </div>
                    {Object.entries(ovr.match).map(([k, v], mIdx) => (
                      <div key={mIdx} className="flex items-center gap-1">
                        <input
                          className="px-1 py-0.5 rounded border border-border bg-surface text-foreground text-xs flex-1"
                          value={k}
                          onChange={(e) => updateMatchKey(idx, k, e.target.value, v)}
                          placeholder="key"
                        />
                        <span className="text-muted">=</span>
                        <input
                          className="px-1 py-0.5 rounded border border-border bg-surface text-foreground text-xs flex-1"
                          value={v}
                          onChange={(e) => updateMatchKey(idx, k, k, e.target.value)}
                          placeholder="value"
                        />
                        <button
                          className="text-red-400 hover:text-red-300 px-1"
                          onClick={() => removeMatchKey(idx, k)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Override value */}
                  <label className="flex flex-col gap-1">
                    <span className="text-muted">Value</span>
                    <input
                      className="px-1 py-0.5 rounded border border-border bg-surface text-foreground text-xs"
                      value={typeof ovr.value === "object" ? JSON.stringify(ovr.value) : String(ovr.value ?? "")}
                      onChange={(e) => updateOverride(idx, { value: parseDefault(e.target.value) })}
                    />
                  </label>

                  {/* Priority */}
                  <label className="flex flex-col gap-1">
                    <span className="text-muted">Priority</span>
                    <input
                      type="number"
                      className="px-1 py-0.5 rounded border border-border bg-surface text-foreground text-xs"
                      value={ovr.priority}
                      onChange={(e) => updateOverride(idx, { priority: parseInt(e.target.value, 10) || 0 })}
                      min={0}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !settingId || !name}
          className="px-4 py-2 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50 w-full"
        >
          {saving ? "Saving..." : isNew ? "Create Setting" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
