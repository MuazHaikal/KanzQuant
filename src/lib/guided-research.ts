import { defaults, type HypothesisParameters } from "./hypothesis-types";
import { factorContext } from "./factor-context";
import { factors, type Factor } from "./focus-math";
import type { ResearchSnapshot } from "./research-data";

export const marketNames: Record<string,string> = {SPX:"S&P 500",GLD:"Gold",IEF:"U.S. Treasuries"};
export const humanName = (id:string) => marketNames[id] ?? id[0]?.toUpperCase()+id.slice(1);
// Research connections only. Factor connections open charts; asset connections use existing tests.
export const relationships: Record<Factor,string[]> = {
 growth:["SPX","rates"], inflation:["rates","SPX","GLD"], rates:["SPX","IEF","credit"],
 credit:["SPX","volatility"], liquidity:["SPX","volatility","IEF"], volatility:["SPX"],
};
export type GuidedCondition={factor:Factor;metric:string;op:"below"|"above";threshold:number;label:string;percentile:number|null;change:number|null;priority:number};
export function thresholdFor(direction:number,intensity:number) { return direction<0 ? (intensity>=90?10:20) : (intensity>=90?90:80); }
export const defaultHorizon = 6;
export function prefilledCondition(observed:GuidedCondition,parameters:HypothesisParameters):GuidedCondition {
 const input=parameters.conditions[0],op=input.op==="below"?"below":"above";
 return {...observed,metric:input.metric,op,threshold:Number(input.threshold),label:input.metric==="level"?(op==="below"?"Low":"High"):(op==="below"?"Unusual decline":"Unusual rise")};
}
export function observedConditions(snapshot:ResearchSnapshot):GuidedCondition[] {
 return factors.map(factor=>{
  const c=factorContext(snapshot,factor),move=[...c.moves].sort((a,b)=>(b.percentile??0)-(a.percentile??0))[0];
  if((move.percentile??0)>=90&&move.change!==null) return {factor,metric:String(move.horizon),op:move.change<0?"below" as const:"above" as const,threshold:thresholdFor(move.change,move.percentile!),label:`${move.classification} ${move.change<0?"decline":"rise"}`,percentile:move.percentile,change:move.change,priority:c.priority};
  const direction=(c.percentile??50)<50?-1:1,tail=c.percentile===null?0:Math.max(c.percentile,100-c.percentile);
  return {factor,metric:"level",op:direction<0?"below" as const:"above" as const,threshold:thresholdFor(direction,tail),label:c.state,percentile:c.percentile,change:c.current,priority:c.priority};
 }).sort((a,b)=>b.priority-a.priority);
}
export function guidedParameters(condition:GuidedCondition,asset:string="SPX",horizon=defaultHorizon):HypothesisParameters {
 return {...defaults,conditions:[{source:condition.factor,metric:condition.metric,op:condition.op,threshold:condition.threshold}],asset:asset in marketNames?asset as HypothesisParameters["asset"]:"SPX",horizon:[3,6,12].includes(horizon)?horizon:defaultHorizon};
}
export function guidedLink(condition:GuidedCondition,asset="SPX") {
 return "/evidence?"+new URLSearchParams({source:condition.factor,asset,horizon:"6"});
}
export const presets:GuidedCondition[] = [
 {factor:"rates",metric:"level",op:"above",threshold:90,label:"Very high",percentile:null,change:null,priority:0},
 {factor:"credit",metric:"level",op:"below",threshold:10,label:"Credit stress",percentile:null,change:null,priority:0},
 {factor:"liquidity",metric:"3",op:"below",threshold:10,label:"Unusual decline",percentile:null,change:null,priority:0},
 {factor:"inflation",metric:"level",op:"above",threshold:90,label:"Very high",percentile:null,change:null,priority:0},
 {factor:"growth",metric:"3",op:"below",threshold:10,label:"Unusual decline",percentile:null,change:null,priority:0},
];
