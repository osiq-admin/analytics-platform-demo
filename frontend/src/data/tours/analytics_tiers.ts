import type { TourDefinition } from "../../stores/tourStore.ts";


export const analytics_tiersTour: TourDefinition = {
  id: "analytics-tiers",
  name: "Analytics Tiers",
  description: "Explore Platinum KPI datasets, Sandbox testing environments, and Archive retention management.",
  steps: [
    {
      target: "[data-tour='analytics-tier-tabs']",
      title: "Tier Tabs",
      content: "Switch between Platinum KPIs, Sandbox testing, and Archive management.",
      placement: "bottom",
      route: "/analytics-tiers",
    },
    {
      target: "[data-tour='analytics-platinum']",
      title: "Platinum KPIs",
      content: "Browse pre-built KPI datasets aggregated from Gold tier detection results.",
      placement: "bottom",
    },
    {
      target: "[data-tour='analytics-sandbox']",
      title: "Sandbox Manager",
      content: "Create isolated testing environments to experiment with threshold changes.",
      placement: "bottom",
    },
    {
      target: "[data-tour='analytics-archive']",
      title: "Archive Retention",
      content: "View retention policies and archived datasets for regulatory compliance.",
      placement: "bottom",
    },
  ],
};
