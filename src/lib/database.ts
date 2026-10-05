import { neon } from "@neondatabase/serverless";

export type CatalogueRow = {
  id: string;
  externalId: string;
  name: string;
  shortName: string;
  category: string;
  frequency: string;
  unit: string;
  provider: string;
  start: string;
  end: string;
  observations: number;
  updated: string;
};

export function isDatabaseMode() {
  return process.env.KANZQUANT_DATA_MODE === "database";
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required in database mode");
  return neon(url);
}

export async function getDatabaseStatus() {
  if (!isDatabaseMode()) return { status: "healthy", mode: "demo" as const, series: 0, researchRuns: 0 };
  const sql = getSql();
  const [counts] = await sql`SELECT
    (SELECT count(*)::int FROM series) AS series,
    (SELECT count(*)::int FROM research_runs) AS research_runs`;
  return {
    status: "healthy",
    mode: "database" as const,
    series: Number(counts.series),
    researchRuns: Number(counts.research_runs),
  };
}

export async function getSeriesCatalogue(): Promise<CatalogueRow[]> {
  if (!isDatabaseMode()) return [];
  const sql = getSql();
  const rows = await sql`SELECT
    s.id::text,
    s.external_id,
    s.name,
    s.short_name,
    s.category,
    s.frequency,
    COALESCE(s.unit, '') AS unit,
    s.provider,
    min(o.observed_at)::text AS start_date,
    max(o.observed_at)::text AS end_date,
    count(o.observed_at)::int AS observation_count,
    s.updated_at::text AS updated_at
  FROM series s
  LEFT JOIN observations o ON o.series_id = s.id
  GROUP BY s.id
  ORDER BY s.category, s.short_name`;
  return rows.map((row) => ({
    id: String(row.id),
    externalId: String(row.external_id),
    name: String(row.name),
    shortName: String(row.short_name),
    category: String(row.category),
    frequency: String(row.frequency),
    unit: String(row.unit),
    provider: String(row.provider),
    start: row.start_date ? String(row.start_date).slice(0, 10) : "—",
    end: row.end_date ? String(row.end_date).slice(0, 10) : "—",
    observations: Number(row.observation_count),
    updated: String(row.updated_at).slice(0, 16).replace("T", " ") + "Z",
  }));
}

export type SeriesDetail = CatalogueRow & {
  latest: number; change1m: number; change3m: number; change12m: number;
  zscore: number; percentile: number; trend: "Rising" | "Falling" | "Stable";
  data: { date: string; value: number }[];
};

export async function getSeriesDetail(externalId?: string): Promise<SeriesDetail> {
  if (!isDatabaseMode()) {
    const { getSeries } = await import("./data");
    return getSeries(externalId);
  }
  const sql = getSql();
  const rows = await sql`SELECT s.id::text,s.external_id,s.name,s.short_name,s.category,s.frequency,
      COALESCE(s.unit,'') AS unit,s.provider,s.updated_at::text,o.observed_at::text,o.value
    FROM series s JOIN observations o ON o.series_id=s.id
    WHERE s.external_id=COALESCE(${externalId ?? null},'CPIAUCSL') ORDER BY o.observed_at`;
  if (!rows.length) throw new Error(`No database observations for ${externalId ?? "CPIAUCSL"}`);
  const values = rows.map((row) => Number(row.value));
  const points = rows.map((row) => ({ date: String(row.observed_at).slice(0, 10), value: Number(row.value) }));
  const latest = values.at(-1)!;
  const change = (periods: number) => values.length > periods ? (latest / values.at(-periods - 1)! - 1) * 100 : 0;
  const window = values.slice(0, -1);
  const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
  const deviation = Math.sqrt(window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / window.length) || 1;
  const zscore = (latest - mean) / deviation;
  const percentile = Math.round(values.filter((value) => value <= latest).length / values.length * 100);
  const first = rows[0];
  return {
    id: String(first.id), externalId: String(first.external_id), name: String(first.name), shortName: String(first.short_name),
    category: String(first.category), frequency: String(first.frequency), unit: String(first.unit), provider: String(first.provider),
    start: points[0].date, end: points.at(-1)!.date, observations: points.length,
    updated: String(first.updated_at).slice(0, 16).replace("T", " ") + "Z", latest,
    change1m: change(1), change3m: change(3), change12m: change(12), zscore, percentile,
    trend: change(3) > .05 ? "Rising" : change(3) < -.05 ? "Falling" : "Stable", data: points,
  };
}
