import { useState, useEffect, type ReactNode } from "react";
import { api } from "../api/client.ts";
import type { GlossaryTerm } from "../stores/glossaryStore.ts";

// Module-level cache to avoid repeated API calls
const termCache = new Map<string, GlossaryTerm | null>();

interface GlossaryTooltipProps {
  entity: string;
  field: string;
  children: ReactNode;
}

export default function GlossaryTooltip({ entity, field, children }: GlossaryTooltipProps) {
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const cacheKey = `${entity}.${field}`;
    if (termCache.has(cacheKey)) {
      setTerm(termCache.get(cacheKey) ?? null);
      return;
    }

    api
      .get<{ terms: GlossaryTerm[] }>(`/glossary/field/${entity}/${field}`)
      .then((data) => {
        const found = data.terms?.[0] ?? null;
        termCache.set(cacheKey, found);
        setTerm(found);
      })
      .catch(() => {
        termCache.set(cacheKey, null);
      });
  }, [entity, field]);

  if (!term) {
    return <>{children}</>;
  }

  return (
    <span
      className="inline-flex items-center gap-1 relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      <span className="text-accent/60 text-[10px] cursor-help" title={term.business_name}>
        &#x1F4D6;
      </span>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-64 bg-surface border border-border rounded-lg shadow-lg p-2.5 pointer-events-none">
          <div className="text-xs font-semibold mb-0.5">{term.business_name}</div>
          <p className="text-[10px] text-muted leading-relaxed">{term.definition}</p>
        </div>
      )}
    </span>
  );
}
