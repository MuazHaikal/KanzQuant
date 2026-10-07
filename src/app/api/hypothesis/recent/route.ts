import { recentHypotheses } from "@/lib/hypothesis-server";
export async function GET(){try{return Response.json(await recentHypotheses(),{headers:{"Cache-Control":"private, no-store"}});}catch{return Response.json({error:"Research ledger unavailable."},{status:503});}}
