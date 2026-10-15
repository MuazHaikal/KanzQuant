import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
function load(path, dependencies = {}, environment = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code, {exports, Date, Number, Math, Map, Intl, ...environment, require: name => dependencies[name] ?? require(name)});
  return exports;
}
const math = load("src/lib/market-math.ts"), domain = load("src/lib/chart-domain.ts");
const indicators = load("src/lib/equity-indicators.ts", {"./market-math": math});
const rows = Array.from({length: 260}, (_, i) => ({date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), close: i + 1}));
const approx = (a, b, tolerance = 1e-8) => assert(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test("SMA20 valid-session warm-up and sliding window", () => {
  const r = indicators.equityIndicators(rows); assert(r.sma20.slice(0, 19).every(p => p.value === null)); approx(r.sma20[19].value, 10.5); approx(r.sma20[20].value, 11.5); approx(r.sma20.at(-1).value, 250.5);
});
test("SMA50 and optional SMA200", () => { const r = indicators.equityIndicators(rows); assert(r.sma50.slice(0, 49).every(p => p.value === null)); approx(r.sma50[49].value, 25.5); approx(r.sma50[50].value, 26.5); approx(r.sma200[199].value, 100.5); });
test("Bollinger middle equals SMA20; population SD and symmetric two-SD boundaries", () => {
  const r = indicators.equityIndicators(rows), p = r.bollinger[19]; approx(p.middle, 10.5); approx(p.upper, 10.5 + 2 * Math.sqrt(33.25)); approx(p.lower, 10.5 - 2 * Math.sqrt(33.25)); r.bollinger.forEach((p, i) => assert.equal(p.middle, r.sma20[i].value));
});
test("Bollinger null warm-up / short-history stocks", () => { const r = indicators.equityIndicators(rows.slice(0, 11)); assert.equal(r.bollinger.length, 11); assert(r.bollinger.every(p => p.middle === null && p.upper === null && p.lower === null)); assert(r.sma50.every(p => p.value === null)); });
test("Missing/invalid prices excluded without fabricated calendar sessions", () => {
  const input = rows.slice(0, 21).map((p, i) => ({...p, close: i === 5 ? null : p.close})); const r = indicators.equityIndicators(input); assert.equal(r.sma20[19].value, null); approx(r.sma20[20].value, (231 - 6) / 20); assert.equal(r.sma20[5].value, null);
  const gap = [...rows.slice(0, 10), ...rows.slice(15, 25)], g = indicators.equityIndicators(gap); assert.equal(g.sma20.length, 20); approx(g.sma20.at(-1).value, gap.reduce((n, p) => n + p.close, 0) / 20);
  assert.equal(indicators.rollingPriceMoments([NaN, Infinity, -1, 0], 2).filter(Boolean).length, 0);
});
test("Constant values, large-price numerical stability and no future lookahead", () => {
  const flat = indicators.rollingPriceMoments(Array(30).fill(100), 20); approx(flat.at(-1).sd, 0);
  const large = indicators.rollingPriceMoments(Array.from({length: 40}, (_, i) => 1e9 + i), 20); approx(large.at(-1).sd, Math.sqrt(33.25));
  assert.equal(JSON.stringify(indicators.equityIndicators(rows.slice(0, 30)).bollinger), JSON.stringify(indicators.equityIndicators(rows).bollinger.slice(0, 30)));
});
test("Exactly four first-visit defaults, optional SMA200 excluded", () => { assert.equal(JSON.stringify(indicators.DEFAULT_EQUITY_VIEW.indicators), JSON.stringify(["sma20", "sma50", "bollinger", "volume"])); });
test("Enable / remove / re-enable is immutable and duplicate-free", () => { const initial = indicators.DEFAULT_EQUITY_VIEW; for (const id of indicators.INDICATORS) { const changed = indicators.toggleEquityIndicator(initial, id); assert.notEqual(changed.indicators.includes(id), initial.indicators.includes(id)); assert.equal(JSON.stringify(indicators.toggleEquityIndicator(changed, id).indicators.sort()), JSON.stringify([...initial.indicators].sort())); } assert.equal(initial.indicators.length, 4); });
test("Versioned saved configuration roundtrip, including all indicators removed", () => { const view = {version: 2, range: "1Y", indicators: ["sma200"]}; assert.equal(JSON.stringify(indicators.parseEquityView(JSON.stringify(view))), JSON.stringify(view)); assert.equal(indicators.parseEquityView('{"version":2,"range":"MAX","indicators":[]}').indicators.length, 0); });
test("Legacy saved views retain explicit SMA200 and disabled volume", () => { const v = indicators.parseEquityView('{"range":"5Y","averages":[20,200],"volume":false}'); assert.equal(JSON.stringify(v.indicators), JSON.stringify(["sma20", "sma200"])); assert.equal(v.range, "5Y"); });
test("Invalid storage falls back; unsupported indicators filtered", () => { for (const raw of [null, "broken", "null", '{"version":2,"range":"bad","indicators":[]}']) assert.equal(indicators.parseEquityView(raw), null); assert.equal(indicators.parseEquityView('{"version":2,"range":"3Y","indicators":["sma20","sma20","fake"]}').indicators.length, 1); });
test("SSR toolbar has accessible removable default chips inside chart", () => {
  const component = load("src/components/equity-price-chart.tsx", {"@/lib/market-canvas": {}, "@/lib/market-math": math, "@/lib/equity-indicators": indicators});
  const html = renderToStaticMarkup(React.createElement(component.EquityPriceChart, {bars: [], symbol: "MU"}));
  for (const name of ["SMA 20", "SMA 50", "Bollinger (20, 2)", "Volume"]) assert(html.includes('aria-label="Remove ' + name + '"'));
  assert(!html.includes('aria-label="Remove SMA 200"')); assert(html.includes("Add Series / Indicator")); assert(html.includes('aria-label="Add SMA 200"'));
});
test("Actual canvas band fill/boundaries, volume direction/size, toggles and pan preservation", () => {
  const events = new Map(), frames = new Map(), calls = []; let frame = 0;
  const ctx = new Proxy({}, {get: (o, key) => key === "measureText" ? () => ({width: 50}) : o[key] ?? ((...args) => calls.push({key, args, fill: o.fillStyle, stroke: o.strokeStyle})), set: (o, key, value) => (o[key] = value, true)});
  const canvas = {style: {}, dataset: {}, width: 0, height: 0, focus() {}, setPointerCapture() {}, getContext: () => ctx, getBoundingClientRect: () => ({width: 800, height: 400, left: 0, top: 0}), addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name)};
  const {MarketCanvas} = load("src/lib/market-canvas.ts", {"./market-math": math, "./chart-domain": domain}, {document: {documentElement: {}}, devicePixelRatio: 1, getComputedStyle: () => ({fontFamily: "sans-serif", getPropertyValue: name => ({"--positive": "green", "--negative": "red"}[name] ?? "gray")}), ResizeObserver: class {constructor(fn) {this.fn = fn;} observe() {this.fn();} disconnect() {}}, MutationObserver: class {observe() {} disconnect() {}}, requestAnimationFrame: fn => {frames.set(++frame, fn); return frame;}, cancelAnimationFrame: id => frames.delete(id), setTimeout: () => 1, clearTimeout() {}});
  const flush = () => {for (const [id, fn] of frames) {frames.delete(id); fn();}};
  const bars = rows.map((p, i) => ({...p, close: p.close + 100, open: p.close + 100 + (i % 2 ? 1 : -1), high: p.close + 102, low: p.close + 98, volume: i + 1}));
  const b = indicators.equityIndicators(bars).bollinger.filter(p => p.upper !== null);
  const model = {candles: math.aggregateBars(bars, "1D"), interval: "1D", range: "MAX", regimes: [], volume: true, volumeFraction: .15, bands: [{name: "Bollinger", color: "band-edge", fill: "band-fill", middle: true, points: b}]};
  const engine = new MarketCanvas(canvas, {}, {}, model, () => {}); flush();
  assert.equal(canvas.dataset.bands, "Bollinger"); assert.equal(Number(canvas.dataset.volumeBars), 260); assert(calls.some(c => c.key === "fill" && c.fill === "band-fill")); assert(calls.some(c => c.key === "stroke" && c.stroke === "band-edge"));
  const volume = calls.filter(c => c.key === "fillRect" && c.args[1] > 300 && ["green", "red"].includes(c.fill)); assert(volume.some(c => c.fill === "green")); assert(volume.some(c => c.fill === "red")); assert(volume.every(c => c.args[3] <= .15 * (400 - 47) + 1e-8));
  events.get("keydown")({key: "+", preventDefault() {}, stopPropagation() {}}); flush(); const zoomed = canvas.dataset.domain;
  engine.update({...model, bands: [], volume: false}, false); flush(); assert.equal(canvas.dataset.bands, ""); assert.equal(canvas.dataset.volumeBars, "0"); assert.equal(canvas.dataset.domain, zoomed);
  engine.update(model, false); flush(); assert.equal(canvas.dataset.bands, "Bollinger"); assert(Number(canvas.dataset.volumeBars) > 0); engine.destroy(); assert.equal(events.size, 0);
});
