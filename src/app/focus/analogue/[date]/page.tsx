import { notFound } from "next/navigation";
import Link from "next/link";
import { humanName } from "@/lib/guided-research";
import { FocusShell } from "@/components/focus-shell";
import { MarketChart } from "@/components/market-chart";
import { getMarketWindow } from "@/lib/market-data";
import { assets, monthsBack, type Asset } from "@/lib/market-math";
import { Metrics,Heat,number } from "@/components/focus-panels";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { axis,cosine,factors,returnAt,validDate } from "@/lib/focus-math";
import { regimeColor } from "@/lib/research-data";
import { featureNames } from "@/lib/factor-context";
import { Tip } from "@/components/context-labels";
export default async function AnaloguePage({params,searchParams}:{params:Promise<{date:string}>;searchParams:Promise<{asset?:string;view?:string}>}){
 const {date}=await params;if(!validDate(date))notFound();
 const {snapshot:data,prices}=await getFocusData(),historical=data.state_vectors?.find(p=>p.date===date);if(!historical||date>=data.as_of)notFound();
 const query=await searchParams,asset=assets.includes(query.asset as Asset)?query.asset as Asset:"SPX",view=query.view==="compare"?"COMPARE":"CANDLES";
 const market=await getMarketWindow(asset,monthsBack(date,36),monthsBack(date,-36));
 const latest=data.state_vectors!.at(-1)!.values,keys=data.features.map(f=>f.key),score=cosine(latest,historical.values,keys);
 const regime=data.regime_history.find(r=>r.date===date)?.label??"N/A";
 const norm=Math.sqrt(keys.reduce((s,k)=>s+latest[k]**2,0)*keys.reduce((s,k)=>s+historical.values[k]**2,0));
 const differences=data.features.map(f=>({...f,now:latest[f.key],then:historical.values[f.key],difference:Math.abs(latest[f.key]-historical.values[f.key]),contribution:norm?latest[f.key]*historical.values[f.key]/norm*100:null})).filter(f=>Number.isFinite(f.difference)).sort((a,b)=>b.difference-a.difference);
 return <FocusShell title={"Historical analogue / "+date} asOf={data.as_of} status={[regime,"Similarity "+number(score===null?null:score*100),"Today: "+data.current_regime]}>
 <div className="hyp-context-action"><Link href={`/hypothesis?source=credit&metric=level&op=${axis(historical.values,"credit")!<0?"lt":"gt"}&threshold=${(axis(historical.values,"credit")??0).toFixed(2)}`}>TEST SIMILAR CONDITION ↗</Link><span>Credit level at this date · editable, not full-state similarity.</span></div>
 <Panel title="Analogue market inspection" meta={`Analogue ${date} · current anchor ${data.as_of}`} noPad><MarketChart initial={market} initialAsset={asset} initialView={view} anchor={date} currentAnchor={data.as_of} height={340} regimes={data.regime_history.map(r=>({date:r.date,label:r.label,color:regimeColor(r.label)}))}/></Panel>
 <div className="focus-columns"><div className="focus-stack">
 <Panel title="Current vs historical state" meta="STANDARDIZED FACTOR VALUES" noPad><table className="data-table"><thead><tr><th>Factor</th><th>Current σ</th><th>{date} σ</th><th>Δ σ</th></tr></thead><tbody>{factors.map(f=>{const now=axis(latest,f),then=axis(historical.values,f);return <tr key={f}><td>{humanName(f)}</td><td>{number(now)}</td><td>{number(then)}</td><td>{number(now===null||then===null?null:now-then)}</td></tr>;})}</tbody></table></Panel>
 <Panel title="Observed forward returns" meta="Unchanged monthly adjusted-price methodology" noPad><table className="data-table"><thead><tr><th>Asset</th>{["1M","3M","6M","12M"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{["SPX","GLD","IEF"].map(a=><tr key={a}><td>{humanName(a)}</td>{[1,3,6,12].map(m=><td key={m}><Heat value={returnAt(prices[a]??[],date,m,data.as_of)}/></td>)}</tr>)}</tbody></table></Panel>
 </div><div className="focus-stack">
 <Panel title="Regime context" noPad><Metrics items={[["Historical",regime],["Current",data.current_regime],["Cosine",number(score===null?null:score*100)],["Features",String(keys.length)]]}/></Panel>
 <Panel title="Important differences / similarity inputs" meta="Largest level differences first" noPad><table className="data-table difference-table"><thead><tr><th>Feature</th><th>Today</th><th>Then</th><th>|Δ z|</th><th><Tip text="Signed per-feature dot product divided by both vector norms × 100. These additive terms sum to the displayed cosine similarity. Not causal contributions or probabilities.">Similarity term ⓘ</Tip></th></tr></thead><tbody>{differences.map(f=><tr key={f.key}><td><Tip text={f.description+" · "+f.source}>{featureNames[f.key]??f.source}</Tip></td><td>{number(f.now)}</td><td>{number(f.then)}</td><td>{f.difference.toFixed(2)}</td><td className="score">{number(f.contribution)}</td></tr>)}</tbody></table><div className="footer-note">Signed terms sum to {number(score===null?null:score*100)} · cosine alignment, not probability</div></Panel>
 </div></div><MethodologyDisclosure/></FocusShell>;
}
