import {equityDetail} from "@/lib/equities";
export async function GET(_request:Request,{params}:{params:Promise<{symbol:string}>}){
 try{const row=await equityDetail((await params).symbol.toUpperCase());return row?Response.json(row):Response.json({error:"Equity unavailable"},{status:404});}
 catch{return Response.json({error:"Cached equity data unavailable"},{status:503});}
}
