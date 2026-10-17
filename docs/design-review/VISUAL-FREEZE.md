# KanzQuant canonical visual freeze

Frozen locally on 17 October 2026 after Phase 5.

**THE CANONICAL VISUAL MIGRATION IS COMPLETE.**

Future work must reuse this system. Do not redesign completed pages without a clear product reason. This freeze does not authorize a commit, push, or deployment.

## Shell and spacing

- Topbar: 52px. Sidebar: 180px expanded, 64px collapsed; stable across routes. Navigation rows: 46px expanded, 57px collapsed. Lucide SVG icons: 19px, 1.7px stroke in the shared navigation.
- Desktop page gutter: 16px vertically, 18px horizontally. Main panel gaps: 12px; dense Evidence/Study arrangements retain their established 10px gaps.
- Panel radii: restrained 7–8px. Panel body padding generally 10–14px. No decorative gradients, marketing cards, generated bitmap icons, or ornamental animation.

## Palette

| Token | Dark value | Meaning |
| --- | --- | --- |
| Background | `#05080c` | Workspace |
| Surface 1 / 2 / 3 | `#080e15` / `#0b121a` / `#0e1721` | Panel hierarchy |
| Subtle / strong border | `#182432` / `#253449` | Containment, controls |
| Primary / secondary / muted text | `#f3f6fa` / `#a4b1c2` / `#6f7d90` | Content hierarchy |
| Blue | `#2377ff` | Selection and primary interaction |
| Green | `#25d69b` | Positive signed results, where appropriate |
| Red | `#f34f5e` | Negative signed results, where appropriate |
| Amber | `#e8aa45` | Warnings and insufficient evidence |

Use existing theme variables, including the existing light theme. Purple remains an established secondary-series color. Green/red must never silently mean buy/sell.

## Typography and controls

Geist Sans is the established interface font; Geist Mono is reserved for numeric/technical contexts. Retain tabular numerals in tables and metrics. Page titles are generally 23px; instrument titles 24–28px; key values 24–30px; panel titles 13px; body/table content 12px; metadata 10–11px. Do not shrink primary analytical text to force a layout.

Search and filter controls: 32px; global search: 34px. Compact chart tools/range selectors: 27–28px. These are intentional density tiers, not competing button systems. Keep native labels or accessible names, visible keyboard focus, and pressed/selected states.

Panel headers: minimum 38px, approximately 9–10px vertical and 12px horizontal padding, 13px title, 10–11px secondary metadata. Permit wrapped metadata rather than clipped text. Small embedded chart summaries may retain their established compact headers.

## Tables and scrolling

Use 11px headers, 12px body, subtle row separators, restrained hover and blue selected/sorted state. Align numbers right; names and explanatory fields left. Compact single-line rows and 43–49px two-line research rows are intentional. Sort buttons must expose their column and current direction with `aria-sort` on the header.

Long catalogue, evidence, case, and screener tables scroll internally with sticky headers. A table's minimum width must not enlarge the browser page: use a `minmax(0,1fr)` parent and an internal overflow container. Catalogue has a keyboard-focusable region supporting arrows, Page Up/Down, Home/End. Its detail rail scrolls independently when shorter desktop heights constrain it.

## Numeric and date formats

Use en-US thousands separators. Prices normally use two decimals; returns and volatility generally one decimal in compact equity tables; existing two-decimal historical-outcome summaries remain intentional. Composite levels/z-scores use two decimals; percentiles use `P91`; large currency uses established B/M abbreviations. Normalize rounded signed zero to zero in general display helpers. Preserve the extra precision necessary to avoid misrepresenting tiny forecast error differences.

p-values use four decimals or a small-value threshold; confidence intervals show clearly labelled endpoints. Nonfinite/missing values render Unavailable, Not applicable, N/A, or an established em dash—never raw NaN, undefined, null, or Infinity.

Use `YYYY-MM-DD` for research dates, catalogue coverage detail, data cutoffs, filing dates, and analogue tables. Compact chart axes may use month/year or relative offsets. Existing candle tooltips may use a readable day/month/year date; do not replace chart engines solely to unify axis typography.

## Research semantics

Effect direction is separate from evidence quality. A negative statistically significant effect may be red with an explicit significance label; it does not mean unreliable evidence. Neutral/non-significant results remain neutral; insufficient evidence is amber. Forecast error improvements require the existing matched-origin baseline logic, not a generic sign-based success color.

Similarity is cosine alignment, not probability. Regime strength is distance-based, not calibrated confidence. Conditional historical outcomes are descriptive, not forecasts. Maintain concise disclosures and collapsed methodology/technical sections. No methodological calculations changed in Phase 5.

## Chart hierarchy and responsive rules

The dominant chart/table comes first, context sits beside it, supporting analytics sit below. Future forecasts remain secondary to out-of-sample validation. Preserve real series units, observed data domains, actual sample sizes, and missing-history gaps.

At 1920×1080 and 1440×900, retain the primary analytical surface and stable shell. Wrap lower analytics before shrinking text. Allow internal horizontal table scrolling. At narrower breakpoints, stack the existing rails; do not require every tertiary panel above the fold.

## Freshness and state rules

`Macro research built` identifies the saved macro research snapshot timestamp—not equity-price freshness. Market price dates, observation dates, SEC filing dates, ingestion times, and research data cutoffs are distinct labels.

Catalogue freshness is the calendar age of the latest valid stored observation. Its conservative age warnings are not a certified provider-release calendar: daily 7, weekly 21, monthly 75, quarterly 180, annual 550 days. Fundamental age refers to period end and is neutral; filing date is shown separately. Availability is backed by finite observation counts or stored quarter records, never an invented completeness score.

Loading states are compact and contain no fake results. Empty states explain the active absence and offer a relevant reset. Provider/database errors must be sanitized with a retry action, never SQL, secrets, or stack traces. Maintain semantic status/alert regions and collapsed technical metadata.

## Evidence

The final 22 viewport images are in `docs/design-review/final/`. The scope, checks, single final refinement loop, remaining intentional differences, and exact test results are recorded in `docs/design-review/phases/phase-5/REPORT.md`.
