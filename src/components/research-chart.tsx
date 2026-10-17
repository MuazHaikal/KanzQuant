"use client";
import Link from "next/link";
import { useState, useRef, useEffect, useMemo, useId } from "react";
import type { Point } from "@/lib/research-data";
import { clampDomain, panDomain, zoomDomain, wheelIntent, type Domain } from "@/lib/chart-domain";
import { levelPercentile, movement } from "@/lib/factor-context";
import { quantile } from "@/lib/focus-math";
type Series = {name:string;points:Point[];color?:string};
export type ChartContext = {date:string;regime:string;factors:Record<string,number|null>};
const colors = ["var(--teal)","var(--cyan)","var(--warning)"];
const emptyPoints: Point[] = [];
export function ResearchChart({series,height:pixelHeight=200,zero=false,regimes=[],inspectDates=[],initialStart,persistKey,context=[],explorerId,currentLabel=false}:{series:Series[];height?:number;zero?:boolean;regimes?:{date:string;color:string}[];inspectDates?:string[];initialStart?:string;persistKey?:string;context?:ChartContext[];explorerId?:string;currentLabel?:boolean}) {
  const all=series[0]?.points??emptyPoints,max=Math.max(0,all.length-1),id=useId();
  const initial:Domain=[initialStart?Math.max(0,all.findIndex(p=>p.date>=initialStart)):0,max];
  const [domain,setDomain]=useState<Domain>(initial),[selected,setSelected]=useState<number|null>(null),[overlay,setOverlay]=useState("");
  const range=useRef(domain),svg=useRef<SVGSVGElement>(null),hover=useRef<SVGGElement>(null),tip=useRef<HTMLDivElement>(null),frame=useRef(0),pointerFrame=useRef(0);
  const drag=useRef<{x:number;range:Domain;moved:boolean}|null>(null);
  const [width,setWidth]=useState(980),height=pixelHeight*980/width;
  useEffect(()=>{const node=svg.current;if(!node)return;const observer=new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width;if(width>0)setWidth(width);});observer.observe(node);return()=>observer.disconnect();},[]);
  const update=(next:Domain)=>{range.current=clampDomain(next,max);if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;setDomain(range.current);});};
  useEffect(()=>{
    let restored:Domain|undefined;
    if(persistKey)try{const parsed=JSON.parse(sessionStorage.getItem(persistKey)??"null");if(Array.isArray(parsed)&&parsed.length===2&&parsed.every(Number.isFinite))restored=clampDomain([parsed[0],parsed[1]],max);}catch{}
    const raf=restored?requestAnimationFrame(()=>{range.current=restored!;setDomain(restored!);}):0;
    return()=>{cancelAnimationFrame(raf);cancelAnimationFrame(frame.current);cancelAnimationFrame(pointerFrame.current);};
  },[persistKey,max]);
  useEffect(()=>{if(persistKey)try{sessionStorage.setItem(persistKey,JSON.stringify(domain));}catch{}},[domain,persistKey]);
  const active=useMemo(()=>series.filter((s,i)=>i===0||!s.name.startsWith("Overlay:")||s.name===overlay),[series,overlay]);
  const maps=useMemo(()=>active.map(s=>new Map(s.points.map(p=>[p.date,p.value]))),[active]);
  const regimeBands=useMemo(()=>{
    const byDate=new Map(regimes.map(r=>[r.date,r.color]));
    const bands:{start:number;end:number;color:string}[]=[];
    all.forEach((p,i)=>{const color=byDate.get(p.date);if(!color)return;const previous=bands.at(-1);if(previous&&previous.color===color&&previous.end===i-1)previous.end=i;else bands.push({start:i,end:i,color});});
    return bands;
  },[all,regimes]);
  const [lo,hi]=clampDomain(domain,max),span=Math.max(1,hi-lo),first=Math.floor(lo),last=Math.ceil(hi);
  const visible=all.slice(first,last+1),values=maps.flatMap(map=>visible.flatMap(p=>map.has(p.date)?[map.get(p.date)!]:[]));
  const median=quantile(all.map(p=>p.value),.5)??0;
  const min=Math.min(...values,...(zero?[-2]:[])),highest=Math.max(...values,...(zero?[2]:[])),padding=(highest-min||1)*.07,low=min-padding,high=highest+padding,extent=high-low||1;
  const x=(i:number)=>48+(i-lo)/span*900,y=(v:number)=>15+(high-v)/extent*(height-45);
  const fraction=(clientX:number)=>{const box=svg.current!.getBoundingClientRect();return Math.max(0,Math.min(1,(clientX-box.left-box.width*48/980)/(box.width*900/980)));};
  useEffect(()=>{
    const node=svg.current;if(!node)return;
    const wheel=(e:WheelEvent)=>{
      const intent=wheelIntent(e.deltaX,e.deltaY,e.deltaMode,e.ctrlKey,e.shiftKey);
      if(intent==="scroll")return;
      e.preventDefault();
      const current=range.current,width=current[1]-current[0];
      if(intent==="pan")update(panDomain(current,e.deltaX/node.getBoundingClientRect().width*width,max));
      else update(zoomDomain(current,fraction(e.clientX),Math.exp(Math.max(-1,Math.min(1,e.deltaY*(e.deltaMode ? .035 : .002)))),max));
    };
    node.addEventListener("wheel",wheel,{passive:false});return()=>node.removeEventListener("wheel",wheel);
    // Wheel handlers use refs; small smooth vertical trackpad gestures remain ordinary page scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[max]);
  if(!all.length)return <div className="empty-state">No available history</div>;
  const point=selected===null?null:all[selected],detail=point?context.find(c=>c.date===point.date):null;
  const pointMove=point&&zero?movement(all,3,point.date):null;
  const inspect=(index:number)=>setSelected(Math.max(0,Math.min(max,index)));
  return <div className="interactive-chart" data-research-chart>
    <div className="chart-tools"><span className="chart-range">{visible[0]?.date} → {visible.at(-1)?.date}</span><div>{series.some(s=>s.name.startsWith("Overlay:"))&&<select aria-label="Factor overlay" value={overlay} onChange={e=>setOverlay(e.target.value)}><option value="">No overlay</option>{series.filter(s=>s.name.startsWith("Overlay:")).map(s=><option key={s.name} value={s.name}>{s.name.replace("Overlay:","")}</option>)}</select>}{[12,36,60,120,0].map(months=><button key={months} aria-label={months?`Show ${months/12} years`:"Fit full history"} onClick={()=>update([months?Math.max(0,max-months):0,max])}>{months?months/12+"Y":"MAX"}</button>)}</div></div>
    <div className="chart-canvas"><svg ref={svg} preserveAspectRatio="none" viewBox={`0 0 980 ${height}`} style={{height:pixelHeight,fontSize:11*980/width}} tabIndex={0} role="img" aria-label={active.map(s=>s.name).join(", ")+" history. Drag to pan; wheel or Shift wheel to zoom; double-click to reset. Arrow keys pan, plus/minus zoom, Home resets, Enter selects midpoint."}
      onDoubleClick={()=>update([0,max])}
      onKeyDown={e=>{let next:Domain|undefined;const current=range.current,width=current[1]-current[0];if(e.key==="ArrowLeft"||e.key==="ArrowRight")next=panDomain(current,width*.1*(e.key==="ArrowRight"?1:-1),max);if(e.key==="+"||e.key==="=")next=zoomDomain(current,.5,.8,max);if(e.key==="-")next=zoomDomain(current,.5,1.25,max);if(e.key==="Home")next=[0,max];if(e.key==="Enter"){e.preventDefault();inspect(Math.round((current[0]+current[1])/2));}if(next){e.preventDefault();e.stopPropagation();update(next);}}}
      onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,range:range.current,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerUp={e=>{if(drag.current&&!drag.current.moved)inspect(Math.round(range.current[0]+fraction(e.clientX)*(range.current[1]-range.current[0])));drag.current=null;}}
      onPointerCancel={()=>{drag.current=null;}}
      onPointerMove={e=>{
        const clientX=e.clientX;
        if(drag.current){const shift=(drag.current.x-clientX)/(e.currentTarget.getBoundingClientRect().width*900/980)*(drag.current.range[1]-drag.current.range[0]);if(Math.abs(clientX-drag.current.x)>4)drag.current.moved=true;if(drag.current.moved)update(panDomain(drag.current.range,shift,max));}
        cancelAnimationFrame(pointerFrame.current);pointerFrame.current=requestAnimationFrame(()=>{
          const index=Math.round(range.current[0]+fraction(clientX)*(range.current[1]-range.current[0])),p=all[index];if(!p||!hover.current||!tip.current)return;
          const px=48+(index-range.current[0])/Math.max(1,range.current[1]-range.current[0])*900;
          hover.current.style.display="";hover.current.setAttribute("transform",`translate(${px},0)`);
          tip.current.style.display="block";tip.current.textContent=p.date+" · "+active.map((s,i)=>s.name.replace("Overlay:","")+": "+(maps[i].get(p.date)?.toFixed(2)??"N/A")).join(" · ");
        });
      }} onPointerLeave={()=>{cancelAnimationFrame(pointerFrame.current);if(hover.current)hover.current.style.display="none";if(tip.current)tip.current.style.display="none";}}>
      <defs><clipPath id={id}><rect x="48" y="15" width="900" height={height-45}/></clipPath></defs>
      {[0,.25,.5,.75,1].map(f=><g key={f}><line className="chart-grid" x1="48" x2="948" y1={15+f*(height-45)} y2={15+f*(height-45)}/><text x="4" y={19+f*(height-45)}>{(high-f*extent).toFixed(high>1000?0:1)}</text></g>)}
      <g clipPath={`url(#${id})`}>
        {regimeBands.filter(r=>r.end>=first&&r.start<=last).map(r=><rect key={r.start} x={x(r.start-.5)} y="15" width={(r.end-r.start+1)/span*900} height={height-45} fill={r.color} opacity=".08"/>)}
        {zero&&[-2,-1,0,1,2,median].map((v,i)=><line key={i} x1="48" x2="948" y1={y(v)} y2={y(v)} stroke={i===5?"var(--warning)":"var(--muted)"} strokeDasharray={v===0?"":"3 4"} opacity={v===0?.6:.35}/>)}
        {active.map((s,si)=>{let connected=false;const path=visible.map((p,i)=>{const value=maps[si].get(p.date);if(value===undefined){connected=false;return "";}const command=connected?"L":"M";connected=true;return `${command}${x(first+i)},${y(value)}`;}).join(" ");return <path key={s.name} d={path} fill="none" stroke={s.color??colors[si%3]} strokeDasharray={si===1?"6 2":si===2?"2 2":undefined} strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>;})}
        {selected!==null&&selected>=lo&&selected<=hi&&<line x1={x(selected)} x2={x(selected)} y1="15" y2={height-30} stroke="var(--warning)" strokeWidth="1.5"/>}
        {hi>=max&&<circle cx={x(max)} cy={y(all[max].value)} r="3.5" fill="var(--teal)"/>}
        <g ref={hover} style={{display:"none"}}><line x1="0" x2="0" y1="15" y2={height-30} stroke="var(--text)" strokeDasharray="3 3" opacity=".65"/></g>
      </g>
      {currentLabel&&hi>=max&&<g className="research-current-label" aria-label={`Current ${all[max].value.toFixed(2)} · ${all[max].date}`}><rect x={Math.min(898,x(max)-50)} y={Math.max(15,Math.min(height-65,y(all[max].value)-23))} width="50" height="21" rx="3" fill="var(--accent-blue)"/><text x={Math.min(923,x(max)-25)} y={Math.max(29,Math.min(height-51,y(all[max].value)-9))} textAnchor="middle" fill="#fff">{all[max].value.toFixed(2)}</text></g>}
      <text x="48" y={height-6}>{visible[0]?.date}</text><text x="948" textAnchor="end" y={height-6}>{visible.at(-1)?.date}</text>
    </svg><div ref={tip} className="chart-hover" style={{display:"none"}}/></div>
    <div className="chart-context">{active.map((s,i)=><span key={s.name} style={{color:s.color??colors[i%3]}}>{i===1?"┄":i===2?"···":"━"} {s.name.replace("Overlay:","")}</span>)}{zero&&<span>Zero · ±1 / ±2 · median {median.toFixed(2)}</span>}<Link className="chart-help" href={"/chart?series="+encodeURIComponent(explorerId??series[0]?.name.toLowerCase().split(" ")[0]??"growth")}>↗ EXPAND CHART</Link></div>
    {point&&<div className="point-detail"><strong>{point.date}</strong>{active.map((s,i)=><span key={s.name}>{s.name.replace("Overlay:","")} {maps[i].get(point.date)?.toFixed(3)??"N/A"}</span>)}{zero&&<><span>Level P{levelPercentile(all.filter(p=>p.date<=point.date).map(p=>p.value),point.value)?.toFixed(0)??"N/A"}</span><span>3M Δ {pointMove?.change?.toFixed(3)??"N/A"} · {pointMove?.classification}{pointMove?.percentile!==null&&pointMove?.percentile!==undefined?" (P"+pointMove.percentile.toFixed(0)+")":""}</span></>}{detail&&<><span>{detail.regime}</span><span>{Object.entries(detail.factors).map(([f,v])=>f+" "+(v?.toFixed(2)??"N/A")).join(" · ")}</span></>}{inspectDates.includes(point.date)&&<Link href={"/focus/analogue/"+point.date}>Open analogue ↗</Link>}<button aria-label="Clear selected point" onClick={()=>setSelected(null)}>×</button></div>}
  </div>;
}
