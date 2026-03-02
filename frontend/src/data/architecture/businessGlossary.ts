import type { ViewTrace } from "../architectureRegistryTypes";

export const businessGlossarySections: ViewTrace = {
  viewId: "glossary",
  viewName: "Business Glossary",
  route: "/glossary",
  sections: [
    {
      id: "glossary.category-browser",
      displayName: "Category Sidebar",
      viewId: "glossary",
      description:
        "Category sidebar with term counts. Six categories loaded from glossary metadata: Market Abuse, Data Entities, Metrics, Regulatory, Data Quality, Architecture. Click to filter the term list.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders category sidebar with click-to-filter" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Fetches categories from API" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/categories", role: "Returns categories with term counts", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/glossary/categories.json", category: "metadata", role: "Category definitions (id, name, icon, order)" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Categories loaded from JSON metadata via API.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.term-list",
      displayName: "Term List Grid",
      viewId: "glossary",
      description:
        "Searchable term grid with business name, category, status badge, owner, and mapping count. Terms with 'planned' status shown with dashed border. Search checks term_id, business_name, definition, and synonyms.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders term table with search filtering" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Fetches terms with category/search filters" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/terms", role: "Returns terms with optional category and search filters", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/glossary/terms.json", category: "metadata", role: "45 ISO 11179-compliant business terms" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
        { name: "Tailwind CSS", role: "Styling including planned term dashed borders" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "All terms from JSON metadata via API with server-side filtering.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.term-detail",
      displayName: "Term Detail Panel",
      viewId: "glossary",
      description:
        "Full ISO 11179 term definition with Object Class + Property + Representation decomposition, FIBO ontology alignment, BCBS 239 principle, technical entity.field mappings, regulatory references, synonyms, and related terms.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders detail panel with ISO 11179 and FIBO sections" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Selected term from fetched list" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/terms/{term_id}", role: "Single term detail (used for GlossaryTooltip)", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/glossary/terms.json", category: "metadata", role: "Term definitions with ISO 11179, FIBO, BCBS 239 metadata" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "All term fields from JSON metadata — ISO 11179, FIBO, BCBS 239, regulatory references.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.semantic-metrics",
      displayName: "Semantic Metrics Grid",
      viewId: "glossary",
      description:
        "Business-friendly computed metrics with SQL formula, source tier, unit, sliceable dimensions, and BCBS 239 principle. Click for detail panel showing formula and dimension list.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders metric table and detail panel" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Fetches metrics and dimensions from API" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/metrics", role: "Returns semantic metrics with optional tier filter", routerFile: "backend/api/glossary.py" },
        { method: "GET", path: "/api/glossary/dimensions", role: "Returns reusable dimensions", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/semantic/metrics.json", category: "metadata", role: "12 business metric definitions" },
        { path: "workspace/metadata/semantic/dimensions.json", category: "metadata", role: "7 reusable dimension definitions" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Metrics and dimensions from JSON metadata via API.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.dmbok-coverage",
      displayName: "DAMA-DMBOK Knowledge Area Cards",
      viewId: "glossary",
      description:
        "11 DAMA-DMBOK 2.0 knowledge area cards in a 3-column grid. Each card shows coverage badge (high/medium), description, and platform capabilities. 10 areas at high coverage, 1 at medium.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders 3-column card grid with coverage badges" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Fetches DMBOK data from API" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/dmbok", role: "Returns DAMA-DMBOK coverage data", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/dmbok/coverage.json", category: "metadata", role: "11 knowledge area definitions with capabilities" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Tailwind CSS", role: "3-column card grid layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "All 11 knowledge areas from JSON metadata via API.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.ownership-matrix",
      displayName: "Ownership Matrix",
      viewId: "glossary",
      description:
        "Term ownership grouped by owner and domain. Shows {owner: {domain: [term_ids]}} matrix with expandable groups and term count badges.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders grouped ownership display" },
      ],
      stores: [],
      apis: [
        { method: "GET", path: "/api/glossary/ownership", role: "Returns ownership matrix", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/glossary/terms.json", category: "metadata", role: "Term owner and domain fields" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Ownership derived from term metadata owner/domain fields.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.standards-compliance",
      displayName: "Standards Compliance Table",
      viewId: "glossary",
      description:
        "Table of 18 standards the platform complies with (ISO, FIX, MAR, MiFID II, etc.) with compliance level badges (full/partial/reference). Separate roadmap section for 10 gap standards with suggested phases.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders compliance table and roadmap section" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Fetches standards from API" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/standards", role: "Returns compliance registry", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/standards/compliance_registry.json", category: "metadata", role: "18 compliant + 10 gap standards" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "All standards from JSON registry via API.",
      metadataOpportunities: [],
    },
    {
      id: "glossary.entity-gaps",
      displayName: "Entity Gap Analysis",
      viewId: "glossary",
      description:
        "Per-entity expandable cards showing missing attributes with ISO standard references, regulatory need descriptions, and priority badges (high/medium/low). 25 gaps across 8 entities.",
      files: [
        { path: "frontend/src/views/BusinessGlossary/index.tsx", role: "Renders entity gap cards with attribute tables" },
      ],
      stores: [
        { name: "glossaryStore", path: "frontend/src/stores/glossaryStore.ts", role: "Fetches entity gaps from API" },
      ],
      apis: [
        { method: "GET", path: "/api/glossary/entity-gaps", role: "Returns entity attribute gap analysis", routerFile: "backend/api/glossary.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/glossary/entity_gaps.json", category: "metadata", role: "25 missing attributes across 8 entities" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "All gap data from JSON metadata via API.",
      metadataOpportunities: [],
    },
  ],
};
