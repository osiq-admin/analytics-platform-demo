import type { TourDefinition } from "../../stores/tourStore.ts";


// --------------------------------------------------------------------------
// Case Management Tour (5 steps)
// --------------------------------------------------------------------------
export const casesTour: TourDefinition = {
  id: "cases",
  name: "Case Management Tour",
  description: "Explore investigation case lifecycle: case grid, detail view, investigation timeline, linked alerts, and status transitions.",
  steps: [
    {
      target: "[data-tour='cases-grid']",
      title: "Cases Grid",
      content: "The cases grid shows all investigation cases with status, priority, assignee, linked alert count, and SLA tracking. Click any row to open the case detail view.",
      placement: "bottom",
      route: "/cases",
    },
    {
      target: "[data-tour='cases-detail']",
      title: "Case Detail",
      content: "The detail panel shows case summary with metadata fields, status transition buttons, and tabbed sub-views for timeline, linked alerts, and regulatory reports.",
      placement: "left",
      route: "/cases",
    },
    {
      target: "[data-tour='cases-timeline']",
      title: "Investigation Timeline",
      content: "The timeline tab shows all investigation annotations in chronological order. Each entry has a type badge (note, disposition, escalation, evidence), author, and timestamp.",
      placement: "left",
      route: "/cases",
    },
    {
      target: "[data-tour='cases-linked-alerts']",
      title: "Linked Alerts",
      content: "The linked alerts tab shows all alerts connected to this case. Click 'View' to navigate to the full alert detail in Risk Case Manager for deeper investigation.",
      placement: "left",
      route: "/cases",
    },
    {
      target: "[data-tour='cases-status-actions']",
      title: "Status Transitions",
      content: "Use the status buttons to move the case through the investigation workflow: Open → Investigating → Escalated/Resolved → Closed. Transitions follow the case_management workflow metadata.",
      placement: "top",
      route: "/cases",
    },
  ],
};
