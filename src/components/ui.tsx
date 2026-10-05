import type { Point } from "@/lib/data";

export function PageHead({ section, title, meta="03 JAN 2025 · 14:22 UTC" }: {section:string;title:string;meta?:string}) {
  return <div className="page-head"><div><div className="eyebrow">{section}</div><h1 className="page-title">{title}</h1></div><div className="head-meta"><span>{meta}</span><span className="pill live">LATEST RUN COMPLETE</span></div></div>;
}

export function Panel({ title, meta, children, className="", noPad=false }: {title:string;meta?:string;children:React.ReactNode;className?:string;noPad?:boolean}) {
  return <section className={`panel ${className}`}><div className="panel-head"><h2 className="panel-title">{title}</h2>{meta ? <span className="panel-meta">{meta}</span> : null}</div><div className={`panel-body ${noPad ? "no-pad" : ""}`}>{children}</div></section>;
}

export function LineChart({ data, secondary, height=170, label="Time series chart" }: {data:Point[];secondary?:Point[];height?:number;label?:string}) {
  const width=600, h=height, pad={l:35,r:12,t:10,b:20};
  const all=[...data,...(secondary??[])].map(p=>p.value); const min=Math.min(...all), max=Math.max(...all); const range=max-min || 1;
  const pathFor=(points:Point[])=>points.map((p,i)=>`${i?"L":"M"}${(pad.l+i/(points.length-1)*(width-pad.l-pad.r)).toFixed(1)},${(pad.t+(max-p.value)/range*(h-pad.t-pad.b)).toFixed(1)}`).join(" ");
  const mainPath=pathFor(data); const area=`${mainPath} L${width-pad.r},${h-pad.b} L${pad.l},${h-pad.b} Z`;
  return <div className="chart-wrap" style={{height}}><svg className="chart-svg" role="img" aria-label={label} viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none">
    {[0,.25,.5,.75,1].map((n)=><g key={n}><line className="chart-grid" x1={pad.l} x2={width-pad.r} y1={pad.t+n*(h-pad.t-pad.b)} y2={pad.t+n*(h-pad.t-pad.b)}/><text className="chart-label" x={2} y={pad.t+n*(h-pad.t-pad.b)+3}>{(max-n*range).toFixed(max>1000?0:1)}</text></g>)}
    <path className="chart-area" d={area}/>{secondary ? <path className="chart-line secondary" d={pathFor(secondary)}/> : null}<path className="chart-line" d={mainPath}/>
    <text className="chart-label" x={pad.l} y={h-3}>{data[0]?.date}</text><text className="chart-label" textAnchor="end" x={width-pad.r} y={h-3}>{data.at(-1)?.date}</text>
  </svg></div>;
}

export function MethodologyDisclosure() {
  return <details className="methodology-disclosure">
    <summary><span>Methodology / limitations</span><span className="disclosure-action" aria-hidden="true">VIEW NOTES +</span></summary>
    <div className="disclosure-grid">
      <span>SIMILARITY · DESCRIPTIVE, NOT A FORECAST</span>
      <span>SPX · PRICE RETURNS, DIVIDENDS EXCLUDED</span>
      <span>FRED · SIMPLIFIED RELEASE LAGS, NOT VINTAGE DATA</span>
      <span>REGIMES · FULL-HISTORY DESCRIPTIVE, NOT WALK-FORWARD</span>
    </div>
  </details>;
}

export function ReturnHeat({ value, suffix="%" }: {value:number;suffix?:string}) {
  const cls=value >= 8 ? "heat-p2" : value >= 0 ? "heat-p1" : value <= -5 ? "heat-n2" : "heat-n1";
  return <span className={`heat-cell ${cls}`}>{value>0?"+":""}{value.toFixed(1)}{suffix}</span>;
}
