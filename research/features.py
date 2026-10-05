"""Reusable, point-in-time feature construction for monthly research."""
from __future__ import annotations
import numpy as np
import pandas as pd


def expanding_zscore(values: pd.Series, min_periods: int = 24) -> pd.Series:
    """Standardise using only the sample available at each timestamp."""
    mean = values.expanding(min_periods=min_periods).mean()
    std = values.expanding(min_periods=min_periods).std(ddof=0).replace(0, np.nan)
    return (values - mean) / std


def rolling_percentile(values: pd.Series, window: int = 120, min_periods: int = 24) -> pd.Series:
    def last_rank(sample: pd.Series) -> float:
        return float(sample.rank(pct=True).iloc[-1])
    return values.rolling(window, min_periods=min_periods).apply(last_rank, raw=False)


def slope(values: pd.Series, window: int = 6) -> pd.Series:
    x = np.arange(window, dtype=float)
    return values.rolling(window).apply(lambda y: np.polyfit(x, y, 1)[0], raw=True)


def build_features(values: pd.Series, mode: str = "level") -> pd.DataFrame:
    """Feature set selected by economic meaning rather than applied indiscriminately."""
    clean = values.astype(float).sort_index()
    base = clean.pct_change(12) * 100 if mode == "yoy" else clean.diff(12) if mode == "difference" else clean
    out = pd.DataFrame(index=clean.index)
    out["level"] = clean
    out["change_1m"] = clean.pct_change() * 100
    out["change_3m"] = clean.pct_change(3) * 100
    out["change_6m"] = clean.pct_change(6) * 100
    out["change_12m"] = clean.pct_change(12) * 100
    out["transformed"] = base
    out["zscore"] = expanding_zscore(base)
    out["percentile"] = rolling_percentile(base)
    out["volatility_12m"] = out["change_1m"].rolling(12, min_periods=6).std()
    out["slope_6m"] = slope(base, 6)
    out["acceleration"] = out["slope_6m"].diff(3)
    return out.replace([np.inf, -np.inf], np.nan)


def align_monthly(frame: pd.DataFrame, release_lags: dict[str, int] | None = None) -> pd.DataFrame:
    """Month-end alignment. Optional lags approximate release availability."""
    monthly = frame.sort_index().resample("ME").last()
    for column, months in (release_lags or {}).items():
        if column in monthly:
            monthly[column] = monthly[column].shift(months)
    return monthly
