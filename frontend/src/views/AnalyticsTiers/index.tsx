import { useEffect, useState } from "react";
import { api } from "../../api/client.ts";
import { PlatinumTab, type PlatinumConfig, type KPIDataset } from "./PlatinumTab.tsx";
import { SandboxTab, type SandboxConfig, type SandboxComparison } from "./SandboxTab.tsx";
import { ArchiveTab, type ArchiveConfig, type ArchiveEntry, type ComplianceSummary } from "./ArchiveTab.tsx";

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type TabId = "platinum" | "sandbox" | "archive";

const TABS: { id: TabId; label: string }[] = [
  { id: "platinum", label: "Platinum KPIs" },
  { id: "sandbox", label: "Sandbox" },
  { id: "archive", label: "Archive" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsTiers() {
  const [activeTab, setActiveTab] = useState<TabId>("platinum");
  const [loading, setLoading] = useState(true);

  // Platinum state
  const [platinumConfig, setPlatinumConfig] = useState<PlatinumConfig | null>(null);
  const [datasets, setDatasets] = useState<KPIDataset[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<string>("");
  const [selectedDataset, setSelectedDataset] = useState<KPIDataset | null>(null);
  const [generating, setGenerating] = useState(false);

  // Sandbox state
  const [sandboxes, setSandboxes] = useState<SandboxConfig[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<SandboxConfig | null>(null);
  const [comparison, setComparison] = useState<SandboxComparison | null>(null);
  const [creatingBox, setCreatingBox] = useState(false);
  const [runningSandbox, setRunningSandbox] = useState(false);

  // Archive state
  const [archiveConfig, setArchiveConfig] = useState<ArchiveConfig | null>(null);
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>([]);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [exporting, setExporting] = useState<string>("");

  // ── Data loading ──

  useEffect(() => {
    if (activeTab === "platinum") {
      setLoading(true);
      Promise.all([
        api.get<PlatinumConfig>("/platinum/config"),
        api.get<KPIDataset[]>("/platinum/datasets"),
      ])
        .then(([cfg, ds]) => {
          setPlatinumConfig(cfg);
          setDatasets(ds);
          if (ds.length > 0 && !selectedKpi) setSelectedKpi(ds[0].kpi_id);
        })
        .finally(() => setLoading(false));
    } else if (activeTab === "sandbox") {
      setLoading(true);
      api.get<SandboxConfig[]>("/sandbox/list")
        .then(setSandboxes)
        .finally(() => setLoading(false));
    } else if (activeTab === "archive") {
      setLoading(true);
      Promise.all([
        api.get<ArchiveConfig>("/archive/config"),
        api.get<ArchiveEntry[]>("/archive/entries"),
        api.get<ComplianceSummary>("/archive/compliance"),
      ])
        .then(([cfg, entries, comp]) => {
          setArchiveConfig(cfg);
          setArchiveEntries(entries);
          setCompliance(comp);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load KPI detail when selection changes
  useEffect(() => {
    if (!selectedKpi) {
      setSelectedDataset(null);
      return;
    }
    api.get<KPIDataset>(`/platinum/datasets/${selectedKpi}`)
      .then(setSelectedDataset)
      .catch(() => setSelectedDataset(null));
  }, [selectedKpi]);

  // Load comparison when sandbox selected
  useEffect(() => {
    if (!selectedSandbox || selectedSandbox.status !== "completed") {
      setComparison(null);
      return;
    }
    api.get<SandboxComparison>(`/sandbox/${selectedSandbox.sandbox_id}/compare`)
      .then(setComparison)
      .catch(() => setComparison(null));
  }, [selectedSandbox]);

  // ── Handlers ──

  const handleGenerateAll = () => {
    setGenerating(true);
    api.post<{ generated: number; datasets: KPIDataset[] }>("/platinum/generate")
      .then((result) => {
        setDatasets(result.datasets);
        if (result.datasets.length > 0) setSelectedKpi(result.datasets[0].kpi_id);
      })
      .finally(() => setGenerating(false));
  };

  const handleCreateSandbox = () => {
    setCreatingBox(true);
    api.post<SandboxConfig>("/sandbox/create", { name: `Sandbox ${Date.now()}`, description: "What-if scenario" })
      .then((sandbox) => {
        setSandboxes((prev) => [...prev, sandbox]);
        setSelectedSandbox(sandbox);
      })
      .finally(() => setCreatingBox(false));
  };

  const handleRunSandbox = () => {
    if (!selectedSandbox) return;
    setRunningSandbox(true);
    api.post<SandboxConfig>(`/sandbox/${selectedSandbox.sandbox_id}/run`)
      .then((updated) => {
        setSandboxes((prev) => prev.map((s) => s.sandbox_id === updated.sandbox_id ? updated : s));
        setSelectedSandbox(updated);
      })
      .finally(() => setRunningSandbox(false));
  };

  const handleDiscardSandbox = () => {
    if (!selectedSandbox) return;
    api.delete(`/sandbox/${selectedSandbox.sandbox_id}`)
      .then(() => {
        setSandboxes((prev) => prev.filter((s) => s.sandbox_id !== selectedSandbox.sandbox_id));
        setSelectedSandbox(null);
        setComparison(null);
      });
  };

  const handleExport = (entity: string, policyId: string) => {
    setExporting(entity);
    api.post<ArchiveEntry>(`/archive/export/${entity}?policy_id=${policyId}`)
      .then((entry) => {
        setArchiveEntries((prev) => [...prev, entry]);
      })
      .finally(() => setExporting(""));
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Loading analytics tiers...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Analytics Tiers</h1>
        <span className="text-xs text-muted">
          Extended analytical layers: Platinum KPIs, Sandbox testing, Archive management
        </span>
      </div>

      {/* Tier selector tabs */}
      <div className="flex gap-2" data-tour="analytics-tier-tabs" data-trace="analytics-tiers.tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              activeTab === tab.id
                ? "bg-accent/20 border-accent text-accent"
                : "border-border text-muted hover:text-foreground hover:border-border-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "platinum" && (
        <PlatinumTab
          platinumConfig={platinumConfig}
          datasets={datasets}
          selectedKpi={selectedKpi}
          selectedDataset={selectedDataset}
          generating={generating}
          onSelectKpi={setSelectedKpi}
          onGenerateAll={handleGenerateAll}
        />
      )}
      {activeTab === "sandbox" && (
        <SandboxTab
          sandboxes={sandboxes}
          selectedSandbox={selectedSandbox}
          comparison={comparison}
          creatingBox={creatingBox}
          runningSandbox={runningSandbox}
          onSelectSandbox={setSelectedSandbox}
          onCreateSandbox={handleCreateSandbox}
          onRunSandbox={handleRunSandbox}
          onDiscardSandbox={handleDiscardSandbox}
        />
      )}
      {activeTab === "archive" && (
        <ArchiveTab
          archiveConfig={archiveConfig}
          archiveEntries={archiveEntries}
          compliance={compliance}
          exporting={exporting}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
