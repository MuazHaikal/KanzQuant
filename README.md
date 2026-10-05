# KanzQuant

KanzQuant is a dense quantitative research workstation. Version 0.1.2 adds interactive Focus Mode to the validated macro-regime and historical-similarity workflow.

## Focus Mode

Overview links to six factor workspaces, historical analogues, four return horizons, regime detail, and expanded market charts. Escape returns to Overview; left/right arrows switch factors. Charts support hover, point selection, zoom controls, drag pan, range brushes, and reset.

Focus views require database-mode persisted research with state vectors. They use existing semantic axes, not new PCA factor weights. Factor episodes rank absolute axis distance with a 12-month exclusion and nine-month spacing; they are distinct from the unchanged 19-feature cosine analogues. Outcomes are descriptive and never forecasts. Missing observations show N/A.

After starting a production server on port 3001, run `npm run test:focus` for math, real Neon mapping, valid routes, invalid routes, and database-mode checks. Set `FOCUS_TEST_URL` to test another origin.

## Architecture

`FRED / market provider → Postgres raw observations → Python feature/research jobs → compact JSONB results → Next.js App Router UI`

- `src/app`: server-first research views; the navigation shell is the only shared client boundary.
- `research`: providers and bias-aware feature, similarity, return, and regime engines.
- `migrations`: indexed Neon/Postgres schema for series, assets, features, runs, results, regimes, and neighbours.
- `scripts`: incremental ingestion, demo bootstrap, and offline research commands.
- Demo mode remains available only when explicitly selected. Database mode fails rather than mixing in fixtures.

## Local development

```bash
npm install
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. To verify the entire project:

```bash
npm run lint
npm run typecheck
npm run build
npm run ingest:market
npm run research
npm run research:verify
python -m pytest
```

## Neon setup

1. Create a Neon project and copy its pooled connection string.
2. Set `DATABASE_URL` in `.env.local` and keep `KANZQUANT_DATA_MODE=database`.
3. Apply and verify the schema with `npm run db:setup`.
4. Add `FRED_API_KEY`, then run `npm run ingest:fred`, `npm run ingest:market`, and `npm run research`.
5. Verify persisted research with `npm run research:verify`. Re-running either ingestion is safe because observations use composite-key set-based upserts.

For the repository-managed, credential-safe setup and verification path on Windows, use:

```powershell
npm run db:setup
npm run db:verify
```

The Python jobs load `.env.local` automatically and never print connection values.

Without either credential, keep `KANZQUANT_DATA_MODE=demo`; the interface remains complete.

## Vercel deployment

1. Import this repository into Vercel with the Next.js preset.
2. Add `DATABASE_URL` and `KANZQUANT_DATA_MODE=database` as Production environment variables. `DATABASE_URL` must remain server-only.
3. Deploy with the default `npm run build` command.
4. Add `DATABASE_URL` and `FRED_API_KEY` as GitHub Actions repository secrets for the included weekly research workflow.
5. Run ingestion/research separately via that workflow or another short-lived scheduler. The Vercel web process never runs Python and does not require `FRED_API_KEY`.

## Market data and methodology

### Daily research interface (local v0.1.2 redesign)

Overview highlights historically unusual levels and movements; factor order remains stable. Focus pages preserve the existing semantic axes, analogue cosine metric, episode spacing, research snapshot and price-return definitions. No research job is run by a chart gesture.

- **Level percentile:** average-rank percentile over available factor history, including tied levels. ≤P10 / ≥P90 are very low / very high; ≤P25 / ≥P75 are below / above usual. These describe the standardized factor axis, not raw interest rates or economic levels. `σ` is shorthand for combined standardized-input units, not a newly normalized factor.
- **Move percentile:** mid-CDF rank of the absolute 1M, 3M or 12M change against strictly prior same-horizon changes. Calendar-month gaps are excluded, not treated as adjacent observations. Minimum 36 prior changes; otherwise N/A. <P75 typical, ≥P75 notable, ≥P90 unusual, ≥P99 extreme. Directional rank and sample count are available by mouse or keyboard tooltip. Displayed move ranks are floored to avoid rounding across a classification threshold. These are descriptive ranks, not formal significance tests or probabilities.
- **Trend:** latest 3M pace versus preceding 3M pace. Below 0.05 axis units/month is stable; opposite signs with both paces above that floor indicate a reversal. Attention markers also flag tail levels, ≥P90 movements, notable reversals, and ≥P90 input moves contributing at least 0.05 units. Current Read chooses three highest-priority signals deterministically.
- **Drivers:** 3M changes multiplied by the actual arithmetic-axis coefficients. Contributions sum to the factor change; they are input decompositions, not causal claims or PCA weights. Analogue similarity terms are signed feature dot-products divided by the two vector norms; they sum to cosine alignment ×100.
- **Episodes:** Factor Focus switches between nearest levels and nearest signed 3M changes, keeping the existing 9M spacing and recent-12M exclusion. Its market-response sample is distinct from the full-state nearest analogues used on Overview and Return Focus.
- **Charts:** drag or horizontal trackpad to pan; coarse mouse wheel, pinch/Control-wheel or Shift-wheel to zoom around the cursor; double-click or Home to fit. Small smooth vertical trackpad gestures remain page scroll. Wheel hardware exposes no universal mouse/trackpad flag, so Shift-wheel is the deterministic fallback. Arrow keys pan, +/− zoom, Enter inspects a point. Fractional domains permit arbitrary windows; factor windows persist in the current browser session. There are no range sliders.
- **Appearance/search:** light and dark share one layout. A pre-paint script restores the versioned local preference; system preference is used only without an explicit choice. Search covers factors, source series, stored historical dates and available modules.

Verification (with the local production server running):

```powershell
npm run test:context
npm run test:focus
npm run lint
npm run typecheck
.\.venv\Scripts\python.exe -m pytest -q
npm run build
```

`FOCUS_TEST_URL` can override the default port 3001 for both integration suites. This redesign is intentionally local pending visual approval; do not deploy or push it automatically.

The replaceable `MarketDataProvider` boundary currently uses Yahoo Finance's chart JSON endpoint (not HTML scraping):

- `SPX` / `^GSPC`: S&P 500 price index. It excludes dividends.
- `GLD`: SPDR Gold Shares adjusted price, a liquid gold-exposure proxy.
- `IEF`: iShares 7–10 Year Treasury Bond ETF adjusted price, a liquid intermediate-Treasury total-return proxy.

Daily prices are fetched concurrently with bounded retries/timeouts and persisted through one COPY/set-based upsert. Incremental runs overlap the last 14 days to capture corrections.

The real state vector uses 19 features: federal funds, 2-year and 10-year Treasury yields, 10y–2y curve, headline CPI, core CPI and PCE inflation, unemployment, payrolls, claims, industrial production, retail sales, real GDP, BAA–10Y credit spread, M2, Federal Reserve assets, VIX, S&P 500 six-month momentum, and S&P 500 six-month volatility. Levels or year-over-year transforms are chosen by economic meaning and normalized with 36-month expanding z-scores. Daily/weekly data are available at month-end, monthly data use a one-month simplified lag, and quarterly data use a three-month simplified lag.

FRED revision vintages are not available in the raw schema, so this is point-in-time by simplified release availability, not a vintage-real-time backtest. `BAMLH0A0HYM2` is retained in Neon but excluded from v0.1 states because the current source history begins in 2023 and would collapse the usable model history.
# Market-history inspection (local v0.1.2)

SPX, GLD and IEF use persisted Yahoo Finance daily OHLC from Neon. No candle or price-path fallback is generated. Candles use raw prices; the validated monthly adjusted-price research calculations are unchanged.

The arrowless Interval and Range menus are independent. Intervals are daily, Monday-based calendar trading weeks, months, calendar quarters, half-years and years. Open is first, high maximum, low minimum, close last; known volume is summed. Current incomplete periods are displayed honestly. Green candles are hollow and red candles filled; unchanged candles are neutral.

Drag to pan, mouse wheel / Control-wheel (trackpad pinch) to zoom at the pointer, horizontal trackpad to pan, double-click or Home to reset the preset window. Small smooth vertical gestures continue to scroll the page. Arrow keys pan; +/− zoom. There is no chart scrollbar or range slider. Menus support Up/Down, Home/End, Enter, Escape and Tab. Interval/range preferences persist locally across assets and routes.

The isolated high-DPI canvas renderer draws the visible window only; subpixel density uses real wick envelopes, with original interval-candle OHLC on hover. Pointer frames do not update React state. Initial data is a bounded calendar-aligned buffer; older/newer history is extended in debounced five-year chunks at loaded boundaries. MAX explicitly loads full available history. Database queries are server-only, read-only and time-bounded. ETF volume is optional and off by default; SPX index volume is not presented as a tradable-volume signal.

Analogue `view=candles` marks the selected analogue and permits before/after inspection. `view=compare` shows current and historical raw-price paths normalized to 100 at the last real trading close on/before each anchor, with a trading-session axis for daily comparisons and calendar periods for higher intervals. The current path stops at the latest persisted observation; no future path is extrapolated. Data before an asset's inception is explicitly unavailable.

Local routes: `/focus/market?asset=SPX`, `?asset=GLD`, `?asset=IEF`, `/focus/analogue/2025-09-30?view=candles&asset=SPX`, and `?view=compare&asset=SPX`. Switch dark/light with Appearance in the header. Run `npm run test:market` against the running local server (default port 3001; override `FOCUS_TEST_URL` for development).
