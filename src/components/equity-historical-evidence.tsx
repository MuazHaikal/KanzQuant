"use client";
import {useState} from "react";
import type {Evidence} from "@/lib/equities";
import {numberText} from "@/lib/evidence";
import {equityPercent} from "@/lib/equity-format";
import {ChartNoAxesColumnIncreasing} from "lucide-react";
import {DistributionStrip} from "./visual-research";
export function EquityHistoricalEvidence({evidence}:{evidence:Evidence}){
 const [horizon,setHorizon]=useState("3m"),outcome=evidence.outcomes[horizon];
 const percent=equityPercent;
 return <section className="panel stock-evidence" id="historical-evidence"><header className="panel-head"><h2>Historical Evidence</h2><span className="panel-meta">Current setup · same-stock history</span></header>
  <div className="stock-evidence-conclusion"><ChartNoAxesColumnIncreasing size={20} strokeWidth={1.7} aria-hidden="true"/><strong>{!outcome||outcome.n<5?"Insufficient evidence":outcome.small_sample?"Descriptive evidence · small sample":"Descriptive historical evidence"}</strong><span>Not a forecast</span></div>
  <dl className="stock-evidence-summary"><div><dt>Sample size</dt><dd>n={outcome?.n??0}</dd></div><div><dt>Historical {horizon.toUpperCase()} median</dt><dd>{percent(outcome?.median)}</dd></div><div><dt>Positive frequency</dt><dd>{equityPercent(outcome?.positive,false)}</dd></div></dl>
  <div className="workstation-table-scroll" tabIndex={0} aria-label="Historical setup outcomes"><table className="data-table"><thead><tr><th>Horizon</th><th>n</th><th>Median</th><th>Mean</th><th>Positive</th><th>IQR</th><th>P10 / P90</th></tr></thead><tbody>{["1m","3m","6m","12m"].map(h=>{const o=evidence.outcomes[h];return <tr key={h} aria-selected={horizon===h}><td><button aria-pressed={horizon===h} onClick={()=>setHorizon(h)}>{h.toUpperCase()}</button></td><td>{o?.n??0}</td><td>{percent(o?.median)}</td><td>{percent(o?.mean)}</td><td>{equityPercent(o?.positive,false)}</td><td>{percent(o?.p25)} / {percent(o?.p75)}</td><td>{percent(o?.p10)} / {percent(o?.p90)}</td></tr>;})}</tbody></table></div>
  <div className="stock-evidence-distribution"><h3>{horizon.toUpperCase()} forward-return distribution</h3><DistributionStrip values={outcome?.values??[]} compact/><p>Baseline inference, p-values and confidence intervals are not calculated by this descriptive setup engine.</p></div>
  <details className="stock-evidence-cases"><summary>Historical setup dates / exact outcomes</summary><div className="workstation-table-scroll" tabIndex={0} aria-label="Same-stock historical cases"><table className="data-table"><thead><tr><th>Date</th><th>Distance</th>{["1m","3m","6m","12m"].map(h=><th key={h}>{h.toUpperCase()}</th>)}</tr></thead><tbody>{evidence.neighbours.map(r=><tr key={r.date}><td>{r.date}</td><td>{numberText(r.distance)}</td>{["1m","3m","6m","12m"].map(h=><td key={h}>{percent(r.returns[h])}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
