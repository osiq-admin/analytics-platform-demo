interface ExpectedResultsProps {
  expectedResults: Record<string, unknown>;
  setExpectedResults: (r: Record<string, unknown>) => void;
}

export default function ExpectedResults({
  expectedResults,
  setExpectedResults,
}: ExpectedResultsProps) {
  const shouldFire = expectedResults.should_fire as boolean ?? false;
  const expectedAlertCount = expectedResults.expected_alert_count as number ?? 0;
  const notes = expectedResults.notes as string ?? "";

  return (
    <div className="space-y-4">
      {/* Should alerts fire? */}
      <div>
        <label className="block text-xs font-medium text-foreground/80 mb-1.5">
          Should alerts fire?
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setExpectedResults({ ...expectedResults, should_fire: true })
            }
            className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
              shouldFire
                ? "border-success bg-success/15 text-success"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            Yes
          </button>
          <button
            onClick={() =>
              setExpectedResults({
                ...expectedResults,
                should_fire: false,
                expected_alert_count: 0,
              })
            }
            className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
              !shouldFire
                ? "border-warning bg-warning/15 text-warning"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Expected alert count */}
      {shouldFire && (
        <div>
          <label className="block text-xs font-medium text-foreground/80 mb-1.5">
            Expected alert count
          </label>
          <input
            type="number"
            min={0}
            value={expectedAlertCount}
            onChange={(e) =>
              setExpectedResults({
                ...expectedResults,
                expected_alert_count: parseInt(e.target.value, 10) || 0,
              })
            }
            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-accent"
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-foreground/80 mb-1.5">
          Notes / Explanation
        </label>
        <textarea
          value={notes}
          onChange={(e) =>
            setExpectedResults({ ...expectedResults, notes: e.target.value })
          }
          placeholder="Describe why this use case should or should not generate alerts..."
          rows={4}
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-accent resize-y"
        />
      </div>
    </div>
  );
}
