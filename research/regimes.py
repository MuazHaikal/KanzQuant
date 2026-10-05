"""Reproducible four-state regime classification."""
from __future__ import annotations
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA


def fit_regimes(states: pd.DataFrame, clusters: int = 4, random_state: int = 42):
    clean = states.dropna()
    components = min(5, clean.shape[1], len(clean) - 1)
    embedded = PCA(n_components=components, random_state=random_state).fit_transform(clean)
    model = KMeans(n_clusters=clusters, random_state=random_state, n_init=20).fit(embedded)
    distances = model.transform(embedded)
    confidence = 1 - distances.min(axis=1) / np.maximum(distances.max(axis=1), 1e-9)
    assignments = pd.DataFrame({"regime_id": model.labels_, "confidence": confidence}, index=clean.index)
    centroids = clean.assign(regime_id=model.labels_).groupby("regime_id").mean()
    return assignments, centroids, model


def semantic_labels(centroids: pd.DataFrame) -> dict[int, str]:
    """Assign readable labels from relative centroid characteristics."""
    growth = centroids.get("growth", pd.Series(0.0, index=centroids.index))
    inflation = centroids.get("inflation", pd.Series(0.0, index=centroids.index))
    stress = centroids.get("stress", pd.Series(0.0, index=centroids.index))
    remaining = set(centroids.index)
    stress_id = stress.loc[list(remaining)].idxmax()
    remaining.remove(stress_id)
    inflation_id = inflation.loc[list(remaining)].idxmax()
    remaining.remove(inflation_id)
    expansion_id = growth.loc[list(remaining)].idxmax()
    remaining.remove(expansion_id)
    labels = {int(stress_id): "Stress", int(inflation_id): "Inflation", int(expansion_id): "Expansion"}
    for idx in remaining:
        labels[int(idx)] = "Disinflation"
    return labels
