"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Appearance } from "./appearance";
import { ResearchHelp } from "./research-journey";
import { ResearchNavigation } from "./research-navigation";
import { humanName } from "@/lib/guided-research";
import { GlobalSearch, type SearchItem } from "./global-search";

export type ShellTicker = [label: string, value: string, delta: string, tone: "up" | "down" | "warn"];

export function AppShell({ children, dataMode, asOf, updatedAt, ticker, seriesCount, searchItems }: {
  children: React.ReactNode; dataMode: "demo" | "database"; asOf: string; updatedAt: string;
  ticker: ShellTicker[]; seriesCount: number;
  searchItems: SearchItem[];
}) {
  const path=usePathname(),composition=path==="/"||path==="/chart"||path.startsWith("/research/forecast");
  return <div className={`shell canonical-shell canonical-migration-shell ${composition?"composition-shell":""}`}>
    <a className="workspace-skip-link" href="#workspace-main">Skip to research</a><header className="topbar" id="workspace-top">
      <Link className="brand" href="/">KanzQuant</Link>
      <div className="top-context"><span><strong>US Macro</strong></span><span>As of <strong>{asOf}</strong></span></div>
      <GlobalSearch items={searchItems}/>
      <div className="system-status mono"><span className="status-dot"/>{dataMode === "database" ? <><Link href="/data">Data details</Link>&nbsp; <span className="updated">Macro research built {updatedAt}</span></> : "DEMO FEED · EXPLICIT MODE"}</div>
      <ResearchHelp/>
      <Appearance/>
    </header>
    <div className="ticker" aria-label="Current market metrics" hidden>
      {ticker.map(([label,value,delta,tone]) => <div className="ticker-item" key={label}><span className="ticker-label">{label==="REGIME"?"Market state":humanName(label)}</span><span className="ticker-value">{value} <small className={`delta-${tone}`}>{delta}</small></span></div>)}
    </div>
    <ResearchNavigation count={seriesCount}/>
    <main className="main" id="workspace-main">{children}</main>
  </div>;
}
