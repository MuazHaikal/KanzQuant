# Market-chart verification — 2026-10-05

Local production build: http://localhost:3001. No deployment, push, release, or data ingestion was performed.

## Data integrity

- Read-only Neon OHLC audit: SPX 24,806 daily observations (1927-12-30 onward), GLD 5,502 (2004-11-18 onward), IEF 6,084 (2002-07-30 onward). Latest stored date: 2026-10-02.
- All three assets have complete, valid daily OHLC; no missing or invalid OHLC rows. ETF volume is real; SPX index volume is not presented as meaningful.
- Default API payloads contain 941 buffered daily rows per asset. Exact latest OHLC/volume matches persisted Neon observations.
- Candle prices use raw persisted OHLC. Existing adjusted-price research, forward returns, macro factors, regime clustering and similarity calculations are unchanged.
- Missing data fails closed: no demo fallback, synthetic OHLC, fabricated volume, or projected current comparison path.

## Implementation

- Shared imperative canvas renderer; visible-only candle drawing, pixel envelopes for dense views, animation-frame updates, and cached path extents. Pointer gestures do not update page React state or query Neon.
- Buffered history extends in bounded chunks at domain boundaries. Database timeout: 15 seconds; client request timeout: 20 seconds. Abort and clear loading/error states are supported.
- UTC calendar aggregation: Monday weeks, calendar months, quarters, half-years and years. OHLC uses first open, maximum high, minimum low and last close; known volume sums. Partial periods remain partial.
- Independent locally persisted interval/range preferences; compact arrowless keyboard-accessible menus. Default: 1D / 1Y.
- Hollow up / filled down candles, neutral unchanged candles, crosshair, period OHLC readout, latest-price marker, optional ETF volume and subtle SPX regime strip.
- Analogue Candles shows real prices around the selected anchor. Compare uses solid current / dashed historical raw-price paths normalized to 100 at the last trading close on or before each anchor; current future observations are never fabricated.

## Automated checks — passed

- Python: 13 tests.
- `npm run test:market`: six interval aggregation boundaries and OHLCV, partial/missing data, comparison anchors, continuous domains, actual canvas drag/pan/zoom/reset/cleanup, ordinary vertical scrolling, bounded payloads, persisted data and API validation.
- `npm run test:context` and `npm run test:focus`: existing quantitative identities, context, route validation and fail-closed behavior.
- `npm run db:verify`: 10 tables, 7 named indexes, 82 constraints; transactional read/write probe rolled back.
- ESLint, TypeScript, production build and `git diff --check`.

## Browser verification — passed

Frontend-design and computer-use skills guided compact terminal styling and direct browser QA at approximately 1440×900 and 1920×1080 in light and dark modes.

- SPX, GLD, IEF market focus; Overview; analogue Candles and Compare.
- Restrained candle colors, hollow/filled distinction, wicks, grid, crosshair, axis labels, price marker, popup placement, ETF volume synchronization and non-obscuring regime strip.
- Menu selection, outside click, Escape, Arrow Up/Down, Enter and Tab; no arrows, native selects, sliders or chart scrollbars.
- Continuous cursor zoom, drag pan, horizontal wheel/trackpad pan, Control-wheel pinch-equivalent zoom, double-click reset and preference persistence.
- Annual + 3M gracefully displays one partial candle. Annual + MAX displays 100 SPX calendar candles without negative price-axis ticks.
- Overview fits approximately 1440×900 without vertical overflow. Focus chart dominates the workspace; analogue supporting tables retain normal page scrolling.
- Final production browser console: no warnings or errors.

Physical trackpad hardware was not available; horizontal and pinch-equivalent browser events were verified through the actual renderer harness and native browser wheel/pan actions.

Final screenshot: `C:/Users/Muaz Haikal/.codex/visualizations/2026/10/03/01a10166-ef25-7a53-8e3a-19d3335d6af4/market-spx-final.jpg`.
