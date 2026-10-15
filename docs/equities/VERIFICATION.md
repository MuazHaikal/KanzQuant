# Equities Phase 1 verification

Verified locally on 2026-10-15–16 (Asia/Kuala_Lumpur) against real Neon data and the production Next.js build. No push or deployment performed. The approved canonical visual system is preserved; frontend-design guidance was applied within that system, not as a redesign.

## Coverage and sources

- 518 unique securities: current 503 S&P 500 and 101 Nasdaq-100 listings, deduplicated. Reproducible Wikipedia membership snapshot dated 2026-10-15; SEC issuer mapping supplies CIK and exchange.
- 1,251,661 persisted daily Yahoo Finance price observations, targeting ten years where available. All 518 have completed-session feature snapshots through 2026-10-14.
- 32,662 normalized quarterly SEC Companyfacts records; supported history for 509 issuers.
- Unsupported/unavailable fundamental mappings: ARM, ASML, CCEP, FDXF, FER, NBIS, PDD, TRI, VYLR. Their price research remains available; no missing fundamentals are fabricated.
- SEC access succeeded after configuring an identifying User-Agent in ignored local configuration. Credentials and contact details are not embedded in source or browser assets.

## Database

Migration 002 adds instruments, equity_fundamentals, equity_feature_snapshots and equity_provider_cache. Existing assets and market_observations are reused. The additional schema has 34 checked constraints. Pipeline status is persisted in equity_provider_cache; raw SEC payloads are locally cached. No macro tables are replaced.

Final cache normalization removed one obsolete derived period for a successfully rebuilt issuer and retained raw SEC payloads for reproduction. No unrelated records were deleted. Initial provisional intraday snapshots remain stored but are excluded from research reads.

## Research implementation

- Adjusted-price returns at 1/5/20/63/126/252 sessions; SMA20/50/200 distances, SMA50/SMA200, 52-week high proximity and 12–1 momentum.
- Prior-window z-scores, sample-SD realized volatility, downside volatility, drawdown/max drawdown, log-price slopes, skew and excess kurtosis. Exact formulas: FEATURES.md.
- Same-stock nearest neighbours use six normalized price-state dimensions, with candidate-only standardization and 252-session spacing. At least four nonconstant dimensions and 60 candidates are required. Outcomes at 21/63/126/252 sessions report N, mean, median, positive frequency and P10/25/75/90. N<5 suppresses statistics; N<20 is flagged small. No fundamentals enter historical matching.
- Quarterly revenue, gross profit, operating/net income, OCF, CapEx, FCF and direct-quarter diluted EPS; available cash/assets/equity/shares retained. TTM requires contiguous quarters. FCF is OCF minus positive CapEx. Total revenue takes precedence over contract-only revenue on matching coverage dates. Financials omit industrial cash-flow and gross-profit metrics.
- Separate momentum, volatility, growth and quality percentiles use matching price dates and valid denominators; no opaque score or forced valuation ratios.
- Macro context reuses persisted descriptive regimes and SPX, with 63-session-spaced conditional outcomes. Existing macro, forecast and hypothesis methodologies are unchanged.

## Product verification

MU and company-name Micron search both resolve to /equities/MU. Real price/volume/SMA charts, quant rail, fundamental history, historical distributions and macro context render. MU has 2,513 completed daily bars, 69 quarterly periods and eight spaced setups. MU–NVDA comparison renders normalized prices and metric comparisons. Chart overlay/volume toggles and local saved-view restoration work.

Real-data API checks also passed AAPL, JPM, XOM, WMT and NVDA: each has 2,513 valid completed daily bars; quarterly periods are 73, 73, 73, 73 and 74 respectively. JPM has no inappropriate FCF values. ASML unsupported fundamentals, VYLR short history and invalid symbols are checked explicitly.

The screener supports company/symbol and sector search, numeric min/max filters, FCF sign, all numeric sort columns, 50-row pages and a frozen symbol column. Presets: Momentum Leaders, Short-Term Reversals, Near 52W High, High Volatility, Deep Drawdowns, Strong Revenue Growth and Profitable Growth. Definitions: SCREENER.md. Browser checks covered sector/preset/numeric filtering, sorting, company search, click-through to AAPL and next/previous pagination (1/11 → 2/11 → 1/11). No browser console errors were observed in the final check.

## Performance and refresh

No provider HTTP calls or universe recomputation occur during page requests. Initial ingest uses controlled six-worker processing, existing bulk price merges and persisted feature/evidence snapshots. SEC calls are serialized across workers at fewer than two per second and cached seven days. Incremental prices overlap 14 calendar days; changed adjustment bases trigger full history. Full universe success: 518/518; no price-series failures.

The final real MU incremental refresh completed in 21.0 seconds, including feature/evidence computation and reranking 518 snapshots, with zero failures. Cache-only rank passes took 13.8–22.5 seconds. Initial ingest requires roughly 518 Yahoo requests plus unique-CIK SEC requests; ordinary selected-symbol refresh uses one Yahoo call and no SEC call until cache expiry. No automatic equity scheduler is enabled. Commands: DATA-SOURCES.md.

## Test results

- Python: 99 passed; one existing Starlette/httpx deprecation warning.
- ESLint, TypeScript and production build: passed.
- Equity screener pure tests and real API/route acceptance: passed.
- Existing context, visual, market, focus, guided, forecast UI, real forecast, hypothesis, hypothesis-service and hypothesis-client suites: passed. A transient focus socket failure during ingestion passed on retry after load subsided.
- db:verify: original ten tables, seven named indexes, 82 constraints and rolled-back read/write probe passed. Additional equity schema/coverage checks passed independently.
- Secret audit: zero findings across source, 338 historical blobs and 42 client assets. A URL-parser fragment false positive in minified vendor code was resolved by validating parsed credential URLs; exact secret-value checks remain enabled.

## Visual QA and local routes

Chrome reviewed at 1920×1080 and approximately 1440×900 (browser reported 1440×901; export normalized to 900). No document-level horizontal overflow; the wide screener table intentionally scrolls within its container. The stock chart remains dominant and metadata stays inside analytical panels. Original captures are retained as .raw alongside normalized PNG exports.

Screenshots relative to the repository:

- docs/equities/screenshots/equities-1920.png
- docs/equities/screenshots/equities-1440.png
- docs/equities/screenshots/mu-1920.png
- docs/equities/screenshots/mu-1440.png
- docs/equities/screenshots/screener-1920.png
- docs/equities/screenshots/screener-1440.png

Local production routes:

- http://localhost:3001/equities
- http://localhost:3001/equities/MU
- http://localhost:3001/equities/screener

## Files changed for this phase

New: data/equity_universe.json; data/equity_issuer_history.json; migrations/002_equities.sql; research/equities/{__init__,features,fundamentals}.py; scripts/{sync_equity_universe,ingest_equities,ingest_equity_universe,rebuild_equity_fundamentals,rebuild_equity_snapshots,verify_equities}.py; scripts/test_equities.mjs; tests/test_equities.py; src/lib/{equities,equity-screen}.ts; src/components/equity-{price-chart,compare,screener}.tsx; src/app/equities routes/loading/error; src/app/api/equities/[symbol]/route.ts; src/app/equities.css; docs/equities documentation and screenshots.

Updated: package.json/lock, requirements.txt, .gitignore, .env.example, layout, global search, app-shell freshness label, navigation/icon, optional MarketCanvas overlays, secret-audit URL validation and screenshot exporter bounds. Pre-existing canonical polish and unrelated user changes were preserved, not reverted.

## Limitations / status

Current-membership survivorship bias; revised, non-point-in-time fundamentals; incomplete standard concepts/foreign issuer coverage; unofficial delayed/revisable Yahoo data; as-reported EPS split comparability; sparse non-overlapping setup samples; descriptive full-history macro clusters; no automatic refresh schedule; valuation unavailable. See LIMITATIONS.md for details.

Phase 1 is local and verified. No new asset classes, stock recommendations, analyst targets, AI chat or quantitative-methodology replacement were introduced. No push. No deploy.
