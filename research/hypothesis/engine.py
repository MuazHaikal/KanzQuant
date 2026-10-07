"""Hypothesis orchestrator: cases, controlled robustness and transparent evidence."""
from copy import deepcopy
import hashlib
import json
import numpy as np
from research.hypothesis.events import select, metric
from research.hypothesis.statistics import group_test, relationship, bh, MIN_SAMPLE, ITERATIONS

ENGINE_VERSION = "hypothesis-0.2.0"

def analyze(rows, p):
    chosen,event,valid,masks=select(rows,p["conditions"],p["spacing"],p["horizon"],p["mode"])
    ys=np.asarray([r["returns"][p["asset"]].get(str(p["horizon"]),np.nan) if r["returns"][p["asset"]].get(str(p["horizon"])) is not None else np.nan for r in rows],float)
    available=np.isfinite(ys); sample=chosen & available
    if p["mode"]=="relationship":
        x=metric(rows,p["conditions"][0]); summary=relationship(x[sample],ys[sample],p["seed"],method=p["method"],alternative=p["alternative"])
        cases=[{"date":r["date"],"state":r["state"],"values":[float(x[i])],"returns":r["returns"][p["asset"]],"included":bool(sample[i])} for i,r in enumerate(rows) if valid[i]]
    else:
        summary=group_test(ys[sample&event],ys[sample&~event],p["baseline"],p["alternative"],p["seed"])
        cases=[{"date":r["date"],"state":r["state"],"values":[float(m[2][i]) for m in masks],"ranks":[float(m[3][i]) for m in masks],"returns":r["returns"][p["asset"]],"included":bool(sample[i])} for i,r in enumerate(rows) if event[i]]
        if p["method"]=="Welch t-test":summary["p"]=summary["welch_p"]
        if p["method"]=="Mann-Whitney":summary["p"]=summary["mann_whitney_p"]
    summary["evidence"]="WEAK" if summary["status"]=="COMPLETE" else "INSUFFICIENT SAMPLE"
    summary["effective_spacing"]=max(p["spacing"],p["horizon"])
    summary["qualified_months"]=sum(event & valid) if p["mode"]=="conditional" else sum(valid)
    summary["missing_outcomes"]=sum(chosen & ~available)
    return summary,cases,sample,event,ys

def run(data,p):
    rows=data["rows"]; summary,cases,sample,event,ys=analyze(rows,p)
    checks=[]
    if p["mode"]=="conditional" and p["conditions"][0]["op"] in ("below","above"):
        threshold=p["conditions"][0]["threshold"]
        offsets=[-5,0,5,10,15] if p["conditions"][0]["op"]=="below" else [-15,-10,-5,0,5]
        for t in sorted(set(max(1,min(99,threshold+i)) for i in offsets)):
            pp=deepcopy(p);pp["conditions"][0]["threshold"]=t
            stat,*_=analyze(rows,pp); checks.append({"kind":"Threshold","label":"P"+str(t),"stats":stat})
    for horizon in (1,3,6,12):
        pp={**p,"horizon":horizon};stat,*_=analyze(rows,pp);checks.append({"kind":"Horizon","label":str(horizon)+"M","stats":stat})
    # Split at fixed calendar midpoint; conditions/ranks still use full PAST context, never restart ranks.
    midpoint=len(rows)//2
    for label,indices in (("First half",np.arange(len(rows))<midpoint),("Second half",np.arange(len(rows))>=midpoint)):
        mask=sample & indices
        if p["mode"]=="conditional":
            stat=group_test(ys[mask&event],ys[mask&~event],p["baseline"],p["alternative"],p["seed"])
            if p["method"]=="Welch t-test":stat["p"]=stat["welch_p"]
            if p["method"]=="Mann-Whitney":stat["p"]=stat["mann_whitney_p"]
        else:
            x=metric(rows,p["conditions"][0]);stat=relationship(x[mask],ys[mask],p["seed"],method=p["method"],alternative=p["alternative"])
        checks.append({"kind":"Subperiod","label":label+" · "+rows[np.flatnonzero(indices)[0]]["date"][:7]+"–"+rows[np.flatnonzero(indices)[-1]]["date"][:7],"stats":stat})
    sign=np.sign(summary.get("difference") or 0)
    assess=[c for c in checks if c["stats"]["status"]=="COMPLETE"]
    agree=sum(np.sign(c["stats"].get("difference") or 0)==sign for c in assess)
    ci=summary.get("ci"); excludes=bool(ci and ci[0]*ci[1]>0)
    n=summary.get("event",{}).get("n",summary.get("n",0))
    pvalue=summary["p"];effect=abs(summary.get("effect") or 0)
    split=[c["stats"] for c in checks if c["kind"]=="Subperiod"]
    split_agree=all(s["status"]=="COMPLETE" and np.sign(s.get("difference") or 0)==sign for s in split)
    if summary["status"]=="COMPLETE" and pvalue is not None and pvalue<=.05 and excludes and effect>=.2 and n>=15 and len(assess)>=3 and agree/len(assess)>=.6:
        summary["evidence"]="MODERATE"
        if pvalue<=.01 and effect>=.5 and n>=30 and agree/len(assess)>=.8 and split_agree:summary["evidence"]="STRONG"
    for check,q in zip(checks,bh([c["stats"]["p"] for c in checks])):check["adjusted_p"]=q
    used=[i for i in range(len(rows)) if sample[i]]
    lag_pairs=[(ys[a],ys[b]) for a,b in zip(used,used[1:]) if np.isfinite(ys[a]) and np.isfinite(ys[b])]
    autocorr=None
    if len(lag_pairs)>2:
        a,b=np.asarray(lag_pairs).T
        if np.ptp(a)>0 and np.ptp(b)>0:autocorr=float(np.corrcoef(a,b)[0,1])
    h0="The conditional mean return equals the comparison mean." if p["mode"]=="conditional" else "The selected relationship statistic is zero."
    h1=("The conditional mean return differs from the comparison mean." if p["mode"]=="conditional" else "The selected relationship statistic differs from zero.") if p["alternative"]=="two-sided" else "The selected effect is "+("lower" if p["alternative"]=="less" else "higher")+" than zero."
    if p["method"]=="Mann-Whitney":h0="The event and non-event return distributions are equal.";h1="The event return distribution "+("differs from the non-event distribution." if p["alternative"]=="two-sided" else "is stochastically "+("lower." if p["alternative"]=="less" else "higher."))
    return {"summary":summary,"cases":cases,"robustness":checks,"agreement":{"agree":agree,"available":len(assess)},
            "distribution":{"event":[float(y) for y in ys[sample&event]],"control":[float(y) for y in ys[sample&~event]]} if p["mode"]=="conditional" else None,
            "diagnostics":{"sample_dates":[rows[i]["date"] for i in used],"lag1_return_correlation":autocorr,"minimum_sample":MIN_SAMPLE,
                           "residual_dependence":"Calendar spacing removes overlap, not all serial dependence; IID resampling and secondary tests assume exchangeability. Interpret cautiously.",
                           "state_context":"Full-history regimes are descriptive case labels only, never condition inputs."},
            "technical":{"h0":h0,"h1":h1,"engine":ENGINE_VERSION,"permutation_iterations":ITERATIONS,"bootstrap_iterations":ITERATIONS,"seed":p["seed"],"confidence":.95,
                         "baseline_inference":"Full baseline shares events: mean difference/CI/effect scaled by non-event fraction; permutation, Welch and U compare disjoint event/non-event groups.",
                         "percentiles":"Expanding prior-only mid-CDF; 36 prior same-metric observations required.","units":"Returns in percentage points; factor changes in existing semantic axis units; raw changes in source units."},
            "test_count":1+len(checks),"fingerprint":hashlib.sha256(json.dumps({"data":data,"parameters":p,"engine":ENGINE_VERSION},sort_keys=True).encode()).hexdigest()}
