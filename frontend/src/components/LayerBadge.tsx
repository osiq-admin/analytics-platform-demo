import HelpButton from "./HelpButton.tsx";

interface LayerBadgeProps {
  layer?: string;
  isOob?: boolean;
  hasOverride?: boolean;
}

export default function LayerBadge({ layer, isOob, hasOverride }: LayerBadgeProps) {
  let label: string;
  let colorClasses: string;

  if (isOob && hasOverride) {
    label = "Modified";
    colorClasses = "bg-amber-500/15 text-amber-400 border-amber-500/30";
  } else if (layer === "oob" || (isOob && !hasOverride)) {
    label = "OOB";
    colorClasses = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
  } else {
    label = "Custom";
    colorClasses = "bg-purple-500/15 text-purple-400 border-purple-500/30";
  }

  return (
    <span className="inline-flex items-center gap-1" data-tour="layer-badge">
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colorClasses}`}
      >
        {label}
      </span>
      <HelpButton
        text={
          label === "OOB"
            ? "Out-of-box: shipped with the platform, unmodified"
            : label === "Modified"
            ? "OOB item with user customizations (can be reset)"
            : "User-created item, not part of the OOB package"
        }
        placement="right"
      />
    </span>
  );
}
