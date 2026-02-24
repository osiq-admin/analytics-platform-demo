import EntityEditor from "./EntityEditor.tsx";
import CalculationEditor from "./CalculationEditor.tsx";
import SettingsEditor from "./SettingsEditor.tsx";
import DetectionModelEditor from "./DetectionModelEditor.tsx";

interface VisualPanelProps {
  type: "entities" | "calculations" | "settings" | "models";
  data: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

export default function VisualPanel({ type, data, onChange }: VisualPanelProps) {
  switch (type) {
    case "entities":
      return <EntityEditor value={data} onChange={onChange} />;
    case "calculations":
      return <CalculationEditor value={data} onChange={onChange} />;
    case "settings":
      return <SettingsEditor value={data} onChange={onChange} />;
    case "models":
      return <DetectionModelEditor value={data} onChange={onChange} />;
  }
}
