import { chartCatalogue } from "@/lib/chart-explorer-data";
import { freezeForecast,recentForecasts } from "@/lib/forecast-server";
import { validateForecast,forecastSeries } from "@/lib/forecast-types";
import { ForecastWorkspace } from "@/components/forecast-workspace";
export default async function ForecastPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const [query,catalog,recent]=await Promise.all([searchParams,chartCatalogue(),recentForecasts()]);const available=catalog.filter(c=>forecastSeries.includes(c.id));const series=available.some(c=>c.id===query.series)?query.series!:"DGS10";
 let initial;try{initial=validateForecast({series,horizon:Number(query.horizon??6)});}catch{initial=validateForecast({series,horizon:6});}
 const data=await freezeForecast(initial,query.date);
 return <ForecastWorkspace catalog={available} initial={initial} preview={data.points.slice(-120)} asOf={data.as_of} dateContext={query.date} recent={recent}/>;
}
