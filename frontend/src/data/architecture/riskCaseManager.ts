import type { ViewTrace } from "../architectureRegistryTypes";

export const riskCaseManagerSections: ViewTrace = {
  viewId: "alerts",
  viewName: "Risk Case Manager",
  route: "/alerts",
  sections: [
    {
      id: "alerts.summary-grid",
      displayName: "Alerts Grid",
      viewId: "alerts",
      description:
        "AG Grid of all alerts with columns for alert ID, detection model, product, score, trigger path, asset class, and timestamp. Core view for alert triage.",
      files: [
        { path: "frontend/src/views/RiskCaseManager/index.tsx", role: "Main view layout with alert grid" },
        { path: "frontend/src/views/RiskCaseManager/AlertSummary.tsx", role: "Alert summary grid component" },
        { path: "frontend/src/stores/alertStore.ts", role: "Fetches and manages alert data" },
        { path: "backend/api/alerts.py", role: "Serves alert data from Parquet" },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alerts array, selection, and filtering",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/alerts",
          role: "Returns all alerts with summary data",
          routerFile: "backend/api/alerts.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/summary.parquet",
          category: "results",
          role: "Alert summary data produced by detection engine",
        },
      ],
      technologies: [{ name: "AG Grid", role: "Renders sortable/filterable alert table" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Alerts are produced by metadata-driven detection models. Grid columns are partly hardcoded but data is from metadata-driven engine output.",
    },
    {
      id: "alerts.filters",
      displayName: "Alert Filters",
      viewId: "alerts",
      description:
        "Alert summary grid with metadata-driven column definitions and filter types. Column config loaded from grid metadata API with fallback to hardcoded.",
      files: [
        { path: "frontend/src/views/RiskCaseManager/index.tsx", role: "Filter bar rendering" },
        { path: "frontend/src/views/RiskCaseManager/AlertSummary.tsx", role: "Alert summary grid with metadata columns" },
        { path: "frontend/src/hooks/useGridColumns.ts", role: "Hook for metadata-driven grid columns" },
        { path: "frontend/src/stores/alertStore.ts", role: "Manages filter state" },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides filter state and actions",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/grids/risk_case_manager",
          role: "Returns alert grid column and filter configuration",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        { path: "workspace/metadata/grids/risk_case_manager.json", category: "metadata", role: "Alert grid column definitions with filter types" },
      ],
      technologies: [{ name: "AG Grid", role: "Renders alert summary grid" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Column definitions and filter types loaded from grid metadata JSON. Custom cellRenderers (score badge, trigger badge) remain in frontend code. Fallback to hardcoded on API error.",
      metadataOpportunities: [
        "Make filter operator options configurable per deployment",
      ],
    },
    {
      id: "alerts.detail-header",
      displayName: "Alert Header",
      viewId: "alerts",
      description:
        "Header section of alert detail showing alert ID, detection model name, product, composite score, and trigger path. Quick-reference summary for the selected alert.",
      files: [
        { path: "frontend/src/views/RiskCaseManager/AlertDetail/index.tsx", role: "Alert detail header section" },
        { path: "frontend/src/stores/alertStore.ts", role: "Provides selected alert data" },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides selected alert summary",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace files with full detail data",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Header content comes from metadata-driven detection output. Panel layout, emphasis, and investigation hints now load from model alert_detail_layout metadata via API, with hardcoded fallback.",
    },
    {
      id: "alerts.business-description",
      displayName: "Business Description",
      viewId: "alerts",
      description:
        "Human-readable explanation of what the alert means in business terms. Description sourced from the detection model's metadata definition.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/BusinessDescription.tsx",
          role: "Renders business description from model metadata",
        },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alert trace with business context",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace containing business description from model metadata",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Description text comes from detection model metadata. Template interpolation is code-driven.",
    },
    {
      id: "alerts.entity-context",
      displayName: "Entity Context",
      viewId: "alerts",
      description:
        "Dynamic grid displaying entity fields relevant to the alert (product details, account info, trader info). Fields and values from alert trace entity_context section.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/EntityContext.tsx",
          role: "Dynamic entity context grid",
        },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alert trace entity context data",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace with entity_context containing related entity data",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Entity fields and their values come entirely from the alert trace entity_context, which is populated by the metadata-driven detection engine.",
    },
    {
      id: "alerts.calculation-trace",
      displayName: "Calculation Trace",
      viewId: "alerts",
      description:
        "React Flow DAG showing the calculation execution trace for this alert. Each node shows the calculation name, result, and contribution to the score. Core traceability feature.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/CalculationTrace.tsx",
          role: "React Flow calculation trace DAG",
        },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alert trace calculation data",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace with calculation execution results",
        },
      ],
      technologies: [
        { name: "React Flow", role: "Interactive calculation trace DAG" },
        { name: "Dagre", role: "Automatic DAG layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Calculation nodes and edges come from trace data produced by metadata-driven engine. Trace structure mirrors metadata-defined calculation dependencies.",
    },
    {
      id: "alerts.market-data",
      displayName: "Market Data",
      viewId: "alerts",
      description:
        "Candlestick chart showing OHLCV market data for the product associated with the alert. Chart type and field mapping configured per detection model via market_data_config metadata.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/MarketDataChart.tsx",
          role: "TradingView candlestick chart for market data",
        },
        { path: "backend/api/data.py", role: "Serves market data for product" },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides product ID for market data lookup",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/data/market/{productId}",
          role: "Returns OHLCV market data for product",
          routerFile: "backend/api/data.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/data/csv/md_eod.csv",
          category: "data",
          role: "End-of-day market data (OHLCV) for candlestick chart",
        },
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "market_data_config per detection model defines chart type, fields, and overlay behavior",
        },
      ],
      technologies: [
        { name: "TradingView Lightweight Charts", role: "Financial candlestick chart rendering" },
      ],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Chart type (candlestick/line), price fields, volume field, and trade overlay settings are defined per detection model in market_data_config metadata. Chart rendering code in frontend.",
      metadataOpportunities: [
        "Add indicator configuration (moving averages, VWAP) to market_data_config metadata",
      ],
    },
    {
      id: "alerts.trade-volume",
      displayName: "Trade Volume",
      viewId: "alerts",
      description:
        "Bar chart showing trade volume over time for the product associated with the alert. Contextualizes the alert with trading activity patterns.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/TradeVolumeChart.tsx",
          role: "Recharts bar chart for trade volume",
        },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides trade volume data from alert context",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace containing trade volume context data",
        },
      ],
      technologies: [{ name: "Recharts", role: "Bar chart for trade volume visualization" }],
      metadataMaturity: "code-driven",
      maturityExplanation:
        "Chart configuration and data transformation are hardcoded in the component.",
      metadataOpportunities: [
        "Make chart type and aggregation configurable via model metadata",
      ],
    },
    {
      id: "alerts.settings-trace",
      displayName: "Settings Trace",
      viewId: "alerts",
      description:
        "Settings resolution audit log showing which settings were resolved for this alert, their values, and which override level matched. Key metadata traceability feature.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/SettingsTrace.tsx",
          role: "Renders settings resolution trace table",
        },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alert trace settings data",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace with settings_trace showing resolution audit",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Settings trace comes from the metadata-driven resolution engine. Shows exactly which metadata-defined override matched and why.",
    },
    {
      id: "alerts.score-breakdown",
      displayName: "Score Breakdown",
      viewId: "alerts",
      description:
        "Bar chart and table showing how individual calculation scores combine into the composite alert score. Shows weight, raw score, and weighted contribution per calculation.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/ScoreBreakdown.tsx",
          role: "Score breakdown chart and table",
        },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alert trace score data",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/alerts/traces/*.json",
          category: "results",
          role: "Alert trace with score_breakdown from scoring engine",
        },
      ],
      technologies: [{ name: "Recharts", role: "Bar chart for score visualization" }],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Score weights and calculation references come from metadata-driven model scoring configuration. Breakdown structure mirrors model metadata.",
    },
    {
      id: "alerts.related-orders",
      displayName: "Related Orders",
      viewId: "alerts",
      description:
        "AG Grid showing orders and executions related to the alert. Column definitions loaded from grid metadata JSON via API with fallback to hardcoded.",
      files: [
        {
          path: "frontend/src/views/RiskCaseManager/AlertDetail/RelatedOrders.tsx",
          role: "Related orders/executions grid with metadata columns",
        },
        { path: "frontend/src/hooks/useGridColumns.ts", role: "Hook for metadata-driven grid columns" },
        { path: "backend/api/data.py", role: "Returns related orders and executions" },
      ],
      stores: [
        {
          name: "alertStore",
          path: "frontend/src/stores/alertStore.ts",
          role: "Provides alert context for order lookup",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/data/orders",
          role: "Returns related orders and executions",
          routerFile: "backend/api/data.py",
        },
        {
          method: "GET",
          path: "/api/metadata/grids/related_executions",
          role: "Returns execution grid column definitions",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/grids/related_orders",
          role: "Returns order grid column definitions",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/data/csv/order.csv",
          category: "data",
          role: "Order data for related order lookup",
        },
        {
          path: "workspace/data/csv/execution.csv",
          category: "data",
          role: "Execution data for trade details",
        },
        {
          path: "workspace/metadata/grids/related_executions.json",
          category: "metadata",
          role: "Execution grid column definitions",
        },
        {
          path: "workspace/metadata/grids/related_orders.json",
          category: "metadata",
          role: "Order grid column definitions",
        },
      ],
      technologies: [{ name: "AG Grid", role: "Renders related orders table" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Grid column definitions loaded from metadata JSON via API. Custom cellRenderers (side badge, price formatter) remain in frontend. Fallback to hardcoded on API error.",
      metadataOpportunities: [
        "Derive related order queries from entity relationship metadata",
        "Use entity metadata for column labels and formatting",
      ],
    },
  ],
};
