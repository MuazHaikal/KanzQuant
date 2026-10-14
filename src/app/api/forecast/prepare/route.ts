import { prepareForecast } from "@/lib/forecast-server";
import { validateForecast } from "@/lib/forecast-types";
export const runtime="nodejs";
export const maxDuration=60;
const requests=new Map<string,number>();
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Cross-origin runs are not allowed"},{status:403});
 const key=new URL(request.url).origin,minute=Math.floor(Date.now()/60000);for(const k of requests.keys())if(!k.endsWith(":"+minute))requests.delete(k);
 const bucket=key+":"+minute,count=requests.get(bucket)??0;if(count>=10)return Response.json({error:"Research capacity reached. Retry shortly."},{status:429});requests.set(bucket,count+1);
 if(Number(request.headers.get("content-length"))>2048)return Response.json({error:"Invalid forecast settings"},{status:413});
 let input;try{const reader=request.body?.getReader();let text="";if(reader){const decoder=new TextDecoder();while(true){const r=await reader.read();if(r.done)break;text+=decoder.decode(r.value);if(text.length>2048){await reader.cancel();return Response.json({error:"Invalid forecast settings"},{status:413});}}}input=JSON.parse(text);if(!input||typeof input!=="object")throw Error();if(!("run_id" in input))validateForecast(input.specification);}catch{return Response.json({error:"Invalid forecast settings"},{status:400});}
 try{return Response.json(await prepareForecast("run_id" in input?{run_id:input.run_id}:input.specification,input.as_of),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"DATA UNAVAILABLE · The experiment could not be prepared. Retry shortly."},{status:503});}
}
