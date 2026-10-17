import type {HypothesisRun, HypothesisStats} from "./hypothesis-types";
import {humanName} from "./guided-research";

export type EvidenceState = "significant" | "not-significant" | "insufficient";
export type EvidenceStudy = {
  id: string; title: string; theme: string; asset: string; horizon: number; mode: string;
  n: number; baselineN: number | null; effect: number | null; unit: string; p: number | null;
  adjustedP: number | null; family: string; evidence: string; state: EvidenceState;
  hit: number | null; updated: string; cutoff: string; agreement: number; checks: number;
};
export const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
export const numberText = (n: unknown, digits = 2) => finite(n) ? (Number(n.toFixed(digits))===0?0:n).toLocaleString("en-US", {minimumFractionDigits: digits, maximumFractionDigits: digits}) : "—";
export const pText = (n: unknown) => finite(n) ? n < .0001 ? "<0.0001" : n.toFixed(4) : "Not available";
export const stateText: Record<EvidenceState, string> = {significant: "Statistically significant", "not-significant": "Not statistically significant", insufficient: "Insufficient evidence"};
/** Presentation only: significance still comes from the unchanged stored-test rules. */
export function evidenceTone(state: EvidenceState, effect: number | null) {
  if (state === "insufficient") return "insufficient";
  if (state !== "significant" || !finite(effect) || effect === 0) return "neutral";
  return effect < 0 ? "negative" : "positive";
}
export function evidenceState(stats: HypothesisStats, adjustedP: number | null, family: string, minimum = 10): EvidenceState {
  const n = stats.event?.n ?? stats.n ?? 0;
  const p = family ? adjustedP : stats.p;
  if (stats.status !== "COMPLETE" || n < minimum || (stats.control && stats.control.n < minimum) || !finite(p)) return "insufficient";
  return p <= .05 ? "significant" : "not-significant";
}
export function studySummary(run: HypothesisRun): EvidenceStudy {
  const s = run.result?.summary, p = run.parameters;
  const empty: HypothesisStats = {status: "INSUFFICIENT SAMPLE", evidence: "INSUFFICIENT SAMPLE", p: null, ci: null, difference: null, effect: null};
  const sources = [...new Set(p.conditions.map(c => c.source))];
  const events = run.result?.distribution?.event?.filter(finite) ?? [];
  return {id: run.id, title: run.name, theme: sources.length > 1 ? "Multi-factor" : humanName(sources[0]), asset: p.asset, horizon: p.horizon, mode: p.mode,
    n: s?.event?.n ?? s?.n ?? 0, baselineN: s?.baseline?.n ?? null, effect: s?.difference ?? null,
    unit: p.mode === "conditional" ? "pp" : p.method === "Regression" ? "pp / input unit" : "r",
    p: s?.p ?? null, adjustedP: run.adjusted_p, family: p.family,
    evidence: s?.evidence ?? "INSUFFICIENT SAMPLE", state: evidenceState(s ?? empty, run.adjusted_p, p.family, run.result?.diagnostics?.minimum_sample ?? 10),
    hit: events.length ? events.filter(v => v > 0).length / events.length * 100 : null,
    updated: run.completed_at ?? run.started_at, cutoff: String(run.metadata.research_date ?? "Unavailable"),
    agreement: run.result?.agreement?.agree ?? 0, checks: run.result?.agreement?.available ?? 0};
}
export type EvidenceFilters = {query: string; theme: string; asset: string; horizon: string; state: string; minimum: string};
export function filterStudies(rows: EvidenceStudy[], f: EvidenceFilters, sort = "adjustedP", ascending = true) {
  const valid = rows.filter(r => `${r.title} ${r.theme} ${r.asset}`.toLowerCase().includes(f.query.trim().toLowerCase()) && (!f.theme || r.theme === f.theme) && (!f.asset || r.asset === f.asset) && (!f.horizon || r.horizon === Number(f.horizon)) && (!f.state || r.state === f.state) && (!f.minimum || r.n >= Number(f.minimum)));
  return valid.sort((a, b) => {
    const av = a[sort as keyof EvidenceStudy], bv = b[sort as keyof EvidenceStudy];
    if (av == null || bv == null) { if (av != null) return -1; if (bv != null) return 1; }
    else { const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv)); if (order) return order * (ascending ? 1 : -1); }
    return b.n - a.n || (b.checks ? b.agreement / b.checks : -1) - (a.checks ? a.agreement / a.checks : -1) || a.id.localeCompare(b.id);
  });
}
