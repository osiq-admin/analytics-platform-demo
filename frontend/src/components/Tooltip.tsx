import { useState, type ReactNode } from "react";
import {
  useFloating,
  useHover,
  useInteractions,
  useDismiss,
  useRole,
  offset,
  flip,
  shift,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react";

interface TooltipProps {
  content: ReactNode;
  placement?: Placement;
  delay?: number;
  children: ReactNode;
}

export default function Tooltip({ content, placement = "top", delay = 300, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });
  const hover = useHover(context, { delay: { open: delay, close: 0 } });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);

  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()} className="inline-flex">
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 px-2.5 py-1.5 text-xs bg-surface-elevated border border-border rounded shadow-lg max-w-[280px] text-foreground/90"
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
