import { notFound } from "next/navigation";
import { FocusShell } from "@/components/focus-shell";
import { ResearchChart } from "@/components/research-chart";
import { Metrics,Heat,number } from "@/components/focus-panels";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { axis,cosine,factors,normalizedPath,returnAt,validDate } from "@/lib/focus-math";
export default async function AnaloguePage({params}:{params:Promise<{date:string}>}){
 const {date}=await params;if(!validDate(date))notFound();
 const {snapshot:data,prices}=await getFocusData(),historical=data.state_vectors?.find(p=>p.date===date);if(!historical||date>=data.as_of)notFound();
 const latest=data.state_vectors!.at(-1)!.values,keys=data.features.map(f=>f.key),score=cosine(latest,historical.values,keys);
 const regime=data.regime_history.find(r=>r.date===date)?.label??"N/A";
 const differences=data.features.map(f=>({...f,now:latest[f.key],then:historical.values[f.key],difference:Math.abs(latest[f.key]-historical.values[f.key])})).filter(f=>Number.isFinite(f.difference)).sort((a,b)=>a.difference-b.difference);
 return <FocusShell title={"ANALOGUE DETAIL / "+date} asOf={data.as_of} status={[regime.toUpperCase(),"COSINE "+number(score===null?null:score*100),"CURRENT "+data.current_regime.toUpperCase()]}>
 <div className="focus-columns"><div className="focus-stack">
 <Panel title="Current vs historical state" meta="SEMANTIC AXES · SAME TRANSFORMS" noPad><table className="data-table"><thead><tr><th>Factor</th><th>Current σ</th><th>{date} σ</th><th>Δ σ</th></tr></thead><tbody>{factors.map(f=>{const now=axis(latest,f),then=axis(historical.values,f);return <tr key={f}><td>{f}</td><td>{number(now)}</td><td>{number(then)}</td><td>{number(now===null||then===null?null:now-then)}</td></tr>;})}</tbody></table></Panel>
 <Panel title="What happened after" meta="NORMALIZED TO 100 · UP TO 12M" noPad><ResearchChart inspectDates={data.state_vectors!.filter(v=>v.date<data.as_of).map(v=>v.date)} height={285} series={["SPX","GLD","IEF"].map(name=>({name,points:normalizedPath(prices[name]??[],date,data.as_of)}))}/><table className="data-table"><thead><tr><th>Asset</th>{["1M","3M","6M","12M"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{["SPX","GLD","IEF"].map(a=><tr key={a}><td>{a}</td>{[1,3,6,12].map(m=><td key={m}><Heat value={returnAt(prices[a]??[],date,m,data.as_of)}/></td>)}</tr>)}</tbody></table></Panel>
 </div><div className="focus-stack">
 <Panel title="Regime context" noPad><Metrics items={[["Historical",regime],["Current",data.current_regime],["Cosine",number(score===null?null:score*100)],["Features",String(keys.length)]]}/></Panel>
 <Panel title="Feature differences" meta="ABSOLUTE Δ Z · LOW TO HIGH" noPad><table className="data-table"><thead><tr><th>Feature</th><th>Current</th><th>Historical</th><th>|Δ Z|</th></tr></thead><tbody>{differences.map(f=><tr key={f.key}><td title={f.description}>{f.source} · {f.transform}</td><td>{number(f.now)}</td><td>{number(f.then)}</td><td className="score">{f.difference.toFixed(2)}</td></tr>)}</tbody></table></Panel>
 </div></div><MethodologyDisclosure/></FocusShell>;
}
