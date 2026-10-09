import { chartCatalogue,explorerData } from "@/lib/chart-explorer-data";
import { parseExplorer,visibleStart } from "@/lib/chart-explorer";
import { getResearchSnapshot } from "@/lib/research-data";
import { monthsBack } from "@/lib/market-math";
import { ChartExplorer } from "@/components/chart-explorer";
export default async function ChartPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const [q,catalog,snapshot]=await Promise.all([searchParams,chartCatalogue(),getResearchSnapshot()]);const state=parseExplorer(q,catalog),latest=catalog.find(s=>s.id===state.series[0])!.availableTo,first=catalog.find(s=>s.id===state.series[0])!.availableFrom,from=monthsBack(visibleStart(latest,state.range,first),24);const initial=await Promise.all(state.series.map(id=>explorerData(id,from,latest)));return <ChartExplorer catalog={catalog} initial={initial} initialState={state} states={snapshot.regime_history} neighbours={snapshot.neighbours.map(r=>r.date)}/>;}
