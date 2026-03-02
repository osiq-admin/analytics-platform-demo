import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import LineageExplorerTab from "./LineageExplorerTab.tsx";
import FieldTracingTab from "./FieldTracingTab.tsx";
import ImpactAnalysisTab from "./ImpactAnalysisTab.tsx";
import {
  useLineageStore,
  ALL_LAYERS,
  type LineageTab,
} from "../../stores/lineageStore.ts";

// ─── Entities available for selection ───

const ENTITIES = [
  "execution",
  "order",
  "product",
  "md_intraday",
  "md_eod",
  "venue",
  "account",
  "trader",
];

// ─── Layer display labels ───

const LAYER_LABELS: Record<string, string> = {
  tier_flow: "Tier Flow",
  field_mapping: "Fields",
  calc_chain: "Calcs",
  entity_fk: "Entity FKs",
  setting_impact: "Settings",
  regulatory_req: "Regulations",
};

// ─── Tab definitions ───

const TABS: { key: LineageTab; label: string }[] = [
  { key: "explorer", label: "Lineage Explorer" },
  { key: "field-tracing", label: "Field Tracing" },
  { key: "impact-analysis", label: "Impact Analysis" },
];

// ─── Main View ───

export default function DataLineage() {
  const [searchParams] = useSearchParams();
  const store = useLineageStore();

  // Initialize from URL params (alert explainability tunnel)
  useEffect(() => {
    const alertId = searchParams.get("alert");
    const tab = searchParams.get("tab") as LineageTab | null;
    if (alertId) {
      store.fetchAlertLineage(alertId);
    }
    if (tab && TABS.some((t) => t.key === tab)) {
      store.setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch unified graph on entity/layer change
  useEffect(() => {
    if (store.activeTab === "explorer") {
      store.fetchUnifiedGraph(store.selectedEntities, store.activeLayers);
    }
  }, [store.selectedEntities, store.activeLayers, store.activeTab]);

  const handleEntityToggle = useCallback(
    (entity: string) => {
      const current = store.selectedEntities;
      if (current.includes(entity)) {
        if (current.length > 1) {
          store.setSelectedEntities(current.filter((e) => e !== entity));
        }
      } else {
        store.setSelectedEntities([...current, entity]);
      }
    },
    [store.selectedEntities],
  );

  return (
    <div className="flex flex-col h-full gap-3 p-4" data-tour="lineage-view" data-trace="lineage.root">
      {/* View header */}
      <Panel
        title="Data Lineage"
        dataTour="lineage-title"
        dataTrace="lineage.header"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={store.toggleRegulatoryOverlay}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                store.showRegulatoryOverlay
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
              }`}
              data-tour="lineage-regulatory-toggle"
              data-trace="lineage.regulatory_toggle"
            >
              Regulatory
            </button>
            <button
              onClick={() => store.fetchCoverage()}
              className="px-2.5 py-1 text-xs rounded border bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600 transition-colors"
              data-tour="lineage-coverage-btn"
              data-trace="lineage.coverage_button"
            >
              Surveillance Coverage
            </button>
          </div>
        }
      >
        <p className="text-xs text-zinc-500">
          End-to-end data flow: tier pipeline, field transformations, calculation chains, impact analysis
        </p>
      </Panel>

      {/* Toolbar: Entity multi-select + Layer toggles */}
      <div className="flex items-center gap-3 flex-wrap" data-tour="lineage-toolbar" data-trace="lineage.toolbar">
        {/* Entity chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 mr-1">Entities:</span>
          {ENTITIES.map((entity) => (
            <button
              key={entity}
              onClick={() => handleEntityToggle(entity)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                store.selectedEntities.includes(entity)
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-zinc-800/60 text-zinc-500 border-zinc-700/60 hover:border-zinc-600"
              }`}
              data-trace={`lineage.entity_chip.${entity}`}
            >
              {entity}
            </button>
          ))}
        </div>

        {/* Layer toggle chips */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-zinc-500 mr-1">Layers:</span>
          {ALL_LAYERS.map((layer) => (
            <button
              key={layer}
              onClick={() => store.toggleLayer(layer)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                store.activeLayers.includes(layer)
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                  : "bg-zinc-800/60 text-zinc-500 border-zinc-700/60 hover:border-zinc-600"
              }`}
              data-trace={`lineage.layer_chip.${layer}`}
            >
              {LAYER_LABELS[layer] ?? layer}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-800" data-tour="lineage-tabs" data-trace="lineage.tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => store.setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              store.activeTab === tab.key
                ? "border-blue-500 text-blue-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
            data-trace={`lineage.tab.${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0" data-trace="lineage.content">
        {store.loading && (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        )}
        {store.error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
            <p className="text-red-400 text-sm">{store.error}</p>
          </div>
        )}
        {!store.loading && !store.error && (
          <TabContent activeTab={store.activeTab} />
        )}
      </div>

      {/* Coverage modal */}
      {store.coverage && <CoverageModal />}
    </div>
  );
}

// ─── Tab content router ───

function TabContent({ activeTab }: { activeTab: LineageTab }) {
  switch (activeTab) {
    case "explorer":
      return <LineageExplorerTab />;
    case "field-tracing":
      return <FieldTracingTab />;
    case "impact-analysis":
      return <ImpactAnalysisTab />;
    default:
      return null;
  }
}

// ─── Coverage matrix modal ───

function CoverageModal() {
  const { coverage } = useLineageStore();
  if (!coverage) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => useLineageStore.setState({ coverage: null })}
      data-tour="lineage-coverage-modal"
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-100">Surveillance Coverage Matrix</h2>
          <button
            onClick={() => useLineageStore.setState({ coverage: null })}
            className="text-zinc-500 hover:text-zinc-300 text-lg"
          >
            x
          </button>
        </div>

        {/* Coverage summary */}
        <div className="flex items-center gap-4 mb-4">
          <div className="text-xs text-zinc-400">
            Products: <span className="text-zinc-200 font-medium">{coverage.products.length}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Abuse Types: <span className="text-zinc-200 font-medium">{coverage.abuse_types.length}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Overall Coverage:{" "}
            <span
              className={`font-medium ${
                coverage.coverage_pct >= 80
                  ? "text-emerald-400"
                  : coverage.coverage_pct >= 60
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {coverage.coverage_pct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Matrix grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-1.5 px-2 text-zinc-500 font-medium">Product</th>
                {coverage.abuse_types.map((at) => (
                  <th key={at} className="text-center py-1.5 px-2 text-zinc-500 font-medium whitespace-nowrap">
                    {at.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coverage.products.slice(0, 20).map((product) => (
                <tr key={product.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-1 px-2 text-zinc-300">{product.name}</td>
                  {coverage.abuse_types.map((at) => {
                    const cell = coverage.cells.find(
                      (c) => c.product_id === product.id && c.abuse_type === at,
                    );
                    return (
                      <td key={at} className="text-center py-1 px-2">
                        {cell?.covered ? (
                          <span className="inline-block w-4 h-4 rounded-sm bg-emerald-500/30 text-emerald-400 text-[10px] leading-4">
                            {cell.model_ids.length}
                          </span>
                        ) : (
                          <span className="inline-block w-4 h-4 rounded-sm bg-red-500/20 text-red-400 text-[10px] leading-4">
                            -
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Regulatory gaps */}
        {coverage.regulatory_gaps.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium text-zinc-300 mb-2">Regulatory Gaps</h3>
            <div className="space-y-1">
              {coverage.regulatory_gaps.map((gap, i) => (
                <div key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5">!</span>
                  <span>
                    <span className="font-medium">{gap.regulation}</span>: {gap.gap_description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
