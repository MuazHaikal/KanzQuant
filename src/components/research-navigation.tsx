"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect,useState } from "react";
const sections=[
 {icon:"◉",name:"Overview",href:"/",links:[]},
 {icon:"◇",name:"Explore",href:"/similarity",links:[["Market environment","/regimes"],["Similar periods","/similarity"]]},
 {icon:"⌁",name:"Charts",href:"/chart",links:[]},
 {icon:"⬡",name:"Research",href:"/research/forecast",links:[["Test an Idea","/hypothesis"],["Model a Series","/research/forecast"],["Research records","/experiments"]]},
 {icon:"▦",name:"Data",href:"/macro",links:[["Indicators","/macro"],["Data details","/data"]]},
 {icon:"?",name:"Help",href:"/guide",links:[]},
];
export function ResearchNavigation({count}:{count:number}){
 const path=usePathname(),[expanded,setExpanded]=useState(false),[drawer,setDrawer]=useState(false),[section,setSection]=useState("");
 useEffect(()=>{const frame=requestAnimationFrame(()=>{try{setExpanded(localStorage.getItem("kanzquant.nav.v04")==="expanded");}catch{}});return()=>cancelAnimationFrame(frame);},[]);
 function pin(){const next=!expanded;setExpanded(next);try{localStorage.setItem("kanzquant.nav.v04",next?"expanded":"collapsed");}catch{}}
 function close(){setDrawer(false);setSection("");}
 return <><button className="mobile-nav-toggle" aria-label="Open navigation" aria-expanded={drawer} onClick={()=>setDrawer(v=>!v)}>☰</button>{drawer&&<button className="nav-scrim" aria-label="Close navigation" onClick={close}/>}
 <aside className={`sidebar research-nav ${expanded?"nav-expanded":""} ${drawer?"nav-drawer":""}`} aria-label="Main navigation" onKeyDown={e=>{if(e.key==="Escape")close();}}>
 <div className="rail-brand"><Link href="/" aria-label="KanzQuant overview" onClick={close}>KQ</Link><button className="rail-pin" aria-label={expanded?"Collapse navigation":"Pin expanded navigation"} aria-expanded={expanded} onClick={pin}>{expanded?"«":"»"}</button></div>
 <nav>{sections.map(s=>{const active=s.name==="Overview"?path==="/"||path.startsWith("/focus"):s.name==="Research"?path.startsWith("/research")||path.startsWith("/hypothesis")||path.startsWith("/experiments"):s.name==="Explore"?path.startsWith("/similarity")||path.startsWith("/regimes"):path.startsWith(s.href);return <div className={`rail-item ${section===s.name?"rail-open":""}`} key={s.name}><Link title={s.name} aria-label={s.name} aria-current={active?"page":undefined} className={`nav-link ${active?"active":""}`} href={s.href} onClick={close}><span className="rail-icon" aria-hidden="true">{s.icon}</span><span className="rail-label">{s.name}</span></Link>{s.links.length>0&&<><button className="rail-submenu-toggle" aria-label={`Open ${s.name} links`} aria-expanded={section===s.name} onClick={()=>setSection(v=>v===s.name?"":s.name)}>›</button><div className="rail-submenu"><strong>{s.name}</strong>{s.links.map(([name,href])=><Link key={href} href={href} onClick={close}>{name} →</Link>)}</div></>}</div>;})}</nav><div className="sidebar-foot"><span>v0.4</span><div className="rail-label">KANZQUANT v0.4.0<br/>{count} ECONOMIC INDICATORS</div></div></aside></>;
}
