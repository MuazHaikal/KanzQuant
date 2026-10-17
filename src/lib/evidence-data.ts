import "server-only";
import {cache} from "react";
import {hypothesisSql} from "./hypothesis-data";
import {bhAdjust, type HypothesisRun} from "./hypothesis-types";
import {studySummary} from "./evidence";

/** Read-only projection of the existing ledger; no schema or result mutation. */
export const getEvidenceStudies = cache(async () => {
  const sql = hypothesisSql();
  const [rows, families] = await Promise.all([
    sql`SELECT r.id::text,r.name,r.parameters,r.status,r.started_at::text,r.completed_at::text,r.metadata,
      jsonb_build_object('summary',rr.payload->'summary','agreement',rr.payload->'agreement','diagnostics',jsonb_build_object('minimum_sample',rr.payload->'diagnostics'->'minimum_sample'),'distribution',jsonb_build_object('event',rr.payload->'distribution'->'event')) payload
      FROM research_runs r JOIN research_results rr ON rr.run_id=r.id AND rr.result_type='hypothesis' AND rr.result_key='result'
      WHERE r.module='hypothesis.lab' AND r.status='complete' ORDER BY r.completed_at DESC LIMIT 1000`,
    sql`SELECT id::text,parameters->>'family' family,metadata->>'primary_p' p FROM research_runs WHERE module='hypothesis.lab' AND COALESCE(parameters->>'family','')<>'' ORDER BY started_at,id`,
  ]);
  const groups = new Map<string, typeof families>();
  for (const row of families) { const key = String(row.family); const group = groups.get(key) ?? []; group.push(row); groups.set(key, group); }
  const adjusted = new Map<string, number | null>();
  for (const group of groups.values()) { const q = bhAdjust(group.map(r => r.p === null ? null : Number(r.p))); group.forEach((r, i) => adjusted.set(String(r.id), q[i])); }
  return rows.map(row => studySummary({id: row.id, name: row.name, parameters: row.parameters, status: row.status, started_at: row.started_at, completed_at: row.completed_at, metadata: row.metadata, result: row.payload, adjusted_p: adjusted.get(row.id) ?? null, family_count: 1} as HypothesisRun));
});
