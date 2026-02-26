import { useState } from "react";
import { clsx } from "clsx";
import { FloatingPortal } from "@floating-ui/react";
import { useTraceabilityStore } from "../../stores/traceabilityStore.ts";
import { getTraceSection } from "../../data/architectureRegistry.ts";
import MetadataMaturityBadge from "./MetadataMaturityBadge.tsx";
import type { ApiEndpoint, DataSource } from "../../data/architectureRegistryTypes.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-success/15 text-success",
  POST: "bg-info/15 text-info",
  PUT: "bg-warning/15 text-warning",
  DELETE: "bg-destructive/15 text-destructive",
  WS: "bg-accent/15 text-accent",
};

const CATEGORY_COLORS: Record<string, string> = {
  metadata: "bg-accent/15 text-accent",
  data: "bg-info/15 text-info",
  settings: "bg-warning/15 text-warning",
  config: "bg-muted/15 text-muted",
  results: "bg-success/15 text-success",
};

function Accordion({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (count === 0) return null;
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-surface-elevated/50 transition-colors"
      >
        <span className="font-semibold text-foreground/80 uppercase tracking-wide">
          {title}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted">{count}</span>
          <svg
            className={clsx(
              "w-3 h-3 text-muted transition-transform",
              open && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function MethodBadge({ method }: { method: ApiEndpoint["method"] }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold",
        METHOD_COLORS[method] ?? "bg-muted/15 text-muted"
      )}
    >
      {method}
    </span>
  );
}

function CategoryBadge({ category }: { category: DataSource["category"] }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium",
        CATEGORY_COLORS[category] ?? "bg-muted/15 text-muted"
      )}
    >
      {category}
    </span>
  );
}

function FilePath({ path }: { path: string }) {
  return (
    <code className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded break-all">
      {path}
    </code>
  );
}

// ---------------------------------------------------------------------------
// TracePopup
// ---------------------------------------------------------------------------

export default function TracePopup() {
  const activeTraceId = useTraceabilityStore((s) => s.activeTraceId);
  const closeTrace = useTraceabilityStore((s) => s.closeTrace);

  const section = activeTraceId ? getTraceSection(activeTraceId) : undefined;

  return (
    <FloatingPortal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9991] bg-black/30"
        onClick={closeTrace}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-[9992] h-full w-[400px] bg-surface border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {section?.displayName ?? activeTraceId}
                </h3>
                {section && (
                  <MetadataMaturityBadge maturity={section.metadataMaturity} />
                )}
              </div>
              {section && (
                <p className="text-[10px] text-muted mt-0.5">
                  {section.viewId} &middot; {activeTraceId}
                </p>
              )}
            </div>
            <button
              onClick={closeTrace}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-elevated text-muted hover:text-foreground transition-colors text-xs shrink-0 ml-2"
            >
              x
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!section ? (
            <div className="px-4 py-8 text-center text-muted text-xs">
              <p className="font-medium mb-1">No registry entry found</p>
              <p>
                Section <code className="font-mono">{activeTraceId}</code> is
                not yet documented in architectureRegistry.ts
              </p>
            </div>
          ) : (
            <>
              {/* Description */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-foreground/70 leading-relaxed">
                  {section.description}
                </p>
              </div>

              {/* Files */}
              <Accordion
                title="Source Files"
                count={section.files.length}
                defaultOpen
              >
                <div className="space-y-2">
                  {section.files.map((f, i) => (
                    <div key={i}>
                      <FilePath path={f.path} />
                      <p className="text-[10px] text-muted mt-0.5">{f.role}</p>
                      {f.editHint && (
                        <p className="text-[10px] text-accent/70 mt-0.5 italic">
                          {f.editHint}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Accordion>

              {/* Stores */}
              <Accordion title="Zustand Stores" count={section.stores.length}>
                <div className="space-y-2">
                  {section.stores.map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-foreground">
                          {s.name}
                        </span>
                      </div>
                      <FilePath path={s.path} />
                      <p className="text-[10px] text-muted mt-0.5">{s.role}</p>
                    </div>
                  ))}
                </div>
              </Accordion>

              {/* API Endpoints */}
              <Accordion title="API Endpoints" count={section.apis.length}>
                <div className="space-y-2">
                  {section.apis.map((a, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <MethodBadge method={a.method} />
                        <code className="text-[10px] font-mono text-foreground">
                          {a.path}
                        </code>
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">{a.role}</p>
                      <p className="text-[10px] text-muted">
                        Router: <FilePath path={a.routerFile} />
                      </p>
                    </div>
                  ))}
                </div>
              </Accordion>

              {/* Data Sources */}
              <Accordion
                title="Metadata & Data"
                count={section.dataSources.length}
              >
                <div className="space-y-2">
                  {section.dataSources.map((d, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CategoryBadge category={d.category} />
                        <FilePath path={d.path} />
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">{d.role}</p>
                      {d.editHint && (
                        <p className="text-[10px] text-accent/70 mt-0.5 italic">
                          {d.editHint}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Accordion>

              {/* Technologies */}
              <Accordion
                title="Technologies"
                count={section.technologies.length}
              >
                <div className="space-y-1.5">
                  {section.technologies.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[11px] font-medium text-foreground shrink-0">
                        {t.name}
                      </span>
                      <span className="text-[10px] text-muted">
                        — {t.role}
                      </span>
                    </div>
                  ))}
                </div>
              </Accordion>

              {/* Metadata-First Analysis — always open */}
              <div className="px-4 py-3 border-t border-border bg-surface-elevated/30">
                <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                  Metadata-First Analysis
                </h4>
                <p className="text-xs text-foreground/70 leading-relaxed mb-2">
                  {section.maturityExplanation}
                </p>
                {section.metadataOpportunities &&
                  section.metadataOpportunities.length > 0 && (
                    <>
                      <p className="text-[10px] font-medium text-foreground/60 mb-1">
                        Opportunities:
                      </p>
                      <ul className="space-y-1">
                        {section.metadataOpportunities.map((opp, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-[10px] text-foreground/60"
                          >
                            <span className="text-accent mt-0.5 shrink-0">
                              {"\u2022"}
                            </span>
                            <span className="leading-relaxed">{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
}
