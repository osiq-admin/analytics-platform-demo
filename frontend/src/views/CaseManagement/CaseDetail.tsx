import { useState } from "react";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { Case } from "../../stores/caseStore.ts";
import CaseTimeline from "./CaseTimeline.tsx";
import LinkedAlerts from "./LinkedAlerts.tsx";
import ReportGenerator from "./ReportGenerator.tsx";

interface CaseDetailProps {
  caseData: Case;
  onStatusUpdate: (status: string) => void;
  variantMap: Record<string, string>;
}

type Tab = "summary" | "timeline" | "linked_alerts" | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "timeline", label: "Timeline" },
  { key: "linked_alerts", label: "Linked Alerts" },
  { key: "reports", label: "Reports" },
];

/* Transitions map for status action buttons */
const TRANSITIONS: Record<string, string[]> = {
  open: ["investigating"],
  investigating: ["escalated", "resolved"],
  escalated: ["investigating", "resolved"],
  resolved: ["closed", "investigating"],
  closed: [],
};

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function priorityVariant(p: string) {
  switch (p) {
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

export default function CaseDetail({
  caseData,
  onStatusUpdate,
}: CaseDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const transitions = TRANSITIONS[caseData.status] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "timeline" && caseData.annotations.length > 0 && (
              <span className="ml-1 text-[9px] opacity-60">
                ({caseData.annotations.length})
              </span>
            )}
            {tab.key === "linked_alerts" && (
              <span className="ml-1 text-[9px] opacity-60">
                ({caseData.alert_ids.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "summary" && (
          <div className="space-y-4" data-tour="cases-detail">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted">Case ID:</span>{" "}
                <span className="font-mono">{caseData.case_id}</span>
              </div>
              <div>
                <span className="text-muted">Priority:</span>{" "}
                <StatusBadge
                  label={caseData.priority}
                  variant={priorityVariant(caseData.priority)}
                />
              </div>
              <div>
                <span className="text-muted">Category:</span>{" "}
                {caseData.category.replace(/_/g, " ")}
              </div>
              <div>
                <span className="text-muted">Assignee:</span>{" "}
                {caseData.assignee}
              </div>
              <div>
                <span className="text-muted">Created:</span>{" "}
                {formatTimestamp(caseData.created_at)}
              </div>
              <div>
                <span className="text-muted">SLA:</span>{" "}
                <StatusBadge
                  label={caseData.sla.sla_status.replace(/_/g, " ")}
                  variant={
                    caseData.sla.sla_status === "breached"
                      ? "error"
                      : caseData.sla.sla_status === "at_risk"
                        ? "warning"
                        : "success"
                  }
                />
              </div>
              {caseData.resolved_at && (
                <div>
                  <span className="text-muted">Resolved:</span>{" "}
                  {formatTimestamp(caseData.resolved_at)}
                </div>
              )}
              {caseData.disposition && (
                <div>
                  <span className="text-muted">Disposition:</span>{" "}
                  {caseData.disposition}
                </div>
              )}
            </div>
            {caseData.description && (
              <p className="text-xs text-muted">{caseData.description}</p>
            )}

            {/* Status transitions */}
            {transitions.length > 0 && (
              <div
                className="flex gap-2 pt-2 border-t border-border"
                data-tour="cases-status-actions"
              >
                <span className="text-xs text-muted self-center">
                  Transition to:
                </span>
                {transitions.map((t) => (
                  <button
                    key={t}
                    onClick={() => onStatusUpdate(t)}
                    className="px-2 py-1 text-[10px] rounded border border-border text-foreground hover:bg-muted/20 transition-colors capitalize"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div data-tour="cases-timeline">
            <CaseTimeline annotations={caseData.annotations} />
          </div>
        )}

        {activeTab === "linked_alerts" && (
          <div data-tour="cases-linked-alerts">
            <LinkedAlerts alertIds={caseData.alert_ids} />
          </div>
        )}

        {activeTab === "reports" && (
          <ReportGenerator caseId={caseData.case_id} />
        )}
      </div>
    </div>
  );
}
