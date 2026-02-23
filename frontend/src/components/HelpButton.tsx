import Tooltip from "./Tooltip.tsx";
import type { Placement } from "@floating-ui/react";

interface HelpButtonProps {
  text: string;
  placement?: Placement;
}

export default function HelpButton({ text, placement = "top" }: HelpButtonProps) {
  return (
    <Tooltip content={text} placement={placement}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-muted text-[10px] hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        ?
      </button>
    </Tooltip>
  );
}
