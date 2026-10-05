"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Appearance } from "./appearance";
import { GlobalSearch, type SearchItem } from "./global-search";

export type ShellTicker = [label: string, value: string, delta: string, tone: "up" | "down" | "warn"];

const groups = [
  { label:"WORKSPACE", items:[["Overview","/","01"],["Macro","/macro","02"],["Similarity","/similarity","03"],["Regimes","/regimes","04"]] },
  { label:"RESEARCH", items:[["Factors","#","05"],["Strategies","#","06"],["Portfolio","#","07"],["Risk","#","08"]] },
  { label:"SYSTEM", items:[["Data / Series","/data","09"],["Experiments","/experiments","10"]] },
];

export function AppShell({ children, dataMode, asOf, updatedAt, ticker, seriesCount, searchItems }: {
  children: React.ReactNode; dataMode: "demo" | "database"; asOf: string; updatedAt: string;
  ticker: ShellTicker[]; seriesCount: number;
  searchItems: SearchItem[];
}) {
  const path = usePathname();
  return <div className="shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brand-mark">KQ</span><span>KANZQUANT</span></Link>
      <div className="top-context"><span><strong>US Macro</strong></span><span>As of <strong>{asOf}</strong></span></div>
      <GlobalSearch items={searchItems}/>
      <div className="system-status mono"><span className="status-dot"/>{dataMode === "database" ? <>FRED · YAHOO FINANCE · NEON&nbsp; <span className="updated">UPDATED {updatedAt}</span></> : "DEMO FEED · EXPLICIT MODE"}</div>
      <Appearance/>
    </header>
    <div className="ticker" aria-label="Current market metrics">
      {ticker.map(([label,value,delta,tone]) => <div className="ticker-item" key={label}><span className="ticker-label">{label}</span><span className="ticker-value">{value} <small className={`delta-${tone}`}>{delta}</small></span></div>)}
    </div>
    <aside className="sidebar">
      {groups.map((group) => <div key={group.label}><div className="nav-section">{group.label}</div>{group.items.map(([label,href,code]) => {
        const active = href === "/" ? path === "/" || path.startsWith("/focus") : path.startsWith(href);
        const disabled = href === "#";
        return <Link aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={disabled ? (e)=>e.preventDefault() : undefined} className={`nav-link ${active ? "active" : ""} ${disabled ? "disabled" : ""}`} href={href} key={label}><span className="nav-icon">{code}</span>{label}</Link>;
      })}</div>)}
      <div className="sidebar-foot">KQ CORE v0.1.2<br/>ENGINE · ONLINE<br/>DATA · {seriesCount} SERIES</div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
