import type { ViewTrace } from "../architectureRegistryTypes";

export const submissionsSections: ViewTrace = {
  viewId: "submissions",
  viewName: "Submissions",
  route: "/submissions",
  sections: [
    {
      id: "submissions.grid",
      displayName: "Submissions Grid",
      viewId: "submissions",
      description:
        "AG Grid listing all metadata change submissions with ID, name, author, status, components count, and created date. Submissions represent proposed metadata changes for review.",
      files: [
        { path: "frontend/src/views/Submissions/index.tsx", role: "Main view with submissions grid" },
        { path: "frontend/src/stores/submissionStore.ts", role: "Fetches and manages submissions" },
        { path: "backend/api/submissions.py", role: "Serves submission data" },
      ],
      stores: [
        {
          name: "submissionStore",
          path: "frontend/src/stores/submissionStore.ts",
          role: "Provides submissions array and CRUD actions",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/submissions",
          role: "Returns all submissions",
          routerFile: "backend/api/submissions.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/submissions/*.json",
          category: "metadata",
          role: "Submission JSON files on disk",
          editHint: "Submissions created via API or UI",
        },
      ],
      technologies: [{ name: "AG Grid", role: "Renders submissions table" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Submissions are stored as JSON files and represent metadata change proposals. The submission format is somewhat flexible but the workflow is code-driven.",
    },
    {
      id: "submissions.detail",
      displayName: "Submission Detail",
      viewId: "submissions",
      description:
        "Tabbed detail view of a submission showing summary, components (proposed changes), recommendations, reviewer comments, and impact analysis.",
      files: [
        {
          path: "frontend/src/views/Submissions/SubmissionDetail.tsx",
          role: "Tabbed submission detail panel",
        },
        { path: "frontend/src/stores/submissionStore.ts", role: "Provides submission detail data" },
      ],
      stores: [
        {
          name: "submissionStore",
          path: "frontend/src/stores/submissionStore.ts",
          role: "Provides selected submission with full details",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/submissions/*.json",
          category: "metadata",
          role: "Submission files with full detail",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Submission content comes from metadata-like JSON files. Tab structure and display layout are code-driven.",
    },
    {
      id: "submissions.review-actions",
      displayName: "Review Actions",
      viewId: "submissions",
      description:
        "Approve, reject, and implement action buttons for submission review workflow. Includes recommendation generation and status transitions.",
      files: [
        {
          path: "frontend/src/views/Submissions/ReviewActions.tsx",
          role: "Review action buttons and workflow logic",
        },
        { path: "frontend/src/stores/submissionStore.ts", role: "Provides status update actions" },
        { path: "backend/api/submissions.py", role: "Handles status updates and recommendations" },
      ],
      stores: [
        {
          name: "submissionStore",
          path: "frontend/src/stores/submissionStore.ts",
          role: "Provides updateStatus and recommend actions",
        },
      ],
      apis: [
        {
          method: "PUT",
          path: "/api/submissions/{id}/status",
          role: "Updates submission status (approve/reject)",
          routerFile: "backend/api/submissions.py",
        },
        {
          method: "POST",
          path: "/api/submissions/{id}/recommend",
          role: "Generates recommendations for submission",
          routerFile: "backend/api/submissions.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/submissions/*.json",
          category: "metadata",
          role: "Submission files updated by review actions",
        },
        {
          path: "workspace/metadata/workflows/submission.json",
          category: "metadata",
          role: "Workflow state definitions with transitions and badge variants",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Workflow states (labels, badge variants, allowed transitions) loaded from metadata JSON via API. Submission content is metadata-driven. Review action logic remains in code.",
      metadataOpportunities: [
        "Add custom actions per workflow state from metadata",
      ],
    },
  ],
};
