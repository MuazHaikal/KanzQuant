# Phase 4 — Advanced Research

Completed locally on 17 October 2026. No commit, push or deployment.

## Scope and preservation

Refined Forecastability, Factor Focus and Historical Analogue only. Preserved the existing graphite/blue shell, 52px topbar, sidebar, gutters, fonts and Phases 1–3 page compositions. The workspace already contained uncommitted canonical and prior-phase work; that work was not reset or overwritten.

No forecast algorithms, AR/ARIMA parameters, expanding-window validation, ADF/KPSS, ACF/PACF, factor construction, regime model, feature normalization, analogue cosine formula, non-overlap rules, price adjustments or forward-return calculations changed. No correctness bug requiring a methodology change was found.

The frontend-design skill guided composition within the existing design system. The React review checklist covered component structure, stable hooks, accessible controls, null handling and avoiding new requests/dependencies. No new provider calls were introduced.

## Baseline and references

Before editing source, ran a local production build and captured all three representative pages at 1920×1080 and 1440×900. Treasury validation uses the saved DGS10 6M run `068402f1-9cec-4859-a9f0-168a180a6067`; Growth is the representative factor; `2025-09-30` is the actual SPX analogue episode. Also inspected the default saved GDP validation and an additional saved SPX run.

Read README and VISUAL-SPEC in each of the three canonical reference directories. Opened each full-page PNG, then all numbered crops using labelled reference atlases. Mock values, model choices, intervals and events were not copied as application data.

## Forecastability

### Validation composition

Historical Validation is the dominant left analytical surface, with a 380px plot at the larger desktop and 340px at the smaller desktop. Its contained summary identifies the real series/target, out-of-sample evaluation period, origin count, horizon and RMSE metric.

The main plot now includes the saved naive predictions alongside actuals and the inspected candidate's historical forecasts. These are separate expanding-origin forecasts, not one prediction issued at the beginning of the entire evaluation period. The training/evaluation strip and Model Setup explicitly describe training through each forecast's own origin. No future observations were added to a model's training set.

The current forward forecast is collapsed by default below the coordinated diagnostic strip. Its existing origin marker and model-generated uncertainty fan remain available on expansion. Historical validation is now visibly more prominent than the future path.

### Model Setup and verdict

The right rail contains compact Model Setup, Forecastability Verdict and Model Comparison. Existing editable series, horizons, training start and 80%/95% interval controls remain available. A stored run remains immutable, with its existing New Experiment destination. Target transformation and expanding-origin policy remain fixed by the validated engine; no unsupported transformation or validation-mode selector was invented.

The verdict retains the engine's exact conclusion and exposes naive RMSE, lowest-tested-model RMSE and stored relative error delta. Where the model has excluded failed origins, its stored matched-origin baseline is used rather than silently comparing against a different full naive sample. The table includes each model's actual valid N and explains paired-origin deltas. Lowest-tested highlighting is based on the existing out-of-sample selection, not in-sample fit.

Tiny deltas use significant digits so the real SPX improvement is not rounded to misleading negative zero. The saved SPX example reports approximately `-0.045%`, not a robust predictive claim. The verdict explicitly states that observed error differences are descriptive, not statistical significance. No significance test or threshold was invented.

### Diagnostics and coverage

The lower analytical strip retains the existing six-origin rolling MAE, stationarity/residual interpretation and observed prediction-interval coverage. At 1440 the coverage panel wraps below the other two diagnostics, preserving the main plot size. Model Details still exposes stored series ACF/PACF, fitted residual history/ACF, Ljung–Box output, exact calibration, failed origins, coefficients and reproducibility data.

Naive intervals remain `Not estimated` when absent. Only actual saved model intervals and measured coverage are shown. No fake coverage, residual histogram, extra model, MAPE/RMSE rolling tab, log-scale option or arbitrary date-range control was introduced to imitate the reference.

## Factor Focus

- Kept the historical factor series dominant, with a 360px chart, existing range controls and date inspection.
- Added an opt-in current-value label anchored to the actual latest factor point. It appears only while that point is in the displayed domain; other ResearchChart consumers retain their previous default output.
- Compact summary separates current level, 1M/3M/12M changes, historical state/percentile and trend. Composite values and contributions are labelled axis units, without claiming re-standardization.
- Added contained navigation among the existing six factor destinations. No new factors were created.
- Contribution bars preserve the exact existing arithmetic values. Blue/right and muted mauve/left denote raising/lowering, not economically good/bad. The panel retains the total 3M change and source-value disclosure.
- The historical episode table preserves level/change matching, 9M spacing, exclusion of the recent 12M and actual SPX outcomes. It now makes the selected episode count explicit.
- The distribution retains its actual history, current marker, percentile, median, P10/P90 and N. Related Factors adds existing historical percentiles; sparklines use neutral blue rather than encoding a negative macro level as bad.
- No time-varying percentile bands, correlations or causal attribution were invented. The chart's existing zero/±1/±2/median guides are retained as axis-unit guides, not relabelled percentile envelopes.

Visually inspected all six real factors: Growth, Inflation, Rates, Credit, Liquidity and Volatility. This includes negative levels, P100 rates, low-percentile credit/volatility, different scales and sparse one/two-component drivers. Null/empty history handling remains fail-closed and is covered by existing tests. Final factor screenshots use the existing 3Y button; BEFORE and iteration screenshots show full history. Default range logic and session persistence were not changed.

## Historical Analogue

- Maintained a roughly 75/25 chart/research-rail layout at workstation width. Comparison canvas remains 380px at 1920 and 350px at 1440; supporting tables wrap rather than force a shallow plot.
- Kept existing Candles/Compare, asset, range and interval controls, price adjustment rules, anchor alignment and state persistence.
- Comparison explicitly states `100 at each anchor · raw price closes`. No raw-level comparison across eras, invented current future path or new normalization option was introduced.
- Added compact navigation to the real existing nearest analogue dates. Tested switching to `2024-11-30` with the selected SPX/view query preserved.
- Similarity remains the unchanged cosine alignment score, explicitly `Not a probability or forecast`.
- The rail now surfaces the largest absolute signed terms from the existing feature decomposition, in percentage points. The complete feature input/difference/term table remains below; signed terms still sum to the displayed cosine score. No new per-feature probability or similarity formula was invented.
- Historical/current macro states are aligned compactly. Composite factor levels retain their exact current/historical differences.
- Forward outcomes remain actual 1M/3M/6M/12M price returns from the selected episode for SPX, GLD and IEF, labelled observed historical outcomes, not expected returns.
- Empirical nearest-episode outcome distribution retains median, P10/P90, selected-episode marker and N. The current `n=10` explicitly carries a small-descriptive-sample warning; no confidence interval or significance claim is fabricated.
- Renamed the existing timeline `Observed State Timeline`. Its content is persisted monthly regime history at the anchor and +1/+3/+6/+12M, not inferred news events. No economic event dataset was invented.
- Related Evidence remains a separate link to stored formal research, not a claim that an analogue is a statistically significant study.

## Screenshot refinement loop

Iteration 1 was captured at both sizes and compared to the reference images. The final refinement:

1. Added the factor current-value label and explicit contribution axis units.
2. Added per-model valid validation N and matched-baseline explanation.
3. Made the analogue state summary two-column, removed a duplicate Back to Analogues action, and removed excess grid-row space above the lower evidence panels.
4. Retained small non-zero validation deltas consistently in verdict and comparison table.

No page-level horizontal overflow was observed at either requested width. Chrome reports 1440×901 because of device/zoom rounding; exported files are exactly 1440×900. Captures use the repository viewport exporter to remove Chrome's repeated overscan surfaces and normalize the actual viewport, without changing application content. Raw captures are retained.

### Main screenshot archive

| Page / size | Before | Iteration 1 | After |
|---|---|---|---|
| Forecastability 1920 | [Before](before/forecastability-1920.png) | [Iteration](iteration-1/forecastability-1920.png) | [After](after/forecastability-1920.png) |
| Forecastability 1440 | [Before](before/forecastability-1440.png) | [Iteration](iteration-1/forecastability-1440.png) | [After](after/forecastability-1440.png) |
| Factor Focus 1920 | [Before](before/factor-focus-1920.png) | [Iteration](iteration-1/factor-focus-1920.png) | [After](after/factor-focus-1920.png) |
| Factor Focus 1440 | [Before](before/factor-focus-1440.png) | [Iteration](iteration-1/factor-focus-1440.png) | [After](after/factor-focus-1440.png) |
| Historical Analogue 1920 | [Before](before/historical-analogue-1920.png) | [Iteration](iteration-1/historical-analogue-1920.png) | [After](after/historical-analogue-1920.png) |
| Historical Analogue 1440 | [Before](before/historical-analogue-1440.png) | [Iteration](iteration-1/historical-analogue-1440.png) | [After](after/historical-analogue-1440.png) |

Additional final captures: [Inflation](after/factor-inflation-1920.png), [Rates](after/factor-rates-1920.png), [Credit](after/factor-credit-1920.png), [Liquidity](after/factor-liquidity-1920.png), [Volatility](after/factor-volatility-1920.png), [SPX validation](after/forecast-spx-1440.png).

At the smaller desktop, Related Factors, the lower analogue distributions and some diagnostics continue below the fold intentionally. Exact component tables use contained scrolling. Sparse contribution panels retain open space instead of inventing inputs to fill the reference's larger driver list.

## Interaction QA

Production browser checks: editable forecast series, horizon, training start and interval confidence; saved result model selection; Model Details expansion; keyboard validation-date inspection; factor navigation, 3Y range and midpoint inspection; level/change episode deep links; analogue date navigation, Candles/Compare and monthly interval selection. Fixed transformation, validation scheme and anchor-100 normalization have no invented selectors to test. Fresh final production console checks returned no errors.

Existing executable tests additionally cover pointer pan, wheel/trackpad/pinch-equivalent zoom, reset, chart cleanup, interval aggregation, comparison alignment and saved persistence. No claim is made that every pointer gesture was separately repeated through browser automation.

## Test results

All passed; no tests weakened.

| Check | Result |
|---|---|
| `npm run lint` | Passed after final changes |
| `npm run typecheck` | Passed after final changes |
| `npm run build` | Passed; final production build launched locally on 3001 |
| `node scripts/run_python.mjs -m pytest -q` | 99 passed in 27.94s; one existing Starlette/httpx deprecation warning |
| `npm run test:forecast` | Passed for DGS10 6M, SPX 6M, inflation 3M and GDP 6M; 3 models each; scoped execution authorization, origin boundaries, saved reload, idempotent execution, invalid settings and insufficient history |
| `npm run test:forecast-ui` | Passed, including final-format checks alongside Phase 4 tests |
| `npm run test:market` | Passed: all six intervals, actual canvas interactions, 941 real buffered rows per SPX/GLD/IEF, database-only fail-closed and API validation |
| `npm run test:context` | Passed: six real factor contributions/ranks, missing history, no future leakage, Overview and deep links |
| `npm run test:focus` | Passed; repeated after chart annotation change, all six factors and market/regime/outcome/analogue routes plus 404s |
| `npm run test:guided` | Passed; repeated after annotation change, real routes/API, comparisons, URL state, release availability and saved views |
| `npm run test:visual` | Passed; repeated after optional shared props |
| `npm run test:phase-one` | Passed |
| `node scripts/test_phase_two.mjs` | Passed |
| `node scripts/test_phase_three.mjs` | Passed |
| `node scripts/test_phase_four.mjs` | Passed: matched-origin benchmark display, tiny/null/nonfinite metrics, stored N, opt-in annotation, unchanged shared defaults, explicit contribution units, descriptive similarity and low-sample warnings |
| `npm run test:equity-indicators` | 13/13 passed |
| `git diff --check` | Passed |

The existing forecast integration test intentionally persisted four completed QA runs and one insufficient-history result using its normal saved-experiment workflow. No unrelated records were modified or deleted. Existing saved runs were used for stable screenshots.

## Files changed in this phase

- `src/app/phase-four.css` — new scoped Advanced Research styling.
- `src/app/layout.tsx` — stylesheet import only in this phase.
- `src/components/forecast-workspace.tsx` — validation summary, naive layer, verdict/table presentation, collapsed future forecast.
- `src/components/forecast-validation-summary.tsx` — stateless rendering of stored validation metrics.
- `src/app/focus/factor/[factor]/page.tsx` — summary/navigation/units/current label and existing percentile display.
- `src/app/focus/analogue/[date]/page.tsx` — real episode navigation, existing signed terms, compact state summary and explicit small-sample/timeline labels.
- `src/components/research-chart.tsx` — optional current label, default off; no domain/math/interaction changes.
- `src/components/visual-research.tsx` — optional contribution unit label, existing default preserved.
- `scripts/test_phase_four.mjs` — targeted regression checks.
- `docs/design-review/phases/phase-4/` — report and visual evidence.

## Status

Phase 4 complete locally. Branch/HEAD remains `main` / `ffb5e4d`. No commit, push or deployment. Production preview remains at `http://localhost:3001`.
