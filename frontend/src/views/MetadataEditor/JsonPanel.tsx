import Editor from "@monaco-editor/react";

interface JsonPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JsonPanel({ value, onChange }: JsonPanelProps) {
  return (
    <div className="monaco-themed h-full">
      <Editor
        language="json"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 8, bottom: 8 },
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
