# Visual Spec — Equities Discovery

## Canonical path

Codex should extract this pack to:

`docs/design-references/equities-discovery/`

## Visual hierarchy

1. `01-page-header.png`
2. `02-stock-search.png` + `03-preset-research-tabs.png`
3. `04-interesting-now-panel.png`
4. `10-market-breadth-card.png` + `13-sector-leadership-card.png` + `18-recent-unusual-setups-card.png`
5. `25-discovery-lower-analytics-row.png`

## Interaction rules

- Search is for ticker/company discovery.
- Preset tabs should behave as compact deterministic research filters.
- `Interesting Now` should be sortable; the active sort state must be visible.
- Keep table row height compact and consistent with `24-table-rhythm-and-density.png`.
- Ticker names are clickable and route into the stock research page.
- The right rail should remain visually secondary to the main discovery table.
- On smaller desktop widths, lower analytics may wrap, but the main table remains first.

## Do not copy blindly

- Mockup values are examples only.
- Do not fabricate breadth, sector, or unusual-setup values.
- Do not turn descriptive rankings into BUY/SELL recommendations.
- Do not add unsupported news/options signals merely because a reference happens to show one.
