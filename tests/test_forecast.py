from copy import deepcopy
import numpy as np
import pandas as pd
import pytest
from research.forecast.policy import prepare, policy, validate
from research.forecast.models import fit_forecast, choose_order
from research.forecast.engine import run, origins, metrics, verdict

def data(values,series="DGS10",start="2000-01-31"):
    dates=pd.date_range(start,periods=len(values),freq="ME")
    return {"kind":"forecast","series":series,"as_of":str(dates[-1].date()),"hash":"fixture","points":[{"date":str(d.date()),"value":float(v)} for d,v in zip(dates,values)]}

def spec(series="DGS10",horizon=3):return {"series":series,"horizon":horizon,"confidence":95,"training_start":""}

def test_target_policy_and_past_only_returns():
    _,x=prepare(data([100,110,99],"SPX"),spec("SPX"))
    assert x.to_numpy()==pytest.approx([10,-10])
    assert policy("SPX")["baseline"]=="Historical mean"
    assert policy("DGS10")["baseline"]=="Persistence"
    _,y=prepare(data(np.arange(100,125),"CPIAUCSL"),spec("CPIAUCSL"))
    assert y.iloc[0]==pytest.approx(12)

def test_calendar_gaps_not_compressed_or_backfilled():
    raw=data(np.arange(100,230),"SPX");raw["points"][90]["value"]=None
    _,x=prepare(raw,spec("SPX"));assert len(x)==38
    assert str(x.index[0].date())==raw["points"][92]["date"]

def test_nonpositive_market_price_is_missing_instead_of_a_fake_return():
    _,x=prepare(data([100,110,0],"SPX"),spec("SPX"))
    assert x.empty

@pytest.mark.parametrize("horizon",[1,3,6,12])
def test_boundaries(horizon):
    ids=origins(240,60,horizon)
    assert 6<=len(ids)<=24
    assert all(i>=59 and i+horizon<240 for i in ids)
    assert all(b-a==horizon for a,b in zip(ids,ids[1:]))

def test_future_mutation_does_not_change_historical_forecast():
    rng=np.random.default_rng(14);raw=data(np.cumsum(rng.normal(size=160)))
    before=deepcopy(raw);cutoff=before["points"][99]["date"]
    after=deepcopy(raw)
    for p in after["points"][100:]:p["value"]+=10000
    # Preparing at an origin excludes later values, before fitting/selection/scaling.
    before["as_of"]=after["as_of"]=cutoff
    _,a=prepare(before,spec());_,b=prepare(after,spec())
    assert np.array_equal(a,b)
    order,_=choose_order((a-a.mean())/a.std(ddof=0))
    for name in ["Naive","AR(1)","ARIMA"]:
        assert fit_forecast(name,a,6,95,"Persistence",order)["mean"]==pytest.approx(fit_forecast(name,b,6,95,"Persistence",order)["mean"])

def test_ar_process_beats_mean_and_intervals():
    rng=np.random.default_rng(3);x=np.zeros(300)
    for i in range(1,len(x)):x[i]=.9*x[i-1]+rng.normal(scale=.35)
    # Price fixture gives a return target with a defensible historical-mean baseline.
    prices=100*np.cumprod(1+x/100)
    result=run(data(prices,"SPX"),spec("SPX",1))
    ar=result["models"][1]
    assert result["status"]=="COMPLETE"
    assert ar["metrics"]["rmse_delta"] < -15
    assert len(ar["forecast"])==1
    assert ar["forecast"][0]["lower"]<ar["forecast"][0]["value"]<ar["forecast"][0]["upper"]
    assert ar["metrics"]["coverage"] is not None
    assert "ADF" in result["diagnostics"] and "ljung_box" in ar["residuals"]
    assert all(r["origin"]<r["date"] for r in ar["rows"])

def test_random_walk_does_not_force_complexity_to_win():
    result=run(data(np.cumsum(np.random.default_rng(442).normal(size=300))),spec(horizon=6))
    assert result["status"]=="COMPLETE"
    assert result["models"][1]["metrics"]["rmse_delta"] > -10
    assert result["timing"]["candidate_count"]==7
    assert result["timing"]["walk_forward_fits"]<=72

@pytest.mark.parametrize("kind",["short","constant","near_constant","missing","negative","zero"])
def test_edge_cases(kind):
    x=np.arange(160,dtype=float)
    if kind=="short":x=x[:20]
    if kind=="constant":x[:]=1
    if kind=="near_constant":x[:]=1+np.arange(len(x))*1e-14
    if kind=="missing":x[-20]=np.nan
    if kind=="negative":x=-x
    if kind=="zero":x[:]=0
    result=run(data(x),spec())
    assert result["status"] in {"COMPLETE","INSUFFICIENT HISTORY","NO VALID FORECAST"}

def test_arima_failure_disclosed(monkeypatch):
    import research.forecast.models as models
    def fail(*args,**kwargs):raise ValueError("controlled convergence failure")
    monkeypatch.setattr(models,"fit_arima",fail)
    result=run(data(np.random.default_rng(1).normal(size=120)),spec(horizon=3))
    assert result["models"][2]["status"]=="MODEL FIT FAILED"
    assert result["models"][2]["failures"] and result["models"][2]["current_error"]
    assert all(c["status"]=="MODEL FIT FAILED" for c in result["validation"]["candidates"])

def test_validation_and_verdict():
    for p in [spec(horizon=2),spec("bad"),{**spec(),"horizon":True},{**spec(),"confidence":99},spec("GDPC1",1)]:
        with pytest.raises(ValueError):validate(p)
    assert verdict(-1,-1,12)=="OUTPERFORMED BASELINE"
    assert verdict(1,1,12)=="DID NOT OUTPERFORM BASELINE"
    assert verdict(-1,1,12)=="MIXED RESULTS"
    assert verdict(-1,-1,2)=="INSUFFICIENT EVIDENCE"
    assert metrics([])["rmse"] is None

def test_entire_walk_forward_is_invariant_to_future_mutation():
    raw=data(np.cumsum(np.random.default_rng(7).normal(size=150)))
    future=deepcopy(raw)
    for point in future["points"][140:]:point["value"]+=50
    a,b=run(raw,spec()),run(future,spec())
    cutoff=raw["points"][140]["date"]
    for ma,mb in zip(a["models"],b["models"]):
        pa=[r for r in ma["rows"] if r["date"]<cutoff]
        pb=[r for r in mb["rows"] if r["date"]<cutoff]
        assert pa==pb

def test_forecast_capabilities_cannot_execute_hypotheses():
    import base64,hashlib,hmac,time
    from services.hypothesis_api.auth import verify_token
    run_id="11111111-1111-4111-8111-111111111111";secret="fixture-forecast-purpose-secret"*3;now=int(time.time());expiry=now+300
    signature=base64.urlsafe_b64encode(hmac.new(secret.encode(),f"kanzquant.forecast.v1\n{run_id}\n{expiry}".encode(),hashlib.sha256).digest()).decode().rstrip("=")
    token=f"v1.{expiry}.{signature}"
    assert verify_token(run_id,token,secret,now,purpose="forecast")
    assert not verify_token(run_id,token,secret,now)

def test_white_noise_does_not_manufacture_material_arima_gain():
    noise=np.random.default_rng(27).normal(size=240)
    prices=100*np.cumprod(1+noise/100)
    result=run(data(prices,"SPX"),spec("SPX",3))
    assert abs(result["models"][2]["metrics"]["rmse_delta"])<5

@pytest.mark.parametrize("steps",[1,3,6,12])
def test_recursive_interval_lengths(steps):
    train=np.random.default_rng(5).normal(size=120)
    forecast=fit_forecast("AR(1)",train,steps,95,"Historical mean")
    assert len(forecast["mean"])==steps
    assert np.all(forecast["lower"]<=forecast["mean"])
    assert np.all(forecast["upper"]>=forecast["mean"])
    assert forecast["upper"][-1]-forecast["lower"][-1]>=forecast["upper"][0]-forecast["lower"][0]
