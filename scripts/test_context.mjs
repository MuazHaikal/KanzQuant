import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {neon} from "@neondatabase/serverless";
function module(file,dependencies={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Number,Math,Map,require:name=>{if(dependencies[name])return dependencies[name];throw new Error("Unexpected test import: "+name);}});
 return exports;
}
const math=module("src/lib/focus-math.ts"),ctx=module("src/lib/factor-context.ts",{"./focus-math":math}),chart=module("src/lib/chart-domain.ts");
assert.equal(ctx.levelPercentile([1,2,2,4],2),62.5);
assert.equal(ctx.levelPercentile([],2),null);
assert.equal(ctx.levelPercentile([NaN],2),null);
assert.equal(ctx.historicalPercentile(Array(36).fill(0),0),50);
assert.equal(ctx.historicalPercentile(Array(35).fill(0),3),null);
assert.equal(ctx.historicalPercentile(Array(36).fill(0),3),100);
for(const [p,label] of [[null,"N/A"],[74.99,"Typical"],[75,"Notable"],[89.99,"Notable"],[90,"Unusual"],[98.99,"Unusual"],[99,"Extreme"]])assert.equal(ctx.moveClassification(p),label);
const points=Array.from({length:60},(_,i)=>({date:new Date(Date.UTC(2020, i+1, 0)).toISOString().slice(0,10),value:i}));
for(const horizon of [1,3,12]){const move=ctx.movement(points,horizon,points.at(-1).date);assert.equal(move.change,horizon);assert.equal(move.percentile,50);assert.equal(move.n,59-horizon);assert.equal(move.classification,"Typical");}
const gap=[{date:"2024-01-31",value:1},{date:"2024-03-31",value:5}];
assert.equal(ctx.changeSeries(gap,1).length,0);assert.equal(ctx.changeSeries(gap,2)[0].value,4);assert.equal(ctx.changeSeries(gap,0).length,0);
assert.equal(ctx.movement(points.slice(0,12),12,points[11].date).change,null);
assert.equal(ctx.movement(points,3,"1900-01-31").percentile,null);
const before=ctx.movement(points,3,points[45].date),after=ctx.movement([...points,{date:"2040-01-31",value:999}],3,points[45].date);assert.equal(before.percentile,after.percentile);assert.equal(before.n,after.n);
assert.equal(ctx.trendContext(points,points.at(-1).date).label,"Rising slower");
assert.equal(ctx.levelState(3),"Very low");assert.equal(ctx.levelState(100),"Very high");assert.equal(ctx.levelState(null),"N/A");
const zoom=chart.zoomDomain([0,238],.25,.333,238);assert(Math.abs((zoom[0]+(zoom[1]-zoom[0])*.25)-59.5)<1e-9);assert(!Number.isInteger(zoom[0]));
assert.equal(chart.wheelIntent(0,12.7,0),"scroll");assert.equal(chart.wheelIntent(0,120,0),"zoom");assert.equal(chart.wheelIntent(0,-1585.7,0),"zoom");assert.equal(chart.wheelIntent(0,12.7,0,true),"zoom");assert.equal(chart.wheelIntent(12.7,0,0),"pan");
const panned=chart.panDomain(zoom,1.27,238);assert(Math.abs(panned[0]-zoom[0]-1.27)<1e-9);
assert.equal(chart.panDomain([10,20],-100,238)[0],0);assert.equal(chart.panDomain([10,20],1000,238)[1],238);
assert.equal(chart.zoomDomain([0,238],.5,.00001,238)[1]-chart.zoomDomain([0,238],.5,.00001,238)[0],5);
assert.equal(chart.clampDomain([0,238],238)[1],238);assert.equal(chart.clampDomain([0,0],0)[1],0);
console.log("Level ranks, same-horizon movement ranks, ties, missing calendar history, no future leakage, continuous pan/zoom and boundaries: passed");
if(!process.env.DATABASE_URL||process.env.KANZQUANT_DATA_MODE!=="database")throw new Error("Real database mode required");
const sql=neon(process.env.DATABASE_URL);
const rows=await sql`SELECT rr.payload FROM research_results rr JOIN research_runs r ON r.id=rr.run_id WHERE r.status='complete' AND r.module='macro.research' AND rr.result_type='snapshot' AND rr.result_key='latest' ORDER BY r.completed_at DESC LIMIT 1`;
const data=rows[0].payload;assert.equal(data.methodology.data_mode,"database");
for(const factor of math.factors){const c=ctx.factorContext(data,factor);assert(c.history.length>120);assert(Math.abs(c.current-data.state_rows.find(r=>r.label.toLowerCase()===factor).z)<.0002);assert(Math.abs(c.drivers.reduce((s,d)=>s+d.contribution,0)-c.moves[1].change)<1e-9);for(const m of c.moves)assert(m.percentile!==null&&m.n>=36);console.log(`${factor}: level P${c.percentile.toFixed(1)}, 3M ${c.moves[1].classification}, prior N=${c.moves[1].n}; exact contribution sum verified`);}
const missing=ctx.factorContext({...data,state_vectors:[]},"growth");assert.equal(missing.current,null);assert.equal(missing.moves[1].percentile,null);
const base=process.env.FOCUS_TEST_URL??"http://localhost:3001";
for(const route of ["/","/focus/factor/growth?match=move"]){const response=await fetch(base+route),html=await response.text();assert.equal(response.status,200);assert(!html.includes('type="range"'));assert(html.includes("FRED · YAHOO FINANCE · NEON"));assert(html.includes("kanzquant.theme.v1"));assert(!/>[^<]*(DEMO|SYNTHETIC)[^<]*</i.test(html));}
console.log("Database-backed context, contribution identities, Overview, change-episode deep link and no sliders: passed");
