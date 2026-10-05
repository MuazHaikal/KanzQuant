import "server-only";
import { cache } from "react";
import { neon } from "@neondatabase/serverless";
import { assets, type Asset, type Bar, type MarketWindow, validBar } from "./market-math";
export const getMarketWindow = cache(async (asset: Asset = "SPX", from?: string, to?: string): Promise<MarketWindow> => {
  if (process.env.KANZQUANT_DATA_MODE !== "database" || !process.env.DATABASE_URL) throw new Error("Real database market data required.");
  if (!assets.includes(asset)) throw new Error("Unknown market asset.");
  const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
  const [bounds] = await sql`SELECT min(m.observed_at)::text AS first, max(m.observed_at)::text AS latest
    FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol=${asset}`;
  if (!bounds?.latest) throw new Error("No persisted market history.");
  const latest = String(bounds.latest), first = String(bounds.first);
  // Start at a calendar year boundary: all offered aggregates need complete leading periods.
  const start = from ? from.slice(0, 4) + "-01-01" : (Number(latest.slice(0, 4)) - 3) + "-01-01";
  const end = to ?? latest;
  const rows = await sql`SELECT m.observed_at::text AS date,m.open,m.high,m.low,m.close,m.volume
    FROM market_observations m JOIN assets a ON a.id=m.asset_id
    WHERE a.symbol=${asset} AND m.observed_at>=${start}::date AND m.observed_at<=${end}::date ORDER BY m.observed_at`;
  const bars: Bar[] = rows.map(r => ({ date: String(r.date), open: r.open === null ? NaN : Number(r.open), high: r.high === null ? NaN : Number(r.high), low: r.low === null ? NaN : Number(r.low), close: r.close === null ? NaN : Number(r.close), volume: r.volume === null ? null : Number(r.volume) })).filter(validBar);
  return { asset, bars, first, latest, from: start, to: end };
});
