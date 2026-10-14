"""Forecastability research: bounded, genuine h-step expanding-origin validation."""
import platform
from time import perf_counter
import numpy as np
import pandas as pd
import statsmodels
from .policy import VERSION, prepare, validate
from .models import choose_order, fit_forecast
from .diagnostics import describe, residual_diagnostics

def origins(n, minimum_train, steps, maximum=24):
    return list(reversed(list(range(n-steps-1,minimum_train-2,-steps))[:maximum]))

def metrics(rows):
    error=np.array([r["forecast"]-r["actual"] for r in rows])
    covered=[r["lower"]<=r["actual"]<=r["upper"] for r in rows if r["lower"] is not None]
    return {"n":len(rows),"mae":float(np.mean(abs(error))) if len(rows) else None,"rmse":float(np.sqrt(np.mean(error**2))) if len(rows) else None,"coverage":float(np.mean(covered)*100) if covered else None}

def verdict(mae_delta,rmse_delta,n):
    if n<6 or mae_delta is None or rmse_delta is None:return "INSUFFICIENT EVIDENCE"
    if mae_delta<0 and rmse_delta<0:return "OUTPERFORMED BASELINE"
    if mae_delta>=0 and rmse_delta>=0:return "DID NOT OUTPERFORM BASELINE"
    return "MIXED RESULTS"

def run(data, specification):
    started=perf_counter();spec=validate(specification);meta,series=prepare(data,spec)
    dates=[d.date().isoformat() for d in series.index];y=series.to_numpy();steps=spec["horizon"]//meta["period_months"]
    result={"engine":VERSION,"specification":spec,"policy":meta,"as_of":data["as_of"],"data_hash":data.get("hash"),"history":[{"date":d,"value":float(v)} for d,v in zip(dates,y)],"models":[],"timing":{},"software":{"python":platform.python_version(),"statsmodels":statsmodels.__version__,"numpy":np.__version__,"pandas":pd.__version__}}
    boundaries=origins(len(y),meta["minimum_train"],steps)
    if len(boundaries)<6:
        result.update(status="INSUFFICIENT HISTORY",reason=f"Need at least {meta['minimum_train']+6*steps} contiguous {meta['frequency'].lower()} targets for six non-overlapping forecast origins; available {len(y)}.")
        return result
    if y.std() <= max(1,abs(y.mean()))*1e-10:
        result.update(status="NO VALID FORECAST",reason="The selected target is constant or near-constant.")
        return result
    initial=y[:boundaries[0]+1];scaled=(initial-initial.mean())/initial.std()
    order,candidates=choose_order(scaled,meta["transform"]=="return")
    result["validation"]={"scheme":"Expanding window","training_start":dates[0],"initial_training_end":dates[boundaries[0]],"evaluation_start":dates[boundaries[0]+steps],"evaluation_end":dates[-1],"origins":len(boundaries),"spacing_periods":steps,"selection":"Lowest BIC on initial training sample only; fixed specification refit at every origin and current forecast.","selected_order":list(order) if order is not None else None,"candidates":candidates,"target":"Target value h periods ahead; market targets are the monthly return in that future month, not a cumulative return."}
    fits=len(candidates)
    for name in ("Naive","AR(1)","ARIMA"):
        rows=[];failures=[]
        for origin in boundaries:
            try:
                pred=fit_forecast(name,y[:origin+1],steps,spec["confidence"],meta["baseline"],order);fits+=1
                rows.append({"origin":dates[origin],"training_start":dates[0],"training_n":origin+1,"date":dates[origin+steps],"actual":float(y[origin+steps]),"forecast":float(pred["mean"][-1]),"lower":float(pred["lower"][-1]) if pred["lower"] is not None else None,"upper":float(pred["upper"][-1]) if pred["upper"] is not None else None,"order":list(order) if name=="ARIMA" and order is not None else None})
            except Exception as error:
                failures.append({"origin":dates[origin],"reason":str(error)[:120]})
        model={"name":name,"rows":rows,"failures":failures,"metrics":metrics(rows),"status":"complete" if len(rows)==len(boundaries) else "partial" if rows else "MODEL FIT FAILED"}
        # Comparison uses precisely the same target dates as this model.
        baseline=result["models"][0] if result["models"] else None
        if baseline:
            comparison=metrics([r for r in baseline["rows"] if r["date"] in {p["date"] for p in rows}])
            model["comparison_baseline"]=comparison
            for metric in ("mae","rmse"):
                b=comparison[metric];m=model["metrics"][metric]
                model["metrics"][metric+"_delta"]=(m/b-1)*100 if b and m is not None else None
            model["verdict"]=verdict(model["metrics"]["mae_delta"],model["metrics"]["rmse_delta"],len(rows))
        try:
            current=fit_forecast(name,y,steps,spec["confidence"],meta["baseline"],order);fits+=1
            future=pd.date_range(series.index[-1]+pd.offsets.MonthEnd(meta["period_months"]),periods=steps,freq=pd.offsets.MonthEnd(meta["period_months"]))
            model["forecast"]=[{"date":d.date().isoformat(),"value":float(current["mean"][i]),"lower":float(current["lower"][i]) if current["lower"] is not None else None,"upper":float(current["upper"][i]) if current["upper"] is not None else None} for i,d in enumerate(future)]
            model["details"]={k:current[k] for k in ("aic","bic","coefficients","scaling") if k in current}
            model["residuals"]=residual_diagnostics(current["residuals"],sum((order[0],order[2])) if name=="ARIMA" and order else 1 if name=="AR(1)" else 0)
        except Exception as error:
            model["current_error"]=str(error)[:120];model["forecast"]=[]
        # A six-origin rolling MAE, without changing the underlying forecasts.
        model["rolling_error"]=[{"date":r["date"],"value":float(np.mean([abs(p["forecast"]-p["actual"]) for p in rows[max(0,i-5):i+1]]))} for i,r in enumerate(rows)]
        result["models"].append(model)
    result["diagnostics"]=describe(y)
    # Fair headline ranking: models must complete the entire common OOS schedule.
    eligible=[m for m in result["models"][1:] if m["status"]=="complete" and m["metrics"]["rmse"] is not None]
    lowest=min(eligible,key=lambda m:m["metrics"]["rmse"]) if eligible else None
    result.update(status="COMPLETE",lowest_tested=lowest["name"] if lowest else None,conclusion=lowest["verdict"] if lowest else "INSUFFICIENT EVIDENCE")
    result["timing"]={"compute_ms":round((perf_counter()-started)*1000),"fit_count":fits,"walk_forward_fits":3*len(boundaries),"candidate_count":len(candidates)}
    return result
