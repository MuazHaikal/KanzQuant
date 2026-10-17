import Link from "next/link";
import { humanName } from "@/lib/guided-research";
import { levelState, moveClassification } from "@/lib/factor-context";
import { quantile } from "@/lib/focus-math";
import type { HypothesisParameters, HypothesisStats } from "@/lib/hypothesis-types";

const valid = (n: number | null | undefined): n is number => n != null && Number.isFinite(n);
const pct = (n: number) => Math.max(0, Math.min(100, n));
const exact = (n: number | null | undefined, suffix = "") => {if(!valid(n))return "N/A";const rounded=Number(n.toFixed(2));return `${rounded>0?"+":""}${(rounded===0?0:rounded).toFixed(2)}${suffix}`;};
export function positionLabel(percentile: number | null) {
  if (!valid(percentile)) return "N/A";
  return ({"Below usual":"Low", "Above usual":"High", "In range":"Normal"} as Record<string,string>)[levelState(percentile)] ?? levelState(percentile);
}

export function HistoricalPositionBar({percentile, value, compact=false}: {percentile:number|null;value?:number|null;compact?:boolean}) {
  const p = valid(percentile) ? pct(percentile) : null;
  return <div className={`visual-scale position-scale ${compact ? "compact" : ""}`}>
    <div className="visual-scale-head"><strong>{positionLabel(percentile)}</strong><small>{p === null ? "Position unavailable" : `P${p.toFixed(0)}${value === undefined ? "" : " · " + exact(value,"σ")}`}</small></div>
    <div className="position-track" role="img" aria-label={p === null ? "Historical position unavailable" : `${positionLabel(percentile)} · historical position P${p.toFixed(1)}`}>
      {[10,15,50,15,10].map((width,i)=><span key={i} style={{width:width+"%"}}/>)}
      {p !== null ? <i className="scale-marker" style={{left:p+"%"}}/> : null}
    </div>
    {!compact ? <div className="scale-key"><span>Very low</span><span>Normal</span><span>Very high</span></div> : null}
  </div>;
}

export function MoveIntensityBar({percentile,change,horizon=3,compact=false}: {percentile:number|null;change:number|null;horizon?:number;compact?:boolean}) {
  const p = valid(percentile) && valid(change) ? pct(percentile) : null;
  const classification = moveClassification(p), direction = !valid(change) ? "" : change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const label = p === null ? "N/A" : `${classification} ${change! > 0 ? "rise" : change! < 0 ? "decline" : "unchanged"}`;
  return <div className={`visual-scale move-scale ${compact ? "compact" : ""}`}>
    <div className="visual-scale-head"><strong>{direction} {label}</strong><small>{horizon}M {p === null ? "N/A" : `P${p.toFixed(0)} · ${exact(change,"σ")}`}</small></div>
    <div className="move-track" role="img" aria-label={`${horizon} month move · ${label}${p === null ? "" : " · absolute move P"+p.toFixed(1)}`}>
      {[75,15,9,1].map((width,i)=><span key={i} style={{width:width+"%"}}/>)}
      {p !== null ? <i className="scale-marker" style={{left:p+"%"}}/> : null}
    </div>
    {!compact ? <div className="scale-key"><span>Typical</span><span>Extreme</span></div> : null}
  </div>;
}

/** Empirical counts only: no fitted density or Gaussian assumption. */
export function DistributionStrip({values,current,label="Current",compact=false}: {values:number[];current?:number|null;label?:string;compact?:boolean}) {
  const clean=values.filter(Number.isFinite);
  if (!clean.length) return <div className="empty-state">Distribution unavailable · N=0</div>;
  const lo=Math.min(...clean,valid(current)?current:Infinity),hi=Math.max(...clean,valid(current)?current:-Infinity),extent=hi-lo||1;
  const bins=Array.from({length:24},()=>0);
  for(const v of clean) bins[Math.min(23,Math.floor((v-lo)/extent*24))]++;
  const peak=Math.max(...bins),median=quantile(clean,.5)!,p10=quantile(clean,.1)!,p90=quantile(clean,.9)!;
  const x=(v:number)=>12+(v-lo)/extent*576;
  return <div className={`empirical-strip ${compact?"compact":""}`}>
    <svg viewBox="0 0 600 100" role="img" aria-label={`Empirical historical distribution · ${clean.length} observations · median ${exact(median)}${valid(current)?" · "+label+" "+exact(current):""}`}>
      <rect x="12" y="8" width={x(p10)-12} height="70" className="tail-zone"/>
      <rect x={x(p90)} y="8" width={588-x(p90)} height="70" className="tail-zone"/>
      {bins.map((n,i)=><rect key={i} x={12+i*24} y={78-n/peak*58} width="22" height={n/peak*58} fill="var(--hist)"><title>{`${n} observations`}</title></rect>)}
      <line x1={x(median)} x2={x(median)} y1="8" y2="80" stroke="var(--text)" strokeDasharray="3 3"/>
      {[p10,p90].map((v,i)=><line key={i} x1={x(v)} x2={x(v)} y1="8" y2="80" stroke="var(--dim)" strokeDasharray="1 3"/>)}
      {valid(current)?<g><line x1={x(current)} x2={x(current)} y1="5" y2="80" stroke="var(--teal)" strokeWidth="2"/><circle cx={x(current)} cy="7" r="4" fill="var(--teal)"/></g>:null}
      <text x="12" y="97">{exact(lo)}</text><text x="588" y="97" textAnchor="end">{exact(hi)}</text>
    </svg>
    {!compact?<div className="visual-detail"><span className="current-key">● {label} {exact(current)}</span><span>┆ Median {exact(median)}</span><span>P10 {exact(p10)}</span><span>P90 {exact(p90)}</span><span>N={clean.length}</span></div>:null}
  </div>;
}

export function EvidenceMeter({evidence}: {evidence:string|null|undefined}) {
  const categories=["INSUFFICIENT","WEAK","MODERATE","STRONG"], selected=categories.includes(evidence??"")?evidence!:"INSUFFICIENT";
  return <div className="evidence-meter" role="img" aria-label={`${selected} evidence · categorical unadjusted research summary, not a probability`}><div className="visual-scale-head"><strong>{selected} EVIDENCE</strong><small>Unadjusted · not certainty</small></div><div className="evidence-segments">{categories.map(c=><span key={c} className={c===selected?"selected":""}>{c===selected?"● ":""}{c}</span>)}</div></div>;
}

export function conditionLabels(p:HypothesisParameters) {
  return p.conditions.map(c=>`${c.source.toUpperCase()} · ${c.metric==="level"?"level":c.metric+"M change"}${p.mode==="relationship"?"":` · ${{below:"below P",above:"above P",lt:"< ",gt:"> ",state:"",rising:"rising",falling:"falling"}[c.op]??c.op}${["rising","falling"].includes(c.op)?"":c.threshold}`}`);
}

function humanCondition(c:HypothesisParameters["conditions"][number],mode:HypothesisParameters["mode"]) {
  const metric=c.metric==="level"?"Level":c.metric+"-month change";
  if(mode==="relationship")return metric;
  if(c.op==="state")return String(c.threshold);
  if(c.op==="rising"||c.op==="falling")return c.op==="rising"?"Rise":"Decline";
  if(c.op==="below"||c.op==="above"){const direction=c.op==="below"?"Low":"High";return c.metric==="level"?direction:(c.op==="below"?"Decline":"Rise");}
  return (c.op==="lt"?"Below":"Above")+" selected value";
}
export function ConditionalDiagram({parameters:p,summary:s}: {parameters:HypothesisParameters;summary?:HypothesisStats}) {
  const result=!!s && p.mode==="conditional", full=p.baseline==="full";
  return <div className={`conditional-diagram ${result?"result-diagram":"builder-diagram"}`} aria-label={result?"Condition and historical group comparison":"Research design"}>
    <div className="diagram-conditions">{conditionLabels(p).map((label,i)=><div className="diagram-condition" key={i}><small>{p.mode==="relationship"?"INPUT":`CONDITION ${i+1}`}</small><strong>{humanName(p.conditions[i].source)} · {humanCondition(p.conditions[i],p.mode)}</strong><small>{label}</small></div>)}</div>
    <div className="diagram-merge"><span>{p.conditions.length>1?"AND · ALL CONDITIONS":result?"HISTORICAL CASES":"↓"}</span></div>
    {result?<><div className="diagram-branches"><div><small>EVENT PERIODS</small><strong>{exact(s.event?.mean,"%")}</strong><span>Mean · N={s.event?.n??0}</span></div><div><small>{full?"FULL HISTORICAL SAMPLE":"OTHER PERIODS"}</small><strong>{exact(s.baseline?.mean,"%")}</strong><span>Mean · N={s.baseline?.n??0}</span></div></div>{full?<div className="diagram-baseline-note">Includes event periods · overlapping groups, not independent</div>:null}<div className="diagram-difference"><small>{humanName(p.asset)} · {p.horizon} months · MEAN DIFFERENCE</small><strong className={(s.difference??0)<0?"delta-down":"delta-up"}>{exact(s.difference," pp")}</strong></div></>:<><div className="diagram-cases">{p.mode==="relationship"?"SPACED PAIRED OBSERVATIONS":"QUALIFYING HISTORICAL CASES"}</div><div className="diagram-target"><strong>{humanName(p.asset)}</strong><small>{p.asset}</small><span>FORWARD RETURN</span><strong>{p.horizon}M</strong></div></>}
  </div>;
}

export function ContributionBars({rows,unit="σ"}: {rows:{name:string;value:number|null}[];unit?:string}) {
  const extent=Math.max(...rows.map(r=>Math.abs(r.value??0)),.001);
  return <div className="contribution-bars">{rows.map(r=><div key={r.name} className="contribution-row"><span>{r.name.replaceAll("SPX","S&P 500")}</span><div className="signed-track" role="img" aria-label={`${r.name} input contribution ${exact(r.value,unit)}`}><i className="zero-axis"/>{valid(r.value)?<b className={r.value<0?"negative":"positive"} style={{left:r.value<0?(50-Math.abs(r.value)/extent*49)+"%":"50%",width:Math.abs(r.value)/extent*49+"%"}}/>:null}</div><strong>{exact(r.value,unit)}</strong></div>)}<div className="visual-detail">Input contribution · arithmetic decomposition, not causation</div></div>;
}

export type OutcomeTile={horizon:string;median:number|null;hit:number|null;n:number;values?:number[];href?:string};
export function OutcomeHorizonTiles({items}: {items:OutcomeTile[]}) {
  return <div className="horizon-tiles">{items.map(item=>{
    const body=<><div className="tile-kicker">{item.horizon.toUpperCase()}<span>{item.href?"↗":""}</span></div><strong className={(item.median??0)<0?"delta-down":"delta-up"}>{exact(item.median,"%")}</strong><small>Historical median</small><div className="frequency-track" role="img" aria-label={valid(item.hit)?`${item.hit.toFixed(1)}% positive historical outcomes · N=${item.n}`:"Positive frequency unavailable"}><span style={{width:pct(item.hit??0)+"%"}}/></div><div className="tile-detail"><span>{valid(item.hit)?item.hit.toFixed(0)+"% positive":"N/A"}</span><span>N={item.n}</span></div>{item.values?.length?<DistributionStrip values={item.values} current={item.median} label="Median" compact/>:null}</>;
    return item.href?<Link className="horizon-tile" key={item.horizon} href={item.href}>{body}</Link>:<div className="horizon-tile" key={item.horizon}>{body}</div>;
  })}</div>;
}

export function SimilarityStrip({rows}: {rows:{date:string;similarity:number;state:string;href:string}[]}) {
  return <div className="similarity-strips">{rows.map((r,i)=><Link className="similarity-row" href={r.href} key={r.date}><span className="rank">{String(i+1).padStart(2,"0")}</span><strong>{r.date}</strong><div className="similarity-track" role="img" aria-label={`Similarity ${(r.similarity*100).toFixed(1)}% · cosine alignment, not probability`}><span style={{width:Math.min(100,Math.abs(r.similarity)*100)+"%"}}/></div><strong>{(r.similarity*100).toFixed(1)}%</strong><span>{r.state}</span><span>↗</span></Link>)}</div>;
}

export function EffectIntervals({rows,unit="pp"}: {rows:{label:string;value:number|null;ci?:[number,number]|null;n?:number}[];unit?:string}) {
  const extent=Math.max(.001,...rows.flatMap(r=>[Math.abs(r.value??0),...(r.ci??[]).map(Math.abs)]))*1.12;
  const x=(v:number)=>50+v/extent*48;
  return <div className="effect-intervals"><div className="effect-axis"><span>−{extent.toFixed(2)} {unit}</span><span>0 · no {unit==="pp"?"difference":"association"}</span><span>+{extent.toFixed(2)} {unit}</span></div>{rows.map((r,i)=><div className="effect-row" key={r.label+i}><span>{r.label}</span><div className="effect-track" role="img" aria-label={`${r.label} estimate ${exact(r.value,unit)}${r.ci?` · 95% CI ${exact(r.ci[0])} to ${exact(r.ci[1])}`:" · interval unavailable"}`}><i className="zero-axis"/>{r.ci?<b className="interval-line" style={{left:x(r.ci[0])+"%",width:(x(r.ci[1])-x(r.ci[0]))+"%"}}/>:null}{valid(r.value)?<i className="effect-dot" style={{left:x(r.value)+"%"}}/>:<span className="effect-unavailable">N/A</span>}</div><strong>{exact(r.value,unit?" "+unit:"")}<small>{r.ci?`95% CI [${exact(r.ci[0])}, ${exact(r.ci[1])}]`:"CI N/A"}{r.n!==undefined?` · N=${r.n}`:""}</small></strong></div>)}</div>;
}
