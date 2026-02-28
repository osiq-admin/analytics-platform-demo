import { useEffect, useState, useMemo } from "react";
import Panel from "../../components/Panel.tsx";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { TOOLTIP_STYLE, TICK_STYLE } from "../../constants/chartStyles.ts";
import { formatLabel } from "../../utils/format.ts";

interface DimensionScore {
  dimension_id: string;
  score: number;
  rules_evaluated: number;
  rules_passed: number;
  violation_count: number;
  total_count: number;
  status: "good" | "warning" | "critical";
}

interface EntityScore {
  entity: string;
  tier: string;
  overall_score: number;
  dimension_scores: DimensionScore[];
  contract_id: string;
}

interface QuarantineRec {
  record_id: string;
  source_tier: string;
  target_tier: string;
  entity: string;
  failed_rules: { rule: string; field?: string; error?: string }[];
  original_data: Record<string, unknown>;
  timestamp: string;
  retry_count: number;
  status: string;
  notes: string;
}

interface QuarantineSummary {
  total_records: number;
  by_entity: Record<string, number>;
  by_tier_transition: Record<string, number>;
  by_rule_type: Record<string, number>;
  by_status: Record<string, number>;
}

interface QualityDimension {
  id: string;
  name: string;
  iso_ref: string;
  weight: number;
}

interface FieldProfile {
  field_name: string;
  total_count: number;
  null_count: number;
  null_pct: number;
  distinct_count: number;
  min_value: string;
  max_value: string;
}

interface EntityProfileData {
  entity: string;
  tier: string;
  table_name: string;
  row_count: number;
  field_profiles: FieldProfile[];
}

const STATUS_COLORS: Record<string, string> = {
  good: "text-green-500",
  warning: "text-amber-500",
  critical: "text-red-500",
};

const SCORE_BG: Record<string, string> = {
  good: "bg-green-500/10 border-green-500/30",
  warning: "bg-amber-500/10 border-amber-500/30",
  critical: "bg-red-500/10 border-red-500/30",
};

function scoreStatus(score: number): string {
  if (score >= 99) return "good";
  if (score >= 95) return "warning";
  return "critical";
}

const ENTITIES = ["execution", "order", "product", "md_eod", "md_intraday", "venue", "account", "trader"];
const TIERS = ["bronze", "silver", "gold"];

export default function DataQuality() {
  const [dimensions, setDimensions] = useState<QualityDimension[]>([]);
  const [scores, setScores] = useState<EntityScore[]>([]);
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRec[]>([]);
  const [quarantineSummary, setQuarantineSummary] = useState<QuarantineSummary | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Profiling state
  const [profileEntity, setProfileEntity] = useState<string>("execution");
  const [profileTier, setProfileTier] = useState<string>("bronze");
  const [profile, setProfile] = useState<EntityProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/quality/dimensions").then((r) => r.json()),
      fetch("/api/quality/scores").then((r) => r.json()),
      fetch("/api/quality/quarantine").then((r) => r.json()),
      fetch("/api/quality/quarantine/summary").then((r) => r.json()),
    ])
      .then(([dims, sc, qr, qs]) => {
        setDimensions(dims);
        setScores(sc);
        setQuarantineRecords(qr);
        setQuarantineSummary(qs);
      })
      .finally(() => setLoading(false));
  }, []);

  // Profiling fetch
  useEffect(() => {
    setProfileLoading(true);
    fetch(`/api/quality/profile/${profileEntity}?tier=${profileTier}`)
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [profileEntity, profileTier]);

  const selectedScore = useMemo(
    () => scores.find((s) => s.contract_id === selectedEntity) || scores[0],
    [scores, selectedEntity],
  );

  const radarData = useMemo(() => {
    if (!selectedScore) return [];
    return selectedScore.dimension_scores.map((ds) => ({
      dimension: formatLabel(ds.dimension_id),
      score: ds.score,
      fullMark: 100,
    }));
  }, [selectedScore]);

  const handleRetry = async (recordId: string) => {
    const resp = await fetch(`/api/quality/quarantine/${recordId}/retry`, { method: "POST" });
    if (resp.ok) {
      const updated = await resp.json();
      setQuarantineRecords((prev) =>
        prev.map((r) => (r.record_id === recordId ? updated : r)),
      );
    }
  };

  const handleOverride = async (recordId: string) => {
    const notes = "Manually overridden via Data Quality dashboard";
    const resp = await fetch(`/api/quality/quarantine/${recordId}/override?notes=${encodeURIComponent(notes)}`, { method: "POST" });
    if (resp.ok) {
      const updated = await resp.json();
      setQuarantineRecords((prev) =>
        prev.map((r) => (r.record_id === recordId ? updated : r)),
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Loading quality data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto p-4" data-tour="quality-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Data Quality</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>ISO/IEC 25012 + ISO 8000</span>
          <span>{dimensions.length} dimensions</span>
          <span>{scores.length} contracts scored</span>
        </div>
      </div>

      {/* Quality Scorecards */}
      <Panel title="Quality Scores by Contract" dataTour="quality-scores" dataTrace="quality.entity-scores">
        {scores.length === 0 ? (
          <p className="text-sm text-muted p-2">No quality scores available. Run pipeline stages to generate scores.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
            {scores.map((s) => {
              const status = scoreStatus(s.overall_score);
              return (
                <button
                  key={s.contract_id}
                  data-action={`select-score-${s.contract_id}`}
                  className={`border rounded-lg p-3 text-left transition-colors cursor-pointer ${SCORE_BG[status]} ${selectedEntity === s.contract_id ? "ring-2 ring-blue-400" : ""}`}
                  onClick={() => setSelectedEntity(s.contract_id)}
                >
                  <div className="text-xs text-muted">{s.entity} ({s.tier})</div>
                  <div className={`text-2xl font-bold ${STATUS_COLORS[status]}`}>
                    {s.overall_score}%
                  </div>
                  <div className="text-xs text-muted">{s.contract_id}</div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Spider Chart */}
      {selectedScore && radarData.length > 0 && (
        <Panel title={`Quality Dimensions \u2014 ${selectedScore.entity} (${selectedScore.tier})`} dataTour="quality-spider" dataTrace="quality.spider-chart">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="dimension" tick={TICK_STYLE} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={TICK_STYLE} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="var(--color-blue-500)"
                  fill="var(--color-blue-500)"
                  fillOpacity={0.3}
                  isAnimationActive={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Dimension breakdown table */}
          <table className="w-full text-xs mt-4">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-1">Dimension</th>
                <th className="text-left p-1">ISO Ref</th>
                <th className="text-right p-1">Score</th>
                <th className="text-right p-1">Rules</th>
                <th className="text-right p-1">Violations</th>
                <th className="text-left p-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedScore.dimension_scores.map((ds) => {
                const dim = dimensions.find((d) => d.id === ds.dimension_id);
                return (
                  <tr key={ds.dimension_id} className="border-b border-border/50">
                    <td className="p-1 font-medium">{formatLabel(ds.dimension_id)}</td>
                    <td className="p-1 text-muted">{dim?.iso_ref || ""}</td>
                    <td className={`p-1 text-right font-mono ${STATUS_COLORS[ds.status]}`}>{ds.score}%</td>
                    <td className="p-1 text-right">{ds.rules_passed}/{ds.rules_evaluated}</td>
                    <td className="p-1 text-right">{ds.violation_count}</td>
                    <td className="p-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${ds.status === "good" ? "bg-green-500/20 text-green-400" : ds.status === "warning" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                        {ds.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Quarantine Queue */}
      <Panel title={`Quarantine Queue (${quarantineSummary?.total_records || 0})`} dataTour="quality-quarantine" dataTrace="quality.quarantine-queue">
        {quarantineRecords.length === 0 ? (
          <p className="text-sm text-muted p-2">No quarantined records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">ID</th>
                  <th className="text-left p-1">Entity</th>
                  <th className="text-left p-1">Transition</th>
                  <th className="text-left p-1">Failed Rules</th>
                  <th className="text-right p-1">Retries</th>
                  <th className="text-left p-1">Status</th>
                  <th className="text-left p-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantineRecords.map((r) => (
                  <tr key={r.record_id} className="border-b border-border/50">
                    <td className="p-1 font-mono">{r.record_id}</td>
                    <td className="p-1">{r.entity}</td>
                    <td className="p-1">{r.source_tier} &rarr; {r.target_tier}</td>
                    <td className="p-1">{r.failed_rules.map((f) => f.rule).join(", ")}</td>
                    <td className="p-1 text-right">{r.retry_count}</td>
                    <td className="p-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${r.status === "pending" ? "bg-amber-500/20 text-amber-400" : r.status === "overridden" ? "bg-blue-500/20 text-blue-400" : "bg-muted/30 text-muted"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-1 flex gap-1">
                      {r.status === "pending" && (
                        <>
                          <button
                            data-action={`retry-${r.record_id}`}
                            className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            onClick={() => handleRetry(r.record_id)}
                          >
                            Retry
                          </button>
                          <button
                            data-action={`override-${r.record_id}`}
                            className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            onClick={() => handleOverride(r.record_id)}
                          >
                            Override
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {quarantineSummary && quarantineSummary.total_records > 0 && (
          <div className="flex gap-4 mt-3 text-xs text-muted p-2 border-t border-border">
            <div>By entity: {Object.entries(quarantineSummary.by_entity).map(([k, v]) => `${k}(${v})`).join(", ")}</div>
            <div>By rule: {Object.entries(quarantineSummary.by_rule_type).map(([k, v]) => `${k}(${v})`).join(", ")}</div>
          </div>
        )}
      </Panel>

      {/* Data Profiling */}
      <Panel title="Data Profiling" dataTour="quality-profiling" dataTrace="quality.data-profiling">
        <div className="flex items-center gap-3 p-2 border-b border-border">
          <label className="text-xs text-muted">Entity:</label>
          <select
            data-action="profile-entity-select"
            value={profileEntity}
            onChange={(e) => setProfileEntity(e.target.value)}
            className="text-xs rounded border border-border bg-background px-2 py-1"
          >
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{formatLabel(e)}</option>
            ))}
          </select>
          <label className="text-xs text-muted">Tier:</label>
          <select
            data-action="profile-tier-select"
            value={profileTier}
            onChange={(e) => setProfileTier(e.target.value)}
            className="text-xs rounded border border-border bg-background px-2 py-1"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>{formatLabel(t)}</option>
            ))}
          </select>
          {profile && (
            <span className="text-xs text-muted ml-auto">
              {profile.row_count.toLocaleString()} rows | {profile.field_profiles.length} fields
            </span>
          )}
        </div>
        {profileLoading ? (
          <p className="text-sm text-muted p-2">Loading profile...</p>
        ) : profile && profile.field_profiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">Field</th>
                  <th className="text-right p-1">Total</th>
                  <th className="text-right p-1">Nulls</th>
                  <th className="text-right p-1">Null %</th>
                  <th className="text-right p-1">Distinct</th>
                  <th className="text-left p-1">Min</th>
                  <th className="text-left p-1">Max</th>
                </tr>
              </thead>
              <tbody>
                {profile.field_profiles.map((fp) => (
                  <tr key={fp.field_name} className="border-b border-border/50">
                    <td className="p-1 font-mono">{fp.field_name}</td>
                    <td className="p-1 text-right">{fp.total_count.toLocaleString()}</td>
                    <td className="p-1 text-right">{fp.null_count}</td>
                    <td className={`p-1 text-right ${fp.null_pct > 5 ? "text-amber-500" : fp.null_pct > 0 ? "text-yellow-500" : ""}`}>
                      {fp.null_pct}%
                    </td>
                    <td className="p-1 text-right">{fp.distinct_count}</td>
                    <td className="p-1 text-muted truncate max-w-[120px]">{fp.min_value}</td>
                    <td className="p-1 text-muted truncate max-w-[120px]">{fp.max_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted p-2">No profiling data available. Load data first.</p>
        )}
      </Panel>
    </div>
  );
}
