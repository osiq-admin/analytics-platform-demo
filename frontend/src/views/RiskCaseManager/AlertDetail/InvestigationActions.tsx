import { useState } from "react";
import { useCaseStore } from "../../../stores/caseStore.ts";
import type { AlertTrace } from "../../../stores/alertStore.ts";

interface InvestigationActionsProps {
  alert: AlertTrace;
}

export default function InvestigationActions({ alert }: InvestigationActionsProps) {
  const { createCase } = useCaseStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(`Investigation: ${alert.alert_id}`);
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createCase({
        title,
        alert_ids: [alert.alert_id],
        priority,
        category: "market_abuse",
      });
      setCreated(result.case_id);
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-500">
        <span>Case created:</span>
        <span className="font-mono">{created}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-xs rounded border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          Create Case
        </button>
      ) : (
        <div className="space-y-2 p-2 rounded border border-border bg-muted/5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Case title"
            className="w-full px-2 py-1 text-xs rounded border border-border bg-background text-foreground"
          />
          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-border bg-background text-foreground"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="px-3 py-1 text-xs rounded border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
