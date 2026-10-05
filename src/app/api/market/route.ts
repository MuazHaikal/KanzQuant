import { getMarketWindow } from "@/lib/market-data";
import { assets, type Asset } from "@/lib/market-math";
const validDate = (s: string | null) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, asset = params.get("asset") ?? "SPX", from = params.get("from"), to = params.get("to");
  if (!assets.includes(asset as Asset) || !validDate(from) || !validDate(to) || from && to && from > to) return Response.json({ error: "Invalid market window." }, { status: 400 });
  try { return Response.json(await getMarketWindow(asset as Asset, from ?? undefined, to ?? undefined), { headers: { "Cache-Control": "private, max-age=120" } }); }
  catch { return Response.json({ error: "Persisted market data unavailable. Retry shortly." }, { status: 503 }); }
}
