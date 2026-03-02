import type { TourDefinition } from "../../stores/tourStore.ts";


// ---------------------------------------------------------------------------
// Business Glossary Tour (Phase 23)
// ---------------------------------------------------------------------------
export const glossaryTour: TourDefinition = {
  id: "glossary",
  name: "Business Glossary Tour",
  description: "Explore the ISO 11179-compliant business glossary, semantic metrics, and DAMA-DMBOK coverage.",
  steps: [
    {
      target: "[data-tour='glossary-categories']",
      title: "Category Browser",
      content: "Browse glossary terms by category. Each category groups related business concepts — Market Abuse, Data Entities, Metrics, Regulatory, Data Quality, and Architecture.",
      placement: "right",
      route: "/glossary",
    },
    {
      target: "[data-tour='glossary-term-list']",
      title: "Term List",
      content: "The main term grid shows all glossary terms. Terms with 'planned' status have a blue dashed border — these represent future capabilities. Click any term to see its full definition.",
      placement: "bottom",
      route: "/glossary",
    },
    {
      target: "[data-tour='glossary-term-detail']",
      title: "Term Detail — ISO 11179",
      content: "The detail panel shows the full ISO 11179 decomposition (Object Class + Property + Representation), FIBO alignment, technical mappings to entity fields, regulatory references, and synonyms.",
      placement: "left",
      route: "/glossary",
    },
    {
      target: "[data-tour='glossary-metrics-list']",
      title: "Semantic Metrics",
      content: "Business-friendly metrics built from Gold/Platinum tier data. Each metric has a SQL formula, source tier, sliceable dimensions, and BCBS 239 principle mapping.",
      placement: "bottom",
      route: "/glossary",
    },
    {
      target: "[data-tour='glossary-dmbok-grid']",
      title: "DAMA-DMBOK Coverage",
      content: "All 11 DAMA-DMBOK 2.0 knowledge areas mapped to platform capabilities. Coverage badges show high/medium/low coverage with implementing phases and views.",
      placement: "bottom",
      route: "/glossary",
    },
  ],
};
