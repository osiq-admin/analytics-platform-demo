import type { ViewTrace } from "../architectureRegistryTypes";

export const referenceDataSections: ViewTrace = {
  viewId: "reference",
  viewName: "Reference Data",
  route: "/reference",
  sections: [
    {
      id: "reference.entity-tabs",
      displayName: "Entity Tab Selector",
      viewId: "reference",
      description:
        "Entity tabs driven by reference configs API — product, venue, account, trader with record count badges",
      files: [
        { path: "frontend/src/views/ReferenceData/index.tsx", role: "Renders entity tab bar with record count badges" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/reference/configs",
          role: "Returns reference entity configs with record counts",
          routerFile: "backend/api/reference.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/reference/configs/*.json",
          category: "metadata",
          role: "Reference entity configuration files",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Entity tabs and record counts fully driven by reference config API",
      metadataOpportunities: [],
    },
    {
      id: "reference.golden-list",
      displayName: "Golden Record List",
      viewId: "reference",
      description:
        "Scrollable list of deduplicated golden records loaded from /api/reference/{entity} with golden_id, natural key, confidence, and status",
      files: [
        { path: "frontend/src/views/ReferenceData/index.tsx", role: "Renders golden record list with confidence and status badges" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/reference/{entity}",
          role: "Returns golden records for an entity",
          routerFile: "backend/api/reference.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/reference/{entity}/*.json",
          category: "data",
          role: "Golden record JSON files",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Golden records fully loaded from API with metadata-driven fields",
      metadataOpportunities: [],
    },
    {
      id: "reference.detail-panel",
      displayName: "Detail & Provenance Panel",
      viewId: "reference",
      description:
        "Field-level provenance table showing value, source, confidence for each golden record field — plus source records and cross-references",
      files: [
        { path: "frontend/src/views/ReferenceData/index.tsx", role: "Renders field provenance table, source records, and cross-references" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/reference/{entity}/{golden_id}",
          role: "Returns golden record detail with field-level provenance",
          routerFile: "backend/api/reference.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Field provenance, source records, and cross-references all from API",
      metadataOpportunities: [],
    },
    {
      id: "reference.reconciliation",
      displayName: "Reconciliation Dashboard",
      viewId: "reference",
      description:
        "Reconcile button triggers POST /api/reference/{entity}/reconcile — displays source vs golden counts, new/updated/conflicts, duration, and confidence distribution",
      files: [
        { path: "frontend/src/views/ReferenceData/index.tsx", role: "Renders reconciliation trigger and results dashboard" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/reference/{entity}/reconcile",
          role: "Triggers reconciliation and returns match/merge results",
          routerFile: "backend/api/reference.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Reconciliation fully driven by API with metadata-based matching rules",
      metadataOpportunities: [],
    },
  ],
};
