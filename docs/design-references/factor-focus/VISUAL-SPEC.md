# Visual Spec — Factor Focus

## Canonical path

`docs/design-references/factor-focus/`

## Core composition

- Page title/subtitle at the top.
- Compact factor summary strip directly below.
- Large historical factor chart on the left.
- Driver contribution panel on the right.
- Bottom row: historical episodes, current-level distribution, related factors.
- Keep the historical chart dominant.
- Do not add a long narrative block before the chart.

## Factor summary

Show, when real data supports them:
- factor identity and concise description
- current level
- 1M change
- 3M change
- 12M change
- current state / percentile
- trend

All factor-specific metadata must remain inside the summary surface.

## Historical chart

- Show the factor time series prominently.
- Use percentile/history bands where supported.
- Current value marker should be visually obvious but not oversized.
- Time-range and interval controls stay compact.
- Avoid multiple toolbars stacked above the chart.

## Driver contribution panel

- Positive contribution bars extend right.
- Negative contribution bars extend left.
- Use semantic green/red only for signed contribution.
- Show contribution magnitude and share of recent move where available.
- Do not imply causal certainty when the method is attribution/correlation rather than structural causality.

## Historical episodes

- Dense sortable table.
- Include period, factor level, percentile/state, and forward outcomes where methodologically valid.
- State badges should be compact and semantic.

## Current level vs history

- Histogram/distribution of historical factor observations.
- Current level marker overlaid clearly.
- State percentile should be stated numerically.

## Related factors

- Compact table of related factors.
- Include correlation or other supported relationship measure, current level, percentile, and sparkline where available.
- Do not overstate correlation as causation.

## Containment

Dates, percentiles, legends, states, current values, actions, and methodology metadata belong inside the relevant panel headers or bodies. Avoid orphan text outside cards.

## Color

- Blue: primary series / interface selection.
- Green: positive signed movement/contribution.
- Red: negative signed movement/contribution.
- Amber/purple may distinguish factor categories or states.
- Gray: neutral/history/secondary context.

## Data integrity

Use real KanzQuant data only. Generated numbers visible in the reference are illustrative and must not be copied into production.
