import { useState, useEffect } from "react";
import { useDomainValues } from "../../hooks/useDomainValues.ts";

interface Field {
  name: string;
  type: string;
  description?: string;
  domain_values?: string[] | null;
}

interface DomainValuesPaneProps {
  entityId: string;
  field: Field;
  onUpdateDomainValues: (fieldName: string, values: string[]) => void;
  onClose: () => void;
}

export default function DomainValuesPane({
  entityId,
  field,
  onUpdateDomainValues,
  onClose,
}: DomainValuesPaneProps) {
  const { dataValues, isLoading } = useDomainValues(entityId, field.name, { eager: true });
  const [newValue, setNewValue] = useState("");
  const [localValues, setLocalValues] = useState<string[]>(field.domain_values ?? []);

  // Reset local state when field changes
  useEffect(() => {
    setLocalValues(field.domain_values ?? []);
    setNewValue("");
  }, [field.name, field.domain_values]);

  // Data-only values: in DuckDB but not in metadata
  const dataOnlyValues = dataValues.filter((v) => !localValues.includes(v));

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed || localValues.includes(trimmed)) return;
    const updated = [...localValues, trimmed];
    setLocalValues(updated);
    onUpdateDomainValues(field.name, updated);
    setNewValue("");
  };

  const handleRemove = (value: string) => {
    const updated = localValues.filter((v) => v !== value);
    setLocalValues(updated);
    onUpdateDomainValues(field.name, updated);
  };

  return (
    <div className="flex flex-col h-full" data-tour="domain-values-pane">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-surface-elevated">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold truncate">{field.name}</h4>
          <p className="text-[10px] text-muted">{field.type}{field.description ? ` — ${field.description}` : ""}</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-foreground text-sm ml-2" title="Close">&times;</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Metadata values (editable) */}
        <div>
          <h5 className="text-[10px] font-semibold uppercase text-muted tracking-wide mb-1.5">
            Metadata Values ({localValues.length})
          </h5>
          {localValues.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {localValues.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent border border-accent/30">
                  {v}
                  <button
                    onClick={() => handleRemove(v)}
                    className="text-accent/60 hover:text-accent ml-0.5"
                    title={`Remove ${v}`}
                  >&times;</button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted italic">No metadata values defined</p>
          )}
        </div>

        {/* Add new value */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Add value…"
            className="flex-1 px-2 py-1 text-[11px] rounded border border-border bg-background text-foreground"
          />
          <button
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="px-2 py-1 text-[10px] font-medium rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-40"
          >Add</button>
        </div>

        {/* Data-only values (read-only) */}
        {dataOnlyValues.length > 0 && (
          <div>
            <h5 className="text-[10px] font-semibold uppercase text-muted tracking-wide mb-1.5">
              Data-Only Values ({dataOnlyValues.length})
            </h5>
            <p className="text-[9px] text-muted mb-1">Found in database but not defined in metadata</p>
            <div className="flex flex-wrap gap-1.5">
              {dataOnlyValues.map((v) => (
                <span key={v} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted/10 text-muted border border-border">
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {isLoading && <p className="text-[10px] text-muted">Loading data values…</p>}
      </div>
    </div>
  );
}
