import { useState } from "react";
import Editor from "@monaco-editor/react";

interface SampleDataEditorProps {
  sampleData: Record<string, unknown[]>;
  setSampleData: (data: Record<string, unknown[]>) => void;
}

export default function SampleDataEditor({
  sampleData,
  setSampleData,
}: SampleDataEditorProps) {
  const entityKeys = Object.keys(sampleData);
  const [activeTab, setActiveTab] = useState<string>(entityKeys[0] ?? "");
  const [parseError, setParseError] = useState<string | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    try {
      const parsed = JSON.parse(value);
      setParseError(null);
      if (activeTab) {
        setSampleData({ ...sampleData, [activeTab]: parsed });
      } else {
        // Full document edit
        setSampleData(parsed);
      }
    } catch {
      setParseError("Invalid JSON");
    }
  };

  const currentValue = activeTab
    ? JSON.stringify(sampleData[activeTab] ?? [], null, 2)
    : JSON.stringify(sampleData, null, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Entity tabs */}
      {entityKeys.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-surface-elevated overflow-x-auto">
          <button
            onClick={() => setActiveTab("")}
            className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors whitespace-nowrap ${
              activeTab === ""
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {entityKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors whitespace-nowrap ${
                activeTab === key
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {key}
              <span className="ml-1 text-muted">
                ({(sampleData[key] ?? []).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {parseError && (
        <div className="px-2 py-1 text-[10px] text-destructive bg-destructive/10 border-b border-destructive/30">
          {parseError}
        </div>
      )}

      <div className="monaco-themed flex-1 min-h-[200px]">
        <Editor
          language="json"
          theme="vs-dark"
          value={currentValue}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 8, bottom: 8 },
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
