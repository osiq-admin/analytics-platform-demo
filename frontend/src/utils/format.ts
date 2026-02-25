/** Convert snake_case to Title Case (e.g. "market_price_ramping" → "Market Price Ramping") */
export function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
