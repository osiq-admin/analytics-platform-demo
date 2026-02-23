import { useState } from "react";
import type { AlertTrace } from "../../../stores/alertStore.ts";
import Panel from "../../../components/Panel.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import BusinessDescription from "./BusinessDescription.tsx";
import EntityContext from "./EntityContext.tsx";
import ScoreBreakdown from "./ScoreBreakdown.tsx";
import CalculationTrace from "./CalculationTrace.tsx";
import MarketDataChart from "./MarketDataChart.tsx";
import SettingsTrace from "./SettingsTrace.tsx";
import RelatedOrders from "./RelatedOrders.tsx";
import FooterActions from "./FooterActions.tsx";

type PanelId = "business" | "entity" | "calcTrace" | "marketData" | "settings" | "scores" | "orders" | "footer";

const PANEL_LABELS: Record<PanelId, string> = {
  business: "Business Desc",
  entity: "Entity Context",
  calcTrace: "Calc Trace",
  marketData: "Market Data",
  settings: "Settings",
  scores: "Scores",
  orders: "Orders",
  footer: "Actions",
};

const ALL_PANELS: PanelId[] = ["business", "entity", "calcTrace", "marketData", "settings", "scores", "orders", "footer"];

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
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          Back
        </button>
        <h3 className="text-base font-semibold">Alert Detail</h3>
        <StatusBadge label={alert.model_id} variant="info" />
        <StatusBadge
          label={`Score: ${alert.accumulated_score}`}
          variant={
            alert.accumulated_score >= alert.score_threshold
              ? "error"
              : "warning"
          }
        />
        <StatusBadge label={alert.trigger_path} variant="success" />
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

      {/* Row 1: Business Description | Entity Context */}
      {(panelConfig.business || panelConfig.entity) && (
        <div className={`grid gap-4 ${panelConfig.business && panelConfig.entity ? "grid-cols-2" : "grid-cols-1"}`}>
          {panelConfig.business && <BusinessDescription alert={alert} />}
          {panelConfig.entity && <EntityContext alert={alert} />}
        </div>
      )}

      {/* Row 2: Calculation Trace DAG | Market Data Chart */}
      {(panelConfig.calcTrace || panelConfig.marketData) && (
        <div className={`grid gap-4 ${panelConfig.calcTrace && panelConfig.marketData ? "grid-cols-2" : "grid-cols-1"}`}>
          {panelConfig.calcTrace && (
            <Panel title="Calculation Trace" noPadding className="min-h-[250px]">
              <CalculationTrace alert={alert} />
            </Panel>
          )}
          {panelConfig.marketData && (
            productId ? (
              <MarketDataChart productId={productId} />
            ) : (
              <Panel title="Market Data">
                <p className="text-xs text-muted">No product context available.</p>
              </Panel>
            )
          )}
        </div>
      )}

      {/* Row 3: Settings Resolution | Score Breakdown */}
      {(panelConfig.settings || panelConfig.scores) && (
        <div className={`grid gap-4 ${panelConfig.settings && panelConfig.scores ? "grid-cols-2" : "grid-cols-1"}`}>
          {panelConfig.settings && <SettingsTrace entries={alert.settings_trace ?? []} />}
          {panelConfig.scores && <ScoreBreakdown alert={alert} />}
        </div>
      )}

      {/* Row 4: Related Orders (full width) */}
      {panelConfig.orders && productId && accountId && (
        <RelatedOrders productId={productId} accountId={accountId} />
      )}

      {/* Row 5: Footer Actions */}
      {panelConfig.footer && <FooterActions alert={alert} />}
    </div>
  );
}
