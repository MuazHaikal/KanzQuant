import type {Equity} from "@/lib/equities";
import {numeric} from "@/lib/equity-screen";
import {equityPercent} from "@/lib/equity-format";

export function sectorValues(rows: Equity[], metric: string) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const value = numeric(row, metric);
    if (!row.sector || value === null) continue;
    const group = groups.get(row.sector) ?? [];
    group.push(value);
    groups.set(row.sector, group);
  }
  return [...groups].map(([name, values]) => ({name, value: values.reduce((a,b) => a+b, 0)/values.length, n: values.length})).sort((a,b) => b.value-a.value);
}
export function SectorBars({rows, metric}: {rows: Equity[]; metric: string}) {
  const sectors = sectorValues(rows, metric), extent = Math.max(...sectors.map(s => Math.abs(s.value)), .01);
  if (!sectors.length) return <p className="contained-note">Insufficient sector observations.</p>;
  return <div className="sector-value-bars">{sectors.map(s => <div key={s.name}><span title={`${s.name} · n=${s.n}`}>{s.name}</span><i><b className={s.value < 0 ? "negative" : "positive"} style={{width: Math.abs(s.value)/extent*100+"%"}}/></i><strong className={s.value < 0 ? "delta-down" : "delta-up"}>{equityPercent(s.value)}</strong></div>)}</div>;
}
