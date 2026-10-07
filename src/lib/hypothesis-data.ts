import "server-only";
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { axis,factors,returnAt } from "./focus-math";
import type { Point,ResearchSnapshot } from "./research-data";
export type PreparedDataset={source_run:string;as_of:string;hash:string;rows:{date:string;values:Record<string,number|null>;state:string;returns:Record<string,Record<string,number|null>>}[]};
export function hypothesisSql(){if(process.env.KANZQUANT_DATA_MODE!=="database"||!process.env.DATABASE_URL)throw new Error("Hypothesis Lab requires real database research.");return neon(process.env.DATABASE_URL,{fetchOptions:{cache:"no-store",signal:AbortSignal.timeout(15000)}});}
let prepared: {until:number;promise:Promise<PreparedDataset>}|null=null;
export function getHypothesisDataset(){if(prepared&&prepared.until>Date.now())return prepared.promise;const promise=prepare();prepared={until:Date.now()+300000,promise};promise.catch(()=>{prepared=null;});return promise;}
async function prepare():Promise<PreparedDataset>{
 const sql=hypothesisSql();
 const [source]=await sql`SELECT r.id::text,rr.payload FROM research_runs r JOIN research_results rr ON rr.run_id=r.id WHERE r.module='macro.research' AND r.status='complete' AND rr.result_type='snapshot' AND rr.result_key='latest' ORDER BY r.completed_at DESC LIMIT 1`;
 const snapshot=source?.payload as ResearchSnapshot;
 if(!snapshot?.state_vectors?.length||snapshot.methodology.data_mode!=="database")throw new Error("Persisted database state vectors are required.");
 const [market,macro]=await Promise.all([
  sql`SELECT a.symbol,to_char(date_trunc('month',m.observed_at)+interval '1 month - 1 day','YYYY-MM-DD') date,(array_agg(m.adjusted_close ORDER BY m.observed_at DESC))[1] value FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE m.observed_at<=${snapshot.as_of}::date AND a.symbol IN ('SPX','GLD','IEF') GROUP BY a.symbol,date_trunc('month',m.observed_at) ORDER BY date`,
  sql`SELECT s.external_id,to_char(date_trunc('month',o.observed_at)+interval '1 month - 1 day'+CASE s.frequency WHEN 'Monthly' THEN interval '1 month' WHEN 'Quarterly' THEN interval '3 month' ELSE interval '0 month' END,'YYYY-MM-DD') date,(array_agg(o.value ORDER BY o.observed_at DESC))[1] value FROM observations o JOIN series s ON s.id=o.series_id WHERE s.provider='FRED' GROUP BY s.external_id,date_trunc('month',o.observed_at),s.frequency ORDER BY date`
 ]);
 const prices:Record<string,Point[]>={},raw:Record<string,Point[]>={};
 for(const r of market)(prices[String(r.symbol)]??=[]).push({date:String(r.date),value:Number(r.value)});
 for(const r of macro)(raw[String(r.external_id)]??=[]).push({date:String(r.date),value:Number(r.value)});
 const labels=new Map(snapshot.regime_history.map(r=>[r.date,r.label]));
 const rows=snapshot.state_vectors.map(r=>{const values:Record<string,number|null>=Object.fromEntries(factors.map(f=>[f,axis(r.values,f)]));for(const [name,points] of Object.entries(raw))values[name]=points.findLast(p=>p.date<=r.date)?.value??null;return {date:r.date,values,state:labels.get(r.date)??"N/A",returns:Object.fromEntries(["SPX","GLD","IEF"].map(a=>[a,Object.fromEntries([1,3,6,12].map(h=>[String(h),returnAt(prices[a]??[],r.date,h,snapshot.as_of)]))]))};});
 const data={source_run:String(source.id),as_of:snapshot.as_of,rows};const hash=createHash("sha256").update(JSON.stringify(data)).digest("hex");
 return {...data,hash};
}
