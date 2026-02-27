import { useEffect, useState } from "react";
import { api } from "../api/client.ts";
import type { ColDef } from "ag-grid-community";

interface GridColumnMeta {
  field: string;
  header_name: string;
  width?: number;
  flex?: number;
  min_width?: number;
  column_type?: string;
  filter_type?: string;
  sortable?: boolean;
  resizable?: boolean;
  cell_style?: Record<string, string>;
  value_format?: string;
  entity_link?: string;
}

interface GridConfigResponse {
  grid_id: string;
  view_id: string;
  columns: GridColumnMeta[];
}

function toColDef(meta: GridColumnMeta): ColDef {
  const col: ColDef = {
    field: meta.field,
    headerName: meta.header_name,
    sortable: meta.sortable ?? true,
    resizable: meta.resizable ?? true,
  };
  if (meta.width) col.width = meta.width;
  if (meta.flex) col.flex = meta.flex;
  if (meta.min_width) col.minWidth = meta.min_width;
  if (meta.column_type) col.type = meta.column_type;
  if (meta.filter_type) col.filter = meta.filter_type;
  if (meta.cell_style) col.cellStyle = meta.cell_style;
  return col;
}

export function useGridColumns(viewId: string, fallback: ColDef[]): ColDef[] {
  const [columns, setColumns] = useState<ColDef[]>(fallback);

  useEffect(() => {
    api
      .get<GridConfigResponse>(`/metadata/grids/${viewId}`)
      .then((config) => {
        if (config.columns.length > 0) {
          setColumns(config.columns.map(toColDef));
        }
      })
      .catch(() => {
        // Fallback to hardcoded columns on error
      });
  }, [viewId]);

  return columns;
}
