import type { Metrics } from "@/lib/forecast-types";
const delta=(n:number)=>Math.abs(n)>0&&Math.abs(n)<.1?n.toPrecision(2):n.toFixed(1);
const value=(n:number|null|undefined)=>n==null?"—":n.toFixed(3);
export function ModelComparison({models}:{models:{name:string;metrics:Metrics;status:string}[]}){
 const max=Math.max(...models.map(m=>m.metrics.rmse??0),.001);
 return <div className="model-comparison" aria-label="Out-of-sample model error, lower is better">{models.map(m=><div className="model-error-row" key={m.name}><strong>{m.name}</strong><div className="model-error-track" role="img" aria-label={`${m.name} RMSE ${value(m.metrics.rmse)}, MAE ${value(m.metrics.mae)}, N=${m.metrics.n}`}><i style={{width:(m.metrics.rmse??0)/max*100+"%"}}/></div><b>{value(m.metrics.rmse)}</b><small>MAE {value(m.metrics.mae)} · N={m.metrics.n}{m.status!=="complete"?" · "+m.status:""}</small>{m.name!=="Naive"&&<span className={(m.metrics.rmse_delta??0)<0?"delta-up":"delta-down"}>{m.metrics.rmse_delta==null?"Unavailable":`${m.metrics.rmse_delta>=0?"+":""}${delta(m.metrics.rmse_delta)}% RMSE`}<small>{m.metrics.mae_delta==null?"":`${m.metrics.mae_delta>=0?"+":""}${delta(m.metrics.mae_delta)}% MAE`}</small><small>vs same-date baseline</small></span>}</div>)}</div>;
}
