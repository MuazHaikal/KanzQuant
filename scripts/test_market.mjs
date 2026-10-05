import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { neon } from "@neondatabase/serverless";
function module(file, dependencies = {}, environment = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, Number, Math, Map, Intl, AbortSignal, ...environment, require: name => { if (dependencies[name]) return dependencies[name]; throw new Error("Unexpected test import: " + name); } });
  return exports;
}
const math = module("src/lib/market-math.ts"), navigation = module("src/lib/chart-domain.ts");
const bar = (date, open, high, low, close, volume = 10) => ({ date, open, high, low, close, volume });
const fixture = [bar("2025-12-31",10,13,9,12),bar("2026-01-02",12,16,11,14),bar("2026-01-05",14,18,12,16),bar("2026-01-30",16,19,15,18),bar("2026-02-02",18,22,17,20),bar("2026-03-31",20,23,18,21),bar("2026-04-01",21,25,19,24),bar("2026-06-30",24,28,22,27),bar("2026-07-01",27,30,26,29),bar("2026-10-02",29,31,28,30,null)];
assert.equal(math.aggregateBars(fixture,"1D").length,10);
const weekly = math.aggregateBars(fixture,"1W"); assert.equal(weekly[0].date,"2025-12-29"); assert.equal(weekly[0].open,10);assert.equal(weekly[0].high,16);assert.equal(weekly[0].low,9);assert.equal(weekly[0].close,14);assert.equal(weekly[0].volume,20);
const monthly = math.aggregateBars(fixture,"1M")[1];assert.equal(monthly.open,12);assert.equal(monthly.high,19);assert.equal(monthly.low,11);assert.equal(monthly.close,18);assert.equal(monthly.volume,30);
for(const [interval,expected] of [["3M",["2025-10-01","2026-01-01","2026-04-01","2026-07-01","2026-10-01"]],["6M",["2025-07-01","2026-01-01","2026-07-01"]],["12M",["2025-01-01","2026-01-01"]]]) assert.equal(JSON.stringify(math.aggregateBars(fixture,interval).map(b=>b.date)),JSON.stringify(expected));
const quarter = math.aggregateBars(fixture,"3M")[1];assert.equal(quarter.open,12);assert.equal(quarter.high,23);assert.equal(quarter.low,11);assert.equal(quarter.close,21);assert.equal(quarter.volume,50);assert.equal(quarter.label,"Q1 2026");
const partial = math.aggregateBars(fixture,"3M").at(-1);assert.equal(partial.observations,1);assert.equal(partial.end,"2026-10-02");assert.equal(partial.close,30);assert.equal(partial.volume,null);
assert.equal(math.aggregateBars([bar("2026-01-01",NaN,15,9,11),bar("2026-01-02",10,9,8,11)],"1D").length,0);
assert.equal(math.periodStart("2026-01-04","1W"),"2025-12-29");assert.equal(math.periodStart("2026-01-05","1W"),"2026-01-05");
assert.equal(math.periodLabel("2026-07-01","6M"),"H2 2026");assert.equal(math.monthsBack("2024-03-31",1),"2024-02-29");
for(const interval of math.intervals){const path=math.comparisonPath(fixture,"2026-03-31",interval);assert.equal(path.find(p=>p.x===0).value,100);assert(path.filter(p=>p.x>0).every(p=>p.date>"2026-03-31"));}
const current=math.comparisonPath(fixture,"2026-10-02","1D");assert.equal(current.at(-1).x,0);assert(current.every(p=>p.x<=0));assert.equal(math.comparisonPath(fixture,"1920-01-01","1D").length,0);
const zoom=math.zoomMarketDomain([10,30],.25,.713,0,100);assert(Math.abs(zoom[0]+.25*(zoom[1]-zoom[0])-15)<1e-10);assert(!Number.isInteger(zoom[0]));assert.equal(math.clampMarketDomain([0,0],-.5,.5)[1]-math.clampMarketDomain([0,0],-.5,.5)[0],.8);
console.log("Daily/weekly/monthly/quarter/half-year/year OHLCV, partial periods, missing data, anchor normalization and continuous domains: passed");
// Run the actual imperative renderer with a small DOM/canvas harness: gestures do not render React or fetch.
const events=new Map(),frames=new Map();let frameId=0;
const ctx=new Proxy({}, {get:(target,key)=>key==="measureText"?()=>({width:50}):target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
const canvas={style:{},dataset:{},width:0,height:0,focus(){},setPointerCapture(){},getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:400,left:0,top:0}),addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name)=>events.delete(name)};
const flush=()=>{for(const [id,fn] of frames){frames.delete(id);fn();}};
const canvasModule=module("src/lib/market-canvas.ts",{"./market-math":math,"./chart-domain":navigation},{document:{documentElement:{}},devicePixelRatio:1,getComputedStyle:()=>({fontFamily:"sans-serif",getPropertyValue:()=>"#50677e"}),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){}},MutationObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>1,clearTimeout(){}});
const realFixture=Array.from({length:500},(_,i)=>bar(new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),100+i,103+i,99+i,102+i));
const engine=new canvasModule.MarketCanvas(canvas,{}, {},{candles:math.aggregateBars(realFixture,"1D"),interval:"1D",range:"1Y",volume:false,regimes:[]},()=>{});flush();const initialDomain=canvas.dataset.domain;
let prevented=false;events.get("wheel")({deltaX:0,deltaY:12.7,deltaMode:0,clientX:400,preventDefault(){prevented=true;}});flush();assert.equal(prevented,false);assert.equal(canvas.dataset.domain,initialDomain);
events.get("wheel")({deltaX:0,deltaY:-12.7,deltaMode:0,ctrlKey:true,clientX:400,preventDefault(){prevented=true;}});flush();assert(prevented);assert.notEqual(canvas.dataset.domain,initialDomain);const zoomed=canvas.dataset.domain;
events.get("pointerdown")({button:0,clientX:400,pointerId:1});events.get("pointermove")({clientX:460,clientY:200});events.get("pointerup")({});flush();assert.notEqual(canvas.dataset.domain,zoomed);
const panned=canvas.dataset.domain;events.get("wheel")({deltaX:-35,deltaY:0,deltaMode:0,clientX:400,preventDefault(){}});flush();assert.notEqual(canvas.dataset.domain,panned);
events.get("dblclick")({});flush();assert.equal(canvas.dataset.domain,initialDomain);assert(Number(canvas.dataset.renderedCandles)<500);engine.destroy();assert.equal(events.size,0);
console.log("Actual canvas drag, trackpad pan, pinch-equivalent wheel zoom, normal page scroll, double-click reset, viewport-only drawing and cleanup: passed");
const mode={KANZQUANT_DATA_MODE:"demo"}, loader=module("src/lib/market-data.ts",{"server-only":{},react:{cache:fn=>fn},"@neondatabase/serverless":{neon:()=>{throw new Error("Unexpected database call");}},"./market-math":math},{process:{env:mode}});
await assert.rejects(loader.getMarketWindow(),/Real database/);mode.KANZQUANT_DATA_MODE="database";await assert.rejects(loader.getMarketWindow(),/Real database/);
if(!process.env.DATABASE_URL||process.env.KANZQUANT_DATA_MODE!=="database")throw new Error("Database-mode integration required");
const sql=neon(process.env.DATABASE_URL),base=process.env.FOCUS_TEST_URL??"http://127.0.0.1:3001";
for(const asset of math.assets){
 const response=await fetch(base+`/api/market?asset=${asset}`);assert.equal(response.status,200);const data=await response.json();assert.equal(data.asset,asset);assert(data.bars.length>500&&data.bars.length<1500);assert(data.bars.every(math.validBar));assert.equal(new Set(data.bars.map(b=>b.date)).size,data.bars.length);
 const [stored]=await sql`SELECT m.observed_at::text date,m.open,m.high,m.low,m.close,m.volume FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol=${asset} ORDER BY m.observed_at DESC LIMIT 1`;
 for(const key of ["open","high","low","close","volume"])assert.equal(data.bars.at(-1)[key],Number(stored[key]));assert.equal(data.bars.at(-1).date,stored.date);
 for(const interval of math.intervals){const candles=math.aggregateBars(data.bars,interval);assert(candles.every(math.validBar));const c=candles.at(-1),daily=data.bars.filter(b=>math.periodStart(b.date,interval)===c.date);assert.equal(c.open,daily[0].open);assert.equal(c.close,daily.at(-1).close);assert.equal(c.high,Math.max(...daily.map(b=>b.high)));assert.equal(c.low,Math.min(...daily.map(b=>b.low)));}
 console.log(`Real Neon ${asset}: ${data.bars.length} buffered daily rows; all six intervals verified`);
 const page=await fetch(base+`/focus/market?asset=${asset}`);assert.equal(page.status,200);const html=await page.text();assert(html.includes("data-market-chart"));assert(!html.includes('type="range"'));assert(!/>[^<]*(DEMO|SYNTHETIC)[^<]*</i.test(html));
}
for(const query of ["asset=UNKNOWN","asset=SPX&from=2026-02-30","asset=SPX&from=2030-01-01&to=2020-01-01"]){assert.equal((await fetch(base+"/api/market?"+query)).status,400);}
console.log("Database-only fail-closed, exact persisted OHLC, bounded payloads, three asset routes, no sliders/fake fallbacks and API validation: passed");
