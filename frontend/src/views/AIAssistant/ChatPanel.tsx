import { useState, useRef, useEffect } from "react";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (content: string) => void;
  loading: boolean;
  onRunQuery?: (sql: string) => void;
}

function extractCodeBlocks(text: string): { before: string; code: string; lang: string; after: string }[] {
  const blocks: { before: string; code: string; lang: string; after: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      before: text.slice(lastIndex, match.index),
      code: match[2].trim(),
      lang: match[1] || "sql",
      after: "",
    });
    lastIndex = match.index + match[0].length;
  }

  if (blocks.length === 0) {
    return [{ before: text, code: "", lang: "", after: "" }];
  }

  // Attach trailing text to last block
  if (lastIndex < text.length) {
    blocks[blocks.length - 1].after = text.slice(lastIndex);
  }

  return blocks;
}

function renderMarkdownText(text: string): React.ReactNode[] {
  // Split into lines and render basic markdown: **bold**, `code`, - list items
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  function renderInline(line: string, key: number): React.ReactNode {
    // Process **bold** and `code` inline
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
    let lastIdx = 0;
    let match;
    let partKey = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        parts.push(line.slice(lastIdx, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={partKey++}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(
          <code key={partKey++} className="bg-background/50 border border-border rounded px-1 text-xs">
            {match[3]}
          </code>
        );
      }
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < line.length) {
      parts.push(line.slice(lastIdx));
    }
    return <span key={key}>{parts.length > 0 ? parts : line}</span>;
  }

  let inList = false;
  let listItems: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^- (.+)/);

    if (listMatch) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(<li key={i}>{renderInline(listMatch[1], i)}</li>);
    } else {
      if (inList) {
        result.push(<ul key={`ul-${i}`} className="list-disc list-inside my-1 space-y-0.5">{listItems}</ul>);
        inList = false;
        listItems = [];
      }
      if (line.trim()) {
        result.push(<div key={i}>{renderInline(line, i)}</div>);
      } else if (i > 0 && i < lines.length - 1) {
        result.push(<div key={i} className="h-2" />);
      }
    }
  }
  if (inList) {
    result.push(<ul key="ul-end" className="list-disc list-inside my-1 space-y-0.5">{listItems}</ul>);
  }

  return result;
}

function MessageBubble({ msg, onRunQuery }: { msg: Message; onRunQuery?: (sql: string) => void }) {
  const isUser = msg.role === "user";
  const blocks = extractCodeBlocks(msg.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-accent/20 text-foreground"
            : "bg-surface-elevated border border-border text-foreground"
        }`}
      >
        {blocks.map((block, i) => (
          <div key={i}>
            {block.before && (
              <div className="space-y-0.5">{renderMarkdownText(block.before.trim())}</div>
            )}
            {block.code && (
              <div className="my-2">
                <div className="flex items-center justify-between bg-background/50 rounded-t border border-border px-2 py-1">
                  <span className="text-xs text-muted uppercase">{block.lang}</span>
                  {block.lang === "sql" && onRunQuery && (
                    <button
                      onClick={() => onRunQuery(block.code)}
                      className="text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      Run Query
                    </button>
                  )}
                </div>
                <pre className="bg-background/50 rounded-b border border-t-0 border-border p-2 text-xs overflow-x-auto">
                  <code>{block.code}</code>
                </pre>
              </div>
            )}
            {block.after && (
              <div className="space-y-0.5">{renderMarkdownText(block.after.trim())}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatPanel({ messages, onSend, loading, onRunQuery }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm py-8">
            Ask a question about the trade surveillance data.
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onRunQuery={onRunQuery} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border p-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the data..."
          disabled={loading}
          className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 text-sm rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
