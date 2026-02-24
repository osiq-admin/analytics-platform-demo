import type { ModelCalculation } from "../../stores/metadataStore.ts";

interface EditorProps {
  value: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

const TIME_WINDOWS = [
  "business_date",
  "trend_window",
  "market_event_window",
  "cancellation_pattern",
];

const GRANULARITY_OPTIONS = ["product_id", "account_id", "trader_id"];

const inputCls =
  "px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm w-full";
const labelCls = "text-sm text-[var(--color-text)] font-medium";
const btnCls =
  "px-3 py-1.5 rounded text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors";
const btnDangerCls =
  "px-2 py-1 rounded text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors";

function emptyCalculation(): ModelCalculation {
  return {
    calc_id: "",
    strictness: "OPTIONAL",
    threshold_setting: null,
    score_steps_setting: null,
  };
}

export default function DetectionModelEditor({ value, onChange }: EditorProps) {
  const calculations = (value.calculations as ModelCalculation[] | undefined) ?? [];
  const granularity = (value.granularity as string[] | undefined) ?? [];
  const contextFields = (value.context_fields as string[] | undefined) ?? [];
  const contextFieldsStr = contextFields.join(", ");

  const update = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...value, ...patch });
  };

  /* ── Granularity toggle ── */
  const toggleGranularity = (field: string) => {
    if (granularity.includes(field)) {
      update({ granularity: granularity.filter((g) => g !== field) });
    } else {
      update({ granularity: [...granularity, field] });
    }
  };

  /* ── Calculation helpers ── */
  const updateCalc = (idx: number, patch: Partial<ModelCalculation>) => {
    const next = calculations.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    update({ calculations: next });
  };

  const addCalc = () => {
    update({ calculations: [...calculations, emptyCalculation()] });
  };

  const removeCalc = (idx: number) => {
    update({ calculations: calculations.filter((_, i) => i !== idx) });
  };

  /* ── Context fields ── */
  const handleContextFieldsChange = (raw: string) => {
    const arr = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update({ context_fields: arr });
  };

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* ── Name ── */}
      <div>
        <label className={labelCls}>Name</label>
        <input
          className={inputCls}
          value={String(value.name ?? "")}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Model name"
        />
      </div>

      {/* ── Description ── */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={inputCls + " resize-none"}
          rows={3}
          value={String(value.description ?? "")}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What does this model detect?"
        />
      </div>

      {/* ── Time Window ── */}
      <div>
        <label className={labelCls}>Time Window</label>
        <select
          className={inputCls}
          value={String(value.time_window ?? "business_date")}
          onChange={(e) => update({ time_window: e.target.value })}
        >
          {TIME_WINDOWS.map((tw) => (
            <option key={tw} value={tw}>
              {tw}
            </option>
          ))}
        </select>
      </div>

      {/* ── Score Threshold Setting ── */}
      <div>
        <label className={labelCls}>Score Threshold Setting</label>
        <input
          className={inputCls}
          value={String(value.score_threshold_setting ?? "")}
          onChange={(e) => update({ score_threshold_setting: e.target.value })}
          placeholder="e.g. wash_score_threshold"
        />
      </div>

      {/* ── Granularity ── */}
      <div>
        <label className={labelCls}>Granularity</label>
        <div className="flex items-center gap-4 mt-1">
          {GRANULARITY_OPTIONS.map((g) => (
            <label key={g} className="flex items-center gap-1.5 text-sm text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={granularity.includes(g)}
                onChange={() => toggleGranularity(g)}
                className="accent-[var(--color-accent)]"
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* ── Calculations ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Calculations ({calculations.length})</span>
          <button className={btnCls} onClick={addCalc}>
            + Add Calculation
          </button>
        </div>

        {calculations.map((calc, idx) => (
          <div
            key={idx}
            className="border border-[var(--color-border)] rounded p-3 space-y-3 bg-[var(--color-surface)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text)] opacity-70">
                Calculation #{idx + 1}
              </span>
              <button className={btnDangerCls} onClick={() => removeCalc(idx)}>
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* calc_id */}
              <div>
                <label className="text-xs text-[var(--color-text)] opacity-70">Calc ID</label>
                <input
                  className={inputCls}
                  value={calc.calc_id}
                  onChange={(e) => updateCalc(idx, { calc_id: e.target.value })}
                  placeholder="e.g. same_party"
                />
              </div>

              {/* Strictness */}
              <div>
                <label className="text-xs text-[var(--color-text)] opacity-70">Strictness</label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      calc.strictness === "MUST_PASS"
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => updateCalc(idx, { strictness: "MUST_PASS" })}
                  >
                    MUST_PASS
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      calc.strictness === "OPTIONAL"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => updateCalc(idx, { strictness: "OPTIONAL" })}
                  >
                    OPTIONAL
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* threshold_setting */}
              <div>
                <label className="text-xs text-[var(--color-text)] opacity-70">
                  Threshold Setting
                </label>
                <input
                  className={inputCls}
                  value={calc.threshold_setting ?? ""}
                  onChange={(e) =>
                    updateCalc(idx, { threshold_setting: e.target.value || null })
                  }
                  placeholder="optional"
                />
              </div>

              {/* score_steps_setting */}
              <div>
                <label className="text-xs text-[var(--color-text)] opacity-70">
                  Score Steps Setting
                </label>
                <input
                  className={inputCls}
                  value={calc.score_steps_setting ?? ""}
                  onChange={(e) =>
                    updateCalc(idx, { score_steps_setting: e.target.value || null })
                  }
                  placeholder="optional"
                />
              </div>
            </div>
          </div>
        ))}

        {calculations.length === 0 && (
          <p className="text-xs text-[var(--color-text)] opacity-50 italic">
            No calculations. Click &quot;+ Add Calculation&quot; to start.
          </p>
        )}
      </div>

      {/* ── Query ── */}
      <div>
        <label className={labelCls}>Query</label>
        <textarea
          className={inputCls + " resize-none font-mono"}
          rows={6}
          value={String(value.query ?? "")}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="SELECT ..."
        />
      </div>

      {/* ── Context Fields ── */}
      <div>
        <label className={labelCls}>Context Fields</label>
        <input
          className={inputCls}
          value={contextFieldsStr}
          onChange={(e) => handleContextFieldsChange(e.target.value)}
          placeholder="Comma-separated, e.g. product_name, account_name"
        />
        <p className="text-xs text-[var(--color-text)] opacity-50 mt-1">
          Comma-separated list of fields to include in alert context.
        </p>
      </div>
    </div>
  );
}
