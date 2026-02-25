import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import type { SelectedCalc } from "./SelectCalcsStep.tsx";
import type { CalculationDef } from "../../../stores/metadataStore.ts";

interface QueryStepProps {
  query: string;
  setQuery: (q: string) => void;
  selectedCalcs: SelectedCalc[];
  calculations: CalculationDef[];
}

export default function QueryStep({
  query,
  setQuery,
  selectedCalcs,
  calculations,
}: QueryStepProps) {
  const calcMap = useMemo(
    () => new Map(calculations.map((c) => [c.calc_id, c])),
    [calculations],
  );

  /** Build a SQL query based on selected calculations. */
  const generateQuery = () => {
    if (selectedCalcs.length === 0) {
      setQuery("-- No calculations selected. Go back to Step 2 to add some.");
      return;
    }

    // Collect value fields and table names for each calc
    const tables: { alias: string; table: string; valueField: string }[] = [];
    for (const sc of selectedCalcs) {
      const calc = calcMap.get(sc.calc_id);
      const vf = sc.value_field || calc?.value_field || sc.calc_id;
      const tableName = `calc_${sc.calc_id}`;
      tables.push({ alias: `c${tables.length + 1}`, table: tableName, valueField: vf });
    }

    if (tables.length === 0) return;

    const joinKeys = ["product_id", "account_id"];
    const firstT = tables[0];

    // SELECT clause
    const selectParts = [
      `${firstT.alias}.product_id`,
      `${firstT.alias}.account_id`,
    ];
    for (const t of tables) {
      selectParts.push(`${t.alias}.${t.valueField}`);
    }

    let sql = `SELECT\n  ${selectParts.join(",\n  ")}\nFROM ${firstT.table} AS ${firstT.alias}`;

    // JOINs
    for (let i = 1; i < tables.length; i++) {
      const t = tables[i];
      const joinCond = joinKeys
        .map((k) => `${firstT.alias}.${k} = ${t.alias}.${k}`)
        .join(" AND ");
      sql += `\nJOIN ${t.table} AS ${t.alias}\n  ON ${joinCond}`;
    }

    setQuery(sql);
  };

  // Reference: list available tables/columns
  const referenceItems = useMemo(() => {
    return selectedCalcs.map((sc) => {
      const calc = calcMap.get(sc.calc_id);
      const vf = sc.value_field || calc?.value_field || sc.calc_id;
      return {
        table: `calc_${sc.calc_id}`,
        columns: ["product_id", "account_id", vf],
        description: calc?.description || "",
      };
    });
  }, [selectedCalcs, calcMap]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Step 4: Detection Query</h3>
        <button
          onClick={generateQuery}
          className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors"
        >
          Generate from selections
        </button>
      </div>

      <p className="text-xs text-muted">
        Write or generate the SQL query that identifies candidate rows for this detection model.
        The query runs against DuckDB calculation result tables.
      </p>

      {/* Monaco SQL Editor */}
      <div className="border border-border rounded overflow-hidden" style={{ height: 260 }}>
        <div className="monaco-themed h-full">
          <Editor
            language="sql"
            theme="vs-dark"
            value={query}
            onChange={(v) => setQuery(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* SQL Reference */}
      {referenceItems.length > 0 && (
        <div className="border border-border rounded bg-surface p-3">
          <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
            Available Tables / Columns
          </div>
          <div className="flex flex-col gap-2">
            {referenceItems.map((item) => (
              <div key={item.table} className="text-xs">
                <span className="font-mono text-accent">{item.table}</span>
                {item.description && (
                  <span className="text-muted ml-2">-- {item.description}</span>
                )}
                <div className="ml-4 text-muted font-mono text-[11px]">
                  {item.columns.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
