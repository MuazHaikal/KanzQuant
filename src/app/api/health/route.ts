import { getDatabaseStatus } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getDatabaseStatus());
  } catch {
    return Response.json({status:"degraded",mode:process.env.KANZQUANT_DATA_MODE ?? "demo",database:"unavailable"},{status:503});
  }
}
