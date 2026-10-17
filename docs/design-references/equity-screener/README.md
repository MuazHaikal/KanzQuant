# KanzQuant Equity Screener Micro Reference Pack

Canonical implementation references for the KanzQuant Equity Screener.

## Codex destination
Extract this folder into:

`docs/design-references/equity-screener/`

Codex should inspect `00-full-equity-screener.png` first, then use the numbered micro references when implementing each component.

## Important behavior
- Dense professional screener, not a generic SaaS form.
- Results table is the primary surface.
- Filters stay compact above the table.
- Numeric columns are sortable.
- Default sort should be the chosen primary research metric; where reliability exists, highest reliability first.
- Table/body scrolling should stay inside the results card when a fixed workstation viewport is used rather than forcing the entire page to grow indefinitely.
- Heatmap colors communicate relative/semantic values but must not replace the numbers.
- Use real KanzQuant data only; mockup values are visual references.
