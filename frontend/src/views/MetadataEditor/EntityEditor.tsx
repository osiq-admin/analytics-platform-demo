import type { FieldDef, RelationshipDef } from "../../stores/metadataStore.ts";

interface EditorProps {
  value: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

const FIELD_TYPES = ["string", "decimal", "integer", "boolean", "date", "datetime"];
const RELATIONSHIP_TYPES = ["many_to_one", "one_to_many", "many_to_many"];

const inputCls =
  "px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm w-full";
const labelCls = "text-sm text-[var(--color-text)] font-medium";
const btnCls =
  "px-3 py-1.5 rounded text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors";
const btnDangerCls =
  "px-2 py-1 rounded text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors";

function emptyField(): FieldDef {
  return { name: "", type: "string", is_key: false, nullable: true, description: "" };
}

function emptyRelationship(): RelationshipDef {
  return { target_entity: "", relationship_type: "many_to_one", join_fields: {} };
}

export default function EntityEditor({ value, onChange }: EditorProps) {
  const fields = (value.fields as FieldDef[] | undefined) ?? [];
  const relationships = (value.relationships as RelationshipDef[] | undefined) ?? [];

  const update = (patch: Partial<Record<string, unknown>>) => {
    onChange({ ...value, ...patch });
  };

  /* ── Field helpers ── */
  const updateField = (idx: number, patch: Partial<FieldDef>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    update({ fields: next });
  };

  const addField = () => update({ fields: [...fields, emptyField()] });

  const removeField = (idx: number) => update({ fields: fields.filter((_, i) => i !== idx) });

  /* ── Relationship helpers ── */
  const updateRelationship = (idx: number, patch: Partial<RelationshipDef>) => {
    const next = relationships.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    update({ relationships: next });
  };

  const addRelationship = () => update({ relationships: [...relationships, emptyRelationship()] });

  const removeRelationship = (idx: number) =>
    update({ relationships: relationships.filter((_, i) => i !== idx) });

  const updateJoinField = (
    relIdx: number,
    oldKey: string,
    newKey: string,
    newVal: string
  ) => {
    const rel = relationships[relIdx];
    const entries = Object.entries(rel.join_fields).map(([k, v]) =>
      k === oldKey ? [newKey, newVal] : [k, v]
    );
    updateRelationship(relIdx, { join_fields: Object.fromEntries(entries) });
  };

  const addJoinField = (relIdx: number) => {
    const rel = relationships[relIdx];
    updateRelationship(relIdx, { join_fields: { ...rel.join_fields, "": "" } });
  };

  const removeJoinField = (relIdx: number, key: string) => {
    const rel = relationships[relIdx];
    const copy = { ...rel.join_fields };
    delete copy[key];
    updateRelationship(relIdx, { join_fields: copy });
  };

  return (
    <div className="p-4 space-y-6 overflow-auto">
      {/* ── Basic Info ── */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Name</label>
          <input
            className={inputCls}
            value={String(value.name ?? "")}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Entity name"
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input
            className={inputCls}
            value={String(value.description ?? "")}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Entity description"
          />
        </div>
      </div>

      {/* ── Fields Table ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Fields ({fields.length})</span>
          <button className={btnCls} onClick={addField}>
            + Add Field
          </button>
        </div>

        {fields.length > 0 && (
          <div className="border border-[var(--color-border)] rounded overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[minmax(100px,1.5fr)_100px_45px_45px_minmax(80px,1fr)_32px] gap-0.5 px-2 py-1.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] uppercase tracking-wide opacity-70">
              <span>Name</span>
              <span>Type</span>
              <span className="text-center">Key</span>
              <span className="text-center">Null</span>
              <span>Description</span>
              <span />
            </div>
            {/* Rows */}
            {fields.map((f, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[minmax(100px,1.5fr)_100px_45px_45px_minmax(80px,1fr)_32px] gap-0.5 px-2 py-1.5 border-b border-[var(--color-border)] last:border-b-0 items-center"
              >
                <input
                  className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                  value={f.name}
                  onChange={(e) => updateField(idx, { name: e.target.value })}
                  placeholder="field_name"
                />
                <select
                  className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                  value={f.type}
                  onChange={(e) => updateField(idx, { type: e.target.value })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={!!f.is_key}
                    onChange={(e) => updateField(idx, { is_key: e.target.checked })}
                    className="accent-[var(--color-accent)]"
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={f.nullable !== false}
                    onChange={(e) => updateField(idx, { nullable: e.target.checked })}
                    className="accent-[var(--color-accent)]"
                  />
                </div>
                <input
                  className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                  value={f.description ?? ""}
                  onChange={(e) => updateField(idx, { description: e.target.value })}
                  placeholder="description"
                />
                <button className={btnDangerCls} onClick={() => removeField(idx)} title="Remove field">
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {fields.length === 0 && (
          <p className="text-xs text-[var(--color-text)] opacity-50 italic">
            No fields defined. Click &quot;+ Add Field&quot; to start.
          </p>
        )}
      </div>

      {/* ── Relationships ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Relationships ({relationships.length})</span>
          <button className={btnCls} onClick={addRelationship}>
            + Add Relationship
          </button>
        </div>

        {relationships.map((rel, idx) => (
          <div
            key={idx}
            className="border border-[var(--color-border)] rounded p-3 space-y-3 bg-[var(--color-surface)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text)] opacity-70">
                Relationship #{idx + 1}
              </span>
              <button className={btnDangerCls} onClick={() => removeRelationship(idx)}>
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text)] opacity-70">Target Entity</label>
                <input
                  className={inputCls}
                  value={rel.target_entity}
                  onChange={(e) => updateRelationship(idx, { target_entity: e.target.value })}
                  placeholder="e.g. order"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text)] opacity-70">Type</label>
                <select
                  className={inputCls}
                  value={rel.relationship_type}
                  onChange={(e) => updateRelationship(idx, { relationship_type: e.target.value })}
                >
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Join Fields */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text)] opacity-70">Join Fields</span>
                <button
                  className="text-xs text-[var(--color-accent)] hover:underline"
                  onClick={() => addJoinField(idx)}
                >
                  + Add
                </button>
              </div>
              {Object.entries(rel.join_fields).map(([k, v], jIdx) => (
                <div key={jIdx} className="flex items-center gap-2">
                  <input
                    className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm flex-1"
                    value={k}
                    onChange={(e) => updateJoinField(idx, k, e.target.value, v)}
                    placeholder="key"
                  />
                  <span className="text-xs text-[var(--color-text)] opacity-50">=</span>
                  <input
                    className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm flex-1"
                    value={v}
                    onChange={(e) => updateJoinField(idx, k, k, e.target.value)}
                    placeholder="value"
                  />
                  <button className={btnDangerCls} onClick={() => removeJoinField(idx, k)}>
                    &times;
                  </button>
                </div>
              ))}
              {Object.keys(rel.join_fields).length === 0 && (
                <p className="text-xs text-[var(--color-text)] opacity-40 italic">No join fields.</p>
              )}
            </div>
          </div>
        ))}

        {relationships.length === 0 && (
          <p className="text-xs text-[var(--color-text)] opacity-50 italic">
            No relationships defined. Click &quot;+ Add Relationship&quot; to start.
          </p>
        )}
      </div>
    </div>
  );
}
