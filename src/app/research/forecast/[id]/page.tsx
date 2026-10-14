import { notFound } from "next/navigation";
import { chartCatalogue } from "@/lib/chart-explorer-data";
import { forecastSeries } from "@/lib/forecast-types";
import { getForecastRun } from "@/lib/forecast-server";
import { ForecastWorkspace } from "@/components/forecast-workspace";
export default async function SavedForecast({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const [{id},query]=await Promise.all([params,searchParams]);const [run,catalog]=await Promise.all([getForecastRun(id),chartCatalogue()]);if(!run)notFound();
 return <ForecastWorkspace catalog={catalog.filter(c=>forecastSeries.includes(c.id))} initial={run.parameters} saved={run} asOf={String(run.metadata.research_date)} dateContext={query.date} advanced={query.details==="1"}/>;
}
