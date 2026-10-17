# Analyst expectations: source audit and implementation gate
Checked 14 October 2026 (Asia/Kuala_Lumpur). Status: BLOCKED pending account entitlement and applicable licensing. This is an audit and proposed design, not a completed Expectations feature.
## Repository inspection
Repository: C:/Users/Muaz Haikal/Documents/ChatGPT/KanzQuant. Clean starting tree, HEAD 59c1abc, package version 0.3.1. Existing architecture uses offline Python providers/jobs, Neon/Postgres persistence and server-first Next.js views. The existing research methodology is descriptive macro research, not company earnings prediction. No consensus-provider settings were found in the local environment/configuration by variable-name checks; secret values were not printed.

Only this document and its README pointer are added. No source adapter, migration, data ingestion, UI route, generated forecasts, new dependencies, purchases, push or deployment. The user's requirement to confirm a viable source before implementation has not been met. A small request budget alone does not establish data rights.

## Source audit
Prices are USD, before taxes and currency conversion. Documentation establishes product availability, not successful access under the user's account.

### Alpha Vantage — first candidate for an entitlement test
[Documentation](https://www.alphavantage.co/documentation/) describes EARNINGS_ESTIMATES: annual and quarterly revenue/EPS, analyst counts and revisions. [Pricing](https://www.alphavantage.co/premium/) states free service is 25 requests/day; its current subscription selector lists $49.99/month for 75 requests/minute, with no daily cap on premium. Free entitlement for this particular function and exact range fields remain unverified. The documented IBM/demo API URL was requested and returned an Information message requesting a real key, not estimates. No forecast payload was obtained.

Historical EPS/quarterly surprise data are separately documented under EARNINGS. Revision history is advertised, but arbitrary as-of access, retention depth, accounting basis and annual/quarterly range completeness have not been verified. Do not call revision summaries a complete vintage database.

[Terms](https://www.alphavantage.co/terms_of_service/) restrict default use to private individual non-commercial activity; written agreement is needed for broader use. Financial-industry affiliation is also listed as a commercial-use criterion. A premium key alone does not resolve these rights. Public display, redistribution, snapshot retention and the user's eligibility need confirmation. Commercial price: quote required, not $0 or $49.99 by assumption.

### Financial Modeling Prep
[Endpoint](https://site.financialmodelingprep.com/developer/docs/stable/financial-estimates): stable/analyst-estimates, annual/quarterly periods. [Dataset](https://site.financialmodelingprep.com/datasets/analyst-estimates-targets) shows revenue/EPS low, average, high and separate analyst counts. Its pricing lists Starter $29/month or $19/month billed annually ($228/year), 300 requests/min; Premium $69/month or $49/month billed annually ($588/year), 750/min; Ultimate $139/month or $99/month billed annually ($1,188/year), 3,000/min. Basic: 250/day. Exact required tier/ticker entitlement is not confirmed; do not buy Starter assuming access.

[FAQ](https://site.financialmodelingprep.com/faqs?code=statements) identifies estimate EPS as non-GAAP and statement actuals as GAAP. This prevents automatic like-for-like surprise comparison. Historical fiscal-period rows do not prove historical retrieval-time vintages; require an explicit as-of contract and example before backfilling revisions.

[Terms](https://site.financialmodelingprep.com/terms-of-service) require written approval for downloading/copying and prohibit multi-user display without a specific agreement. [Commercial pricing](https://site.financialmodelingprep.com/pricing-plans?planType=commercial) explicitly requires a Data Display and Licensing Agreement. Public app and snapshot rights/cost remain unconfirmed. Not selected.

### EODHD
[Fundamentals documentation](https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds): v1.1 separates annual/quarterly Earnings Trend and fixes colliding Q4/annual dates. Advertised fields include EPS ranges, revenue averages, EPS trends and revision counts; full revenue range/count coverage requires payload verification. Actual EPS history and financial statements are available; accounting comparability still needs checking. No documented arbitrary historical consensus as-of access was confirmed.

[Pricing](https://eodhd.com/pricing): Fundamentals $59.99/month or $599.90/year; free package excludes fundamentals. Paid limits: 100,000 call units/day and 1,000 HTTP requests/min. [Quota documentation](https://eodhd.com/financial-apis/api-limits) charges 10 units per fundamentals request. Six demo symbols are documented, including AAPL/AMZN/TSLA; demo access is not redistribution permission. No demo data was copied into KanzQuant.

[Licensing](https://eodhd.com/financial-apis/commercial-vs-personal-license-use): advertised packages are personal-use; commercial terms require a quote. Display and permanent snapshot rights remain unconfirmed. Not selected.

### Finnhub
[Commercial coverage](https://api.finnhub.io/pricing-startups-and-enterprise) advertises annual/quarterly EPS/revenue estimates, 20+ years historical and five years forward, commercial redistribution and unlimited calls under a negotiated enterprise plan. Historical coverage is not evidence of every historical vintage.

[Personal pricing](https://finnhub.io/pricing) and [endpoint docs](https://finnhub.io/docs/api/company-eps-estimates) were not readable through the research tool; exact personal estimate price/entitlement/minute limit could not be verified. [Terms](https://finnhub.io/terms-of-service) impose a 30 requests/second ceiling, require written approval for sharing data or derived results, and require deleting data when the subscription ends. Retaining revisions after cancellation therefore cannot be assumed. Commercial price: quote required. Not selected.

### SEC EDGAR and excluded extraction
[SEC APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) provide filed actuals, not analyst consensus. [Fair access](https://www.sec.gov/about/developer-resources): at most 10 requests/second in aggregate, identify automated requests appropriately. Potential free actuals source; fiscal duration, units, filing availability, restatements and GAAP/non-GAAP matching require explicit handling. Company guidance is not consensus. TradingView was not scraped. No third-party web page was used as a forecast feed.

## Exact operating assumptions if the gate is cleared
Initial universe: AAPL, MSFT, MU; one selected stock per screen. Manual ingestion once/day, never on page load; no scheduler yet.

- Alpha Vantage: one estimates request per symbol = 3/day, 90 per 30-day month. Optional EARNINGS and INCOME_STATEMENT add 6/day: total 9/day, 270/month. Shared-account quota includes other jobs and failed attempts. Default ceiling 9 attempts/day, sequential, no automatic retries. The free 25/day allowance has room numerically, but endpoint access and rights remain unconfirmed. Cost is $0 only if free access AND eligible private use are confirmed; otherwise $49.99/month personal premium or negotiated commercial cost.
- FMP: annual + quarterly estimates = 6/day; separate actuals could bring total to 12/day, 360/month. Request count fits paid limits; selected tier, storage rights, display agreement and final cost are still unknown.
- EODHD: one full fundamentals response per symbol = 3 requests/day, 30 units/day, 900 units/30-day month; monthly personal price $59.99. Commercial quote separate.
- Finnhub: EPS/revenue times annual/quarterly times three symbols = 12 requests/day before actuals, 360/month. Exact account quota and recurring price unknown.
- Actual spending now: $0. No paid subscriptions or new recurring jobs created.

## Proposed smallest implementation (not implemented)
Use existing Python provider/storage patterns and a bounded Next.js server view. Keep provider credentials server-only. No calls from browser or render path. Fail closed on missing rights, credentials, entitlement, rate limits or malformed data; never silently substitute synthetic consensus.

Provider interface fetches normalized consensus records with source, retrieval timestamp, period semantics and optional separately sourced actuals. Confirm real payloads before choosing field mappings.

Append-only snapshot identity: source + symbol + fiscal period end + annual/quarterly + snapshot_date + accounting basis + currency. Store retrieved_at as UTC timestamptz, snapshot_date as UTC retrieval day (not fiscal period or an invented provider vintage), optional provider_as_of, fiscal_year/fiscal_quarter only when known, revenue_mean/low/high, eps_mean/low/high, separate revenue/eps analyst counts, currency, units, source and provenance. Keep unknown fields null and preserve zero/negative EPS. Repeated daily ingestion is idempotent; never overwrite historical days. Store actuals in their own versioned rows with source, period, basis, filed/reported_at and retrieved_at. No migration is applied until storage permission is clear.

Derive revisions only between observed snapshots for the identical fiscal period/source/basis/currency. First snapshot means history starts today; missing dates stay gaps. Lookback revisions need an earlier snapshot at/before the target date with visible age; do not invent 1M/3M histories. Use absolute EPS changes when baseline is zero/negative, and avoid misleading percentage changes. Never use future actuals or later revised estimates in historical evidence.

Single-stock page: human company name first, annual/quarterly selector, revenue and earnings per share panels, clear analyst-consensus attribution and snapshot date. Show actuals versus consensus only on matched fiscal periods and compatible accounting bases. Low—mean—high shows analyst dispersion, not a confidence interval. Revision line uses saved retrieval dates and needs at least two points; otherwise show a truthful empty state. Unknown fields show “Unavailable”. Technical identifiers in details. Reuse compact v0.3.1 dark/light shell, keyboard controls and narrow layouts. No change to Overview/research journey or existing engines.

Required tests once implemented: provider HTTP-200 error envelopes, auth/rate failures, nulls/zeros/negative EPS, ranges/counts/units validation, annual/Q4 collision, non-calendar fiscal years, idempotent append-only storage, source/basis isolation, missing revision baseline, no look-ahead, no synthetic fallback, and accessible page loading/error/empty states. Run existing relevant integration suites, Python tests, lint/typecheck/build and desktop/narrow dark/light browser checks then.

## What resolves the block
1. A real account key confirms annual/quarterly EPS and revenue payloads for the tiny universe, including available ranges/counts.
2. Establish eligible private-only use or written permission covering KanzQuant's intended display, redistribution/derived results, snapshots, retention after cancellation, attribution and actuals.
3. Obtain the exact entitled plan/quote and confirm it fits the user's budget.
4. Implement the provider against verified payloads, then storage and the single-stock screen.

No provider emails or purchase requests have been sent. No Expectations local URL exists. Existing review URLs in docs/v0.3.1-local-review.md are historical documentation, not a freshly verified running server.
