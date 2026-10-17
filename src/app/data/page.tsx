import {getDataCatalogue} from "@/lib/catalogue-data";
import {DataCatalogue} from "@/components/data-catalogue";
export default async function DataPage({searchParams}:{searchParams:Promise<{q?:string;category?:string}>}){const [query,rows]=await Promise.all([searchParams,getDataCatalogue()]);return <DataCatalogue rows={rows} asOf={new Date().toISOString().slice(0,10)} initialQuery={query.q??""} initialCategory={query.category??""}/>;}
