import { notFound } from "next/navigation";
import { HypothesisLab } from "@/components/hypothesis-lab";
import { getHypothesisRun,recentHypotheses } from "@/lib/hypothesis-server";
import { defaults } from "@/lib/hypothesis-types";
export default async function HypothesisRunPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{view?:string}>}){const {id}=await params;const [saved,recent,query]=await Promise.all([getHypothesisRun(id),recentHypotheses(),searchParams]);if(!saved)notFound();const tab=query.view?.replaceAll("-"," ").toUpperCase();return <HypothesisLab key={id} initial={defaults} recent={recent} saved={saved} initialTab={["CASES","ROBUSTNESS","DIAGNOSTICS","TECHNICAL OUTPUT"].includes(tab??"")?tab:"DISTRIBUTION"}/>;}
