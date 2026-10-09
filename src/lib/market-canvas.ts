import { clampMarketDomain, findBar, rangeMonths, monthsBack, zoomMarketDomain, type Candle, type ComparePoint, type Interval, type MarketDomain, type MarketRange } from "./market-math";
import { wheelIntent } from "./chart-domain";
export type RegimeBand = { date: string; label: string; color: string };
export type CanvasModel = { candles: Candle[]; interval: Interval; range: MarketRange; anchor?: string; latest?: number; volume: boolean; volumeMeaningful?: boolean; regimes: RegimeBand[]; paths?: { name: string; points: ComparePoint[] }[] };
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const signed = (n: number) => (n > 0 ? "+" : "") + fmt(n);
/** Imperative canvas controller: pointer frames never update React state or query a server. */
export class MarketCanvas {
  private model: CanvasModel;
  private domain: MarketDomain = [0, 1];
  private preset: MarketDomain = [0, 1];
  private hover: { x: number; y: number } | null = null;
  private dragging: { x: number; domain: MarketDomain } | null = null;
  private width = 800;
  private height = 400;
  private frame = 0;
  private limits: MarketDomain = [-.5, .5];
  private regimeMap = new Map<string, RegimeBand>();
  private boundaryTimer: ReturnType<typeof setTimeout> | undefined;
  private observer: ResizeObserver;
  private themeObserver: MutationObserver;
  private cleanup: (() => void)[] = [];
  constructor(private canvas: HTMLCanvasElement, private readout: HTMLElement, private windowLabel: HTMLElement, model: CanvasModel, private boundary: (side: "before" | "after") => void) {
    this.model = model;
    this.observer = new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); this.width = r.width; this.height = r.height; this.schedule(); });
    this.observer.observe(canvas);
    this.themeObserver = new MutationObserver(() => this.schedule()); this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const listen = <K extends keyof HTMLElementEventMap>(name: K, fn: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      canvas.addEventListener(name, fn as EventListener, options); this.cleanup.push(() => canvas.removeEventListener(name, fn as EventListener, options));
    };
    listen("pointerdown", e => { if (e.button !== 0) return; canvas.focus(); canvas.setPointerCapture(e.pointerId); this.dragging = { x: e.clientX, domain: [...this.domain] }; canvas.style.cursor = "grabbing"; });
    listen("pointermove", e => {
      const r = canvas.getBoundingClientRect(); this.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (this.dragging) { const shift = (this.dragging.x - e.clientX) / this.plotWidth() * (this.dragging.domain[1] - this.dragging.domain[0]); this.change([this.dragging.domain[0] + shift, this.dragging.domain[1] + shift]); } else this.schedule();
    });
    const release = () => { this.dragging = null; canvas.style.cursor = "crosshair"; };
    listen("pointerup", release); listen("pointercancel", release); listen("lostpointercapture", release);
    listen("pointerleave", () => { if (!this.dragging) { this.hover = null; this.schedule(); } });
    listen("wheel", e => {
      const intent = wheelIntent(e.deltaX, e.deltaY, e.deltaMode, e.ctrlKey, e.shiftKey); if (intent === "scroll") return;
      e.preventDefault(); const [min, max] = this.extent(), width = this.domain[1] - this.domain[0];
      if (intent === "pan") { const shift = e.deltaX / this.plotWidth() * width; this.change([this.domain[0] + shift, this.domain[1] + shift]); }
      else { const x = e.clientX - canvas.getBoundingClientRect().left; this.change(zoomMarketDomain(this.domain, Math.max(0, Math.min(1, (x - 12) / this.plotWidth())), Math.exp(Math.max(-.7, Math.min(.7, e.deltaY * (e.deltaMode ? .03 : .002)))), min, max)); }
    }, { passive: false });
    listen("dblclick", () => { this.hover = null; this.change([...this.preset]); });
    listen("keydown", e => {
      const [min, max] = this.extent(), width = this.domain[1] - this.domain[0];
      if (["ArrowLeft", "ArrowRight", "+", "=", "-", "Home"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        if (e.key === "Home") this.change([...this.preset]);
        else if (e.key.startsWith("Arrow")) { const shift = width * (e.key === "ArrowLeft" ? -.15 : .15); this.change([this.domain[0] + shift, this.domain[1] + shift]); }
        else this.change(zoomMarketDomain(this.domain, .5, e.key === "-" ? 1.2 : .8, min, max));
      }
    });
    this.update(model, true);
  }
  private plotWidth() { return Math.max(1, this.width - 89); }
  private extent(): MarketDomain {
    return this.limits;
  }
  update(model: CanvasModel, reset: boolean) {
    const old = this.model.candles, previous = this.domain;
    this.model = model;
    this.regimeMap = new Map(model.regimes.map(r => [r.date.slice(0, 7), r]));
    if (model.paths) {
      let min = Infinity, max = -Infinity;
      for (const path of model.paths) { if (path.points.length) { min = Math.min(min, path.points[0].x); max = Math.max(max, path.points.at(-1)!.x); } }
      this.limits = Number.isFinite(min) ? [min - .5, max + .5] : [-1, 1];
    } else this.limits = [-.5, Math.max(.5, model.candles.length - .5)];
    const [min, max] = this.extent();
    if (model.paths) {
      const periods = rangeMonths(model.range) * (model.interval === "1D" ? 21 : model.interval === "1W" ? 4.35 : model.interval === "1M" ? 1 : model.interval === "3M" ? 1 / 3 : model.interval === "6M" ? 1 / 6 : 1 / 12);
      this.preset = model.range === "MAX" ? [min, max] : clampMarketDomain([-periods / 2, periods / 2], min, max);
    } else {
      const bars = model.candles, endDate = model.anchor ?? bars.at(-1)?.end ?? "2000-01-01", months = rangeMonths(model.range);
      const from = monthsBack(endDate, model.anchor ? Math.ceil(months / 2) : months), to = model.anchor ? monthsBack(endDate, -Math.ceil(months / 2)) : bars.at(-1)?.end ?? endDate;
      const start = Math.max(0, findBar(bars, from)), end = Math.max(start, findBar(bars, to));
      this.preset = model.range === "MAX" ? [min, max] : clampMarketDomain([start - .5, end + .5], min, max);
    }
    if (reset || !old.length) { this.domain = [...this.preset]; this.hover = null; }
    else if (!model.paths && old.length && model.candles.length) {
      // Prepending history must not move the user's visible window.
      const offset = findBar(model.candles, old[0].date); this.domain = clampMarketDomain([previous[0] + Math.max(0, offset), previous[1] + Math.max(0, offset)], min, max);
    } else this.domain = clampMarketDomain(previous, min, max);
    this.schedule();
  }
  private change(d: MarketDomain) {
    const [min, max] = this.extent(); this.domain = clampMarketDomain(d, min, max); this.schedule();
    // One debounced extension near a real loaded boundary, never a request per gesture.
    clearTimeout(this.boundaryTimer);
    {
      const margin = (this.domain[1] - this.domain[0]) * .15;
      if (this.domain[0] <= min + margin) this.boundaryTimer = setTimeout(() => this.boundary("before"), 180);
      else if (this.domain[1] >= max - margin) this.boundaryTimer = setTimeout(() => this.boundary("after"), 180);
    }
  }
  private schedule() { if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); }); }
  private draw() {
    const ctx = this.canvas.getContext("2d"); if (!ctx || this.width < 100) return;
    const ratio = Math.min(3, devicePixelRatio || 1), w = this.width, h = this.height;
    if (this.canvas.width !== Math.round(w * ratio) || this.canvas.height !== Math.round(h * ratio)) { this.canvas.width = Math.round(w * ratio); this.canvas.height = Math.round(h * ratio); }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const css = getComputedStyle(this.canvas), color = (name: string) => css.getPropertyValue(name).trim();
    const bg = color("--panel"), grid = color("--line"), text = color("--muted"), up = color("--positive"), down = color("--negative"), accent = color("--teal"), blue = color("--cyan"), neutral = color("--dim");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.font = "11px " + css.fontFamily; ctx.lineWidth = 1;
    const left = 12, right = w - 77, top = 18, bottom = h - (this.model.volume && !this.model.paths ? 78 : 29), plotWidth = right - left;
    const [lo, hi] = this.domain, span = Math.max(.8, hi - lo), x = (i: number) => left + (i - lo) / span * plotWidth;
    const pathSlices = this.model.paths?.map(path => {
      const bound = (value: number) => { let l = 0, r = path.points.length; while (l < r) { const m = (l + r) >>> 1; if (path.points[m].x < value) l = m + 1; else r = m; } return l; };
      return { ...path, points: path.points.slice(Math.max(0, bound(lo) - 1), Math.min(path.points.length, bound(hi) + 1)) };
    });
    const bars = this.model.candles, start = Math.max(0, Math.ceil(lo)), end = Math.min(bars.length - 1, Math.floor(hi));
    let low = Infinity, high = -Infinity;
    if (pathSlices) { for (const p of pathSlices) for (const point of p.points) { low = Math.min(low, point.value); high = Math.max(high, point.value); } }
    else for (let i = start; i <= end; i++) { low = Math.min(low, bars[i].low); high = Math.max(high, bars[i].high); }
    if (!Number.isFinite(low)) { ctx.fillStyle = text; ctx.fillText("No real observations in this window", left + 12, top + 22); this.readout.textContent = "No OHLC available"; return; }
    const padding = Math.max((high - low) * .08, high * .002); low = Math.max(0, low - padding); high += padding;
    const y = (price: number) => top + (high - price) / (high - low) * (bottom - top);
    ctx.strokeStyle = grid; ctx.fillStyle = text;
    for (let i = 0; i <= 4; i++) {
      const price = low + (high - low) * i / 4, py = y(price); ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.stroke();
      const nearLatest = !this.model.paths && this.model.latest !== undefined && Math.abs(py - y(this.model.latest)) < 19;
      const nearHover = this.hover && this.hover.x >= left && this.hover.x <= right && Math.abs(py - this.hover.y) < 19;
      if (!nearLatest && !nearHover) ctx.fillText(fmt(price), right + 9, py + 4);
    }
    for (let i = 0; i <= 4; i++) {
      const logical = lo + span * i / 4, px = x(logical); ctx.strokeStyle = grid; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke();
      let label: string;
      if (this.model.paths) label = `${logical < 0 ? "−" : "+"}${Math.abs(Math.round(logical))}${this.model.interval === "1D" ? " sessions" : this.model.interval === "1W" ? "W" : this.model.interval}`;
      else { const b = bars[Math.max(0, Math.min(bars.length - 1, Math.round(logical)))]; label = this.model.interval === "1D" || this.model.interval === "1W" ? b?.date ?? "" : b?.label ?? ""; }
      ctx.fillStyle = text; ctx.textAlign = i === 0 ? "left" : i === 4 ? "right" : "center"; ctx.fillText(label, px, h - 8); ctx.textAlign = "left";
    }
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, plotWidth, h - top - 29); ctx.clip();
    if (!this.model.paths && this.model.regimes.length) {
      // A slim strip, not a candle-obscuring backdrop; map monthly descriptive labels to their own month.
      for (let i = start; i <= end; i++) { const regime = this.regimeMap.get(bars[i].end.slice(0, 7)); if (regime) { ctx.fillStyle = regime.color; ctx.globalAlpha = .55; ctx.fillRect(x(i) - plotWidth / span / 2, bottom - 4, Math.max(1, plotWidth / span), 4); } }
      ctx.globalAlpha = 1;
      ctx.fillStyle = text; ctx.font = "9px sans-serif"; ctx.fillText("MARKET STATE", left + 3, bottom - 8);
      if (bars[start]?.end < this.model.regimes[0].date) ctx.fillText("NO STATE DATA", left + 90, bottom - 8);
    }
    if (pathSlices) {
      for (let s = 0; s < pathSlices.length; s++) {
        ctx.strokeStyle = s === 0 ? accent : blue; ctx.lineWidth = 1.6; ctx.setLineDash(s === 0 ? [] : [5, 3]); ctx.beginPath(); let begun = false;
        for (const point of pathSlices[s].points) { if (!begun) { ctx.moveTo(x(point.x), y(point.value)); begun = true; } else ctx.lineTo(x(point.x), y(point.value)); } ctx.stroke();
      } ctx.setLineDash([]); ctx.lineWidth = 1;
    } else {
      const spacing = plotWidth / span, bodyWidth = Math.max(.8, Math.min(15, spacing * .66));
      // At subpixel density only wick envelopes are drawn per pixel. Tooltips always inspect original interval candles.
      let pixel = -1, envelopeHigh = -Infinity, envelopeLow = Infinity;
      const flush = () => { if (pixel < 0) return; ctx.strokeStyle = neutral; ctx.beginPath(); ctx.moveTo(pixel + .5, y(envelopeHigh)); ctx.lineTo(pixel + .5, y(envelopeLow)); ctx.stroke(); };
      for (let i = start; i <= end; i++) {
        const b = bars[i], px = x(i), change = b.close - b.open, flat = Math.abs(change) <= Math.max(b.open, b.close) * 1e-8;
        if (spacing < 1.2) { const next = Math.floor(px); if (next !== pixel) { flush(); pixel = next; envelopeHigh = b.high; envelopeLow = b.low; } else { envelopeHigh = Math.max(envelopeHigh, b.high); envelopeLow = Math.min(envelopeLow, b.low); } continue; }
        const c = flat ? neutral : change > 0 ? up : down; ctx.strokeStyle = c; ctx.fillStyle = change > 0 ? bg : c;
        ctx.beginPath(); ctx.moveTo(px, y(b.high)); ctx.lineTo(px, y(b.low)); ctx.stroke();
        const bodyTop = y(Math.max(b.open, b.close)), bodyHeight = Math.max(1, Math.abs(y(b.open) - y(b.close)));
        ctx.fillRect(px - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight); ctx.strokeRect(px - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
      } if (spacing < 1.2) flush();
      if (this.model.volume) {
        let maxVolume = 0; for (let i = start; i <= end; i++) maxVolume = Math.max(maxVolume, bars[i].volume ?? 0);
        if (maxVolume) for (let i = start; i <= end; i++) { const b = bars[i], size = (b.volume ?? 0) / maxVolume * 36; ctx.fillStyle = b.close >= b.open ? up : down; ctx.globalAlpha = .5; ctx.fillRect(x(i) - Math.max(1, spacing * .66) / 2, h - 31 - size, Math.max(1, spacing * .66), size); }
        ctx.globalAlpha = 1;
      }
      const latest = this.model.latest;
      if (latest !== undefined && latest >= low && latest <= high) {
        ctx.strokeStyle = accent; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(left, y(latest)); ctx.lineTo(right, y(latest)); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const anchorIndex = this.model.paths ? 0 : this.model.anchor ? findBar(bars, this.model.anchor) : -1;
    if ((this.model.paths || this.model.anchor) && anchorIndex >= lo && anchorIndex <= hi) { ctx.strokeStyle = blue; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x(anchorIndex), top); ctx.lineTo(x(anchorIndex), bottom); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = blue; ctx.fillText(this.model.paths ? "ANCHOR 100" : "ANALOGUE " + this.model.anchor, Math.min(right - 147, Math.max(left + 4, x(anchorIndex) + 5)), top + 12); }
    ctx.restore();
    if (!this.model.paths && this.model.latest !== undefined && this.model.latest >= low && this.model.latest <= high) { ctx.fillStyle = accent; ctx.fillRect(right + 3, y(this.model.latest) - 9, 72, 18); ctx.fillStyle = bg; ctx.fillText(fmt(this.model.latest), right + 7, y(this.model.latest) + 4); }
    const hover = this.hover;
    let description = "";
    if (hover && hover.x >= left && hover.x <= right && hover.y >= top && hover.y <= bottom) {
      const logical = Math.round(lo + (hover.x - left) / plotWidth * span), price = high - (hover.y - top) / (bottom - top) * (high - low);
      ctx.strokeStyle = neutral; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x(logical), top); ctx.lineTo(x(logical), bottom); ctx.moveTo(left, hover.y); ctx.lineTo(right, hover.y); ctx.stroke(); ctx.setLineDash([]);
      let dateLabel = "";
      if (this.model.paths) {
        description = pathSlices!.map(path => { const p = path.points.find(point => point.x === logical); return `${path.name}: ${p ? fmt(p.value) + " · " + p.date : "No observation"}`; }).join("   |   "); dateLabel = `${logical > 0 ? "+" : ""}${logical} ${this.model.interval === "1D" ? "sessions" : "periods"}`;
      } else {
        const b = bars[logical]; if (b) { const delta = b.close - b.open, regime = this.regimeMap.get(b.end.slice(0, 7)); dateLabel = b.label; description = `${b.label}   O ${fmt(b.open)}   H ${fmt(b.high)}   L ${fmt(b.low)}   C ${fmt(b.close)}   ${signed(delta)} (${signed(delta / b.open * 100)}%)${this.model.volumeMeaningful && b.volume !== null ? "   V " + new Intl.NumberFormat("en", { notation: "compact" }).format(b.volume) : ""}${regime ? "   · " + regime.label : ""}`; }
      }
      ctx.fillStyle = grid; ctx.fillRect(right + 3, hover.y - 9, 72, 18); ctx.fillStyle = color("--text"); ctx.fillText(fmt(price), right + 7, hover.y + 4);
      const labelWidth = ctx.measureText(dateLabel).width + 12, labelX = Math.max(left, Math.min(right - labelWidth, x(logical) - labelWidth / 2)); ctx.fillStyle = grid; ctx.fillRect(labelX, h - 24, labelWidth, 21); ctx.fillStyle = color("--text"); ctx.fillText(dateLabel, labelX + 6, h - 9);
    }
    if (!description) {
      if (this.model.paths) description = "Current · solid    Historical · dashed    100 at each anchor · raw price closes";
      else { const b = bars[end]; if (b) description = `${b.label}   O ${fmt(b.open)}   H ${fmt(b.high)}   L ${fmt(b.low)}   C ${fmt(b.close)}   ${signed((b.close / b.open - 1) * 100)}%`; }
    }
    this.readout.textContent = description;
    this.canvas.dataset.domain = `${lo.toFixed(3)},${hi.toFixed(3)}`;
    this.canvas.dataset.renderedCandles = String(Math.max(0, end - start + 1));
    this.windowLabel.textContent = this.model.paths ? "Relative to each anchor · no current future path fabricated" : `${bars[start]?.date ?? ""} — ${bars[end]?.end ?? ""}`;
  }
  destroy() { cancelAnimationFrame(this.frame); clearTimeout(this.boundaryTimer); this.observer.disconnect(); this.themeObserver.disconnect(); this.cleanup.forEach(fn => fn()); }
}
