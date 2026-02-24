import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type SizeColumnsToFitGridStrategy } from "ag-grid-community";
import { clsx } from "clsx";

ModuleRegistry.registerModules([AllCommunityModule]);

const defaultColDef = {
  resizable: true,
  sortable: true,
  tooltipValueGetter: (p: { value?: unknown }) =>
    p.value != null ? String(p.value) : "",
  minWidth: 60,
};

const autoSizeStrategy: SizeColumnsToFitGridStrategy = {
  type: "fitGridWidth" as const,
  defaultMinWidth: 80,
};

interface DataGridProps<T> extends AgGridReactProps<T> {
  className?: string;
}

export default function DataGrid<T>({ className, ...props }: DataGridProps<T>) {
  return (
    <div className={clsx("ag-theme-custom w-full h-full", className)}>
      <AgGridReact<T>
        animateRows
        suppressCellFocus
        defaultColDef={defaultColDef}
        autoSizeStrategy={autoSizeStrategy}
        tooltipShowDelay={300}
        tooltipInteraction
        {...props}
      />
    </div>
  );
}
