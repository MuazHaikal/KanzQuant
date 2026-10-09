import Link from "next/link";
import { observedConditions,guidedLink,humanName } from "@/lib/guided-research";
import { DrillRow } from "@/components/drill-row";
import { MethodologyDisclosure, PageHead, Panel, ReturnHeat } from "@/components/ui";
import { MarketChart } from "@/components/market-chart";
import { HistoricalPositionBar, MoveIntensityBar, OutcomeHorizonTiles, SimilarityStrip } from "@/components/visual-research";
import { getMarketWindow } from "@/lib/market-data";
import { getResearchSnapshot, regimeColor } from "@/lib/research-data";
import { factors, horizons } from "@/lib/focus-math";
import { factorContext } from "@/lib/factor-context";

export default async function Overview() {
  const [data,market]=await Promise.all([getResearchSnapshot(),getMarketWindow()]),summary=data.forward_summary.SPX;
  const contexts=factors.map(f=>factorContext(data,f));
  const suggestions=observedConditions(data).slice(0,3);
  const attention=[...contexts].sort((a,b)=>b.priority-a.priority).slice(0,3);
  return <><PageHead section="Research workspace / Overview" title="Market Environment" meta={`Research as of ${data.as_of}`}/>
    <div className="visual-overview">
      <Panel title="Market environment" meta={`${data.current_regime} · ${(data.confidence*100).toFixed(0)}% regime strength`} className="environment-panel" noPad>
        <div className="factor-tiles">{contexts.map(c=><Link className="factor-tile" key={c.factor} href={"/focus/factor/"+c.factor}><div className="tile-kicker">{c.factor}<span>EXPLORE →</span></div><HistoricalPositionBar percentile={c.percentile} value={c.current}/><MoveIntensityBar percentile={c.moves[1].percentile} change={c.moves[1].change} compact/></Link>)}</div>
      </Panel>
      <Panel id="standouts" title="What stands out" meta="CHOOSE A CONDITION · EXPLORE →" className="standout-panel" noPad><div className="standout-tiles">{attention.map(c=>{
        const move=[...c.moves].sort((a,b)=>(b.percentile??-1)-(a.percentile??-1))[0];
        const showMove=(move.percentile??0)>=90;
        return <Link key={c.factor} href={"/focus/factor/"+c.factor}><div className="tile-kicker">{c.factor}<span>EXPLORE →</span></div><small>{showMove?`Recent ${move.horizon}M move`:"Historical level"}</small>{showMove?<MoveIntensityBar percentile={move.percentile} change={move.change} horizon={move.horizon} compact/>:<HistoricalPositionBar percentile={c.percentile} value={c.current} compact/>}</Link>;
      })}</div></Panel>
      <Panel title="Start a research question" className="guided-overview-panel" meta="CURATED CONNECTIONS" noPad><div className="overview-questions">{suggestions.map(c=><Link href={guidedLink(c)} key={c.factor}><span>{humanName(c.factor)}<small>{c.label}</small></span><b>→</b><span>S&amp;P 500<small>6 months afterward</small></span><strong>EXPLORE →</strong></Link>)}</div></Panel>
      <Panel title="Similar periods" meta="SIMILARITY · NOT PROBABILITY" className="periods-panel" noPad>
        <SimilarityStrip rows={data.neighbours.slice(0,6).map(r=>({date:r.date,similarity:r.similarity,state:r.regime,href:"/focus/analogue/"+r.date}))}/>
        <details className="numeric-details"><summary>Exact outcomes / historical states</summary><div className="local-table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Similarity</th><th>State</th><th>S&amp;P 500 · 3 months</th><th>12 months</th></tr></thead><tbody>{data.neighbours.map(r=><DrillRow href={"/focus/analogue/"+r.date} key={r.date}><td>{r.date} ↗</td><td>{(r.similarity*100).toFixed(1)}%</td><td>{r.regime}</td>{["3m","12m"].map(h=><td key={h}>{r.returns.SPX?.[h]==null?"N/A":<ReturnHeat value={r.returns.SPX[h]!}/>}</td>)}</DrillRow>)}</tbody></table></div></details>
      </Panel>
      <Panel title="What happened next" meta="S&P 500 · SIMILAR PERIODS" className="outcomes-panel" noPad>
        <OutcomeHorizonTiles items={horizons.map(h=>({horizon:h,median:summary.median?.[h]??null,hit:summary.hit_rate?.[h]??null,n:summary.n?.[h]??0,values:data.neighbours.flatMap(r=>r.returns.SPX?.[h]==null?[]:[r.returns.SPX[h]!]),href:"/focus/returns/"+h}))}/>
        <div className="footer-note">Historical observations · Not a forecast</div>
      </Panel>
      <Panel title="S&P 500" meta="PRICE HISTORY" className="history-panel" noPad><MarketChart initial={market} assetControl={false} regimes={data.regime_history.map(r=>({date:r.date,label:r.label,color:regimeColor(r.label)}))} height={120}/><div className="overview-chart-link"><Link href="/chart?series=SPX">↗ EXPAND CHART</Link><Link href="/focus/regime">Market states ↗</Link></div></Panel>
      <MethodologyDisclosure/>
    </div></>;
}
