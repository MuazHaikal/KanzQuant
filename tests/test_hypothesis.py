"""Synthetic known cases are test-only; production accepts persisted database data."""
from copy import deepcopy
import numpy as np
import pandas as pd
from scipy import stats
from research.hypothesis.events import metric,past_ranks,condition_mask,select,month
from research.hypothesis.statistics import group_test,relationship,bh
from research.hypothesis.engine import run

def data(n=360):
    rng=np.random.default_rng(20)
    xs=rng.normal(size=n);ys=-5*xs+rng.normal(size=n)
    return {"as_of":"2029-12-31","rows":[{"date":d.strftime("%Y-%m-%d"),"values":{"credit":float(xs[i]),"growth":float(-xs[i])},"state":"Context only","returns":{a:{str(h):float(ys[i]) for h in (1,3,6,12)} for a in ("SPX","GLD","IEF")}} for i,d in enumerate(pd.date_range("2000-01-31",periods=n,freq="ME"))]}

def parameters():
    return {"mode":"conditional","conditions":[{"source":"credit","metric":"level","op":"gt","threshold":0}],"spacing":3,"horizon":1,"asset":"SPX","baseline":"others","alternative":"two-sided","seed":42,"method":"Automatic"}

def test_calendar_change_and_missing_month():
    rows=data(40)["rows"];x=metric(rows,{"source":"credit","metric":"3"})
    assert np.isnan(x[:3]).all();assert x[5]==rows[5]["values"]["credit"]-rows[2]["values"]["credit"]
    rows.pop(2);assert np.isnan(metric(rows,{"source":"credit","metric":"3"})[4])

def test_percentile_no_future_leakage_and_ties():
    values=np.arange(100,dtype=float);ranks=past_ranks(values)
    assert np.isnan(ranks[:36]).all();assert ranks[36]==100
    extended=np.r_[values,[1e6]*30];np.testing.assert_equal(ranks,past_ranks(extended)[:100])
    assert past_ranks(np.ones(40))[39]==50

def test_and_condition():
    rows=data()["rows"];p=parameters();p["conditions"].append({"source":"growth","metric":"level","op":"lt","threshold":-1})
    _,event,_,_=select(rows,p["conditions"],3,1)
    assert all(rows[i]["values"]["credit"]>0 and rows[i]["values"]["growth"]<-1 for i in np.flatnonzero(event))

def test_spacing_applies_both_groups_and_is_outcome_independent():
    rows=data()["rows"];p=parameters();chosen,*_=select(rows,p["conditions"],3,12)
    dates=[month(rows[i]["date"]) for i in np.flatnonzero(chosen)];assert min(np.diff(dates))>=12
    for row in rows:row["returns"]["SPX"]["12"]=None
    np.testing.assert_equal(chosen,select(rows,p["conditions"],3,12)[0])

def test_direction_and_state():
    rows=data()["rows"]
    c={"source":"credit","metric":"3","op":"falling","threshold":0};mask,_,values,_=condition_mask(rows,c)
    assert (values[mask]<0).all()
    c.update(metric="level",op="state",threshold="Very low");mask,_,_,ranks=condition_mask(rows,c);assert (ranks[mask]<=10).all()

def test_known_null():
    a=np.linspace(-5,5,40);r=group_test(a,a)
    assert r["p"]>.9;assert r["effect"]==0;assert r["ci"][0]<0<r["ci"][1]

def test_known_effect_and_reproducibility():
    rng=np.random.default_rng(1);a=rng.normal(-5,1,40);b=rng.normal(0,1,40)
    r=group_test(a,b);assert r==group_test(a,b);assert r["p"]<.001;assert r["ci"][1]<0;assert r["effect"]<-3
    assert np.isclose(r["welch_t"],stats.ttest_ind(a,b,equal_var=False).statistic)
    assert r["mann_whitney_u"]==stats.mannwhitneyu(a,b,method="asymptotic").statistic

def test_full_baseline_shared_sample_scaling():
    a=np.arange(30)-10;b=np.arange(30);other=group_test(a,b);full=group_test(a,b,"full")
    assert full["baseline"]["n"]==60;assert full["p"]==other["p"]
    np.testing.assert_allclose(full["ci"],np.array(other["ci"])/2)
    assert full["difference"]==other["difference"]/2

def test_relationship_methods_known_positive():
    x=np.arange(50,dtype=float);y=2*x+np.sin(x)
    r=relationship(x,y);assert r==relationship(x,y);assert r["pearson"]>.99;assert r["spearman"]>.99
    assert abs(r["slope"]-2)<.01;assert r["p"]<.001;assert r["ci"][0]>.99
    regression=relationship(x,y,method="Regression");assert regression["ci"][0]>1.9;assert regression["difference"]==regression["slope"]

def test_insufficient_and_constant():
    assert group_test([1,2],[3,4])["p"] is None
    assert relationship(np.ones(20),np.arange(20))["status"]=="INSUFFICIENT SAMPLE"
    assert group_test(np.ones(20),np.ones(20))["p"] is None

def test_direction_explicit():
    a=np.arange(20)-10;b=np.arange(20)
    assert group_test(a,b,alternative="less")["p"]<group_test(a,b,alternative="greater")["p"]

def test_bh_known_values_and_missing():
    np.testing.assert_allclose(bh([.01,.04,.03,.2]),[.04,.053333333,.053333333,.2])
    assert bh([None,.01])==[None,.02]

def test_engine_known_effect_robustness_cases_reproducible():
    d=data();p=parameters();r=run(d,p);assert r==run(d,p)
    assert r["summary"]["difference"]<0;assert r["summary"]["evidence"] in ("MODERATE","STRONG")
    assert len(r["robustness"])==6;assert r["test_count"]==7
    assert all(d["rows"][i]["values"]["credit"]>0 for i in range(len(d["rows"])) if d["rows"][i]["date"] in [c["date"] for c in r["cases"]])

def test_thresholds_and_unavailable_future():
    d=data();p=parameters();p["conditions"][0].update(op="below",threshold=10)
    d["rows"][-1]["returns"]["SPX"]["1"]=None
    r=run(d,p);assert [c["label"] for c in r["robustness"] if c["kind"]=="Threshold"]==["P5","P10","P15","P20","P25"]
    assert d["rows"][-1]["date"] not in r["diagnostics"]["sample_dates"]

def test_horizon_and_asset_support():
    d=data(30);p=parameters()
    for asset in ("SPX","GLD","IEF"):
        for horizon in (1,3,6,12):
            r=run(d,{**p,"asset":asset,"horizon":horizon});assert r["summary"]["effective_spacing"]>=horizon

def test_relationship_selection_not_threshold_filtered():
    d=data();p=parameters();p.update(mode="relationship",method="Regression");p["conditions"][0].update(op="below",threshold=1)
    r=run(d,p);assert r["summary"]["n"]==120;assert r["summary"]["slope"]<-4

def test_explicit_method_applies_to_all_robustness_checks():
    for method,key in (("Welch t-test","welch_p"),("Mann-Whitney","mann_whitney_p")):
        p=parameters();p["method"]=method
        r=run(data(),p)
        assert r["summary"]["p"]==r["summary"][key]
        assert all(c["stats"]["p"]==c["stats"][key] for c in r["robustness"])
