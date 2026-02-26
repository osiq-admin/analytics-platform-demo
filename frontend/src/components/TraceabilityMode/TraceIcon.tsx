import { useTraceabilityStore } from "../../stores/traceabilityStore.ts";

interface TraceIconProps {
  sectionId: string;
  rect: DOMRect;
}

export default function TraceIcon({ sectionId, rect }: TraceIconProps) {
  const openTrace = useTraceabilityStore((s) => s.openTrace);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openTrace(sectionId);
      }}
      className="fixed z-[9900] w-5 h-5 rounded-full bg-info/90 text-white text-[10px]
                 font-bold flex items-center justify-center shadow-md
                 hover:bg-info hover:scale-110 transition-all cursor-pointer
                 ring-2 ring-info/30"
      style={{
        left: rect.right - 24,
        top: rect.top + 4,
      }}
      title={`Architecture trace: ${sectionId}`}
    >
      i
    </button>
  );
}
