# KanzQuant Equities Discovery Micro Reference Pack

Target repo path for Codex:

`docs/design-references/equities-discovery/`

Use `00-full-equities-discovery.png` for overall composition and the numbered micro-images for component-level implementation.

This page is for **systematic stock discovery**, not recommendations. Preserve real data and avoid labels such as “best stocks” or “buy now”.

## Core layout

- Page header and stock search at top.
- Preset research views immediately beside the search.
- `Interesting Now` is the dominant left-side table.
- Right rail contains breadth, sector leadership, and unusual setups.
- Bottom row contains cross-sectional distribution, sector performance, and drawdown/recovery analysis.

## Important behavior

- Tables should remain dense and workstation-like.
- Sorting should be explicit in the active column header.
- Positive/negative colors are semantic, not decorative.
- Clicking a ticker should open the stock research page.
- Presets are deterministic research views, not AI recommendations.
