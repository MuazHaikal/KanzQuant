import { HypothesisLab } from "@/components/hypothesis-lab";
import { recentHypotheses } from "@/lib/hypothesis-server";
import { prefill } from "@/lib/hypothesis-types";
export default async function HypothesisPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const [query,recent]=await Promise.all([searchParams,recentHypotheses()]);return <HypothesisLab initial={prefill(query)} recent={recent}/>;}
