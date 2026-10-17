import assert from "node:assert/strict";
import {createHmac,randomUUID} from "node:crypto";
import {neon} from "@neondatabase/serverless";
const base=process.env.FOCUS_TEST_URL??"http://127.0.0.1:3001",sql=neon(process.env.DATABASE_URL);
const parameters={mode:"conditional",conditions:[{source:"credit",metric:"3",op:"falling",threshold:0}],asset:"SPX",horizon:1,spacing:3,baseline:"others",method:"Automatic",alternative:"two-sided",label:"EXPLORATORY",family:"service-failure-verification-"+Date.now(),seed:42};
const internalHeaders={"Content-Type":"application/json",Authorization:`Bearer ${process.env.HYPOTHESIS_RUN_SECRET}`};
const prep=await fetch(base+"/api/hypothesis/prepare",{method:"POST",headers:internalHeaders,body:JSON.stringify(parameters)});assert.equal(prep.status,200);const capability=await prep.json();
const post=(body,origin)=>fetch(capability.execution_url,{method:"POST",headers:{"Content-Type":"application/json",...(origin?{Origin:origin}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
const tokenFor=(id,expires)=>`v1.${expires}.`+createHmac("sha256",process.env.HYPOTHESIS_RUN_SECRET).update(`kanzquant.hypothesis.v1\n${id}\n${expires}`).digest("base64url");
const body={run_id:capability.run_id,token:capability.execution_token};
assert.equal((await post({run_id:body.run_id})).status,400);
assert.equal((await post({...body,token:"invalid"})).status,401);
// A remote host can be seconds behind the test machine; exact expiry boundaries
// are covered with an injected clock in Python, while this is unambiguously expired.
assert.equal((await post({...body,token:tokenFor(body.run_id,Math.floor(Date.now()/1000)-600)})).status,401);
assert.equal((await post({...body,run_id:randomUUID()})).status,401);
assert.equal((await post({...body,token:body.token.slice(0,-1)+(body.token.endsWith("A")?"B":"A")})).status,401);
const unknown=randomUUID();assert.equal((await post({run_id:unknown,token:tokenFor(unknown,Math.floor(Date.now()/1000)+240)})).status,404);
assert.equal((await post({...body,python:"arbitrary-code"})).status,400);
assert.equal((await post(body,"https://untrusted.example")).status,403);
console.log("Real API unsigned/invalid/expired/tampered/swapped/unknown/code and origin rejection: passed");
// Mutate only this suite's newly created queued run to exercise a real persisted failure.
const [before]=await sql`SELECT metadata FROM research_runs WHERE id=${body.run_id}::uuid AND module='hypothesis.lab'`;
await sql`UPDATE research_runs SET metadata=jsonb_set(metadata,'{dataset_hash}',${JSON.stringify("0".repeat(64))}::jsonb) WHERE id=${body.run_id}::uuid AND status='queued'`;
try{
 const failed=await(await post(body)).json();assert.equal(failed.status,"failed");
 const saved=await(await fetch(base+`/api/hypothesis/${body.run_id}`)).json();assert.equal(saved.status,"failed");assert.equal(saved.result,null);assert.equal(saved.metadata.error,"Research computation or persistence failed. Retry this saved run.");
 const health=await fetch(new URL("/healthz",capability.execution_url));assert.equal(health.status,200);
}finally{
 await sql`UPDATE research_runs SET metadata=jsonb_set(metadata,'{dataset_hash}',${JSON.stringify(before.metadata.dataset_hash)}::jsonb) WHERE id=${body.run_id}::uuid AND module='hypothesis.lab'`;
}
const renewed=await(await fetch(base+"/api/hypothesis/prepare",{method:"POST",headers:internalHeaders,body:JSON.stringify({run_id:body.run_id})})).json();assert.equal(renewed.run_id,body.run_id);
const completed=await(await post({run_id:body.run_id,token:renewed.execution_token})).json();assert.equal(completed.status,"complete");
const [after]=await sql`SELECT status,metadata->>'attempts' attempts,(SELECT count(*)::int FROM research_results WHERE run_id=${body.run_id}::uuid AND result_type='hypothesis') results FROM research_runs WHERE id=${body.run_id}::uuid`;
assert.equal(after.status,"complete");assert.equal(after.attempts,"2");assert.equal(after.results,1);
console.log("Neon running→failed, sanitized persisted error, healthy service, renewed same-ID retry→complete with one result: passed; RUN "+body.run_id);
