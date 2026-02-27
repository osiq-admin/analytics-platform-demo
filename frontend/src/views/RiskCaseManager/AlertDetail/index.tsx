import { useEffect, useState } from "react";
import type { AlertTrace } from "../../../stores/alertStore.ts";
import { api } from "../../../api/client.ts";
import Panel from "../../../components/Panel.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import ExplainabilityPanel, { type AlertTraceResponse } from "../../../components/ExplainabilityPanel.tsx";
import LoadingSpinner from "../../../components/LoadingSpinner.tsx";
import BusinessDescription from "./BusinessDescription.tsx";
import EntityContext from "./EntityContext.tsx";
import ScoreBreakdown from "./ScoreBreakdown.tsx";
import CalculationTrace from "./CalculationTrace.tsx";
import MarketDataChart from "./MarketDataChart.tsx";
import SettingsTrace from "./SettingsTrace.tsx";
import RelatedOrders from "./RelatedOrders.tsx";
import TradeVolumeChart from "./TradeVolumeChart.tsx";
import FooterActions from "./FooterActions.tsx";
import { getModelLayout, fromApiLayout, type ModelLayout, type PanelId } from "./modelLayouts.ts";
import { formatLabel } from "../../../utils/format.ts";

const PANEL_LABELS: Record<PanelId, string> = {
  business: "Business Desc",
  entity: "Entity Context",
  calcTrace: "Calc Trace",
  marketData: "Market Data",
  volume: "Volume",
  settings: "Settings",
  scores: "Scores",
  orders: "Orders",
  explainability: "Explainability",
  footer: "Actions",
};

const ALL_PANELS: PanelId[] = ["business", "entity", "calcTrace", "marketData", "volume", "settings", "scores", "orders", "explainability", "footer"];

const DEFAULT_CONFIG: Record<PanelId, boolean> = Object.fromEntries(
  ALL_PANELS.map((id) => [id, true])
) as Record<PanelId, boolean>;

function loadPanelConfig(): Record<PanelId, boolean> {
  try {
    const raw = localStorage.getItem("alertDetail.panelConfig");
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

interface AlertDetailProps {
  alert: AlertTrace;
  onBack: () => void;
}

export default function AlertDetail({ alert, onBack }: AlertDetailProps) {
  const productId = alert.entity_context?.product_id ?? "";
  const accountId = alert.entity_context?.account_id ?? "";

  const [panelConfig, setPanelConfig] = useState(loadPanelConfig);
  const modelLayout = getModelLayout(alert.model_id);

  // Try to load layout from API metadata, fall back to hardcoded
  const [apiLayout, setApiLayout] = useState<ModelLayout | null>(null);

  useEffect(() => {
    api
      .get<{ alert_detail_layout?: Record<string, unknown>; name?: string }>(
        `/metadata/detection-models/${alert.model_id}`
      )
      .then((model) => {
        if (model.alert_detail_layout) {
          setApiLayout(
            fromApiLayout(model.alert_detail_layout, model.name ?? alert.model_id)
          );
        }
      })
      .catch(() => {
        // Fallback to hardcoded layouts
      });
  }, [alert.model_id]);

  // Use API layout if available, otherwise fall back to hardcoded
  const effectiveLayout = apiLayout ?? modelLayout;
  const isEmphasized = (id: PanelId) => effectiveLayout?.emphasis.includes(id) ?? false;

  // Fetch explainability trace from /api/trace/alert/{id}
  const [traceData, setTraceData] = useState<AlertTraceResponse | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTraceLoading(true);
    setTraceError(null);

    api
      .get<AlertTraceResponse>(`/trace/alert/${alert.alert_id}`)
      .then((data) => {
        if (!cancelled) setTraceData(data);
      })
      .catch((e) => {
        if (!cancelled) setTraceError(String(e));
      })
      .finally(() => {
        if (!cancelled) setTraceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [alert.alert_id]);

  const togglePanel = (id: PanelId) => {
    setPanelConfig((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("alertDetail.panelConfig", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      {/* Header bar */}
      <div className="flex items-center gap-3" data-trace="alerts.detail-header">
        <button
          onClick={onBack}
          className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          Back
        </button>
        <h3 className="text-base font-semibold">Alert Detail</h3>
        <StatusBadge label={formatLabel(alert.model_id)} variant="info" />
        <StatusBadge
          label={`Score: ${alert.accumulated_score}`}
          variant={
            alert.accumulated_score >= alert.score_threshold
              ? "error"
              : "warning"
          }
        />
        <StatusBadge label={formatLabel(alert.trigger_path)} variant="success" />
        <span className="text-xs text-muted font-mono ml-auto">
          {alert.alert_id}
        </span>
      </div>

      {/* Panel toggles */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_PANELS.map((id) => (
          <button
            key={id}
            onClick={() => togglePanel(id)}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              panelConfig[id]
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {PANEL_LABELS[id]}
          </button>
        ))}
      </div>

      {/* Investigation hint */}
      {effectiveLayout && (
        <div className="text-xs bg-accent/10 border border-accent/20 rounded px-3 py-1.5 text-accent">
          <span className="font-semibold">{effectiveLayout.label}:</span>{" "}
          {effectiveLayout.investigationHint}
        </div>
      )}

      {/* Row 1: Business Description | Entity Context */}
      {(panelConfig.business || panelConfig.entity) && (
        <div className={`grid gap-4 ${panelConfig.business && panelConfig.entity ? "grid-cols-2" : "grid-cols-1"}`}>
          {panelConfig.business && (
            <div className={isEmphasized("business") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.business-description">
              <BusinessDescription alert={alert} />
            </div>
          )}
          {panelConfig.entity && (
            <div className={isEmphasized("entity") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.entity-context">
              <EntityContext alert={alert} />
            </div>
          )}
        </div>
      )}

      {/* Row 2: Calculation Trace DAG | Market Data Chart */}
      {(panelConfig.calcTrace || panelConfig.marketData) && (
        <div className={`grid gap-4 ${panelConfig.calcTrace && panelConfig.marketData ? "grid-cols-2" : "grid-cols-1"}`}>
          {panelConfig.calcTrace && (
            <Panel title="Calculation Trace" noPadding dataTrace="alerts.calculation-trace" className={`min-h-[250px] ${isEmphasized("calcTrace") ? "ring-1 ring-accent/30" : ""}`}>
              <CalculationTrace alert={alert} />
            </Panel>
          )}
          {panelConfig.marketData && (
            <div className={isEmphasized("marketData") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.market-data">
              {productId ? (
                <MarketDataChart productId={productId} />
              ) : (
                <Panel title="Market Data">
                  <p className="text-xs text-muted">No product context available.</p>
                </Panel>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Trade Volume */}
      {panelConfig.volume && productId && (
        <div className={isEmphasized("volume") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.trade-volume">
          <TradeVolumeChart productId={productId} alertDate={alert.entity_context?.business_date} />
        </div>
      )}

      {/* Row 4: Settings Resolution | Score Breakdown */}
      {(panelConfig.settings || panelConfig.scores) && (
        <div className={`grid gap-4 ${panelConfig.settings && panelConfig.scores ? "grid-cols-2" : "grid-cols-1"}`}>
          {panelConfig.settings && (
            <div className={isEmphasized("settings") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.settings-trace">
              <SettingsTrace entries={alert.settings_trace ?? []} />
            </div>
          )}
          {panelConfig.scores && (
            <div className={isEmphasized("scores") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.score-breakdown">
              <ScoreBreakdown alert={alert} />
            </div>
          )}
        </div>
      )}

      {/* Row 5: Related Orders (full width) */}
      {panelConfig.orders && productId && accountId && (
        <div className={isEmphasized("orders") ? "ring-1 ring-accent/30 rounded-lg" : ""} data-trace="alerts.related-orders">
          <RelatedOrders productId={productId} accountId={accountId} />
        </div>
      )}

      {/* Row 6: Explainability Trace (full width) */}
      {panelConfig.explainability && (
        <div className={isEmphasized("explainability") ? "ring-1 ring-accent/30 rounded-lg" : ""}>
          {traceLoading && (
            <Panel title="Explainability Trace">
              <div className="flex items-center gap-2 py-4 justify-center">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-muted">Loading trace data...</span>
              </div>
            </Panel>
          )}
          {traceError && (
            <Panel title="Explainability Trace">
              <div className="text-xs text-muted py-2">
                Trace data not available for this alert.
              </div>
            </Panel>
          )}
          {traceData && !traceLoading && <ExplainabilityPanel trace={traceData} />}
        </div>
      )}

      {/* Row 7: Footer Actions */}
      {panelConfig.footer && <FooterActions alert={alert} />}
    </div>
  );
}
