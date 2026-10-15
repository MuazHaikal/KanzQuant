"""Past-only feature construction and same-stock descriptive evidence."""
import numpy as np
import pandas as pd
from datetime import datetime,timedelta,time
from zoneinfo import ZoneInfo

def completed_date(now=None):
    now=now or datetime.now(ZoneInfo("America/New_York"))
    local=now.astimezone(ZoneInfo("America/New_York"))
    return local.date() if local.time()>=time(16,30) else local.date()-timedelta(days=1)

def completed_prices(frame,now=None):
    return frame.loc[frame.index.date<=completed_date(now)]

HORIZONS={"1m":21,"3m":63,"6m":126,"12m":252}
STATE=["z20","return_63","sma50_distance","sma200_distance","vol20_percentile","drawdown"]
def price_features(frame):
    p=frame.adjusted_close.astype(float)
    out=pd.DataFrame(index=p.index)
    r=p.pct_change(fill_method=None)
    for n in [1,5,20,63,126,252]:out[f"return_{n}"]=p.pct_change(n,fill_method=None)*100
    for n in [20,50,200]:
        sma=p.rolling(n,min_periods=n).mean()
        out[f"sma{n}"]=sma
        out[f"sma{n}_distance"]=(p/sma-1)*100
    out["sma50_vs_200"]=(out.sma50/out.sma200-1)*100
    out["momentum_12_1"]=(p.shift(21)/p.shift(252)-1)*100
    out["high52_proximity"]=(p/p.rolling(252,min_periods=252).max()-1)*100
    for n in [5,20]:
        returns=out[f"return_{n}"]
        mean=returns.shift(1).rolling(252,min_periods=126).mean()
        std=returns.shift(1).rolling(252,min_periods=126).std()
        out[f"z{n}"]=(returns-mean)/std.replace(0,np.nan)
    d=out.sma50_distance
    out["sma_distance_z"]=(d-d.shift(1).rolling(252,min_periods=126).mean())/d.shift(1).rolling(252,min_periods=126).std().replace(0,np.nan)
    for n in [20,63,252]:out[f"vol{n}"]=r.rolling(n,min_periods=n).std()*np.sqrt(252)*100
    out["vol20_percentile"]=out.vol20.rolling(252,min_periods=126).rank(pct=True)*100
    out["drawdown"]=(p/p.cummax()-1)*100
    out["max_drawdown"]=out.drawdown.cummin()
    out["downside_vol"]=r.clip(upper=0).pow(2).rolling(63,min_periods=63).mean().pow(.5)*np.sqrt(252)*100
    for n in [20,60]:
        x=np.arange(n);xc=x-x.mean()
        out[f"trend_slope_{n}"]=np.log(p).rolling(n).apply(lambda y:np.dot(xc,y-y.mean())/np.dot(xc,xc),raw=True)*100
    out["skew"]=r.rolling(252,min_periods=126).skew()
    out["kurtosis"]=r.rolling(252,min_periods=126).kurt()
    return out.replace([np.inf,-np.inf],np.nan)

def outcome_summary(values):
    a=np.asarray(values,float)
    if len(a)<5:return {"n":len(a),"small_sample":True,"values":list(values)}
    return {"n":len(a),"small_sample":len(a)<20,"values":list(values),"mean":float(a.mean()),"median":float(np.median(a)),"positive":float((a>0).mean()*100),**{f"p{q}":float(np.percentile(a,q)) for q in [10,25,75,90]}}

def historical_evidence(frame,features):
    clean=features[STATE].dropna()
    if len(clean)<253:return {"status":"Insufficient history","neighbours":[],"outcomes":{}}
    # All matching candidates and all their 252-session outcomes end before target.
    target=clean.iloc[-1]
    target_pos=frame.index.get_loc(clean.index[-1])
    positions={d:i for i,d in enumerate(frame.index)}
    candidates=clean.loc[[d for d in clean.index if positions[d]<=target_pos-252]]
    if len(candidates)<60:return {"status":"Insufficient history","neighbours":[],"outcomes":{}}
    scale=candidates.std().replace(0,np.nan)
    usable=scale.dropna().index
    if len(usable)<4:return {"status":"Insufficient feature variation","neighbours":[],"outcomes":{}}
    distances=(((candidates[usable]-target[usable])/scale[usable])**2).mean(axis=1).pow(.5).sort_values()
    chosen=[]
    for d,dist in distances.items():
        i=positions[d]
        if all(abs(i-row["position"])>=252 for row in chosen):
            chosen.append({"date":d.date().isoformat(),"distance":float(dist),"position":i,"returns":{h:float((frame.adjusted_close.iloc[i+n]/frame.adjusted_close.iloc[i]-1)*100) for h,n in HORIZONS.items()}})
        if len(chosen)==12:break
    return {"status":"Descriptive historical evidence","neighbours":chosen,"outcomes":{h:outcome_summary([r["returns"][h] for r in chosen]) for h in HORIZONS}}

def cross_section(rows):
    # Only compare observations with the same price date; no mixed-date ranking.
    for day in {r["date"] for r in rows}:
        group=[r for r in rows if r["date"]==day]
        for key,label in [("momentum_12_1","momentum_percentile"),("vol20","volatility_percentile"),("revenue_ttm_growth","growth_percentile"),("operating_margin","quality_percentile")]:
            values=pd.Series([r.get(key) for r in group],dtype=float)
            ranks=values.rank(method="average",pct=True)*100
            for r,v in zip(group,ranks):
                r[label]=None if pd.isna(v) else float(v)
                r[label+"_n"]=int(values.count())
        for r in group:r["rank_universe_n"]=len(group);r["rank_date"]=day;r["value_percentile"]=None
    return rows
