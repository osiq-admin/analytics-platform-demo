interface EditorProps {
  value: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

const LAYERS = ["transaction", "time_window", "aggregation", "derived"];

const inputCls =
  "px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm w-full";
const labelCls = "text-sm text-[var(--color-text)] font-medium";

export default function CalculationEditor({ value, onChange }: EditorProps) {
  const update = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...value, ...patch });
  };

  const dependsOn = (value.depends_on as string[] | undefined) ?? [];
  const dependsOnStr = dependsOn.join(", ");

  const handleDependsOnChange = (raw: string) => {
    const arr = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update({ depends_on: arr });
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
          placeholder="Calculation name"
        />
      </div>

      {/* ── Layer ── */}
      <div>
        <label className={labelCls}>Layer</label>
        <select
          className={inputCls}
          value={String(value.layer ?? "transaction")}
          onChange={(e) => update({ layer: e.target.value })}
        >
          {LAYERS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* ── Description ── */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={inputCls + " resize-none"}
          rows={3}
          value={String(value.description ?? "")}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What does this calculation compute?"
        />
      </div>

      {/* ── SQL Logic ── */}
      <div>
        <label className={labelCls}>SQL Logic</label>
        <textarea
          className={inputCls + " resize-none font-mono"}
          rows={10}
          value={String(value.logic ?? "")}
          onChange={(e) => update({ logic: e.target.value })}
          placeholder="SELECT ..."
        />
      </div>

      {/* ── Value Field ── */}
      <div>
        <label className={labelCls}>Value Field</label>
        <input
          className={inputCls}
          value={String(value.value_field ?? "")}
          onChange={(e) => update({ value_field: e.target.value })}
          placeholder="e.g. wash_score"
        />
      </div>

      {/* ── Storage ── */}
      <div>
        <label className={labelCls}>Storage Table</label>
        <input
          className={inputCls}
          value={String(value.storage ?? "")}
          onChange={(e) => update({ storage: e.target.value })}
          placeholder="e.g. calc_wash_trading"
        />
      </div>

      {/* ── Dependencies ── */}
      <div>
        <label className={labelCls}>Dependencies</label>
        <input
          className={inputCls}
          value={dependsOnStr}
          onChange={(e) => handleDependsOnChange(e.target.value)}
          placeholder="Comma-separated calc_ids, e.g. same_party, price_match"
        />
        <p className="text-xs text-[var(--color-text)] opacity-50 mt-1">
          Comma-separated list of calculation IDs this depends on.
        </p>
      </div>
    </div>
  );
}
