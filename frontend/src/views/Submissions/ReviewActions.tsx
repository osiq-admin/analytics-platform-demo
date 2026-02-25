import { useState } from "react";
import type { Submission } from "../../stores/submissionStore.ts";

interface ReviewActionsProps {
  submission: Submission;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  onRequestChanges: (comment: string) => void;
}

export default function ReviewActions({
  submission,
  onApprove,
  onReject,
  onRequestChanges,
}: ReviewActionsProps) {
  const [comment, setComment] = useState("");

  const canReview =
    submission.status === "pending" || submission.status === "in_review";

  if (!canReview) return null;

  return (
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">
        Review Actions
      </p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a review comment..."
        className="w-full h-20 bg-surface border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            onApprove(comment);
            setComment("");
          }}
          className="px-3 py-1.5 text-xs rounded font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => {
            onRequestChanges(comment);
            setComment("");
          }}
          className="px-3 py-1.5 text-xs rounded font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
        >
          Request Changes
        </button>
        <button
          onClick={() => {
            onReject(comment);
            setComment("");
          }}
          className="px-3 py-1.5 text-xs rounded font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
