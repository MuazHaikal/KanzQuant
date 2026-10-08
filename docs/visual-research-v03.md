# KanzQuant v0.3 — Visual Research UX verification

Presentation-only redesign, verified locally and released to production on 9 October 2026.

## Visual system

Shared CSS/SVG primitives: HistoricalPositionBar, MoveIntensityBar, DistributionStrip,
ConditionalDiagram, EvidenceMeter, ContributionBars, OutcomeHorizonTiles,
SimilarityStrip, and EffectIntervals. No new chart dependency.

The frontend-design pass prioritised compact institutional layouts, shared visual
semantics, empirical rather than fitted distributions, and progressive disclosure.
Overview has six factor tiles, the unchanged top-three priority signals, similarity
bars, historical outcome tiles, and the existing market chart. Factor Focus has
level/movement/distribution headers, signed contributions, ranked episodes, and a
return heat grid. Test an Idea has live AND merges, accurate comparison branches,
categorical evidence, zero-centred intervals, and visual threshold/horizon checks.
Cases and complete technical output remain inspectable. Disabled future navigation
has been removed; existing routes are retained.

## Methodology and data

No changes to research/, src/lib/, migrations/, or services/. Factor definitions,
coefficients, axes, priority ranking, similarity, temporal exclusions, sampling,
returns, permutation/bootstrap inference, FDR, and evidence classification remain
unchanged. Existing Neon-backed data is used; no datasets or capabilities added.
Integration tests confirmed unrelated source-data row counts remained unchanged.
Test runs were persisted through the existing research workflow.

## Checks passed

- Python: 50 tests passed (one existing Starlette/httpx deprecation warning).
- Hypothesis, hypothesis-service, hypothesis-client, focus, context, market suites.
- Database verification: 10 tables, 7 named indexes, 82 constraints, pgcrypto;
  transactional read/write probe passed and rolled back.
- Added visual-component boundary/null/SSR tests: P10/P25/P75/P90/P99,
  exact move boundaries, categorical evidence, AND merging, actual group statistics,
  full-baseline overlap, empirical bins, symmetric intervals, missing data.
- ESLint, TypeScript, production build, and git diff whitespace checks.
- Browser-triggered production run completed with N=38 event / N=29 other periods,
  mean difference +2.16 pp, reproducing the saved deterministic result.

## Browser QA

All ten requested views inspected in both dark and light at desktop CSS viewports
1440 x approximately 900 (901 due to Chrome zoom rounding) and 1920 x 1080:

| View | 1440 dark | 1440 light | 1920 dark | 1920 light |
| --- | --- | --- | --- | --- |
| Overview | Pass | Pass | Pass | Pass |
| Growth Focus | Pass | Pass | Pass | Pass |
| Rates Focus | Pass | Pass | Pass | Pass |
| Credit Focus | Pass | Pass | Pass | Pass |
| Builder | Pass | Pass | Pass | Pass |
| Conditional result | Pass | Pass | Pass | Pass |
| Relationship result | Pass | Pass | Pass | Pass |
| Robustness | Pass | Pass | Pass | Pass |
| Cases | Pass | Pass | Pass | Pass |
| Technical Output | Pass | Pass | Pass | Pass |

Additional checks: keyboard activation of tabs and AND controls; immediate diagram
updates; Growth contribution/episode/outcome panels; accurate overlapping
full-history baseline warning and unavailable small-sample interval; approximately
375-pixel Overview, Growth, builder, and cases reflow without page-level overflow.
Text, signs, markers and accessible chart labels supplement colour.

Chrome occasionally timed out or produced tiled screenshot capture artifacts after
viewport changes. Captures were retried; DOM layout checks confirmed single page
headings and no page-level overflow. These were capture issues, not duplicated UI.

## Production links

- [Overview](https://kanz-quant.vercel.app/)
- [Growth](https://kanz-quant.vercel.app/focus/factor/growth)
- [Credit](https://kanz-quant.vercel.app/focus/factor/credit)
- [Builder](https://kanz-quant.vercel.app/hypothesis)
- [Conditional result](https://kanz-quant.vercel.app/hypothesis/678ff0ee-80b2-460e-8e39-92977c221774)
- [Robustness](https://kanz-quant.vercel.app/hypothesis/678ff0ee-80b2-460e-8e39-92977c221774?view=robustness)
- [Relationship](https://kanz-quant.vercel.app/hypothesis/0712c340-5230-46d1-9926-c84230ae3c05)

GitHub `main` is connected to the existing Vercel project `kanz-quant`. Public
verification confirmed the v0.3.0 label, database-backed content, healthy API,
and no visible demo labels on the principal research routes.
