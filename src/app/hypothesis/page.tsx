import { GuidedExplore } from "@/components/guided-explore";
import { observedConditions,guidedParameters } from "@/lib/guided-research";
import { getResearchSnapshot } from "@/lib/research-data";
import { recentHypotheses } from "@/lib/hypothesis-server";
import { prefill } from "@/lib/hypothesis-types";
export default async function HypothesisPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const [query,recent,snapshot]=await Promise.all([searchParams,recentHypotheses(),getResearchSnapshot()]);const conditions=observedConditions(snapshot);const initial=query.source?prefill(query):guidedParameters(conditions[0]);if(["SPX","GLD","IEF"].includes(query.asset??""))initial.asset=query.asset as typeof initial.asset;return <GuidedExplore initial={initial} recent={recent} conditions={conditions} build={query.mode==="build"||!conditions.some(c=>c.factor===initial.conditions[0].source)} selected={!!query.source}/>;}
