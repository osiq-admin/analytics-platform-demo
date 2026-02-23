import { useState } from "react";
import Panel from "../../components/Panel.tsx";

interface OverrideEditorProps {
  settingId: string;
  valueType: string;
}

export default function OverrideEditor({
  settingId,
  valueType,
}: OverrideEditorProps) {
  const [context, setContext] = useState<Record<string, string>>({
    asset_class: "",
    product_id: "",
  });

  return (
    <Panel title="Resolution Tester">
      <div className="space-y-2 text-xs">
        <p className="text-muted">
          Test how setting <span className="text-accent">{settingId}</span> (
          {valueType}) resolves for a given entity context.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-muted">Asset Class</span>
            <input
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
              value={context.asset_class}
              onChange={(e) =>
                setContext({ ...context, asset_class: e.target.value })
              }
              placeholder="e.g. equity"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Product ID</span>
            <input
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
              value={context.product_id}
              onChange={(e) =>
                setContext({ ...context, product_id: e.target.value })
              }
              placeholder="e.g. AAPL"
            />
          </label>
        </div>
        <p className="text-muted italic">
          Resolution testing will be available when the resolve endpoint is
          wired.
        </p>
      </div>
    </Panel>
  );
}
