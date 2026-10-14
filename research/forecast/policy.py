"""Deterministic target policy. These transforms use current/past values only."""

VERSION = "forecast-0.4.0"
MARKETS = {"SPX", "GLD", "IEF"}
FACTORS = {"growth", "inflation", "rates", "credit", "liquidity", "volatility"}
GROWTH = {"CPIAUCSL", "CPILFESL", "PCEPI", "PAYEMS", "ICSA", "INDPRO", "RSAFS", "GDPC1", "M2SL", "WALCL"}
LEVELS = {"FEDFUNDS", "DGS2", "DGS10", "T10Y2Y", "UNRATE", "BAA10Y", "VIXCLS", "DTWEXBGS"}
SUPPORTED = MARKETS | FACTORS | GROWTH | LEVELS

def policy(series):
    if series not in SUPPORTED:
        raise ValueError("Unsupported forecast series")
    quarterly = series == "GDPC1"
    return {"series": series, "transform": "return" if series in MARKETS else "yoy" if series in GROWTH else "level",
            "target": "Monthly price return" if series in MARKETS else "Year-over-year growth" if series in GROWTH else "Factor level" if series in FACTORS else "Level",
            "frequency": "Quarterly" if quarterly else "Monthly", "period_months": 3 if quarterly else 1,
            "baseline": "Historical mean" if series in MARKETS else "Persistence", "unit": "%" if series in MARKETS | GROWTH else "Original units",
            "minimum_train": 40 if quarterly else 60, "maximum_history": 160 if quarterly else 360}

def prepare(data, spec):
    import numpy as np
    import pandas as pd
    meta = policy(spec["series"])
    points = data.get("points", [])
    frame = pd.Series({p["date"]: p["value"] for p in points}, dtype=float).sort_index()
    frame.index = pd.to_datetime(frame.index)
    frame = frame.loc[:pd.Timestamp(data["as_of"])].replace([np.inf, -np.inf], np.nan)
    if not frame.empty:
        # Reindex first: never bridge missing periods when calculating returns or growth.
        freq = pd.offsets.MonthEnd(meta["period_months"])
        frame = frame.reindex(pd.date_range(frame.index.min(), frame.index.max(), freq=freq))
    if meta["transform"] in {"return", "yoy"}:
        if meta["transform"]=="return":
            frame=frame.where(frame>0)
        lag = 1 if meta["transform"] == "return" else 12 // meta["period_months"]
        previous = frame.shift(lag)
        frame = ((frame / previous.where(previous > 0)) - 1) * 100
    # Use a contiguous trailing sample; never backfill or compress calendar gaps.
    missing = np.flatnonzero(frame.isna().to_numpy())
    if len(missing):
        frame = frame.iloc[missing[-1] + 1:]
    if spec.get("training_start"):
        frame = frame.loc[spec["training_start"]:]
    return meta, frame.iloc[-meta["maximum_history"]:]

def validate(spec):
    if not isinstance(spec, dict) or set(spec) - {"series", "horizon", "confidence", "training_start"}:
        raise ValueError("Invalid forecast specification")
    meta = policy(spec.get("series"))
    if type(spec.get("horizon")) is not int or spec["horizon"] not in {1, 3, 6, 12} or spec["horizon"] % meta["period_months"]:
        raise ValueError("Invalid forecast horizon for series frequency")
    if spec.get("confidence", 95) not in {80, 95}:
        raise ValueError("Invalid forecast confidence")
    if spec.get("training_start"):
        from datetime import date
        date.fromisoformat(spec["training_start"])
    return {"series": spec["series"], "horizon": spec["horizon"], "confidence": spec.get("confidence", 95), "training_start": spec.get("training_start", "")}
