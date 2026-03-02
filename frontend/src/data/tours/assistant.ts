import type { TourDefinition } from "../../stores/tourStore.ts";


export const assistantTour: TourDefinition = {
  id: "assistant",
  name: "AI Assistant Tour",
  description: "Get AI-powered help with analysis.",
  steps: [
    {
      target: "[data-tour='assistant-chat']",
      title: "AI Chat",
      content: "Ask questions about the data, alerts, or system behavior. The AI can query the database and explain results.",
      placement: "left",
      route: "/assistant",
    },
    {
      target: "[data-tour='assistant-scenarios']",
      title: "Scenario Presets",
      content: "Pre-built analysis scenarios to explore common investigation workflows. Scenario presets are only visible in mock mode.",
      placement: "bottom",
    },
  ],
};
