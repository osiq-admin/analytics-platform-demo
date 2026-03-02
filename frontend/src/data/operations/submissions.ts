import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 15. Submissions Queue
// --------------------------------------------------------------------------
export const submissionsOperations: ViewOperations = {
  viewId: "submissions",
  label: "Submissions Queue",
  operations: [
    {
      id: "browse_queue",
      name: "Browse Submission Queue",
      description:
        "View all submitted use cases, model changes, and configuration updates awaiting review and approval.",
      scenarioId: "s17_review_submission",
    },
    {
      id: "review_submission",
      name: "Review a Submission",
      description:
        "Open a submission to review its details: changes made, test results, impact analysis, and submitter notes.",
      scenarioId: "s17_review_submission",
    },
    {
      id: "approve_reject",
      name: "Approve or Reject",
      description:
        "Make a decision on a submission: approve for deployment, reject with feedback, or request changes.",
      scenarioId: "s18_implement_feedback",
    },
    {
      id: "write_comments",
      name: "Write Review Comments",
      description:
        "Add comments to a submission with specific feedback, questions, or required changes before approval.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Submissions are sorted by priority and submission date by default",
    "The impact analysis shows which alerts and models would be affected by the change",
    "Rejected submissions include feedback that the submitter can address and resubmit",
  ],
};
