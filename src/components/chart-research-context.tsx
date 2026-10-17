import Link from "next/link";
import { Panel } from "./ui";
import { SimilarityStrip, OutcomeHorizonTiles } from "./visual-research";
import { factors, horizons } from "@/lib/focus-math";
import { factorContext } from "@/lib/factor-context";
import { getResearchSnapshot } from "@/lib/research-data";
export function compositionContext(data:Awaited<ReturnType<typeof getResearchSnapshot>>){return {asOf:data.as_of,state:data.current_regime,strength:data.confidence*100,factors:factors.map(name=>({name,percentile:factorContext(data,name).percentile})),neighbours:data.neighbours.map(r=>({date:r.date,similarity:r.similarity,state:r.regime,returns:r.returns}))};}

export function ChartResearchContext({data}:{data:Awaited<ReturnType<typeof getResearchSnapshot>>}){
 return <aside className="research-context" aria-label="Research context"><Panel title="Research context" meta={data.as_of} noPad><div className="context-state"><small>CURRENT MARKET STATE</small><strong>{data.current_regime}</strong><Link href="/focus/regime">Inspect state history ↗</Link></div>{factors.map(f=>{const c=factorContext(data,f);return <Link className="context-factor" href={"/focus/factor/"+f} key={f}><span>{f}</span><div className="context-meter"><i style={{width:(c.percentile??0)+"%"}}/></div><b>{c.percentile==null?"—":"P"+c.percentile.toFixed(0)}</b></Link>;})}</Panel><Panel title="Similar periods" meta="STATE ALIGNMENT" noPad><SimilarityStrip rows={data.neighbours.slice(0,4).map(r=>({date:r.date,similarity:r.similarity,state:r.regime,href:"/focus/analogue/"+r.date}))}/></Panel><Panel title="Investigate" noPad><Link className="context-entry" href="/research/forecast">Forecastability ↗<small>Compare models with a simple baseline</small></Link><Link className="context-entry" href="/evidence">Browse stored research ↗<small>Inspect historical conditional evidence</small></Link></Panel></aside>;
}
export function ChartHistoricalOutcomes({data,asset}:{data:Awaited<ReturnType<typeof getResearchSnapshot>>;asset:string}){
 const summary=data.forward_summary[asset];if(!summary)return null;
 return <div className="explorer-analytics"><Panel title="Historical analogue outcomes" meta={`${asset} · OBSERVATIONS, NOT A FORECAST`} noPad><OutcomeHorizonTiles items={horizons.map(h=>({horizon:h,median:summary.median?.[h]??null,hit:summary.hit_rate?.[h]??null,n:summary.n?.[h]??0,values:data.neighbours.flatMap(r=>r.returns[asset]?.[h]==null?[]:[r.returns[asset][h]!]),href:asset==="SPX"?"/focus/returns/"+h:undefined}))}/></Panel></div>;
}
