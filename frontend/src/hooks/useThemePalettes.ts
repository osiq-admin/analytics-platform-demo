import { useEffect, useState } from "react";
import { api } from "../api/client.ts";

interface ThemePaletteResponse {
  palette_id: string;
  chart_colors: string[];
  asset_class_colors: Record<string, string>;
  layer_badge_variants: Record<string, string>;
  graph_node_colors: Record<string, string>;
}

const FALLBACK: ThemePaletteResponse = {
  palette_id: "default",
  chart_colors: [
    "#6366f1",
    "#22d3ee",
    "#f59e0b",
    "#ef4444",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
  ],
  asset_class_colors: {
    equity: "#6366f1",
    fx: "#22d3ee",
    commodity: "#f59e0b",
    index: "#10b981",
    fixed_income: "#8b5cf6",
  },
  layer_badge_variants: {
    oob: "info",
    user: "warning",
    custom: "success",
  },
  graph_node_colors: {
    regulation: "#3b82f6",
    article_covered: "#22c55e",
    article_uncovered: "#ef4444",
    detection_model: "#f97316",
    calculation: "#a855f7",
  },
};

let cached: ThemePaletteResponse | null = null;

export function useThemePalettes(): ThemePaletteResponse {
  const [palette, setPalette] = useState<ThemePaletteResponse>(
    cached ?? FALLBACK,
  );

  useEffect(() => {
    if (cached) return;
    api
      .get<ThemePaletteResponse>("/metadata/theme/palettes/default")
      .then((data) => {
        cached = data;
        setPalette(data);
      })
      .catch(() => {});
  }, []);

  return palette;
}
