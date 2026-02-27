export type PanelId = "business" | "entity" | "calcTrace" | "marketData" | "volume" | "settings" | "scores" | "orders" | "explainability" | "footer";

export interface ModelLayout {
  label: string;
  panels?: PanelId[];
  emphasis: PanelId[];
  investigationHint: string;
}

/** Map API panel names to frontend PanelId values. */
const API_PANEL_MAP: Record<string, PanelId> = {
  business: "business",
  entity: "entity",
  calcTrace: "calcTrace",
  marketData: "marketData",
  volume: "volume",
  settings: "settings",
  scores: "scores",
  orders: "orders",
  relatedOrders: "orders",
  explainability: "explainability",
  footer: "footer",
};

// Hardcoded fallback layouts (kept for resilience)
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

/** Convert API alert_detail_layout to our ModelLayout type. */
export function fromApiLayout(apiLayout: Record<string, unknown>, modelName: string): ModelLayout {
  const rawPanels = apiLayout.panels as string[] | undefined;
  const panels = rawPanels
    ?.map((p) => API_PANEL_MAP[p])
    .filter((p): p is PanelId => p !== undefined);

  const rawEmphasis = apiLayout.emphasis as string[] | undefined;
  const emphasis = (rawEmphasis
    ?.map((p) => API_PANEL_MAP[p])
    .filter((p): p is PanelId => p !== undefined)) ?? [];

  const investigationHint = (apiLayout.investigation_hint as string) ?? "";

  return { label: modelName, panels, emphasis, investigationHint };
}

/** Match a model_id to a layout using prefix matching (fallback). */
export function getModelLayout(modelId: string): ModelLayout | null {
  for (const [prefix, layout] of Object.entries(MODEL_LAYOUTS)) {
    if (modelId.startsWith(prefix)) return layout;
  }
  return null;
}
