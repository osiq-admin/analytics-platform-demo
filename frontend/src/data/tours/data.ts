import type { TourDefinition } from "../../stores/tourStore.ts";


export const dataTour: TourDefinition = {
  id: "data",
  name: "Data Manager Tour",
  description: "Browse and preview raw data files.",
  steps: [
    {
      target: "[data-tour='data-list']",
      title: "Data Files",
      content: "Database tables loaded into the system: executions, orders, products, and market data.",
      placement: "right",
      route: "/data",
    },
    {
      target: "[data-tour='data-preview']",
      title: "Data Preview",
      content: "Click any table to preview its contents in a data grid. Shows the first 50 rows.",
      placement: "left",
    },
  ],
};
