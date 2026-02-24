import { useEffect, useState, useCallback, useRef } from "react";
import { useMetadataStore } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import LayerBadge from "../../components/LayerBadge.tsx";
import ResetToOobButton from "../../components/ResetToOobButton.tsx";
import JsonPanel from "./JsonPanel.tsx";
import VisualPanel from "./VisualPanel.tsx";
import OobVersionPanel from "./OobVersionPanel.tsx";

type MetadataType = "entities" | "calculations" | "settings" | "models";

interface TypeOption {
  value: MetadataType;
  label: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "entities", label: "Entities" },
  { value: "calculations", label: "Calculations" },
  { value: "settings", label: "Settings" },
  { value: "models", label: "Models" },
];

function getItemId(type: MetadataType, item: Record<string, unknown>): string {
  switch (type) {
    case "entities":
      return String(item.entity_id ?? "");
    case "calculations":
      return String(item.calc_id ?? "");
    case "settings":
      return String(item.setting_id ?? "");
    case "models":
      return String(item.model_id ?? "");
  }
}

function getItemLabel(type: MetadataType, item: Record<string, unknown>): string {
  const name = String(item.name ?? "");
  const id = getItemId(type, item);
  return name ? `${name} (${id})` : id;
}

export default function MetadataEditor() {
  const {
    entities,
    calculations,
    settings,
    detectionModels,
    loading,
    fetchAll,
    saveEntity,
    saveCalculation,
    saveSetting,
    updateDetectionModel,
    resetToOob,
  } = useMetadataStore();

  const [selectedType, setSelectedType] = useState<MetadataType>("entities");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [editorData, setEditorData] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState<string>("{}");
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Debounce timer ref for JSON -> visual sync
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Get items for the selected type
  const getItems = useCallback((): Record<string, unknown>[] => {
    switch (selectedType) {
      case "entities":
        return entities as unknown as Record<string, unknown>[];
      case "calculations":
        return calculations as unknown as Record<string, unknown>[];
      case "settings":
        return settings as unknown as Record<string, unknown>[];
      case "models":
        return detectionModels as unknown as Record<string, unknown>[];
    }
  }, [selectedType, entities, calculations, settings, detectionModels]);

  const items = getItems();

  // When type or index changes, update editor state
  useEffect(() => {
    const currentItems = getItems();
    if (currentItems.length > 0) {
      const idx = Math.min(selectedIndex, currentItems.length - 1);
      const item = currentItems[idx];
      setEditorData(item);
      setJsonText(JSON.stringify(item, null, 2));
      setIsJsonValid(true);
      setSaveStatus("idle");
    } else {
      setEditorData({});
      setJsonText("{}");
      setIsJsonValid(true);
      setSaveStatus("idle");
    }
  }, [selectedType, selectedIndex, getItems]);

  // JSON panel change handler with debounced visual sync
  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        setEditorData(parsed);
        setIsJsonValid(true);
      } catch {
        setIsJsonValid(false);
      }
    }, 400);
  }, []);

  // Visual panel change handler - immediate sync to JSON
  const handleVisualChange = useCallback((updated: Record<string, unknown>) => {
    setEditorData(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    setIsJsonValid(true);
  }, []);

  // Save handler
  const handleSave = async () => {
    if (!isJsonValid) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      switch (selectedType) {
        case "entities":
          await saveEntity(editorData as unknown as Parameters<typeof saveEntity>[0]);
          break;
        case "calculations":
          await saveCalculation(editorData as unknown as Parameters<typeof saveCalculation>[0]);
          break;
        case "settings":
          await saveSetting(editorData as unknown as Parameters<typeof saveSetting>[0]);
          break;
        case "models":
          await updateDetectionModel(editorData);
          break;
      }
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // Handle type change
  const handleTypeChange = (type: MetadataType) => {
    setSelectedType(type);
    setSelectedIndex(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Top bar: type selector + item selector */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold shrink-0">Metadata Editor</h2>
        <div className="flex items-center gap-2 ml-4" data-tour="editor-type-selector">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedType === opt.value
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "border border-border text-muted hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="ml-2 px-2 py-1.5 rounded border border-border bg-surface text-sm text-foreground min-w-[200px] max-w-[400px]"
        >
          {items.map((item, idx) => (
            <option key={getItemId(selectedType, item)} value={idx}>
              {getItemLabel(selectedType, item)}
            </option>
          ))}
          {items.length === 0 && <option value={0}>No items</option>}
        </select>
        {items.length > 0 && (() => {
          const ci = items[Math.min(selectedIndex, items.length - 1)];
          const layerInfo = ci?._layer as { is_oob?: boolean; has_override?: boolean } | undefined;
          return (
            <span data-tour="editor-layer-badge">
              <LayerBadge
                layer={String(ci?.metadata_layer ?? "oob")}
                isOob={layerInfo?.is_oob}
                hasOverride={layerInfo?.has_override}
              />
            </span>
          );
        })()}
      </div>

      {/* OOB Version Panel */}
      <OobVersionPanel />

      {/* OOB info banner */}
      {items.length > 0 && items[Math.min(selectedIndex, items.length - 1)]?.metadata_layer === "oob" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300" data-tour="editor-oob-banner">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Out-of-box item. Editing will create a user override — the original is preserved.
        </div>
      )}

      {/* Main editor panels */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left panel: JSON editor */}
        <Panel title="JSON Editor" className="flex-1 min-w-0" noPadding dataTour="editor-json">
          <div className="h-full">
            <JsonPanel value={jsonText} onChange={handleJsonChange} />
          </div>
        </Panel>

        {/* Right panel: Visual editor */}
        <Panel title="Visual Editor" className="flex-1 min-w-0 overflow-auto" dataTour="editor-visual">
          <VisualPanel
            type={selectedType}
            data={editorData}
            onChange={handleVisualChange}
          />
        </Panel>
      </div>

      {/* Bottom bar: save + validation + reset */}
      <div className="flex items-center justify-between px-1 py-1" data-tour="editor-save">
        <div className="flex items-center gap-2">
          {isJsonValid ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Valid JSON
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Invalid JSON
            </span>
          )}
          {saveStatus === "success" && (
            <span className="text-xs text-green-400 ml-2">Saved successfully</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-400 ml-2">Save failed</span>
          )}
        </div>
        <div className="flex items-center gap-2" data-tour="editor-reset-oob">
          {items.length > 0 && (() => {
            const currentItem = items[Math.min(selectedIndex, items.length - 1)];
            const layerInfo = currentItem?._layer as { is_oob?: boolean; has_override?: boolean } | undefined;
            const itemTypeMap: Record<MetadataType, string> = {
              entities: "entities",
              calculations: "calculations",
              settings: "settings",
              models: "detection_models",
            };
            return (
              <ResetToOobButton
                itemType={itemTypeMap[selectedType]}
                itemId={getItemId(selectedType, currentItem)}
                visible={layerInfo?.is_oob === true && layerInfo?.has_override === true}
                onReset={async () => {
                  await resetToOob(itemTypeMap[selectedType], getItemId(selectedType, currentItem));
                  await fetchAll();
                }}
              />
            );
          })()}
          <button
            onClick={handleSave}
            disabled={!isJsonValid || saving || items.length === 0}
            className="px-4 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
