"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Point } from "@/lib/research-data";
export function ResearchChart({series,height=200,zero=false,regimes=[],inspectDates=[],initialStart}:{series:{name:string;points:Point[];color?:string}[];height?:number;zero?:boolean;regimes?:{date:string;color:string}[];inspectDates?:string[];initialStart?:string}){
 const router=useRouter(),all=series[0]?.points??[],maxIndex=Math.max(0,all.length-1);
 const initialIndex=initialStart?Math.max(0,all.findIndex(p=>p.date>=initialStart)):0;
 const [range,setRange]=useState<[number,number]>([initialIndex,maxIndex]),[hover,setHover]=useState<number|null>(null),[selected,setSelected]=useState<number|null>(null),[overlay,setOverlay]=useState("");
 const drag=useRef<{x:number;range:[number,number]}|null>(null);
 const lo=Math.min(range[0],maxIndex),hi=Math.min(range[1],maxIndex),points=all.slice(lo,hi+1),span=Math.max(1,hi-lo);
 const active=series.filter((s,i)=>i===0||!s.name.startsWith("Overlay:")||s.name===overlay);
 const values=active.flatMap(s=>s.points.filter(p=>points.length&&p.date>=points[0].date&&p.date<=points.at(-1)!.date).map(p=>p.value));
 if(!points.length)return <div className="empty-state">NO AVAILABLE HISTORY</div>;
 const min=Math.min(...values,...(zero?[0]:[])),max=Math.max(...values,...(zero?[0]:[])),extent=max-min||1;
 const y=(v:number)=>15+(max-v)/extent*(height-45),x=(i:number)=>48+i/span*900;
 const setWindow=(start:number,end:number)=>setRange([Math.max(0,start),Math.min(maxIndex,end)]);
 const zoom=(direction:number)=>{const change=Math.max(2,Math.round(span*.15));if(direction<0&&span>8)setWindow(lo+change,hi-change);else setWindow(lo-change,hi+change);};
 return <div className="interactive-chart">
 <div className="chart-tools"><span>{points[0].date} → {points.at(-1)!.date}{active.length>1?active.map((s,i)=><span key={s.name} style={{color:s.color??["#28d7c0","#55bde5","#e2b66b"][i%3]}}> · {s.name.replace("Overlay:","")}</span>):null}</span><div>{series.some(s=>s.name.startsWith("Overlay:"))?<select aria-label="Factor overlay" value={overlay} onChange={e=>setOverlay(e.target.value)}><option value="">NO OVERLAY</option>{series.filter(s=>s.name.startsWith("Overlay:")).map(s=><option key={s.name} value={s.name}>{s.name}</option>)}</select>:null}<button onClick={()=>zoom(-1)} aria-label="Zoom in">+</button><button onClick={()=>zoom(1)} aria-label="Zoom out">−</button><button onClick={()=>setRange([0,maxIndex])}>RESET</button></div></div>
 <svg preserveAspectRatio="none" viewBox={`0 0 980 ${height}`} style={{height}} role="img" aria-label={series.map(s=>s.name).join(", ")+" interactive history"} onPointerDown={e=>{drag.current={x:e.clientX,range:[lo,hi]};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(drag.current&&Math.abs(e.clientX-drag.current.x)<4){const box=e.currentTarget.getBoundingClientRect();setSelected(lo+Math.round(Math.max(0,Math.min(1,(e.clientX-box.left-48/980*box.width)/(900/980*box.width)))*span));}drag.current=null;}} onPointerMove={e=>{
 const box=e.currentTarget.getBoundingClientRect();const fraction=Math.max(0,Math.min(1,(e.clientX-box.left-48/980*box.width)/(900/980*box.width)));setHover(lo+Math.round(fraction*span));
 if(drag.current){const shift=Math.round((drag.current.x-e.clientX)/box.width*span),width=drag.current.range[1]-drag.current.range[0],start=Math.max(0,Math.min(maxIndex-width,drag.current.range[0]+shift));setWindow(start,start+width);}
 }} onPointerLeave={()=>setHover(null)}>
 {regimes.filter(r=>r.date>=points[0].date&&r.date<=points.at(-1)!.date).map(r=>{const i=points.findIndex(p=>p.date===r.date);return i<0?null:<rect key={r.date} x={x(i)} y={15} width={900/span+1} height={height-45} fill={r.color} opacity=".065"/>;})}
 {[0,.25,.5,.75,1].map(f=><g key={f}><line x1="48" x2="948" y1={15+f*(height-45)} y2={15+f*(height-45)} stroke="#21333c"/><text x="4" y={19+f*(height-45)}>{(max-f*extent).toFixed(1)}</text></g>)}
 {zero?<line x1="48" x2="948" y1={y(0)} y2={y(0)} stroke="#28d7c0" strokeDasharray="3 3" opacity=".5"/>:null}
 {active.map((s,si)=>{const byDate=new Map(s.points.map(p=>[p.date,p.value]));let connected=false;const path=points.map((p,i)=>{const value=byDate.get(p.date);if(value===undefined){connected=false;return "";}const command=connected?"L":"M";connected=true;return `${command}${x(i)},${y(value)}`;}).join(" ");return <path key={s.name} d={path} fill="none" stroke={s.color??["#28d7c0","#55bde5","#e2b66b"][si%3]} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>;})}
 {selected!==null&&selected>=lo&&selected<=hi?<line x1={x(selected-lo)} x2={x(selected-lo)} y1="15" y2={height-30} stroke="#e2b66b" strokeWidth="2"/>:null}
 <circle cx={x(points.length-1)} cy={y(points.at(-1)!.value)} r="3.5" fill="#28d7c0"/>
 {hover!==null&&all[hover]?<g><line x1={x(hover-lo)} x2={x(hover-lo)} y1="15" y2={height-30} stroke="#839ca5" strokeDasharray="3 3"/><rect x="55" y="18" width="410" height="23" fill="#071016" stroke="#28424e"/><text x="62" y="33" fill="#d9e4e8">{all[hover].date} · {active.map(s=>s.name.replace("Overlay:","")+": "+(s.points.find(p=>p.date===all[hover].date)?.value.toFixed(2)??"N/A")).join(" · ")}</text></g>:null}
 <text x="48" y={height-6}>{points[0].date}</text><text x="948" textAnchor="end" y={height-6}>{points.at(-1)!.date}</text>
 </svg><div className="chart-brush"><input aria-label="History start" type="range" min="0" max={maxIndex} value={lo} onChange={e=>setWindow(Math.min(Number(e.target.value),hi-1),hi)}/><input aria-label="History end" type="range" min="0" max={maxIndex} value={hi} onChange={e=>setWindow(lo,Math.max(Number(e.target.value),lo+1))}/><button disabled={selected===null||!inspectDates.includes(all[selected]?.date)} onClick={()=>selected!==null&&router.push("/focus/analogue/"+all[selected].date)}>INSPECT SELECTED DATE ↗</button></div>
 </div>;
}
