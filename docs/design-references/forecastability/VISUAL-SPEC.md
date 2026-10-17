# Forecastability Visual Spec

## Core composition

- Main historical validation/forecast chart occupies the dominant left area.
- Model Setup and Forecastability Verdict form a compact right rail.
- Model comparison and diagnostics occupy a dense lower analytics row.
- Metadata, dates, model names, horizons, legends, and metrics stay inside their panels.

## Statistical hierarchy

The interface should lead with a concise conclusion, then expose the evidence supporting it.

Preferred verdict states:
- **Baseline beaten** / statistically credible improvement.
- **No robust improvement** when the best model does not reliably beat the baseline.
- **Insufficient evidence** when sample/origin count is too low.

A verdict should surface, where available:
- number of out-of-sample forecast origins
- validation horizon
- baseline metric
- best-model metric
- percentage improvement
- statistical comparison or confidence interval when the methodology supports it

Do not call a series forecastable merely because an in-sample model fits well.

## Main validation chart

- Historical actual series remains visually dominant.
- Forecast origin is clearly marked.
- Naive and candidate model forecasts use distinct restrained line styles.
- Prediction intervals are translucent and secondary to the mean forecast.
- Forecast horizon and validation method remain visible in-panel.

## Model comparison

- Table should be compact and numerically aligned.
- Highlight the best out-of-sample model, not the best in-sample fit.
- Keep the naive/random-walk benchmark visible.
- Metrics may include RMSE, MAE, MAPE and Theil's U where appropriate.

## Diagnostics

Use compact panels for:
- residual series
- residual histogram
- ACF
- PACF
- rolling forecast error
- prediction interval coverage

Avoid raw JSON or large blocks of methodology text in the primary view.

## Colors

- Blue: interface / secondary model
- Teal/green: best-performing model or positive validation evidence
- Red: naive/underperforming model or negative evidence where appropriate
- Gray/white: actual series / neutral benchmark

## Interaction

- Model chips are removable and compact.
- Time-range and scale controls remain inside the validation panel.
- Model Setup edits inputs; Verdict summarizes the current validated result.
- Diagnostics should not push the main chart below the fold unnecessarily.
