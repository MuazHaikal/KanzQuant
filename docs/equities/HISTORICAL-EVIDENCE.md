# Historical setup evidence

Same-stock nearest neighbours; no cross-stock or fundamental similarity in Phase 1.

Vector: 20D return z-score, 63D return, distance from SMA50, distance from SMA200, vol20 trailing percentile, current drawdown. Each feature is constructed from observations available through that date.

At the current target, eligible candidates must be at least 252 trading sessions earlier. Standardize dimensions using the sample SD of eligible candidates (pre-target data only). Constant/unavailable dimensions are omitted; at least four usable dimensions and 60 candidates are required. Distance is the square root of mean squared standardized differences. Lower is closer; no probability or calibrated confidence is implied.

Greedily select the closest dates, requiring 252 trading sessions between every selected pair; maximum 12. One-year forward-return intervals therefore do not overlap (they can share a boundary price). All outcomes end on or before the current target. This deliberately sacrifices sample size to avoid adjacent dates dominating evidence.

Outcomes use adjusted-price returns over 21, 63, 126 and 252 trading sessions. Report N, empirical distribution, median, mean, positive-return frequency, P10/P25/P75/P90. N<5: no summary statistics displayed. N<20: explicit SMALL SAMPLE. No bootstrap significance, forecast or expected return is claimed. Ten-year histories typically yield only 5–9 independent selected episodes.

Macro context separately reuses existing persisted full-history regime labels. Match each month end to the last stock/SPX trading observation on or before it; compute 63-session forward outcomes and require 63-session spacing within each state. Same sample rules. Full-history clustering and revised FRED inputs preclude walk-forward, causal or vintage-data claims.
