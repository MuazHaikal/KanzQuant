"use client";
import Link from "next/link";
import { useState } from "react";
import {useRouter} from "next/navigation";
import {Search} from "lucide-react";
export type SearchItem = {label:string;href:string;kind:string;keywords?:string};
export function GlobalSearch({items}:{items:SearchItem[]}) {
  const [query,setQuery] = useState(""), [open,setOpen] = useState(false);
  const router=useRouter(),term=query.toLowerCase().trim();
  const results = term ? items.filter(item => `${item.label} ${item.keywords ?? ""}`.toLowerCase().includes(term)).sort((a,b)=>{const score=(label:string)=>label.toLowerCase().split(" · ")[0]===term?0:label.toLowerCase().startsWith(term)?1:2;return score(a.label)-score(b.label);}).slice(0,8) : [];
  return <div className="global-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
    <Search className="global-search-icon" size={16} strokeWidth={1.7} aria-hidden="true"/>
    <input aria-label="Search factors, series, dates and modules" placeholder="Search equities, markets, research…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.key==="Enter"&&results[0]){e.preventDefault();router.push(results[0].href);setOpen(false);setQuery("");}if(e.key==="Escape"){setOpen(false);e.stopPropagation();}if(e.key==="ArrowDown"){e.preventDefault();e.currentTarget.parentElement?.querySelector<HTMLAnchorElement>("a")?.focus();}}}/>
    {open && query.trim() && <div className="search-results" aria-label="Search results">{results.length ? results.map(item=><Link key={item.href} href={item.href} onClick={()=>{setOpen(false);setQuery("");}}><span>{item.label}</span><small>{item.kind}</small></Link>) : <span className="search-empty">No matching research</span>}</div>}
  </div>;
}
