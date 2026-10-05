"""Isolated deterministic fixture used only by explicit --demo runs."""
from __future__ import annotations

from datetime import datetime, timezone

import numpy as np
import pandas as pd

from research.features import expanding_zscore
from research.regimes import fit_regimes, semantic_labels
from research.similarity import cosine_scores, select_spaced_neighbours


def build_demo_snapshot(periods: int = 240, seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2005-01-31", periods=periods, freq="ME")
    states = pd.DataFrame(rng.normal(size=(periods, 4)), index=dates, columns=["growth", "inflation", "rates", "stress"]).apply(expanding_zscore).dropna()
    assignments, centroids, _ = fit_regimes(states)
    labels = semantic_labels(centroids)
    neighbours = select_spaced_neighbours(cosine_scores(states, target_exclusion_months=12), 10, 9)
    return {
        "as_of": states.index[-1].date().isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "current_regime": labels[int(assignments.iloc[-1]["regime_id"])],
        "confidence": round(float(assignments.iloc[-1]["confidence"]), 6),
        "features": list(states.columns),
        "neighbours": [{"date": date.date().isoformat(), "similarity": round(float(score), 6)} for date, score in neighbours.items()],
        "data_mode": "demo",
    }
