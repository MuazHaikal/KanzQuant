import type { Point, ResearchSnapshot } from "./research-data";
import { axis, factors, factorComponents, factorHistory, type Factor } from "./focus-math";

export function chartContext(data: ResearchSnapshot) {
  const regimes=new Map(data.regime_history.map(r=>[r.date,r.label]));
  return (data.state_vectors??[]).map(v=>({date:v.date,regime:regimes.get(v.date)??"N/A",factors:Object.fromEntries(factors.map(f=>[f,axis(v.values,f)]))}));
}

export const MIN_MOVE_HISTORY = 36;
export const moveHorizons = [1, 3, 12] as const;
export type MoveClass = "Typical" | "Notable" | "Unusual" | "Extreme" | "N/A";
const month = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));

/** Average-rank percentile matches pandas rank(pct=True), including tied levels. */
export function levelPercentile(values: number[], current: number): number | null {
  const clean = values.filter(Number.isFinite);
  if (!clean.length || !Number.isFinite(current)) return null;
  const below = clean.filter(v => v < current).length;
  const equal = clean.filter(v => v === current).length;
  return Math.min(100, (below + (equal + 1) / 2) / clean.length * 100);
}

/** Mid-CDF against prior observations: tied zero moves are ordinary, not extreme. */
export function historicalPercentile(values: number[], current: number): number | null {
  const clean = values.filter(Number.isFinite);
  if (clean.length < MIN_MOVE_HISTORY || !Number.isFinite(current)) return null;
  return (clean.filter(v => v < current).length + clean.filter(v => v === current).length / 2) / clean.length * 100;
}

export function changeSeries(history: Point[], horizon: number): Point[] {
  if (!Number.isInteger(horizon) || horizon < 1) return [];
  const byMonth = new Map(history.filter(p => Number.isFinite(p.value)).map(p => [month(p.date), p.value]));
  return history.flatMap(p => {
    const previous = byMonth.get(month(p.date) - horizon);
    return previous === undefined || !Number.isFinite(p.value) ? [] : [{date: p.date, value: p.value - previous}];
  });
}

export function moveClassification(percentile: number | null): MoveClass {
  return percentile === null ? "N/A" : percentile >= 99 ? "Extreme" : percentile >= 90 ? "Unusual" : percentile >= 75 ? "Notable" : "Typical";
}

export function movement(history: Point[], horizon: number, asOf: string) {
  const changes = changeSeries(history, horizon);
  const current = changes.find(p => p.date === asOf)?.value ?? null;
  const prior = changes.filter(p => p.date < asOf).map(p => p.value);
  const percentile = current === null ? null : historicalPercentile(prior.map(Math.abs), Math.abs(current));
  return {horizon, change: current, percentile, directionalPercentile: current === null ? null : historicalPercentile(prior, current), classification: moveClassification(percentile), n: prior.length};
}

export function levelState(percentile: number | null) {
  return percentile === null ? "N/A" : percentile <= 10 ? "Very low" : percentile >= 90 ? "Very high" : percentile <= 25 ? "Below usual" : percentile >= 75 ? "Above usual" : "In range";
}

export function trendContext(history: Point[], asOf: string) {
  const moves = changeSeries(history, 3), current = moves.find(p => p.date === asOf)?.value;
  const previous = moves.find(p => month(p.date) === month(asOf) - 3)?.value;
  if (current === undefined || previous === undefined) return {label: "N/A", reversal: false};
  if (Math.abs(current / 3) < .05) return {label: "Stable", reversal: false};
  if (current * previous < 0 && Math.abs(previous / 3) >= .05) return {label: current > 0 ? "Turned up" : "Turned down", reversal: true};
  const faster = Math.abs(current) > Math.abs(previous);
  return {label: `${current > 0 ? "Rising" : "Falling"} ${faster ? "faster" : "slower"}`, reversal: false};
}

export function componentContributions(data: ResearchSnapshot, factor: Factor, horizon = 3) {
  const definition = factorComponents(factor);
  return [...definition.positive, ...definition.negative].map(key => {
    const coefficient = definition.negative.includes(key) ? -1 / definition.negative.length : 1 / definition.positive.length;
    const history = (data.state_vectors ?? []).flatMap(v => Number.isFinite(v.values[key]) ? [{date: v.date, value: v.values[key]}] : []);
    const move = movement(history, horizon, data.as_of);
    return {key, coefficient, history, move, contribution: move.change === null ? null : move.change * coefficient};
  });
}

export function factorContext(data: ResearchSnapshot, factor: Factor) {
  const history = factorHistory(data, factor), current = history.find(p => p.date === data.as_of)?.value ?? null;
  const percentile = current === null ? null : levelPercentile(history.map(p => p.value), current);
  const moves = moveHorizons.map(h => movement(history, h, data.as_of));
  const trend = trendContext(history, data.as_of), drivers = componentContributions(data, factor);
  const levelTail = percentile !== null && (percentile <= 10 || percentile >= 90);
  const unusualMove = moves.some(m => m.percentile !== null && m.percentile >= 90);
  const notableReversal = trend.reversal && (moves[1].percentile ?? 0) >= 75;
  const notableDriver = drivers.some(d => (d.move.percentile ?? 0) >= 90 && Math.abs(d.contribution ?? 0) >= .05);
  const attention = levelTail || unusualMove || notableReversal || notableDriver;
  const priority = (unusualMove ? 4 : 0) + (levelTail ? 3 : 0) + (notableReversal ? 2 : 0) + (notableDriver ? 1 : 0);
  return {factor, history, current, percentile, state: levelState(percentile), moves, trend, drivers, attention, priority};
}

export const featureNames: Record<string,string> = {
  payrolls_yoy: "Payrolls YoY", industrial_production_yoy: "Industrial output YoY", retail_sales_yoy: "Retail sales YoY", real_gdp_yoy: "Real GDP YoY", spx_momentum_6m: "SPX momentum · 6M", unemployment_level: "Unemployment", claims_yoy: "Initial claims YoY", cpi_yoy: "CPI YoY", core_cpi_yoy: "Core CPI YoY", pce_yoy: "PCE YoY", fed_funds_level: "Fed funds", us2y_level: "Treasury · 2Y", us10y_level: "Treasury · 10Y", curve_10y2y: "10Y–2Y curve", baa_10y_spread: "BAA–10Y spread", m2_yoy: "M2 YoY", fed_assets_yoy: "Fed assets YoY", vix_level: "VIX", spx_volatility_6m: "SPX volatility · 6M"
};
