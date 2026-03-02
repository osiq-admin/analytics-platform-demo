import type { TourDefinition } from "../../stores/tourStore.ts";


export const dashboardTour: TourDefinition = {
  id: "dashboard",
  name: "Dashboard Tour",
  description: "Explore the summary dashboard.",
  steps: [
    {
      target: "[data-tour='dashboard-cards']",
      title: "Summary Metrics",
      content: "Key performance indicators: total alerts generated, score-triggered percentage (alerts exceeding threshold), average scores, and active detection models.",
      placement: "bottom",
      route: "/dashboard",
    },
    {
      target: "[data-tour='dashboard-by-model']",
      title: "Alerts by Model",
      content: "Distribution of alerts across detection models — see which models fire most frequently.",
      placement: "right",
    },
    {
      target: "[data-tour='dashboard-scores']",
      title: "Score Distribution",
      content: "Histogram showing how alert scores are distributed. Peaks near thresholds may indicate tuning opportunities.",
      placement: "left",
    },
    {
      target: "[data-tour='dashboard-triggers']",
      title: "Trigger Paths",
      content: "Shows how alerts were triggered — score-based (exceeded threshold) or all-passed (all calculations passed their criteria).",
      placement: "right",
    },
  ],
};
