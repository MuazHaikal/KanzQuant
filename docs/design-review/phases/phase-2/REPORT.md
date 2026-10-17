# Phase 2 — Equity Core

Completed locally on 17 October 2026. No commit, push or deployment.

## Scope and baseline

Refined Stock Research, Equities Discovery and Equity Screener only. Preserved the existing migrated composition, quantitative feature pipeline, deterministic preset definitions, historical candidate selection, horizons and sample rules. No database migrations, ingestion, external writes or secret changes.

Phase 1 remains the shell baseline. Browser measurements on the production build confirmed a 52px topbar, 180px expanded navigation and 16px × 18px main gutters. No Phase 1 CSS, navigation components, global color tokens, Evidence Library or Study Focus was edited in this phase. The layout file only gains the scoped Phase 2 stylesheet import.

## Reference inspection

Read all three READMEs and both available VISUAL-SPEC files. Opened both Discovery/Screener full-page images and all numbered component images through reference atlases.

- Stock Research has 36 numbered component images and a README, but no full-page image or VISUAL-SPEC. The existing page composition was retained rather than inventing a new layout.
- Discovery has its full page and all 26 component references. Some filenames have longer descriptive names than those abbreviated in the brief.
- Screener has its full page and all 27 component references, including filters 21–27. None of those filter images is missing in this checkout.
- References illustrate unsupported news, catalysts, watchlists, proprietary rankings, broad benchmark matrices and inference. These were not fabricated or added.

## Stock Research

### Layout and chart

Consolidated the repeated company title into one instrument header: ticker, company, exchange/sector/industry, actual raw close, separately labelled adjusted daily return, currency and stored date. The section links remain compact and contained. Added a small Discover / Screen / Research workflow breadcrumb.

The chart retains substantially more width than the numeric rail: at 1920px, its canvas is approximately 1375px wide and 480px tall; at 1440px, the canvas remains 320px tall and the rail stays 280px wide. Range buttons, save/restore controls and removable indicator chips are compact. Volume remains inside the chart.

SMA20, SMA50, Bollinger (20,2) and Volume remain the four default indicators; SMA200 remains optional. No indicator formulas, sampling, adjustment logic, saved-view schema or canvas behavior changed. Browser removal and restoration of Volume passed; all 13 existing indicator/canvas tests passed.

### Quant Snapshot

Uses actual cached features, including 1M/3M returns, 52W-high proximity, SMA200 distance, 12–1 momentum, percentiles, 20D z-score/volatility, drawdown and available fundamental characteristics. No composite score added. Removed the misleading unconditional “value unavailable” caption under populated percentiles.

The historical sample count and link now sit in the snapshot footer. Removing the separate setup card eliminated the rail-driven blank space beneath the chart at 1440px.

### Historical Evidence

Added a compact selected-horizon summary: sample n, historical median and positive frequency. Kept all horizon statistics, empirical distribution and expandable exact cases. Changing to 6M was verified against MU's actual n=8, median +11.4% and positive frequency 62.5%.

The engine is descriptive: no baseline inference, confidence intervals or p-values are calculated here. The interface says so explicitly. It does not claim “statistically significant,” invent a cumulative strategy, or present historical outcomes as forecasts. Existing minimum-five/small-sample rules and 252-session candidate spacing remain unchanged.

### Fundamentals and sector-specific behavior

One coherent Fundamental Trends panel contains reported quarterly revenue, gross margin, operating margin and FCF where available. Dollar values use B/M units; each trend now gives its own last available observation date. This matters when an individual metric's SEC mapping ends earlier than the latest company filing. No missing values were backfilled or relabelled as current.

JPM receives the financial-company view: revenue trend, explicit non-applicability note, no industrial FCF/gross-margin/operating-margin tiles. Its larger chart now has enough container height; browser geometry confirmed chart bottom precedes the footer with no overlap. Other unavailable metrics remain clearly unavailable rather than generating substitute data. Additional existing fundamental histories remain expandable.

### Relative performance and macro context

Preserved the existing selectable equity comparison, normalized adjusted-price base 100 at the shared start. Its metrics now use the shared formatter and no longer import the entire screener component. No alpha claims or unsupported sector ETF/correlation matrix were added. The current product does not provide the reference's full SPX/sector correlation workspace; this phase does not invent one.

The existing macro-state table still compares stock and explicitly labelled SPX 3M medians using the stored methodology. Unavailable small-sample outcomes display “Unavailable,” not a dangling percent sign. The full-history/revised-FRED/63-session-spacing limitations remain accessible.

## Equities Discovery

- Interesting Now remains the dominant sortable table. Compact 32px rows, tabular numbers, a clear sorted-column underline, sticky ticker, constrained company names and small research links reduce horizontal pressure.
- Search matches ticker/company; entering a query switches to the unrestricted existing universe view so a non-momentum stock is not silently excluded. A unique result opens with Enter. Browser test: “Apple Inc.” → one AAPL row → Enter → AAPL Stock Research.
- All existing deterministic presets and their thresholds remain unchanged.
- Right rail uses actual latest-shared-date breadth, equal-weight sector daily means and absolute-z-score unusual setups. No intraday times, options signals or breadth history were invented.
- Lower analytics retain the actual cross-sectional momentum distribution, equal-weight 3M sector means and drawdown-vs-3M scatter. All three sit side-by-side at 1920px; the scatter wraps below at 1440px rather than squeezing labels.
- Snapshot-only list data does not include price histories, so decorative/fabricated row sparklines were omitted. Current-membership survivorship bias and the descriptive/non-recommendation disclosure remain.

## Equity Screener

- Existing sector, search, range, preset and FCF controls are retained in one compact filter workspace. Inputs still apply instantly; no nonfunctional Run Screen button or unnecessary slider limits were added.
- Preset selection now visibly orders by its relevant existing metric (e.g. reversals by ascending z-score, revenue screens by descending revenue growth), without changing eligibility definitions.
- Results dominate. The table has contained vertical/horizontal scrolling, sticky headers and ticker cells, explicit ascending/descending state and restrained signed-cell shading. No color-only interpretation or recommendation labels.
- Browser verification: 480px results viewport, 1582px row content, PageDown moved internal scroll to approximately 420px; computed table-header positioning remained sticky. Page width stayed 1920px.
- Existing 50-row pagination and compact/all-columns/date controls remain. “All columns / dates” exposed Price date. No CSV functionality was added.
- An impossible search returned zero matches and “Unavailable” for all three means, never NaN or “—%”. Reversal selection exposed “20D z ↑”.
- Existing momentum distribution and matched-sector 3M means remain secondary, correctly labelled analytics; no unsupported time-series timeframe control was added.

## Consistency and component review

Added shared presentation-only `equity-format` functions, `EquityWorkflow`, and independent `SectorBars`; extracted `EquityFundamentalTrends` as a server-rendered presentation component. Returns use signed one-decimal percentages, volatility unsigned one-decimal percentages, z-scores two decimals, prices two decimals, percentiles Pnn, and fundamentals B/M currency units. Null, undefined, nonfinite and negative-zero cases are tested.

Frontend-design guidance informed the existing-system hierarchy and density refinement. The React checklist informed independent shared helpers, no new client fetch waterfall, immutable existing filters, semantic links/buttons, and preserved accessible sort/pressed states. No new UI framework or dependency was introduced.

## Visual QA

Application inspected before any source edits. Baseline and final screenshots use these same filenames under `before/` and `after/`:

| Page | 1920 × 1080 | 1440 × 900 |
| --- | --- | --- |
| Discovery | equities-discovery-1920.png | equities-discovery-1440.png |
| Screener | equity-screener-1920.png | equity-screener-1440.png |
| Stock MU | stock-MU-1920.png | stock-MU-1440.png |

The browser exporter produces overscan/repeated viewport pixels. The existing `export_design_viewports.ps1` helper normalizes captures to the requested PNG dimensions; these are visual QA artifacts, not a claim of pixel-perfect native-resolution matching. At the smaller override, the DOM reports 1440 × 901 and the PNG is normalized to 1440 × 900.

Compared initial rendered screenshots with the references and made a second refinement: folded the separate setup card into Quant Snapshot, improved rail header wrapping, fixed the bank chart/footer allocation, clarified individual fundamental dates, and corrected missing/nonfinite/negative-zero formatting. First-iteration captures are retained.

Visually inspected MU, NVDA, AAPL, JPM, XOM and WMT across their price/evidence/fundamental content. Technology, banks, energy, consumer, positive/negative features and missing fundamentals were represented. Supplementary captures are inspection records; the six named page-top PNGs above are the comparison set. Final MU browser error log was empty.

Remaining intentional differences: no mock news/catalysts/watchlist/analyst targets, no unsupported significance/CI/event-study graphics, no fake correlations or market-value ratios, no snapshot-only fake sparklines, no fabricated breadth history. Real momentum outliers remain visible in distribution/scatter domains rather than being trimmed to resemble the mockup. At 1440px, lower analytics require some page scrolling and the screener may require internal horizontal scrolling to see every column.

## Tests

| Check | Result |
| --- | --- |
| ESLint (`npm run lint`) | Pass; final source |
| TypeScript (`npm run typecheck`) | Pass; final source |
| Production build (`npm run build`) | Pass; Next 16.3.8; all routes compiled |
| Python (`node scripts/run_python.mjs -m pytest -q`) | 99 passed in 20.13s; one existing Starlette/httpx deprecation warning |
| Equity indicators (`npm run test:equity-indicators`) | 13/13 passed |
| Equity integration (`npm run test:equities`) | Pass; six real stocks, missing ASML fundamentals, short-history VYLR, invalid symbol and all three routes |
| Market (`npm run test:market`) | Pass; real SPX/GLD/IEF, 941 buffered rows each, six intervals, actual canvas interactions |
| Guided/frontend integration (`npm run test:guided`) | Pass; routes, navigation, chart APIs and preserved methodology |
| Context (`npm run test:context`) | Pass; all six persisted factor identities and database routes |
| Focus (`npm run test:focus`) | Pass; all factor/return/market/regime/analogue and invalid-route checks |
| Phase 1 (`npm run test:phase-one`) | Pass; shell/evidence/statistical presentation contracts |
| Visual (`npm run test:visual`) | Pass; visual math, missing values and accessibility contracts |
| Phase 2 (`node scripts/test_phase_two.mjs`) | Pass; format/missing/finite, workflows, sort, empty results, bank fundamentals and descriptive evidence |
| `git diff --check` | Pass |

One intermediate Focus run was interrupted by the deliberate production-server restart and returned ECONNRESET; the complete rerun passed. No test was weakened to hide that or to change a quantitative result.

Real stock integration observations (stored research date 2026-10-14): all six had 2513 valid price bars; MU 69 quarters/8 setups; NVDA 74/7; AAPL 73/6; JPM 73/8; XOM 73/7; WMT 73/6.

## Files changed in Phase 2

- `src/app/layout.tsx` — scoped stylesheet import only.
- `src/app/phase-two.css` — new equity-only visual overrides.
- `src/app/equities/[symbol]/page.tsx` — contained header/snapshot/fundamentals presentation.
- `src/components/equities-discovery.tsx` — discovery table, compact search/presets and formatting.
- `src/components/equity-screener.tsx` — formatting, workflow and metric-appropriate preset sorting.
- `src/components/equity-compare.tsx` — independent shared metric formatting only.
- `src/components/equity-historical-evidence.tsx` — descriptive summary/horizon formatting.
- `src/components/equity-fundamental-trends.tsx` — extracted coherent quarterly/bank-aware panel.
- `src/components/equity-sector-bars.tsx` — shared existing equal-weight display calculation.
- `src/components/equity-workflow.tsx` — shared workflow links.
- `src/lib/equity-format.ts` — presentation-only numeric formatting.
- `scripts/test_phase_two.mjs` — focused regression checks.
- This report and Phase 2 screenshots.

Existing unrelated/canonical/Phase 1 dirty changes were preserved. No research, migration, database-query or quantitative engine files were changed in Phase 2.

## Status

Complete locally. Final production build was launched on localhost:3001 and visually inspected. No commit, push or deployment. No secrets printed, edited or committed. No research modules or unsupported data sources added.
