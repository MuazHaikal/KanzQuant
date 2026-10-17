import { intervals,ranges,type Interval,type MarketRange,type Bar,aggregateBars,monthsBack,periodStart } from "./market-math";
import type { Point } from "./research-data";
export type ChartSeries={id:string;displayName:string;shortName:string;category:string;type:"market"|"factor"|"macro";unit:string;technicalId:string;description:string;availableFrom:string;availableTo:string;frequency:string;chartMode:"candles"|"line";preview:Point[]};
export type ExplorerState={series:string[];range:MarketRange;interval:Interval;mode:"chart"|"compare"|"context"|"events";comparison:"separate"|"normalized";date:string};
export type ExplorerData={id:string;points:Point[];bars?:Bar[]};
export const viewKey="kanzquant.views.v031";
export type SavedView={id:string;name:string;state:ExplorerState};
export function validChartDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;}
export function parseExplorer(query:Record<string,string|undefined>,catalog:ChartSeries[]):ExplorerState {
 const ids=[...new Set((query.series??"SPX").split(","))].filter(id=>catalog.some(s=>s.id===id)).slice(0,4);
 const market=catalog.find(c=>c.id===(ids[0]??"SPX"))?.type==="market";
 return {series:ids.length?ids:["SPX"],range:ranges.includes(query.range as MarketRange)?query.range as MarketRange:"3Y",interval:intervals.includes(query.interval as Interval)?query.interval as Interval:market?"1D":"1M",mode:["chart","compare","context","events"].includes(query.mode??"")?query.mode as ExplorerState["mode"]:"chart",comparison:query.comparison==="normalized"?"normalized":"separate",date:validChartDate(query.date??"")?query.date!:""};
}
export function explorerQuery(state:ExplorerState){return new URLSearchParams({series:state.series.join(","),range:state.range,interval:state.interval,mode:state.mode,comparison:state.comparison,...(state.date?{date:state.date}:{})}).toString();}
export function latestAt(points:Point[],date:string):Point|undefined {let lo=0,hi=points.length;while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid].date<=date)lo=mid+1;else hi=mid;}return points[lo-1];}
export function availableDate(date:string,frequency:string){const d=new Date(date+"T00:00:00Z"),lag=frequency==="Monthly"?1:frequency==="Quarterly"?3:0;return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+lag+1,0)).toISOString().slice(0,10);}
export function normalize(points:Point[],from:string,to:string):Point[]{const visible=points.filter(p=>p.date>=from&&p.date<=to),base=visible[0]?.value;if(!base||base<0)return [];return visible.map(p=>({...p,value:p.value/base*100}));}
export function intervalPoints(data:ExplorerData,interval:Interval):Point[]{if(data.bars)return aggregateBars(data.bars,interval).map(b=>({date:b.end,value:b.close}));if(["1D","1W","1M"].includes(interval))return data.points;const periods=new Map<string,Point>();for(const p of data.points)periods.set(periodStart(p.date,interval),p);return [...periods.values()];}
export function visibleStart(latest:string,range:MarketRange,first:string){return range==="MAX"?first:monthsBack(latest,range.endsWith("Y")?Number.parseInt(range)*12:Number.parseInt(range));}
export function restoreViews(raw:string,catalog:ChartSeries[]):SavedView[]{try{const v=JSON.parse(raw);if(!Array.isArray(v))return [];return v.filter(x=>typeof x.id==="string"&&typeof x.name==="string"&&x.state&&Array.isArray(x.state.series)).slice(0,20).map(x=>({id:x.id,name:x.name.slice(0,80),state:parseExplorer({...x.state,series:x.state.series.join(",")},catalog)}));}catch{return [];}}
