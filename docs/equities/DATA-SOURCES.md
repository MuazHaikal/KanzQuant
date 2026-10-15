# Data sources and refresh

## Universe and metadata

data/equity_universe.json is a committed, reproducible current-membership snapshot dated 2026-10-15: 503 S&P 500 listings plus 101 Nasdaq-100 listings, 518 unique symbols after deduplication. These are securities, not necessarily unique companies (dual share classes remain distinct).

Sources:
- https://en.wikipedia.org/wiki/List_of_S%26P_500_companies
- https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies
- https://www.sec.gov/files/company_tickers_exchange.json

Membership is fetched only by npm run equities:universe. Runtime pages do not scrape membership. The snapshot includes source URLs, date and memberships; SEC maps current CIKs/exchanges. Issuer domicile is null unless established independently: US listing is not US domicile. Missing sector/industry is retained as unavailable.

## Prices

Existing YahooChartProvider public daily chart endpoint and existing assets / market_observations COPY merge. Ten calendar years requested initially. Raw OHLC, adjusted close and reported volume persist unchanged. Returns and indicators use adjusted close. Equity chart OHLC is multiplied by adjusted-close/raw-close; volume is not adjusted. Tiny floating-point envelope errors are clamped to adjusted open/close after raw OHLC validation; invalid source OHLC remains absent.

Incremental fetch overlaps 14 calendar days. If the adjusted close at the previous watermark changes, re-download the full ten-year window rather than splice adjustment bases. Provider history can still be revised outside the overlap; periodically use --full. Raw cached bars can include the provider's in-progress session, but research snapshots, chart reads and rankings exclude it. The completion cutoff is 16:30 America/New_York (conservative on half-days); only snapshots explicitly marked session_complete are read. The verified research date is 2026-10-14. This is not realtime data.

## SEC fundamentals

Official Companyfacts: https://www.sec.gov/search-filings/edgar-application-programming-interfaces . Set SEC_USER_AGENT locally to organization plus contact email. The supplied contact is in ignored .env.local only. Cached JSON is in ignored .cache/equities, with seven-day TTL. One request per CIK, not one per metric or filing. A cross-process lock serializes SEC requests across all six workers, with a 550ms minimum delay: fewer than two requests per second. HTTP 403/429 is not bypassed or retried. Requests have 5s connect and 25s read bounds.

Issuer succession is explicit, never guessed. data/equity_issuer_history.json documents XOM's one-for-one July 2026 redomiciliation, linking predecessor CIK 34088 and successor CIK 2115436. Evidence: https://www.sec.gov/Archives/edgar/data/34088/000003408826000093/xom-20260630.htm . Per-metric provenance retains concept, unit, filing date, accession and source CIK.

## Commands

- npm run equities:universe — update membership / SEC metadata snapshot.
- npm run ingest:equities -- --sync-only — additive migration and persistent instrument sync.
- npm run ingest:equities -- --symbol MU — incremental symbol price refresh, cached fundamentals, features, evidence and reranking.
- npm run ingest:equities -- --symbol MU --full — full ten-year price revalidation.
- npm run ingest:equities -- --symbol MU --force-fundamentals — explicit SEC cache refresh.
- npm run ingest:equity-universe — bounded six-worker universe refresh, then one cross-sectional ranking pass.
- node scripts/run_python.mjs scripts/rebuild_equity_fundamentals.py — rebuild mappings from cached SEC payloads using a COPY merge; only missing/expired caches require network.
- node scripts/run_python.mjs scripts/rebuild_equity_snapshots.py — recompute completed-session features and evidence from persisted prices, then atomically publish the universe; no Yahoo downloads.
- node scripts/run_python.mjs scripts/ingest_equities.py --skip-sync --rank-only — recompute cross-sectional ranks after a cache-only rebuild.
- node scripts/run_python.mjs scripts/verify_equities.py — read-only coverage and invariants.

No automatic equity schedule is enabled in Phase 1. Existing weekly macro job is unchanged.

The fundamental rebuild replaces only derived normalized periods for successfully rebuilt issuers; obsolete derived periods are removed, while raw SEC caches remain available for reproduction. Unrelated application data is untouched.

## Cost

Initial 518-symbol refresh: about 518 Yahoo chart calls, one Companyfacts request per unique CIK plus documented predecessor, and one SEC issuer mapping call. Same-day/incremental refresh: one small Yahoo request per selected symbol; SEC requests only after TTL expiration/explicit refresh. A split/dividend revision can add one full-history call. Page requests: zero external provider calls, bounded Neon reads only. Discovery/screener read persisted snapshots; rendering never computes 500 stocks.
