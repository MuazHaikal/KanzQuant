"use client";
import {useState,useRef,useEffect} from "react";
import type {Equity,EquityDetail} from "@/lib/equities";
import {ForecastPlot} from "./forecast-charts";
import {equityMetric} from "@/lib/equity-format";
export function EquityCompare({stock,universe}:{stock:EquityDetail;universe:Equity[]}){
 const [other,setOther]=useState<EquityDetail|null>(null),[status,setStatus]=useState(""),[symbol,setSymbol]=useState("");
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function load(value:string){active.current?.abort();setSymbol(value);setOther(null);setStatus("");if(!value)return;const controller=new AbortController();active.current=controller;setStatus("Loading cached comparison…");try{const r=await fetch("/api/equities/"+encodeURIComponent(value),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});if(!r.ok)throw Error();const row:EquityDetail=await r.json();if(!controller.signal.aborted){setOther(row);setStatus(row.bars.length?"":"No cached price history");}}catch{if(!controller.signal.aborted)setStatus("Comparison unavailable");}}
 const start=other?[stock.bars[0]?.date,other.bars[0]?.date].filter(Boolean).sort().at(-1):null;
 const normalize=(r:EquityDetail)=>{const rows=r.bars.filter(b=>!start||b.date>=start),base=rows[0]?.close;return base?rows.filter((_,i)=>i%5===0||i===rows.length-1).map(b=>({date:b.date,value:100*b.close/base})):[];};
 return <section className="panel"><header className="equity-compare-head"><h2>Compare equities</h2><select aria-label="Compare equity" value={symbol} onChange={e=>load(e.target.value)}><option value="">Select a cached equity</option>{universe.filter(r=>r.symbol!==stock.symbol&&r.features).map(r=><option key={r.symbol} value={r.symbol}>{r.symbol} · {r.name}</option>)}</select><small>Adjusted price · base 100 at shared start</small></header>{status&&<div className="panel-body" role="status">{status}</div>}{other&&other.bars.length>0&&<><ForecastPlot title="Normalized equity comparison" height={200} layers={[{name:stock.symbol,points:normalize(stock)},{name:other.symbol,points:normalize(other)}]}/><table className="data-table"><thead><tr><th>Equity</th><th>63D return %</th><th>Vol20 %</th><th>Momentum percentile</th><th>Revenue TTM growth %</th></tr></thead><tbody>{[stock,other].map(r=><tr key={r.symbol}><td>{r.symbol}</td>{["return_63","vol20","momentum_percentile","revenue_ttm_growth"].map(k=><td key={k}>{equityMetric(k,r.features?.[k])}</td>)}</tr>)}</tbody></table></>}</section>;
}
