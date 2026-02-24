import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { CalculationDef } from "../../stores/metadataStore.ts";

interface CalculationDetailProps {
  calc: CalculationDef;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CalculationDetail({ calc, onEdit, onDelete }: CalculationDetailProps) {
  return (
    <div className="flex flex-col gap-3 overflow-auto">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{calc.name}</h3>
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-2 py-1 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-2 py-1 text-xs rounded font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted mt-1">{calc.description}</p>
        <div className="flex gap-2 mt-2">
          <StatusBadge label={calc.layer} variant="info" />
          <StatusBadge label={calc.calc_id} variant="muted" />
        </div>
      </div>

      {calc.depends_on.length > 0 && (
        <Panel title="Dependencies">
          <div className="flex flex-wrap gap-1">
            {calc.depends_on.map((dep) => (
              <StatusBadge key={dep} label={dep} variant="warning" />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
