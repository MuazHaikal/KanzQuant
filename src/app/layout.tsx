import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import type { ShellTicker } from "@/components/app-shell";
import { getResearchSnapshot } from "@/lib/research-data";
import { getSeriesCatalogue } from "@/lib/database";
import { factors } from "@/lib/focus-math";
import equityUniverse from "../../data/equity_universe.json";
import "./globals.css";
import "./forecast.css";
import "./workstation.css";
import "./composition.css";
import "./canonical.css";
import "./visual-polish.css";
import "./equities.css";
import "./canonical-migration.css";
import "./phase-one.css";
import "./phase-two.css";
import "./phase-three.css";
import "./phase-four.css";
import "./phase-five.css";

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
  description: "Systematic equity and market research, statistical evidence and historical context.",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>{/* Synchronous first-paint appearance; no third-party script or credentials. */}<script id="kanzquant-appearance" dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem('kanzquant.theme.v1');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}`}}/></head>
      <body className="min-h-full"><AppShell dataMode={dataMode} asOf={snapshot.as_of} updatedAt={snapshot.updated_at.slice(0, 16).replace("T", " ") + "Z"} ticker={ticker} seriesCount={catalogue.length} searchItems={[
        ...equityUniverse.instruments.map(s=>({label:s.symbol+" · "+s.name,href:"/equities/"+s.symbol,kind:"Equity",keywords:s.symbol+" "+s.name})),
        ...[["SPX","S&P 500","Index"],["GLD","Gold","ETF"],["IEF","U.S. Treasuries","ETF"]].map(([id,name,kind])=>({label:id+" · "+name,href:"/chart?series="+id,kind})),
        ...factors.map(f=>({label:f[0].toUpperCase()+f.slice(1),href:"/focus/factor/"+f,kind:"Factor"})),
        ...catalogue.map(s=>({label:s.name+" · "+s.externalId,href:"/chart?series="+encodeURIComponent(s.externalId),kind:"Macro",keywords:s.category+" "+snapshot.features.filter(f=>f.source===s.externalId).map(f=>f.group+" "+f.description).join(" ")})),
        ...(snapshot.state_vectors??[]).filter(v=>v.date<snapshot.as_of).map(v=>({label:v.date,href:"/focus/analogue/"+v.date,kind:"Historical date"})),
        ...[["Overview","/"],["Equities","/equities"],["Equity Screener","/equities/screener"],["Evidence Library","/evidence"],["Chart Explorer","/chart"],["Indicators","/macro"],["Historical Analogues","/similarity"],["Market Environment","/regimes"],["Forecastability","/research/forecast"],["Data Catalogue","/data"],["Market History","/focus/market"]].map(([label,href])=>({label,href,kind:"Module"}))
      ]}>{children}</AppShell></body>
    </html>
  );
}
