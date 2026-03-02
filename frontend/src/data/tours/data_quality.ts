import type { TourDefinition } from "../../stores/tourStore.ts";


export const data_qualityTour: TourDefinition = {
  id: "data-quality",
  name: "Data Quality Dashboard",
  description: "Explore quality scores, quarantine queue, and data profiling across entities and data contracts.",
  steps: [
    {
      target: "[data-tour='quality-scores']",
      title: "Quality Scores",
      content: "Quality scores per entity and data contract, calculated using ISO/IEC 25012 weighted dimensions. Click a card to see the dimension breakdown.",
      placement: "bottom",
    },
    {
      target: "[data-tour='quality-spider']",
      title: "Quality Spider Chart",
      content: "Radar chart showing scores across ISO-aligned quality dimensions loaded from the API, such as completeness, accuracy, consistency, timeliness, uniqueness, and validity.",
      placement: "right",
    },
    {
      target: "[data-tour='quality-quarantine']",
      title: "Quarantine Queue",
      content: "Records that failed quality validation during pipeline execution. Retry to reprocess or override with justification.",
      placement: "top",
    },
    {
      target: "[data-tour='quality-profiling']",
      title: "Data Profiling",
      content: "Per-field statistics for any entity: null counts, distinct values, min/max. Switch entities and tiers to compare quality across the medallion architecture.",
      placement: "top",
    },
  ],
};
