import { explorerData } from "@/lib/chart-explorer-data";
import { validChartDate } from "@/lib/chart-explorer";
import { sources } from "@/lib/hypothesis-types";
export async function GET(request:Request){const q=new URL(request.url).searchParams,id=q.get("series")??"SPX",from=q.get("from")??"2020-01-01",to=q.get("to")??new Date().toISOString().slice(0,10);if(![...sources,"SPX","GLD","IEF","DTWEXBGS"].includes(id)||![from,to].every(validChartDate)||from>to)return Response.json({error:"Invalid chart selection"},{status:400});try{return Response.json(await explorerData(id,from,to),{headers:{"Cache-Control":"private, max-age=60"}});}catch{return Response.json({error:"Chart history unavailable. Retry."},{status:503});}}
