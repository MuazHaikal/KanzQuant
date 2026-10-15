import {ranges, type MarketRange} from "./market-math";

export const INDICATORS = ["sma20", "sma50", "bollinger", "volume", "sma200"] as const;
export type EquityIndicator = typeof INDICATORS[number];
export type EquityChartView = {version: 2; range: MarketRange; indicators: EquityIndicator[]};
export const DEFAULT_EQUITY_VIEW: EquityChartView = {version: 2, range: "3Y", indicators: ["sma20", "sma50", "bollinger", "volume"]};
export const INDICATOR_LABELS: Record<EquityIndicator, string> = {sma20: "SMA 20", sma50: "SMA 50", sma200: "SMA 200", bollinger: "Bollinger (20, 2)", volume: "Volume"};

export function parseEquityView(raw: string | null): EquityChartView | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || !ranges.includes(value.range)) return null;
    if (value.version === 2 && Array.isArray(value.indicators)) return {version: 2, range: value.range, indicators: INDICATORS.filter(id => value.indicators.includes(id))};
    // Preserve an existing user's explicit legacy SMA/volume configuration.
    if (Array.isArray(value.averages) && typeof value.volume === "boolean") return {version: 2, range: value.range, indicators: INDICATORS.filter(id => id === "volume" ? value.volume : id !== "bollinger" && value.averages.includes(Number(id.slice(3))))};
  } catch {}
  return null;
}

export function toggleEquityIndicator(view: EquityChartView, id: EquityIndicator): EquityChartView {
  return {...view, indicators: view.indicators.includes(id) ? view.indicators.filter(item => item !== id) : [...view.indicators, id]};
}

/** Population variance (ddof=0); no calendar filling or invented prices.
 * Invalid prices yield null at that row and do not enter the valid-session window.
 * A removable Welford accumulator avoids cancellation on large price levels.
 */
export function rollingPriceMoments(prices: readonly (number | null)[], period: number) {
  if (!Number.isInteger(period) || period < 1) throw new RangeError("Invalid indicator period");
  const window: number[] = [];
  let mean = 0, m2 = 0;
  return prices.map(price => {
    if (price === null || !Number.isFinite(price) || price <= 0) return null;
    if (window.length === period) {
      const removed = window.shift()!;
      if (!window.length) { mean = 0; m2 = 0; }
      else { const nextMean = mean + (mean - removed) / window.length; m2 -= (removed - mean) * (removed - nextMean); mean = nextMean; }
    }
    window.push(price);
    const delta = price - mean;
    mean += delta / window.length;
    m2 += delta * (price - mean);
    return window.length === period ? {mean, sd: Math.sqrt(Math.max(0, m2 / period))} : null;
  });
}

export function equityIndicators(bars: readonly {date: string; close: number | null}[]) {
  const prices = bars.map(bar => bar.close), moments = rollingPriceMoments(prices, 20);
  const sma = (n: number) => (n === 20 ? moments : rollingPriceMoments(prices, n)).map((p, i) => ({date: bars[i].date, value: p?.mean ?? null}));
  return {sma20: sma(20), sma50: sma(50), sma200: sma(200), bollinger: moments.map((p, i) => ({date: bars[i].date, middle: p?.mean ?? null, upper: p ? p.mean + 2 * p.sd : null, lower: p ? p.mean - 2 * p.sd : null}))};
}
