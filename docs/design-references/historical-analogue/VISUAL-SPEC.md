# Historical Analogue Visual Spec

## Core composition

- Large Episode Comparison workspace on the left.
- Analogue Summary rail on the right.
- Three compact evidence panels below the main comparison chart.
- All panel-specific controls, legends, dates, scores, and metadata remain inside their relevant panels.

## Episode Comparison

- Provide CANDLES / COMPARE segmented modes when supported.
- Keep comparison legend and normalization control in the panel header area.
- Current episode and historical analogue must be visually distinct.
- The comparison chart is the dominant analytical surface.

## Analogue Summary

- Lead with the similarity score, then the underlying similarity dimensions.
- Show similarity as descriptive historical matching evidence, not a prediction.
- Keep macro-state alignment compact and directly comparable between current and analogue periods.
- Forward outcomes must be labeled as historical outcomes from the analogue start, never expected returns or price targets.

## Lower evidence row

- Factor-by-factor similarity: compact ranked table/bars.
- Conditional outcome distribution: empirical distribution with sample count and summary statistics.
- Event timeline: aligned current-vs-analogue episodes with concise contextual notes.

## Statistical integrity

- Surface sample size whenever a distribution or historical outcome aggregates multiple episodes.
- Confidence intervals should be shown when calculated.
- Do not describe a single analogue's realized forward return as statistically significant by itself.
- If statistical significance is calculated for a conditional distribution, use KanzQuant's standard significance language and expose n, effect, CI, and p-value.

## Visual rules

- Dark graphite surfaces, subtle borders, compact typography.
- Blue = current episode / primary interaction.
- Red/pink = selected historical analogue where comparison requires contrast.
- Green = positive historical outcome or strong similarity where semantically appropriate.
- Avoid excessive prose and nested boxes.
