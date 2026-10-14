# v0.4: time-series research / forecastability

Local review only. No infrastructure changes, migration, new provider, ingestion, push or deployment is required. New experiments use the existing `research_runs` and `research_results` tables under module `forecast.lab`. Existing macro, similarity, market-state and hypothesis methodology is unchanged.

## Targets and benchmarks

| Existing data | Model target | Benchmark | Frequency |
| --- | --- | --- | --- |
| S&P 500, Gold, Treasury ETF | 100 × (month-end adjusted price / previous month-end adjusted price − 1) | Expanding historical mean of returns | Monthly |
| CPI, core CPI, PCE, payrolls, claims, industrial production, retail sales, money supply, Fed assets | Existing year-over-year percentage growth definition | Last available target / persistence | Monthly |
| Real GDP | Year-over-year growth across four quarterly observations | Persistence | Quarterly |
| Policy rate, Treasury yields, yield curve, unemployment, BAA spread, VIX, dollar index | Level in original units | Persistence | Monthly |
| Growth, Inflation, Rates, Credit, Liquidity, Volatility factors | Existing semantic factor level derived from expanding-normalized persisted vectors | Persistence | Monthly |

Only available persisted series from the supported catalogue are offered. Market price semantics reuse `adjusted_close`; these are price returns, without a total-return/dividend claim. A 6-month-ahead market forecast predicts the **monthly return in the sixth future month**, not a cumulative six-month return. Source-history previews before analysis are labeled separately from the transformed target.

Raw observations are mapped to month-end availability with the existing simplified release lags: daily/weekly zero months, monthly one month, quarterly three months. The forecast target is evaluated on this availability calendar. GDP stays quarterly rather than fabricating monthly observations. For annual growth, lagged values must exist at the appropriate calendar distance. There is no backward fill, interpolation or compression of missing calendar periods. A gap truncates the older portion of the final contiguous sample. No partial current market month is used. All source data are capped at the research snapshot/date context.

## Specification, fit and selection

The fixed model set is Naive, AR(1), and ARIMA. Estimation uses statsmodels 0.14.6. AR(1) uses `AutoReg` with a constant. ARIMA uses conditional model forecasts with enforced stationary AR and invertible MA parameters. Integrated candidates have no drift; non-integrated candidates have a constant.

ARIMA candidates are `(0,0,0), (1,0,0), (0,0,1), (1,0,1), (0,1,0), (1,1,0), (0,1,1)`. Return targets exclude integrated candidates. Lowest BIC on the **initial training window only** determines a fixed order; ties follow lexicographic order. That order is refit at each later origin and on current data. There is no search of the holdout for the preferred order, threshold or horizon. Candidate failures are retained. If a selected order later fails, that origin is unavailable; another order is not substituted.

Every statistical fit scales the training target using that window's own mean and population standard deviation. Output returns to target units. Saved coefficients/AIC/BIC are on this scaled training target; the exact center and scale are retained. Return transformations and existing expanding factor values use only values at or before each date. Whole-series diagnostics shown under Model Details are descriptive and do not drive selection.

Convergence flags, finite estimates/intervals, constant targets and numerical instability are checked. AR coefficients with magnitude ≥1.02 and central forecasts exceeding 100 training-standard-deviation units are rejected as guards against explosive numerical results. The engine records failures; it does not silently fall back. Insufficient history and constant targets produce explicit saved research outcomes.

## Validation and error comparison

- Expanding training windows; never random splits.
- Minimum initial training: 60 monthly or 40 quarterly targets.
- At least six evaluated origins; at most 24, chosen from the most recent available horizon-spaced origins.
- Maximum model history: 360 monthly or 160 quarterly targets.
- Each forecast recursively predicts `h` periods from one origin without consuming the intervening realized observations. Origins are separated by `h` periods. Quarterly horizons 3/6/12 months map to 1/2/4 quarterly steps; 1 month is disabled.
- The scored observation is the actual target `h` periods ahead. Exact origin, training start/count, target date, forecast, realized value, interval and order are persisted.
- MAE and RMSE use out-of-sample errors only. Model percentage changes compare the model with baseline predictions at **identical target dates**. Partial-model counts are visible; primary lowest statistical RMSE ranking requires complete coverage of the planned schedule. Absolute bars for partial models have different samples, disclosed by N/status and pairwise-baseline labels.
- Both errors lower: OUTPERFORMED BASELINE. Neither lower: DID NOT OUTPERFORM BASELINE. One lower: MIXED RESULTS. Fewer than six matched observations or zero benchmark error: INSUFFICIENT EVIDENCE. These are descriptive comparisons without a significance claim. Small differences may be noise; no forecastability score/probability is manufactured.
- Stability plot: trailing MAE over up to six forecast origins. This is six **origins**, not necessarily six calendar months.

## Uncertainty and diagnostics

Historical out-of-sample predictions and the current forward path appear in separate sections. AR/ARIMA intervals use statsmodels multi-step prediction-error variance and normal quantiles at 80% or 95%. The interval is conditional on the estimated model, omits parameter/model-selection uncertainty, and is not guaranteed. Naive forecasts are points without an estimated interval. Empirical held-out interval coverage is reported, including poor coverage.

Advanced: ADF (unit-root null, training-independent descriptive BIC lag choice up to 8), KPSS (level-stationarity null with bounded lookup p-values), ACF/PACF, residual history/ACF, and Ljung–Box up to lag 12 with AR/MA model degrees of freedom. The ACF/PACF bands are approximate ±1.96/√N zero-correlation reference bands. No diagnostic implies that a model is valid or stationary with a stated probability. Residual diagnostics refer to the current full-sample fit and are labeled accordingly.

Statsmodels references: [ARIMA](https://www.statsmodels.org/stable/generated/statsmodels.tsa.arima.model.ARIMA.html), [AutoReg](https://www.statsmodels.org/stable/generated/statsmodels.tsa.ar_model.AutoReg.html), [time-series diagnostics](https://www.statsmodels.org/stable/tsa.html).

## Execution and reproducibility

Series preparation, model fit, origin evaluation, diagnostics, persistence and presentation are separate layers. The existing FastAPI service, bounded compute worker, connection pool and execution slot are reused. Hypothesis and forecast capabilities have separate signature domains; a forecast capability cannot execute a hypothesis. One compute runs at a time. Execution has a 60-second worker limit; SQL and connection waits are bounded. Immutable frozen inputs and hash, exact specification, as-of date, software versions, origins, candidate BIC/failures, metrics, diagnostics and forecast paths are stored. Saved pages read the completed payload without refitting. Reloading a queued/failed run allows an explicit same-ID resume/retry.

## Limits

FRED uses current-vintage revised data plus simplified lags, **not ALFRED real-time vintages**. The point-in-time guarantee applies to the stored dataset under those semantics; it cannot remove historical revision bias. There is no seasonality search, exogenous/multivariate model, GARCH, HMM, ML, causal inference, strategy backtest or trading recommendation. Full-history market-state labels are not forecast inputs. Short OOS schedules, overlapping annual-growth targets, structural breaks, selection of the lowest tested statistical RMSE and conditional intervals limit generalization. Horizon-spaced origins avoid sharing forecast-horizon observations, but do not make annual-growth observations independent.

## Measured local checks

Real Neon experiments (all 24 origins / 72 historical fits):

| Target / horizon | Compute | Persistence | Result |
| --- | ---: | ---: | --- |
| 10-year yield / 6M | 1.82s | 1.89s | AR(1) RMSE +1.16%; ARIMA partial, no headline superiority |
| S&P monthly return / 6M | 2.58s | 1.51s | AR(1) RMSE −0.045%; tiny descriptive improvement |
| Inflation factor / 3M | 1.77s | 2.01s | ARIMA RMSE −8.76%, MAE approximately −9.8% |
| Real GDP annual growth / 6M | 1.46s | 1.71s | AR(1) RMSE −13.08% |

Warm service execution was 4.45–6.56s before the final persistence transaction. Cold worker startup was slower (first service execution 22.1s). The integration workflow, including multiple reopen/idempotency checks and page rendering, took 19.9–27.7s warm and 54.9s cold. Network/database round trips dominate; model compute is seconds. At most seven candidate fits, 72 historical fits and three current fits are attempted per run.

Saved examples: successful `2c7e43fd-8ca6-46a7-bc8c-383a6a02838f`; baseline better `7f0b6667-57b3-4f57-858a-7596048e36d8`; insufficient history `ab3d9659-0882-4820-8cd1-9766fe2c1e71`.

Production-build timing, measured from prepare request until the saved result was first loaded: DGS10 13.95s, S&P 500 10.79s, Inflation factor 10.38s, GDP 9.91s. Warm compute was 0.74–1.38s and final persistence 1.43–1.75s. These measurements exclude the integration script's subsequent reopen/idempotency assertions. They include real Neon network traffic. The application remains local.
