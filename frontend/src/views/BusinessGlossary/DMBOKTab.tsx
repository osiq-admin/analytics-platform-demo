import { useEffect } from "react";
import StatusBadge from "../../components/StatusBadge.tsx";
import { useGlossaryStore } from "../../stores/glossaryStore.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coverageVariant(cov: string): "success" | "warning" | "muted" {
  switch (cov) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DMBOKTab() {
  const { dmbok, fetchDMBOK } = useGlossaryStore();

  useEffect(() => {
    if (dmbok.length === 0) fetchDMBOK();
  }, [dmbok.length, fetchDMBOK]);

  return (
    <div data-tour="glossary-dmbok-grid" data-trace="glossary.dmbok-coverage">
      <p className="text-xs text-muted mb-3">
        DAMA-DMBOK 2.0 Knowledge Area Coverage — {dmbok.filter((a) => a.coverage === "high").length} of{" "}
        {dmbok.length} areas at high coverage.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {dmbok.map((area) => (
          <div
            key={area.area_id}
            className="bg-surface rounded-lg border border-border p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold">{area.name}</h4>
              <StatusBadge label={area.coverage} variant={coverageVariant(area.coverage)} />
            </div>
            {area.description && (
              <p className="text-[10px] text-muted mb-2 line-clamp-2">{area.description}</p>
            )}
            {area.platform_capabilities && area.platform_capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {area.platform_capabilities.slice(0, 4).map((cap, i) => (
                  <span key={i} className="text-[10px] bg-surface-base rounded px-1 py-0.5 text-muted">
                    {cap}
                  </span>
                ))}
                {area.platform_capabilities.length > 4 && (
                  <span className="text-[10px] text-muted">
                    +{area.platform_capabilities.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
