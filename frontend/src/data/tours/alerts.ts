import type { TourDefinition } from "../../stores/tourStore.ts";


export const alertsTour: TourDefinition = {
  id: "alerts",
  name: "Risk Case Manager Tour",
  description: "Investigate and manage alerts.",
  steps: [
    {
      target: "[data-tour='alert-grid']",
      title: "Alert Grid",
      content: "All generated alerts with sortable columns. Click any row to open the detailed investigation view.",
      placement: "bottom",
      route: "/alerts",
    },
    {
      target: "[data-tour='alert-filters']",
      title: "Filtering & Sorting",
      content: "The header bar shows the total alert count and a Generate Alerts button to re-run detection. Use the grid's column headers below to sort and filter.",
      placement: "bottom",
    },
  ],
};
