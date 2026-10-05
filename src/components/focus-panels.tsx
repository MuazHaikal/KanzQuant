import Link from "next/link";
import { DrillRow } from "@/components/drill-row";
import { Panel, ReturnHeat } from "./ui";
import { quantile,stats,type Horizon,returnAt } from "@/lib/focus-math";
import type { Point } from "@/lib/research-data";
export const number=(value:number|null|undefined,suffix="")=>value==null||!Number.isFinite(value)?"N/A":(value>0?"+":"")+value.toFixed(2)+suffix;
export function Heat({value}:{value:number|null}){return value===null?<span className="rank">N/A</span>:<ReturnHeat value={value}/>;}
export function Spark({points}:{points:Point[]}){
 if(points.length<2)return <span>N/A</span>;const values=points.map(p=>p.value),min=Math.min(...values),extent=Math.max(...values)-min||1;
 return <svg className="spark" viewBox="0 0 150 30" role="img" aria-label="Recent history"><path d={points.map((p,i)=>`${i?"L":"M"}${i/(points.length-1)*150},${28-(p.value-min)/extent*26}`).join(" ")} fill="none" stroke={points.at(-1)!.value>=0?"#28d7c0":"#f27d7d"} strokeWidth="1.5"/></svg>;
}
export function Distribution({values,current,label="CURRENT"}:{values:number[];current?:number;label?:string}){
 const clean=values.filter(Number.isFinite);if(!clean.length)return <div className="empty-state">NO AVAILABLE OBSERVATIONS</div>;
 const min=Math.min(...clean,current??Infinity),max=Math.max(...clean,current??-Infinity),extent=max-min||1;
 const bins=Array.from({length:24},()=>0);for(const v of clean)bins[Math.min(23,Math.floor((v-min)/extent*24))]++;
 const peak=Math.max(...bins),median=quantile(clean,.5)!;
 return <div className="distribution"><svg viewBox="0 0 600 150" role="img" aria-label="Historical distribution">
 {bins.map((n,i)=><rect key={i} x={20+i*23} y={120-n/peak*92} width="21" height={n/peak*92} fill="#345260"><title>{`${n} observations`}</title></rect>)}
 <line x1={20+(median-min)/extent*552} x2={20+(median-min)/extent*552} y1="20" y2="122" stroke="#d9e4e8" strokeDasharray="3 3"/>
 {current!==undefined?<line x1={20+(current-min)/extent*552} x2={20+(current-min)/extent*552} y1="12" y2="122" stroke="#f27d7d" strokeWidth="2"/>:null}
 <text x="20" y="143">{number(min)}</text><text x="572" textAnchor="end" y="143">{number(max)}</text>
 </svg><div className="distribution-key">{current!==undefined?<span className="delta-down">{label} {number(current)}</span>:null}<span>MEDIAN {number(median)}</span><span>P10 {number(quantile(clean,.1))}</span><span>P90 {number(quantile(clean,.9))}</span><span>N={clean.length}</span></div></div>;
}
const metricTips:Record<string,string>={"Current value":"Existing semantic axis, measured in standardized feature units.","Percentile":"Percentile versus the complete available factor history.","Hit rate":"Share of observed historical outcomes with a positive return.","Strength":"Distance-based cluster proximity, not a calibrated probability.","Cosine":"State-vector cosine alignment scaled by 100, not a probability.","Frequency":"Share of historical months assigned to the current regime.","N":"Number of available observations."};
export function Metrics({items}:{items:[string,string][]}){return <div className="focus-metrics">{items.map(([label,value])=><div key={label} title={metricTips[label]}><span className="stat-label">{label}</span><strong>{value}</strong></div>)}</div>;}
export function MarketResponse({dates,prices,asOf}:{dates:string[];prices:Record<string,Point[]>;asOf:string}){
 return <Panel title="Market response" meta="MEDIAN · FACTOR EPISODES" noPad><table className="data-table"><thead><tr><th>Asset</th>{["1m","3m","6m","12m"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{["SPX","GLD","IEF"].map(asset=><tr key={asset}><td>{asset}</td>{[1,3,6,12].map(months=>{const s=stats(dates.map(d=>returnAt(prices[asset]??[],d,months,asOf)).filter((v):v is number=>v!==null));return <td key={months} title={`N=${s.n} · hit rate ${number(s.hit,"%")}`}><Heat value={s.median}/></td>;})}</tr>)}</tbody></table></Panel>;
}
export function Outcomes({rows,horizon}:{rows:{date:string;similarity:number|null;regime:string;value:number|null}[];horizon:Horizon}){
 return <Panel title="Individual analogue outcomes" meta={horizon.toUpperCase()} noPad><table className="data-table"><thead><tr><th>Date</th><th>Cosine</th><th>Regime</th><th>Return</th></tr></thead><tbody>{rows.map(row=><DrillRow href={"/focus/analogue/"+row.date} key={row.date}><td><Link className="cell-link" href={"/focus/analogue/"+row.date}>{row.date} ↗</Link></td><td>{number(row.similarity===null?null:row.similarity*100)}</td><td>{row.regime}</td><td><Heat value={row.value}/></td></DrillRow>)}</tbody></table></Panel>;
}
