import { useState, useEffect } from "react";
import { api } from "../../api/client.ts";

interface MockSequence {
  id: string;
  title: string;
}

interface MockPlayerProps {
  onLoadMessages: (messages: { role: string; content: string }[]) => void;
}

export default function MockPlayer({ onLoadMessages }: MockPlayerProps) {
  const [sequences, setSequences] = useState<MockSequence[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MockSequence[]>("/ai/mock-sequences")
      .then(setSequences)
      .catch(() => {});
  }, []);

  const loadSequence = async (id: string) => {
    try {
      const data = await api.get<{ id: string; messages: { role: string; content: string }[] }>(
        `/ai/mock-sequences/${id}`
      );
      setActiveId(id);
      onLoadMessages(data.messages);
    } catch {
      // ignore
    }
  };

  if (sequences.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sequences.map((seq) => (
        <button
          key={seq.id}
          onClick={() => loadSequence(seq.id)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            activeId === seq.id
              ? "border-accent bg-accent/20 text-accent"
              : "border-border text-muted hover:text-foreground hover:border-foreground/30"
          }`}
        >
          {seq.title}
        </button>
      ))}
    </div>
  );
}
