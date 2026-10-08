import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require=createRequire(import.meta.url);
function module(path, dependencies={}) {
  const exports={};
  const code=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,Number,Math,Map,require:name=>dependencies[name]??require(name)});
  return exports;
}
const math=module("src/lib/focus-math.ts");
const context=module("src/lib/factor-context.ts",{"./focus-math":math});
const ui=module("src/components/visual-research.tsx",{"@/lib/factor-context":context,"@/lib/focus-math":math,"next/link":{default:({href,children,...props})=>React.createElement("a",{href,...props},children)}});
const render=(name,props)=>renderToStaticMarkup(React.createElement(ui[name],props));

for(const [p,label] of [[0,"Very low"],[10,"Very low"],[10.01,"Low"],[25,"Low"],[25.01,"Normal"],[74.99,"Normal"],[75,"High"],[89.99,"High"],[90,"Very high"],[99,"Very high"],[100,"Very high"],[null,"N/A"],[NaN,"N/A"]]) {
  assert.equal(ui.positionLabel(p),label);
  const html=render("HistoricalPositionBar",{percentile:p,value:.56});
  assert(html.includes(label));assert(!html.includes("NaN"));assert(!html.includes("probability score"));
  if(p==null||Number.isNaN(p))assert(!html.includes('class="scale-marker"'));
}
for(const [p,label] of [[74.99,"Typical"],[75,"Notable"],[89.99,"Notable"],[90,"Unusual"],[98.99,"Unusual"],[99,"Extreme"],[100,"Extreme"],[null,"N/A"],[NaN,"N/A"]]) {
  const html=render("MoveIntensityBar",{percentile:p,change:-.2});
  assert(html.includes(label));assert(!html.includes("NaN"));
  if(p!=null&&!Number.isNaN(p))assert(html.includes("↓")&&html.includes("decline"));
}
assert(render("MoveIntensityBar",{percentile:99,change:null}).includes("N/A"));
assert(render("MoveIntensityBar",{percentile:50,change:0}).includes("unchanged"));
for(const evidence of ["INSUFFICIENT","WEAK","MODERATE","STRONG",null,"UNSUPPORTED"]) {
  const html=render("EvidenceMeter",{evidence});
  assert(html.includes(`${["INSUFFICIENT","WEAK","MODERATE","STRONG"].includes(evidence)?evidence:"INSUFFICIENT"} EVIDENCE`));
  assert.equal((html.match(/class="selected"/g)??[]).length,1);assert(!/\d+% evidence/.test(html));
}
const p={mode:"conditional",conditions:[{source:"credit",metric:"3",op:"below",threshold:10},{source:"growth",metric:"level",op:"above",threshold:60}],asset:"SPX",horizon:6,baseline:"others"};
const builder=render("ConditionalDiagram",{parameters:p});
assert(builder.includes("AND · ALL CONDITIONS"));assert(builder.includes("CREDIT · 3M change · below P10"));assert(builder.includes("GROWTH · level · above P60"));assert(builder.includes("SPX")&&builder.includes("6M"));assert(!builder.includes("EVENT PERIODS"));
const summary={event:{n:24,mean:1.7},control:{n:188,mean:5.6},baseline:{n:188,mean:5.6},difference:-3.9};
const result=render("ConditionalDiagram",{parameters:p,summary});
assert(result.includes("EVENT PERIODS")&&result.includes("OTHER PERIODS"));assert(result.includes("N=24")&&result.includes("N=188"));assert(result.includes("+1.70%")&&result.includes("+5.60%")&&result.includes("-3.90 pp"));
const full=render("ConditionalDiagram",{parameters:{...p,baseline:"full"},summary:{...summary,baseline:{n:212,mean:5.16}}});
assert(full.includes("FULL HISTORICAL SAMPLE")&&full.includes("overlapping groups, not independent"));assert(full.includes("+5.16%")&&full.includes("N=212"));assert(!full.includes("+5.60%"));
assert(render("ConditionalDiagram",{parameters:{...p,mode:"relationship",conditions:p.conditions.slice(0,1)}}).includes("SPACED PAIRED OBSERVATIONS"));
const hist=render("DistributionStrip",{values:[0,0,0,0,0,10],current:10});
assert(hist.includes("6 observations"));assert(hist.includes("5 observations"));assert(!hist.includes("NaN"));assert(!hist.includes("<title></title>"));
assert(render("DistributionStrip",{values:[NaN]}).includes("N=0"));
const effect=render("EffectIntervals",{rows:[{label:"Difference",value:-3,ci:[-5,-1],n:24},{label:"Missing",value:null,ci:null,n:0}]});
assert(effect.includes("0 · no difference")&&effect.includes("−5.60 pp")&&effect.includes("+5.60 pp"));assert(effect.includes("95% CI")&&effect.includes("CI N/A"));assert(!effect.includes("NaN"));
const outcomes=render("OutcomeHorizonTiles",{items:[{horizon:"1m",median:null,hit:null,n:0}]});
assert(outcomes.includes("N/A")&&outcomes.includes("N=0"));assert(!outcomes.includes("NaN"));
assert(render("ContributionBars",{rows:[{name:"Missing",value:null},{name:"Zero",value:0}]}).includes("N/A"));
console.log("Visual components: position P10/P25/P75/P90/P99, move boundaries/direction, categorical evidence, AND merge, exact group means, overlapping full baseline, empirical bins, symmetric CI, missing data and SSR accessibility passed.");
