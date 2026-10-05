import "server-only";
import { cache } from "react";
import { neon } from "@neondatabase/serverless";
import { getResearchSnapshot, type Point } from "./research-data";
export const getFocusData = cache(async()=>{
 if(process.env.KANZQUANT_DATA_MODE!=="database")throw new Error("Focus Mode requires real database research.");
 const snapshot=await getResearchSnapshot();
 if(!snapshot.state_vectors?.length)throw new Error("Persisted state vectors unavailable. Run npm run research.");
 const sql=neon(process.env.DATABASE_URL!);
 const rows=await sql`SELECT a.symbol, to_char(date_trunc('month',m.observed_at)+interval '1 month - 1 day','YYYY-MM-DD') AS date,
 (array_agg(m.adjusted_close ORDER BY m.observed_at DESC))[1] AS value
 FROM market_observations m JOIN assets a ON a.id=m.asset_id
 WHERE m.observed_at <= ${snapshot.as_of}::date GROUP BY a.symbol,date_trunc('month',m.observed_at) ORDER BY date`;
 const prices:Record<string,Point[]>={};
 for(const row of rows)(prices[String(row.symbol)]??=[]).push({date:String(row.date),value:Number(row.value)});
 const sourceRows=await sql`SELECT DISTINCT ON (s.external_id) s.external_id,s.unit,o.value,o.observed_at::text
 FROM observations o JOIN series s ON s.id=o.series_id
 WHERE (date_trunc('month',o.observed_at)+interval '1 month - 1 day'
 + CASE s.frequency WHEN 'Monthly' THEN interval '1 month' WHEN 'Quarterly' THEN interval '3 month' ELSE interval '0 month' END)::date <= ${snapshot.as_of}::date
 ORDER BY s.external_id,o.observed_at DESC`;
 const sources:Record<string,{value:number;date:string;unit:string}>={};
 for(const r of sourceRows)sources[String(r.external_id)]={value:Number(r.value),date:String(r.observed_at).slice(0,10),unit:String(r.unit??"")};
 for(const [symbol,points] of Object.entries(prices)){const latest=points.at(-1);if(latest)sources[symbol]={value:latest.value,date:latest.date,unit:"monthly adjusted price"};}
 return {snapshot,prices,sources};
});
