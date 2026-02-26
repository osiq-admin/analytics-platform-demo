import { useState, useEffect } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import ChatPanel from "./ChatPanel.tsx";
import MockPlayer from "./MockPlayer.tsx";
import QueryPreview from "./QueryPreview.tsx";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>("mock");
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ mode: string }>("/ai/mode")
      .then((data) => setMode(data.mode))
      .catch(() => {});
  }, []);

  const handleSend = async (content: string) => {
    const userMsg: Message = { role: "user", content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const reply = await api.post<Message & { mode: string }>("/ai/chat", {
        messages: updated,
      });
      setMessages([...updated, { role: reply.role as "assistant", content: reply.content }]);
    } catch (e) {
      setMessages([
        ...updated,
        { role: "assistant", content: `Error: ${e}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMockMessages = (msgs: { role: string; content: string }[]) => {
    setMessages(msgs as Message[]);
    setPendingQuery(null);
  };

  const handleRunQuery = (sql: string) => {
    setPendingQuery(sql);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">AI Query Assistant</h2>
          <StatusBadge
            variant={mode === "live" ? "success" : "warning"}
            label={mode === "live" ? "Live (Claude API)" : "Mock Mode"}
          />
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setPendingQuery(null);
            }}
            className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Mock scenario picker */}
      {mode === "mock" && <div data-tour="assistant-scenarios" data-trace="assistant.mock-player"><MockPlayer onLoadMessages={handleLoadMockMessages} /></div>}

      {/* Main content: Chat + Query Preview side by side */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat */}
        <Panel title="Chat" className="flex-1" noPadding dataTour="assistant-chat" dataTrace="assistant.chat-panel" tooltip="Chat with the AI assistant about your data">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            loading={loading}
            onRunQuery={handleRunQuery}
          />
        </Panel>

        {/* Query preview sidebar */}
        {pendingQuery && (
          <div className="w-[400px] shrink-0" data-trace="assistant.query-preview">
            <QueryPreview sql={pendingQuery} onClear={() => setPendingQuery(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
