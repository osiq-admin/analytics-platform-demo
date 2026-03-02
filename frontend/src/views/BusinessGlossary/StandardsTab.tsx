import { useEffect } from "react";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel } from "../../utils/format.ts";
import { useGlossaryStore } from "../../stores/glossaryStore.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function complianceVariant(level: string): "success" | "warning" | "info" | "muted" | "error" {
  switch (level) {
    case "full":
      return "success";
    case "partial":
      return "warning";
    case "reference":
      return "info";
    case "not_implemented":
      return "error";
    default:
      return "muted";
  }
}

function priorityVariant(priority: string): "error" | "warning" | "muted" {
  switch (priority) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StandardsTab() {
  const { standards, gapStandards, entityGaps, fetchStandards, fetchEntityGaps } =
    useGlossaryStore();

  useEffect(() => {
    if (standards.length === 0) fetchStandards();
    if (entityGaps.length === 0) fetchEntityGaps();
  }, [standards.length, entityGaps.length, fetchStandards, fetchEntityGaps]);

  return (
    <div className="space-y-6">
      {/* Standards compliance table */}
      <Panel
        title={`Standards Compliance (${standards.length})`}
        dataTour="glossary-standards"
        dataTrace="glossary.standards-compliance"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1.5 px-2">Standard</th>
              <th className="text-left py-1.5 px-2">Full Name</th>
              <th className="text-left py-1.5 px-2">Category</th>
              <th className="text-left py-1.5 px-2">Compliance</th>
              <th className="text-left py-1.5 px-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {standards.map((s) => (
              <tr key={s.standard_id} className="border-b border-border/50 hover:bg-surface-hover">
                <td className="py-1.5 px-2 font-medium">{s.name}</td>
                <td className="py-1.5 px-2 text-muted">{s.full_name}</td>
                <td className="py-1.5 px-2 text-muted">{formatLabel(s.category)}</td>
                <td className="py-1.5 px-2">
                  <StatusBadge
                    label={formatLabel(s.compliance_level)}
                    variant={complianceVariant(s.compliance_level)}
                  />
                </td>
                <td className="py-1.5 px-2 text-muted text-[10px]">{s.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Gap standards roadmap */}
      {gapStandards.length > 0 && (
        <Panel title={`Standards Roadmap (${gapStandards.length})`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left py-1.5 px-2">Standard</th>
                <th className="text-left py-1.5 px-2">Gap</th>
                <th className="text-left py-1.5 px-2">Suggested Phase</th>
              </tr>
            </thead>
            <tbody>
              {gapStandards.map((s) => (
                <tr key={s.standard_id} className="border-b border-border/50">
                  <td className="py-1.5 px-2 font-medium">{s.name}</td>
                  <td className="py-1.5 px-2 text-muted">{s.gap_description}</td>
                  <td className="py-1.5 px-2">
                    <StatusBadge label={`Phase ${s.suggested_phase}`} variant="muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Entity gap analysis */}
      <Panel
        title="Entity Gap Analysis"
        dataTour="glossary-entity-gaps"
        dataTrace="glossary.entity-gaps"
      >
        <div className="space-y-3">
          {entityGaps
            .filter((e) => e.gaps.length > 0)
            .map((entity) => (
              <div key={entity.entity_id} className="bg-surface rounded border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold">
                    {formatLabel(entity.entity_id)}
                    <span className="text-muted font-normal ml-2">
                      {entity.current_field_count} fields, {entity.gaps.length} gaps
                    </span>
                  </h4>
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-muted border-b border-border/50">
                      <th className="text-left py-1 px-1.5">Field</th>
                      <th className="text-left py-1 px-1.5">Type</th>
                      <th className="text-left py-1 px-1.5">Standard</th>
                      <th className="text-left py-1 px-1.5">Priority</th>
                      <th className="text-left py-1 px-1.5">Regulatory Need</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entity.gaps.map((gap) => (
                      <tr key={gap.field_name} className="border-b border-border/30">
                        <td className="py-1 px-1.5 font-mono">{gap.field_name}</td>
                        <td className="py-1 px-1.5 text-muted">{gap.type}</td>
                        <td className="py-1 px-1.5 text-muted">{gap.standard}</td>
                        <td className="py-1 px-1.5">
                          <StatusBadge label={gap.priority} variant={priorityVariant(gap.priority)} />
                        </td>
                        <td className="py-1 px-1.5 text-muted">{gap.regulatory_need}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          {entityGaps.filter((e) => e.gaps.length === 0).length > 0 && (
            <p className="text-[10px] text-muted">
              {entityGaps.filter((e) => e.gaps.length === 0).length} entities have no attribute gaps:{" "}
              {entityGaps
                .filter((e) => e.gaps.length === 0)
                .map((e) => formatLabel(e.entity_id))
                .join(", ")}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
