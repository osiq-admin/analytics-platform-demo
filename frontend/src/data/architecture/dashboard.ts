import type { ViewTrace } from "../architectureRegistryTypes";

export const dashboardSections: ViewTrace = {
  viewId: "dashboard",
  viewName: "Dashboard",
  route: "/dashboard",
  sections: [
    {
      id: "dashboard.summary-cards",
      displayName: "Summary Metrics",
      viewId: "dashboard",
      description:
        "Four KPI cards displaying total alerts, score-triggered percentage, average score, and active model count. Card layout and labels are metadata-driven (loaded from widget API at /api/metadata/widgets/dashboard) with hardcoded fallback; data comes from SQL aggregation over alert results.",
      files: [
        { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders KPI card grid" },
        { path: "frontend/src/stores/dashboardStore.ts", role: "Fetches and caches dashboard stats" },
        { path: "backend/api/dashboard.py", role: "Aggregates alert data via DuckDB SQL" },
      ],
      stores: [
        {
          name: "dashboardStore",
          path: "frontend/src/stores/dashboardStore.ts",
          role: "Provides stats object with summary metrics",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/dashboard/stats",
          role: "Returns aggregated alert statistics",
          routerFile: "backend/api/dashboard.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/summary.parquet",
          category: "results",
          role: "Parquet file with alert summary data produced by detection engine",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "KPI cards are defined in widget metadata (workspace/metadata/widgets/dashboard.json) including labels, metric keys, and grid positions. Dashboard fetches config from /api/metadata/widgets/dashboard and renders accordingly with fallback. Data comes from SQL aggregation over engine-produced results.",
      metadataOpportunities: [
        "Add icon and format specifiers to KPI card widget metadata",
        "Support custom KPI formulas defined in widget metadata",
      ],
    },
    {
      id: "dashboard.alerts-by-model",
      displayName: "Alerts by Model",
      viewId: "dashboard",
      description:
        "Chart showing alert count per detection model. Supports 5 chart types (bar, horizontal_bar, line, pie, table) via widget store. Data sourced from dashboard stats by_model breakdown.",
      files: [
        { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders chart widget" },
        { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart-type toggle container" },
        { path: "frontend/src/stores/dashboardStore.ts", role: "Provides stats.by_model data" },
        { path: "frontend/src/stores/widgetStore.ts", role: "Persists chart type selection" },
      ],
      stores: [
        {
          name: "dashboardStore",
          path: "frontend/src/stores/dashboardStore.ts",
          role: "Provides by_model alert breakdown",
        },
        {
          name: "widgetStore",
          path: "frontend/src/stores/widgetStore.ts",
          role: "Manages chart type toggle state (bar/horizontal_bar/line/pie/table)",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/dashboard/stats",
          role: "Returns alert stats including by_model breakdown",
          routerFile: "backend/api/dashboard.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/summary.parquet",
          category: "results",
          role: "Source data for model-level alert aggregation",
        },
      ],
      technologies: [{ name: "Recharts", role: "Renders BarChart, LineChart, and PieChart visualizations" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Chart widget defined in metadata (workspace/metadata/widgets/dashboard.json) with default chart type, available types, color palette, and grid position. Dashboard loads config from /api/metadata/widgets/dashboard. Color palette loaded from /api/metadata/theme/palettes/default. Data from metadata-driven detection models.",
      metadataOpportunities: [
        "Support custom chart renderers loaded dynamically from metadata",
      ],
    },
    {
      id: "dashboard.score-distribution",
      displayName: "Score Distribution",
      viewId: "dashboard",
      description:
        "Histogram of alert scores bucketed into 10-wide ranges (0-10, 10-20, etc.). Visualizes the distribution of detection confidence across all alerts.",
      files: [
        { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders score distribution chart" },
        { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart container" },
        { path: "frontend/src/stores/dashboardStore.ts", role: "Provides score distribution data" },
        { path: "frontend/src/stores/widgetStore.ts", role: "Manages chart type toggle" },
      ],
      stores: [
        {
          name: "dashboardStore",
          path: "frontend/src/stores/dashboardStore.ts",
          role: "Provides score distribution buckets",
        },
        {
          name: "widgetStore",
          path: "frontend/src/stores/widgetStore.ts",
          role: "Manages chart type toggle state",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/dashboard/stats",
          role: "Returns score distribution data",
          routerFile: "backend/api/dashboard.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/summary.parquet",
          category: "results",
          role: "Alert scores for distribution calculation",
        },
      ],
      technologies: [{ name: "Recharts", role: "Renders histogram / bar chart" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Chart widget defined in metadata with default chart type, available types, and grid position. Score bucket boundaries are still code-driven; underlying data is from metadata-driven detection.",
      metadataOpportunities: ["Make score bucket boundaries configurable via settings metadata"],
    },
    {
      id: "dashboard.alerts-by-trigger",
      displayName: "Alerts by Trigger",
      viewId: "dashboard",
      description:
        "Chart showing alert count grouped by trigger path (score-based vs rule-based). Helps understand which trigger mechanisms produce the most alerts.",
      files: [
        { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders trigger breakdown chart" },
        { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart container" },
        { path: "frontend/src/stores/dashboardStore.ts", role: "Provides by_trigger data" },
        { path: "frontend/src/stores/widgetStore.ts", role: "Manages chart type toggle" },
      ],
      stores: [
        {
          name: "dashboardStore",
          path: "frontend/src/stores/dashboardStore.ts",
          role: "Provides by_trigger alert breakdown",
        },
        {
          name: "widgetStore",
          path: "frontend/src/stores/widgetStore.ts",
          role: "Manages chart type toggle state",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/dashboard/stats",
          role: "Returns alert stats including by_trigger breakdown",
          routerFile: "backend/api/dashboard.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/summary.parquet",
          category: "results",
          role: "Alert data for trigger-based aggregation",
        },
      ],
      technologies: [{ name: "Recharts", role: "Renders BarChart / PieChart" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Chart widget defined in metadata with default chart type and grid position. Trigger paths derive from metadata-driven model definitions.",
      metadataOpportunities: ["Allow trigger categories to be defined in model metadata"],
    },
    {
      id: "dashboard.alerts-by-asset",
      displayName: "Alerts by Asset Class",
      viewId: "dashboard",
      description:
        "Chart showing alert count grouped by asset class (equities, FX, futures). Provides cross-asset view of detection activity.",
      files: [
        { path: "frontend/src/views/Dashboard/index.tsx", role: "Renders asset class chart" },
        { path: "frontend/src/components/WidgetContainer.tsx", role: "Provides chart container" },
        { path: "frontend/src/stores/dashboardStore.ts", role: "Provides by_asset data" },
        { path: "frontend/src/stores/widgetStore.ts", role: "Manages chart type toggle" },
      ],
      stores: [
        {
          name: "dashboardStore",
          path: "frontend/src/stores/dashboardStore.ts",
          role: "Provides by_asset_class alert breakdown",
        },
        {
          name: "widgetStore",
          path: "frontend/src/stores/widgetStore.ts",
          role: "Manages chart type toggle state",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/dashboard/stats",
          role: "Returns alert stats including by_asset breakdown",
          routerFile: "backend/api/dashboard.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/alerts/summary.parquet",
          category: "results",
          role: "Alert data for asset-class aggregation",
        },
      ],
      technologies: [{ name: "Recharts", role: "Renders BarChart / PieChart" }],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Chart widget defined in metadata with default chart type and grid position. Asset classes come from entity metadata.",
      metadataOpportunities: ["Derive asset class categories dynamically from product entity metadata"],
    },
  ],
};
