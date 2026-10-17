import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {neon} from "@neondatabase/serverless";
const compiled=ts.transpileModule(readFileSync("src/lib/hypothesis-types.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(compiled,{exports,structuredClone});const {defaults,validateParameters,prefill,bhAdjust}=exports;
assert.throws(()=>validateParameters({...defaults,conditions:[{source:"password",metric:"level",op:"gt",threshold:0}]}));
assert.throws(()=>validateParameters({...defaults,conditions:Array(4).fill(defaults.conditions[0])}));
assert.throws(()=>validateParameters({...defaults,mode:"relationship",method:"Permutation"}));
assert.throws(()=>validateParameters({...defaults,seed:-1}));
assert.equal(prefill({source:"credit",metric:"3",horizon:"12"}).horizon,12);
assert.equal(prefill({source:"credit",metric:"level",op:"state",threshold:"Very low"}).conditions[0].threshold,"Very low");
assert.deepEqual(Array.from(bhAdjust([.01,.04,.03,.2])).map(x=>Number(x.toFixed(4))),[.04,.0533,.0533,.2]);
console.log("Input whitelist, bounds, AND limit, method/mode validation, prefill and FDR: passed");
const base=process.env.FOCUS_TEST_URL??"http://127.0.0.1:3001",sql=neon(process.env.DATABASE_URL);
const [before]=await sql`SELECT (SELECT count(*)::int FROM market_observations) markets,(SELECT count(*)::int FROM observations) macro,(SELECT count(*)::int FROM research_runs WHERE module='macro.research') source`;
const family="v0.2-verification-"+Date.now();
const internalHeaders={"Content-Type":"application/json",Authorization:`Bearer ${process.env.HYPOTHESIS_RUN_SECRET}`};
for(const route of ["prepare","run"]){assert.equal((await fetch(base+"/api/hypothesis/"+route,{method:"POST",body:JSON.stringify(defaults)})).status,403);assert.equal((await fetch(base+"/api/hypothesis/"+route,{method:"POST",headers:{Authorization:"Bearer invalid"},body:JSON.stringify(defaults)})).status,403);}
async function runViaApi(input){
 const prepStart=performance.now();const prep=await fetch(base+"/api/hypothesis/prepare",{method:"POST",headers:internalHeaders,body:JSON.stringify(input),signal:AbortSignal.timeout(60000)});
 assert.equal(prep.status,200,"Prepare must succeed without waiting for Python");const capability=await prep.json();const prepare_ms=Math.round(performance.now()-prepStart);
 assert(capability.run_id&&capability.execution_token&&capability.execution_url);assert(!("HYPOTHESIS_RUN_SECRET" in capability));
 const queued=await(await fetch(base+`/api/hypothesis/${capability.run_id}`)).json();assert.equal(queued.status,"queued");assert.equal(queued.result,null);
 const body=JSON.stringify({run_id:capability.run_id,token:capability.execution_token});
 const execStart=performance.now();const [execution,repeat]=await Promise.all([fetch(capability.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body,signal:AbortSignal.timeout(90000)}),fetch(capability.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body,signal:AbortSignal.timeout(90000)})]);
 assert([200,429].includes(execution.status));assert([200,429].includes(repeat.status));const replies=await Promise.all([execution.json(),repeat.json()]);assert(replies.some(r=>r.status==="complete"));assert(replies.filter(r=>r.status).every(r=>["running","complete"].includes(r.status)));
 const again=await(await fetch(capability.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body})).json();assert.equal(again.status,"complete");
 const [row]=await sql`SELECT (SELECT count(*)::int FROM research_results WHERE run_id=${capability.run_id}::uuid AND result_type='hypothesis') results,metadata->>'attempts' attempts FROM research_runs WHERE id=${capability.run_id}::uuid`;assert.equal(row.results,1);assert.equal(row.attempts,"1");
 const result=await(await fetch(base+`/api/hypothesis/${capability.run_id}`)).json();
 console.log("Prepare/execute timing: "+JSON.stringify({prepare_ms,execution_ms:Math.round(performance.now()-execStart),...replies.find(r=>r.timing)?.timing}));
 return result;
}
const requests=[
 {...defaults,horizon:1,spacing:3,family,conditions:[{source:"credit",metric:"3",op:"falling",threshold:0}]},
 {...defaults,mode:"relationship",method:"Regression",horizon:6,spacing:6,family,conditions:[{source:"credit",metric:"3",op:"below",threshold:10}]},
 {...defaults,family,asset:"GLD",conditions:[{source:"credit",metric:"level",op:"lt",threshold:-100}]},
 {...defaults,family,asset:"IEF",horizon:12,baseline:"full",conditions:[{source:"credit",metric:"3",op:"below",threshold:20},{source:"growth",metric:"level",op:"above",threshold:60}]},
];
const runs=[];
for(const input of requests){const start=performance.now();const result=await runViaApi(input);assert.equal(result.status,"complete");assert(result.result);assert.equal(result.metadata.data_mode,"database");assert(result.result.diagnostics.sample_dates.every(d=>d<=result.metadata.research_date));assert(result.result.cases.every(c=>Object.values(c.returns).every(v=>v===null||Number.isFinite(v))));
 console.log(`POST end-to-end: ${(performance.now()-start).toFixed(0)}ms`);
 const reopened=await (await fetch(base+`/api/hypothesis/${result.id}`)).json();assert.deepEqual(reopened.result,result.result);assert.equal(reopened.result.fingerprint,result.result.fingerprint);const page=await fetch(base+`/hypothesis/${result.id}`);assert.equal(page.status,200);const html=await page.text();assert(!html.includes("DEMO FEED"));
 // SVG title is raw text: multiple JSX children lose SSR content and break hydration.
 const chart=html.match(/<svg\b[^>]*aria-label="(?:Event and baseline forward-return histograms|Spaced observations and OLS fit line)"[\s\S]*?<\/svg>/)?.[0];
 if(chart){const titles=Array.from(chart.matchAll(/<title>([\s\S]*?)<\/title>/g),m=>m[1]);assert(titles.length);assert(titles.every(t=>!t.includes("<!--")&&(/event | · X /).test(t)),"SVG tooltips must SSR as complete single text nodes");}
 console.log(`${input.mode} ${input.asset} ${input.horizon}M: N=${result.result.summary.event?.n??result.result.summary.n}, ${result.result.summary.status}; ${(performance.now()-start).toFixed(0)}ms incl. reopen/page; RUN ${result.id}`);runs.push(result);
}
assert.equal(runs[0].result.summary.status,"COMPLETE");assert.equal(runs[1].result.summary.status,"COMPLETE");assert.equal(runs[2].result.summary.status,"INSUFFICIENT SAMPLE");assert.equal(runs[2].result.summary.p,null);
const retry=await runViaApi(requests[0]);assert.deepEqual(retry.result,runs[0].result);assert.notEqual(retry.id,runs[0].id);
const adjusted=await (await fetch(base+`/api/hypothesis/${runs[0].id}`)).json();assert.equal(adjusted.family_count,5);assert(adjusted.adjusted_p>=adjusted.result.summary.p);
const reusedResponse=await fetch(base+"/api/hypothesis/prepare",{method:"POST",headers:{...internalHeaders,"X-KanzQuant-Reuse":"dataset"},body:JSON.stringify(requests[0])});assert.equal(reusedResponse.status,200);assert.equal((await reusedResponse.json()).run_id,retry.id,"Controlled reruns reuse the same frozen definition and data");
const recent=await (await fetch(base+"/api/hypothesis/recent")).json();assert(recent.some(r=>r.id===runs[2].id));
assert.equal((await fetch(base+"/api/hypothesis/run",{method:"POST",headers:internalHeaders,body:JSON.stringify({...defaults,asset:"FAKE"})})).status,400);
assert.equal((await fetch(base+"/api/hypothesis/run",{method:"POST",headers:{...internalHeaders,Origin:"https://untrusted.example"},body:JSON.stringify(defaults)})).status,403);
assert.equal((await fetch(base+"/api/hypothesis/not-a-uuid")).status,404);
const [after]=await sql`SELECT (SELECT count(*)::int FROM market_observations) markets,(SELECT count(*)::int FROM observations) macro,(SELECT count(*)::int FROM research_runs WHERE module='macro.research') source`;assert.deepEqual(before,after);
console.log("Real persisted targets, all four horizons via robustness, small-sample/null ledger, AND, shared-baseline handling, exact reopening/repetition, family FDR, API rejection and unchanged unrelated data: passed");
console.log("INSPECTION CONDITIONAL "+runs[0].id+" RELATIONSHIP "+runs[1].id);
