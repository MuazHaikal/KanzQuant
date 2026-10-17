import {CheckCircle2,MinusCircle,TriangleAlert,TrendingDown} from "lucide-react";
import {evidenceTone,stateText,type EvidenceState} from "@/lib/evidence";

export function EvidenceStateIcon({state,effect,size=15}:{state:EvidenceState;effect:number|null;size?:number}){
 const tone=evidenceTone(state,effect),Icon=tone==="insufficient"?TriangleAlert:tone==="negative"?TrendingDown:state==="significant"?CheckCircle2:MinusCircle;
 return <Icon size={size} strokeWidth={1.7} aria-hidden="true"/>;
}
export function EvidenceStatus({state,effect}:{state:EvidenceState;effect:number|null}){
 return <span className={"significance-state "+state+" evidence-tone-"+evidenceTone(state,effect)}><EvidenceStateIcon state={state} effect={effect}/><span>{stateText[state]}</span></span>;
}
