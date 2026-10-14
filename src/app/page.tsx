import Link from "next/link";
import { observedConditions,guidedLink,humanName } from "@/lib/guided-research";
import { MethodologyDisclosure,Panel } from "@/components/ui";
import { MarketChart } from "@/components/market-chart";
import { getMarketWindow } from "@/lib/market-data";
import { getResearchSnapshot,regimeColor } from "@/lib/research-data";
import { compositionContext } from "@/components/chart-research-context";
import { FactorSummary,PeriodRows,ExplorerAnalytics } from "@/components/explorer-research-rail";

export default async function Overview(){
 const [data,market]=await Promise.all([getResearchSnapshot(),getMarketWindow()]);
 const context=compositionContext(data),suggestions=observedConditions(data).slice(0,3);
 return <div className="composition-overview">
 <header className="overview-title"><h1>Market Environment</h1><span>{data.as_of} · {data.current_regime}</span></header>
 <div className="overview-hero">
 <Panel title="Market context" meta="S&P 500" className="overview-market" noPad><MarketChart initial={market} assetControl={false} regimes={data.regime_history.map(r=>({date:r.date,label:r.label,color:regimeColor(r.label)}))} height={560}/></Panel>
 <aside className="overview-research"><Panel title="Factor summary" meta={data.current_regime} noPad><FactorSummary rows={context.factors}/></Panel><Panel title="Similar periods" meta="Similarity · historical SPX outcomes" noPad><PeriodRows rows={context.neighbours.slice(0,4)} outcomes/><Link className="view-periods" href="/similarity">All historical analogues ↗</Link></Panel></aside>
 </div>
 <ExplorerAnalytics context={context} asset="SPX" points={[]}/>
 <section id="standouts" className="overview-investigate"><h2>What stands out</h2>{suggestions.map(c=><Link href={guidedLink(c)} key={c.factor}><strong>{humanName(c.factor)} · {c.label}</strong><span>S&P 500 · next 6 months ↗</span></Link>)}</section>
 <MethodologyDisclosure/>
 </div>;
}
