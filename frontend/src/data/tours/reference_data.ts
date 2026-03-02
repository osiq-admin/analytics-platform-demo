import type { TourDefinition } from "../../stores/tourStore.ts";


export const reference_dataTour: TourDefinition = {
  id: "reference-data",
  name: "Reference Data / MDM",
  description: "Explore golden records, field-level provenance, and reconciliation for master data management",
  steps: [
    {
      target: "[data-tour='reference-entity-tabs']",
      title: "Entity Tabs",
      content: "Select a master data entity — product, venue, account, or trader — to browse its golden records. Each tab shows the record count from the reference config API.",
      placement: "bottom",
    },
    {
      target: "[data-tour='reference-golden-list']",
      title: "Golden Record List",
      content: "Browse deduplicated, reconciled master records. Each shows a unique golden ID, the natural key (e.g., ISIN for products), confidence score, and active/override status.",
      placement: "right",
    },
    {
      target: "[data-tour='reference-detail']",
      title: "Record Detail & Provenance",
      content: "View field-level provenance showing where each value came from — source file, confidence score, and last updated timestamp. Includes source record links and downstream cross-references.",
      placement: "left",
    },
    {
      target: "[data-tour='reference-reconciliation']",
      title: "Reconciliation Dashboard",
      content: "Trigger reconciliation to match and merge source records into golden records. View results: source vs golden counts, new/updated records, conflicts, and confidence distribution (high/medium/low).",
      placement: "top",
    },
  ],
};
