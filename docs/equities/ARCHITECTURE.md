# Equities Phase 1 implementation plan

Reuse assets / market_observations, YahooChartProvider, COPY upserts, Neon server reads, canonical panels and MarketCanvas. Add an instrument extension of assets (EQUITY first), normalized quarterly fundamentals, cached SEC payloads and daily feature snapshots with persisted historical evidence. Keep macro research and its schedule unchanged.

Implementation: membership snapshot → additive migration → cached providers / conservative SEC normalization → daily features and spaced same-stock evidence → controlled batch ingestion → persistent cross-sectional ranking → search / discover / screener / instrument research → tests and browser verification.

No provider fetches or universe computation on page requests. No paid services or new automatic scheduler. Current-membership universe is not a point-in-time universe.

## Implemented flow

The instrument ID is the existing assets ID: instruments adds type, metadata, memberships and provider identifiers, while market_observations remains the single OHLCV store. Additive migration 002 adds instruments, equity_fundamentals, equity_feature_snapshots and equity_provider_cache. The latter holds pipeline status; SEC payloads are cached locally in ignored files. No existing macro schema is replaced.

Controlled Python jobs reuse YahooChartProvider and COPY price merges. Completed-session feature/evidence snapshots persist in Neon. SEC normalization uses cached Companyfacts, eligible filing cutoffs and sector-aware omissions. Cross-sectional ranks compare matching price dates only. Cache-only rebuild scripts avoid repeating provider downloads.

Server-only Neon reads feed discovery, screener, research and the read-only /api/equities/[symbol] comparison endpoint. React clients handle filtering, pagination, chart interaction and comparison selection; they never receive database credentials. Global search uses the committed metadata snapshot, with exact symbols prioritized. Existing MarketCanvas draws adjusted OHLCV and optional SMA overlays.

See VERIFICATION.md for exact coverage, tests, screenshots and remaining limitations.
