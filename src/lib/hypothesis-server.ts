import "server-only";
import { randomUUID } from "node:crypto";
import { getHypothesisDataset,hypothesisSql } from "./hypothesis-data";
import { executionEndpoint,signExecution,signingSecret,TOKEN_LIFETIME } from "./hypothesis-token";
import { bhAdjust,hypothesisName,validateParameters,type HypothesisParameters,type HypothesisResult,type HypothesisRun } from "./hypothesis-types";
const frozenVersions=new Set<string>();
export async function prepareHypothesis(input:unknown,reuse=false){
 const execution_url=executionEndpoint(),secret=signingSecret(),started=performance.now();let id:string;
 if(input&&typeof input==="object"&&"run_id" in input){
  id=String(input.run_id);if(!await getHypothesisRun(id))throw new Error("Saved research run is unavailable.");
  // Renew the capability, never replace a frozen specification.
 }else{
  const parameters=validateParameters(input);id=randomUUID();const name=hypothesisName(parameters);
  const data=await getHypothesisDataset(),sql=hypothesisSql();
  // Freeze one compact prepared monthly version, not duplicated daily observations per run.
  if(!frozenVersions.has(data.hash)){await sql`INSERT INTO research_results(run_id,result_type,result_key,as_of_date,payload) VALUES(${data.source_run}::uuid,'hypothesis_dataset',${data.hash},${data.as_of}::date,${JSON.stringify(data)}::jsonb) ON CONFLICT(run_id,result_type,result_key) DO NOTHING`;if(frozenVersions.size>=32)frozenVersions.clear();frozenVersions.add(data.hash);}
  const metadata=JSON.stringify({data_mode:"database",source_run:data.source_run,dataset_hash:data.hash,research_date:data.as_of,engine:"hypothesis-0.2.0",prepare_ms:Math.round(performance.now()-started),execution_protocol:1});
  const written=await sql.transaction([
   sql`SELECT pg_advisory_xact_lock(73482102)`,
   sql`INSERT INTO research_runs(id,module,name,parameters,status,metadata) SELECT ${id}::uuid,'hypothesis.lab',${name},${JSON.stringify(parameters)}::jsonb,'queued',${metadata}::jsonb WHERE (SELECT count(*) FROM research_runs WHERE module='hypothesis.lab' AND started_at>now()-interval '1 hour')<120 AND NOT (${reuse} AND EXISTS(SELECT 1 FROM research_runs WHERE module='hypothesis.lab' AND parameters=${JSON.stringify(parameters)}::jsonb AND metadata->>'dataset_hash'=${data.hash} AND metadata->>'engine'='hypothesis-0.2.0' AND status IN ('queued','running','complete'))) RETURNING id`,
   sql`SELECT id::text FROM research_runs WHERE module='hypothesis.lab' AND parameters=${JSON.stringify(parameters)}::jsonb AND metadata->>'dataset_hash'=${data.hash} AND metadata->>'engine'='hypothesis-0.2.0' AND status IN ('queued','running','complete') ORDER BY started_at DESC LIMIT 1`
  ]);
  if(written[1].length)id=String(written[1][0].id);else if(reuse&&written[2].length)id=String(written[2][0].id);else throw new Error("Research capacity reached. Try again later.");
 }
 const expires=Math.floor(Date.now()/1000)+TOKEN_LIFETIME;
 return {run_id:id,execution_url,execution_token:signExecution(id,expires,secret),expires_at:new Date(expires*1000).toISOString()};
}
function mapRun(row:Record<string,unknown>):HypothesisRun{return {id:String(row.id),name:String(row.name),parameters:row.parameters as HypothesisParameters,status:String(row.status),started_at:new Date(String(row.started_at)).toISOString(),completed_at:row.completed_at?new Date(String(row.completed_at)).toISOString():null,metadata:row.metadata as Record<string,unknown>,result:(row.payload??null) as HypothesisResult|null,adjusted_p:null,family_count:1};}
export async function getHypothesisRun(id:string){if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))return null;const sql=hypothesisSql();const [row]=await sql`SELECT r.*,rr.payload FROM research_runs r LEFT JOIN research_results rr ON rr.run_id=r.id AND rr.result_type='hypothesis' AND rr.result_key='result' WHERE r.id=${id}::uuid AND r.module='hypothesis.lab'`;if(!row)return null;const run=mapRun(row);
 return adjustFamily(run);
}
async function adjustFamily(run:HypothesisRun){if(run.parameters.family){const family=await hypothesisSql()`SELECT id::text,metadata->>'primary_p' p FROM research_runs WHERE module='hypothesis.lab' AND parameters->>'family'=${run.parameters.family} ORDER BY started_at,id`;const adjusted=bhAdjust(family.map(r=>r.p===null?null:Number(r.p)));const i=family.findIndex(r=>r.id===run.id);run.adjusted_p=adjusted[i]??null;run.family_count=family.length;}return run;}
export async function recentHypotheses(){const rows=await hypothesisSql()`SELECT r.*,rr.payload->'summary' summary FROM research_runs r LEFT JOIN research_results rr ON rr.run_id=r.id AND rr.result_type='hypothesis' AND rr.result_key='result' WHERE r.module='hypothesis.lab' ORDER BY r.started_at DESC LIMIT 40`;return rows.map(r=>({...mapRun(r),summary:r.summary as HypothesisResult["summary"]|null}));}
