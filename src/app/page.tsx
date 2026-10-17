import Link from "next/link";
import { observedConditions,guidedLink,humanName } from "@/lib/guided-research";
import { MethodologyDisclosure,Panel,LineChart } from "@/components/ui";
import { MarketChart } from "@/components/market-chart";
import { getMarketWindow } from "@/lib/market-data";
import { getResearchSnapshot,regimeColor } from "@/lib/research-data";
import { compositionContext } from "@/components/chart-research-context";
import { ExplorerAnalytics } from "@/components/explorer-research-rail";
import {factors} from "@/lib/focus-math";
import {factorContext} from "@/lib/factor-context";
import {HistoricalPositionBar} from "@/components/visual-research";

export default async function Overview(){
 const [data,market]=await Promise.all([getResearchSnapshot(),getMarketWindow()]);
 const context=compositionContext(data),suggestions=observedConditions(data).slice(0,3);
 return <div className="composition-overview canonical-overview"><header className="migration-page-title"><h1>Overview</h1><div className="overview-environment"><span>Current macro environment</span><strong>{data.current_regime}</strong><small>{(data.confidence*100).toFixed(0)}% regime strength · distance-based</small></div></header>

 <div className="overview-hero">
 <Panel title="Market Overview" meta={`Market ${market.latest} · macro ${data.as_of}`} className="overview-market" noPad><MarketChart initial={market} assetControl={false} regimes={data.regime_history.map(r=>({date:r.date,label:r.label,color:regimeColor(r.label)}))} height="clamp(300px,calc(100dvh - 690px),390px)"/></Panel>
 <aside className="overview-research"><Panel title="Historical Analogues" meta="Macro-state similarity · SPX outcomes" noPad><div className="workstation-table-scroll overview-analogue-scroll" tabIndex={0} aria-label="Overview historical analogues"><table className="data-table"><thead><tr><th>Period</th><th>Similarity</th><th>3M</th><th>6M</th><th>12M</th></tr></thead><tbody>{data.neighbours.slice(0,8).map(r=><tr key={r.date}><td><Link href={"/focus/analogue/"+r.date}>{r.date}<small>{r.regime}</small></Link></td><td>{(r.similarity*100).toFixed(1)}%</td>{["3m","6m","12m"].map(h=>{const v=r.returns.SPX?.[h];return <td key={h} className={v==null?"":v<0?"delta-down":"delta-up"}>{v==null?"—":(v>0?"+":"")+v.toFixed(1)+"%"}</td>;})}</tr>)}</tbody></table></div><Link className="view-periods" href="/similarity">All historical analogues ↗</Link><p className="overview-analogue-note">Cosine alignment, not probability. Historical outcomes are descriptive, not forecasts.</p></Panel></aside>
 </div>
 <section className="overview-factor-row" aria-label="Macro factor context">{factors.map(f=>{const c=factorContext(data,f);return <Link className={"panel overview-factor-card factor-"+f} href={"/focus/factor/"+f} key={f}><header><h2>{humanName(f)}</h2><small>{data.as_of}</small></header><div className="overview-factor-value"><strong>{c.current===null?"—":c.current.toFixed(2)}</strong><small title="Validated composite axis units, not a re-standardized z-score">Composite level · axis units</small></div><HistoricalPositionBar percentile={c.percentile} compact/><dl className="overview-factor-changes" aria-label={humanName(f)+" factor changes in axis units"}>{c.moves.map(m=><div key={m.horizon} title={`${m.horizon}M change · ${m.classification} · prior N=${m.n}`}><dt>Δ {m.horizon}M</dt><dd>{m.change===null?"Unavailable":`${m.change>0?"+":""}${m.change.toFixed(2)}`}</dd></div>)}</dl><LineChart data={c.history.slice(-36)} height={55} label={humanName(f)+" factor history · monthly"}/></Link>;})}</section><ExplorerAnalytics context={context} asset="SPX" points={[]}/>
 <section id="standouts" className="overview-investigate panel"><h2>What stands out</h2>{suggestions.map(c=><Link href={guidedLink(c)} key={c.factor}><strong>{humanName(c.factor)} · {c.label}</strong><span>S&P 500 · next 6 months ↗</span></Link>)}</section>
 <MethodologyDisclosure/>
 </div>;
}
