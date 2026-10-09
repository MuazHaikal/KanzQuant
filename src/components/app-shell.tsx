"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Appearance } from "./appearance";
import { ResearchPath,ResearchHelp } from "./research-journey";
import { humanName } from "@/lib/guided-research";
import { GlobalSearch, type SearchItem } from "./global-search";

export type ShellTicker = [label: string, value: string, delta: string, tone: "up" | "down" | "warn"];

const groups = [
  { label:"WORKSPACE", items:[["Overview","/","01"]] },
  { label:"RESEARCH", items:[["Market Environment","/regimes","02"],["Similar Periods","/similarity","03"],["Test an Idea","/hypothesis","04"]] },
  { label:"EXPLORE", items:[["Chart Explorer","/chart","05"]] },
  { label:"DATA", items:[["Indicators","/macro","06"],["Data Details","/data","07"]] },
  { label:"HELP", items:[["Visual Guide","/guide","?"]]},
];

export function AppShell({ children, dataMode, asOf, updatedAt, ticker, seriesCount, searchItems }: {
  children: React.ReactNode; dataMode: "demo" | "database"; asOf: string; updatedAt: string;
  ticker: ShellTicker[]; seriesCount: number;
  searchItems: SearchItem[];
}) {
  const path = usePathname();
  return <div className="shell">
    <header className="topbar">
      <Link className="brand" href="/">KANZQUANT</Link>
      <div className="top-context"><span><strong>US Macro</strong></span><span>As of <strong>{asOf}</strong></span></div>
      <GlobalSearch items={searchItems}/>
      <div className="system-status mono"><span className="status-dot"/>{dataMode === "database" ? <><Link href="/data">Data details</Link>&nbsp; <span className="updated">Updated {updatedAt}</span></> : "DEMO FEED · EXPLICIT MODE"}</div>
      <ResearchHelp/>
      <Appearance/>
    </header>
    <div className="ticker" aria-label="Current market metrics">
      {ticker.map(([label,value,delta,tone]) => <div className="ticker-item" key={label}><span className="ticker-label">{label==="REGIME"?"Market state":humanName(label)}</span><span className="ticker-value">{value} <small className={`delta-${tone}`}>{delta}</small></span></div>)}
    </div>
    <aside className="sidebar">
      {groups.map((group) => <div key={group.label}><div className="nav-section">{group.label}</div>{group.items.map(([label,href,code]) => {
        const active = href === "/" ? path === "/" || (path.startsWith("/focus") && !path.startsWith("/focus/market")) : path.startsWith(href);
        const disabled = href === "#";
        return <Link aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={disabled ? (e)=>e.preventDefault() : undefined} className={`nav-link ${active ? "active" : ""} ${disabled ? "disabled" : ""}`} href={href} key={label}><span className="nav-icon">{code}</span>{label}</Link>;
      })}</div>)}
      <div className="sidebar-foot">KANZQUANT v0.3.1<br/>{seriesCount} ECONOMIC INDICATORS<br/><Link href="/experiments">Research records →</Link></div>
    </aside>
    <main className="main"><ResearchPath/>{children}</main>
  </div>;
}
