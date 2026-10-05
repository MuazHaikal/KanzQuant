import Link from "next/link";
import { DrillRow } from "@/components/drill-row";
import { notFound } from "next/navigation";
import { FocusShell } from "@/components/focus-shell";
import { ResearchChart } from "@/components/research-chart";
import { Distribution,Heat,MarketResponse,Metrics,Spark,number } from "@/components/focus-panels";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { episodes,factorComponents,factorHistory,factors,isFactor,returnAt } from "@/lib/focus-math";
export default async function FactorPage({params}:{params:Promise<{factor:string}>}){
 const {factor}=await params;if(!isFactor(factor))notFound();
 const {snapshot:data,prices,sources}=await getFocusData(),history=factorHistory(data,factor),current=history.at(-1);
 if(!current)return <FocusShell title={"FACTOR DETAIL / "+factor.toUpperCase()} asOf={data.as_of} status={["HISTORY UNAVAILABLE"]}><Panel title="Factor history">N/A · No complete persisted component values</Panel></FocusShell>;
 const change=(months:number)=>history.length>months?current.value-history.at(-months-1)!.value:null;
 const percentile=Math.round(history.filter(p=>p.value<=current.value).length/history.length*100);
 const state=current.value>1?"ELEVATED":current.value< -1?"VERY LOW":current.value>.25?"ABOVE NORMAL":current.value< -.25?"BELOW NORMAL":"IN LINE";
 const selected=episodes(history,data.as_of),definition=factorComponents(factor);
 const driverKeys=[...definition.positive,...definition.negative];
 return <FocusShell title={"FACTOR DETAIL / "+factor.toUpperCase()} asOf={data.as_of} factor={factor} status={[factor.toUpperCase()+" "+state,"P"+percentile,"FACTOR EPISODES · N="+selected.length]}>
 <div className="focus-columns"><div className="focus-stack">
 <Panel title={factor+" state"} meta="EXISTING SEMANTIC AXIS" noPad><Metrics items={[["Current value",number(current.value,"σ")],["Percentile","P"+percentile],["1M change",number(change(1),"σ")],["State",state]]}/><div className="focus-minor">3M Δ {number(change(3),"σ")} · 12M Δ {number(change(12),"σ")}</div>
 <ResearchChart inspectDates={data.state_vectors!.filter(v=>v.date<data.as_of).map(v=>v.date)} series={[{name:factor.toUpperCase()+" σ",points:history}]} zero/></Panel>
 <Panel title="Historical episodes" meta="ABSOLUTE FACTOR DISTANCE · GAP 9M" noPad><table className="data-table"><thead><tr><th>Date</th><th>Factor σ</th><th title="Absolute difference from the current factor value; lower is closer.">Distance ↓</th><th>SPX 3M</th><th>SPX 12M</th></tr></thead><tbody>{selected.slice(0,6).map(row=><DrillRow href={"/focus/analogue/"+row.date} key={row.date}><td><Link className="cell-link" href={"/focus/analogue/"+row.date}>{row.date} ↗</Link></td><td>{number(row.value)}</td><td className="score">{row.distance.toFixed(3)}</td><td><Heat value={returnAt(prices.SPX??[],row.date,3,data.as_of)}/></td><td><Heat value={returnAt(prices.SPX??[],row.date,12,data.as_of)}/></td></DrillRow>)}</tbody></table></Panel>
 <MarketResponse dates={selected.map(p=>p.date)} prices={prices} asOf={data.as_of}/>
 </div><div className="focus-stack">
 <Panel title="Drivers / component features" meta="REAL PERSISTED Z-SCORES" noPad><table className="data-table driver-table"><thead><tr><th>Feature / source</th><th title="Latest source observation available using the research release lags.">Raw latest</th><th>Z-score</th><th>History</th><th>Status / role</th></tr></thead><tbody>{driverKeys.map(key=>{const def=data.features.find(f=>f.key===key),points=(data.state_vectors??[]).flatMap(row=>Number.isFinite(row.values[key])?[{date:row.date,value:row.values[key]}]:[]);return <tr key={key}><td title={def?.description}>{def?.description??key}<small>{def?.source} · {def?.transform}</small></td><td title={def&&sources[def.source]?sources[def.source].date+" · "+sources[def.source].unit:"Source level unavailable"}>{def&&sources[def.source]?sources[def.source].value.toLocaleString(undefined,{maximumFractionDigits:2}):"N/A"}</td><td>{number(points.at(-1)?.value,"σ")}</td><td><Spark points={points.slice(-60)}/></td><td>{points.length===0?"N/A":points.at(-1)!.value>1?"ELEVATED":(points.at(-1)?.value??0)<-1?"LOW":"IN LINE"}<small>{definition.negative.includes(key)?"SUBTRACT MEAN":definition.positive.length===1?"DIRECT":"MEAN INPUT"}</small></td></tr>;})}</tbody></table><div className="footer-note">{definition.negative.length?"MEAN(POSITIVE INPUTS) − MEAN(SUBTRACTED INPUTS)":definition.positive.length===1?"DIRECT FEATURE Z-SCORE":"ARITHMETIC MEAN OF INPUT Z-SCORES"} · NO PCA WEIGHTS</div></Panel>
 <Panel title="Current vs history" meta="FULL AVAILABLE FACTOR HISTORY" noPad><Distribution values={history.map(p=>p.value)} current={current.value}/></Panel>
 <Panel title="Related signals" meta="SELECT TO FOCUS" noPad><table className="data-table"><thead><tr><th>Factor</th><th>Current σ</th><th>1M Δ</th><th>State</th><th>History / 2Y</th></tr></thead><tbody>{factors.filter(f=>f!==factor).map(f=>{const points=factorHistory(data,f);return <tr key={f}><td><Link className="cell-link" href={"/focus/factor/"+f}>{f} ↗</Link></td><td>{number(points.at(-1)?.value)}</td><td>{number(points.length>1?points.at(-1)!.value-points.at(-2)!.value:null)}</td><td>{points.length?points.at(-1)!.value>1?"ELEVATED":points.at(-1)!.value< -1?"VERY LOW":Math.abs(points.at(-1)!.value)>.25?points.at(-1)!.value>0?"ABOVE NORMAL":"BELOW NORMAL":"IN LINE":"N/A"}</td><td><Spark points={points.slice(-24)}/></td></tr>;})}</tbody></table></Panel>
 </div></div><MethodologyDisclosure/></FocusShell>;
}
