import { useEffect, useState, useCallback, useMemo } from "react";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import Panel from "../../components/Panel.tsx";
import DataGrid from "../../components/DataGrid.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import CaseDetail from "./CaseDetail.tsx";
import ComplianceDashboard from "./ComplianceDashboard.tsx";
import { useCaseStore, type Case } from "../../stores/caseStore.ts";
import {
  useWorkflowStates,
  type WorkflowState,
} from "../../hooks/useWorkflowStates.ts";

/* ---------- Status helpers ---------- */
function buildVariantMap(states: WorkflowState[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of states) map[s.id] = s.badge_variant;
  return map;
}

function variantFor(
  value: string,
  map: Record<string, string>,
): "success" | "error" | "warning" | "info" | "muted" {
  return (map[value] ?? "muted") as
    | "success"
    | "error"
    | "warning"
    | "info"
    | "muted";
}

function priorityVariant(p: string) {
  switch (p) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "muted";
  }
}

function slaVariant(s: string) {
  switch (s) {
    case "breached":
      return "error";
    case "at_risk":
      return "warning";
    case "on_track":
      return "success";
    default:
      return "muted";
  }
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return ts;
  }
}

function badgeCell(value: string, variant: string) {
  const colors: Record<string, string> = {
    success: "bg-green-500/15 text-green-500 border-green-500/30",
    error: "bg-red-500/15 text-red-500 border-red-500/30",
    warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    info: "bg-blue-400/15 text-blue-400 border-blue-400/30",
    muted: "bg-gray-400/10 text-gray-400 border-gray-400/20",
  };
  const el = document.createElement("span");
  el.innerHTML = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[variant] ?? colors.muted}">${value}</span>`;
  return el;
}

type ViewTab = "cases" | "dashboard";

/* ---------- Component ---------- */
export default function CaseManagement() {
  const {
    cases,
    loading,
    error,
    fetchCases,
    updateStatus,
    selectCase,
  } = useCaseStore();
  const workflowStates = useWorkflowStates("case_management");
  const variantMap = useMemo(
    () => buildVariantMap(workflowStates),
    [workflowStates],
  );
  const [selected, setSelected] = useState<Case | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("cases");

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Sync selection with store
  useEffect(() => {
    if (selected) {
      const updated = cases.find((c) => c.case_id === selected.case_id);
      if (updated) {
        setSelected(updated);
        selectCase(updated);
      } else {
        setSelected(null);
        selectCase(null);
      }
    }
  }, [cases, selected, selectCase]);

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<Case>) => {
      if (event.data) {
        setSelected(event.data);
        selectCase(event.data);
      }
    },
    [selectCase],
  );

  const columnDefs = useMemo(
    (): ColDef<Case>[] => [
      {
        field: "case_id",
        headerName: "Case ID",
        width: 140,
        cellClass: "font-mono text-[11px]",
      },
      { field: "title", headerName: "Title", flex: 1, minWidth: 200 },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        cellRenderer: (params: { value: string }) =>
          params.value
            ? badgeCell(params.value, variantFor(params.value, variantMap))
            : null,
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 110,
        cellRenderer: (params: { value: string }) =>
          params.value
            ? badgeCell(params.value, priorityVariant(params.value))
            : null,
      },
      { field: "assignee", headerName: "Assignee", width: 140 },
      {
        headerName: "Alerts",
        width: 80,
        cellClass: "text-center",
        valueGetter: (params) => params.data?.alert_ids?.length ?? 0,
      },
      {
        headerName: "SLA",
        width: 100,
        valueGetter: (params) => params.data?.sla?.sla_status ?? "",
        cellRenderer: (params: { value: string }) =>
          params.value
            ? badgeCell(
                params.value.replace("_", " "),
                slaVariant(params.value),
              )
            : null,
      },
      {
        field: "created_at",
        headerName: "Created",
        width: 120,
        valueFormatter: (params) => formatDate(params.value),
      },
    ],
    [variantMap],
  );

  if (loading && cases.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
      {/* View tabs */}
      <div className="flex items-center gap-4 shrink-0">
        <h2 className="text-lg font-semibold">Case Management</h2>
        <div className="flex border-b border-border">
          {(["cases", "dashboard"] as ViewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t === "cases" ? "Cases" : "Dashboard"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "cases" ? (
        <>
          {/* AG Grid */}
          <Panel
            title={`Investigation Cases (${cases.length})`}
            className={selected ? "h-[280px] shrink-0" : "flex-1"}
            noPadding
            dataTrace="cases.grid"
            dataTour="cases-grid"
          >
            {cases.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted">
                No cases yet. Create a case from the Risk Case Manager.
              </div>
            ) : (
              <DataGrid<Case>
                rowData={cases}
                columnDefs={columnDefs}
                onRowClicked={handleRowClicked}
                getRowId={(params) => params.data.case_id}
                rowSelection="single"
              />
            )}
          </Panel>

          {/* Detail panel */}
          {selected && (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <span>{selected.title}</span>
                  <StatusBadge
                    label={selected.status}
                    variant={variantFor(selected.status, variantMap)}
                  />
                </span>
              }
              className="flex-1 min-h-[300px]"
              noPadding
              dataTrace="cases.detail"
              dataTour="cases-detail"
              actions={
                <button
                  onClick={() => {
                    setSelected(null);
                    selectCase(null);
                  }}
                  className="px-2 py-0.5 text-[10px] rounded border border-border text-muted hover:text-foreground transition-colors"
                >
                  Close
                </button>
              }
            >
              <CaseDetail
                caseData={selected}
                onStatusUpdate={(status) =>
                  updateStatus(selected.case_id, status)
                }
                variantMap={variantMap}
              />
            </Panel>
          )}
        </>
      ) : (
        <Panel
          title="Compliance Dashboard"
          className="flex-1"
          dataTrace="cases.dashboard"
          dataTour="cases-dashboard"
        >
          <ComplianceDashboard />
        </Panel>
      )}
    </div>
  );
}
