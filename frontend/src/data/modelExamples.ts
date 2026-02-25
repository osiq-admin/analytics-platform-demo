export interface ModelExample {
  id: string;
  name: string;
  category: string;
  description: string;
  rationale: string;
  config: Record<string, unknown>;
  annotations: Record<string, string>;
}

export const modelExamples: ModelExample[] = [
  {
    id: "wash_full_day",
    name: "Wash Trading — Full Day",
    category: "Market Abuse",
    description:
      "Detects wash trading patterns on a full business day basis. Identifies accounts that buy and sell the same product at similar prices and quantities within a single business day.",
    rationale:
      "This is a classic surveillance model required by MAR Art. 12(1)(a). It uses a MUST_PASS gate (large_trading_activity) to filter out noise, then scores wash candidates on quantity matching and VWAP proximity. The graduated scoring allows prioritization — high scores indicate stronger evidence of wash trading.",
    config: {
      model_id: "wash_full_day",
      time_window: "business_date",
      granularity: ["product_id", "account_id"],
      calculations: [
        {
          calc_id: "large_trading_activity",
          strictness: "MUST_PASS",
          threshold_setting: "large_activity_multiplier",
          score_steps_setting: "large_activity_score_steps",
          value_field: "total_value",
        },
        {
          calc_id: "wash_qty_match",
          strictness: "OPTIONAL",
          threshold_setting: null,
          score_steps_setting: "quantity_match_score_steps",
          value_field: "qty_match_ratio",
        },
        {
          calc_id: "wash_vwap_proximity",
          strictness: "OPTIONAL",
          threshold_setting: null,
          score_steps_setting: "vwap_proximity_score_steps",
          value_field: "vwap_proximity",
        },
      ],
      score_threshold_setting: "wash_score_threshold",
    },
    annotations: {
      "calculations[0]":
        "Gate calculation — filters out low-value noise. Only candidates with significant trading volume proceed. Uses large_activity_multiplier setting for asset-class-specific thresholds.",
      "calculations[1]":
        "Quantity matching ratio — measures how closely buy and sell quantities match (min/max). Higher ratio = more suspicious. Scored via graduated steps: 0-50% = 0, 50-80% = 3, 80-95% = 7, 95%+ = 10.",
      "calculations[2]":
        "VWAP proximity — measures price similarity between buy/sell sides. Lower spread = more suspicious. Scored inversely: <0.5% = 10, 0.5-1% = 7, 1-2% = 3, >2% = 0.",
      score_threshold_setting:
        "Graduated threshold — different thresholds by asset class. Equities: 8, FX: 12 (higher due to natural bid-ask crossing), Fixed Income: 8, Index: 7.",
    },
  },
  {
    id: "wash_intraday",
    name: "Wash Trading — Intraday",
    category: "Market Abuse",
    description:
      "Detects wash trading patterns at intraday granularity (trend window). Same logic as full-day but applied to shorter time windows for more precise detection.",
    rationale:
      "Captures high-frequency wash trading that happens within minutes. Uses the trend_window time frame instead of full business_date to detect rapid buy-sell-buy patterns that would be diluted in daily aggregation. Required for MAR Art. 12(1)(a) compliance at sub-day granularity.",
    config: {
      model_id: "wash_intraday",
      time_window: "trend_window",
      granularity: ["product_id", "account_id"],
      calculations: [
        {
          calc_id: "large_trading_activity",
          strictness: "MUST_PASS",
          threshold_setting: "large_activity_multiplier",
          score_steps_setting: "large_activity_score_steps",
          value_field: "total_value",
        },
        {
          calc_id: "wash_qty_match",
          strictness: "OPTIONAL",
          score_steps_setting: "quantity_match_score_steps",
          value_field: "qty_match_ratio",
        },
        {
          calc_id: "wash_vwap_proximity",
          strictness: "OPTIONAL",
          score_steps_setting: "vwap_proximity_score_steps",
          value_field: "vwap_proximity",
        },
      ],
      score_threshold_setting: "wash_score_threshold",
    },
    annotations: {
      time_window:
        "Trend window — captures patterns happening within minutes rather than across a full day. This catches rapid wash cycles that daily aggregation would miss.",
      "calculations[0]":
        "Same MUST_PASS gate as full-day model. Ensures the trading activity is material before scoring.",
    },
  },
  {
    id: "market_price_ramping",
    name: "Market Price Ramping (MPR)",
    category: "Market Manipulation",
    description:
      "Detects accounts that trade aggressively in the same direction as a detected price trend, potentially contributing to or exploiting the trend.",
    rationale:
      "Required by MAR Art. 12(1)(b) and Dodd-Frank ss.747. Looks for coordinated buying/selling that moves prices significantly away from fair value. The model first requires a statistically significant price trend (MUST_PASS), then evaluates whether specific accounts traded disproportionately in the trend direction.",
    config: {
      model_id: "market_price_ramping",
      time_window: "trend_window",
      granularity: ["product_id", "account_id"],
      calculations: [
        {
          calc_id: "trend_detection",
          strictness: "MUST_PASS",
          threshold_setting: "trend_sensitivity",
          score_steps_setting: null,
          value_field: "price_change_pct",
        },
        {
          calc_id: "large_trading_activity",
          strictness: "OPTIONAL",
          threshold_setting: "large_activity_multiplier",
          score_steps_setting: "large_activity_score_steps",
          value_field: "total_value",
        },
        {
          calc_id: "same_side_ratio",
          strictness: "OPTIONAL",
          score_steps_setting: "same_side_pct_score_steps",
          value_field: "same_side_pct",
        },
      ],
      score_threshold_setting: "mpr_score_threshold",
    },
    annotations: {
      granularity:
        "Product + account level — MPR identifies which specific accounts contributed to price movement in a particular instrument.",
      "calculations[0]":
        "Trend detection gate — requires a statistically significant price movement (controlled by trend_sensitivity setting). No scoring — purely binary pass/fail.",
      "calculations[2]":
        "Same-side ratio — measures what percentage of an account's trades were in the direction of the trend. 90%+ buy during an uptrend = highly suspicious.",
    },
  },
  {
    id: "insider_dealing",
    name: "Insider Dealing",
    category: "Insider Trading",
    description:
      "Detects potential insider trading by identifying accounts that traded in related products before a significant market event (price surge, drop, volume spike).",
    rationale:
      "Required by MAR Art. 14 and Art. 16. Uses a lookback window before known market events to identify accounts that traded unusually ahead of price-moving announcements. The model requires a detected market event first (MUST_PASS), then scores accounts based on their pre-event trading activity.",
    config: {
      model_id: "insider_dealing",
      time_window: "market_event_window",
      granularity: ["product_id", "account_id"],
      calculations: [
        {
          calc_id: "market_event_detection",
          strictness: "MUST_PASS",
          threshold_setting: "insider_lookback_days",
          score_steps_setting: "market_event_score_steps",
          value_field: "price_change_pct",
        },
        {
          calc_id: "large_trading_activity",
          strictness: "OPTIONAL",
          threshold_setting: "large_activity_multiplier",
          score_steps_setting: "large_activity_score_steps",
          value_field: "total_value",
        },
      ],
      score_threshold_setting: "insider_score_threshold",
    },
    annotations: {
      time_window:
        "Market event window — defines a lookback period before known events (earnings, M&A announcements). Controlled by insider_lookback_days setting.",
      "calculations[0]":
        "Market event detection — identifies significant price/volume events and creates the investigation window. Both gates and scores: larger events receive higher scores.",
      "calculations[1]":
        "Trading activity in lookback window — accounts with unusually large positions opened before the event score higher.",
    },
  },
  {
    id: "spoofing_layering",
    name: "Spoofing / Layering",
    category: "Market Manipulation",
    description:
      "Detects spoofing and layering patterns where an account places multiple orders on one side (which are subsequently cancelled) while executing on the opposite side.",
    rationale:
      "Required by MAR Art. 12(1)(c) and Dodd-Frank ss.747. Identifies patterns of large orders placed and quickly cancelled, especially when they move the price in a direction that benefits other orders. The model requires a cancellation pattern (MUST_PASS) and evaluates opposite-side execution activity.",
    config: {
      model_id: "spoofing_layering",
      time_window: "cancellation_pattern",
      granularity: ["product_id", "account_id"],
      calculations: [
        {
          calc_id: "cancel_pattern",
          strictness: "MUST_PASS",
          threshold_setting: "cancel_count_threshold",
          score_steps_setting: null,
          value_field: "cancel_count",
        },
        {
          calc_id: "opposite_side_execution",
          strictness: "OPTIONAL",
          score_steps_setting: "large_activity_score_steps",
          value_field: "total_value",
        },
      ],
      score_threshold_setting: "spoofing_score_threshold",
    },
    annotations: {
      "calculations[0]":
        "Cancellation pattern gate — high cancel-to-order ratio with specific timing patterns indicates spoofing. Must meet cancel_count_threshold (default: 3+ cancellations in window).",
      "calculations[1]":
        "Opposite-side execution — trading on the opposite side while cancelling. Placing sell orders then buying (or vice versa) is the hallmark of spoofing.",
      time_window:
        "Cancellation pattern window — short window that captures rapid order placement and cancellation sequences.",
    },
  },
];
