import { useState, useEffect } from "react";
import Tooltip from "../../../components/Tooltip.tsx";
import SuggestionInput from "../../../components/SuggestionInput.tsx";

interface DefineStepProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  timeWindow: string;
  setTimeWindow: (tw: string) => void;
  granularity: string[];
  setGranularity: (g: string[]) => void;
  contextFields: string[];
  setContextFields: (cf: string[]) => void;
}

interface CalcOption {
  calc_id: string;
  name: string;
  layer: string;
  value_field: string;
  description: string;
}

const GRANULARITY_OPTIONS = [
  { value: "product_id", tooltip: "Group alerts by product — each product generates separate alerts" },
  { value: "account_id", tooltip: "Group alerts by account — each account is evaluated independently" },
  { value: "trader_id", tooltip: "Group alerts by trader — each trader is monitored independently" },
  { value: "venue_mic", tooltip: "Group alerts by venue — each trading venue is evaluated separately" },
];

export default function DefineStep({
  name,
  setName,
  description,
  setDescription,
  timeWindow,
  setTimeWindow,
  granularity,
  setGranularity,
  contextFields,
  setContextFields,
}: DefineStepProps) {
  const [timeWindowCalcs, setTimeWindowCalcs] = useState<CalcOption[]>([]);

  // Fetch time_window calculations
  useEffect(() => {
    fetch("/api/metadata/domain-values/calculation-ids?layer=time_windows")
      .then((r) => r.json())
      .then((data) => {
        if (data.calculations) {
          setTimeWindowCalcs(data.calculations);
        }
      })
      .catch(() => {
        // fallback defaults
        setTimeWindowCalcs([
          { calc_id: "business_date_window", name: "Business Date Window", layer: "time_windows", value_field: "", description: "" },
        ]);
      });
  }, []);

  // Fetch match keys for context fields
  const [matchKeys, setMatchKeys] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/metadata/domain-values/match-keys")
      .then((r) => r.json())
      .then((data) => {
        if (data.match_keys) {
          const keys = data.match_keys.map((mk: { key: string }) => mk.key);
          // deduplicate
          setMatchKeys([...new Set<string>(keys)]);
        }
      })
      .catch(() => {});
  }, []);

  const toggleGranularity = (value: string) => {
    if (granularity.includes(value)) {
      setGranularity(granularity.filter((g) => g !== value));
    } else {
      setGranularity([...granularity, value]);
    }
  };

  const modelId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">Step 1: Define Model</h3>

      {/* Name */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted flex items-center gap-1">
          Model Name
          <Tooltip content="Name for the detection model" placement="right">
            <span className="text-muted/60 cursor-help">?</span>
          </Tooltip>
        </span>
        <input
          className="px-2 py-1.5 rounded border border-border bg-surface text-foreground text-xs focus:border-accent outline-none transition-colors"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Custom Wash Detection"
        />
        {modelId && <span className="text-muted text-[10px]">ID: {modelId}</span>}
      </label>

      {/* Description */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted flex items-center gap-1">
          Description
          <Tooltip content="What market abuse pattern does this detect?" placement="right">
            <span className="text-muted/60 cursor-help">?</span>
          </Tooltip>
        </span>
        <textarea
          className="px-2 py-1.5 rounded border border-border bg-surface text-foreground text-xs resize-none focus:border-accent outline-none transition-colors"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What market abuse pattern does this model detect?"
        />
      </label>

      {/* Time Window */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted flex items-center gap-1">
          Time Window
          <Tooltip content="The time window calculation that defines the observation period for this model" placement="right">
            <span className="text-muted/60 cursor-help">?</span>
          </Tooltip>
        </span>
        <select
          className="px-2 py-1.5 rounded border border-border bg-surface text-foreground text-xs focus:border-accent outline-none transition-colors"
          value={timeWindow}
          onChange={(e) => setTimeWindow(e.target.value)}
        >
          {timeWindowCalcs.length === 0 && (
            <option value={timeWindow}>{timeWindow}</option>
          )}
          {timeWindowCalcs.map((c) => (
            <option key={c.calc_id} value={c.calc_id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* Granularity */}
      <div className="flex flex-col gap-1.5 text-xs">
        <span className="text-muted flex items-center gap-1">
          Granularity
          <Tooltip content="Dimensions by which alerts are grouped. Each unique combination produces a separate alert evaluation." placement="right">
            <span className="text-muted/60 cursor-help">?</span>
          </Tooltip>
        </span>
        <div className="flex flex-wrap gap-3">
          {GRANULARITY_OPTIONS.map((opt) => (
            <Tooltip key={opt.value} content={opt.tooltip} placement="bottom">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={granularity.includes(opt.value)}
                  onChange={() => toggleGranularity(opt.value)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-foreground">{opt.value}</span>
              </label>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Context Fields */}
      <div className="flex flex-col gap-1 text-xs">
        <SuggestionInput
          label="Context Fields"
          tooltip="Additional fields included in alert context for investigation. These fields appear on the alert detail page."
          value={contextFields}
          onChange={(v) => setContextFields(v as string[])}
          suggestions={matchKeys}
          multiSelect
          placeholder="Select context fields..."
          allowFreeform={false}
        />
      </div>
    </div>
  );
}
