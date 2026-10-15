import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from research.equities.features import price_features,historical_evidence,outcome_summary,cross_section,HORIZONS
from research.equities.fundamentals import normalize_companyfacts
from research.equities.features import completed_prices
from datetime import datetime,timezone

def prices(n=1500):
    values=100*np.exp(np.arange(n)*.0002+np.sin(np.arange(n)/21)*.1)
    return pd.DataFrame({"adjusted_close":values},index=pd.bdate_range("2015-01-01",periods=n))

def test_universe():
    u=json.loads((Path(__file__).resolve().parents[1]/"data/equity_universe.json").read_text())
    symbols=[r["symbol"] for r in u["instruments"]]
    assert len(symbols)==len(set(symbols)) and 500<=len(symbols)<=550
    assert {"MU","AAPL","JPM","XOM","WMT","NVDA"}<=set(symbols)
    assert len(u["sources"])>=2 and all(r["memberships"] for r in u["instruments"])

def test_completed_session_cutoff():
    frame=prices(10).set_axis(pd.bdate_range("2026-10-05",periods=10))
    before=completed_prices(frame,datetime(2026,10,15,19,0,tzinfo=timezone.utc))
    after=completed_prices(frame,datetime(2026,10,15,21,0,tzinfo=timezone.utc))
    assert before.index[-1].date().isoformat()=="2026-10-14"
    assert after.index[-1].date().isoformat()=="2026-10-15"

@pytest.mark.parametrize("n",[1,5,20,63,126,252])
def test_returns(n):
    p=prices();f=price_features(p)
    assert f[f"return_{n}"].iloc[-1]==pytest.approx(100*(p.adjusted_close.iloc[-1]/p.adjusted_close.iloc[-n-1]-1))

@pytest.mark.parametrize("n",[20,50,200])
def test_sma(n):
    p=prices();f=price_features(p)
    assert f[f"sma{n}"].iloc[-1]==pytest.approx(p.adjusted_close.iloc[-n:].mean())
    assert f[f"sma{n}_distance"].iloc[-1]==pytest.approx(100*(p.adjusted_close.iloc[-1]/p.adjusted_close.iloc[-n:].mean()-1))

def test_features_past_only():
    p=prices();a=price_features(p)
    changed=p.copy();changed.iloc[900:]*=8
    pd.testing.assert_frame_equal(a.iloc[:900],price_features(changed).iloc[:900])
    assert a.momentum_12_1.iloc[-1]==pytest.approx(100*(p.adjusted_close.iloc[-22]/p.adjusted_close.iloc[-253]-1))
    assert a.vol20.iloc[-1]==pytest.approx(p.adjusted_close.pct_change().iloc[-20:].std()*np.sqrt(252)*100)
    assert a.drawdown.iloc[-1]<=0 and a.max_drawdown.iloc[-1]<=a.drawdown.iloc[-1]

def test_constant_short_missing():
    p=prices(60);p.adjusted_close=100
    f=price_features(p)
    assert f.sma200.isna().all() and f.z20.isna().all()
    assert historical_evidence(p,f)["status"]=="Insufficient history"
    p.iloc[5]=np.nan
    assert pd.isna(price_features(p).return_1.iloc[6])

def test_zscore_prior_window():
    p=prices();f=price_features(p);prior=f.return_20.iloc[-253:-1]
    assert f.z20.iloc[-1]==pytest.approx((f.return_20.iloc[-1]-prior.mean())/prior.std())

def test_setup_no_overlap_and_outcomes():
    p=prices(2600);f=price_features(p);e=historical_evidence(p,f)
    rows=e["neighbours"]
    assert len(rows)>=5
    assert all(abs(a["position"]-b["position"])>=252 for i,a in enumerate(rows) for b in rows[i+1:])
    assert all(r["position"]+252<=len(p)-1 for r in rows)
    for row in rows:
        for h,n in HORIZONS.items():
            assert row["returns"][h]==pytest.approx(100*(p.adjusted_close.iloc[row["position"]+n]/p.adjusted_close.iloc[row["position"]]-1))
    # Any later observations do not affect a target whose input is explicitly truncated.
    extended=pd.concat([p,prices(300).set_axis(pd.bdate_range(p.index[-1]+pd.Timedelta(days=1),periods=300))])
    assert historical_evidence(extended.iloc[:len(p)],price_features(extended).iloc[:len(p)])==e

def test_summary():
    assert "median" not in outcome_summary([1,2,3,4])
    summary=outcome_summary([-3,-1,0,1,3])
    assert summary["positive"]==40 and summary["median"]==0 and summary["small_sample"]
    assert summary["p25"]==-1 and summary["p75"]==1

def test_cross_section_dates_ties_null():
    rows=[{"date":"2026-01-01","momentum_12_1":2},{"date":"2026-01-01","momentum_12_1":2},{"date":"2025-01-01","momentum_12_1":100},{"date":"2026-01-01","momentum_12_1":None}]
    result=cross_section(rows)
    assert result[0]["momentum_percentile"]==75 and result[2]["momentum_percentile"]==100
    assert result[-1]["momentum_percentile"] is None and result[0]["rank_universe_n"]==3

def fact(tag,values):
    return {tag:{"units":{"USD":values}}}
def row(start,end,val,filed="2026-03-01"):
    return {"start":start,"end":end,"val":val,"filed":filed,"form":"10-K","accn":"test"}

def test_fundamental_ytd_quarter_fcf_units_and_future():
    values=[row("2025-01-01","2025-03-31",10),row("2025-01-01","2025-06-30",30),row("2025-01-01","2025-09-30",60),row("2025-01-01","2025-12-31",100)]
    gaap={**fact("RevenueFromContractWithCustomerExcludingAssessedTax",values),**fact("NetCashProvidedByUsedInOperatingActivities",values),**fact("PaymentsToAcquirePropertyPlantAndEquipment",[dict(r,val=r["val"]*.2) for r in values])}
    q=normalize_companyfacts({"facts":{"us-gaap":gaap}},as_of="2026-10-15")
    assert [p["revenue"] for p in q]==[10,20,30,40]
    assert q[-1]["revenue_ttm"]==100 and q[-1]["fcf"]==32 and q[-1]["fcf_margin"]==80
    assert q[-1]["concepts"]["revenue"]["derived"]
    assert normalize_companyfacts({"facts":{"us-gaap":gaap}},as_of="2026-01-01")==[]
    bank=normalize_companyfacts({"facts":{"us-gaap":gaap}},financial=True,as_of="2026-10-15")
    assert all(p.get("fcf") is None and p.get("ocf") is None for p in bank)

def test_total_revenue_precedes_contract_component_on_matching_dates():
    period=row("2025-01-01","2025-03-31",700)
    gaap={**fact("Revenues",[period]),**fact("RevenueFromContractWithCustomerExcludingAssessedTax",[dict(period,val=50)]),**fact("GrossProfit",[dict(period,val=500)])}
    q=normalize_companyfacts({"facts":{"us-gaap":gaap}})
    assert q[0]["revenue"]==700
    assert q[0]["gross_margin"]==pytest.approx(500/700*100)
    assert q[0]["concepts"]["revenue"]["tag"]=="Revenues"

def test_missing_mapping_and_invalid_capex():
    assert normalize_companyfacts({"facts":{"us-gaap":{"CustomRevenue":{}}}})==[]
    gaap={**fact("NetCashProvidedByUsedInOperatingActivities",[row("2025-01-01","2025-03-31",5)]),**fact("PaymentsToAcquirePropertyPlantAndEquipment",[row("2025-01-01","2025-03-31",-2)])}
    q=normalize_companyfacts({"facts":{"us-gaap":gaap}})
    assert q[0].get("fcf") is None

def test_financial_revenue_mapping_and_no_industrial_fcf():
    gaap={**fact("RevenuesNetOfInterestExpense",[row("2025-01-01","2025-03-31",100)]),**fact("Revenues",[row("2025-01-01","2025-03-31",999)]),**fact("NetCashProvidedByUsedInOperatingActivities",[row("2025-01-01","2025-03-31",500)])}
    q=normalize_companyfacts({"facts":{"us-gaap":gaap}},financial=True)
    assert q[0]["revenue"]==100 and "ocf" not in q[0]

def test_sec_unit_filter_and_latest_filing():
    rows=[row("2025-01-01","2025-03-31",100,"2025-05-01"),row("2025-01-01","2025-03-31",120,"2026-03-01")]
    payload={"facts":{"us-gaap":{"Revenues":{"units":{"USD":rows,"EUR":[dict(rows[0],val=900)]}}}}}
    assert normalize_companyfacts(payload,as_of="2025-06-01")[0]["revenue"]==100
    assert normalize_companyfacts(payload,as_of="2026-06-01")[0]["revenue"]==120

def test_ttm_missing_quarter_does_not_sum():
    rows=[row("2025-01-01","2025-03-31",10),row("2025-04-01","2025-06-30",20),row("2025-10-01","2025-12-31",30),row("2026-01-01","2026-03-31",40)]
    q=normalize_companyfacts({"facts":{"us-gaap":fact("Revenues",rows)}})
    assert q[-1]["revenue_ttm"] is None

def test_successor_mapping_preserves_cik_provenance(monkeypatch):
    from scripts import ingest_equities
    calls=[]
    def fetch(path,force=False):
        calls.append(path)
        value=100 if "0000034088" in path else 120
        return {"facts":{"us-gaap":fact("Revenues",[row("2025-01-01","2025-03-31",value)])}}
    monkeypatch.setattr(ingest_equities,"sec_fetch",fetch)
    result=ingest_equities.issuer_facts("XOM","0002115436")
    assert len(calls)==2
    assert {r["source_cik"] for r in result["facts"]["us-gaap"]["Revenues"]["units"]["USD"]}=={"0000034088","0002115436"}
