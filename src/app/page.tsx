import { LineChart, MethodologyDisclosure, PageHead, Panel, ReturnHeat } from "@/components/ui";
import { getResearchSnapshot, regimeCode, regimeColor } from "@/lib/research-data";

function ReturnValue({ value }: { value: number | null }) {
  return value === null ? <span className="rank">—</span> : <ReturnHeat value={value}/>;
}

export default async function Overview() {
  const data = await getResearchSnapshot();
  const summary = data.forward_summary.SPX;
  const summaryRows = [["MEAN", summary.mean], ["MEDIAN", summary.median], ["HIT RATE", summary.hit_rate], ["BEST", summary.best], ["WORST", summary.worst], ["STDEV", summary.std]] as const;
  const history = data.regime_history.slice(-108);
  return <><PageHead section="Macro Research / Overview" title="US Macro Regime Monitor" meta={`REAL DATA · ${data.as_of}`}/><div className="grid overview-grid">
    <Panel title="Current macro state" meta={`EXPANDING Z · ${data.features.length} FEATURES`} className="state-panel" noPad>
      <div className="state-hero"><div className="regime-code">{regimeCode(data.current_regime)}</div><div><div className="regime-name">{data.current_regime}</div><div className="regime-sub">PCA + KMEANS · SEMANTIC CENTROID LABEL</div></div><div className="confidence"><div className="confidence-value">{(data.confidence*100).toFixed(0)}%</div><div className="regime-sub">regime strength · distance-based</div></div></div>
      {data.state_rows.map((row)=><div className="matrix-row" key={row.label}><span className="matrix-label">{row.label}</span><span>{row.z>=0?"+":""}{row.z.toFixed(2)}σ</span><span className={row.change>=0?"delta-up":"delta-down"}>{row.change>=0?"+":""}{row.change.toFixed(2)}</span><div className={`bar ${row.z<0?"neg":""}`}><span style={{width:`${Math.min(100,Math.abs(row.z)*32+10)}%`}}/></div><span>P{row.percentile}</span></div>)}
    </Panel>
    <Panel title="Historical analogues" meta="COSINE · GAP 9M" className="analog-panel" noPad><table className="data-table"><thead><tr><th># / Date</th><th>Similarity</th><th>Regime</th><th>1M</th><th>3M</th><th>6M</th><th>12M</th></tr></thead><tbody>{data.neighbours.slice(0,6).map(row=><tr key={row.date}><td><span className="rank">{String(row.rank).padStart(2,"0")}</span> &nbsp;{row.date}</td><td className="score">{(row.similarity*100).toFixed(1)}</td><td><span className="regime-tag" style={{borderColor:regimeColor(row.regime)}}>{row.regime}</span></td>{["1m","3m","6m","12m"].map(horizon=><td key={horizon}><ReturnValue value={row.returns.SPX?.[horizon] ?? null}/></td>)}</tr>)}</tbody></table></Panel>
    <Panel title="S&P 500 / Regime history" meta="REAL PRICE INDEX · MONTHLY" className="chart-panel" noPad><LineChart data={data.market_series.SPX.slice(-108)} label="S&P 500 monthly price history" /><div className="timeline" aria-label="Regime timeline">{history.map(row=><span key={row.date} title={`${row.date} · ${row.label}`} style={{background:regimeColor(row.label),opacity:.75}}/>)}</div></Panel>
    <Panel title="Conditional forward returns" meta={`SPX · N=${summary.n?.["12m"] ?? 0}`} className="returns-panel" noPad><div className="return-summary">{["STATISTIC","1M","3M","6M","12M"].map(x=><div className="hdr" key={x}>{x}</div>)}{summaryRows.flatMap(([label,row])=>[<div key={`${label}l`}>{label}</div>,...["1m","3m","6m","12m"].map(horizon=><div key={`${label}${horizon}`}><ReturnValue value={row?.[horizon] ?? null}/></div>)])}</div><div className="footer-note">REAL HISTORICAL PRICE OUTCOMES · NOT A FORECAST</div></Panel>
    <Panel title="Macro factor pulse" meta="LATEST COMPLETED MONTH" className="macro-panel" noPad><div className="macro-strip">{data.state_rows.map(row=><div className="macro-metric" key={row.label}><div className="metric-kicker">{row.label}</div><div className="metric-value">{row.z>=0?"+":""}{row.z.toFixed(2)}σ</div><div className="metric-foot"><span className={row.change>=0?"delta-up":"delta-down"}>{row.change>=0?"▲":"▼"} {Math.abs(row.change).toFixed(2)}</span> · P{row.percentile} · {row.trend}</div></div>)}</div></Panel>
    <MethodologyDisclosure />
  </div></>;
}
