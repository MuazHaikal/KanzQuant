# KanzQuant Evidence Library Micro Reference Pack

Extract this folder to:

`docs/design-references/evidence-library/`

The Evidence Library is a **read-only public research browser** for precomputed studies.

Users can search, filter, sort, inspect and open stored studies. They do not run new tests from this page.

## Primary references
- `00-full-evidence-library.png` — overall page composition
- `01-library-header.png` — page title / precomputed research summary
- `02-filter-bar.png` — Universe, Theme, Horizon, Reliability, Significance, Sample Size
- `03-library-search-and-sort.png` — search + sort behavior
- `04-studies-table.png` — dense research table
- `05-study-row-detail.png` — row-level information hierarchy
- `06-reliability-score-cell.png` — reliability/evidence score treatment
- `07-significance-and-sample-cells.png` — significance and sample states
- `08-sort-states.png` — sortable column states
- `09-internal-scroll-table.png` — sticky header + internal table scroll
- `10-reliability-distribution-and-themes.png` — supporting analytics rail

## Behavioral rules
- Default to strongest evidence/reliability first only if the score is mathematically documented.
- Otherwise use adjusted p-value ascending, then sample size descending.
- Significance is separate from reliability.
- Long study lists scroll inside the table/card, not the whole page.
- Clicking a study opens a Study Focus subpage.
