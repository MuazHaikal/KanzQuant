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

The replaceable `MarketDataProvider` boundary currently uses Yahoo Finance's chart JSON endpoint (not HTML scraping):

- `SPX` / `^GSPC`: S&P 500 price index. It excludes dividends.
- `GLD`: SPDR Gold Shares adjusted price, a liquid gold-exposure proxy.
- `IEF`: iShares 7–10 Year Treasury Bond ETF adjusted price, a liquid intermediate-Treasury total-return proxy.

Daily prices are fetched concurrently with bounded retries/timeouts and persisted through one COPY/set-based upsert. Incremental runs overlap the last 14 days to capture corrections.

The real state vector uses 19 features: federal funds, 2-year and 10-year Treasury yields, 10y–2y curve, headline CPI, core CPI and PCE inflation, unemployment, payrolls, claims, industrial production, retail sales, real GDP, BAA–10Y credit spread, M2, Federal Reserve assets, VIX, S&P 500 six-month momentum, and S&P 500 six-month volatility. Levels or year-over-year transforms are chosen by economic meaning and normalized with 36-month expanding z-scores. Daily/weekly data are available at month-end, monthly data use a one-month simplified lag, and quarterly data use a three-month simplified lag.

FRED revision vintages are not available in the raw schema, so this is point-in-time by simplified release availability, not a vintage-real-time backtest. `BAMLH0A0HYM2` is retained in Neon but excluded from v0.1 states because the current source history begins in 2023 and would collapse the usable model history.
