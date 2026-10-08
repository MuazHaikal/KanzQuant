"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { HypothesisRun } from "@/lib/hypothesis-types";
const f=(x:number|null|undefined)=>x==null?"N/A":(x>=0?"+":"")+x.toFixed(2);

export function HypothesisChart({run}:{run:HypothesisRun}) {
  const frame=useRef<HTMLDivElement>(null),[width,setWidth]=useState(690),id=useId(),ready=!!run.result;
  useEffect(()=>{const node=frame.current;if(!node)return;const observer=new ResizeObserver(entries=>{const w=entries[0]?.contentRect.width;if(w>0)setWidth(w);});observer.observe(node);return()=>observer.disconnect();},[run.id,ready]);
  const r=run.result;if(!r)return null;
  const s=r.summary,p=run.parameters,left=58,right=Math.max(left+40,width-18),span=right-left,top=16,bottom=180,height=bottom-top;
  if(p.mode==="relationship") {
    const points=r.cases.filter(c=>c.included&&c.returns[String(p.horizon)]!=null);
    if(!points.length)return <div className="empty-state">No eligible paired observations.</div>;
    const xs=points.map(c=>c.values[0]),ys=points.map(c=>c.returns[String(p.horizon)]!);
    const xmin=Math.min(...xs,0),xmax=Math.max(...xs,0),ymin=Math.min(...ys,0),ymax=Math.max(...ys,0);
    const x=(v:number)=>left+(v-xmin)/(xmax-xmin||1)*span,y=(v:number)=>bottom-(v-ymin)/(ymax-ymin||1)*height;
    return <div className="hyp-chart" ref={frame}><div className="hyp-chart-caption">{p.conditions[0].source} · {p.conditions[0].metric==="level"?"level":p.conditions[0].metric+"M change"}<span>{p.asset} {p.horizon}M return · %</span></div>
      <svg viewBox={`0 0 ${width} 210`} role="img" aria-label="Spaced observations and OLS fit line"><defs><clipPath id={id}><rect x={left} y={top} width={span} height={height}/></clipPath></defs>
        {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={left} x2={right} y1={top+t*height} y2={top+t*height} className="chart-grid"/><text x="2" y={top+4+t*height} className="chart-label">{f(ymax-t*(ymax-ymin))}%</text><text x={left+t*span} y="203" textAnchor={t===0?"start":t===1?"end":"middle"} className="chart-label">{f(xmin+t*(xmax-xmin))}</text></g>)}
        <g clipPath={`url(#${id})`}><line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeDasharray="3 3"/><line x1={x(0)} x2={x(0)} y1={top} y2={bottom} stroke="var(--muted)" strokeDasharray="3 3"/>
          {points.map(c=><circle key={c.date} cx={x(c.values[0])} cy={y(c.returns[String(p.horizon)]!)} r="3.5" fill="var(--teal)" fillOpacity=".7"><title>{`${c.date} · X ${f(c.values[0])} · ${p.asset} ${p.horizon}M ${f(c.returns[String(p.horizon)])}%`}</title></circle>)}
          {s.slope!=null&&s.intercept!=null?<line x1={x(xmin)} y1={y(s.intercept+s.slope*xmin)} x2={x(xmax)} y2={y(s.intercept+s.slope*xmax)} stroke="var(--blue)" strokeWidth="1.5"/>:null}
        </g>
      </svg><div className="hyp-legend"><span>● Spaced observations · N={s.n}</span><span>OLS fit · R² {s.r2?.toFixed(3)??"N/A"} · Pearson {f(s.pearson)}</span></div></div>;
  }
  const event=r.distribution?.event??[],other=r.distribution?.control??[],base=p.baseline==="full"?[...event,...other]:other,all=[...event,...other];
  if(!all.length)return <div className="empty-state">No complete forward outcomes.</div>;
  const lo=Math.min(...all),hi=Math.max(...all),binWidth=(hi-lo||1)/18;
  const bin=(arr:number[])=>Array.from({length:18},(_,i)=>arr.filter(v=>Math.min(17,Math.floor((v-lo)/binWidth))===i).length/(arr.length||1));
  const eb=bin(event),bb=bin(base),max=Math.max(...eb,...bb,.01),x=(v:number)=>left+(v-lo)/(hi-lo||1)*span;
  return <div className="hyp-chart" ref={frame}><div className="hyp-chart-caption">Forward-return distributions<span>Frequency normalized per group · %</span></div>
    <svg viewBox={`0 0 ${width} 210`} role="img" aria-label="Event and baseline forward-return histograms">
      {[0,.5,1].map(t=><g key={t}><line x1={left} x2={right} y1={bottom-t*height} y2={bottom-t*height} className="chart-grid"/><text x="2" y={bottom+4-t*height} className="chart-label">{(max*t*100).toFixed(0)}%</text></g>)}
      {eb.map((count,i)=><g key={i}><rect x={left+i*span/18} y={bottom-bb[i]/max*height} width={Math.max(1,span/18-2)} height={bb[i]/max*height} fill="var(--blue)" opacity=".35"/><rect x={left+i*span/18+span/18*.2} y={bottom-count/max*height} width={span/18*.6} height={count/max*height} fill="var(--teal)" opacity=".8"><title>{`${f(lo+i*binWidth)} to ${f(lo+(i+1)*binWidth)}% · event ${(count*100).toFixed(1)}% · baseline ${(bb[i]*100).toFixed(1)}%`}</title></rect></g>)}
      {s.event?.median!=null?<line x1={x(s.event.median)} x2={x(s.event.median)} y1={top} y2={bottom} stroke="var(--teal)" strokeWidth="2"/>:null}
      {s.baseline?.median!=null?<line x1={x(s.baseline.median)} x2={x(s.baseline.median)} y1={top} y2={bottom} stroke="var(--blue)" strokeDasharray="4 4"/>:null}
      {[0,.25,.5,.75,1].map(t=><text key={t} x={left+t*span} y="203" textAnchor={t===0?"start":t===1?"end":"middle"} className="chart-label">{f(lo+t*(hi-lo))}%</text>)}
    </svg><div className="hyp-legend"><span>● Event · N={event.length} · mean {f(s.event?.mean)}% · median {f(s.event?.median)}%</span><span>▪ {p.baseline==="full"?"Full sample (includes events)":"Other periods"} · N={base.length} · mean {f(s.baseline?.mean)}% · median {f(s.baseline?.median)}%</span></div></div>;
}
