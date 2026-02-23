import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface CanonicalField {
  name: string;
  type: string;
  mapped?: string;
}

interface CanonicalFieldsProps {
  fields: CanonicalField[];
}

export default function CanonicalFields({ fields }: CanonicalFieldsProps) {
  return (
    <Panel title="Required Fields">
      {fields.length === 0 ? (
        <p className="text-muted text-xs">Select a calculation to see required fields.</p>
      ) : (
        <ul className="space-y-1">
          {fields.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between px-2 py-1 text-xs rounded border border-border bg-background"
            >
              <div className="flex items-center gap-2">
                <span>{f.name}</span>
                <StatusBadge label={f.type} variant="info" />
              </div>
              {f.mapped ? (
                <StatusBadge label={f.mapped} variant="success" />
              ) : (
                <StatusBadge label="unmapped" variant="error" />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
