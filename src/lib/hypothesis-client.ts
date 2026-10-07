import type { HypothesisRun } from "./hypothesis-types";
type Capability={run_id:string;execution_url:string;execution_token:string;expires_at:string};
export type ResearchPhase="PREPARING"|"STARTING RESEARCH ENGINE"|"RUNNING TEST";
const pause=(signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException("Aborted","AbortError"));};const timer=setTimeout(()=>{signal.removeEventListener("abort",abort);resolve();},2000);signal.addEventListener("abort",abort,{once:true});});
export async function executeResearch(input:unknown,signal:AbortSignal,onPhase:(phase:ResearchPhase)=>void,onRun:(run:HypothesisRun)=>void,onPrepared:(id:string)=>void){
 onPhase("PREPARING");
 const preparation=await fetch("/api/hypothesis/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});
 const capability=await preparation.json() as Capability&{error?:string};
 if(!preparation.ok)throw new Error(capability.error??"Run could not be prepared.");
 signal.throwIfAborted();onPrepared(capability.run_id);
 const deadline=Date.now()+240000;let attempts=0,lastAttempt=0,inFlight=false;
 // Poll first on every retry: a lost response does not mean compute failed.
 while(Date.now()<deadline){
  signal.throwIfAborted();
  let run:HypothesisRun|null=null;
  try{const response=await fetch(`/api/hypothesis/${capability.run_id}`,{cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});if(response.ok)run=await response.json();}catch{signal.throwIfAborted();}
  if(run){
   signal.throwIfAborted();
   onRun(run);
   if(run.status==="complete")return run;
   if(run.status==="failed"&&attempts>0)throw new Error("TEST FAILED · Retry this saved run.");
   onPhase(run.status==="running"?"RUNNING TEST":"STARTING RESEARCH ENGINE");
   const stale=run.status==="running"&&Date.now()-Date.parse(String(run.metadata.claimed_at))>180000;
   if((run.status==="queued"||run.status==="failed"||stale)&&!inFlight&&attempts<3&&Date.now()-lastAttempt>10000){
    inFlight=true;attempts++;lastAttempt=Date.now();
    // Direct browser request; Vercel is never held open waiting for a cold Python service.
    void fetch(capability.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run_id:capability.run_id,token:capability.execution_token}),signal:AbortSignal.any([signal,AbortSignal.timeout(90000)])}).catch(()=>{/* Neon polling determines whether execution started. */}).finally(()=>{inFlight=false;});
   }
  }
  await pause(signal);
 }
 throw new Error("Engine has not responded yet. Retry this saved run; no duplicate test will be created.");
}
