"""Descriptive diagnostics. No test is interpreted as a model-validity probability."""
import warnings
import numpy as np
from statsmodels.tsa.stattools import acf, pacf, adfuller, kpss
from statsmodels.stats.diagnostic import acorr_ljungbox

def correlations(values):
    values = np.asarray(values, dtype=float)
    if len(values) < 10 or values.std() < 1e-10:
        return {"acf": [], "pacf": [], "bound": None}
    lag = min(18, len(values)//2-1)
    return {"acf": list(map(float,acf(values,nlags=lag,fft=False)[1:])), "pacf": list(map(float,pacf(values,nlags=lag,method="ywm")[1:])), "bound":float(1.96/np.sqrt(len(values)))}

def describe(values):
    out = correlations(values)
    out["n"] = len(values)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for name in ("ADF", "KPSS"):
            try:
                test = adfuller(values,maxlag=min(8,len(values)//4),autolag="BIC") if name == "ADF" else kpss(values,regression="c",nlags="auto")
                p = float(test[1])
                out[name] = {"statistic":float(test[0]),"p":p,"n":int(test[3]) if name=="ADF" else len(values),"lags":int(test[2]),
                    "interpretation": ("Evidence against a unit root" if p<.05 else "Unit root not rejected") if name=="ADF" else ("Evidence against level stationarity" if p<.05 else "Level stationarity not rejected"),
                    "note":"KPSS p-value may be bounded by its lookup table" if name=="KPSS" else "ADF null: unit root"}
            except Exception:
                out[name] = {"status":"Unavailable for this sample"}
    return out

def residual_diagnostics(values, model_df=1):
    x = np.asarray(values,dtype=float)[max(model_df,1):]
    out = correlations(x)
    out["history"] = list(map(float,x[-120:]))
    lag = min(12,len(x)//5)
    if lag>model_df and len(x)>20 and x.std()>1e-10:
        result=acorr_ljungbox(x,lags=[lag],model_df=model_df,return_df=True).iloc[0]
        p=float(result.lb_pvalue)
        out["ljung_box"]={"lag":lag,"model_df":model_df,"statistic":float(result.lb_stat),"p":p,"interpretation":"Residual autocorrelation remains" if p<.05 else "No strong evidence of remaining autocorrelation"}
    return out
