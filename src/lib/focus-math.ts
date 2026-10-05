import type { ResearchSnapshot, Point } from "./research-data";
export const factors = ["growth","inflation","rates","credit","liquidity","volatility"] as const;
export type Factor = typeof factors[number];
export const horizons = ["1m","3m","6m","12m"] as const;
export type Horizon = typeof horizons[number];
export function isFactor(value:string): value is Factor { return factors.includes(value as Factor); }
export function isHorizon(value:string): value is Horizon { return horizons.includes(value as Horizon); }
export function validDate(value:string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+"T00:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value; }
const components: Record<Factor,{positive:string[];negative:string[]}> = {
 growth:{positive:["payrolls_yoy","industrial_production_yoy","retail_sales_yoy","real_gdp_yoy","spx_momentum_6m"],negative:["unemployment_level","claims_yoy"]},
 inflation:{positive:["cpi_yoy","core_cpi_yoy","pce_yoy"],negative:[]},
 rates:{positive:["fed_funds_level","us2y_level","us10y_level","curve_10y2y"],negative:[]},
 credit:{positive:["baa_10y_spread"],negative:[]},
 liquidity:{positive:["m2_yoy","fed_assets_yoy"],negative:[]},
 volatility:{positive:["vix_level","baa_10y_spread","spx_volatility_6m"],negative:["spx_momentum_6m"]}
};
export function factorComponents(factor:Factor){return components[factor];}
export function axis(values:Record<string,number>, factor:Factor):number|null {
 const {positive,negative}=components[factor];
 if([...positive,...negative].some(key=>!Number.isFinite(values[key])))return null;
 const mean=(keys:string[])=>keys.length?keys.reduce((sum,key)=>sum+values[key],0)/keys.length:0;
 return mean(positive)-mean(negative);
}
export function factorHistory(data:ResearchSnapshot,factor:Factor):Point[] {
 return (data.state_vectors??[]).flatMap(row=>{const value=axis(row.values,factor);return value===null?[]:[{date:row.date,value}];});
}
export function quantile(values:number[],q:number):number|null {
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;
 const i=(sorted.length-1)*q,lo=Math.floor(i);return sorted[lo]+(sorted[Math.ceil(i)]-sorted[lo])*(i-lo);
}
export function stats(values:number[]) {
 const clean=values.filter(Number.isFinite),n=clean.length;
 const mean=n?clean.reduce((s,x)=>s+x,0)/n:null;
 return {n,mean,median:quantile(clean,.5),hit:n?clean.filter(x=>x>0).length/n*100:null,best:n?Math.max(...clean):null,worst:n?Math.min(...clean):null,std:n>1?Math.sqrt(clean.reduce((s,x)=>s+(x-mean!)**2,0)/(n-1)):null};
}
export function returnAt(prices:Point[],date:string,months:number,asOf:string):number|null {
 const index=prices.findIndex(p=>p.date===date),start=prices[index],end=prices[index+months];
 return start&&end&&monthIndex(end.date)-monthIndex(start.date)===months&&end.date<=asOf&&start.value>0?(end.value/start.value-1)*100:null;
}
const monthIndex=(date:string)=>Number(date.slice(0,4))*12+Number(date.slice(5,7));
export function episodes(history:Point[],asOf:string,k=10) {
 const current=history.at(-1);if(!current)return [];
 const selected:Point[]=[];
 for(const row of history.filter(p=>monthIndex(asOf)-monthIndex(p.date)>12).sort((a,b)=>Math.abs(a.value-current.value)-Math.abs(b.value-current.value))){
  if(selected.every(p=>Math.abs(monthIndex(p.date)-monthIndex(row.date))>=9))selected.push(row);
  if(selected.length===k)break;
 }
 return selected.map(p=>({...p,distance:Math.abs(p.value-current.value)}));
}
export function cosine(a:Record<string,number>,b:Record<string,number>,keys:string[]):number|null {
 if(keys.some(k=>!Number.isFinite(a[k])||!Number.isFinite(b[k])))return null;
 const norm=Math.sqrt(keys.reduce((s,k)=>s+a[k]**2,0)*keys.reduce((s,k)=>s+b[k]**2,0));
 return norm?keys.reduce((s,k)=>s+a[k]*b[k],0)/norm:null;
}
export function normalizedPath(prices:Point[],date:string,asOf:string):Point[]{
 const index=prices.findIndex(p=>p.date===date);if(index<0||prices[index].value<=0)return [];
 return prices.slice(index,index+13).filter(p=>p.date<=asOf).map(p=>({date:p.date,value:p.value/prices[index].value*100}));
}
