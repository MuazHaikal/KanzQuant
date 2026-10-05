"""Historical similarity and conditional forward-return calculations."""
from __future__ import annotations
import numpy as np
import pandas as pd


def cosine_scores(states: pd.DataFrame, target_date=None, target_exclusion_months: int = 0) -> pd.Series:
    clean = states.dropna()
    target_date = target_date or clean.index[-1]
    target = clean.loc[target_date].to_numpy(float)
    matrix = clean.to_numpy(float)
    denom = np.linalg.norm(matrix, axis=1) * np.linalg.norm(target)
    scores = np.divide(matrix @ target, denom, out=np.zeros(len(clean)), where=denom != 0)
    ranked = pd.Series(scores, index=clean.index).drop(target_date)
    if target_exclusion_months:
        cutoff = pd.Timestamp(target_date) - pd.DateOffset(months=target_exclusion_months)
        ranked = ranked[ranked.index <= cutoff]
    return ranked.clip(-1, 1).sort_values(ascending=False)


def select_spaced_neighbours(scores: pd.Series, k: int = 10, min_gap_months: int = 9) -> pd.Series:
    """Greedy ranking that prevents one adjacent episode dominating the result."""
    selected: list[pd.Timestamp] = []
    for date in scores.index:
        stamp = pd.Timestamp(date)
        if all(abs((stamp.year - x.year) * 12 + stamp.month - x.month) >= min_gap_months for x in selected):
            selected.append(stamp)
        if len(selected) == k:
            break
    return scores.loc[selected]


def forward_returns(prices: pd.Series, dates, horizons=(1, 3, 6, 12)) -> pd.DataFrame:
    prices = prices.sort_index().astype(float)
    result = {}
    for horizon in horizons:
        fwd = prices.shift(-horizon).div(prices).sub(1).mul(100)
        result[f"{horizon}m"] = fwd.reindex(pd.DatetimeIndex(dates)).to_numpy()
    return pd.DataFrame(result, index=pd.DatetimeIndex(dates))


def summarise_returns(returns: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame({
        "mean": returns.mean(), "median": returns.median(), "hit_rate": returns.gt(0).mean() * 100,
        "best": returns.max(), "worst": returns.min(), "std": returns.std(ddof=1), "n": returns.count(),
    }).T
