import { useState } from "react";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface CanonicalField {
  name: string;
  type: string;
  mapped?: string;
}

interface CanonicalFieldsProps {
  fields: CanonicalField[];
  onMap?: (fieldName: string, sourceColumn: string) => void;
  onUnmap?: (fieldName: string) => void;
}

export default function CanonicalFields({ fields, onMap, onUnmap }: CanonicalFieldsProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <Panel title="Required Fields">
      {fields.length === 0 ? (
        <p className="text-muted text-xs">Select a calculation to see required fields.</p>
      ) : (
        <ul className="space-y-1">
          {fields.map((f) => (
            <li
              key={f.name}
              className={`flex items-center justify-between px-2 py-1 text-xs rounded border bg-background transition-colors ${
                dragOver === f.name
                  ? "border-accent bg-accent/10"
                  : "border-border"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "link";
                setDragOver(f.name);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const sourceCol = e.dataTransfer.getData("text/plain");
                if (sourceCol && onMap) {
                  onMap(f.name, sourceCol);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span>{f.name}</span>
                <StatusBadge label={f.type} variant="info" />
              </div>
              <div className="flex items-center gap-1">
                {f.mapped ? (
                  <>
                    <StatusBadge label={f.mapped} variant="success" />
                    {onUnmap && (
                      <button
                        onClick={() => onUnmap(f.name)}
                        className="text-muted hover:text-destructive ml-1"
                        title="Remove mapping"
                      >
                        x
                      </button>
                    )}
                  </>
                ) : (
                  <StatusBadge label="unmapped" variant="error" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
