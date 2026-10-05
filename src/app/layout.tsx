import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import type { ShellTicker } from "@/components/app-shell";
import { getResearchSnapshot } from "@/lib/research-data";
import { getSeriesCatalogue } from "@/lib/database";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KanzQuant — Quantitative Research Workstation",
  description: "Institutional macro regime and historical similarity research.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const dataMode = process.env.KANZQUANT_DATA_MODE === "database" ? "database" : "demo";
  const [snapshot, catalogue] = await Promise.all([getResearchSnapshot(), getSeriesCatalogue()]);
  const ticker: ShellTicker[] = Object.entries(snapshot.market_series).map(([symbol, points]) => {
    const latest = points.at(-1)?.value ?? 0;
    const prior = points.at(-2)?.value ?? latest;
    const change = prior ? (latest / prior - 1) * 100 : 0;
    return [symbol, latest.toLocaleString("en-US", { maximumFractionDigits: 2 }), `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`, change >= 0 ? "up" : "down"];
  });
  ticker.push(["REGIME", snapshot.current_regime.toUpperCase(), `${(snapshot.confidence * 100).toFixed(0)}%`, snapshot.current_regime === "Stress" ? "warn" : "up"]);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full"><AppShell dataMode={dataMode} asOf={snapshot.as_of} updatedAt={snapshot.updated_at.slice(0, 16).replace("T", " ") + "Z"} ticker={ticker} seriesCount={catalogue.length}>{children}</AppShell></body>
    </html>
  );
}
