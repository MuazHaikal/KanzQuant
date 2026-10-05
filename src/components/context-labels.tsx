import type { ReactNode } from "react";
import type { ReturnTypeOfMovement } from "@/lib/context-types";

export function Tip({text, children}: {text:string; children:ReactNode}) {
  return <span className="tip" tabIndex={0} aria-label={text}>{children}<span className="tip-bubble" role="tooltip">{text}</span></span>;
}
export function MoveLabel({move,compact=false}:{move:ReturnTypeOfMovement;compact?:boolean}) {
  const text = move.percentile === null ? `N/A: at least 36 prior ${move.horizon}-month changes are required; ${move.n} available.` : `Absolute ${move.horizon}M move: P${Math.round(move.percentile)} versus ${move.n} prior changes; directional rank P${Math.round(move.directionalPercentile!)}. Descriptive, not a significance test.`;
  return <Tip text={text}><span className={`move-label move-${move.classification.toLowerCase().replace("/","")}`}>{compact?move.classification:`${move.percentile === null ? "N/A" : "P"+Math.floor(move.percentile)} · ${move.classification}`}</span></Tip>;
}
