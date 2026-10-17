import {neon} from '@neondatabase/serverless';
import {readFileSync} from 'node:fs';
const sql=neon(process.env.DATABASE_URL,{fetchOptions:{signal:AbortSignal.timeout(30000)}});
for(const [name,query] of [
 ['macro',"SELECT count(*)::int total,count(*) FILTER(WHERE value IS NOT NULL AND value NOT IN ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8))::int valid FROM observations"],
 ['market',"SELECT count(*)::int total,count(*) FILTER(WHERE close IS NOT NULL AND close NOT IN ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8))::int valid FROM market_observations"],
 ['fundamentals',"SELECT count(*)::int quarters FROM equity_fundamentals"],
 ['market aggregate',readFileSync('src/lib/catalogue-data.ts','utf8').match(/sql`(SELECT a\.id[\s\S]*?)`/)[1]],
 ['preview',"SELECT s.external_id,p.observed_at::text date,p.value,p.valid_count,p.first_date::text FROM series s CROSS JOIN LATERAL(SELECT observed_at,value,count(*) OVER()::int valid_count,min(observed_at) OVER() first_date FROM observations WHERE series_id=s.id AND value IS NOT NULL AND value NOT IN ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) ORDER BY observed_at DESC LIMIT 24)p ORDER BY s.external_id,p.observed_at"],
]){
 const started=performance.now();
 try{const rows=await sql.query(query);console.log(name,Math.round(performance.now()-started)+'ms',name==='preview'||name==='market aggregate'?{rows:rows.length}:rows);}
 catch(error){console.error(name,'failed',error.code??error.name);process.exitCode=1;}
}
