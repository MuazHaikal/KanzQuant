import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {neon} from "@neondatabase/serverless";
const source=readFileSync("src/lib/focus-math.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exports={};vm.runInNewContext(compiled,{exports,Date,Number,Math,Map});
const {axis,isFactor,isHorizon,validDate,stats,returnAt,episodes,factorHistory,normalizedPath,cosine}=exports;
assert(isFactor("credit"));assert(!isFactor("unknown"));assert(isHorizon("12m"));assert(!isHorizon("2m"));
assert(validDate("2024-02-29"));assert(!validDate("2024-02-30"));assert(!validDate("9999-99-99"));assert(!validDate("today"));
assert.equal(axis({baa_10y_spread:1.2},"credit"),1.2);assert.equal(axis({},"credit"),null);
assert.equal(axis({cpi_yoy:1,core_cpi_yoy:2,pce_yoy:3},"inflation"),2);
assert.equal(stats([]).median,null);assert.equal(stats([1,2,3]).median,2);assert.equal(stats([1,2,3]).std,1);
assert.equal(returnAt([{date:"2020-01-31",value:100},{date:"2020-02-29",value:110}],"2020-01-31",1,"2020-02-29"),10.000000000000009);
assert.equal(returnAt([],"2020-01-31",3,"2021-01-31"),null);assert.equal(normalizedPath([],"2020-01-31","2021-01-31").length,0);
assert.equal(returnAt([{date:"2020-01-31",value:100},{date:"2020-03-31",value:110}],"2020-01-31",1,"2020-03-31"),null);
assert.equal(factorHistory({state_vectors:[]},"credit").length,0);
assert.equal(cosine({a:1,b:0},{a:1,b:0},["a","b"]),1);
console.log("Focus math / validation / missing-data checks passed");
const focusSource=readFileSync("src/lib/focus-data.ts","utf8");
const focusCompiled=ts.transpileModule(focusSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const isolated={};const testEnv={KANZQUANT_DATA_MODE:"demo"};
vm.runInNewContext(focusCompiled,{exports:isolated,process:{env:testEnv},require(name){
 if(name==="server-only")return {};
 if(name==="react")return {cache:fn=>fn};
 if(name==="./research-data")return {getResearchSnapshot:async()=>({state_vectors:[]})};
 if(name==="@neondatabase/serverless")return {neon:()=>{throw new Error("Unexpected database call");}};
 throw new Error("Unexpected module");
}});
await assert.rejects(isolated.getFocusData(),/requires real database/);
testEnv.KANZQUANT_DATA_MODE="database";
await assert.rejects(isolated.getFocusData(),/state vectors unavailable/);
console.log("Demo mode and missing persisted vectors fail closed without fallback");
if(!process.env.DATABASE_URL||process.env.KANZQUANT_DATA_MODE!=="database")throw new Error("Database-mode integration environment required");
const sql=neon(process.env.DATABASE_URL);
const rows=await sql`SELECT rr.payload FROM research_results rr JOIN research_runs r ON r.id=rr.run_id
 WHERE r.status='complete' AND r.module='macro.research' AND rr.result_type='snapshot' AND rr.result_key='latest'
 ORDER BY r.completed_at DESC LIMIT 1`;
const snapshot=rows[0]?.payload;assert.equal(snapshot?.methodology.data_mode,"database");assert(snapshot.state_vectors.length>120);
for(const factor of exports.factors){const history=factorHistory(snapshot,factor),row=snapshot.state_rows.find(r=>r.label.toLowerCase()===factor);assert(history.length>120);assert(Math.abs(history.at(-1).value-row.z)<.0002);const selected=episodes(history,snapshot.as_of);assert.equal(selected.length,10);const months=d=>Number(d.slice(0,4))*12+Number(d.slice(5,7));for(const a of selected){assert(months(snapshot.as_of)-months(a.date)>12);for(const b of selected)if(a!==b)assert(Math.abs(months(a.date)-months(b.date))>=9);}}
console.log("All six factor mappings match the real persisted research; episode spacing passed");
const base=process.env.FOCUS_TEST_URL??"http://127.0.0.1:3001";
const routes=[...exports.factors.map(f=>"/focus/factor/"+f),...exports.horizons.map(h=>"/focus/returns/"+h),"/focus/market","/focus/regime","/focus/analogue/"+snapshot.neighbours[0].date];
for(const route of routes){const response=await fetch(base+route),html=await response.text();assert.equal(response.status,200,route);assert(html.includes("FOCUS MODE"),route);assert(!html.includes("<title></title>"),route+" empty SVG title");assert(!/>[^<]*(DEMO|SYNTHETIC)[^<]*</i.test(html),route);console.log("PASS "+route);}
for(const route of ["/focus/factor/fake","/focus/returns/2m","/focus/analogue/2024-02-30","/focus/analogue/9999-99-99","/focus/analogue/1900-01-31"]){assert.equal((await fetch(base+route)).status,404,route);}
console.log("Invalid routes return 404; database-mode focus integration passed");
