import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const compiled=ts.transpileModule(readFileSync("src/lib/hypothesis-client.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const id="11111111-1111-4111-8111-111111111111";
async function scenario(kind){
 let clock=100000,prepares=0,executes=0,polls=0,prepared=null;const phases=[],seen=[];
 const fetch=async(url,options)=>{
  if(url==="/api/hypothesis/prepare"){prepares++;return {ok:true,json:async()=>({run_id:id,execution_url:"https://research.example/v1/hypothesis/run",execution_token:"test-capability",expires_at:"unused"})};}
  if(url.startsWith("https://")){executes++;const body=JSON.parse(options.body);assert.equal(body.run_id,id);assert.equal(body.token,"test-capability");throw new Error("Simulated response loss");}
  polls++;
  if(kind==="unreachable-result")throw new Error("Simulated database read interruption");
  let status=kind==="cold-retry"?(polls<8?"queued":polls===8?"running":"complete"):kind==="resume-running"?(polls<3?"running":"complete"):polls===1?"queued":polls===2?"running":"complete";
  return {ok:true,json:async()=>({id,status,metadata:{claimed_at:new Date(clock).toISOString()},result:status==="complete"?{summary:{}}:null})};
 };
 const exports={};
 vm.runInNewContext(compiled,{exports,fetch,Date:class extends Date{static now(){return clock;}},AbortSignal,DOMException,setTimeout:callback=>{queueMicrotask(()=>{clock+=2000;callback();});return 1;},clearTimeout:()=>{}});
 const operation=exports.executeResearch({run_id:id},new AbortController().signal,p=>phases.push(p),run=>seen.push(run.status),runId=>{prepared=runId;});
 if(kind==="unreachable-result")await assert.rejects(operation,/Retry this saved run/);else assert.equal((await operation).status,"complete");
 assert.equal(prepares,1);assert.equal(prepared,id);
 if(kind==="resume-running")assert.equal(executes,0);
 if(kind==="lost-response")assert.equal(executes,1);
 if(kind==="cold-retry")assert.equal(executes,2);
 assert(phases.every(p=>["PREPARING","STARTING RESEARCH ENGINE","RUNNING TEST"].includes(p)));
 if(kind!=="unreachable-result")assert(seen.includes("running")&&seen.includes("complete"));
}
for(const kind of ["lost-response","cold-retry","resume-running","unreachable-result"])await scenario(kind);
console.log("Browser execution state machine: cold-start retry, lost-response polling, running-run resume and prepared-ID preservation all passed; no duplicate preparation or fake progress.");
