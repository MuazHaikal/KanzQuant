import { getForecastRun } from "@/lib/forecast-server";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const run=await getForecastRun((await params).id);return Response.json(run??{error:"Experiment unavailable"},{status:run?200:404,headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Saved experiment temporarily unavailable"},{status:503});}}
