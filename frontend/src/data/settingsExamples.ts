export interface SettingExample {
  id: string;
  name: string;
  category: string;
  description: string;
  rationale: string;
  config: Record<string, unknown>;
  annotations: Record<string, string>;
}

export const settingsExamples: SettingExample[] = [
  {
    id: "wash_vwap_threshold",
    name: "Wash VWAP Threshold",
    category: "Threshold",
    description:
      "VWAP proximity threshold for wash trading detection. Trades within this percentage of VWAP are considered suspicious.",
    rationale:
      "Different asset classes have different natural bid-ask spreads. Equities on major exchanges like NYSE have very tight spreads (1.2%), while the default is 2%. Fixed income is set tighter (1%) because bond markets are less volatile. Product-level overrides (e.g., AAPL at 1%) allow fine-tuning for highly liquid instruments. The hierarchy resolution ensures the most specific match always wins.",
    config: {
      setting_id: "wash_vwap_threshold",
      value_type: "decimal",
      default: 0.02,
      match_type: "hierarchy",
      overrides: [
        {
          match: { asset_class: "equity" },
          value: 0.015,
          priority: 1,
        },
        {
          match: { asset_class: "equity", exchange_mic: "XNYS" },
          value: 0.012,
          priority: 2,
        },
        {
          match: { product: "AAPL" },
          value: 0.01,
          priority: 100,
        },
        {
          match: { asset_class: "fixed_income" },
          value: 0.01,
          priority: 1,
        },
      ],
    },
    annotations: {
      default:
        "Fallback value of 2% — used when no override matches. Conservative default that catches obvious wash trades.",
      "overrides[0]":
        "Equity override at 1.5% — equities have tighter spreads than the default, so the threshold is lower.",
      "overrides[1]":
        "NYSE-specific equity override at 1.2% — priority 2 beats the generic equity override (priority 1). NYSE's deep liquidity means tighter spreads.",
      "overrides[2]":
        "Product-level override for AAPL at 1% — priority 100 ensures product-specific overrides always win. Extremely liquid, so even small price differences are suspicious.",
      match_type:
        "Hierarchy matching — settings engine resolves the most specific match by priority. Higher priority number wins.",
    },
  },
  {
    id: "quantity_match_score_steps",
    name: "Quantity Match Score Steps",
    category: "Score Steps",
    description:
      "Graduated scoring for buy/sell quantity match ratio in wash trading detection. Higher match ratios yield higher scores.",
    rationale:
      "Wash trading requires matching buy and sell quantities. A ratio of 0.5 means one side is double the other — unlikely to be wash trading. A ratio of 0.95+ (near-perfect match) is highly suspicious and receives the maximum score of 10. The graduated steps allow nuanced prioritization rather than binary yes/no decisions.",
    config: {
      setting_id: "quantity_match_score_steps",
      value_type: "score_steps",
      default: [
        { min_value: 0, max_value: 0.5, score: 0 },
        { min_value: 0.5, max_value: 0.8, score: 3 },
        { min_value: 0.8, max_value: 0.95, score: 7 },
        { min_value: 0.95, max_value: null, score: 10 },
      ],
      match_type: "hierarchy",
      overrides: [],
    },
    annotations: {
      "default[0]":
        "0-50% match ratio scores 0 — wide mismatch between buy/sell quantities, not indicative of wash trading.",
      "default[1]":
        "50-80% match ratio scores 3 — moderate similarity, worth flagging but low confidence.",
      "default[2]":
        "80-95% match ratio scores 7 — strong similarity, high confidence this could be wash trading.",
      "default[3]":
        "95%+ match ratio scores 10 (max) — near-perfect quantity matching is a strong wash trading indicator.",
      overrides:
        "No overrides defined — quantity matching logic is consistent across all asset classes. Override capability exists for future customization.",
    },
  },
  {
    id: "wash_score_threshold",
    name: "Wash Trading Score Threshold",
    category: "Score Threshold",
    description:
      "Minimum accumulated score required to generate a wash trading alert. Scores from all OPTIONAL calculations are summed and compared to this threshold.",
    rationale:
      "The threshold balances alert volume against detection quality. Equities use a lower threshold (8) because wash trading is more common and easier to detect. FX uses a higher threshold (12) because natural bid-ask crossing in FX markets produces more false positives. Each asset class is tuned based on the expected noise level in that market.",
    config: {
      setting_id: "wash_score_threshold",
      value_type: "decimal",
      default: 10,
      match_type: "hierarchy",
      overrides: [
        {
          match: { asset_class: "equity" },
          value: 8,
          priority: 1,
        },
        {
          match: { asset_class: "fx" },
          value: 12,
          priority: 1,
        },
        {
          match: { asset_class: "fixed_income" },
          value: 8,
          priority: 1,
        },
        {
          match: { asset_class: "index" },
          value: 7,
          priority: 1,
        },
      ],
    },
    annotations: {
      default:
        "Default threshold of 10 — conservative baseline. With max score of 20 (10+10 from qty_match + vwap), this means at least moderate evidence on both indicators.",
      "overrides[0]":
        "Equity threshold 8 — lower threshold catches more alerts in equity markets where wash trading patterns are clearer.",
      "overrides[1]":
        "FX threshold 12 — higher threshold reduces false positives from natural FX market mechanics (constant bid-ask crossing).",
      "overrides[3]":
        "Index threshold 7 — lowest threshold because index wash trading is less common but highly impactful when it occurs.",
    },
  },
  {
    id: "large_activity_multiplier",
    name: "Large Activity Multiplier",
    category: "Threshold",
    description:
      "Multiplier applied to average daily volume to determine large trading activity threshold. Trading above this multiple of ADV is considered 'large'.",
    rationale:
      "This setting is the primary gate for most detection models — it filters out noise by requiring material trading volume. The multiplier approach is relative (not absolute) so it adapts to each instrument's typical volume. Equities use 1.5x because equity markets have high baseline activity. FX uses 3.0x because FX volumes are enormous and higher multiples are needed to detect unusual activity.",
    config: {
      setting_id: "large_activity_multiplier",
      value_type: "decimal",
      default: 2.0,
      match_type: "hierarchy",
      overrides: [
        {
          match: { asset_class: "equity" },
          value: 1.5,
          priority: 1,
        },
        {
          match: { asset_class: "fx" },
          value: 3.0,
          priority: 1,
        },
        {
          match: { asset_class: "commodity" },
          value: 2.5,
          priority: 1,
        },
        {
          match: { asset_class: "fixed_income" },
          value: 2.5,
          priority: 1,
        },
      ],
    },
    annotations: {
      default:
        "Default 2.0x ADV — trading at twice the average daily volume is considered large. Balanced starting point.",
      "overrides[0]":
        "Equity 1.5x — lower multiplier because equity surveillance needs higher sensitivity. Even 1.5x ADV can be market-moving for mid-cap stocks.",
      "overrides[1]":
        "FX 3.0x — highest multiplier because FX daily volumes are massive. A 2x multiple would flood the system with false positives.",
      match_type:
        "Hierarchy matching — allows venue-specific or product-specific overrides to be added later without changing the base logic.",
    },
  },
  {
    id: "trend_sensitivity",
    name: "Trend Sensitivity",
    category: "Threshold",
    description:
      "Standard deviation multiplier for trend detection sensitivity. Lower values detect more subtle trends; higher values only flag dramatic movements.",
    rationale:
      "Used by the Market Price Ramping model to identify statistically significant price trends. The sensitivity is expressed as a standard deviation multiplier — a value of 1.5 means the price must move 1.5 standard deviations from the mean to be flagged. Equities and fixed income use 1.2 for higher sensitivity (subtle ramping is harder to detect). FX uses 2.0 because currency markets are naturally more volatile.",
    config: {
      setting_id: "trend_sensitivity",
      value_type: "decimal",
      default: 1.5,
      match_type: "hierarchy",
      overrides: [
        {
          match: { asset_class: "equity" },
          value: 1.2,
          priority: 1,
        },
        {
          match: { asset_class: "fx" },
          value: 2.0,
          priority: 1,
        },
        {
          match: { asset_class: "fixed_income" },
          value: 1.2,
          priority: 1,
        },
        {
          match: { asset_class: "index" },
          value: 1.3,
          priority: 1,
        },
      ],
    },
    annotations: {
      default:
        "Default 1.5 sigma — moderate sensitivity. Catches most meaningful trends without excessive noise.",
      "overrides[0]":
        "Equity 1.2 sigma — more sensitive because even small price ramps in equities can be abusive and are easier to execute.",
      "overrides[1]":
        "FX 2.0 sigma — less sensitive because FX markets naturally have wider price movements. Higher bar prevents false positives.",
      "overrides[3]":
        "Index 1.3 sigma — slightly more sensitive than default. Index manipulation is rare but high-impact (affects many underlying securities).",
    },
  },
];
