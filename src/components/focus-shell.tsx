"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
const names=["growth","inflation","rates","credit","liquidity","volatility"];
export function FocusShell({title,asOf,status,factor,children}:{title:string;asOf:string;status:string[];factor?:string;children:React.ReactNode}){
 const router=useRouter();
 useEffect(()=>{const key=(event:KeyboardEvent)=>{
 if(event.target instanceof HTMLElement && (event.target.matches("input,select,textarea")||event.target.isContentEditable))return;
 if(event.key==="Escape")router.push("/");
 if(factor&&(event.key==="ArrowLeft"||event.key==="ArrowRight")){event.preventDefault();const index=names.indexOf(factor);router.push("/focus/factor/"+names[(index+(event.key==="ArrowRight"?1:5))%6]);}
 };window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[router,factor]);
 return <div className="focus-workspace"><div className="focus-head"><div><Link className="back-link" href="/">← Back to Overview</Link><h1>{title}</h1></div><div className="focus-status">{status.map(s=><span key={s}>{s}</span>)}</div><div className="focus-stamp">REAL DATA · {asOf}<span className="pill live">FOCUS MODE</span></div></div>{children}</div>;
}

