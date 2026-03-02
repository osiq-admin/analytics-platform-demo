import { useEffect, useState } from "react";
import { api } from "../../api/client.ts";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import { formatLabel } from "../../utils/format.ts";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OwnershipTab() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, string[]>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Record<string, Record<string, string[]>>>("/glossary/ownership")
      .then((data) => {
        setMatrix(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div data-tour="glossary-ownership" data-trace="glossary.ownership-matrix">
      {Object.entries(matrix).map(([owner, domains]) => (
        <div key={owner} className="mb-4">
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            {formatLabel(owner)}
            <span className="text-muted font-normal">
              ({Object.values(domains).flat().length} terms)
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-2 ml-4">
            {Object.entries(domains).map(([domain, termIds]) => (
              <div key={domain} className="bg-surface rounded border border-border p-2">
                <div className="text-[10px] font-semibold text-muted mb-1">
                  {formatLabel(domain)} ({termIds.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {termIds.map((id) => (
                    <span key={id} className="text-[10px] bg-surface-base rounded px-1 py-0.5">
                      {formatLabel(id)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
