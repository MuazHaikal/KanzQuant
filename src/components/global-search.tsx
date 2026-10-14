"use client";
import Link from "next/link";
import { useState } from "react";
export type SearchItem = {label:string;href:string;kind:string;keywords?:string};
export function GlobalSearch({items}:{items:SearchItem[]}) {
  const [query,setQuery] = useState(""), [open,setOpen] = useState(false);
  const results = query.trim() ? items.filter(item => `${item.label} ${item.keywords ?? ""}`.toLowerCase().includes(query.toLowerCase().trim())).slice(0,8) : [];
  return <div className="global-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
    <input aria-label="Search factors, series, dates and modules" placeholder="Search markets, series, research…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);e.stopPropagation();}if(e.key==="ArrowDown"){e.preventDefault();e.currentTarget.parentElement?.querySelector<HTMLAnchorElement>("a")?.focus();}}}/>
    {open && query.trim() && <div className="search-results" aria-label="Search results">{results.length ? results.map(item=><Link key={item.href} href={item.href} onClick={()=>{setOpen(false);setQuery("");}}><span>{item.label}</span><small>{item.kind}</small></Link>) : <span className="search-empty">No matching research</span>}</div>}
  </div>;
}
