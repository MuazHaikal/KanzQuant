# KanzQuant v0.2 / local verification

Verified 6 October 2026 against the local production server at `http://localhost:3001` and real Neon-backed research dated 30 September 2026. No deployment, push or release was performed.

## Checks

- Python: 30 tests passed, including known null/effect/relationship cases, reference SciPy tests, reproducible resampling, AND logic, calendar gaps, prior-only ranks, outcome-independent spacing, manual-method consistency, insufficient samples and BH adjustment.
- Real-data integration: SPX conditional, SPX regression, GLD insufficient sample, IEF AND/full-baseline; all four horizons via robustness; strict API rejection; exact saved-result reopening/repetition; session/family FDR including unestimable attempts.
- Existing Focus, context and market suites passed; all six factors, four return-detail routes, analogue, regime and market routes remained valid.
- ESLint, TypeScript and production build passed.
- Database verification: 10 tables, 7 named indexes, 82 constraints; transactional read/write probe rolled back successfully. No schema migration was required.
- Source-equivalence audit: 239 real monthly observations, existing FRED release-lag semantics and 2,868 exact calendar forward-return alignments checked. No fabricated future outcomes.
- Integration before/after counts confirmed existing raw FRED rows, market rows and macro research runs were unchanged. New hypothesis runs/results and one shared frozen monthly data version are the only research additions.
- Complete stored conditional and relationship outputs were reproduced using the read-only reproduction command.
- Browser workflows: conditional builder → run → robustness/cases/technical/diagnostics; case pagination and historical analogue drill-down; Credit Focus tabs → TEST THIS prefill → honest insufficient-sample result; relationship mode → regression → scatter/fit; recent ledger → exact saved result.
- Desktop visual QA: 1440×901 (approximately the requested 1440×900) and 1920×1080, light and dark. No horizontal page overflow. KQ square removed; top provenance/date retained. Fresh-page QA caught an SVG tooltip hydration mismatch; tooltip children were replaced with complete single text nodes and a server-rendered tooltip regression assertion was added. Both histogram and scatter fresh loads were rechecked after repair.

## Performance

Measured complete API responses, including data preparation, compute and persistence:

| Run | Time |
| --- | ---: |
| First cold conditional request, during concurrent existing-suite checks | 12.93 s |
| Final rebuilt cold conditional request | 8.23 s |
| Final warm SPX relationship | 2.40 s |
| Final warm GLD insufficient sample | 2.28 s |
| Final warm IEF AND condition | 2.34 s |

These are local network measurements, not a universal latency guarantee. Five-minute prepared-data caching avoids rebuilding or fetching provider data on each request. UI displays RUNNING TEST, and worker/database/client timeouts bound failures.

After the tooltip repair, Python tests (30), lint, TypeScript, production build and real-data Hypothesis integration were rerun successfully. Fresh production histogram/scatter loads in saved themes had no new browser warnings/errors, and the production server emitted no tooltip warnings.

## Saved inspection examples

- Conditional with nearby threshold checks: `/hypothesis/42036557-968c-4b6a-8316-bb5581f761a1` (Credit signed 3M change ≤ prior P50; illustrative exploratory QA run, not a selected trading rule).
- Same run: `?view=robustness`, `?view=cases`, `?view=technical-output`.
- Browser-completed relationship: `/hypothesis/69ced6c8-ac0f-4bff-b747-d62be8b81baa`.
- Honest default P10 insufficient sample: `/hypothesis/ff7b4006-e349-44a7-acf1-14b0af6481a6`.
- Null conditional: `/hypothesis/8a56e30c-481b-4c3a-ac70-7399133e61d1`.
- Contextual entry: `/focus/factor/credit`.

## Boundaries

Existing feature, regime, similarity, semantic-axis and market/forward-return calculation files were not changed. Residual serial dependence and exchangeability remain limitations despite non-overlapping sampled outcomes. FRED inputs are revised data with simplified release lags, not vintage observations. Regime labels are full-history descriptive context only. Evidence labels use raw statistics; family FDR is explicitly separate and updates as new attempts join the family. Pre-specified is not locked preregistration. The interface searches the latest 40 runs; older IDs stay directly reopenable.

The project Python/SciPy environment is required for local Hypothesis Lab compute. A stock Vercel Node function cannot execute this Python worker. Arrange a Python-capable backend before any future v0.2 deployment; this verification does not certify a deployed v0.2 compute architecture.
