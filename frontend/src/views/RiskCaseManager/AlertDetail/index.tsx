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

interface AlertDetailProps {
  alert: AlertTrace;
  onBack: () => void;
}

export default function AlertDetail({ alert, onBack }: AlertDetailProps) {
  const productId = alert.entity_context?.product_id ?? "";
  const accountId = alert.entity_context?.account_id ?? "";

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

      {/* Row 1: Business Description | Entity Context */}
      <div className="grid grid-cols-2 gap-4">
        <BusinessDescription alert={alert} />
        <EntityContext alert={alert} />
      </div>

      {/* Row 2: Calculation Trace DAG | Market Data Chart */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Calculation Trace" noPadding className="min-h-[250px]">
          <CalculationTrace alert={alert} />
        </Panel>
        {productId ? (
          <MarketDataChart productId={productId} />
        ) : (
          <Panel title="Market Data">
            <p className="text-xs text-muted">No product context available.</p>
          </Panel>
        )}
      </div>

      {/* Row 3: Settings Resolution | Score Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <SettingsTrace entries={alert.settings_trace ?? []} />
        <ScoreBreakdown alert={alert} />
      </div>

      {/* Row 4: Related Orders (full width) */}
      {productId && accountId && (
        <RelatedOrders productId={productId} accountId={accountId} />
      )}

      {/* Row 5: Footer Actions */}
      <FooterActions alert={alert} />
    </div>
  );
}
