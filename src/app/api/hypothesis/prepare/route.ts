import { createHmac } from "node:crypto";
import { prepareHypothesis } from "@/lib/hypothesis-server";
import { signingSecret } from "@/lib/hypothesis-token";
import { validateParameters } from "@/lib/hypothesis-types";
export const runtime="nodejs";
export const maxDuration=60;
const clients=new Map<string,{until:number;count:number}>();
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Cross-origin runs are not allowed."},{status:403});
 let secret;try{secret=signingSecret();}catch{return Response.json({error:"Research engine is not configured."},{status:503});}
 // Vercel overwrites its client-IP header; local development uses one conservative bucket.
 const address=process.env.VERCEL?request.headers.get("x-vercel-forwarded-for")??"unknown":"local";
 const key=createHmac("sha256",secret).update(address).digest("hex"),now=Date.now();
 for(const [k,v] of clients)if(v.until<now)clients.delete(k);
 const bucket=clients.get(key)??{until:now+60000,count:0};
 if(bucket.count>=12||clients.size>=2048&&!clients.has(key))return Response.json({error:"Too many requests. Retry shortly."},{status:429,headers:{"Retry-After":"60"}});
 bucket.count++;clients.set(key,bucket);
 if(Number(request.headers.get("content-length"))>16000)return Response.json({error:"Request is too large."},{status:413});
 const reader=request.body?.getReader();let body="";const decoder=new TextDecoder();
 if(reader){let size=0;while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>16000){await reader.cancel();return Response.json({error:"Request is too large."},{status:413});}body+=decoder.decode(chunk.value,{stream:true});}body+=decoder.decode();}
 let input;try{const parsed=JSON.parse(body);input=parsed&&typeof parsed==="object"&&"run_id" in parsed?{run_id:parsed.run_id}:validateParameters(parsed);}catch{return Response.json({error:"Invalid hypothesis settings."},{status:400});}
 try{return Response.json(await prepareHypothesis(input),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Run could not be prepared. Check the saved ledger and retry shortly."},{status:503});}
}
