# Phase 1 — Shell + Research Core

Completed locally, 2026-10-17. This is a focused refinement of the completed migration, not a restart. No commit, push, deployment, secret changes or quantitative-methodology changes.

## Global shell

Refined the existing shared shell only: shorter top bar and navigation rhythm, a contained search icon, balanced utility buttons and one Lucide SVG line-icon language. Help and appearance no longer use text/Unicode glyphs. Wordmark remains text-only. No generated raster icons are used in production.

| Measurement | Before | After |
| --- | --- | --- |
| Top bar | 56px | 52px |
| Expanded sidebar | 180px | 180px |
| Collapsed sidebar | 64px | 64px |
| Expanded navigation row | 55px | 46px |
| Navigation icon | 20px | 19px, 1.7 stroke |
| Page gutters | 16px vertical / 18px horizontal | Unchanged |
| Global search | 38px input | 34px input, maximum 620px width |

Live measurements matched on Overview, Equities, Evidence Library, Study Focus, Forecastability and Data Catalogue: 52px bar, 180px sidebar, 46px rows and 16×18px gutters. Expanded/collapsed navigation was exercised; collapsed width remained 64px. No page-level horizontal overflow was observed at the requested desktop widths. Other page bodies were not redesigned.

## Evidence Library

The table remains the dominant read-only research surface. Compact precomputed status and default-order text replace repetitive explanation; policy/methodology prose is available through a contained disclosure. Existing evidence-category counts and themes remain secondary. No cosmetic reliability score was introduced.

Default sorting is unchanged: adjusted p ascending, sample n descending, then the existing robustness-agreement tie-break and deterministic ID. Missing adjustments follow. Existing search, universe/theme/horizon/significance/sample filters and sortable headings remain.

Columns retain study, theme, universe, horizon, evidence category, significance, sample n, effect/units, adjusted p, raw p, hit rate, updated date and Open. Saved-ID prefixes distinguish genuinely separate runs with repeated titles. The Open column is pinned inside the table; wide content can scroll horizontally without moving the browser page.

Rows are more compact, numeric values use tabular alignment, and effective sample size is explicit (`n = …`). Existing small-sample warnings remain. Significance uses consistent SVG/text states: significant negative effects red, significant positive effects green, non-significant neutral, insufficient amber. Direction and significance remain separate; a positive estimate alone does not make a result significant.

At 1440px the table viewport measured about 601px for over 6,700px of rows. Keyboard Page Down moved the internal table about 686px while its header remained sticky. Filters for GLD plus insufficient evidence were exercised, followed by opening a real saved Study Focus. Public prepare/run aliases still return HTTP 403 without internal authorization.

The completed study count changed from 120 in before captures to 126 after the requested existing research tests created their normal verification records. No older studies or raw data were deleted or cosmetically hidden.

## Study Focus

Title and short research subtitle sit on the page background; saved ID, completion date, cutoff and back action are contained in the evidence-summary toolbar. The conclusion remains immediately visible.

Removed the nested metric-card treatment. Primary metrics—sample n, effect, 95% interval and adjusted p—have stronger visual weight. Positive frequency, horizon, raw p and actual same-direction robustness counts are secondary. The existing heuristic evidence category is retained in settings and its criteria remain in methodology. There is no numerical reliability score.

The read-only condition/input → target diagram now shows exact tested logic without duplicating the means already shown in the comparison panel. Compact stored settings preserve target, cutoff, horizon, baseline, actual method/alternative, spacing and named-family correction. Full family names and technical output remain available behind disclosures.

Actual distribution/scatter data, means, baseline n, effect/interval graphic, robustness checks and included/excluded historical cases are preserved. The interval graphic now has a full-width row instead of being squeezed between fixed-width labels. Robustness labels wrap; at 1440px its 406px table fit without horizontal overflow. Cases retain internal scrolling and sticky headers.

Three real saved states were inspected before and after:

- Significant negative relationship: `69ced6c8-ac0f-4bff-b747-d62be8b81baa`, n=39, effect −8.82 pp/input unit, stored 95% interval −15.81 to −0.57, adjusted p=0.0187. Red direction styling does not imply an unsupported calculation.
- Non-significant positive estimate: `1cce5aad-3513-4240-9694-870edcb9ba31`, n=45, effect +0.72 pp, adjusted p=0.7766. Neutral, not green merely because the estimate is positive.
- Insufficient sample: `a67d6992-c8df-450e-8b74-bd6d81a86efe`, n=0; effect, interval and inference remain unavailable, with amber treatment. Missing percentage values no longer receive a stray percent suffix in the Study Focus summary/cases.

No p-values, intervals, BH adjustment, minimum samples, evidence thresholds, baselines, resampling, spacing or research engines changed. The new `evidenceTone` helper controls presentation only.

## Visual QA

All three reference folders' README and VISUAL-SPEC files were read. Full-page references and every supplied micro-image were opened, using contact sheets for component inspection. Before screenshots were captured before code changes.

| Surface | Before 1920×1080 | After 1920×1080 | Before 1440×900 | After 1440×900 |
| --- | --- | --- | --- | --- |
| Shared shell on Overview | [Before](before/shell-overview-1920.png) | [After](after/shell-overview-1920.png) | [Before](before/shell-overview-1440.png) | [After](after/shell-overview-1440.png) |
| Evidence Library | [Before](before/evidence-library-1920.png) | [After](after/evidence-library-1920.png) | [Before](before/evidence-library-1440.png) | [After](after/evidence-library-1440.png) |
| Study Focus | [Before](before/study-focus-1920.png) | [After](after/study-focus-1920.png) | [Before](before/study-focus-1440.png) | [After](after/study-focus-1440.png) |

Additional final state captures: [non-significant](after/study-not-significant-1440.png), [insufficient evidence](after/study-insufficient-1440.png). Files containing `iteration` document intermediate review, not final acceptance.

The loop included initial composition review, a second pass fixing squeezed intervals and offscreen Open actions, and final axis-spacing/connector cleanup. Final captures were reviewed against before/reference layouts. The screenshot exporter’s repeated overscan is removed with the existing viewport-normalization helper; output dimensions are 1920×1080 and 1440×900. Live smaller-viewport height is approximately 901px before normalization.

Remaining intentional differences: mock reliability numbers, analyst studies and cumulative strategy curves are not copied because no corresponding validated stored product exists. Real saved study titles, results and duplicate historical verification runs remain unchanged. Robustness stays a transparent table of available checks instead of a fabricated heatmap matrix. At 1440px the library's secondary analytics move below the table, and lower-priority wide columns may require internal horizontal scrolling. These are refinements, not pixel-identical reproductions of illustrative data.

## Tests — exact results

| Check | Result |
| --- | --- |
| Python research tests | **99 passed in 22.24s**, one existing Starlette/httpx deprecation warning |
| ESLint | Pass, no errors/warnings after correction of an intermediate syntax typo |
| TypeScript | Pass |
| Production build | Pass; final optimized Next.js build launched on port 3001 |
| `test:phase-one` (new) | Pass; positive/negative/neutral/insufficient semantics, primary/secondary hierarchy, read-only condition/target, missing values and compact-shell contracts |
| `test:evidence` | Pass; existing significance/sample/filter/default-sort checks, real completed ledger, Study Focus statistics/routing, 404 and public 403; rerun against final build |
| `test:guided` | Pass; navigation/compatibility routes, chart API, existing method/date/saved-view contracts |
| `test:focus` | Pass; six factor routes, four outcome horizons, market/regime/analogue routes, invalid 404s and real database mappings |
| `test:visual` | Pass; statistical visual components, exact group means, intervals, missing data and SSR accessibility |
| `test:context` | Pass; prior-only ranks, movement/date rules, real contribution identities, Overview and deep links |
| `test:hypothesis-client` | Pass; existing retry/resume/idempotent preparation state machine |
| `test:hypothesis` | Pass; real persisted results, small samples, family FDR, authorization, repeat/reopen and unchanged unrelated data |
| `test:hypothesis-service` | Pass; capability rejection, sanitized failure, healthy retry on same ID and one persisted result |
| `git diff --check` | Pass |

Browser acceptance also covered keyboard table scrolling, filters → saved-study navigation, expanded/collapsed sidebar, real significance states and shell measurements across six pages. React best-practices review kept the shared status components stateless, preserved memoized filtering and server/client boundaries, and retained semantic controls, aria labels and keyboard focus.

## Files changed in this phase

- `src/app/phase-one.css` — scoped refinement rules plus shared shell proportions.
- `src/app/layout.tsx` — load the Phase 1 refinement stylesheet last.
- `src/components/global-search.tsx` — contained Lucide search icon.
- `src/components/appearance.tsx` — Lucide Sun/Moon utility icons.
- `src/components/research-journey.tsx` — Lucide Help icon only in this phase.
- `src/components/evidence-library.tsx` — compact containment, status/sample/effect cells, existing policy disclosure.
- `src/components/evidence-status.tsx` — shared stateless semantic icons/labels.
- `src/components/study-focus.tsx` — conclusion/metric hierarchy, contained metadata, exact read-only logic and comparison layout.
- `src/lib/evidence.ts` — presentation-only evidence direction helper; statistical rules unchanged.
- `scripts/test_phase_one.mjs` and `package.json` — Phase 1 rendering/semantic regression test command.
- `docs/design-review/phases/phase-1/` — before, iterations, after and this report.

All pre-existing migration changes and unrelated user work remain intact. No page-specific redesign of Stock Research, Discovery, Screener, Chart Explorer, Overview, Forecastability, Factor Focus, Historical Analogue or Data Catalogue was performed.

## Status

Local production build available at http://localhost:3001/evidence. No commit. No push. No deployment. No production-secret changes.
