import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FloatingPortal } from "@floating-ui/react";
import { useTraceabilityStore } from "../../stores/traceabilityStore.ts";
import TraceIcon from "./TraceIcon.tsx";
import TracePopup from "./TracePopup.tsx";

export default function TraceOverlay() {
  const isActive = useTraceabilityStore((s) => s.isActive);
  const activeTraceId = useTraceabilityStore((s) => s.activeTraceId);
  const [elements, setElements] = useState<Map<string, DOMRect>>(new Map());
  const location = useLocation();

  const scan = useCallback(() => {
    const nodes = document.querySelectorAll("[data-trace]");
    const map = new Map<string, DOMRect>();
    nodes.forEach((node) => {
      const id = node.getAttribute("data-trace");
      if (id) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          map.set(id, rect);
        }
      }
    });
    setElements(map);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setElements(new Map());
      return;
    }
    scan();
    const timer = setTimeout(scan, 300);
    const observer = new MutationObserver(() => requestAnimationFrame(scan));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-trace"],
    });
    window.addEventListener("resize", scan);
    window.addEventListener("scroll", scan, true);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", scan);
      window.removeEventListener("scroll", scan, true);
    };
  }, [isActive, location.pathname, scan]);

  if (!isActive) return null;

  return (
    <FloatingPortal>
      {Array.from(elements.entries()).map(([id, rect]) => (
        <TraceIcon key={id} sectionId={id} rect={rect} />
      ))}
      {activeTraceId && <TracePopup />}
    </FloatingPortal>
  );
}
