import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { clsx } from "clsx";

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps<T> extends AgGridReactProps<T> {
  className?: string;
}

export default function DataGrid<T>({ className, ...props }: DataGridProps<T>) {
  return (
    <div className={clsx("ag-theme-custom w-full h-full", className)}>
      <AgGridReact<T>
        animateRows
        suppressCellFocus
        rowSelection="single"
        {...props}
      />
    </div>
  );
}
