/** Convert snake_case to Title Case (e.g. "market_price_ramping" → "Market Price Ramping") */
export function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format ISO timestamp to human-readable form: "2026-02-25 10:35:49" (drop microseconds and T separator) */
export function formatTimestamp(ts: string): string {
  if (!ts) return "";
  return ts.replace("T", " ").replace(/\.\d+$/, "");
}
