import type { TourDefinition } from "../../stores/tourStore.ts";


export const act3_guideTour: TourDefinition = {
  id: "act3_guide",
  name: "Act 3: Investigation & Analysis",
  description: "Deep-dive into alert investigation tools.",
  steps: [
    {
      target: "[data-tour='alert-grid']",
      title: "Act 3: Investigation",
      content: "This guide shows the investigation workflow for analyzing alerts in detail.",
      placement: "bottom",
      route: "/alerts",
    },
    {
      target: "[data-tour='dashboard-cards']",
      title: "Dashboard Overview",
      content: "Start with the dashboard for a high-level view of alert volume and distribution.",
      placement: "bottom",
      route: "/dashboard",
    },
    {
      target: "[data-tour='assistant-chat']",
      title: "AI-Powered Analysis",
      content: "Use the AI Assistant to ask questions about specific alerts or run analytical queries.",
      placement: "left",
      route: "/assistant",
    },
  ],
};
