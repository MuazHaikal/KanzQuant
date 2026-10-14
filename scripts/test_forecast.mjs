import assert from "node:assert/strict";
const base=process.env.FOCUS_TEST_URL??"http://127.0.0.1:3001";
async function json(path,body){const r=await fetch(base+path,body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)}:{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.json();}
for(const [series,horizon] of [["DGS10",6],["SPX",6],["inflation",3],["GDPC1",6]]){
 const started=performance.now(),specification={series,horizon,confidence:95,training_start:""};
 const ticket=await json("/api/forecast/prepare",{specification});
 const preparedAt=performance.now();
 const unauthorized=await fetch(ticket.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run_id:ticket.run_id,token:"invalid-token"})});assert.equal(unauthorized.status,401);
 const response=await fetch(ticket.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run_id:ticket.run_id,token:ticket.execution_token}),signal:AbortSignal.timeout(90000)});
 assert.equal(response.status,200);const execution=await response.json();assert.equal(execution.status,"complete",JSON.stringify(execution));
 const executedAt=performance.now(); const saved=await json("/api/forecast/"+ticket.run_id);const readyAt=performance.now();assert.equal(saved.result.engine,"forecast-0.4.0");assert.equal(saved.result.status,"COMPLETE");assert.equal(saved.parameters.series,series);assert.equal(saved.parameters.horizon,horizon);
 assert.equal(saved.result.models.length,3);assert(saved.result.models[0].metrics.n>=6);
 for(const model of saved.result.models){assert(model.rows.every(r=>r.origin<r.date));for(const row of model.rows){const months=(Number(row.date.slice(0,4))-Number(row.origin.slice(0,4)))*12+Number(row.date.slice(5,7))-Number(row.origin.slice(5,7));assert.equal(months,horizon);}}
 const original=JSON.stringify(saved.result),again=await json("/api/forecast/"+ticket.run_id);assert.equal(JSON.stringify(again.result),original);
 const renew=await json("/api/forecast/prepare",{run_id:ticket.run_id});assert.equal(renew.run_id,ticket.run_id);
 const retry=await fetch(renew.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run_id:renew.run_id,token:renew.execution_token})});assert.equal((await retry.json()).status,"complete");assert.equal(JSON.stringify((await json("/api/forecast/"+ticket.run_id)).result),original);
 const page=await fetch(base+"/research/forecast/"+ticket.run_id);assert.equal(page.status,200);assert((await page.text()).includes("MODEL DETAILS"));
 console.log(JSON.stringify({series,horizon,id:ticket.run_id,status:saved.result.status,conclusion:saved.result.conclusion,lowest:saved.result.lowest_tested,workflow_ms:Math.round(readyAt-started),prepare_ms:Math.round(preparedAt-started),execute_ms:Math.round(executedAt-preparedAt),compute:saved.result.timing,execution:execution.timing,total_ms:Math.round(performance.now()-started),models:saved.result.models.map(m=>({name:m.name,n:m.metrics.n,rmse_delta:m.metrics.rmse_delta,status:m.status}))}));
}
const short=await json("/api/forecast/prepare",{specification:{series:"DGS10",horizon:12,confidence:95,training_start:"2025-01-01"}});await fetch(short.execution_url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run_id:short.run_id,token:short.execution_token})});assert.equal((await json("/api/forecast/"+short.run_id)).result.status,"INSUFFICIENT HISTORY");console.log("INSUFFICIENT_HISTORY_RESULT "+short.run_id);
for(const bad of [{series:"FAKE",horizon:6},{series:"DGS10",horizon:2},{series:"GDPC1",horizon:1}])assert.equal((await fetch(base+"/api/forecast/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({specification:bad})})).status,400);
console.log("Real forecast API, scoped auth, multi-step boundaries, saved reload, idempotent execution, failures and insufficient-history checks passed");
