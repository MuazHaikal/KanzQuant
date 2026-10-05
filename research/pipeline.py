"""Real point-in-time monthly research dataset and persisted research outputs."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from research.features import expanding_zscore
from research.regimes import fit_regimes, semantic_labels
from research.similarity import cosine_scores, forward_returns, select_spaced_neighbours, summarise_returns


@dataclass(frozen=True)
class FeatureSpec:
    key: str
    source: str
    transform: str
    group: str
    description: str


FEATURES = [
    FeatureSpec("fed_funds_level", "FEDFUNDS", "level", "Rates", "Effective federal funds rate"),
    FeatureSpec("us2y_level", "DGS2", "level", "Rates", "2-year Treasury yield"),
    FeatureSpec("us10y_level", "DGS10", "level", "Rates", "10-year Treasury yield"),
    FeatureSpec("curve_10y2y", "T10Y2Y", "level", "Rates", "10-year less 2-year Treasury spread"),
    FeatureSpec("cpi_yoy", "CPIAUCSL", "yoy", "Inflation", "Headline CPI year-over-year growth"),
    FeatureSpec("core_cpi_yoy", "CPILFESL", "yoy", "Inflation", "Core CPI year-over-year growth"),
    FeatureSpec("pce_yoy", "PCEPI", "yoy", "Inflation", "PCE price index year-over-year growth"),
    FeatureSpec("unemployment_level", "UNRATE", "level", "Labour", "Civilian unemployment rate"),
    FeatureSpec("payrolls_yoy", "PAYEMS", "yoy", "Labour", "Nonfarm payrolls year-over-year growth"),
    FeatureSpec("claims_yoy", "ICSA", "yoy", "Labour", "Initial claims year-over-year growth"),
    FeatureSpec("industrial_production_yoy", "INDPRO", "yoy", "Growth", "Industrial production year-over-year growth"),
    FeatureSpec("retail_sales_yoy", "RSAFS", "yoy", "Growth", "Retail sales year-over-year growth"),
    FeatureSpec("real_gdp_yoy", "GDPC1", "yoy", "Growth", "Real GDP year-over-year growth"),
    FeatureSpec("baa_10y_spread", "BAA10Y", "level", "Credit", "BAA corporate yield less 10-year Treasury"),
    FeatureSpec("m2_yoy", "M2SL", "yoy", "Liquidity", "M2 money stock year-over-year growth"),
    FeatureSpec("fed_assets_yoy", "WALCL", "yoy", "Liquidity", "Federal Reserve assets year-over-year growth"),
    FeatureSpec("vix_level", "VIXCLS", "level", "Volatility", "CBOE VIX level"),
    FeatureSpec("spx_momentum_6m", "SPX", "momentum_6m", "Markets", "S&P 500 six-month price momentum"),
    FeatureSpec("spx_volatility_6m", "SPX", "volatility_6m", "Markets", "S&P 500 six-month realised monthly volatility"),
]

FREQUENCY_LAGS = {"Daily": 0, "Weekly": 0, "Monthly": 1, "Quarterly": 3}


def point_in_time_monthly(values: pd.Series, frequency: str, end: pd.Timestamp | None = None) -> pd.Series:
    """Map observations to the first simplified month-end at which they are usable."""
    clean = values.dropna().astype(float).sort_index()
    clean.index = pd.DatetimeIndex(clean.index).tz_localize(None)
    lag = FREQUENCY_LAGS.get(frequency)
    if lag is None:
        raise ValueError(f"Unsupported frequency: {frequency}")
    if frequency in {"Daily", "Weekly"}:
        available = clean.groupby(clean.index.to_period("M")).last()
        available.index = available.index.to_timestamp("M")
    else:
        available = clean.copy()
        available.index = available.index.to_period("M").to_timestamp("M") + pd.offsets.MonthEnd(lag)
        available = available.groupby(level=0).last()
    terminal = (end or pd.Timestamp.utcnow().tz_localize(None)).to_period("M").to_timestamp("M")
    index = pd.date_range(available.index.min(), terminal, freq="ME")
    return available.reindex(index).ffill()


def transform_feature(values: pd.Series, transform: str) -> pd.Series:
    if transform == "level":
        return values
    if transform == "yoy":
        return values.pct_change(12, fill_method=None) * 100
    if transform == "momentum_6m":
        return values.pct_change(6, fill_method=None) * 100
    if transform == "volatility_6m":
        return values.pct_change(fill_method=None).rolling(6, min_periods=6).std(ddof=0) * np.sqrt(12) * 100
    raise ValueError(f"Unsupported transform: {transform}")


def build_real_states(macro_rows: pd.DataFrame, market_rows: pd.DataFrame, min_periods: int = 36):
    if macro_rows.empty or market_rows.empty:
        raise RuntimeError("Database mode requires both FRED observations and market observations")
    macro_ids = set(macro_rows["external_id"])
    market_ids = set(market_rows["symbol"])
    missing_macro = sorted({spec.source for spec in FEATURES if spec.source != "SPX"} - macro_ids)
    missing_market = sorted({spec.source for spec in FEATURES if spec.source == "SPX"} - market_ids)
    if missing_macro or missing_market:
        raise RuntimeError(f"Missing real research inputs: macro={missing_macro}, market={missing_market}")

    macro_rows = macro_rows.copy()
    market_rows = market_rows.copy()
    macro_rows["observed_at"] = pd.to_datetime(macro_rows["observed_at"])
    market_rows["observed_at"] = pd.to_datetime(market_rows["observed_at"])
    now = pd.Timestamp.utcnow().tz_localize(None)
    latest_market = market_rows["observed_at"].max()
    end = min(now, latest_market).to_period("M").to_timestamp("M")
    if min(now, latest_market).normalize() < end:
        end -= pd.offsets.MonthEnd(1)
    aligned: dict[str, pd.Series] = {}
    transformed: dict[str, pd.Series] = {}
    for spec in FEATURES:
        if spec.source == "SPX":
            subset = market_rows[market_rows["symbol"] == spec.source]
            source = subset.set_index("observed_at")["adjusted_close"]
            monthly = point_in_time_monthly(source, "Daily", end)
        else:
            subset = macro_rows[macro_rows["external_id"] == spec.source]
            frequency = str(subset["frequency"].iloc[0])
            source = subset.set_index("observed_at")["value"]
            monthly = point_in_time_monthly(source, frequency, end)
        aligned[spec.source] = monthly
        transformed[spec.key] = transform_feature(monthly, spec.transform)
    raw = pd.concat(transformed, axis=1).sort_index()
    states = raw.apply(lambda column: expanding_zscore(column, min_periods=min_periods))
    states = states.replace([np.inf, -np.inf], np.nan).dropna()
    if len(states) < 120:
        raise RuntimeError(f"Only {len(states)} complete state-vector months; at least 120 are required")
    raw = raw.reindex(states.index)
    return states, raw, aligned


def semantic_axes(states: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "growth": states[["payrolls_yoy", "industrial_production_yoy", "retail_sales_yoy", "real_gdp_yoy", "spx_momentum_6m"]].mean(axis=1)
            - states[["unemployment_level", "claims_yoy"]].mean(axis=1),
            "inflation": states[["cpi_yoy", "core_cpi_yoy", "pce_yoy"]].mean(axis=1),
            "rates": states[["fed_funds_level", "us2y_level", "us10y_level", "curve_10y2y"]].mean(axis=1),
            "credit": states["baa_10y_spread"],
            "liquidity": states[["m2_yoy", "fed_assets_yoy"]].mean(axis=1),
            "stress": states[["vix_level", "baa_10y_spread", "spx_volatility_6m"]].mean(axis=1) - states["spx_momentum_6m"],
        },
        index=states.index,
    )


def _nullable(value):
    return None if pd.isna(value) else round(float(value), 4)


def _monthly_market(market_rows: pd.DataFrame) -> pd.DataFrame:
    market_rows = market_rows.copy()
    market_rows["observed_at"] = pd.to_datetime(market_rows["observed_at"])
    prices = market_rows.pivot(index="observed_at", columns="symbol", values="adjusted_close").sort_index()
    return prices.resample("ME").last()


def run_real_pipeline(macro_rows: pd.DataFrame, market_rows: pd.DataFrame) -> tuple[dict, pd.DataFrame, dict[int, str], list[dict]]:
    states, raw, _ = build_real_states(macro_rows, market_rows)
    axes = semantic_axes(states)
    assignments, _, _ = fit_regimes(states)
    axis_centroids = axes.join(assignments["regime_id"]).groupby("regime_id").mean()
    labels = semantic_labels(axis_centroids)
    assignments["label"] = assignments["regime_id"].map(labels)
    target_date = states.index[-1]
    scores = cosine_scores(states, target_date, target_exclusion_months=12)
    neighbours_scores = select_spaced_neighbours(scores, 10, 9)
    if len(neighbours_scores) < 10:
        raise RuntimeError("Insufficient temporally distinct historical neighbours")
    monthly_prices = _monthly_market(market_rows).loc[:target_date]
    neighbour_rows: list[dict] = []
    forward_by_asset: dict[str, pd.DataFrame] = {}
    for symbol in monthly_prices.columns:
        forward_by_asset[symbol] = forward_returns(monthly_prices[symbol], neighbours_scores.index)
    for rank, (date, score) in enumerate(neighbours_scores.items(), 1):
        returns = {
            symbol: {key: _nullable(value) for key, value in frame.loc[date].items()}
            for symbol, frame in forward_by_asset.items()
        }
        neighbour_rows.append(
            {
                "rank": rank,
                "date": date.date().isoformat(),
                "similarity": round(float(np.clip(score, -1, 1)), 6),
                "regime": str(assignments.loc[date, "label"]),
                "state": {key: round(float(value), 4) for key, value in axes.loc[date].items()},
                "returns": returns,
            }
        )
    summaries = {
        symbol: {
            statistic: {horizon: _nullable(value) for horizon, value in row.items()}
            for statistic, row in summarise_returns(frame).iterrows()
        }
        for symbol, frame in forward_by_asset.items()
    }
    current_label = str(assignments.iloc[-1]["label"])
    same = assignments["label"].eq(current_label).iloc[::-1]
    duration = int(same.cumprod().sum())
    spx_returns = monthly_prices["SPX"].pct_change(fill_method=None).mul(100).reindex(assignments.index)
    regime_stats = []
    for regime_id, label in labels.items():
        values = spx_returns[assignments["regime_id"].eq(regime_id)].dropna()
        regime_stats.append({
            "name": label, "regime_id": int(regime_id), "months": int(values.count()),
            "mean": _nullable(values.mean()), "hit_rate": _nullable(values.gt(0).mean() * 100),
            "volatility": _nullable(values.std(ddof=1)),
        })
    label_order = [labels[key] for key in sorted(labels)]
    transitions = pd.crosstab(assignments["label"].shift(), assignments["label"], normalize="index").reindex(index=label_order, columns=label_order, fill_value=0) * 100
    feature_defs = [
        {"key": spec.key, "source": spec.source, "transform": spec.transform, "group": spec.group, "description": spec.description}
        for spec in FEATURES
    ]
    state_vectors = [
        {"date": date.date().isoformat(), "values": {key: round(float(value), 6) for key, value in row.items()}}
        for date, row in states.iterrows()
    ]
    market_series = {
        symbol: [{"date": date.date().isoformat(), "value": round(float(value), 4)} for date, value in series.dropna().iloc[-180:].items()]
        for symbol, series in monthly_prices.items()
    }
    current_axes = axes.iloc[-1]
    previous_axes = axes.iloc[-2]
    state_rows = [
        {
            "label": label.title() if label != "stress" else "Volatility",
            "z": round(float(current_axes[label]), 4),
            "change": round(float(current_axes[label] - previous_axes[label]), 4),
            "percentile": round(float(axes[label].rank(pct=True).iloc[-1] * 100)),
            "trend": "Rising" if current_axes[label] - previous_axes[label] > 0.05 else "Falling" if current_axes[label] - previous_axes[label] < -0.05 else "Stable",
        }
        for label in ["growth", "inflation", "rates", "credit", "liquidity", "stress"]
    ]
    payload = {
        "as_of": target_date.date().isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "current_regime": current_label,
        "confidence": round(float(assignments.iloc[-1]["confidence"]), 6),
        "regime_duration_months": duration,
        "features": feature_defs,
        "current_state": {key: round(float(value), 4) for key, value in states.iloc[-1].items()},
        "state_rows": state_rows,
        "state_vectors": state_vectors,
        "neighbours": neighbour_rows,
        "forward_summary": summaries,
        "regime_history": [
            {"date": date.date().isoformat(), "regime_id": int(row["regime_id"]), "label": str(row["label"]), "confidence": round(float(row["confidence"]), 4)}
            for date, row in assignments.iterrows()
        ],
        "regime_stats": regime_stats,
        "transition_matrix": {
            source: {target: round(float(value), 2) for target, value in row.items()}
            for source, row in transitions.iterrows()
        },
        "market_series": market_series,
        "methodology": {
            "data_mode": "database", "normalisation": "expanding_zscore_36m", "metric": "cosine",
            "k": 10, "target_exclusion_months": 12, "neighbour_gap_months": 9,
            "regime_model": "PCA(5)+KMeans(4)", "random_seed": 42,
            "release_lags": FREQUENCY_LAGS,
        },
    }
    return payload, assignments, labels, neighbour_rows
