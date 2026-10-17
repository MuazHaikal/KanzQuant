export type CatalogueEntry={id:string;technicalId:string;name:string;description:string;kind:string;category:string;frequency:string;unit:string;source:string;from:string;to:string;count:number;updated:string;latest:number|null;href:string;preview:{date:string;value:number}[]};
export type CatalogueFilters={query:string;kind:string;source:string;frequency:string;category:string};
export function catalogueRows(rows:CatalogueEntry[],filters:CatalogueFilters,sort="name",ascending=true){
 const query=filters.query.trim().toLowerCase();
 const rank=(r:CatalogueEntry)=>!query?0:r.name.toLowerCase()===query?0:r.name.toLowerCase().startsWith(query)?1:r.name.toLowerCase().includes(query)?2:r.description.toLowerCase().includes(query)?3:r.category.toLowerCase().includes(query)?4:5;
 return rows.filter(r=>(!filters.kind||r.kind===filters.kind)&&(!filters.source||r.source===filters.source)&&(!filters.frequency||r.frequency===filters.frequency)&&(!filters.category||filters.category==="ALL"||r.category===filters.category)&&`${r.name} ${r.description} ${r.category} ${r.technicalId}`.toLowerCase().includes(query)).sort((a,b)=>{const x=a[sort as keyof CatalogueEntry],y=b[sort as keyof CatalogueEntry];return rank(a)-rank(b)||(typeof x==="number"&&typeof y==="number"?x-y:String(x??"").localeCompare(String(y??"")))*(ascending?1:-1)||a.id.localeCompare(b.id);});
}
export function catalogueCoverage(row:CatalogueEntry){return /^\d{4}-\d{2}-\d{2}$/.test(row.from)&&/^\d{4}-\d{2}-\d{2}$/.test(row.to)?`${row.from.slice(0,4)} → ${row.to.slice(0,4)}`:"Unavailable";}
/** Observation age, not an inferred provider-release or ingestion status. */
export function catalogueFreshness(row:CatalogueEntry,asOf:string){
 const latest=Date.parse(row.to),today=Date.parse(asOf);
 if(!row.count||!Number.isFinite(latest)||!Number.isFinite(today))return {label:"Unavailable",detail:"No valid stored observations",tone:"neutral"};
 const days=Math.floor((today-latest)/86400000);
 if(days<0)return {label:"Future-dated",detail:"Stored observation is later than the catalogue date",tone:"warning"};
 const limits:Record<string,number>={daily:7,weekly:21,monthly:75,quarterly:180,annual:550,annually:550};
 const limit=limits[row.frequency.toLowerCase()];
 return {label:days===0?"Observed today":`${days}d old`,detail:row.kind==="Fundamental"?"Age of latest reported period end; see filing date separately":limit&&days>limit?`Older observation · exceeds ${limit}-day calendar-age guide; not a release-calendar check`:"Age of latest stored observation; not a live-feed status",tone:row.kind!=="Fundamental"&&limit&&days>limit?"warning":"neutral"};
}
