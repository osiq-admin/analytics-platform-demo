import type { ViewTrace } from "../architectureRegistryTypes";

export const caseManagementSections: ViewTrace = {
  viewId: "cases",
  viewName: "Case Management",
  route: "/cases",
  sections: [
    {
      id: "cases.grid",
      displayName: "Cases Grid",
      viewId: "cases",
      description:
        "AG Grid listing all investigation cases with ID, title, status, priority, assignee, linked alert count, SLA status, and created date. Cases link alerts to investigation workflows.",
      files: [
        { path: "frontend/src/views/CaseManagement/index.tsx", role: "Main view with cases grid and tab layout" },
        { path: "frontend/src/stores/caseStore.ts", role: "Fetches and manages cases" },
        { path: "backend/api/cases.py", role: "Serves case data" },
      ],
      stores: [
        {
          name: "caseStore",
          path: "frontend/src/stores/caseStore.ts",
          role: "Provides cases array and CRUD actions",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/cases",
          role: "Returns all cases",
          routerFile: "backend/api/cases.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/cases/*.json",
          category: "metadata",
          role: "Case JSON files on disk",
          editHint: "Cases created via API from alert triage",
        },
      ],
      technologies: [{ name: "AG Grid", role: "Renders cases table with badge cell renderers" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Cases stored as JSON files. Workflow states (badges, transitions) loaded from metadata. Grid columns defined in metadata. Layout is code-driven.",
    },
    {
      id: "cases.detail",
      displayName: "Case Detail",
      viewId: "cases",
      description:
        "Tabbed detail view of a case showing summary with status transition buttons, investigation timeline, linked alerts, and regulatory report generation.",
      files: [
        {
          path: "frontend/src/views/CaseManagement/CaseDetail.tsx",
          role: "Tabbed case detail panel with summary, timeline, linked alerts, reports",
        },
        { path: "frontend/src/stores/caseStore.ts", role: "Provides case detail and update actions" },
      ],
      stores: [
        {
          name: "caseStore",
          path: "frontend/src/stores/caseStore.ts",
          role: "Provides selected case with full details and status update",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/cases/{case_id}",
          role: "Returns single case with annotations",
          routerFile: "backend/api/cases.py",
        },
        {
          method: "PUT",
          path: "/api/cases/{case_id}/status",
          role: "Updates case status (open → investigating → resolved)",
          routerFile: "backend/api/cases.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/cases/*.json",
          category: "metadata",
          role: "Case files with full detail including annotations",
        },
        {
          path: "workspace/metadata/workflows/case_management.json",
          category: "metadata",
          role: "Workflow state definitions with transitions and badge variants",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Case content is metadata-driven JSON. Workflow transitions loaded from metadata. Tab structure and display layout are code-driven.",
    },
    {
      id: "cases.timeline",
      displayName: "Investigation Timeline",
      viewId: "cases",
      description:
        "Chronological timeline of investigation annotations on a case. Each annotation shows type badge, author, timestamp, and content. Supports note, disposition, escalation, and evidence types.",
      files: [
        {
          path: "frontend/src/views/CaseManagement/CaseTimeline.tsx",
          role: "Timeline rendering with type-colored badges",
        },
        { path: "frontend/src/stores/caseStore.ts", role: "Provides case annotations array" },
        { path: "backend/api/cases.py", role: "Handles annotation creation" },
      ],
      stores: [
        {
          name: "caseStore",
          path: "frontend/src/stores/caseStore.ts",
          role: "Provides annotations and addAnnotation action",
        },
      ],
      apis: [
        {
          method: "POST",
          path: "/api/cases/{case_id}/annotate",
          role: "Adds investigation annotation to case",
          routerFile: "backend/api/cases.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/cases/*.json",
          category: "metadata",
          role: "Case annotations stored as nested array in case JSON",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Annotations are metadata objects with typed fields. Timeline layout is code-driven.",
    },
    {
      id: "cases.linked-alerts",
      displayName: "Linked Alerts",
      viewId: "cases",
      description:
        "Table showing alert summaries linked to the case. Displays alert ID, detection model, score, and date. Provides navigation to the full alert detail in Risk Case Manager.",
      files: [
        {
          path: "frontend/src/views/CaseManagement/LinkedAlerts.tsx",
          role: "Linked alerts list with navigation buttons",
        },
        { path: "frontend/src/stores/caseStore.ts", role: "Provides alert_ids from selected case" },
      ],
      stores: [
        {
          name: "caseStore",
          path: "frontend/src/stores/caseStore.ts",
          role: "Provides linked alert IDs for the selected case",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/cases/for-alert/{alert_id}",
          role: "Finds cases linked to a given alert",
          routerFile: "backend/api/cases.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace files referenced by case alert_ids",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Alert linkage is metadata-driven (alert_ids array). Alert detail comes from alert trace files. Navigation is code-driven.",
    },
    {
      id: "cases.status-actions",
      displayName: "Status Transition Actions",
      viewId: "cases",
      description:
        "Status transition buttons in case detail that follow the case_management workflow metadata. Valid transitions determined by current state (e.g., open → investigating, investigating → escalated/resolved).",
      files: [
        {
          path: "frontend/src/views/CaseManagement/CaseDetail.tsx",
          role: "Renders transition buttons based on workflow metadata",
        },
        { path: "frontend/src/stores/caseStore.ts", role: "Provides updateStatus action" },
        { path: "backend/api/cases.py", role: "Handles status transitions" },
        { path: "backend/services/case_service.py", role: "Validates and persists status changes" },
      ],
      stores: [
        {
          name: "caseStore",
          path: "frontend/src/stores/caseStore.ts",
          role: "Provides updateStatus action for workflow transitions",
        },
      ],
      apis: [
        {
          method: "PUT",
          path: "/api/cases/{case_id}/status",
          role: "Transitions case to new workflow state",
          routerFile: "backend/api/cases.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/workflows/case_management.json",
          category: "metadata",
          role: "Defines valid state transitions and badge variants",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Workflow transitions and badge variants loaded from metadata. Button rendering logic is code-driven but state machine is metadata-defined.",
    },
  ],
};
