export const intervals = ["1D", "1W", "1M", "3M", "6M", "12M"] as const;
export const ranges = ["3M", "6M", "1Y", "3Y", "5Y", "10Y", "20Y", "MAX"] as const;
export const assets = ["SPX", "GLD", "IEF"] as const;
export type Interval = typeof intervals[number];
export type MarketRange = typeof ranges[number];
export type Asset = typeof assets[number];
export type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number | null };
export type Candle = Bar & { end: string; label: string; observations: number };
export type MarketWindow = { asset: Asset; bars: Bar[]; first: string; latest: string; from: string; to: string };
export type ComparePoint = { x: number; value: number; date: string; label: string };
const iso = (date: Date) => date.toISOString().slice(0, 10);
export function periodStart(date: string, interval: Interval): string {
  const d = new Date(date + "T00:00:00Z"), m = d.getUTCMonth();
  if (interval === "1D") return date;
  if (interval === "1W") { d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return iso(d); }
  const months = interval === "1M" ? 1 : interval === "3M" ? 3 : interval === "6M" ? 6 : 12;
  return iso(new Date(Date.UTC(d.getUTCFullYear(), Math.floor(m / months) * months, 1)));
}
export function periodLabel(date: string, interval: Interval): string {
  const d = new Date(date + "T00:00:00Z"), y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (interval === "12M") return String(y);
  if (interval === "6M") return `H${Math.floor(m / 6) + 1} ${y}`;
  if (interval === "3M") return `Q${Math.floor(m / 3) + 1} ${y}`;
  if (interval === "1W") return "Week of " + date;
  return d.toLocaleDateString("en-GB", { timeZone: "UTC", ...(interval === "1D" ? { day: "numeric" as const } : {}), month: "short", year: "numeric" });
}
export function validBar(b: Bar): boolean {
  return [b.open, b.high, b.low, b.close].every(v => Number.isFinite(v) && v > 0) && b.high >= Math.max(b.open, b.close) && b.low <= Math.min(b.open, b.close);
}
/** Calendar OHLC; invalid/incomplete rows stay absent, never filled from adjusted closes. */
export function aggregateBars(bars: Bar[], interval: Interval): Candle[] {
  const result: Candle[] = [];
  for (const b of bars) {
    if (!validBar(b)) continue;
    const date = periodStart(b.date, interval), last = result.at(-1);
    if (last?.date === date) {
      last.high = Math.max(last.high, b.high); last.low = Math.min(last.low, b.low); last.close = b.close; last.end = b.date; last.observations++;
      // Unknown volume must not be silently treated as zero.
      last.volume = last.volume === null || b.volume === null ? null : last.volume + b.volume;
    } else result.push({ ...b, date, end: b.date, label: periodLabel(date, interval), observations: 1 });
  }
  return result;
}
export function monthsBack(date: string, months: number): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return iso(d);
}
export function rangeMonths(range: MarketRange): number { return range === "MAX" ? 1200 : range.endsWith("Y") ? parseInt(range) * 12 : parseInt(range); }
export function findBar(bars: { date: string }[], date: string): number {
  let lo = 0, hi = bars.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (bars[mid].date <= date) lo = mid + 1; else hi = mid; }
  return lo - 1;
}
export type MarketDomain = [number, number];
export function clampMarketDomain(d: MarketDomain, min: number, max: number): MarketDomain {
  const width = Math.min(max - min, Math.max(.8, d[1] - d[0]));
  const lo = Math.max(min, Math.min(max - width, d[0])); return [lo, lo + width];
}
export function zoomMarketDomain(d: MarketDomain, fraction: number, factor: number, min: number, max: number): MarketDomain {
  const anchor = d[0] + fraction * (d[1] - d[0]), width = Math.max(.8, (d[1] - d[0]) * factor);
  return clampMarketDomain([anchor - width * fraction, anchor + width * (1 - fraction)], min, max);
}
/** Display-only comparison, raw price closes. Each anchor is last real trading close on/before its date.
 * Daily uses trading-session offsets; higher intervals use calendar-period offsets.
 * Current post-anchor points only exist when actually present in persisted data. */
export function comparisonPath(bars: Bar[], anchor: string, interval: Interval): ComparePoint[] {
  const index = findBar(bars, anchor); if (index < 0) return [];
  const base = bars[index].close, candles = aggregateBars(bars, interval), key = periodStart(anchor, interval);
  const anchorIndex = findBar(candles, key), a = new Date(key + "T00:00:00Z");
  const points = candles.map((b, i) => {
    const d = new Date(b.date + "T00:00:00Z"), months = (d.getUTCFullYear() - a.getUTCFullYear()) * 12 + d.getUTCMonth() - a.getUTCMonth();
    const x = interval === "1D" ? i - anchorIndex : interval === "1W" ? Math.round((d.getTime() - a.getTime()) / 604800000) : months / (interval === "1M" ? 1 : interval === "3M" ? 3 : interval === "6M" ? 6 : 12);
    return { x, value: b.close / base * 100, date: b.end, label: b.label };
  });
  // Show the actual anchor close, not the end-of-period close, at zero. Never use later data to set the base.
  if (anchorIndex >= 0) points[anchorIndex] = { x: 0, value: 100, date: bars[index].date, label: `Anchor ${anchor}` };
  return points;
}
