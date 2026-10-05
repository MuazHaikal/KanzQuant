import Link from "next/link";
import { MethodologyDisclosure, PageHead, Panel, ReturnHeat } from "@/components/ui";
import { getResearchSnapshot, regimeColor } from "@/lib/research-data";

function ReturnValue({ value }: { value: number | null }) { return value === null ? <span className="rank">—</span> : <ReturnHeat value={value}/>; }

export default async function SimilarityPage({searchParams}:{searchParams:Promise<{date?:string}>}) {
  const [{date},data]=await Promise.all([searchParams,getResearchSnapshot()]);
  const selected=data.neighbours.find(row=>row.date===date)??data.neighbours[0];
  const current=Object.fromEntries(data.state_rows.map(row=>[row.label.toLowerCase()==="volatility"?"stress":row.label.toLowerCase(),row.z]));
  const comparisons=["growth","inflation","rates","credit"].map(name=>({name,now:current[name]??0,then:selected.state[name]??0}));
  const summary=data.forward_summary.SPX;
  const summaryRows=[["MEAN",summary.mean],["MEDIAN",summary.median],["HIT RATE",summary.hit_rate],["BEST",summary.best],["WORST",summary.worst],["STDEV",summary.std]] as const;
  return <><PageHead section="Research / Similarity" title="Current State Similarity" meta={`STATE DATE · ${data.as_of}`}/><div className="grid similarity-grid">
    <Panel title="Nearest historical states" meta="COSINE SIMILARITY · K=10" noPad><div className="toolbar"><span className="pill live">COSINE</span><span className="pill">{data.features.length} FEATURES</span><span className="pill">MIN GAP 9M</span><span className="panel-meta" style={{marginLeft:"auto"}}>EXPANDING STANDARDISATION</span></div><table className="data-table"><thead><tr><th>Rank / Date</th><th>Similarity</th><th>Regime</th><th>1M</th><th>3M</th><th>6M</th><th>12M</th></tr></thead><tbody>{data.neighbours.map(row=><tr key={row.date} style={row.date===selected.date?{background:"#0e1c22"}:{}}><td><Link href={`/similarity?date=${row.date}`}><span className="rank">{String(row.rank).padStart(2,"0")}</span>&nbsp;&nbsp;{row.date}</Link></td><td className="score">{(row.similarity*100).toFixed(1)}</td><td><span className="regime-tag" style={{borderColor:regimeColor(row.regime)}}>{row.regime}</span></td>{["1m","3m","6m","12m"].map(horizon=><td key={horizon}><ReturnValue value={row.returns.SPX?.[horizon]??null}/></td>)}</tr>)}</tbody></table><div className="footer-note">TARGET ±12M EXCLUDED · SELECTED ANALOGUES SPACED ≥9M · REAL OUTCOMES ONLY</div></Panel>
    <Panel title="State vector comparison" meta={`NOW VS ${selected.date}`} noPad><div className="comparison-grid">{["FEATURE","CURRENT",selected.date,"Δ Z"].map(x=><div className="header" key={x}>{x}</div>)}{comparisons.flatMap(item=>[<div className="feature" key={`${item.name}n`}>{item.name}</div>,<div className="z-block" key={`${item.name}c`} style={{"--z-alpha":Math.min(.28,.06+Math.abs(item.now)*.12)} as React.CSSProperties}>{item.now>0?"+":""}{item.now.toFixed(2)}</div>,<div className="z-block" key={`${item.name}t`} style={{"--z-alpha":Math.min(.28,.06+Math.abs(item.then)*.12)} as React.CSSProperties}>{item.then>0?"+":""}{item.then.toFixed(2)}</div>,<div key={`${item.name}d`}>{item.now-item.then>0?"+":""}{(item.now-item.then).toFixed(2)}</div>])}</div></Panel>
    <Panel title="Forward return distribution" meta="S&P 500 · TOP 10" noPad><div className="return-summary">{["STATISTIC","1M","3M","6M","12M"].map(x=><div className="hdr" key={x}>{x}</div>)}{summaryRows.flatMap(([label,row])=>[<div key={`${label}l`}>{label}</div>,...["1m","3m","6m","12m"].map(horizon=><div key={`${label}${horizon}`}><ReturnValue value={row?.[horizon]??null}/></div>)])}</div></Panel>
    <MethodologyDisclosure />
  </div></>;
}
