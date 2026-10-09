import { FocusShell } from "@/components/focus-shell";
import { MarketChart } from "@/components/market-chart";
import { getMarketWindow } from "@/lib/market-data";
import { Panel,MethodologyDisclosure } from "@/components/ui";
import { Metrics,number,Heat } from "@/components/focus-panels";
import { getFocusData } from "@/lib/focus-data";
import { axis,factors } from "@/lib/focus-math";
import { regimeColor } from "@/lib/research-data";
export default async function RegimePage(){
 const [{snapshot:data},market]=await Promise.all([getFocusData(),getMarketWindow()]),history=data.regime_history;
 const runs:{label:string;start:string;end:string;months:number}[]=[];
 for(const row of history){const last=runs.at(-1);if(last?.label===row.label){last.end=row.date;last.months++;}else runs.push({label:row.label,start:row.date,end:row.date,months:1});}
 const vectors=new Map(data.state_vectors?.map(v=>[v.date,v.values]));
 const current=history.filter(r=>r.label===data.current_regime);
 return <FocusShell title={"Regime detail / "+data.current_regime} asOf={data.as_of} status={["Full-history descriptive","Distance-based strength"]}>
 <div className="focus-columns"><div className="focus-stack">
 <Panel title="Regime history" noPad><Metrics items={[["Regime",data.current_regime],["Strength",(data.confidence*100).toFixed(1)+"%"],["Current duration",data.regime_duration_months+"M"],["Frequency",(current.length/history.length*100).toFixed(1)+"%"]]}/><MarketChart initial={market} assetControl={false} height={245} regimes={history.map(r=>({date:r.date,label:r.label,color:regimeColor(r.label)}))}/></Panel>
 <Panel title="Regime episodes / durations" meta="RECENT SPELLS" noPad><table className="data-table"><thead><tr><th>Start</th><th>End</th><th>Regime</th><th>Months</th></tr></thead><tbody>{runs.slice(-7).reverse().map(r=><tr key={r.start}><td>{r.start}</td><td>{r.end}</td><td>{r.label}</td><td>{r.months}</td></tr>)}</tbody></table></Panel>
 </div><div className="focus-stack">
 <Panel title="Factor characteristics" meta="MEAN AXIS · CURRENT REGIME" noPad><table className="data-table"><thead><tr><th>Factor</th><th>Cluster mean σ</th><th>Current σ</th></tr></thead><tbody>{factors.map(f=>{const values=current.map(r=>vectors.get(r.date)).filter(v=>v!==undefined).map(v=>axis(v,f)).filter((v):v is number=>v!==null);return <tr key={f}><td>{f}</td><td>{number(values.length?values.reduce((s,x)=>s+x,0)/values.length:null)}</td><td>{number(axis(data.current_state,f))}</td></tr>;})}</tbody></table></Panel>
 <Panel title="S&P 500 outcomes by market state" meta="MONTHLY PRICE RETURNS" noPad><table className="data-table"><thead><tr><th>Regime</th><th>N</th><th>Mean</th><th>Hit rate</th><th>Volatility</th></tr></thead><tbody>{data.regime_stats.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.months}</td><td><Heat value={r.mean}/></td><td>{number(r.hit_rate,"%")}</td><td>{number(r.volatility,"%")}</td></tr>)}</tbody></table></Panel>
 <Panel title="Regime transitions" meta="HISTORICAL FREQUENCIES" noPad><table className="data-table"><thead><tr><th>From / to</th>{data.regime_stats.map(r=><th key={r.name}>{r.name.slice(0,3)}</th>)}</tr></thead><tbody>{data.regime_stats.map(r=><tr key={r.name}><td>{r.name}</td>{data.regime_stats.map(t=><td key={t.name}>{number(data.transition_matrix[r.name]?.[t.name],"%")}</td>)}</tr>)}</tbody></table></Panel>
 </div></div><MethodologyDisclosure/></FocusShell>;
}
