import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client.ts";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { ArchitectureTab, type Tier, type Contract, type PipelineStage } from "./ArchitectureTab.tsx";
import {
  LakehouseTab,
  type SchemaEvolution,
  type PIIRegistry,
  type CalcResultLog,
  type PipelineRun,
  type MVStatus,
} from "./LakehouseTab.tsx";

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type ViewTab = "architecture" | "lakehouse";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "architecture", label: "Architecture" },
  { key: "lakehouse", label: "Lakehouse" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MedallionOverview() {
  const [activeTab, setActiveTab] = useState<ViewTab>("architecture");

  // Architecture tab state
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageStatus, setStageStatus] = useState<Record<string, { status: string; duration_ms: number; quality_score: number | null }>>({});
  const [runningStage, setRunningStage] = useState<string | null>(null);

  // Lakehouse tab state
  const [lhTables, setLhTables] = useState<Record<string, string[]>>({});
  const [schemaHistory] = useState<SchemaEvolution[]>([]);
  const [piiRegistry, setPiiRegistry] = useState<PIIRegistry | null>(null);
  const [calcStats, setCalcStats] = useState<Record<string, number> | null>(null);
  const [calcLog, setCalcLog] = useState<CalcResultLog[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [mvStatus, setMvStatus] = useState<MVStatus[]>([]);
  const [lhLoading, setLhLoading] = useState(false);
  const [lhLoaded, setLhLoaded] = useState(false);

  // Load architecture data on mount
  useEffect(() => {
    Promise.all([
      api.get<Tier[]>("/medallion/tiers"),
      api.get<Contract[]>("/medallion/contracts"),
      api.get<PipelineStage[]>("/medallion/pipeline-stages"),
    ])
      .then(([t, c, s]) => {
        setTiers(t);
        setContracts(c);
        setStages(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load lakehouse data when tab is first selected
  useEffect(() => {
    if (activeTab !== "lakehouse" || lhLoaded) return;
    setLhLoading(true);
    Promise.all([
      api.get<Record<string, string[]>>("/lakehouse/tables").catch(() => ({})),
      api.get<PIIRegistry>("/lakehouse/governance/pii-registry").catch(() => null),
      api.get<Record<string, number>>("/lakehouse/calc/stats").catch(() => null),
      api.get<CalcResultLog[]>("/lakehouse/calc/result-log").catch(() => []),
      api.get<PipelineRun[]>("/lakehouse/runs").catch(() => []),
      api.get<MVStatus[]>("/lakehouse/materialized-views").catch(() => []),
    ]).then(([tables, registry, stats, log, runs, mvs]) => {
      setLhTables(tables as Record<string, string[]>);
      setPiiRegistry(registry as PIIRegistry | null);
      setCalcStats(stats as Record<string, number> | null);
      setCalcLog(log as CalcResultLog[]);
      setPipelineRuns(runs as PipelineRun[]);
      setMvStatus(mvs as MVStatus[]);
      setLhLoaded(true);
    }).finally(() => setLhLoading(false));
  }, [activeTab, lhLoaded]);

  const handleRunStage = useCallback(async (stageId: string) => {
    setRunningStage(stageId);
    try {
      const result = await api.post<{
        stage_id: string;
        status: string;
        duration_ms: number;
        contract_validation?: { quality_score?: number };
      }>(`/pipeline/stages/${stageId}/run`);
      setStageStatus((prev) => ({
        ...prev,
        [result.stage_id]: {
          status: result.status,
          duration_ms: result.duration_ms,
          quality_score: result.contract_validation?.quality_score ?? null,
        },
      }));
    } catch {
      setStageStatus((prev) => ({
        ...prev,
        [stageId]: { status: "failed", duration_ms: 0, quality_score: null },
      }));
    } finally {
      setRunningStage(null);
    }
  }, []);

  const handleMVRefresh = useCallback(async () => {
    try {
      const result = await api.post<Record<string, { status: string; record_count: number }>>("/lakehouse/materialized-views/refresh");
      setMvStatus(Object.entries(result).map(([mv_id, v]) => ({ mv_id, status: v.status, record_count: v.record_count })));
    } catch {
      // ignore
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" data-trace="medallion.title">
          Medallion Architecture
        </h2>
        <StatusBadge label={`${tiers.length} tiers`} variant="info" />
        <StatusBadge label={`${contracts.length} contracts`} variant="muted" />
        <StatusBadge label={`${stages.length} stages`} variant="muted" />

        {/* Tab bar */}
        <div className="flex border-b border-border ml-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
              data-tour={`medallion-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Architecture tab */}
      {activeTab === "architecture" && (
        <ArchitectureTab
          tiers={tiers}
          contracts={contracts}
          stages={stages}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          stageStatus={stageStatus}
          runningStage={runningStage}
          onRunStage={handleRunStage}
        />
      )}

      {/* Lakehouse tab */}
      {activeTab === "lakehouse" && (
        <LakehouseTab
          loading={lhLoading}
          tables={lhTables}
          schemaHistory={schemaHistory}
          piiRegistry={piiRegistry}
          calcStats={calcStats}
          calcLog={calcLog}
          pipelineRuns={pipelineRuns}
          mvStatus={mvStatus}
          onMVRefresh={handleMVRefresh}
        />
      )}
    </div>
  );
}
