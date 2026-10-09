import Link from "next/link";
import { notFound } from "next/navigation";
import { HypothesisLab } from "@/components/hypothesis-lab";
import { getHypothesisRun,recentHypotheses } from "@/lib/hypothesis-server";
import { defaults } from "@/lib/hypothesis-types";
export default async function HypothesisRunPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{view?:string;mode?:string}>}){const {id}=await params;const [saved,recent,query]=await Promise.all([getHypothesisRun(id),recentHypotheses(),searchParams]);if(!saved)notFound();const tab=query.view?.replaceAll("-"," ").toUpperCase();return <><nav className="analysis-tabs" aria-label="Research mode"><Link href={`/hypothesis/${id}`} className={query.mode!=="build"?"selected":""}>EXPLORE</Link><Link href={`/hypothesis/${id}?mode=build`} className={query.mode==="build"?"selected":""}>BUILD</Link></nav><HypothesisLab key={id} initial={defaults} recent={recent} saved={saved} guided={query.mode!=="build"} initialTab={["CASES","ROBUSTNESS","DIAGNOSTICS","TECHNICAL OUTPUT"].includes(tab??"")?tab:"DISTRIBUTION"}/></>;}
