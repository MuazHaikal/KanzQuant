# Research limitations

- Current S&P 500 / Nasdaq-100 membership creates survivorship bias. This is current-equity research, not a survivorship-free historical factor study.
- Public Yahoo daily charts are an unofficial free feed and can be revised, delayed or throttled. Raw caches may include partial sessions; research/chart/ranking reads use explicitly completed-session snapshots only, with a conservative 16:30 New York cutoff. Provider failure keeps old persisted data and reports failure. No authentication bypass or paid service is used.
- Ten years is a target, not fabricated history for recent listings. Insufficient feature and outcome samples stay unavailable.
- Equity returns use Yahoo adjusted close. This differs from the existing SPX price-return index convention, which excludes dividends; macro comparison explicitly labels SPX.
- SEC standard concepts do not cover every issuer. Custom concepts, IFRS foreign issuers and complicated restructuring can be unavailable. Financial companies omit industrial FCF and gross-profit analysis.
- XOM has an explicitly sourced predecessor/successor mapping. Other reorganizations are not guessed; their short histories remain honest until separately verified.
- Restated current-vintage fundamentals are descriptive only. They never enter historical setup matching. Reporting calendars differ. Growth with a zero/negative prior denominator is unavailable.
- EPS history is as reported. YoY comparisons require a shared filing accession to reduce split-basis ambiguity; unavailable comparisons are not invented. Standard revenue aliases cannot guarantee complete coverage of every issuer's unusual accounting taxonomy.
- No P/E, P/S, P/FCF or value percentile is shown without reliable corresponding market value/share data.
- Setup samples are small due to strict one-year spacing; results are descriptive and selection-dependent, not calibrated forecasts.
- Cross-sectional percentiles compare only snapshots with matching price dates; metric coverage can differ and valid-count metadata is retained. A stale symbol is not automatically refreshed by a web request.
- No scheduled equity job is enabled yet. Use explicit batch/symbol commands; source freshness appears in the relevant panels.
- Existing macro regimes are full-history descriptive clusters based on revised FRED data and simplified release lags, not a point-in-time macro backtest.

Future assets can reuse assets, daily price storage, MarketCanvas and price features through an instrument adapter. Only EQUITY has a complete new research path in this phase.
