import { useState } from "react";
import type { Submission } from "../../stores/submissionStore.ts";
import StatusBadge from "../../components/StatusBadge.tsx";
import ReviewActions from "./ReviewActions.tsx";

interface SubmissionDetailProps {
  submission: Submission;
  onStatusUpdate: (status: string, comment?: string) => void;
  onRefreshRecommendations: () => void;
}

type Tab = "summary" | "components" | "recommendations" | "comments" | "impact";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "components", label: "Components" },
  { key: "recommendations", label: "Recommendations" },
  { key: "comments", label: "Comments" },
  { key: "impact", label: "Impact" },
];

function statusVariant(status: string) {
  switch (status) {
    case "approved":
    case "implemented":
      return "success" as const;
    case "rejected":
      return "error" as const;
    case "in_review":
      return "warning" as const;
    case "pending":
      return "info" as const;
    default:
      return "muted" as const;
  }
}

function severityVariant(severity: string) {
  switch (severity) {
    case "critical":
    case "high":
      return "error" as const;
    case "medium":
      return "warning" as const;
    case "low":
      return "info" as const;
    default:
      return "muted" as const;
  }
}

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function SubmissionDetail({
  submission,
  onStatusUpdate,
  onRefreshRecommendations,
}: SubmissionDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "comments" && submission.comments.length > 0 && (
              <span className="ml-1 text-[10px] text-muted">
                ({submission.comments.length})
              </span>
            )}
            {tab.key === "recommendations" && submission.recommendations.length > 0 && (
              <span className="ml-1 text-[10px] text-muted">
                ({submission.recommendations.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "summary" && (
          <SummaryTab submission={submission} />
        )}
        {activeTab === "components" && (
          <ComponentsTab submission={submission} />
        )}
        {activeTab === "recommendations" && (
          <RecommendationsTab
            submission={submission}
            onRefresh={onRefreshRecommendations}
          />
        )}
        {activeTab === "comments" && (
          <CommentsTab submission={submission} />
        )}
        {activeTab === "impact" && (
          <ImpactTab submission={submission} />
        )}
      </div>

      {/* Review actions */}
      <div className="shrink-0 px-3 pb-3">
        <ReviewActions
          submission={submission}
          onApprove={(comment) => onStatusUpdate("approved", comment)}
          onReject={(comment) => onStatusUpdate("rejected", comment)}
          onRequestChanges={(comment) => onStatusUpdate("in_review", comment)}
        />
      </div>
    </div>
  );
}

/* ---------- Summary Tab ---------- */

function SummaryTab({ submission }: { submission: Submission }) {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {submission.name}
          </h3>
          <p className="text-muted mt-0.5">{submission.submission_id}</p>
        </div>
        <StatusBadge
          label={submission.status}
          variant={statusVariant(submission.status)}
        />
      </div>

      {submission.description && (
        <p className="text-foreground/80">{submission.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-1">
        <Field label="Author" value={submission.author} />
        <Field label="Reviewer" value={submission.reviewer ?? "Unassigned"} />
        <Field label="Use Case" value={submission.use_case_id} />
        <Field label="Components" value={String(submission.components.length)} />
        <Field label="Created" value={formatTimestamp(submission.created_at)} />
        <Field label="Updated" value={formatTimestamp(submission.updated_at)} />
        {submission.implemented_at && (
          <Field
            label="Implemented"
            value={formatTimestamp(submission.implemented_at)}
          />
        )}
      </div>

      {submission.tags.length > 0 && (
        <div className="mt-1">
          <span className="font-semibold text-muted">Tags:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {submission.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent border border-accent/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold text-muted">{label}:</span>{" "}
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}

/* ---------- Components Tab ---------- */

function ComponentsTab({ submission }: { submission: Submission }) {
  if (submission.components.length === 0) {
    return <p className="text-xs text-muted">No components attached.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {submission.components.map((comp, i) => (
        <div
          key={i}
          className="rounded border border-border bg-surface-elevated p-2.5"
        >
          <div className="flex items-center gap-2">
            <StatusBadge
              label={String(comp.type ?? "unknown")}
              variant="info"
            />
            <span className="text-xs font-medium text-foreground">
              {String(comp.id ?? `Component ${i + 1}`)}
            </span>
            {comp.action ? (
              <span className="text-[10px] text-muted ml-auto">
                {String(comp.action)}
              </span>
            ) : null}
          </div>
          {comp.config ? (
            <pre className="text-[10px] text-muted mt-1.5 overflow-x-auto">
              {JSON.stringify(comp.config, null, 2)}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ---------- Recommendations Tab ---------- */

function RecommendationsTab({
  submission,
  onRefresh,
}: {
  submission: Submission;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
          Auto-Generated Recommendations
        </p>
        <button
          onClick={onRefresh}
          className="px-2 py-1 text-[10px] rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          Re-run
        </button>
      </div>

      {submission.recommendations.length === 0 ? (
        <p className="text-xs text-muted">No recommendations generated.</p>
      ) : (
        submission.recommendations.map((rec, i) => (
          <div
            key={i}
            className="rounded border border-border bg-surface-elevated p-2.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge
                label={String(rec.severity ?? rec.type ?? "info")}
                variant={severityVariant(String(rec.severity ?? "info"))}
              />
              <span className="text-xs font-medium text-foreground">
                {String(rec.title ?? rec.message ?? `Recommendation ${i + 1}`)}
              </span>
            </div>
            {rec.description ? (
              <p className="text-[10px] text-foreground/70">
                {String(rec.description)}
              </p>
            ) : null}
            {rec.suggestion ? (
              <p className="text-[10px] text-accent mt-1">
                {String(rec.suggestion)}
              </p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------- Comments Tab ---------- */

function CommentsTab({ submission }: { submission: Submission }) {
  if (submission.comments.length === 0) {
    return <p className="text-xs text-muted">No comments yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {submission.comments.map((comment, i) => (
        <div
          key={i}
          className="rounded border border-border bg-surface-elevated p-2.5"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {comment.author}
              </span>
              <StatusBadge
                label={comment.type}
                variant={
                  comment.type === "approval"
                    ? "success"
                    : comment.type === "rejection"
                      ? "error"
                      : "muted"
                }
              />
            </div>
            <span className="text-[10px] text-muted">
              {formatTimestamp(comment.timestamp)}
            </span>
          </div>
          <p className="text-xs text-foreground/80">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Impact Tab ---------- */

function ImpactTab({ submission }: { submission: Submission }) {
  const typeCounts: Record<string, number> = {};
  for (const comp of submission.components) {
    const t = String(comp.type ?? "unknown");
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  const types = Object.entries(typeCounts);
  const referencedIds = submission.components
    .filter((c) => c.action === "reference" || c.action === "use")
    .map((c) => String(c.id ?? ""));
  const createdIds = submission.components
    .filter((c) => c.action === "create" || c.action === "add")
    .map((c) => String(c.id ?? ""));

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Component type breakdown */}
      <div>
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">
          Component Types
        </p>
        {types.length === 0 ? (
          <p className="text-muted">No components.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {types.map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded border border-border bg-surface-elevated px-2.5 py-1.5"
              >
                <span className="text-foreground/80">{type}</span>
                <span className="font-semibold text-accent">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referenced vs Created */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">
            Referenced ({referencedIds.length})
          </p>
          {referencedIds.length === 0 ? (
            <p className="text-muted">None</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {referencedIds.map((id) => (
                <li key={id} className="text-foreground/70">
                  {id}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">
            Created ({createdIds.length})
          </p>
          {createdIds.length === 0 ? (
            <p className="text-muted">None</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {createdIds.map((id) => (
                <li key={id} className="text-foreground/70">
                  {id}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Expected results summary */}
      {Object.keys(submission.expected_results).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">
            Expected Results
          </p>
          <pre className="text-[10px] text-foreground/70 bg-surface-elevated rounded border border-border p-2 overflow-x-auto">
            {JSON.stringify(submission.expected_results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
