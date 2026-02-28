import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FieldMapping {
  source_field: string;
  target_field: string;
  transform: string;
  expression: string;
  default_value: string;
  description: string;
}

interface MappingDefinition {
  mapping_id: string;
  source_entity: string;
  target_entity: string;
  source_tier: string;
  target_tier: string;
  field_mappings: FieldMapping[];
  status: string;
  description: string;
  created_by: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unmapped_source: string[];
  unmapped_target: string[];
}

interface EntitySummary {
  entity_id: string;
  name: string;
}

interface EntityField {
  name: string;
  type: string;
}

interface EntityDetail {
  entity_id: string;
  name: string;
  fields: EntityField[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TRANSFORM_OPTIONS = [
  "direct",
  "rename",
  "cast",
  "cast_decimal",
  "cast_date",
  "cast_time",
  "uppercase",
  "lowercase",
  "concat",
  "expression",
  "multiply",
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  active: "success",
  draft: "warning",
  deprecated: "muted",
};

function emptyFieldMapping(): FieldMapping {
  return {
    source_field: "",
    target_field: "",
    transform: "direct",
    expression: "",
    default_value: "",
    description: "",
  };
}

function emptyMapping(): MappingDefinition {
  return {
    mapping_id: "",
    source_entity: "",
    target_entity: "",
    source_tier: "bronze",
    target_tier: "silver",
    field_mappings: [],
    status: "draft",
    description: "",
    created_by: "system",
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MappingStudio() {
  /* ---------- catalogue state ---------- */
  const [mappings, setMappings] = useState<MappingDefinition[]>([]);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- editor state ---------- */
  const [selected, setSelected] = useState<MappingDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* ---------- entity fields (lazy-loaded) ---------- */
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [targetFields, setTargetFields] = useState<string[]>([]);

  /* ---------- feedback ---------- */
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------------- */
  /*  Data loading                                             */
  /* -------------------------------------------------------- */

  const loadCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      const [mList, eList] = await Promise.all([
        api.get<MappingDefinition[]>("/mappings/"),
        api.get<EntitySummary[]>("/metadata/entities"),
      ]);
      setMappings(mList);
      setEntities(eList);
    } catch {
      setError("Failed to load mappings or entities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  /* Load entity fields whenever source/target entity changes */
  useEffect(() => {
    if (!selected) return;
    if (selected.source_entity) {
      api
        .get<EntityDetail>(`/metadata/entities/${selected.source_entity}`)
        .then((e) => setSourceFields(e.fields.map((f) => f.name)))
        .catch(() => setSourceFields([]));
    } else {
      setSourceFields([]);
    }
  }, [selected?.source_entity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    if (selected.target_entity) {
      api
        .get<EntityDetail>(`/metadata/entities/${selected.target_entity}`)
        .then((e) => setTargetFields(e.fields.map((f) => f.name)))
        .catch(() => setTargetFields([]));
    } else {
      setTargetFields([]);
    }
  }, [selected?.target_entity]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------------------------------------- */
  /*  Handlers                                                 */
  /* -------------------------------------------------------- */

  const selectMapping = (m: MappingDefinition) => {
    setSelected({ ...m, field_mappings: m.field_mappings.map((fm) => ({ ...fm })) });
    setIsNew(false);
    setDirty(false);
    setValidation(null);
    setSaveMsg(null);
    setError(null);
  };

  const startNew = () => {
    setSelected(emptyMapping());
    setIsNew(true);
    setDirty(true);
    setValidation(null);
    setSaveMsg(null);
    setError(null);
  };

  const update = <K extends keyof MappingDefinition>(key: K, value: MappingDefinition[K]) => {
    if (!selected) return;
    setSelected({ ...selected, [key]: value });
    setDirty(true);
    setSaveMsg(null);
  };

  const updateFieldMapping = (index: number, key: keyof FieldMapping, value: string) => {
    if (!selected) return;
    const fms = selected.field_mappings.map((fm, i) =>
      i === index ? { ...fm, [key]: value } : fm
    );
    setSelected({ ...selected, field_mappings: fms });
    setDirty(true);
    setSaveMsg(null);
  };

  const addFieldMapping = () => {
    if (!selected) return;
    setSelected({
      ...selected,
      field_mappings: [...selected.field_mappings, emptyFieldMapping()],
    });
    setDirty(true);
    setSaveMsg(null);
  };

  const removeFieldMapping = (index: number) => {
    if (!selected) return;
    setSelected({
      ...selected,
      field_mappings: selected.field_mappings.filter((_, i) => i !== index),
    });
    setDirty(true);
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    if (!selected.mapping_id) {
      setError("Mapping ID is required");
      return;
    }
    try {
      setError(null);
      if (isNew) {
        await api.post("/mappings/", selected);
      } else {
        await api.put(`/mappings/${selected.mapping_id}`, selected);
      }
      setSaveMsg("Saved successfully");
      setDirty(false);
      setIsNew(false);
      await loadCatalogue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleValidate = async () => {
    if (!selected || isNew) return;
    try {
      setError(null);
      const result = await api.post<ValidationResult>(
        `/mappings/${selected.mapping_id}/validate`
      );
      setValidation(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Validation failed");
    }
  };

  const handleDelete = async () => {
    if (!selected || isNew) return;
    try {
      await api.delete(`/mappings/${selected.mapping_id}`);
      setSelected(null);
      setValidation(null);
      setSaveMsg(null);
      await loadCatalogue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  /* -------------------------------------------------------- */
  /*  Render                                                   */
  /* -------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* ---- Section 1: Mapping Selector ---- */}
      <Panel
        title="Mapping Selector"
        dataTour="mapping-selector"
        dataTrace="mapping-studio.mapping-selector"
        tooltip="Select an existing mapping or create a new one"
        actions={
          <button
            onClick={startNew}
            className="px-2 py-0.5 rounded bg-accent text-white text-[10px] font-medium hover:bg-accent/80"
          >
            + New Mapping
          </button>
        }
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mapping dropdown */}
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Mapping
            <select
              className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground min-w-[200px]"
              value={selected && !isNew ? selected.mapping_id : ""}
              onChange={(e) => {
                const m = mappings.find((x) => x.mapping_id === e.target.value);
                if (m) selectMapping(m);
              }}
            >
              <option value="">-- select --</option>
              {mappings.map((m) => (
                <option key={m.mapping_id} value={m.mapping_id}>
                  {m.mapping_id} ({m.status})
                </option>
              ))}
            </select>
          </label>

          {/* Entity selectors (shown when mapping selected) */}
          {selected && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                Source Entity
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
                  value={selected.source_entity}
                  onChange={(e) => update("source_entity", e.target.value)}
                >
                  <option value="">-- select --</option>
                  {entities.map((ent) => (
                    <option key={ent.entity_id} value={ent.entity_id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-muted">
                Target Entity
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
                  value={selected.target_entity}
                  onChange={(e) => update("target_entity", e.target.value)}
                >
                  <option value="">-- select --</option>
                  {entities.map((ent) => (
                    <option key={ent.entity_id} value={ent.entity_id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Status badge */}
              <StatusBadge
                label={selected.status}
                variant={STATUS_VARIANT[selected.status] ?? "muted"}
              />

              {/* ID field for new mappings */}
              {isNew && (
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  ID
                  <input
                    className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground w-48"
                    value={selected.mapping_id}
                    onChange={(e) => update("mapping_id", e.target.value)}
                    placeholder="e.g. execution_bronze_silver"
                  />
                </label>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 ml-auto">
                {saveMsg && <StatusBadge label={saveMsg} variant="success" />}
                {error && <StatusBadge label={error} variant="error" />}
                <button
                  onClick={handleSave}
                  disabled={!dirty}
                  className="px-3 py-1 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-40"
                >
                  Save
                </button>
                {!isNew && (
                  <button
                    onClick={handleValidate}
                    className="px-3 py-1 rounded border border-border text-xs font-medium text-foreground hover:bg-foreground/5"
                  >
                    Validate
                  </button>
                )}
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 rounded border border-destructive/40 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Panel>

      {/* ---- Section 2: Field Mapping Table ---- */}
      <Panel
        title={
          selected
            ? `Field Mappings (${selected.field_mappings.length})`
            : "Field Mappings"
        }
        className="flex-1 min-h-0"
        noPadding
        dataTour="mapping-canvas"
        dataTrace="mapping-studio.field-canvas"
        tooltip="Configure source-to-target field mappings with transforms"
        actions={
          selected ? (
            <button
              onClick={addFieldMapping}
              className="px-2 py-0.5 rounded bg-accent text-white text-[10px] font-medium hover:bg-accent/80"
            >
              + Add Row
            </button>
          ) : undefined
        }
      >
        {!selected ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted text-sm">
              Select a mapping above or create a new one to begin.
            </p>
          </div>
        ) : selected.field_mappings.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted text-sm">
              No field mappings yet. Click "+ Add Row" to start.
            </p>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-elevated text-left">
                  <th className="px-3 py-2 text-muted font-medium w-8">#</th>
                  <th className="px-3 py-2 text-muted font-medium">Source Field</th>
                  <th className="px-3 py-2 text-muted font-medium w-36">Transform</th>
                  <th className="px-3 py-2 text-muted font-medium">Target Field</th>
                  <th className="px-3 py-2 text-muted font-medium">Description</th>
                  <th className="px-3 py-2 text-muted font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {selected.field_mappings.map((fm, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 hover:bg-foreground/[0.02]"
                  >
                    {/* Row number */}
                    <td className="px-3 py-1.5 text-muted">{idx + 1}</td>

                    {/* Source field */}
                    <td className="px-3 py-1.5">
                      {sourceFields.length > 0 ? (
                        <select
                          className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground w-full"
                          value={fm.source_field}
                          onChange={(e) =>
                            updateFieldMapping(idx, "source_field", e.target.value)
                          }
                        >
                          <option value="">-- select --</option>
                          {sourceFields.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground w-full"
                          value={fm.source_field}
                          onChange={(e) =>
                            updateFieldMapping(idx, "source_field", e.target.value)
                          }
                          placeholder="source_field"
                        />
                      )}
                    </td>

                    {/* Transform */}
                    <td className="px-3 py-1.5">
                      <select
                        className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground w-full"
                        value={
                          TRANSFORM_OPTIONS.includes(fm.transform)
                            ? fm.transform
                            : "__custom__"
                        }
                        onChange={(e) => {
                          if (e.target.value === "__custom__") return;
                          updateFieldMapping(idx, "transform", e.target.value);
                        }}
                      >
                        {TRANSFORM_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        {!TRANSFORM_OPTIONS.includes(fm.transform) && (
                          <option value="__custom__">{fm.transform} (custom)</option>
                        )}
                      </select>
                    </td>

                    {/* Target field */}
                    <td className="px-3 py-1.5">
                      {targetFields.length > 0 ? (
                        <select
                          className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground w-full"
                          value={fm.target_field}
                          onChange={(e) =>
                            updateFieldMapping(idx, "target_field", e.target.value)
                          }
                        >
                          <option value="">-- select --</option>
                          {targetFields.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground w-full"
                          value={fm.target_field}
                          onChange={(e) =>
                            updateFieldMapping(idx, "target_field", e.target.value)
                          }
                          placeholder="target_field"
                        />
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-3 py-1.5">
                      <input
                        className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground w-full"
                        value={fm.description}
                        onChange={(e) =>
                          updateFieldMapping(idx, "description", e.target.value)
                        }
                        placeholder="description"
                      />
                    </td>

                    {/* Remove */}
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => removeFieldMapping(idx)}
                        className="text-muted hover:text-destructive transition-colors"
                        title="Remove mapping row"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ---- Section 3: Validation Results ---- */}
      {validation && (
        <Panel
          title="Validation Results"
          dataTour="mapping-validation"
          dataTrace="mapping-studio.validation"
          tooltip="Results from the last mapping validation"
          actions={
            <StatusBadge
              label={validation.valid ? "VALID" : "INVALID"}
              variant={validation.valid ? "success" : "error"}
            />
          }
        >
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Errors */}
            <div>
              <h4 className="font-semibold text-destructive mb-1">
                Errors ({validation.errors.length})
              </h4>
              {validation.errors.length === 0 ? (
                <p className="text-muted">None</p>
              ) : (
                <ul className="space-y-0.5">
                  {validation.errors.map((e, i) => (
                    <li key={i} className="text-destructive">
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Warnings */}
            <div>
              <h4 className="font-semibold text-warning mb-1">
                Warnings ({validation.warnings.length})
              </h4>
              {validation.warnings.length === 0 ? (
                <p className="text-muted">None</p>
              ) : (
                <ul className="space-y-0.5">
                  {validation.warnings.map((w, i) => (
                    <li key={i} className="text-warning">
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Unmapped source */}
            <div>
              <h4 className="font-semibold text-muted mb-1">
                Unmapped Source Fields ({validation.unmapped_source.length})
              </h4>
              {validation.unmapped_source.length === 0 ? (
                <p className="text-muted">All mapped</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {validation.unmapped_source.map((f) => (
                    <StatusBadge key={f} label={f} variant="muted" />
                  ))}
                </div>
              )}
            </div>

            {/* Unmapped target */}
            <div>
              <h4 className="font-semibold text-muted mb-1">
                Unmapped Target Fields ({validation.unmapped_target.length})
              </h4>
              {validation.unmapped_target.length === 0 ? (
                <p className="text-muted">All mapped</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {validation.unmapped_target.map((f) => (
                    <StatusBadge key={f} label={f} variant="warning" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
