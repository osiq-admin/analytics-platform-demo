import { useMemo } from "react";

interface ValidationPanelProps {
  name: string;
  description: string;
  selectedCalcs: Array<{
    calc_id: string;
    strictness: string;
    threshold_setting?: string;
    score_steps_setting?: string;
    value_field?: string;
  }>;
  scoreThresholdSetting: string;
  query: string;
  contextFields: string[];
  granularity: string[];
}

interface Check {
  label: string;
  passed: boolean;
  level: "required" | "recommended" | "info";
}

export default function ValidationPanel({
  name,
  description,
  selectedCalcs,
  scoreThresholdSetting,
  query,
  contextFields,
  granularity,
}: ValidationPanelProps) {
  const checks = useMemo<Check[]>(() => {
    const result: Check[] = [];

    // Required checks
    result.push({
      label: "Name provided",
      passed: name.trim().length > 0,
      level: "required",
    });

    result.push({
      label: "At least 1 calculation selected",
      passed: selectedCalcs.length > 0,
      level: "required",
    });

    result.push({
      label: "Score threshold configured",
      passed: scoreThresholdSetting.trim().length > 0,
      level: "required",
    });

    result.push({
      label: "Query provided",
      passed: query.trim().length > 0,
      level: "required",
    });

    // Recommended checks
    result.push({
      label: "Description provided",
      passed: description.trim().length > 0,
      level: "recommended",
    });

    const hasMustPass = selectedCalcs.some((c) => c.strictness === "MUST_PASS");
    result.push({
      label: "At least 1 MUST_PASS calculation",
      passed: hasMustPass,
      level: "recommended",
    });

    const allHaveScoreSteps = selectedCalcs.length > 0 && selectedCalcs.every((c) => c.score_steps_setting);
    result.push({
      label: "Each calc has score_steps_setting",
      passed: allHaveScoreSteps,
      level: "recommended",
    });

    result.push({
      label: "Context fields defined",
      passed: contextFields.length > 0,
      level: "recommended",
    });

    result.push({
      label: "Granularity defined",
      passed: granularity.length > 0,
      level: "recommended",
    });

    // Info / best-practice suggestions
    if (selectedCalcs.length > 3) {
      result.push({
        label: "Consider adding regulatory coverage tags",
        passed: false,
        level: "info",
      });
    }

    if (!hasMustPass && selectedCalcs.length > 0) {
      result.push({
        label: "Consider adding at least one MUST_PASS gate calculation",
        passed: false,
        level: "info",
      });
    }

    const isDefaultGranularity =
      granularity.length === 2 &&
      granularity.includes("product_id") &&
      granularity.includes("account_id");
    if (isDefaultGranularity) {
      result.push({
        label: "Consider expanding granularity beyond default",
        passed: false,
        level: "info",
      });
    }

    return result;
  }, [name, description, selectedCalcs, scoreThresholdSetting, query, contextFields, granularity]);

  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.passed).length;
  const pct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  const icon = (check: Check) => {
    if (check.passed) return <span className="text-success">&#10003;</span>;
    if (check.level === "required") return <span className="text-destructive">&#10007;</span>;
    if (check.level === "recommended") return <span className="text-warning">&#9888;</span>;
    return <span className="text-info">&#9432;</span>;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Completeness</span>
          <span className="text-muted">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Check list */}
      <div className="flex flex-col gap-1.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 w-4 text-center leading-4">{icon(check)}</span>
            <span className={check.passed ? "text-muted" : "text-foreground"}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
