export interface CalculationExample {
  id: string;
  name: string;
  category: string;
  description: string;
  rationale: string;
  config: Record<string, unknown>;
  annotations: Record<string, string>;
}

export const calculationExamples: CalculationExample[] = [
  {
    id: "value_calc",
    name: "Value Calculation",
    category: "Transaction Layer",
    description:
      "Calculates the monetary value of each execution based on instrument type. Stock: price x quantity. Option: premium x contract_size x quantity. Default: price x quantity.",
    rationale:
      "This is the foundational calculation in the pipeline — nearly every downstream calculation depends on it. The instrument-type-aware logic ensures correct value computation across asset classes (a 100-lot option trade at $2 premium is worth $20,000, not $200). Regulatory coverage: MAR Art. 16, MiFID II Art. 16(2).",
    config: {
      calc_id: "value_calc",
      layer: "transaction",
      inputs: [
        {
          source_type: "entity",
          entity_id: "execution",
          fields: [
            "execution_id",
            "product_id",
            "account_id",
            "side",
            "price",
            "quantity",
          ],
        },
        {
          source_type: "entity",
          entity_id: "product",
          fields: ["instrument_type", "asset_class", "contract_size"],
        },
      ],
      output: {
        table_name: "calc_value",
        key_fields: ["execution_id"],
      },
      depends_on: [],
      value_field: "calculated_value",
    },
    annotations: {
      layer:
        "Transaction layer — operates on individual executions. This is the lowest layer in the calculation pipeline, producing one output row per execution.",
      "inputs[0]":
        "Execution entity — provides raw trade data. Each execution has a side (BUY/SELL), price, and quantity.",
      "inputs[1]":
        "Product entity — provides instrument metadata. contract_size is critical for derivatives (options default to 100).",
      depends_on:
        "No dependencies — this is a root calculation. It reads directly from entities, not from other calculations.",
      value_field:
        "calculated_value — the monetary output. Downstream calculations reference this field for volume/activity aggregations.",
    },
  },
  {
    id: "adjusted_direction",
    name: "Adjusted Direction",
    category: "Transaction Layer",
    description:
      "Determines the effective buy/sell direction accounting for short instruments. Buying a put or selling a call is effectively selling. Selling a put or buying a call is effectively buying.",
    rationale:
      "Critical for correct surveillance analysis. Without direction adjustment, buying a put option would be counted as a 'buy' when it is economically a 'sell'. This affects wash trading detection (are you buying AND selling the same economic exposure?) and price ramping (are you trading in the trend direction?). Depends on value_calc to get instrument types.",
    config: {
      calc_id: "adjusted_direction",
      layer: "transaction",
      inputs: [
        {
          source_type: "calculation",
          calc_id: "value_calc",
          fields: ["execution_id", "side", "instrument_type"],
        },
      ],
      output: {
        table_name: "calc_adjusted_direction",
        key_fields: ["execution_id"],
      },
      depends_on: ["value_calc"],
      value_field: "calculated_value",
    },
    annotations: {
      "inputs[0]":
        "Reads from value_calc — inherits all execution fields plus instrument metadata. This is a calculation-to-calculation dependency.",
      depends_on:
        "Depends on value_calc — the dependency graph is: execution -> value_calc -> adjusted_direction. The pipeline engine executes them in order.",
      layer:
        "Transaction layer — still one row per execution, but now with corrected side information. Downstream aggregations use adjusted_side instead of raw side.",
    },
  },
  {
    id: "business_date_window",
    name: "Business Date Window",
    category: "Time Window Layer",
    description:
      "Determines business date for each execution based on configurable cutoff time. Executions after the cutoff roll to the next business date.",
    rationale:
      "Financial markets span timezones and have different trading hours. An execution at 5:30 PM in New York might belong to today's business date or tomorrow's, depending on the exchange and asset class. The cutoff time is controlled by a setting (business_date_cutoff) that can be overridden per exchange, timezone, or asset class — making the calculation fully metadata-driven.",
    config: {
      calc_id: "business_date_window",
      layer: "time_window",
      inputs: [
        {
          source_type: "calculation",
          calc_id: "adjusted_direction",
          fields: ["execution_id", "execution_date", "execution_time"],
        },
        {
          source_type: "setting",
          setting_id: "business_date_cutoff",
          fields: ["cutoff_time"],
        },
      ],
      output: {
        table_name: "calc_business_date_window",
        key_fields: ["execution_id"],
      },
      parameters: {
        cutoff_time: {
          source: "setting",
          setting_id: "business_date_cutoff",
          default: "17:00:00",
        },
      },
      depends_on: ["adjusted_direction"],
    },
    annotations: {
      layer:
        "Time window layer — assigns executions to business dates. This layer bridges transaction-level data and aggregation-level analysis.",
      "inputs[1]":
        "Setting input — business_date_cutoff is resolved via the settings engine. It can vary by exchange (NYSE: 16:00, LSE: 16:30) or asset class.",
      parameters:
        "Parameter binding — $cutoff_time in the SQL is replaced with the resolved setting value at runtime. Default 17:00 if no setting match.",
      depends_on:
        "Depends on adjusted_direction — ensures direction correction happens before date assignment. The pipeline guarantees execution order.",
    },
  },
  {
    id: "vwap_calc",
    name: "VWAP Calculation",
    category: "Aggregation Layer",
    description:
      "Value-Weighted Average Price of buys vs. sells per product, account, and business date. The spread between buy VWAP and sell VWAP is a key indicator for wash trading detection.",
    rationale:
      "VWAP (sum(price x quantity) / sum(quantity)) is the industry-standard measure of average execution price. By computing separate buy and sell VWAPs, we can measure how close the buy and sell prices were — a key wash trading indicator. If someone buys at $100.01 and sells at $100.02, the VWAP proximity is nearly 0, which is highly suspicious.",
    config: {
      calc_id: "vwap_calc",
      layer: "aggregation",
      inputs: [
        {
          source_type: "calculation",
          calc_id: "business_date_window",
          fields: [
            "execution_id",
            "product_id",
            "account_id",
            "adjusted_side",
            "price",
            "quantity",
            "business_date",
          ],
        },
      ],
      output: {
        table_name: "calc_vwap",
        key_fields: ["product_id", "account_id", "business_date"],
      },
      depends_on: ["business_date_window"],
      value_field: "vwap_proximity",
    },
    annotations: {
      layer:
        "Aggregation layer — groups transaction data by product, account, and business date. Output is one row per (product, account, date) combination.",
      value_field:
        "vwap_proximity — the normalized spread between buy and sell VWAP. 0 = identical prices (maximum suspicion), 1 = completely different prices (no suspicion).",
      depends_on:
        "Depends on business_date_window — needs the corrected business date and adjusted_side for proper aggregation.",
      "output.key_fields":
        "Grouped by product_id, account_id, business_date — this is the standard surveillance granularity. Each row represents one account's activity in one product on one day.",
    },
  },
  {
    id: "wash_detection",
    name: "Wash Detection",
    category: "Derived Layer",
    description:
      "Combines buy/sell quantity cancellation and VWAP proximity checks to identify potential wash trading candidates. Uses thresholds from the settings engine.",
    rationale:
      "This is the final derived calculation that feeds directly into the wash trading detection model. It combines two signals: quantity matching (are buy and sell quantities similar?) and VWAP proximity (are buy and sell prices similar?). Both thresholds are configurable via settings — qty_threshold is a literal (0.5) while vwap_threshold comes from the settings engine and varies by asset class.",
    config: {
      calc_id: "wash_detection",
      layer: "derived",
      inputs: [
        {
          source_type: "calculation",
          calc_id: "large_trading_activity",
          fields: ["product_id", "account_id", "business_date", "buy_qty", "sell_qty", "is_large"],
        },
        {
          source_type: "calculation",
          calc_id: "vwap_calc",
          fields: ["product_id", "account_id", "business_date", "vwap_proximity"],
        },
        {
          source_type: "setting",
          setting_id: "wash_vwap_threshold",
          fields: ["vwap_threshold"],
        },
      ],
      output: {
        table_name: "calc_wash_detection",
        key_fields: ["product_id", "account_id", "business_date"],
      },
      parameters: {
        qty_threshold: { source: "literal", value: 0.5 },
        vwap_threshold: {
          source: "setting",
          setting_id: "wash_vwap_threshold",
          default: 0.02,
        },
      },
      depends_on: ["large_trading_activity", "vwap_calc"],
      value_field: "qty_match_ratio",
    },
    annotations: {
      layer:
        "Derived layer — combines multiple upstream calculations into a final detection signal. This is the top of the calculation pipeline before model scoring.",
      "inputs[0]":
        "Large trading activity — provides volume gate and buy/sell quantity breakdown. Only rows where is_large = TRUE are meaningful candidates.",
      "inputs[1]":
        "VWAP calc — provides the price proximity signal. Joined on (product, account, date) to combine volume and price analysis.",
      parameters:
        "Mixed parameter sources — qty_threshold is a literal constant (0.5 = 50% match minimum), while vwap_threshold is resolved from settings and varies by asset class.",
      depends_on:
        "Two upstream dependencies — large_trading_activity AND vwap_calc. The pipeline engine ensures both complete before this runs. This is a fan-in pattern.",
    },
  },
];
