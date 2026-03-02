import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// ---------------------------------------------------------------------------
// Business Glossary (Phase 23)
// ---------------------------------------------------------------------------
export const glossaryOperations: ViewOperations = {
  viewId: "glossary",
  label: "Business Glossary",
  operations: [
    {
      id: "browse_terms",
      name: "Browse Terms by Category",
      description:
        "Use the category sidebar to filter glossary terms. Categories include Market Abuse, Data Entities, Metrics, Regulatory, Data Quality, and Architecture. Click a category to see only terms in that group.",
      scenarioId: "s35_explore_business_glossary",
    },
    {
      id: "search_terms",
      name: "Search Terms",
      description:
        "Type in the search box to filter terms by ID, business name, definition, or synonyms. Search 'wash' to find Wash Trade, or 'phantom' to find Spoofing (via its synonym).",
    },
    {
      id: "view_term_detail",
      name: "View Term Detail (ISO 11179)",
      description:
        "Click any term to see its full ISO 11179 decomposition (Object Class + Property + Representation), FIBO ontology alignment, BCBS 239 principle, technical entity.field mappings, and regulatory references.",
      scenarioId: "s35_explore_business_glossary",
    },
    {
      id: "reverse_lookup",
      name: "Reverse Lookup",
      description:
        "Use the Ownership tab to see which business owner is responsible for which terms across domains. This matrix shows accountability for data definitions.",
    },
    {
      id: "view_metrics",
      name: "View Semantic Metrics",
      description:
        "Switch to the Semantic Metrics tab to see business-friendly computed metrics. Each metric has a SQL formula, source tier (Gold/Platinum), unit, and sliceable dimensions.",
    },
    {
      id: "dmbok_coverage",
      name: "DAMA-DMBOK Coverage",
      description:
        "The DAMA-DMBOK tab shows all 11 knowledge areas with coverage badges. 10 areas have high coverage; Document & Content has medium coverage. Each card lists platform capabilities.",
    },
    {
      id: "standards_compliance",
      name: "Standards Compliance",
      description:
        "The Standards & Gaps tab shows 18 standards the platform complies with (ISO 6166, 10383, 10962, MAR, MiFID II, etc.) plus 10 gap standards in a roadmap section.",
    },
    {
      id: "entity_gap_analysis",
      name: "Entity Gap Analysis",
      description:
        "Below standards, the Entity Gap Analysis shows 25 missing attributes across 8 entities, with ISO standard references, regulatory needs, and priority badges.",
    },
  ],
  tips: [
    "Terms with 'planned' status have a blue dashed border — these are future capabilities documented proactively.",
    "The ISO 11179 decomposition follows the Data Element Concept = Object Class + Property + Representation pattern.",
    "FIBO alignment connects glossary terms to the EDM Council Financial Industry Business Ontology for interoperability.",
  ],
};
