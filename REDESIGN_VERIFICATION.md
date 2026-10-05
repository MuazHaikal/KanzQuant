# KanzQuant v0.1.2 — local redesign verification

Verified 5 October 2026. **Not deployed, pushed or committed.** The local production server is available at http://localhost:3001.

## Delivered

- Readable Geist Sans UI, shared dark/light design tokens, compact rectangular panels and aligned tabular numbers.
- Overview fits approximately 1440×900 without vertical research scrolling: deterministic Current Read, stable factor attention rows, closest analogues, SPX/regime history and essential conditional outcomes.
- Factor levels and 1M/3M/12M movement are separately contextualized. Percentiles, thresholds, minimum history, trend/reversal rules and limitations are documented in the interface and README.
- Exact arithmetic component contributions, similar-state / similar-change episodes, historical distributions and related-factor context.
- Continuous fractional-domain charts: cursor-centered wheel zoom, drag/horizontal-trackpad pan, reset, presets, crosshair and historical inspection. No range sliders; gestures do not fetch data or run research. Factor windows survive related-factor navigation.
- Signed analogue similarity terms, normalized-to-100 asset paths, complete return distributions and individual outcomes.
- Persisted appearance preference and simple factor/series/date/module search. Keyboard-accessible tooltips, chart controls and native drill-down links.

## Verification evidence

| Check | Result |
| --- | --- |
| Python | 13 tests passed |
| ESLint | Passed, no errors or warnings |
| TypeScript | Passed |
| Production build | Passed on installed Next.js 16.3.8 |
| `npm run test:context` | Passed: level ties, move ranks, all three horizons, missing months/history, minimum sample, exclusion of future movements, continuous pan/zoom boundaries and wheel intent |
| Real Neon context | All six factor mappings match persisted research; all 3M contribution sums verified; 235 prior 3M changes per factor |
| `npm run test:focus` | Passed: all 13 focus routes, five invalid-route 404s, real persisted histories and fail-closed database-only behavior |
| Visual QA | Dark/light Overview and Growth Focus, Analogue Focus and Return Focus inspected at approximately 1440×900 and 1920×1080 |
| Production browser console | No errors or warnings observed |
| Interaction QA | Mouse wheel zoom, drag pan, horizontal gesture pan, small vertical scroll without range change, double-click/Home reset, +/- zoom, point selection and analogue link verified |
| Workflow QA | Factor window persistence, similar-change toggle, browser back, related-factor arrow shortcut, Escape, keyboard tooltip, theme persistence after reload and factor/series/date search verified |

The daily-comprehension check is supported by plain historical level labels, separate move-rarity labels and understated attention markers. Current credit is historically very low, but its actual 3M move is Typical; no unusual deterioration was invented to match the mockup. Rates and inflation have Notable 3M moves. Technical methodology remains behind disclosure/tooltips.

At 1440×900, dense Growth Focus needs a short vertical scroll for its final related rows / market-response rows; the primary state, all three movement ranks, chart, drivers and episodes are above the fold. At 1920×1080 its complete default research layout is visible. Overview fits both targets.

## Data integrity / scope

No Python research engine, feature definitions, clustering, full-state cosine method, release lags, episode-spacing rules or stored research snapshots were modified. New movement context uses persisted real histories. No new dataset, module, external library, AI service or account feature was introduced. Database integration tests are read-only. Environment files and secret values were not exposed or changed.

Wheel devices have no universal browser mouse/trackpad discriminator. Small smooth vertical movements are left to page scrolling; Shift-wheel provides an explicit zoom fallback. This limitation is disclosed rather than hidden.

## Approval URLs

- Overview: http://localhost:3001/
- Factor Focus: http://localhost:3001/focus/factor/growth
- Analogue Detail: http://localhost:3001/focus/analogue/2025-09-30
- Return Detail: http://localhost:3001/focus/returns/12m

Deployment and push remain on hold for visual approval.
