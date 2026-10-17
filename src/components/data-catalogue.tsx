"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {catalogueRows,catalogueCoverage,catalogueFreshness,type CatalogueEntry} from "@/lib/catalogue-types";
import {numberText} from "@/lib/evidence";
import {Panel,LineChart} from "./ui";

export function DataCatalogue({rows,asOf,initialQuery="",initialCategory=""}:{rows:CatalogueEntry[];asOf:string;initialQuery?:string;initialCategory?:string}){
 const [filters,setFilters]=useState({query:initialQuery,kind:"",source:"",frequency:"",category:initialCategory});
 const [selected,setSelected]=useState(rows.find(r=>r.technicalId==="DGS10")?.id??rows[0]?.id);
 const [sort,setSort]=useState("name"),[ascending,setAscending]=useState(true);
 const filtered=useMemo(()=>catalogueRows(rows,filters,sort,ascending),[rows,filters,sort,ascending]);
 const detail=filtered.find(r=>r.id===selected)??filtered[0];
 const freshness=detail?catalogueFreshness(detail,asOf):null;
 const kinds=["",...new Set(rows.map(r=>r.kind))];
 function order(key:string){setAscending(sort===key?!ascending:key!=="count");setSort(key);}
 function clear(){setFilters({query:"",kind:"",source:"",frequency:"",category:""});}
 return <div className="canonical-catalogue">
  <header className="migration-page-title"><div><h1>Data Catalogue</h1><p>Available market, macro and fundamental datasets.</p></div><span className="catalogue-asof">Catalogue checked {asOf} · UTC</span></header>
  <section className="panel catalogue-controls">
   <nav aria-label="Dataset categories">{kinds.map(kind=><button key={kind} aria-pressed={filters.kind===kind} onClick={()=>setFilters(old=>({...old,kind}))}>{kind||"All"}<small>{rows.filter(r=>!kind||r.kind===kind).length}</small></button>)}</nav>
   <input type="search" aria-label="Search data catalogue" placeholder="Search names, descriptions, symbols or categories…" value={filters.query} onChange={e=>setFilters(old=>({...old,query:e.target.value}))}/>
   <select aria-label="Data provider" value={filters.source} onChange={e=>setFilters(old=>({...old,source:e.target.value}))}><option value="">All sources</option>{[...new Set(rows.map(r=>r.source))].sort().map(s=><option key={s}>{s}</option>)}</select>
   <select aria-label="Data frequency" value={filters.frequency} onChange={e=>setFilters(old=>({...old,frequency:e.target.value}))}><option value="">All frequencies</option>{[...new Set(rows.map(r=>r.frequency))].sort().map(s=><option key={s}>{s}</option>)}</select>
   {filters.category&&filters.category!=="ALL"&&<button onClick={()=>setFilters(old=>({...old,category:""}))}>Clear {filters.category} filter ×</button>}
  </section>
  <div className="catalogue-layout"><Panel title="Available Series" meta={`${filtered.length.toLocaleString("en-US")} matching / ${rows.length.toLocaleString("en-US")} datasets`} noPad>
   <div className="workstation-table-scroll catalogue-table-scroll" tabIndex={0} role="region" aria-label="Available datasets" onKeyDown={e=>{if(e.target!==e.currentTarget)return;const table=e.currentTarget;if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"].includes(e.key)){e.preventDefault();if(e.key==="Home"||e.key==="End")table.scrollTo({top:e.key==="Home"?0:table.scrollHeight});else table.scrollBy({top:(e.key==="ArrowUp"||e.key==="PageUp"?-1:1)*(e.key.startsWith("Page")?table.clientHeight-40:49)});}}}><table className="data-table catalogue-table"><thead><tr>{[["name","Series / dataset"],["kind","Category"],["frequency","Frequency"],["from","Coverage"],["count","Observations"],["to","Freshness"],["source","Source"]].map(([key,label])=><th key={key} scope="col" aria-sort={sort===key?ascending?"ascending":"descending":"none"}><button onClick={()=>order(key)} aria-label={`Sort by ${label}${sort===key?ascending?", ascending":", descending":""}`}>{label}{sort===key?ascending?" ↑":" ↓":""}</button></th>)}</tr></thead><tbody>{filtered.map(r=>{const age=catalogueFreshness(r,asOf);return <tr key={r.id} aria-selected={detail?.id===r.id}><td><button className="catalogue-select" aria-pressed={detail?.id===r.id} onClick={()=>setSelected(r.id)}>{r.name}</button><small title={r.description}>{r.description}</small></td><td>{r.kind}<small>{r.category}</small></td><td><span className="catalogue-frequency">{r.frequency}</span></td><td>{catalogueCoverage(r)}</td><td>{Number.isFinite(r.count)?r.count.toLocaleString("en-US"):"Unavailable"}</td><td><span className={`catalogue-age ${age.tone}`} title={age.detail}>{age.label}</span><small>{/^\d{4}-/.test(r.to)?r.to:"Unavailable"}</small></td><td>{r.source}</td></tr>;})}</tbody></table>{!filtered.length&&<div className="empty-state"><p>No datasets match these filters.</p><button className="study-open" onClick={clear}>Clear filters</button></div>}</div>
   <footer className="evidence-table-note">Stored observation age, not live-feed status. Fundamentals use reported period end; filing dates are separate.</footer>
  </Panel>
  <aside className="catalogue-detail-rail">{detail&&freshness?<><Panel title="Series Details" meta={detail.kind}>
   <div className="catalogue-detail-title"><h2>{detail.name}</h2><span>{detail.category} · {detail.frequency}</span></div>
   <p className="catalogue-description">{detail.description}</p>
   <dl className="catalogue-detail-metadata">{[
    ["Coverage",catalogueCoverage(detail)==="Unavailable"?"Unavailable":detail.from+" → "+detail.to],
    [detail.kind==="Fundamental"?"Reported quarters":"Observations",detail.count.toLocaleString("en-US")],
    ["Latest value",detail.kind==="Fundamental"?"Not applicable · financial statements":detail.latest===null||!Number.isFinite(detail.latest)?"Unavailable":numberText(detail.latest)],
    ["Observation date",detail.to],["Units",detail.unit],["Freshness",freshness.label],
   ].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
   <div className="catalogue-quality"><span className={detail.count?"":"warning"}>{detail.count?"Available":"Unavailable"}</span><p>{detail.kind==="Fundamental"?"Reported quarters stored; individual financial fields may be unavailable.":detail.count?"Finite stored observations only. Availability is not a completeness score.":"No valid observations are stored."}</p></div>
   <Link className="study-open" href={detail.href}>Open research ↗</Link>
   <details className="catalogue-technical"><summary>Technical details</summary><dl><dt>Provider identifier</dt><dd>{detail.technicalId}</dd><dt>Storage</dt><dd>Neon · persisted datasets</dd><dt>Freshness guide</dt><dd>{freshness.detail}</dd></dl></details>
  </Panel>
  <Panel title="Source" meta={detail.source}><div className="catalogue-source"><strong>{detail.source}</strong><dl className="catalogue-detail-metadata"><div><dt>{detail.kind==="Fundamental"?"Latest filing":detail.kind==="Market"?"Last ingestion":detail.kind==="Derived"?"Research built":"Metadata updated"}</dt><dd>{detail.updated.replace(/^Filed /,"")}</dd></div></dl><p>{detail.kind==="Fundamental"?"Current SEC restatements, not point-in-time vintages.":detail.kind==="Derived"?"Descriptive composite from existing macro inputs.":"Stored provider data; not a real-time feed."}</p></div></Panel>
  {detail.preview.length>1&&<Panel title="Series Preview" meta={`${detail.preview[0].date} → ${detail.preview.at(-1)?.date}`}><LineChart data={detail.preview} height={125} label={detail.name+" observed history"}/></Panel>}
  </>:<Panel title="Series Details"><div className="empty-state">Select a matching dataset to inspect its history and source.</div></Panel>}</aside></div>
 </div>;
}
