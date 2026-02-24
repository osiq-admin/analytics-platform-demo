import { useState } from "react";
import type { EntityDef, FieldDef, RelationshipDef } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";

interface EntityFormProps {
  entity: EntityDef;
  isNew: boolean;
  onSave: (entity: EntityDef) => Promise<void>;
  onCancel: () => void;
}

const FIELD_TYPES = ["string", "decimal", "integer", "boolean", "date", "datetime"];
const RELATIONSHIP_TYPES = ["many_to_one", "one_to_many", "many_to_many"];

const inputCls =
  "px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs w-full";
const btnCls =
  "px-3 py-1.5 rounded text-xs font-medium border border-border bg-surface text-foreground hover:bg-background transition-colors";

function emptyField(): FieldDef {
  return { name: "", type: "string", is_key: false, nullable: true, description: "" };
}

function emptyRelationship(): RelationshipDef {
  return { target_entity: "", relationship_type: "many_to_one", join_fields: {} };
}

export default function EntityForm({ entity, isNew, onSave, onCancel }: EntityFormProps) {
  const [entityId, setEntityId] = useState(entity.entity_id);
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description ?? "");
  const [fields, setFields] = useState<FieldDef[]>(entity.fields);
  const [relationships, setRelationships] = useState<RelationshipDef[]>(entity.relationships ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (idx: number, patch: Partial<FieldDef>) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const addField = () => setFields((prev) => [...prev, emptyField()]);
  const removeField = (idx: number) => setFields((prev) => prev.filter((_, i) => i !== idx));

  const updateRelationship = (idx: number, patch: Partial<RelationshipDef>) => {
    setRelationships((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRelationship = () => setRelationships((prev) => [...prev, emptyRelationship()]);
  const removeRelationship = (idx: number) =>
    setRelationships((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!entityId || !name) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        entity_id: entityId,
        name,
        description,
        fields,
        relationships,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {isNew ? "Create New Entity" : `Edit: ${entity.name}`}
        </h3>
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        {/* Entity ID */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Entity ID</span>
          <input
            className={inputCls}
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="e.g. my_entity"
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
            placeholder="Entity name"
          />
        </label>

        {/* Description */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Description</span>
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this entity represent?"
          />
        </label>

        {/* Fields */}
        <Panel
          title={`Fields (${fields.length})`}
          actions={
            <button className={btnCls} onClick={addField}>
              + Add Field
            </button>
          }
        >
          {fields.length === 0 ? (
            <p className="text-xs text-muted italic">
              No fields defined. Click &quot;+ Add Field&quot; to start.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded border border-border bg-background text-xs"
                >
                  <input
                    className="px-2 py-1 rounded border border-border bg-surface text-foreground text-xs flex-1"
                    value={f.name}
                    onChange={(e) => updateField(idx, { name: e.target.value })}
                    placeholder="field_name"
                  />
                  <select
                    className="px-2 py-1 rounded border border-border bg-surface text-foreground text-xs"
                    value={f.type}
                    onChange={(e) => updateField(idx, { type: e.target.value })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-muted">
                    <input
                      type="checkbox"
                      checked={!!f.is_key}
                      onChange={(e) => updateField(idx, { is_key: e.target.checked })}
                    />
                    PK
                  </label>
                  <label className="flex items-center gap-1 text-muted">
                    <input
                      type="checkbox"
                      checked={f.nullable !== false}
                      onChange={(e) => updateField(idx, { nullable: e.target.checked })}
                    />
                    Null
                  </label>
                  <input
                    className="px-2 py-1 rounded border border-border bg-surface text-foreground text-xs flex-1"
                    value={f.description ?? ""}
                    onChange={(e) => updateField(idx, { description: e.target.value })}
                    placeholder="description"
                  />
                  <button
                    onClick={() => removeField(idx)}
                    className="text-red-400 hover:text-red-300 px-1"
                    title="Remove field"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Relationships */}
        <Panel
          title={`Relationships (${relationships.length})`}
          actions={
            <button className={btnCls} onClick={addRelationship}>
              + Add
            </button>
          }
        >
          {relationships.length === 0 ? (
            <p className="text-xs text-muted italic">No relationships defined.</p>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border border-border bg-background text-xs space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      className="px-2 py-1 rounded border border-border bg-surface text-foreground text-xs flex-1"
                      value={rel.target_entity}
                      onChange={(e) => updateRelationship(idx, { target_entity: e.target.value })}
                      placeholder="target_entity"
                    />
                    <select
                      className="px-2 py-1 rounded border border-border bg-surface text-foreground text-xs"
                      value={rel.relationship_type}
                      onChange={(e) => updateRelationship(idx, { relationship_type: e.target.value })}
                    >
                      {RELATIONSHIP_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeRelationship(idx)}
                      className="text-red-400 hover:text-red-300 px-1"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !entityId || !name}
          className="px-4 py-2 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
        >
          {saving ? "Saving..." : isNew ? "Create Entity" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
