import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { CalculationDef } from "../../stores/metadataStore.ts";

interface CalculationDetailProps {
  calc: CalculationDef;
}

export default function CalculationDetail({ calc }: CalculationDetailProps) {
  return (
    <div className="flex flex-col gap-3 overflow-auto">
      <div>
        <h3 className="text-base font-semibold">{calc.name}</h3>
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
