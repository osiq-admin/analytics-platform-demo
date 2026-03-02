import type { TourDefinition } from "../../stores/tourStore.ts";


export const settingsTour: TourDefinition = {
  id: "settings",
  name: "Settings Manager Tour",
  description: "Understand how scoring thresholds and overrides work.",
  steps: [
    {
      target: "[data-tour='settings-list']",
      title: "Settings & Overrides",
      content: "Configure detection thresholds and scoring parameters. Overrides let you customize per product, asset class, or account.",
      placement: "right",
      route: "/settings",
    },
    {
      target: "[data-tour='settings-score-steps']",
      title: "Score Steps",
      content: "Score steps define how calculated values map to numeric risk scores. Each step specifies a value range and the score assigned when a value falls within that range.",
      placement: "bottom",
    },
    {
      target: "[data-tour='settings-resolver']",
      title: "Resolution Tester",
      content: "Test how settings resolve for a specific context using flexible dimensions (e.g. asset_class, product_id, region). See which override wins and why.",
      placement: "left",
    },
  ],
};
