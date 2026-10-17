import type {EquityDetail} from "@/lib/equities";
import {equityMoney, equityPercent, finiteEquityValue} from "@/lib/equity-format";
import {LineChart} from "./ui";

export function EquityFundamentalTrends({stock}: {stock: EquityDetail}) {
  const latest = stock.fundamentals.at(-1), financial = stock.sector === "Financials";
  const metrics = financial ? [["revenue", "Revenue", "USD bn", 1e9]] as const : [
    ["revenue", "Revenue", "USD bn", 1e9], ["gross_margin", "Gross margin", "%", 1],
    ["operating_margin", "Operating margin", "%", 1], ["fcf", "Free cash flow", "USD bn", 1e9],
  ] as const;
  return <section className="panel stock-fundamentals" id="fundamentals"><header className="panel-head"><h2>Fundamental Trends</h2><span className="panel-meta">Quarterly · {latest?.date ?? "Unavailable"}</span></header>
    <div className={`stock-fundamental-grid${financial ? " financial-fundamentals" : ""}`}>{metrics.map(([key, title, unit, scale]) => {
      const points = stock.fundamentals.flatMap(q => finiteEquityValue(q[key]) ? [{date: q.date, value: q[key] / scale}] : []);
      const value = points.at(-1)?.value;
      return <div key={key} className="stock-fundamental-chart"><h3>{title}<small>{unit}</small></h3><strong>{scale === 1e9 ? equityMoney(value === undefined ? null : value * scale, stock.currency) : equityPercent(value, false)}</strong><small className="stock-fundamental-asof">Through {points.at(-1)?.date ?? "Unavailable"}</small>
        {points.length >= 2 ? <LineChart data={points.slice(-24)} label={`${title} SEC quarterly history`} height={financial ? 180 : 115}/> : <p className="contained-note">Insufficient history</p>}
      </div>;
    })}</div>
    <footer className="equity-source">SEC · filed through {latest?.filed_at ?? "Unavailable"}{financial ? " · Gross margin, operating margin and FCF not applicable to this bank-oriented view." : " · Reported quarters; TTM growth is shown separately in Quant Snapshot."}</footer>
  </section>;
}
