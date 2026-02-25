import { useEffect, useState, useCallback, useMemo } from "react";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import Panel from "../../components/Panel.tsx";
import DataGrid from "../../components/DataGrid.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import SubmissionDetail from "./SubmissionDetail.tsx";
import {
  useSubmissionStore,
  type Submission,
} from "../../stores/submissionStore.ts";

/* ---------- Status helpers ---------- */

function statusVariant(status: string) {
  switch (status) {
    case "approved":
    case "implemented":
      return "success" as const;
    case "rejected":
      return "error" as const;
    case "in_review":
      return "warning" as const;
    case "pending":
      return "info" as const;
    default:
      return "muted" as const;
  }
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return ts;
  }
}

/* ---------- Column defs ---------- */

function buildColumnDefs(
  onDelete: (id: string) => void
): ColDef<Submission>[] {
  return [
    {
      field: "submission_id",
      headerName: "ID",
      width: 140,
      cellClass: "font-mono text-[11px]",
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "author",
      headerName: "Author",
      width: 120,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        const el = document.createElement("span");
        el.className = "inline-flex items-center";
        // We use a simple colored text approach for the grid cell
        const variant = statusVariant(params.value);
        const colors: Record<string, string> = {
          success: "text-green-500",
          error: "text-red-500",
          warning: "text-amber-500",
          info: "text-blue-400",
          muted: "text-gray-400",
        };
        el.innerHTML = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
          variant === "success"
            ? "bg-green-500/15 text-green-500 border-green-500/30"
            : variant === "error"
              ? "bg-red-500/15 text-red-500 border-red-500/30"
              : variant === "warning"
                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                : variant === "info"
                  ? "bg-blue-400/15 text-blue-400 border-blue-400/30"
                  : "bg-gray-400/10 text-gray-400 border-gray-400/20"
        }">${params.value}</span>`;
        void colors;
        return el;
      },
    },
    {
      headerName: "Components",
      width: 110,
      valueGetter: (params) => params.data?.components?.length ?? 0,
      cellClass: "text-center",
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 110,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      headerName: "",
      width: 70,
      sortable: false,
      cellRenderer: (params: { data: Submission | undefined }) => {
        if (!params.data) return null;
        const btn = document.createElement("button");
        btn.className =
          "px-2 py-0.5 text-[10px] rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors";
        btn.textContent = "Delete";
        btn.onclick = (e) => {
          e.stopPropagation();
          onDelete(params.data!.submission_id);
        };
        return btn;
      },
    },
  ];
}

/* ---------- Component ---------- */

export default function Submissions() {
  const {
    submissions,
    loading,
    error,
    fetchSubmissions,
    updateStatus,
    deleteSubmission,
    rerunRecommendations,
  } = useSubmissionStore();

  const [selected, setSelected] = useState<Submission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Keep selection in sync with store
  useEffect(() => {
    if (selected) {
      const updated = submissions.find(
        (s) => s.submission_id === selected.submission_id
      );
      if (updated) {
        setSelected(updated);
      } else {
        setSelected(null);
      }
    }
  }, [submissions, selected]);

  const handleRowClicked = useCallback((event: RowClickedEvent<Submission>) => {
    if (event.data) {
      setSelected(event.data);
    }
  }, []);

  const handleStatusUpdate = useCallback(
    async (status: string, comment?: string) => {
      if (!selected) return;
      await updateStatus(selected.submission_id, status, "reviewer", comment);
    },
    [selected, updateStatus]
  );

  const handleRefreshRecommendations = useCallback(async () => {
    if (!selected) return;
    await rerunRecommendations(selected.submission_id);
  }, [selected, rerunRecommendations]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteSubmission(deleteTarget);
    setDeleteTarget(null);
  }, [deleteTarget, deleteSubmission]);

  const columnDefs = useMemo(
    () => buildColumnDefs((id) => setDeleteTarget(id)),
    []
  );

  if (loading && submissions.length === 0) {
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
      <h2 className="text-lg font-semibold shrink-0">Submissions Review Queue</h2>

      {/* AG Grid queue */}
      <Panel
        title={`Submissions (${submissions.length})`}
        className={selected ? "h-[280px] shrink-0" : "flex-1"}
        noPadding
      >
        {submissions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted">
            No submissions yet. Submit a use case from the Use Case Studio.
          </div>
        ) : (
          <DataGrid<Submission>
            rowData={submissions}
            columnDefs={columnDefs}
            onRowClicked={handleRowClicked}
            getRowId={(params) => params.data.submission_id}
            rowSelection="single"
          />
        )}
      </Panel>

      {/* Detail panel */}
      {selected && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <span>{selected.name}</span>
              <StatusBadge
                label={selected.status}
                variant={statusVariant(selected.status)}
              />
            </span>
          }
          className="flex-1 min-h-[300px]"
          noPadding
          actions={
            <button
              onClick={() => setSelected(null)}
              className="px-2 py-0.5 text-[10px] rounded border border-border text-muted hover:text-foreground transition-colors"
            >
              Close
            </button>
          }
        >
          <SubmissionDetail
            submission={selected}
            onStatusUpdate={handleStatusUpdate}
            onRefreshRecommendations={handleRefreshRecommendations}
          />
        </Panel>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Submission"
        message={`Are you sure you want to delete submission ${deleteTarget}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
