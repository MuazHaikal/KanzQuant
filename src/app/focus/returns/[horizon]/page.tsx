import Link from "next/link";
import { notFound } from "next/navigation";
import { FocusShell } from "@/components/focus-shell";
import { Distribution,Metrics,Outcomes,Heat,number } from "@/components/focus-panels";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { getFocusData } from "@/lib/focus-data";
import { isHorizon,horizons,stats } from "@/lib/focus-math";
export default async function ReturnsPage({params}:{params:Promise<{horizon:string}>}){
 const {horizon}=await params;if(!isHorizon(horizon))notFound();
 const {snapshot:data}=await getFocusData(),rows=data.neighbours.map(r=>({...r,value:r.returns.SPX?.[horizon]??null})),available=rows.filter(r=>r.value!==null),s=stats(available.map(r=>r.value!));
 const sorted=[...available].sort((a,b)=>a.value!-b.value!);
 return <FocusShell title={"Conditional returns / "+horizon.toUpperCase()} asOf={data.as_of} status={["SPX · price returns","N="+s.n,"Historical analogues"]}>
 <nav className="focus-tabs">{horizons.map(h=><Link className={h===horizon?"selected":""} key={h} href={"/focus/returns/"+h}>{h.toUpperCase()}</Link>)}</nav>
 <div className="focus-columns"><div className="focus-stack">
 <Panel title="Return distribution" meta="10 nearest full-state analogues" noPad><Metrics items={[["Mean",number(s.mean,"%")],["Median",number(s.median,"%")],["Hit rate",s.hit===null?"N/A":s.hit.toFixed(0)+"%"],["N",String(s.n)]]}/><Distribution values={available.map(r=>r.value!)}/><div className="focus-minor">Best {number(s.best,"%")} · Worst {number(s.worst,"%")} · Dispersion (SD) {s.std===null?"N/A":s.std.toFixed(2)+"%"}</div></Panel>
 <Outcomes horizon={horizon} rows={rows}/></div><div className="focus-stack">
 <Panel title="Cross-asset comparison" meta={horizon.toUpperCase()} noPad><table className="data-table"><thead><tr><th>Asset</th><th>Median</th><th>Mean</th><th>Hit rate</th><th>N</th></tr></thead><tbody>{["SPX","GLD","IEF"].map(asset=>{const a=stats(data.neighbours.map(r=>r.returns[asset]?.[horizon]).filter((v):v is number=>v!=null));return <tr key={asset}><td>{asset}</td><td><Heat value={a.median}/></td><td><Heat value={a.mean}/></td><td>{number(a.hit,"%")}</td><td>{a.n}</td></tr>;})}</tbody></table></Panel>
 <Panel title="Outlier inspection" meta="SELECT AN EPISODE" noPad>{[["BEST",sorted.at(-1)],["WORST",sorted[0]]].map(([label,row])=>{const item=row as typeof sorted[number]|undefined;return item?<Link className="outlier-link" key={String(label)} href={"/focus/analogue/"+item.date}><span>{String(label)} · {item.date}</span><strong>{number(item.value,"%")} ↗</strong></Link>:<div key={String(label)} className="empty-state">N/A</div>;})}</Panel>
 </div></div><MethodologyDisclosure/></FocusShell>;
}
