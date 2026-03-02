import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


export const referenceOperations: ViewOperations = {
  viewId: "reference",
  label: "Reference Data",
  operations: [
    {
      id: "browse_golden_records",
      name: "Browse Golden Records",
      description:
        "Select an entity tab and browse its deduplicated golden records with confidence scores.",
    },
    {
      id: "view_provenance",
      name: "View Field Provenance",
      description:
        "Examine field-level provenance showing the source and confidence of each golden record field.",
    },
    {
      id: "view_cross_references",
      name: "View Cross-References",
      description:
        "See downstream records that reference this golden record via foreign keys.",
    },
    {
      id: "reconcile_entity",
      name: "Reconcile Entity",
      description:
        "Trigger reconciliation to match and merge source records into golden records.",
      scenarioId: "s32_reference_data_reconciliation",
    },
    {
      id: "override_field",
      name: "Override Field (API)",
      description:
        "Manually override a golden record field via POST /api/reference/{entity}/{golden_id}/override.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Golden records are deduplicated master records with a unique golden_id and natural key (e.g., ISIN for products)",
    "Field-level provenance tracks where each value came from — source file, confidence score, and timestamp",
    "Reconciliation re-runs match/merge against source data and reports new, updated, and conflict counts",
    "Use POST /api/reference/{entity}/{golden_id}/override to manually correct a golden record field with justification",
  ],
};
