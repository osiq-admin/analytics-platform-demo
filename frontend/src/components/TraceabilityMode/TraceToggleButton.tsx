import { clsx } from "clsx";
import { useTraceabilityStore } from "../../stores/traceabilityStore.ts";

export default function TraceToggleButton() {
  const isActive = useTraceabilityStore((s) => s.isActive);
  const toggle = useTraceabilityStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      data-action="trace"
      className={clsx(
        "px-2 py-0.5 rounded border transition-colors",
        isActive
          ? "border-accent bg-accent/15 text-accent font-medium"
          : "border-border text-muted hover:text-foreground hover:border-foreground/30"
      )}
      title="Architecture Traceability Mode — overlay info icons showing which files, APIs, metadata, and technologies control each section"
    >
      Trace
    </button>
  );
}
