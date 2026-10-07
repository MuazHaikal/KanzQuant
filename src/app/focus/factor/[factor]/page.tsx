import Link from "next/link";
import { DrillRow } from "@/components/drill-row";
import { AnalysisTabs } from "@/components/analysis-tabs";
import { notFound } from "next/navigation";
import { FocusShell } from "@/components/focus-shell";
import { ResearchChart } from "@/components/research-chart";
import { Distribution,Heat,MarketResponse,Metrics,Spark,number } from "@/components/focus-panels";
import { MoveLabel,Tip } from "@/components/context-labels";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { axis,episodes,factors,isFactor,returnAt } from "@/lib/focus-math";
import { changeSeries,factorContext,featureNames } from "@/lib/factor-context";
export default async function FactorPage({params,searchParams}:{params:Promise<{factor:string}>;searchParams:Promise<{match?:string}>}) {
 const {factor}=await params;if(!isFactor(factor))notFound();
 const {snapshot:data,prices,sources}=await getFocusData(),c=factorContext(data,factor),{history,current}=c;
 if(current===null)return <FocusShell title={"Factor detail / "+factor} asOf={data.as_of} status={["History unavailable"]}><Panel title="Factor history">N/A · No complete persisted component values</Panel></FocusShell>;
 const matchMove=(await searchParams).match==="move",selected=episodes(matchMove?changeSeries(history,3):history,data.as_of);
 const chartContext=data.state_vectors!.map(v=>({date:v.date,regime:data.regime_history.find(r=>r.date===v.date)?.label??"N/A",factors:Object.fromEntries(factors.map(f=>[f,axis(v.values,f)]))}));
 return <FocusShell title={"Factor detail / "+factor[0].toUpperCase()+factor.slice(1)} asOf={data.as_of} factor={factor} status={[c.state,c.trend.label,"3M "+c.moves[1].classification]}>
 <div className="hyp-context-action"><Link href={`/hypothesis?source=${factor}&metric=3&op=${(c.moves[1].change??0)<0?"below":"above"}&threshold=${(c.moves[1].change??0)<0?10:90}`}>TEST THIS ↗</Link><span>Prefilled {factor} · 3M change · prior-only percentile</span></div>
 <Panel title={factor[0].toUpperCase()+factor.slice(1)+" / current state"} meta="Historical position, not a probability" noPad>
 <Metrics items={[["Current level",number(current,"σ")],["Level percentile","P"+(c.percentile?.toFixed(0)??"N/A")],["State",c.state],["Trend",c.trend.label]]}/>
 <div className="movement-grid">{c.moves.map(move=><div key={move.horizon}><span className="stat-label">{move.horizon}M change</span><strong className={move.change!<0?"delta-down":"delta-up"}>{number(move.change,"σ")}</strong><MoveLabel move={move}/></div>)}</div>
 </Panel>
 <AnalysisTabs initial={matchMove?"ANALOGUES":"HISTORY"} items={[
 {name:"HISTORY",content:<div className="focus-columns"><Panel title="Factor history" meta="Existing semantic axis · monthly" noPad><ResearchChart inspectDates={chartContext.filter(v=>v.date<data.as_of).map(v=>v.date)} context={chartContext} persistKey="kanzquant.chart.factor-history.v1" series={[{name:factor[0].toUpperCase()+factor.slice(1)+" σ",points:history}]} zero height={340}/></Panel><Panel title="Current level vs history" meta={"Level P"+c.percentile?.toFixed(0)+" · "+history.length+" monthly observations"} noPad><Distribution values={history.map(p=>p.value)} current={current}/></Panel></div>},
 {name:"DRIVERS",content:<div className="focus-stack">
 <Panel title="What drove the 3M move?" meta="Exact arithmetic input contributions" noPad><table className="data-table driver-table"><thead><tr><th>Component / source</th><th>Latest z</th><th>Contribution</th><th>Move rarity</th><th>5Y history</th></tr></thead><tbody>{c.drivers.map(d=>{const def=data.features.find(f=>f.key===d.key),raw=def?sources[def.source]:null;return <tr key={d.key}><td><Tip text={def?.description??d.key}>{featureNames[d.key]??d.key}</Tip><small>{def?.source} · {raw?raw.value.toLocaleString(undefined,{maximumFractionDigits:2})+" "+raw.unit:"N/A"}</small></td><td>{number(d.history.at(-1)?.value,"σ")}</td><td><Tip text={`3M feature change × ${d.coefficient.toFixed(3)}. Exact decomposition of the existing arithmetic axis, not a causal attribution. Latest raw observation: ${raw?.date??"N/A"}.`}><span className={d.contribution!<0?"delta-down":"delta-up"}>{number(d.contribution,"σ")}</span></Tip></td><td><MoveLabel move={d.move} compact/></td><td><Spark points={d.history.slice(-60)}/></td></tr>;})}</tbody></table><div className="footer-note">Contributions sum to {number(c.moves[1].change,"σ")} · input decomposition, not causation</div></Panel>
 <Panel title="Related factors" meta="Level and 3M movement" noPad><table className="data-table related-table"><thead><tr><th>Factor</th><th>Level / rank</th><th>3M change</th><th>Move rarity</th><th>2Y history</th></tr></thead><tbody>{factors.filter(f=>f!==factor).map(f=>{const other=factorContext(data,f);return <DrillRow href={"/focus/factor/"+f} key={f}><td className="factor-name">{f} ↗</td><td>{number(other.current)}<small>P{other.percentile?.toFixed(0)??"N/A"} · {other.state}</small></td><td>{number(other.moves[1].change)}</td><td><MoveLabel move={other.moves[1]}/></td><td><Spark points={other.history.slice(-24)}/></td></DrillRow>;})}</tbody></table></Panel>
 </div>},
 {name:"ANALOGUES",content:
 <Panel title="Historical episodes" meta={matchMove?"Closest signed 3M moves":"Closest factor levels"} noPad><div className="episode-tabs"><Link className={!matchMove?"selected":""} href={"/focus/factor/"+factor}>Similar states</Link><Link className={matchMove?"selected":""} href={"/focus/factor/"+factor+"?match=move"}>Similar 3M changes</Link><span>9M spacing · recent 12M excluded</span></div><table className="data-table"><thead><tr><th>Date</th><th>{matchMove?"3M change σ":"Level σ"}</th><th>Distance ↓</th><th>SPX 3M</th><th>SPX 12M</th></tr></thead><tbody>{selected.slice(0,5).map(row=><DrillRow href={"/focus/analogue/"+row.date} key={row.date}><td>{row.date} ↗</td><td>{number(row.value)}</td><td className="score">{row.distance.toFixed(3)}</td><td><Heat value={returnAt(prices.SPX??[],row.date,3,data.as_of)}/></td><td><Heat value={returnAt(prices.SPX??[],row.date,12,data.as_of)}/></td></DrillRow>)}</tbody></table></Panel>
 },{name:"MARKET RESPONSE",content:<MarketResponse dates={selected.map(p=>p.date)} prices={prices} asOf={data.as_of}/>}]} /><MethodologyDisclosure/></FocusShell>;
}
