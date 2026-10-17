"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {PanelLeftClose,PanelLeftOpen,ChevronDown,Menu,X} from "lucide-react";
import {NavigationIcon} from "./navigation-icon";
import {version} from "../../package.json";
const sections=[
  {name:"Overview",href:"/",links:[]},
  {name:"Equities",href:"/equities",links:[["Discover","/equities"],["Screener","/equities/screener"]]},
  {name:"Chart Explorer",href:"/chart",links:[]},
  {name:"Evidence Library",href:"/evidence",links:[]},
  {name:"Forecastability",href:"/research/forecast",links:[]},
  {name:"Factor Focus",href:"/focus/factor/growth",links:["growth","inflation","rates","credit","liquidity","volatility"].map(f=>[f[0].toUpperCase()+f.slice(1),"/focus/factor/"+f])},
  {name:"Historical Analogues",href:"/similarity",links:[["Similar periods","/similarity"],["Macro states","/regimes"]]},
  {name:"Data Catalogue",href:"/data",links:[["Catalogue","/data"],["Indicators","/macro"]]},
  {name:"Help",href:"/guide",links:[]},
];
function active(name:string,path:string){
  if(name==="Overview")return path==="/"||path==="/focus/market"||path.startsWith("/focus/returns")||path==="/focus/regime";
  if(name==="Equities")return path.startsWith("/equities");
  if(name==="Evidence Library")return path.startsWith("/evidence")||path.startsWith("/hypothesis");
  if(name==="Forecastability")return path.startsWith("/research/forecast");
  if(name==="Factor Focus")return path.startsWith("/focus/factor");
  if(name==="Historical Analogues")return path.startsWith("/similarity")||path.startsWith("/focus/analogue")||path==="/regimes";
  if(name==="Data Catalogue")return path==="/data"||path==="/macro";
  return path===(sections.find(s=>s.name===name)?.href);
}
export function ResearchNavigation({count}:{count:number}){
  const path=usePathname(),[expanded,setExpanded]=useState(true),[drawer,setDrawer]=useState(false),[section,setSection]=useState("");
  useEffect(()=>{const frame=requestAnimationFrame(()=>{try{setExpanded(localStorage.getItem("kanzquant.nav.canonical.v1")!=="collapsed");}catch{}});return()=>cancelAnimationFrame(frame);},[]);
  function pin(){const next=!expanded;setExpanded(next);try{localStorage.setItem("kanzquant.nav.canonical.v1",next?"expanded":"collapsed");}catch{}}
  function close(){setDrawer(false);setSection("");}
  return <><button className="mobile-nav-toggle" aria-label="Open navigation" aria-expanded={drawer} onClick={()=>setDrawer(v=>!v)}><Menu size={20}/></button>{drawer&&<button className="nav-scrim" aria-label="Close navigation" onClick={close}><X/></button>}
    <aside className={`sidebar research-nav ${expanded?"nav-expanded":""} ${drawer?"nav-drawer":""}`} aria-label="Main navigation" onKeyDown={e=>{if(e.key==="Escape")close();}}>
      <div className="rail-brand"><span className="rail-label">WORKSPACE</span><button className="rail-pin" aria-label={expanded?"Collapse navigation":"Expand navigation"} aria-expanded={expanded} onClick={pin}>{expanded?<PanelLeftClose size={16}/>:<PanelLeftOpen size={16}/>}</button></div>
      <nav>{sections.map(s=><div className={`rail-item ${section===s.name?"rail-open":""}`} key={s.name}><Link title={s.name} aria-label={s.name} aria-current={active(s.name,path)?"page":undefined} className={`nav-link ${active(s.name,path)?"active":""}`} href={s.href} onClick={close}><span className="rail-icon" aria-hidden="true"><NavigationIcon name={s.name}/></span><span className="rail-label">{s.name}</span></Link>{s.links.length>0&&<><button className="rail-submenu-toggle" aria-label={`Open ${s.name} links`} aria-expanded={section===s.name} onClick={()=>setSection(v=>v===s.name?"":s.name)}><ChevronDown size={12}/></button><div className="rail-submenu"><strong>{s.name}</strong>{s.links.map(([name,href])=><Link key={href} href={href} onClick={close}>{name}</Link>)}</div></>}</div>)}</nav>
      <div className="sidebar-foot"><span>{"RESEARCH · v"+version}</span><div className="rail-label">{count} economic indicators<br/>FRED · Yahoo · SEC · Neon</div></div>
    </aside></>;
}
