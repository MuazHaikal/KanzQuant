"""Past-only ranks, calendar changes and outcome-independent temporal sampling."""
import numpy as np

MIN_PRIOR = 36

def month(date):
    return int(date[:4]) * 12 + int(date[5:7]) - 1

def metric(rows, condition):
    source, transform = condition["source"], condition["metric"]
    by_month = {month(r["date"]): r["values"].get(source) for r in rows}
    values = []
    for r in rows:
        value = r["values"].get(source)
        if transform != "level" and value is not None:
            prior = by_month.get(month(r["date"]) - int(transform))
            value = None if prior is None else value - prior
        values.append(np.nan if value is None else value)
    return np.asarray(values, float)

def past_ranks(values):
    # Mid-CDF matches the existing signed movement rank, strictly excluding date t.
    output = np.full(len(values), np.nan)
    for i, value in enumerate(values):
        prior = values[:i][np.isfinite(values[:i])]
        if np.isfinite(value) and len(prior) >= MIN_PRIOR:
            output[i] = (np.sum(prior < value) + .5 * np.sum(prior == value)) / len(prior) * 100
    return output

def condition_mask(rows, condition):
    values = metric(rows, condition)
    op, threshold = condition["op"], condition["threshold"]
    ranked = past_ranks(values) if op in ("below", "above", "state") else values
    valid = np.isfinite(ranked)
    if op == "below": mask = ranked <= threshold
    elif op == "above": mask = ranked >= threshold
    elif op == "lt": mask = values < threshold
    elif op == "gt": mask = values > threshold
    elif op == "rising": mask = values > 0
    elif op == "falling": mask = values < 0
    else:
        bounds = {"Very low": (0, 10), "Below usual": (10, 25), "In range": (25, 75), "Above usual": (75, 90), "Very high": (90, 100)}
        lo, hi = bounds[threshold]
        mask = (ranked >= lo if lo == 0 else ranked > lo) & (ranked <= hi)
    return valid & mask, valid, values, ranked

def select(rows, conditions, spacing, horizon, mode="conditional"):
    masks = [condition_mask(rows, c) for c in conditions]
    valid = np.logical_and.reduce([m[1] for m in masks])
    event = np.logical_and.reduce([m[0] for m in masks])
    if mode == "relationship":
        valid = np.isfinite(metric(rows, conditions[0]))
        event = valid.copy()
    # Fix calendar thinning using conditions only, BEFORE observing future outcomes.
    distance = max(spacing, horizon)
    chosen = np.zeros(len(rows), bool)
    previous = -10**9
    for i, row in enumerate(rows):
        if valid[i] and month(row["date"]) - previous >= distance:
            chosen[i] = True
            previous = month(row["date"])
    return chosen, event, valid, masks
