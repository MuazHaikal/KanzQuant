"use client";
import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from "react";
import {MarketCanvas} from "@/lib/market-canvas";
import {aggregateBars, type Bar, ranges} from "@/lib/market-math";
import {DEFAULT_EQUITY_VIEW, INDICATORS, INDICATOR_LABELS, equityIndicators, parseEquityView, toggleEquityIndicator, type EquityChartView, type EquityIndicator} from "@/lib/equity-indicators";

function subscribeView(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("kanzquant-equity-view", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("kanzquant-equity-view", listener); };
}
const serverView = () => null;
const colors = {sma20: "#2377ff", sma50: "#43a1ff", sma200: "#f34f5e", bollinger: "#8e9fb8", volume: "#a2adbd"};

export function EquityPriceChart({bars, symbol}: {bars: Bar[]; symbol: string}) {
  const key = "kanzquant.equity.view." + symbol;
  const readSaved = useCallback(() => { try { return localStorage.getItem(key); } catch { return null; } }, [key]);
  const rawSaved = useSyncExternalStore(subscribeView, readSaved, serverView);
  const stored = useMemo(() => parseEquityView(rawSaved) ?? DEFAULT_EQUITY_VIEW, [rawSaved]);
  const [override, setOverride] = useState<{symbol: string; view: EquityChartView} | null>(null);
  const [notice, setNotice] = useState("");
  const view = override?.symbol === symbol ? override.view : stored;
  const {range, indicators} = view;
  const volume = indicators.includes("volume");
  const canvas = useRef<HTMLCanvasElement>(null), readout = useRef<HTMLDivElement>(null), windowLabel = useRef<HTMLSpanElement>(null);
  const engine = useRef<MarketCanvas | null>(null), previous = useRef({range, symbol});
  const calculated = useMemo(() => equityIndicators(bars), [bars]);
  const candles = useMemo(() => aggregateBars(bars, "1D"), [bars]);
  const overlays = useMemo(() => (["sma20", "sma50", "sma200"] as const).filter(id => indicators.includes(id)).map(id => ({name: INDICATOR_LABELS[id], color: colors[id], points: calculated[id].flatMap(p => p.value === null ? [] : [{date: p.date, value: p.value}])})), [calculated, indicators]);
  const bands = useMemo(() => indicators.includes("bollinger") ? [{name: "Bollinger (20, 2)", color: colors.bollinger, fill: "rgba(105,133,175,0.075)", middle: !indicators.includes("sma20"), points: calculated.bollinger.flatMap(p => p.upper === null || p.lower === null || p.middle === null ? [] : [{date: p.date, upper: p.upper, lower: p.lower, middle: p.middle}])}] : [], [calculated, indicators]);

  useEffect(() => {
    engine.current = new MarketCanvas(canvas.current!, readout.current!, windowLabel.current!, {candles: [], interval: "1D", range: "3Y", volume: true, regimes: []}, () => {});
    return () => engine.current?.destroy();
  }, []);
  useEffect(() => {
    engine.current?.update({candles, interval: "1D", range, volume, volumeFraction: .15, volumeMeaningful: true, latest: bars.at(-1)?.close, regimes: [], overlays, bands}, previous.current.range !== range || previous.current.symbol !== symbol);
    previous.current = {range, symbol};
  }, [bars, candles, range, symbol, volume, overlays, bands]);

  function change(next: EquityChartView) { setOverride({symbol, view: next}); }
  function toggle(id: EquityIndicator) { change(toggleEquityIndicator(view, id)); }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(view)); window.dispatchEvent(new Event("kanzquant-equity-view")); setNotice("View saved locally"); }
    catch { setNotice("Browser storage unavailable"); }
  }
  function restore() { setOverride(null); setNotice(parseEquityView(readSaved()) ? "Saved view restored" : "Default view restored"); }

  return <div className="equity-chart">
    <div className="equity-chart-tools"><nav aria-label="Equity chart range">{ranges.filter(r => r !== "20Y").map(r => <button key={r} aria-pressed={range === r} onClick={() => change({...view, range: r})}>{r}</button>)}</nav><button onClick={save}>Save view</button><button onClick={restore}>Restore view</button></div>
    <div className="equity-indicator-toolbar" aria-label="Chart indicators">
      <details className="equity-indicator-picker"><summary>＋ Add Series / Indicator</summary><div>{INDICATORS.map(id => <button key={id} disabled={indicators.includes(id)} onClick={event => { toggle(id); event.currentTarget.closest("details")?.removeAttribute("open"); }} aria-label={"Add " + INDICATOR_LABELS[id]}>{INDICATOR_LABELS[id]} {indicators.includes(id) ? "✓" : "+"}</button>)}</div></details>
      {INDICATORS.filter(id => indicators.includes(id)).map(id => <span className="equity-indicator-chip" key={id}><i style={{background: colors[id]}}/>{INDICATOR_LABELS[id]}<button aria-label={"Remove " + INDICATOR_LABELS[id]} onClick={() => toggle(id)}>×</button></span>)}
    </div>
    <div ref={readout} className="market-readout"/>
    <canvas className="market-canvas equity-canvas" ref={canvas} role="img" tabIndex={0} aria-label={symbol + " adjusted OHLCV chart. Drag to pan, Control-wheel to zoom; Home resets."}/>
    <footer className="market-chart-foot"><span ref={windowLabel}/><span>Yahoo Finance · adjusted OHLC · daily · {bars.length.toLocaleString()} observations</span></footer>
    {notice && <div className="equity-chart-notice" role="status">{notice}</div>}
  </div>;
}
