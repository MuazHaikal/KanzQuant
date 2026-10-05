import { neon } from "@neondatabase/serverless";

export type Point = { date: string; value: number };
export type FeatureDefinition = { key: string; source: string; transform: string; group: string; description: string };
export type StateRow = { label: string; z: number; change: number; percentile: number; trend: string };
export type Analogue = {
  rank: number; date: string; similarity: number; regime: string;
  state: Record<string, number>; returns: Record<string, Record<string, number | null>>;
};
export type RegimeHistory = { date: string; regime_id: number; label: string; confidence: number };
export type RegimeStat = { name: string; regime_id: number; months: number; mean: number | null; hit_rate: number | null; volatility: number | null };
export type ResearchSnapshot = {
  as_of: string; updated_at: string; current_regime: string; confidence: number; regime_duration_months: number;
  features: FeatureDefinition[]; current_state: Record<string, number>; state_rows: StateRow[];
  neighbours: Analogue[]; forward_summary: Record<string, Record<string, Record<string, number | null>>>;
  regime_history: RegimeHistory[]; regime_stats: RegimeStat[];
  transition_matrix: Record<string, Record<string, number>>; market_series: Record<string, Point[]>;
  methodology: Record<string, unknown>;
};

export type ResearchRun = {
  id: string; name: string; module: string; parameters: Record<string, unknown>;
  status: string; startedAt: string; completedAt: string | null; metadata: Record<string, unknown>;
};

export function isDatabaseMode() {
  return process.env.KANZQUANT_DATA_MODE === "database";
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required in database mode");
  return neon(url);
}

function assertDatabaseSnapshot(value: unknown): ResearchSnapshot {
  const snapshot = value as ResearchSnapshot;
  if (!snapshot || snapshot.methodology?.data_mode !== "database") {
    throw new Error("Latest research snapshot is missing or is not database-backed. Run npm run research.");
  }
  return snapshot;
}

export async function getResearchSnapshot(): Promise<ResearchSnapshot> {
  if (!isDatabaseMode()) return getDemoSnapshot();
  const sql = getSql();
  const rows = await sql`SELECT rr.payload
    FROM research_results rr JOIN research_runs r ON r.id=rr.run_id
    WHERE r.status='complete' AND r.module='macro.research'
      AND rr.result_type='snapshot' AND rr.result_key='latest'
    ORDER BY r.completed_at DESC LIMIT 1`;
  if (!rows.length) throw new Error("No completed database research snapshot. Run npm run research.");
  return assertDatabaseSnapshot(rows[0].payload);
}

export async function getResearchRuns(): Promise<ResearchRun[]> {
  if (!isDatabaseMode()) return [];
  const sql = getSql();
  const rows = await sql`SELECT id::text,name,module,parameters,status,started_at::text,completed_at::text,metadata
    FROM research_runs ORDER BY started_at DESC LIMIT 25`;
  return rows.map((row) => ({
    id: String(row.id), name: String(row.name), module: String(row.module),
    parameters: row.parameters as Record<string, unknown>, status: String(row.status),
    startedAt: String(row.started_at), completedAt: row.completed_at ? String(row.completed_at) : null,
    metadata: row.metadata as Record<string, unknown>,
  }));
}

async function getDemoSnapshot(): Promise<ResearchSnapshot> {
  const { analogues, forwardSummary, regimeTimeline, regimes, stateRows, getSeries } = await import("./data");
  const asOf = "2024-12-31";
  return {
    as_of: asOf, updated_at: "2025-01-03T14:22:00Z", current_regime: "Expansion", confidence: .72,
    regime_duration_months: 11, features: [], current_state: {},
    state_rows: stateRows.map((row) => ({ label: row.label, z: row.z, change: Number(row.change.replace("−", "-")), percentile: row.percentile, trend: row.trend })),
    neighbours: analogues.map((row) => ({ rank: row.rank, date: `${row.date}-28`, similarity: row.similarity / 100, regime: row.regime, state: { growth: row.growth, inflation: row.inflation, rates: row.rates, credit: row.credit }, returns: { SPX: Object.fromEntries(["1m", "3m", "6m", "12m"].map((key, index) => [key, row.returns[index]])) } })),
    forward_summary: { SPX: Object.fromEntries(forwardSummary.map((row) => [String(row[0]).toLowerCase().replace(" ", "_"), Object.fromEntries(["1m", "3m", "6m", "12m"].map((key, index) => [key, Number(row[index + 1])]))])) },
    regime_history: regimeTimeline.map((id, index) => ({ date: `2017-${String((index % 12) + 1).padStart(2, "0")}-28`, regime_id: id, label: regimes[id].name, confidence: .7 })),
    regime_stats: regimes.map((row, regime_id) => ({ name: row.name, regime_id, months: row.months, mean: row.avg, hit_rate: row.hit, volatility: row.volatility })),
    transition_matrix: {}, market_series: { SPX: getSeries("SP500").data }, methodology: { data_mode: "demo" },
  };
}

export function regimeColor(label: string) {
  return ({ Expansion: "#28d7c0", Disinflation: "#55bde5", Inflation: "#e2b66b", Stress: "#f27d7d" } as Record<string, string>)[label] ?? "#70838b";
}

export function regimeCode(label: string) {
  return ({ Expansion: "EX", Disinflation: "DI", Inflation: "IN", Stress: "ST" } as Record<string, string>)[label] ?? "—";
}
