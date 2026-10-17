# Phase 3 — Market Research

Completed locally on 17 October 2026. No commit, push or deployment.

## Scope and locked baselines

Refined only Chart Explorer (`/chart`) and Overview (`/`). Phase 1 shell/Evidence/Study and Phase 2 equity pages remain the existing baseline. The workspace already contained uncommitted canonical, Phase 1 and Phase 2 work; it was preserved. No global tokens, navigation dimensions, providers, ingestion, research engines, factor construction, similarity, forward-return calculations or database records were changed in this phase.

Used the frontend-design skill to translate the supplied composition into the existing graphite/blue product system, rather than introduce a new visual language. Applied the React review checklist to component rendering, accessible controls, stable hooks and existing parallel data loading. Used the verification skill to trace and repair an SVG tooltip hydration mismatch discovered during browser QA.

## Reference inspection and refinement loop

Before source edits, ran the production build and captured both pages at both requested desktop sizes. Read the README, VISUAL-SPEC and CROP-MANIFEST in both reference directories; opened the full-page references and all numbered component crops (including grouped crop atlases).

Iteration 1 established the chart/rail split, panel containment, compact controls, six-factor row and coordinated analytics. Screenshot comparison then identified three refinements:

1. Explorer's 560px plot at 1920 made the analytical strip unnecessarily difficult to see. Reduced the single-panel plot to a 360–460px viewport-responsive range; retained a substantial 421px plot at the smaller desktop.
2. Added a last-visible-observation value label and reference line. It follows the visible window, not an assertion that a historical viewport contains today's price. Normalized comparisons omit this annotation.
3. Replaced the Explorer analogue mini-cards with a compact period/similarity/real 3M outcome table. Removed Overview's fixed analogue-scroll cap, which clipped the last row.

Browser console QA caught React's SVG `title` single-child requirement in the new annotation. Changed the split literal/expression into one string, added a regression guard, rebuilt, and verified fresh production loads without console errors.

## Chart Explorer

- Workspace uses a 3:1 main-panel/right-rail layout, approximately 75%/25% of available research width. The full existing shell remains unchanged.
- Instrument name, current price, prior-observation change, data date, range, interval, indicator chips and OHLCV remain inside the primary chart panel.
- Reduced command heights, panel headers and nested borders. Indicator dots identify overlay colors; add/remove actions have explicit accessible names.
- Default SMA20, SMA50, Bollinger(20,2) and Volume are preserved. SMA200 remains optional. All calculations use the already-loaded daily bars; no provider request was added.
- Candles/lines, muted band fill, subordinate volume strip and state lane retain the existing drawing and quantitative calculations.
- Quant Snapshot shows loaded-observation count and existing SMA values, without repeating the header's last price. Research Context provides the descriptive regime and six factor percentiles/states.
- Four real historical analogue rows show macro similarity and selected-market 3M returns. Macro selections explicitly identify their SPX outcome context. Missing outcomes show `Unavailable`.
- Investigate links point to existing Forecastability and Evidence Library routes; no AI or marketing modules were introduced.
- Bottom strip uses the existing four horizon-specific analogue-return medians and empirical distributions. It is one coordinated surface, subordinate to the plot.

### Measured geometry

Dimensions below are browser DOM CSS pixels, rounded. Main panel includes controls, state lane and date readout; plot dimensions refer to `.linked-plot`.

| Viewport | Main plot | Right rail width | Browser document width |
|---|---:|---:|---:|
| 1920 × 1080 | 1247 × 460 | 423 | 1920 |
| 1440 × 900 | 887 × 421 | 303 | 1440 |

The smaller viewport was reported by Chrome as 1440 × 901 because of zoom/device rounding; the exported viewport image is exactly 1440 × 900. At 1440, lower analytics continue below the fold intentionally rather than making the main chart shallow. No browser-level horizontal overflow was observed.

## Overview

- The current macro environment is stated in the page header, using `regime strength · distance-based`, not a calibrated probability.
- Market Overview is the dominant left panel; concise real analogue outcomes occupy the right rail. The existing S&P 500 price-history architecture, interval aggregation, range selection and regime shading remain intact.
- Market and macro timestamps stay inside the market panel header. Price/OHLC readouts and chart controls remain contained inside that panel.
- Six compact Growth/Inflation/Rates/Credit/Liquidity/Volatility modules follow the chart, not precede it.
- Each module separates composite level, historical percentile/state, and signed 1M/3M/12M changes. The label explicitly says `Composite level · axis units`; it does not claim factors were re-standardized into unit-variance z-scores.
- Change tooltips retain existing movement classification and prior sample count. Neutral numeric change styling and factor identity colors avoid implying higher macro levels are universally good or bad.
- Existing sparklines and percentile scales are preserved. All six factors are fully visible above the fold at both tested sizes: approximately y645–848 at 1920 and y586–802 at 1440.
- Four existing analogue-outcome distributions form the lower strip. Existing conditional-research links and methodology disclosure remain below it.

## Interaction verification

Production browser checks covered Explorer range changes, daily/weekly intervals, Volume removal, optional SMA200 addition, keyboard zoom/pan/inspection, a saved-view save/change/restore round trip, and Gold comparison in separate and normalized-to-100 modes. Real Gold history loaded after the initial asynchronous empty state. The temporary `Phase 3 QA` view was removed; the pre-existing saved view was preserved. Default indicator/volume state was restored by reopening the default route.

Overview checks covered range and interval menus, regime visibility, the Growth factor destination, and analogue destinations. Confirmed the historical analogue page rendered its episode comparison, distributions and forward outcomes. The analogue navigation was slow during QA; initial short browser navigation waits expired before the route finished, but the destination subsequently rendered without errors. No route or data-loading architecture was changed to mask this.

The DGS10 deep link showed genuine yield units and basis-point changes, release-availability dates, existing yield context, no fabricated market volume and no market Quant Snapshot. Existing integration tests verified the context/deep-link paths and fail-closed data handling.

Actual canvas pointer drag, wheel/trackpad/pinch-equivalent handling, reset, cleanup and indicator drawing were exercised by the existing executable chart tests. Browser-level pointer drag/crosshair movement was not separately automated; browser QA exercised the keyboard date inspection and shared historical-value readout. No interaction or drawing formulas were changed.

## Intentional differences from mock references

- No rolling Sharpe, volatility, correlation matrix, sector pairings, price forecast or composite score was invented. Those modules do not exist in these pages' current validated data flow. Existing analogue distributions are used instead.
- Quant Snapshot retains existing loaded-data SMA calculations rather than introducing a new return/volatility/momentum engine.
- Overview remains a single SPX environment view (`assetControl=false` already present), not a newly invented multi-asset selector. Chart Explorer retains the existing instrument switcher and comparisons.
- Current shell typography, icons, spacing tokens and navigation remain the Phase 1 baseline. The reference imagery is a composition guide, not authorization to replace the locked shell.
- Similarity and clustering remain descriptive. No recommendations, calibrated probabilities or synthetic data were introduced.

## Visual evidence

Production browser captures were exported to exact requested dimensions using the repository's viewport export helper. Raw browser captures are retained alongside the PNGs. Chrome screenshot output included repeated/overscan surfaces at the test zoom; the helper selects the actual viewport and removes this capture artifact, without altering page content.

| Page / size | Before | Iteration 1 | Final |
|---|---|---|---|
| Explorer 1920 | [Before](before/chart-explorer-1920.png) | [Iteration](iteration-1/chart-explorer-1920.png) | [After](after/chart-explorer-1920.png) |
| Explorer 1440 | [Before](before/chart-explorer-1440.png) | [Iteration](iteration-1/chart-explorer-1440.png) | [After](after/chart-explorer-1440.png) |
| Overview 1920 | [Before](before/overview-1920.png) | [Iteration](iteration-1/overview-1920.png) | [After](after/overview-1920.png) |
| Overview 1440 | [Before](before/overview-1440.png) | [Iteration](iteration-1/overview-1440.png) | [After](after/overview-1440.png) |

Final Overview captures also demonstrate existing saved chart settings: 3Y/weekly at 1920 and 1Y/daily at 1440. All four final normalized PNGs were opened and visually inspected.

## Tests

All passed; no tests weakened.

| Check | Result |
|---|---|
| Python suite | 99 passed in 33.83s; one existing Starlette/httpx deprecation warning |
| `npm run lint` | Passed, including final tooltip repair |
| `npm run typecheck` | Passed, including final tooltip repair |
| `npm run build` | Passed; final build launched locally on port 3001 |
| `npm run test:market` | Passed: actual canvas interactions, all six intervals, 941 real buffered Neon rows for each of SPX/GLD/IEF, API validation and fail-closed checks |
| `npm run test:guided` | Passed, repeated after final tooltip repair; real routes/API, URL state, comparisons, release availability and saved views |
| `npm run test:context` | Passed: all six real factors, contribution identities, level/change ranks, Overview and deep links |
| `npm run test:focus` | Passed: six factors, four outcome horizons, market/regime/analogue routes and invalid-route 404s |
| `npm run test:visual` | Passed: visual components, distributions, missing-data/accessibility contracts |
| `npm run test:phase-one` | Passed |
| `node scripts/test_phase_two.mjs` | Passed |
| `npm run test:equity-indicators` | 13/13 passed, repeated after final tooltip repair |
| `node scripts/test_phase_three.mjs` | Passed: asset-specific real analogue formatting, missing/empty states, descriptive labels, containment, level/change distinction, scoped styles and single-child SVG title regression |
| `git diff --check` | Passed; existing line-ending notices only |
| Fresh production chart console | No errors after hydration fix |

## Phase 3 files changed

- `src/app/layout.tsx` — import page-scoped Phase 3 stylesheet only.
- `src/app/phase-three.css` — new scoped Market Research presentation.
- `src/app/page.tsx` — Overview hierarchy, compact header, explicit factor level/change presentation.
- `src/components/chart-explorer.tsx` — contained instrument date, accessible indicator labels/dots, plot sizing and last-visible annotation.
- `src/components/explorer-research-rail.tsx` — compact existing metrics/context and real asset-specific analogue outcomes.
- `scripts/test_phase_three.mjs` — focused regression checks.
- `docs/design-review/phases/phase-3/` — this report and before/iteration/final evidence.

## Status

Phase 3 complete locally. Existing quantitative methodology and Phase 1/2 baselines preserved. Production preview remains available at `http://localhost:3001`. No commit, push or deployment performed.
