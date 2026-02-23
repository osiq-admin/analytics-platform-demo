import { useEffect, useState } from "react";
import { api } from "../../../api/client.ts";
import Panel from "../../../components/Panel.tsx";
import DataGrid from "../../../components/DataGrid.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import LoadingSpinner from "../../../components/LoadingSpinner.tsx";
import type { ColDef } from "ag-grid-community";

interface RelatedOrdersProps {
  productId: string;
  accountId: string;
}

interface OrdersResponse {
  orders: Record<string, unknown>[];
  executions: Record<string, unknown>[];
}

const executionCols: ColDef[] = [
  { field: "execution_id", headerName: "Exec ID", width: 120, cellStyle: { fontFamily: "monospace", fontSize: "10px" } },
  { field: "execution_date", headerName: "Date", width: 100, filter: "agDateColumnFilter" },
  { field: "execution_time", headerName: "Time", width: 80 },
  {
    field: "side",
    headerName: "Side",
    width: 70,
    filter: "agTextColumnFilter",
    cellRenderer: (p: { value: string }) =>
      p.value === "BUY"
        ? StatusBadge({ label: "BUY", variant: "success" })
        : StatusBadge({ label: "SELL", variant: "error" }),
  },
  { field: "quantity", headerName: "Qty", width: 70, type: "numericColumn", filter: "agNumberColumnFilter" },
  { field: "price", headerName: "Price", width: 90, type: "numericColumn", filter: "agNumberColumnFilter", valueFormatter: (p: { value: number }) => p.value?.toFixed(2) },
  { field: "product_id", headerName: "Product", width: 80 },
  { field: "account_id", headerName: "Account", width: 90 },
];

export default function RelatedOrders({ productId, accountId }: RelatedOrdersProps) {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<OrdersResponse>(`/data/orders?product_id=${productId}&account_id=${accountId}&limit=50`)
      .then(setData)
      .catch(() => setData({ orders: [], executions: [] }))
      .finally(() => setLoading(false));
  }, [productId, accountId]);

  if (loading) {
    return (
      <Panel title="Related Orders & Executions">
        <div className="flex items-center justify-center h-24">
          <LoadingSpinner size="md" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={`Related Orders & Executions (${data?.executions.length ?? 0})`} noPadding>
      <div className="h-48">
        <DataGrid
          rowData={data?.executions ?? []}
          columnDefs={executionCols}
          defaultColDef={{ sortable: true, resizable: true, filter: true, flex: 0 }}
        />
      </div>
    </Panel>
  );
}
