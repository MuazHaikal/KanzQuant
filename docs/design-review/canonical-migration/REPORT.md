# Canonical product + UI migration — local acceptance report

Review date: 2026-10-17. Repository: KanzQuant. Branch: `main`.
Scope: existing application migration, not a new application or quantitative engine.

## Status

Implemented and verified locally against the existing Neon stores. The optimized production build is running at http://localhost:3001. No commit, push or deployment was performed. No production secrets, database schema, ingestion pipeline, statistical engine, or validated research formulas were changed. Existing saved research and unrelated user edits were preserved.

## Reference packs

All twelve required folders exist under `docs/design-references/`: global-shell, evidence-library, study-focus, stock-research, equities-discovery, equity-screener, chart-explorer, overview, forecastability, factor-focus, historical-analogue and data-catalogue.

The full-page images, component micro-images and supplied README/specifications were opened and inspected in the requested page order. Component contact sheets were used to inspect the individual crops. The pack index is `CANONICAL-PACK-README.md`; the pre-existing reference-root README was retained.

Reference gap: stock-research includes its README and 36 micro-reference PNGs, but supplies **no full-page image and no VISUAL-SPEC.md**. Its supplied composition/component crops were used. No entire reference directory is missing.

## Navigation and global shell

Graphite shell, text-only KanzQuant wordmark, consistent Lucide line icons, blue interaction/selected states, compact expanded/collapsed sidebar, global search and keyboard skip link. Dates, sources, controls and statistical readouts are contained in their analytical panels. Existing chart/navigation preferences are preserved or versioned.

| Area | Canonical local route |
| --- | --- |
| Overview | `/` |
| Equities discovery | `/equities` |
| Equity Screener | `/equities/screener` |
| Stock Research | `/equities/[symbol]` — verified with `/equities/MU` |
| Chart Explorer | `/chart` |
| Evidence Library | `/evidence` |
| Study Focus | `/evidence/[id]` |
| Forecastability | `/research/forecast` and `/research/forecast/[id]` |
| Factor Focus | `/focus/factor/[factor]` |
| Historical Analogue | `/focus/analogue/[date]` |
| Historical analogue discovery | `/similarity` |
| Data Catalogue | `/data` |
| Help | `/guide` |

Existing analytical URLs were retained rather than destructively renamed. `/hypothesis` redirects to `/evidence`, preserving supported context; `/hypothesis/[id]` redirects to the exact Study Focus. Archive links now use the canonical evidence route. The mixed-module read-only `/experiments` archive and existing macro/regime/outcome pages remain available without a duplicate public test-builder navigation entry.

## Evidence Library

Reads completed studies directly from existing `research_runs`/`research_results`; no second research database. At final review it contained 120 completed saved studies, including existing verification studies. Original titles and repeated historical runs are preserved, not cosmetically fabricated or deleted. The current projection displays the latest 1,000 completed studies; family adjustment includes the complete named family, not just visible rows.

Public test-builder/run UI is no longer routed. Both preparation API aliases reject unsigned/invalid internal authorization with HTTP 403. Hiding buttons is not the security boundary: authorization is checked server-side, and the signed execution service remains protected.

Search and filters cover universe, theme, horizon, significance and minimum sample. Clickable headers expose sort direction. Default ordering is adjusted p ascending, then sample n descending, then the existing same-direction robustness agreement, with deterministic ties. Missing adjustments sort last. No invented numerical reliability score.

The table scrolls internally with sticky headers, keyboard focus, aligned tabular numerals and distinct significance/evidence fields. At 1440px the secondary context panels move below the full-width table so effect, sample, raw p and adjusted p remain visible together. At 1920px they form the secondary right rail. Keyboard Page Down was observed moving the table approximately 662px while its header remained sticky.

## Controlled study generation

`npm run evidence:run -- approved-definitions.json` uses the existing ignored local environment and signed-capability research service. See `docs/internal-evidence-workflow.md`.

Default reuse key: normalized parameters + frozen dataset hash + existing engine version. The existing advisory lock serializes preparation; matching queued/running/completed runs are reused. Failed saved runs can be retried by ID. `--refresh` explicitly creates an intentional fresh repeat. Timeouts and waits are bounded, and progress reports only saved IDs, not credentials.

The command was executed twice against the same existing approved verification definition. Both returned `cdb52ba1-5d23-4fd6-aad2-85f63a758e68`, confirming idempotent reuse without a duplicate family member.

## Study Focus and statistical integrity

Dedicated, deep-linkable page, not an overlay. The conclusion leads, followed by n, effect and units, stored 95% interval, adjusted/raw p, horizon, actual positive frequency where applicable and existing evidence category. Research settings, frozen cutoff, condition logic, baseline, robustness variants and included/excluded historical cases remain inspectable. Exact saved output is downloadable and methodology is collapsed but accessible.

Significance is the observed association/effect at the 5% threshold, not a probability that a trade will succeed. Named-family Benjamini–Hochberg adjustment is prioritized; raw p is shown separately. Missing named-family adjustment says unavailable, while an absent correction says not applied. Small/invalid required groups produce insufficient evidence and small samples are flagged. Non-finite values render unavailable, not NaN. Negative significant associations use neutral blue evidence styling, not a bullish green conclusion.

Existing STRONG/MODERATE/WEAK categories are explicitly disclosed as heuristic categories based on existing engine criteria, not calibrated probabilities and not substitutes for adjusted significance. Robustness, spacing, resampling, baselines, full-history descriptive regimes and simplified FRED availability lags were not changed.

Verified real Study Focus: `/evidence/69ced6c8-ac0f-4bff-b747-d62be8b81baa` — regression n=39, effect −8.82 pp/input unit, stored interval −15.81 to −0.57, raw p=0.0062, adjusted p=0.0187. These values are actual saved output, not reference placeholders. Missing IDs return HTTP 404.

## Equities

**Discovery:** Interesting Now is dominant, using existing deterministic research presets and real feature rankings. Context uses the latest shared-date cross-section: 518 stocks, actual advancing/declining counts, equal-weight sector returns, momentum distribution and drawdown/return scatter. This is descriptive cached research, not recommendations or a live breadth history.

**Screener:** Compact real-field filters, instantaneous application, presets, clear sorting, internal scrolling, sticky header/symbol column, aligned signed values and 50-row pagination. Optional full columns and dates remain available. Search MU and 3M-return sorting were exercised; existing range/preset/null tests pass.

**Stock Research:** Contained instrument header and freshness, dominant adjusted-OHLCV chart, Quant Snapshot/setup rail, Historical Evidence and Fundamental Trends side-by-side, with relative analysis/correlation and Macro Context retained below. Default SMA20, SMA50, Bollinger(20,2) and integrated volume use the existing trading-session calculations; SMA200 remains optional. Saved chart settings remain supported. Historical outcomes retain n, mean, median, positive frequency, IQR, P10/P90, distribution and exact cases. Unsupported baseline inference/p-values/CIs are explicitly not calculated rather than manufactured. Additional fundamental histories remain accessible in a disclosure.

Global search MU → Micron was exercised. The page displayed 2,513 research price observations, 69 reported quarters and eight spaced same-stock historical setups. Research snapshots and raw catalogue coverage can end on different dates; both dates are exposed rather than silently synchronized.

## Chart Explorer

Dominant contained OHLCV chart, secondary Quant Snapshot/macro/analogue rail and compact real historical-outcome analytics. Default market view is 3Y/daily with SMA20/SMA50/Bollinger/volume; explicit URL and saved view selections are preserved. Volume is integrated once, not duplicated in an external lane. Macro series do not receive fabricated market overlays. SMA200 enable/remove was exercised.

Existing multi-series, comparison/normalization, context/events, shared axis, date inspection, pan/zoom, saved views and historical outcomes remain. The lower row uses real analogue distributions instead of inventing unsupported mock rolling-Sharpe/correlation products.

## Overview

Dominant Market Overview chart and Historical Analogues right rail, followed by six compact factor states and four real analogue-outcome distributions. Important chart/context research is no longer pushed down by six oversized cards. Existing standouts and methodology disclosures remain. Composite-factor levels are not relabeled as raw PMI/CPI observations merely to imitate mock values.

## Forecastability

Historical out-of-sample validation leads; model settings/verdict/comparison form the rail; forecast fan and compact error/stationarity/interval-coverage diagnostics remain visible. The bare route opens the most recent result whose payload actually has valid COMPLETE validation, not merely a ledger row marked complete. Insufficient-history results remain readable with an explicit setup link.

Initial model selection uses the saved lowest-tested-model RMSE. The overall historical verdict is labeled as the best-tested-model result and is separate from the currently inspected model. Existing expanding-origin fitting, naive baseline, metrics, intervals, diagnostics and conclusions are unchanged. Lower RMSE is not relabeled as a significance test or robust trading edge.

The saved GDP validation used in captures has 24 origins: naive RMSE 4.119, AR(1) 3.580 and ARIMA 4.753. The selected default is AR(1); interval coverage and remaining residual autocorrelation remain visible.

## Factor Focus

Dominant history chart with exact existing arithmetic input contributions to the right. Current composite level, 1M/3M/12M change, state and trend are separate concepts. Historical episodes, current-level distribution and related factors form the lower row. Raw sources and all-asset market responses remain accessible. Exact contribution identities, episode spacing and recent exclusion pass existing real-data tests.

## Historical Analogue

Large anchor-normalized comparison, similarity/context/outcome rail, and lower input-difference table, empirical historical distribution and observed macro-state timeline. Cosine alignment is labeled not a probability/forecast; no current future path is fabricated. Additive similarity terms are not falsely converted to per-feature probabilities or causal drivers. Timeline offsets now use exact month ends, preventing a prior-month state from appearing at +1M/+3M because of day-30 anchoring.

## Data Catalogue

Read-only unified projection of 1,054 existing datasets: 521 market, 18 FRED macro, 509 company fundamental datasets and six derived factor histories. Human names lead; provider IDs/storage details are collapsed. Actual coverage, counts, latest dates, ingestion/filing dates and units are distinct. Fundamental statements are correctly described as datasets, not fabricated scalar observations. Raw CPI indexes are not mislabeled YoY.

Search, provider/type/frequency filtering, sorting, selected-row state and a persistent desktop detail/preview rail work. Micron selection was exercised. At 1920px the table is approximately 770px high despite roughly 52,544px of row content. Technical details are collapsed initially. The projection uses the existing database and parallel independent queries; no ingestion, schema or data mutation was introduced.

## Visual QA and remaining differences

Final viewport images are in this directory. Each of these names has both `-1920.png` (1920×1080) and `-1440.png` (1440×900): overview, equities, stock-MU, evidence, study-focus, screener, chart, forecast, factor, analogue and data. Earlier `before`, `check` and filtered captures are intermediate evidence, not final acceptance screenshots.

| Page | 1920×1080 | 1440×900 |
| --- | --- | --- |
| Overview | [View](overview-1920.png) | [View](overview-1440.png) |
| Discovery | [View](equities-1920.png) | [View](equities-1440.png) |
| Stock Research | [View](stock-MU-1920.png) | [View](stock-MU-1440.png) |
| Evidence Library | [View](evidence-1920.png) | [View](evidence-1440.png) |
| Study Focus | [View](study-focus-1920.png) | [View](study-focus-1440.png) |
| Screener | [View](screener-1920.png) | [View](screener-1440.png) |
| Chart Explorer | [View](chart-1920.png) | [View](chart-1440.png) |
| Forecastability | [View](forecast-1920.png) | [View](forecast-1440.png) |
| Factor Focus | [View](factor-1920.png) | [View](factor-1440.png) |
| Historical Analogue | [View](analogue-1920.png) | [View](analogue-1440.png) |
| Data Catalogue | [View](data-1920.png) | [View](data-1440.png) |

Captures were reviewed against the supplied compositions and micro references. Live DOM viewport checks confirmed 1920×1080 and approximately 1440×901; exported files normalize the latter to 1440×900. The browser exporter sometimes returned tiled overscan; the existing viewport export helper removes repeated overscan before saving the review PNGs. No chart data or UI state is invented during export.

Intentional differences from mockups: real instruments and dates replace illustrative content; unavailable analyst targets, AI insights, scalar reliability scores, stock inference and unsupported new analytics are omitted. Stock Research has no supplied full-page reference. Existing descriptive macro/factor engines and useful lower-page controls remain. At 1440px secondary panels may stack and wide screener/catalogue tables may scroll horizontally inside their panels; page-wide horizontal scrolling is avoided. Existing semantic up/down candles and some legacy chart legend/series colors are retained rather than altering research meaning solely for a pixel match.

The frontend-design skill guided the common composition and containment system; React review reinforced server-side authorization, independent parallel data reads, compact client projections, immutable filtering/sorting and accessible controls. No new component framework or duplicate data pipeline was introduced.

## Exact verification results

| Check | Result |
| --- | --- |
| Python `node scripts/run_python.mjs -m pytest -q` | 99 passed in 23.28s; one existing Starlette/httpx deprecation warning |
| `npm run lint` | Pass; no ESLint errors/warnings |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; optimized Next.js production build |
| `npm run test:visual` | Pass; statistical/visual components and SSR accessibility |
| `npm run test:equity-indicators` | 13 tests passed, zero failed/skipped |
| `npm run test:guided` | Pass; pure contracts and post-build live routes/API |
| `npm run test:focus` | Pass; all six factors, all outcome horizons, market/regime/analogue and invalid 404s |
| `npm run test:context` | Pass; real contributions, date/rank/no-lookahead checks and routes |
| `npm run test:market` | Pass; actual canvas interactions, real Neon assets and API validation |
| `npm run test:equities` | Pass; filters/presets/nulls, six real stocks, fundamentals/evidence/macro/routes |
| `npm run test:forecast-ui` | Pass, including post-build rerun |
| `npm run test:forecast` | Pass when run serially; four real validations plus insufficient history, auth and idempotent reload |
| `npm run test:hypothesis` | Pass; real persisted outcomes, methods/FDR, internal/public authorization, retry/idempotency and unchanged unrelated data |
| `npm run test:hypothesis-service` | Pass; signed capability rejection, failure sanitization, same-ID recovery and one persisted result |
| `npm run test:hypothesis-client` | Pass; existing retry/resume state machine |
| `npm run test:evidence` | Pass; sort/filter/missing/sample states, scrolling/keyboard contracts, real ledger/Study Focus/404/403; rerun against final build |
| `npm run test:catalogue` | Pass; filtering/sorting/no mutation, selection/keyboard contracts, real multi-source route and single chart-volume contract; rerun against final build |
| Controlled runner twice | Same study ID reused both times |
| `npm run db:verify` | Pass; ten core tables, seven named indexes, 82 constraints, pgcrypto; read/write probe rolled back |
| `git diff --check` | Pass; only Windows line-ending notices |

One forecast attempt received the existing execution service's HTTP 429 while hypothesis execution overlapped. This was capacity protection, not a methodology/data failure; the full forecast suite passed when rerun alone. Protections were not disabled. Tests created their normal verification research records; raw market/macro data and unrelated saved research were not destroyed.

## Files changed

Source routes: `src/app/{layout.tsx,page.tsx,data/page.tsx,equities/page.tsx,equities/[symbol]/page.tsx,evidence/page.tsx,evidence/[id]/page.tsx,evidence/error.tsx,hypothesis/page.tsx,hypothesis/[id]/page.tsx,hypothesis/error.tsx,research/forecast/page.tsx,focus/factor/[factor]/page.tsx,focus/analogue/[date]/page.tsx,experiments/page.tsx,guide/page.tsx,api/hypothesis/prepare/route.ts}`.

Shared/presentation: `src/app/canonical-migration.css`; components `app-shell`, `research-navigation`, `navigation-icon`, `research-journey`, `evidence-library`, `study-focus`, `equity-historical-evidence`, `equities-discovery`, `equity-screener`, `chart-explorer`, `explorer-candles`, `explorer-research-rail`, `chart-research-context`, `forecast-workspace`, `data-catalogue` (all `.tsx`).

Data/security helpers: `src/lib/{evidence.ts,evidence-data.ts,internal-research.ts,catalogue-types.ts,catalogue-data.ts,hypothesis-server.ts,forecast-server.ts,chart-explorer.ts,guided-research.ts}`.

Commands/tests: `package.json`; `scripts/{run_study.mjs,test_evidence.mjs,test_catalogue.mjs,test_guided.mjs,test_hypothesis.mjs,test_hypothesis_service.mjs,build_reference_atlas.ps1}`.

Documentation/assets: `docs/internal-evidence-workflow.md`, canonical reference directories, this report, plan and desktop review images. The unrelated pre-existing README analyst-expectations link and `docs/analyst-expectations-source-audit.md` were left untouched.

No push. No deployment. Local review is the next step.
