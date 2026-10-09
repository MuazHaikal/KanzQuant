import "server-only";
import { neon } from "@neondatabase/serverless";
import { getSeriesCatalogue } from "./database";
import { getResearchSnapshot } from "./research-data";
import { factorHistory,factors } from "./focus-math";
import { getMarketWindow } from "./market-data";
import { marketNames } from "./guided-research";
import { availableDate,type ChartSeries,type ExplorerData } from "./chart-explorer";
const names:Record<string,string>={FEDFUNDS:"Federal Funds Rate",DGS2:"2-Year Treasury Yield",DGS10:"10-Year Treasury Yield",T10Y2Y:"Treasury Yield Curve",CPIAUCSL:"Consumer Price Index",CPILFESL:"Core Consumer Price Index",PCEPI:"PCE Price Index",UNRATE:"Unemployment Rate",PAYEMS:"Nonfarm Payrolls",ICSA:"Initial Jobless Claims",INDPRO:"Industrial Production",RSAFS:"Retail Sales",GDPC1:"Real GDP",BAA10Y:"BAA Credit Spread",M2SL:"Money Supply",WALCL:"Federal Reserve Assets",VIXCLS:"Volatility Index",DTWEXBGS:"U.S. Dollar Index"};
export async function chartCatalogue():Promise<ChartSeries[]> {
 const [rows,snapshot]=await Promise.all([getSeriesCatalogue(),getResearchSnapshot()]);
 const sql=neon(process.env.DATABASE_URL!,{fetchOptions:{signal:AbortSignal.timeout(15000)}});
 const bounds=await sql`SELECT a.symbol,min(m.observed_at)::text AS first,max(m.observed_at)::text AS latest FROM assets a JOIN market_observations m ON m.asset_id=a.id GROUP BY a.symbol`;
 const markets=bounds.filter(r=>String(r.symbol) in marketNames).map(r=>({id:String(r.symbol),displayName:marketNames[String(r.symbol)],shortName:marketNames[String(r.symbol)],category:"Markets",type:"market" as const,unit:"Price",technicalId:String(r.symbol),description:"Price history excluding dividends",availableFrom:String(r.first),availableTo:String(r.latest),frequency:"Daily",chartMode:"candles" as const,preview:(snapshot.market_series[String(r.symbol)]??[]).slice(-24)}));
 const factorSeries=factors.map(f=>{const history=factorHistory(snapshot,f);return {id:f,displayName:f[0].toUpperCase()+f.slice(1),shortName:f,category:"Factors",type:"factor" as const,unit:"Factor score",technicalId:f,description:"Existing descriptive macro factor",availableFrom:history[0]?.date??snapshot.as_of,availableTo:history.at(-1)?.date??snapshot.as_of,frequency:"Monthly",chartMode:"line" as const,preview:history.slice(-24)};});
 const previews=await sql`SELECT s.external_id,p.observed_at::text AS date,p.value FROM series s CROSS JOIN LATERAL (SELECT o.observed_at,o.value FROM observations o WHERE o.series_id=s.id ORDER BY o.observed_at DESC LIMIT 24) p ORDER BY s.external_id,p.observed_at`;
 return [...markets,...factorSeries,...rows.filter(r=>r.observations>0).map(r=>({id:r.externalId,displayName:names[r.externalId]??r.name,shortName:r.shortName,category:r.externalId==="VIXCLS"?"Volatility":r.category==="Labour"?"Labor":r.category,type:"macro" as const,unit:r.unit,technicalId:r.externalId,description:r.name,availableFrom:availableDate(r.start,r.frequency),availableTo:availableDate(r.end,r.frequency)>snapshot.as_of?snapshot.as_of:availableDate(r.end,r.frequency),frequency:r.frequency,chartMode:"line" as const,preview:previews.filter(p=>p.external_id===r.externalId).map(p=>({date:availableDate(String(p.date),r.frequency),value:Number(p.value)})).filter(p=>p.date<=snapshot.as_of)}))];
}
export async function explorerData(id:string,from:string,to:string):Promise<ExplorerData>{
 if(id in marketNames){const market=await getMarketWindow(id as "SPX"|"GLD"|"IEF",from,to);return {id,bars:market.bars,points:market.bars.map(b=>({date:b.date,value:b.close}))};}
 if(factors.includes(id as typeof factors[number])){const snapshot=await getResearchSnapshot();return {id,points:factorHistory(snapshot,id as typeof factors[number]).filter(p=>p.date>=from&&p.date<=to)};}
 const sql=neon(process.env.DATABASE_URL!,{fetchOptions:{signal:AbortSignal.timeout(15000)}});
 // Match the engine's monthly last observation + simplified release lag, never observed-date daily filling.
 const rows=await sql`WITH aligned AS (SELECT o.value,o.observed_at,
 (date_trunc('month',o.observed_at)+CASE s.frequency WHEN 'Monthly' THEN interval '2 months' WHEN 'Quarterly' THEN interval '4 months' ELSE interval '1 month' END-interval '1 day')::date AS available
 FROM observations o JOIN series s ON s.id=o.series_id WHERE s.external_id=${id})
 SELECT DISTINCT ON (available) available::text AS date,value FROM aligned WHERE available>=${from}::date AND available<=${to}::date ORDER BY available,observed_at DESC`;
 return {id,points:rows.map(r=>({date:String(r.date),value:Number(r.value)}))};
}
