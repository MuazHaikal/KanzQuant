"""Small, explicit model set; training-only selection and recursive forecasts."""
import warnings
import numpy as np
from statsmodels.tsa.ar_model import AutoReg
from statsmodels.tsa.arima.model import ARIMA

ORDERS = ((0, 0, 0), (1, 0, 0), (0, 0, 1), (1, 0, 1), (0, 1, 0), (1, 1, 0), (0, 1, 1))

def fit_arima(y, order):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        result = ARIMA(y, order=order, trend="c" if order[1] == 0 else "n", enforce_stationarity=True, enforce_invertibility=True).fit(method_kwargs={"maxiter":60})
    if not result.mle_retvals.get("converged", False) or not np.isfinite(result.bic) or not np.all(np.isfinite(result.params)):
        raise ValueError("Non-converged or non-finite ARIMA fit")
    return result

def choose_order(train, returns=False):
    candidates = []
    for order in ORDERS:
        if returns and order[1]:
            continue
        try:
            fit = fit_arima(train, order)
            candidates.append({"order": list(order), "bic": float(fit.bic), "status": "complete"})
        except Exception:
            candidates.append({"order": list(order), "bic": None, "status": "MODEL FIT FAILED"})
    valid = [c for c in candidates if c["bic"] is not None]
    return (tuple(min(valid, key=lambda c: (c["bic"], c["order"]))["order"]) if valid else None), candidates

def fit_forecast(name, train, steps, confidence, baseline, order=None):
    y = np.asarray(train, dtype=float)
    # Numerical scaling is computed independently inside every training window.
    center, scale = float(y.mean()), float(y.std())
    if scale <= max(1, abs(center)) * 1e-10:
        raise ValueError("Constant or near-constant training sample")
    z = (y-center)/scale
    alpha = 1-confidence/100
    if name == "Naive":
        mean = float(y.mean()) if baseline == "Historical mean" else float(y[-1])
        return {"mean": np.repeat(mean, steps), "lower": None, "upper": None, "fit": None, "residuals": y[1:] - (np.cumsum(y[:-1])/np.arange(1,len(y)) if baseline == "Historical mean" else y[:-1])}
    if name == "AR(1)":
        fit = AutoReg(z, lags=1, trend="c", old_names=False).fit()
        # Guard explosive fits, rather than silently replacing them with persistence.
        if abs(float(fit.params[1])) >= 1.02:
            raise ValueError("Unstable AR coefficient")
        prediction = fit.get_prediction(start=len(z), end=len(z)+steps-1)
        mean = np.asarray(prediction.predicted_mean)
        bounds = np.asarray(prediction.conf_int(alpha=alpha))
    else:
        if order is None:
            raise ValueError("No reliable ARIMA candidate")
        fit = fit_arima(z, order)
        prediction = fit.get_forecast(steps=steps)
        mean = np.asarray(prediction.predicted_mean)
        bounds = np.asarray(prediction.conf_int(alpha=alpha))
    if not np.isfinite(mean).all() or not np.isfinite(bounds).all() or np.max(np.abs(mean)) > 100:
        raise ValueError("No finite, bounded forecast")
    return {"mean": mean*scale+center, "lower": bounds[:,0]*scale+center, "upper": bounds[:,1]*scale+center, "fit": fit, "residuals": np.asarray(fit.resid)*scale,
            "scaling": {"center":center,"scale":scale}, "coefficients": dict(zip(fit.param_names if name == "ARIMA" else fit.model.exog_names, map(float,fit.params))),
            "aic": float(fit.aic), "bic": float(fit.bic)}
