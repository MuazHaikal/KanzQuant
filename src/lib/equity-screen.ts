import type {Equity} from "./equities";
export const numeric=(row:Equity,key:string)=>{const v=row.features?.[key];return typeof v==="number"&&Number.isFinite(v)?v:null;};
export const PRESETS=["All equities","Momentum Leaders","Short-Term Reversals","Near 52W High","High Volatility","Deep Drawdowns","Strong Revenue Growth","Profitable Growth"] as const;
export function presetMatches(r:Equity,preset:string){
 const n=(k:string)=>numeric(r,k);
 switch(preset){
 case "Momentum Leaders":return (n("momentum_percentile")??-1)>=80;
 case "Short-Term Reversals":return n("z20")!==null&&n("sma200_distance")!==null&&n("z20")!<=-1.5&&n("sma200_distance")!>0;
 case "Near 52W High":return n("high52_proximity")!==null&&n("high52_proximity")!>=-5;
 case "High Volatility":return (n("volatility_percentile")??-1)>=80;
 case "Deep Drawdowns":return n("drawdown")!==null&&n("drawdown")!<=-30;
 case "Strong Revenue Growth":return (n("revenue_ttm_growth")??-Infinity)>=20;
 case "Profitable Growth":return (n("revenue_ttm_growth")??-Infinity)>10&&(n("operating_margin")??-Infinity)>0;
 default:return true;
 }
}
export type ScreenFilters={query:string;sector:string;preset:string;minimums:Record<string,string>;maximums:Record<string,string>;fcf:string};
export function screenRows(rows:Equity[],filters:ScreenFilters,sort:string,ascending=false){
 return rows.filter(r=>{
 if(!`${r.symbol} ${r.name}`.toLowerCase().includes(filters.query.trim().toLowerCase())||filters.sector&&r.sector!==filters.sector||!presetMatches(r,filters.preset))return false;
 for(const [key,text] of Object.entries(filters.minimums)){if(text.trim()&&(numeric(r,key)==null||numeric(r,key)!<Number(text)))return false;}
 for(const [key,text] of Object.entries(filters.maximums)){if(text.trim()&&(numeric(r,key)==null||numeric(r,key)!>Number(text)))return false;}
 if(filters.fcf&& (numeric(r,"fcf")==null||(filters.fcf==="positive"?numeric(r,"fcf")!<=0:numeric(r,"fcf")!>=0)))return false;
 return true;
 }).sort((a,b)=>{if(["symbol","name","sector"].includes(sort))return String(a[sort as keyof Equity]??"").localeCompare(String(b[sort as keyof Equity]??""))*(ascending?1:-1);const x=numeric(a,sort),y=numeric(b,sort);return x==null?y==null?a.symbol.localeCompare(b.symbol):1:y==null?-1:(x-y)*(ascending?1:-1)||a.symbol.localeCompare(b.symbol);});
}
