"use client";
import { useState } from "react";
import type { ForecastPoint,Correlations } from "@/lib/forecast-types";
const colors=["var(--text)","var(--teal)","var(--cyan)"];
export function ForecastPlot({layers,title,interval=false,boundary,height=230}:{layers:{name:string;points:ForecastPoint[]}[];title:string;interval?:boolean;boundary?:string;height?:number}){
 const [selected,setSelected]=useState<string>("");
 const dates=[...new Set(layers.flatMap(l=>l.points.map(p=>p.date)))].sort();
 if(!dates.length)return <div className="forecast-empty">NO VALID FORECAST</div>;
 const stamps=dates.map(d=>Date.parse(d)),first=stamps[0],span=stamps.at(-1)!-first||1;
 const values=layers.flatMap(l=>l.points.flatMap(p=>[p.value,...(interval?[p.lower,p.upper].filter((v):v is number=>v!=null):[])]));
 const min=Math.min(...values),max=Math.max(...values),extent=max-min||1,x=(d:string)=>58+(Date.parse(d)-first)/span*914,y=(v:number)=>18+(max-v)/extent*(height-54);
 const current=selected||dates.at(-1)!;
 return <div className="forecast-plot"><svg viewBox={`0 0 1000 ${height}`} role="img" aria-label={`${title}. Arrow keys inspect dates.`} tabIndex={0} onKeyDown={e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key)){e.preventDefault();const i=dates.indexOf(current);setSelected(dates[e.key==="Home"?0:e.key==="End"?dates.length-1:Math.max(0,Math.min(dates.length-1,i+(e.key==="ArrowLeft"?-1:1)))]);}}} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect(),t=first+(((e.clientX-r.left)/r.width*1000-58)/914)*span;setSelected(dates.reduce((a,b)=>Math.abs(Date.parse(a)-t)<Math.abs(Date.parse(b)-t)?a:b));}}>
 {[0,.25,.5,.75,1].map(f=><g key={f}><line x1="58" x2="972" y1={18+f*(height-54)} y2={18+f*(height-54)} stroke="var(--line)"/><text x="4" y={22+f*(height-54)}>{(max-f*extent).toFixed(2)}</text></g>)}
 {boundary&&<g><line x1={x(boundary)} x2={x(boundary)} y1="12" y2={height-32} stroke="var(--warning)" strokeDasharray="3 3"/><text x={Math.min(800,x(boundary)+8)} y="12">FORECAST ORIGIN</text></g>}
 {layers.map((l,i)=>{const bounds=l.points.filter(p=>p.lower!=null&&p.upper!=null);return <g key={l.name}>{interval&&bounds.length>0&&<path d={bounds.map((p,j)=>`${j?"L":"M"}${x(p.date)},${y(p.upper!)}`).join(" ")+bounds.toReversed().map(p=>`L${x(p.date)},${y(p.lower!)}`).join(" ")+"Z"} fill="var(--teal)" opacity=".15"/>}<path d={l.points.map((p,j)=>`${j?"L":"M"}${x(p.date)},${y(p.value)}`).join(" ")} fill="none" stroke={colors[i%3]} strokeWidth="1.6" strokeDasharray={i===1?"5 3":undefined} vectorEffect="non-scaling-stroke"/>{l.points.length===1&&<circle cx={x(l.points[0].date)} cy={y(l.points[0].value)} r="3" fill={colors[i%3]}/>}</g>;})}
 <line x1={x(current)} x2={x(current)} y1="18" y2={height-36} stroke="var(--warning)" strokeDasharray="3 3"/>{[0,.5,1].map(f=><text key={f} x={58+914*f} y={height-10} textAnchor={f===0?"start":f===1?"end":"middle"}>{new Date(first+span*f).toISOString().slice(0,7)}</text>)}
 </svg><div className="forecast-readout" aria-live="polite"><b>{current}</b>{layers.map((l,i)=>{const p=l.points.find(p=>p.date===current);return <span style={{color:colors[i%3]}} key={l.name}>{i?"┄":"━"} {l.name} <strong>{p?.value.toFixed(3)??"—"}</strong>{interval&&p?.lower!=null&&<small> [{p.lower.toFixed(3)}, {p.upper?.toFixed(3)}]</small>}</span>;})}</div></div>;
}
export function CorrelationPlot({data,name}:{data:Correlations;name:"acf"|"pacf"}){
 const values=data[name];return <svg className="correlation-plot" viewBox="0 0 600 140" role="img" aria-label={`${name.toUpperCase()} with approximate 95% zero-correlation bounds`}><line x1="30" x2="590" y1="65" y2="65" stroke="var(--line)"/>{data.bound!=null&&[-1,1].map(s=><line key={s} x1="30" x2="590" y1={65+s*data.bound!*55} y2={65+s*data.bound!*55} stroke="var(--muted)" strokeDasharray="3 4"/>)}{values.map((v,i)=><g key={i}><line x1={45+i*530/values.length} x2={45+i*530/values.length} y1="65" y2={65-v*55} stroke="var(--teal)" strokeWidth="5"/><text x={45+i*530/values.length} y="133" textAnchor="middle">{i+1}</text><title>{`Lag ${i+1}: ${v.toFixed(3)}`}</title></g>)}</svg>;
}
