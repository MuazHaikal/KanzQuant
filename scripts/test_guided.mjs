import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url);
function module(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Number,Math,Map,Set,Date,URLSearchParams,structuredClone,require:n=>deps[n]??require(n)});return exports;}
const math=module("src/lib/focus-math.ts"),context=module("src/lib/factor-context.ts",{"./focus-math":math}),hyp=module("src/lib/hypothesis-types.ts"),guided=module("src/lib/guided-research.ts",{"./focus-math":math,"./factor-context":context,"./hypothesis-types":hyp}),market=module("src/lib/market-math.ts"),explorer=module("src/lib/chart-explorer.ts",{"./market-math":market});
const guide=module("src/lib/research-guide.ts"), memory=new Map(), storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
assert.equal(guide.shouldShowGuide(storage),true);guide.dismissGuide(storage);assert.equal(guide.shouldShowGuide(storage),false);assert.equal(memory.get(guide.guideKey),"dismissed");assert.equal(guide.shouldShowGuide({getItem:()=>{throw Error("blocked");}}),false);
for(const [direction,intensity,threshold] of [[-1,99,10],[-1,90,10],[-1,89,20],[1,99,90],[1,90,90],[1,75,80]])assert.equal(guided.thresholdFor(direction,intensity),threshold);
assert.equal(guided.defaultHorizon,6);assert.deepEqual(Array.from(guided.relationships.liquidity),["SPX","volatility","IEF"]);
for(const preset of guided.presets){const p=guided.guidedParameters(preset,"GLD");assert.equal(p.horizon,6);assert.equal(p.asset,"GLD");assert.equal(p.method,"Automatic");assert.equal(p.alternative,"two-sided");assert.equal(p.seed,42);hyp.validateParameters(p);assert.equal(p.conditions[0].threshold,preset.threshold);assert.equal(p.spacing,hyp.defaults.spacing);}
assert.equal(guided.guidedParameters(guided.presets[0],"SPX",999).horizon,6);
const selected=guided.prefilledCondition({...guided.presets[2],metric:"level",op:"above",threshold:80},guided.guidedParameters(guided.presets[2]));const retargeted=guided.guidedParameters(selected,"IEF");assert.equal(retargeted.conditions[0].op,"below");assert.equal(retargeted.conditions[0].threshold,10);assert.equal(retargeted.conditions[0].metric,"3");
const catalog=[{id:"SPX",displayName:"S&P 500"},{id:"rates",displayName:"Rates"},{id:"CPIAUCSL",displayName:"Consumer Price Index"}];
const state=explorer.parseExplorer({series:"SPX,rates,CPIAUCSL,unknown,SPX",range:"10Y",interval:"1M",mode:"context",date:"2022-03-31"},catalog);
assert.deepEqual(Array.from(state.series),["SPX","rates","CPIAUCSL"]);assert.equal(state.range,"10Y");assert.equal(state.date,"2022-03-31");assert.equal(state.comparison,"separate");
const parsed=Object.fromEntries(new URLSearchParams(explorer.explorerQuery(state)));assert.equal(explorer.parseExplorer(parsed,catalog).date,state.date);
assert.equal(explorer.parseExplorer({series:"bad",range:"bad",interval:"bad",date:"bad"},catalog).series[0],"SPX");
assert.equal(explorer.validChartDate("2022-02-31"),false);assert.equal(explorer.validChartDate("2024-02-29"),true);assert.equal(explorer.parseExplorer({date:"2022-02-31"},catalog).date,"");
const points=[{date:"2022-02-28",value:2},{date:"2022-03-31",value:3},{date:"2022-04-30",value:4}];
assert.equal(explorer.latestAt(points,"2022-03-15").value,2);assert.equal(explorer.latestAt(points,"2022-01-31"),undefined);assert.equal(explorer.latestAt(points,"2022-03-31").value,3);
assert.equal(explorer.availableDate("2022-01-01","Monthly"),"2022-02-28");assert.equal(explorer.availableDate("2022-02-01","Monthly"),"2022-03-31");assert.equal(explorer.availableDate("2022-01-01","Quarterly"),"2022-04-30");assert.equal(explorer.availableDate("2022-03-15","Daily"),"2022-03-31");
assert.equal(explorer.intervalPoints({id:"rates",points},"3M")[0].date,"2022-03-31");assert.equal(explorer.intervalPoints({id:"rates",points},"1D").length,3);assert.equal(explorer.latestAt([{date:"2006-11-30",value:0}],"2006-11-29"),undefined);
assert.equal(explorer.normalize(points,"2022-03-01","2022-04-30")[0].value,100);assert.equal(explorer.normalize([{date:"2022-03-31",value:0}],"2022-01-01","2022-12-31").length,0);
const restored=explorer.restoreViews(JSON.stringify([{id:"example",name:"S&P + Rates",state}]),catalog);assert.equal(restored[0].state.series.length,3);assert.equal(restored[0].state.range,"10Y");assert.equal(explorer.restoreViews("not JSON",catalog).length,0);
if(process.env.FOCUS_TEST_URL){const base=process.env.FOCUS_TEST_URL;for(const route of ["/hypothesis","/hypothesis?mode=build","/guide","/chart?series=SPX,rates,inflation&mode=context&range=10Y&date=2022-03-31"]){const r=await fetch(base+route);assert.equal(r.status,200,route);const html=(await r.text()).replaceAll("&amp;","&");assert(!html.includes("DEMO FEED"));assert(html.includes("v0.3.1"));if(route.startsWith("/chart"))for(const name of ["S&P 500","Federal Funds Rate","10-Year Treasury Yield","Consumer Price Index"])assert(html.includes(name),name);console.log("PASS "+route);}
const r=await fetch(base+"/api/chart?series=CPIAUCSL&from=2022-01-01&to=2022-12-31");assert.equal(r.status,200);const result=await r.json();assert(result.points.length>0);assert(result.points.every(p=>p.date>="2022-01-01"&&p.date<="2022-12-31"));assert.equal((await fetch(base+"/api/chart?series=invalid")).status,400);assert.equal((await fetch(base+"/api/chart?series=SPX&from=2022-02-31&to=2022-03-31")).status,400);console.log("Selected real chart series API and invalid selection checks passed");}
console.log("Guided relationship map, fixed thresholds/horizons, method preservation, Explorer URL state, prior-only date lookup, release availability, normalized base and saved views passed.");
