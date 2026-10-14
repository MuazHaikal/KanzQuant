import "server-only";
import { createHash,createHmac,randomUUID } from "node:crypto";
import { hypothesisSql } from "./hypothesis-data";
import { executionEndpoint,signingSecret } from "./hypothesis-token";
import { getResearchSnapshot } from "./research-data";
import { factorHistory,isFactor } from "./focus-math";
import { humanName } from "./guided-research";
import { validateForecast,type ForecastRun,type ForecastSpec,type ForecastResult } from "./forecast-types";
const moduleName="forecast.lab";
export async function freezeForecast(spec:ForecastSpec,asOf?:string){
 const snapshot=await getResearchSnapshot(),sql=hypothesisSql();
 if(asOf&&(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(Date.parse(asOf))||new Date(asOf).toISOString().slice(0,10)!==asOf))throw Error("Invalid data date");
 const end=asOf&&asOf<snapshot.as_of?asOf:snapshot.as_of;
 let points:{date:string;value:number}[];
 if(isFactor(spec.series))points=factorHistory(snapshot,spec.series).filter(p=>p.date<=end);
 else if(["SPX","GLD","IEF"].includes(spec.series)){
  const rows=await sql`SELECT (date_trunc('month',m.observed_at)+interval '1 month - 1 day')::date::text date,(array_agg(m.adjusted_close ORDER BY m.observed_at DESC))[1] value FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol=${spec.series} AND m.observed_at<=${end}::date AND m.observed_at>=${end}::date-interval '33 years' GROUP BY date_trunc('month',m.observed_at) ORDER BY date`;
  points=rows.map(r=>({date:String(r.date),value:Number(r.value)})).filter(p=>p.date<=end);
 }else{
  const rows=await sql`WITH aligned AS (SELECT o.observed_at,o.value,(date_trunc('month',o.observed_at)+CASE s.frequency WHEN 'Monthly' THEN interval '2 months' WHEN 'Quarterly' THEN interval '4 months' ELSE interval '1 month' END-interval '1 day')::date available FROM observations o JOIN series s ON s.id=o.series_id WHERE s.external_id=${spec.series} AND s.provider='FRED' AND o.observed_at>=${end}::date-interval '43 years' AND o.observed_at<=${end}::date) SELECT DISTINCT ON (available) available::text date,value FROM aligned WHERE available<=${end}::date ORDER BY available,observed_at DESC`;
  points=rows.map(r=>({date:String(r.date),value:Number(r.value)}));
 }
 const data={kind:"forecast",series:spec.series,as_of:end,points};
 return {...data,hash:createHash("sha256").update(JSON.stringify(data)).digest("hex")};
}
export async function getForecastRun(id:string):Promise<ForecastRun|null>{
 if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))return null;
 const [row]=await hypothesisSql()`SELECT r.id::text,r.name,r.parameters,r.status,r.started_at,r.metadata,rr.payload FROM research_runs r LEFT JOIN research_results rr ON rr.run_id=r.id AND rr.result_type='forecast' AND rr.result_key='result' WHERE r.id=${id}::uuid AND r.module=${moduleName}`;
 return row?{id:String(row.id),name:String(row.name),parameters:row.parameters as ForecastSpec,status:String(row.status),started_at:new Date(String(row.started_at)).toISOString(),metadata:row.metadata as Record<string,unknown>,result:row.payload as ForecastResult|null}:null;
}
export async function recentForecasts(){const rows=await hypothesisSql()`SELECT id::text,name,status,started_at FROM research_runs WHERE module=${moduleName} ORDER BY started_at DESC LIMIT 12`;return rows.map(r=>({id:String(r.id),name:String(r.name),status:String(r.status),date:new Date(String(r.started_at)).toISOString().slice(0,10)}));}
export async function prepareForecast(input:unknown,asOf?:string){
 const secret=signingSecret(),endpoint=new URL(executionEndpoint());endpoint.pathname="/v1/forecast/run";
 let id:string;
 if(input&&typeof input==="object"&&"run_id" in input){id=String(input.run_id);if(!await getForecastRun(id))throw Error("Saved experiment unavailable");}
 else{
  const spec=validateForecast(input),data=await freezeForecast(spec,asOf);id=randomUUID();const sql=hypothesisSql();
  const saved=await sql.transaction([
   sql`SELECT pg_advisory_xact_lock(73482103)`,
   sql`INSERT INTO research_runs(id,module,name,parameters,status,metadata) SELECT ${id}::uuid,${moduleName},${humanName(spec.series)+" · "+spec.horizon+" months"},${JSON.stringify(spec)}::jsonb,'queued',${JSON.stringify({engine:"forecast-0.4.0",data_mode:"database",research_date:data.as_of,dataset_hash:data.hash,execution_protocol:1})}::jsonb WHERE (SELECT count(*) FROM research_runs WHERE module=${moduleName} AND started_at>now()-interval '1 hour')<60 RETURNING id`,
   sql`INSERT INTO research_results(run_id,result_type,result_key,as_of_date,payload) SELECT id,'forecast_dataset','input',${data.as_of}::date,${JSON.stringify(data)}::jsonb FROM research_runs WHERE id=${id}::uuid`
  ]);if(!saved[1].length)throw Error("Research capacity reached");
 }
 const expiry=Math.floor(Date.now()/1000)+300;
 const signature=createHmac("sha256",secret).update(`kanzquant.forecast.v1\n${id}\n${expiry}`).digest("base64url");
 return {run_id:id,execution_url:endpoint.href,execution_token:`v1.${expiry}.${signature}`};
}
