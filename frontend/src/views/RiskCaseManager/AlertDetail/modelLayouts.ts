export type PanelId = "business" | "entity" | "calcTrace" | "marketData" | "volume" | "settings" | "scores" | "orders" | "explainability" | "footer";

export interface ModelLayout {
  label: string;
  emphasis: PanelId[];
  investigationHint: string;
}

export const MODEL_LAYOUTS: Record<string, ModelLayout> = {
  wash: {
    label: "Wash Trading",
    emphasis: ["scores", "orders"],
    investigationHint: "Focus on VWAP proximity, quantity matching, and related buy/sell orders.",
  },
  market_price_ramping: {
    label: "Market Price Ramping",
    emphasis: ["marketData", "calcTrace"],
    investigationHint: "Focus on price trend, same-side trading ratio, and volume patterns.",
  },
  insider_dealing: {
    label: "Insider Dealing",
    emphasis: ["marketData", "entity"],
    investigationHint: "Focus on related products, profit/loss, and proximity to market events.",
  },
  spoofing: {
    label: "Spoofing / Layering",
    emphasis: ["calcTrace", "orders"],
    investigationHint: "Focus on cancellation pattern, spread impact, and opposite-side executions.",
  },
};

/** Match a model_id to a layout using prefix matching. */
export function getModelLayout(modelId: string): ModelLayout | null {
  for (const [prefix, layout] of Object.entries(MODEL_LAYOUTS)) {
    if (modelId.startsWith(prefix)) return layout;
  }
  return null;
}
