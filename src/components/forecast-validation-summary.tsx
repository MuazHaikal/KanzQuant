import type {ForecastResult} from '@/lib/forecast-types';

const metric=(v:number|null|undefined)=>v==null||!Number.isFinite(v)?'Unavailable':v.toFixed(3);
export const formatValidationDelta=(value:number|null|undefined)=>value==null||!Number.isFinite(value)?'Unavailable':`${value>0?'+':''}${value===0?'0.0':Math.abs(value)<.1?value.toPrecision(2):value.toFixed(1)}%`;
export function ValidationSummary({result,series,horizon}:{result:ForecastResult;series:string;horizon:number}){
 return <dl className="validation-summary" aria-label="Saved validation sample">
  <div><dt>Series / target</dt><dd>{series}</dd><small>{result.policy.target}</small></div>
  <div><dt>Out-of-sample period</dt><dd>{result.validation?.evaluation_start} — {result.validation?.evaluation_end}</dd><small>Expanding origin · saved results</small></div>
  <div><dt>Forecast origins</dt><dd>{result.validation?.origins??'Unavailable'}</dd><small>{horizon} months apart</small></div>
  <div><dt>Horizon / metric</dt><dd>{horizon}M · RMSE</dd><small>Lower error is better</small></div>
 </dl>;
}
export function BenchmarkVerdict({result}:{result:ForecastResult}){
 const best=result.models.find(m=>m.name===result.lowest_tested),baseline=best?.comparison_baseline??result.models.find(m=>m.name==='Naive')?.metrics;
 const delta=best?.metrics.rmse_delta;
 return <section className="benchmark-verdict" aria-label="Naive benchmark comparison">
  <header><small>Forecastability verdict</small><strong>{result.conclusion??'INSUFFICIENT VALIDATION HISTORY'}</strong></header>
  <dl><div><dt>Naive RMSE</dt><dd>{metric(baseline?.rmse)}</dd></div><div><dt>{best?.name??'Model'} RMSE</dt><dd>{metric(best?.metrics.rmse)}</dd></div><div><dt>Δ RMSE vs naive</dt><dd className={delta!=null&&delta<0?'delta-up':''}>{formatValidationDelta(delta)}</dd></div></dl>
  <p>Matched valid origins · negative Δ means lower error. Descriptive comparison, not statistical significance.</p>
 </section>;
}
