"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { TerminalMenu } from "./terminal-menu";
import { MarketCanvas, type CanvasModel, type RegimeBand } from "@/lib/market-canvas";
import { aggregateBars, assets, comparisonPath, intervals, monthsBack, rangeMonths, ranges, type Asset, type Interval, type MarketRange, type MarketWindow } from "@/lib/market-math";
const preferenceKey = "kanzquant.market-chart.v1";
type Settings = { interval: Interval; range: MarketRange; asset: Asset; view: "CANDLES" | "COMPARE" };
const emptyModel: CanvasModel = { candles: [], interval: "1D", range: "1Y", volume: false, regimes: [] };
const noRegimes: RegimeBand[] = [];
function CandleCanvas({ model, height, resetKey, onBoundary }: { model: CanvasModel; height: number | string; resetKey: string; onBoundary: (side: "before" | "after") => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), readout = useRef<HTMLDivElement>(null), label = useRef<HTMLSpanElement>(null), engine = useRef<MarketCanvas | null>(null), previousKey = useRef("");
  const boundary = useEffectEvent(onBoundary);
  useEffect(() => { engine.current = new MarketCanvas(canvas.current!, readout.current!, label.current!, emptyModel, side => boundary(side)); return () => engine.current?.destroy(); }, []);
  useEffect(() => { engine.current?.update(model, previousKey.current !== resetKey); previousKey.current = resetKey; }, [model, resetKey]);
  return <><div ref={readout} className="market-readout" aria-label="Market chart readout"/><canvas ref={canvas} style={{ height }} className="market-canvas" role="img" tabIndex={0} aria-label="Interactive market chart. Drag to pan, wheel or Control-wheel to zoom, double click or Home to reset. Arrow keys pan; plus and minus zoom." data-market-chart/><div className="market-chart-foot"><span ref={label}/><span>YAHOO FINANCE · NEON</span></div></>;
}
export function MarketChart({ initial, regimes = noRegimes, height = 460, anchor, currentAnchor, initialAsset, initialView = "CANDLES", assetControl = true }: { initial: MarketWindow; regimes?: RegimeBand[]; height?: number | string; anchor?: string; currentAnchor?: string; initialAsset?: Asset; initialView?: "CANDLES" | "COMPARE"; assetControl?: boolean }) {
  const [settings, setSettings] = useState<Settings>({ interval: "1D", range: "1Y", asset: initialAsset ?? initial.asset, view: initialView });
  const [window, setWindow] = useState(initial), [volume, setVolume] = useState(false), [showRegimes, setShowRegimes] = useState(true), [status, setStatus] = useState(""), [revision, setRevision] = useState(0);
  const cache = useRef(new Map<Asset, MarketWindow>([[initial.asset, initial]])), extension = useRef(false), request = useRef<AbortController | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { try { const p = JSON.parse(localStorage.getItem(preferenceKey) ?? "{}"); setSettings(s => ({ ...s, interval: intervals.includes(p.interval) ? p.interval : s.interval, range: ranges.includes(p.range) ? p.range : s.range })); } catch {} });
    return () => cancelAnimationFrame(frame);
  }, []);
  const select = (part: keyof Settings, value: string) => {
    const next = { ...settings, [part]: value } as Settings; setSettings(next);
    try { localStorage.setItem(preferenceKey, JSON.stringify({ interval: next.interval, range: next.range })); } catch {}
    // Query values make local inspection links reproducible without triggering a server navigation.
    if (assetControl) { const url = new URL(location.href); url.searchParams.set("asset", next.asset); if (anchor) url.searchParams.set("view", next.view.toLowerCase()); history.replaceState(null, "", url); }
  };
  const fetchWindow = async (asset: Asset, from: string, to: string, signal: AbortSignal) => {
    const response = await fetch(`/api/market?asset=${asset}&from=${from}&to=${to}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
    if (!response.ok) throw new Error("Market history unavailable. Retry.");
    const result: MarketWindow = await response.json(), previous = cache.current.get(asset);
    const map = new Map(previous?.bars.map(b => [b.date, b]) ?? []); result.bars.forEach(b => map.set(b.date, b));
    const merged = { ...result, bars: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)), from: previous && previous.from < result.from ? previous.from : result.from, to: previous && previous.to > result.to ? previous.to : result.to };
    cache.current.set(asset, merged); return merged;
  };
  useEffect(() => {
    const controller = new AbortController(); request.current?.abort(); request.current = controller; extension.current = false;
    const run = async () => {
      let cached = cache.current.get(settings.asset);
      const date = anchor ?? cached?.latest ?? initial.latest, months = rangeMonths(settings.range);
      // Include full calendar boundary for the largest available aggregate, plus a pan buffer.
      const from = settings.range === "MAX" ? cached?.first ?? initial.first : monthsBack(date, Math.max(36, anchor ? Math.ceil(months / 2) + 24 : months + 24)).slice(0, 4) + "-01-01";
      const to = anchor && settings.view !== "COMPARE" && settings.range !== "MAX" ? monthsBack(date, -Math.max(36, Math.ceil(months / 2) + 24)) : cached?.latest ?? initial.latest;
      if (!cached || from < cached.from && cached.from > cached.first || to > cached.to && cached.to < cached.latest) {
        setStatus("Loading persisted history…"); cached = await fetchWindow(settings.asset, from, to, controller.signal);
      }
      if (!controller.signal.aborted) { setWindow(cached); setRevision(v => v + 1); setStatus(cached.bars.length ? "" : "No real OHLC available for this period."); }
    };
    run().catch(error => { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "Market history unavailable."); });
    return () => controller.abort();
  }, [settings.asset, settings.range, settings.view, anchor, initial.first, initial.latest]);
  const extend = async (side: "before" | "after") => {
    const cached = cache.current.get(settings.asset); if (!cached || extension.current || status) return;
    if (side === "before" && cached.from <= cached.first || side === "after" && cached.to >= cached.latest) return;
    extension.current = true;
    const controller = request.current;
    if (!controller || controller.signal.aborted) { extension.current = false; return; }
    try {
      setStatus("Loading earlier/later history…");
      const dayBefore = new Date(cached.from + "T00:00:00Z"); dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const result = await fetchWindow(settings.asset, side === "before" ? monthsBack(cached.from, 60) : cached.to, side === "after" ? monthsBack(cached.to, -60) : dayBefore.toISOString().slice(0, 10), controller.signal);
      if (!controller.signal.aborted) { setWindow(result); setStatus(""); }
    } catch { if (!controller.signal.aborted) setStatus("History extension unavailable. Change range to retry."); }
    finally { extension.current = false; }
  };
  const model = useMemo<CanvasModel>(() => {
    const bars = window.asset === settings.asset ? window.bars : [];
    return { candles: aggregateBars(bars, settings.interval), interval: settings.interval, range: settings.range, anchor, latest: window.to >= window.latest ? bars.at(-1)?.close : undefined, volume: volume && settings.asset !== "SPX", volumeMeaningful: settings.asset !== "SPX", regimes: showRegimes && settings.asset === "SPX" ? regimes : [], paths: settings.view === "COMPARE" && anchor && currentAnchor ? [{ name: `Current (${currentAnchor})`, points: comparisonPath(bars, currentAnchor, settings.interval) }, { name: `Historical (${anchor})`, points: comparisonPath(bars, anchor, settings.interval) }] : undefined };
  }, [window, settings, anchor, currentAnchor, volume, showRegimes, regimes]);
  return <section className="market-chart" aria-label={`${settings.asset} market history`}>
    <div className="market-chart-head"><strong>{settings.asset} / {settings.view === "COMPARE" ? "ANCHOR COMPARISON" : "MARKET HISTORY"}</strong><div className="market-controls">{anchor && <TerminalMenu label="VIEW" value={settings.view} options={["CANDLES", "COMPARE"]} onChange={v => select("view", v)}/>} {assetControl && <TerminalMenu label="ASSET" value={settings.asset} options={assets} onChange={v => select("asset", v)}/>}<TerminalMenu label="INTERVAL" value={settings.interval} options={intervals} onChange={v => select("interval", v)}/><TerminalMenu label="RANGE" value={settings.range} options={ranges} onChange={v => select("range", v)}/>{settings.asset === "SPX" && settings.view !== "COMPARE" && regimes.length > 0 && <button className="terminal-select" aria-label={`Regimes ${showRegimes ? "ON" : "OFF"}`} aria-pressed={showRegimes} onClick={() => setShowRegimes(v => !v)}><span>REGIMES</span><strong>{showRegimes ? "ON" : "OFF"}</strong></button>}{settings.asset !== "SPX" && settings.view !== "COMPARE" && <button className="terminal-select" aria-label={`Volume ${volume ? "ON" : "OFF"}`} aria-pressed={volume} onClick={() => setVolume(v => !v)}><span>VOLUME</span><strong>{volume ? "ON" : "OFF"}</strong></button>}</div></div>
    {status && <div className="market-status" role="status">{status}</div>}
    {anchor && window.asset === settings.asset && anchor < window.first && <div className="market-status" role="status">{settings.asset} history begins {window.first}; no observation exists at the selected analogue anchor.</div>}
    <CandleCanvas model={model} height={height} resetKey={[settings.asset, settings.interval, settings.range, settings.view, anchor, revision].join("/")} onBoundary={extend}/>
    {settings.view === "COMPARE" && <div className="footer-note">Price closes, not total returns · anchors use the last trading close on/before each date · daily axis uses trading sessions</div>}
  </section>;
}
