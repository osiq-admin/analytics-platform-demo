import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// Case Management Operations
// --------------------------------------------------------------------------
export const casesOperations: ViewOperations = {
  viewId: "cases",
  label: "Case Management",
  operations: [
    {
      id: "browse_cases",
      name: "Browse Investigation Cases",
      description:
        "View all investigation cases in the grid with status, priority, assignee, SLA tracking, and linked alert counts.",
      scenarioId: "s40_case_management",
    },
    {
      id: "view_case_detail",
      name: "View Case Detail",
      description:
        "Click a case row to open the detail panel showing summary metadata, status, and investigation context.",
      scenarioId: "s40_case_management",
    },
    {
      id: "add_investigation_note",
      name: "Add Investigation Note",
      description:
        "Add annotations to a case during investigation: notes, dispositions, escalations, and evidence entries.",
    },
    {
      id: "transition_status",
      name: "Transition Case Status",
      description:
        "Move a case through the workflow: Open → Investigating → Escalated/Resolved → Closed, following valid transitions.",
    },
    {
      id: "view_timeline",
      name: "View Investigation Timeline",
      description:
        "Review the chronological timeline of all investigation annotations, showing who did what and when.",
    },
    {
      id: "view_linked_alerts",
      name: "View Linked Alerts",
      description:
        "See all alerts connected to a case and navigate to the full alert detail in Risk Case Manager.",
    },
  ],
  tips: [
    "Cases are created from alerts in the Risk Case Manager — click 'Create Case' on any alert",
    "SLA tracking shows time remaining before regulatory response deadlines",
    "The investigation timeline provides a complete audit trail for regulatory reporting",
    "Use the Dashboard tab for compliance officer metrics and trend analysis",
  ],
};
