import { useState } from "react";
import Panel from "./Panel.tsx";

interface SQLViewerProps {
  sql: string;
  rowCount?: number;
  title?: string;
}

/** Basic SQL keyword highlighting — no external deps. */
function highlightSQL(sql: string): React.ReactNode[] {
  const KEYWORDS =
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|AS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|IS|NULL|BETWEEN|LIKE|EXISTS|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|WITH|CTE|OVER|PARTITION|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD)\b/gi;
  const STRINGS = /'[^']*'/g;
  const NUMBERS = /\b\d+(\.\d+)?\b/g;
  const COMMENTS = /--[^\n]*/g;

  // Tokenise the SQL into segments to avoid overlapping matches
  type Seg = { text: string; kind: "keyword" | "string" | "number" | "comment" | "plain" };
  const segments: Seg[] = [];
  let cursor = 0;

  const all: { idx: number; len: number; kind: Seg["kind"] }[] = [];

  for (const m of sql.matchAll(COMMENTS)) all.push({ idx: m.index!, len: m[0].length, kind: "comment" });
  for (const m of sql.matchAll(STRINGS)) all.push({ idx: m.index!, len: m[0].length, kind: "string" });
  for (const m of sql.matchAll(KEYWORDS)) all.push({ idx: m.index!, len: m[0].length, kind: "keyword" });
  for (const m of sql.matchAll(NUMBERS)) all.push({ idx: m.index!, len: m[0].length, kind: "number" });

  // Sort by index, longest first (greedy)
  all.sort((a, b) => a.idx - b.idx || b.len - a.len);

  for (const tok of all) {
    if (tok.idx < cursor) continue; // overlap
    if (tok.idx > cursor) segments.push({ text: sql.slice(cursor, tok.idx), kind: "plain" });
    segments.push({ text: sql.slice(tok.idx, tok.idx + tok.len), kind: tok.kind });
    cursor = tok.idx + tok.len;
  }
  if (cursor < sql.length) segments.push({ text: sql.slice(cursor), kind: "plain" });

  const colorMap: Record<Seg["kind"], string> = {
    keyword: "var(--color-accent)",
    string: "var(--color-success)",
    number: "var(--color-warning)",
    comment: "var(--color-muted)",
    plain: "var(--color-foreground)",
  };

  return segments.map((s, i) => (
    <span key={i} style={{ color: colorMap[s.kind] }}>
      {s.text}
    </span>
  ));
}

export default function SQLViewer({ sql, rowCount, title = "Executed SQL" }: SQLViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!sql) {
    return (
      <Panel title={title}>
        <p className="text-muted text-xs">No SQL available.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      actions={
        <button
          onClick={handleCopy}
          className="px-2 py-0.5 text-[10px] rounded border border-border text-muted hover:text-foreground transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      }
    >
      <div className="space-y-2">
        <pre className="text-[11px] font-mono bg-background border border-border rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
          {highlightSQL(sql)}
        </pre>
        {rowCount !== undefined && (
          <div className="text-[10px] text-muted">
            Rows returned: <span className="font-mono text-accent">{rowCount}</span>
          </div>
        )}
      </div>
    </Panel>
  );
}
