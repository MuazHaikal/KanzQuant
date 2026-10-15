import "server-only";
import {neon} from "@neondatabase/serverless";
import {cache} from "react";
export type Features=Record<string,number|string|null>;
export type Outcome={n:number;small_sample:boolean;values:number[];median?:number;mean?:number;positive?:number;p10?:number;p25?:number;p75?:number;p90?:number};
export type Evidence={status:string;neighbours:{date:string;distance:number;returns:Record<string,number>}[];outcomes:Record<string,Outcome>};
export type Equity={symbol:string;name:string;sector:string|null;industry:string|null;exchange:string|null;currency:string;priceDate:string|null;computedAt:string|null;stale:boolean;features:Features|null};
export type EquityDetail=Equity & {bars:{date:string;open:number;high:number;low:number;close:number;volume:number|null}[];fundamentals:({date:string;filed_at:string}&Record<string,unknown>)[];evidence:Evidence;macro:{current_state:string|null;groups:{state:string;stock:Outcome;spx:Outcome}[]}};
const sql=()=>{if(!process.env.DATABASE_URL)throw Error("Database configuration unavailable");return neon(process.env.DATABASE_URL,{fetchOptions:{signal:AbortSignal.timeout(20000)}});};
const stale=(date:string|null)=>!date||Date.now()-Date.parse(date+"T00:00:00Z")>7*86400000;
export const equityList=cache(async():Promise<Equity[]>=>{
 const rows=await sql()`SELECT i.symbol,i.name,i.sector,i.industry,i.exchange,i.currency,s.as_of::text AS price_date,s.computed_at::text,s.features FROM instruments i LEFT JOIN LATERAL (SELECT * FROM equity_feature_snapshots s WHERE s.instrument_id=i.id AND s.features->>'session_complete'='true' ORDER BY as_of DESC LIMIT 1) s ON true WHERE i.active AND i.asset_type='EQUITY' ORDER BY i.symbol`;
 return rows.map(r=>({symbol:String(r.symbol),name:String(r.name),sector:r.sector,industry:r.industry,exchange:r.exchange,currency:r.currency,priceDate:r.price_date,computedAt:r.computed_at,stale:stale(r.price_date),features:r.features}));
});
export const equityDetail=cache(async(symbol:string):Promise<EquityDetail|null>=>{
 if(!/^[A-Z0-9.\-]{1,12}$/.test(symbol))return null;
 const db=sql();
 const [rows,bars,fundamentals]=await Promise.all([
 db`SELECT i.symbol,i.name,i.sector,i.industry,i.exchange,i.currency,s.as_of::text AS price_date,s.computed_at::text,s.features,s.evidence,s.macro_context FROM instruments i LEFT JOIN LATERAL(SELECT * FROM equity_feature_snapshots s WHERE s.instrument_id=i.id AND s.features->>'session_complete'='true' ORDER BY as_of DESC LIMIT 1)s ON true WHERE i.symbol=${symbol} AND i.active`,
 db`SELECT m.observed_at::text AS date,m.open,m.high,m.low,m.close,m.adjusted_close,m.volume FROM market_observations m JOIN instruments i ON i.id=m.asset_id WHERE i.symbol=${symbol} AND m.observed_at<=(SELECT max(as_of) FROM equity_feature_snapshots WHERE instrument_id=i.id AND features->>'session_complete'='true') ORDER BY m.observed_at`,
 db`SELECT f.payload FROM equity_fundamentals f JOIN instruments i ON i.id=f.instrument_id WHERE i.symbol=${symbol} AND f.filed_at<=(SELECT max(as_of) FROM equity_feature_snapshots WHERE instrument_id=i.id AND features->>'session_complete'='true') ORDER BY f.period_end`
 ]);
 if(!rows.length)return null;const r=rows[0];
 return {symbol:r.symbol,name:r.name,sector:r.sector,industry:r.industry,exchange:r.exchange,currency:r.currency,priceDate:r.price_date,computedAt:r.computed_at,stale:stale(r.price_date),features:r.features,bars:bars.filter(b=>[b.open,b.high,b.low,b.close,b.adjusted_close].every(v=>v!=null&&Number.isFinite(Number(v))&&Number(v)>0)&&Number(b.high)>=Math.max(Number(b.open),Number(b.close))&&Number(b.low)<=Math.min(Number(b.open),Number(b.close))).map(b=>{const factor=Number(b.adjusted_close)/Number(b.close);return {date:b.date,open:Number(b.open)*factor,high:Math.max(Number(b.high)*factor,Number(b.open)*factor,Number(b.adjusted_close)),low:Math.min(Number(b.low)*factor,Number(b.open)*factor,Number(b.adjusted_close)),close:Number(b.adjusted_close),volume:b.volume==null?null:Number(b.volume)};}),fundamentals:fundamentals.map(f=>f.payload),evidence:r.evidence??{status:"Not ingested",neighbours:[],outcomes:{}},macro:r.macro_context??{current_state:null,groups:[]}};
});
