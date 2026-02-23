import Editor from "@monaco-editor/react";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
}

export default function QueryEditor({
  value,
  onChange,
  onExecute,
}: QueryEditorProps) {
  return (
    <div className="monaco-themed h-full">
      <Editor
        language="sql"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={(editor) => {
          // Ctrl/Cmd+Enter to execute
          editor.addAction({
            id: "execute-query",
            label: "Execute Query",
            keybindings: [
              // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
              2048 | 3,
            ],
            run: () => onExecute(),
          });
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 8, bottom: 8 },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
