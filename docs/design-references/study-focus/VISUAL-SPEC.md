# Visual Spec — Study Focus

## Core hierarchy
1. Study title / short conclusion
2. Statistical significance banner
3. Reliability + sample + effect + CI + p-values + horizon + hit rate
4. Condition logic and research settings
5. Distribution / baseline comparison / robustness
6. Historical cases table

## Significance wording
Use precise language such as:
- `Statistically significant at 95% confidence`
- `Not statistically significant at the 5% significance level`
- `Insufficient evidence` when sample size/power is inadequate

Do not say `95% level of significance`; use `5% significance level` or `95% confidence`.

## Reliability
Reliability may combine robustness, sample adequacy, consistency, and statistical evidence, but should be transparently documented. Default library sorting can use descending Reliability Score.

## Scrolling
The page itself should remain stable where practical. Long historical-case datasets should scroll inside the table/card body with sticky column headers.

## Containment
Panel-specific dates, metrics, legends, filters, actions, and methodology belong inside their panels. Avoid orphan metadata.
