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
  { field: "order_id", headerName: "Order ID", width: 120, cellStyle: { fontFamily: "monospace", fontSize: "10px" } },
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
  { field: "venue_mic", headerName: "Venue", width: 80, filter: "agTextColumnFilter" },
  { field: "exec_type", headerName: "Exec Type", width: 90, filter: "agTextColumnFilter" },
  { field: "capacity", headerName: "Capacity", width: 90, filter: "agTextColumnFilter" },
  { field: "product_id", headerName: "Product", width: 80 },
  { field: "account_id", headerName: "Account", width: 90 },
];

const orderCols: ColDef[] = [
  { field: "order_id", headerName: "Order ID", width: 120, cellStyle: { fontFamily: "monospace", fontSize: "10px" } },
  { field: "order_date", headerName: "Date", width: 100, filter: "agDateColumnFilter" },
  { field: "order_time", headerName: "Time", width: 80 },
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
  { field: "order_type", headerName: "Type", width: 80, filter: "agTextColumnFilter" },
  { field: "limit_price", headerName: "Limit Price", width: 100, type: "numericColumn", filter: "agNumberColumnFilter", valueFormatter: (p: { value: number }) => p.value != null ? p.value.toFixed(2) : "" },
  { field: "time_in_force", headerName: "TIF", width: 70, filter: "agTextColumnFilter" },
  { field: "trader_id", headerName: "Trader", width: 100, filter: "agTextColumnFilter" },
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

  const orders = data?.orders ?? [];
  const executions = data?.executions ?? [];

  return (
    <div className="flex flex-col gap-3">
      {orders.length > 0 && (
        <Panel title={`Orders (${orders.length})`} noPadding>
          <div className="h-36">
            <DataGrid
              rowData={orders}
              columnDefs={orderCols}
              defaultColDef={{ sortable: true, resizable: true, filter: true, flex: 0 }}
            />
          </div>
        </Panel>
      )}
      <Panel title={`Executions (${executions.length})`} noPadding>
        <div className="h-48">
          <DataGrid
            rowData={executions}
            columnDefs={executionCols}
            defaultColDef={{ sortable: true, resizable: true, filter: true, flex: 0 }}
          />
        </div>
      </Panel>
    </div>
  );
}
