"""Deterministic vectorized resampling and established SciPy reference tests."""
import warnings
import numpy as np
from scipy import stats

MIN_SAMPLE = 10
ITERATIONS = 10000

def clean(value):
    return float(value) if np.isfinite(value) else None

def describe(x):
    return {"n": len(x), "mean": clean(np.mean(x)) if len(x) else None, "median": clean(np.median(x)) if len(x) else None,
            "sd": clean(np.std(x, ddof=1)) if len(x) > 1 else None}

def bh(pvalues):
    values = np.asarray([1 if p is None else p for p in pvalues], float)
    order = np.argsort(values, kind="stable")
    adjusted = np.minimum.accumulate((values[order] * len(values) / np.arange(1, len(values)+1))[::-1])[::-1]
    output = np.empty(len(values)); output[order] = np.minimum(adjusted, 1)
    return [None if p is None else float(q) for p, q in zip(pvalues, output)]

def group_test(a, b, baseline="others", alternative="two-sided", seed=42, iterations=ITERATIONS):
    a, b = np.asarray(a, float), np.asarray(b, float)
    full = np.r_[a, b]
    scale = len(b) / len(full) if baseline == "full" and len(full) else 1
    base = full if baseline == "full" else b
    difference = (np.mean(a)-np.mean(b))*scale if len(a) and len(b) else np.nan
    variance = ((len(a)-1)*np.var(a, ddof=1)+(len(b)-1)*np.var(b, ddof=1))/(len(full)-2) if len(a)>1 and len(b)>1 else np.nan
    result = {"event": describe(a), "control": describe(b), "baseline": describe(base), "difference": clean(difference),
              "effect": clean(difference/np.sqrt(variance)) if variance>0 else None, "p": None, "ci": None,
              "welch_t": None, "welch_p": None, "mann_whitney_u": None, "mann_whitney_p": None,
              "status": "INSUFFICIENT SAMPLE", "evidence": "INSUFFICIENT SAMPLE", "iterations": iterations}
    if min(len(a),len(b)) < MIN_SAMPLE or not variance > 0:
        return result
    rng = np.random.default_rng(seed)
    def mean_diff(x, y, axis=-1): return np.mean(x,axis=axis)-np.mean(y,axis=axis)
    # Membership randomization; inference assumes exchangeability AFTER calendar thinning.
    perm = stats.permutation_test((a,b), mean_diff, vectorized=True, n_resamples=iterations, batch=250, alternative=alternative, rng=rng)
    boot = (a[rng.integers(len(a),size=(iterations,len(a)))].mean(axis=1)-b[rng.integers(len(b),size=(iterations,len(b)))].mean(axis=1))*scale
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        welch=stats.ttest_ind(a,b,equal_var=False,alternative=alternative)
        mw=stats.mannwhitneyu(a,b,alternative=alternative,method="asymptotic")
    result.update(p=clean(perm.pvalue),ci=np.quantile(boot,[.025,.975]).tolist(),welch_t=clean(welch.statistic),welch_p=clean(welch.pvalue),
                  mann_whitney_u=clean(mw.statistic),mann_whitney_p=clean(mw.pvalue),status="COMPLETE")
    return result

def relationship(x,y,seed=42,iterations=ITERATIONS,method="Automatic",alternative="two-sided"):
    x,y=np.asarray(x,float),np.asarray(y,float)
    result={"n":len(x),"pearson":None,"pearson_p":None,"spearman":None,"spearman_p":None,"slope":None,"intercept":None,"ols_p":None,"r2":None,
            "p":None,"ci":None,"effect":None,"difference":None,"evidence":"INSUFFICIENT SAMPLE","status":"INSUFFICIENT SAMPLE"}
    if len(x)<MIN_SAMPLE or np.ptp(x)==0 or np.ptp(y)==0:return result
    pearson=stats.pearsonr(x,y,alternative=alternative); spearman=stats.spearmanr(x,y,alternative=alternative); ols=stats.linregress(x,y,alternative=alternative)
    rng=np.random.default_rng(seed); indexes=rng.integers(len(x),size=(iterations,len(x))); bx,by=x[indexes],y[indexes]
    dx,dy=bx-bx.mean(axis=1,keepdims=True),by-by.mean(axis=1,keepdims=True)
    denom=(dx*dx).sum(axis=1)
    with np.errstate(invalid="ignore",divide="ignore"):
        samples=(dx*dy).sum(axis=1)/denom if method=="Regression" else (dx*dy).sum(axis=1)/np.sqrt(denom*(dy*dy).sum(axis=1))
    samples=samples[np.isfinite(samples)]
    result.update(pearson=clean(pearson.statistic),pearson_p=clean(pearson.pvalue),spearman=clean(spearman.statistic),spearman_p=clean(spearman.pvalue),
                  slope=clean(ols.slope),intercept=clean(ols.intercept),ols_p=clean(ols.pvalue),r2=clean(ols.rvalue**2),
                  p=clean(ols.pvalue if method=="Regression" else pearson.pvalue),ci=np.quantile(samples,[.025,.975]).tolist(),
                  effect=clean(pearson.statistic),difference=clean(ols.slope if method=="Regression" else pearson.statistic),status="COMPLETE")
    return result
