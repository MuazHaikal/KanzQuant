# KanzQuant Equity Chart Indicator Micro Reference

Use these files only for the equity/stock research chart indicator implementation.

## Exact target controls

The equity chart should support these visible indicator controls:

- SMA 20
- SMA 50
- Bollinger Bands (20, 2)
- Volume

`00-target-indicator-toolbar.png` is the exact requested control set. The original full reference used SMA 50 + SMA 200 + Bollinger + Volume; for the equity page, replace SMA 200 with SMA 20.

## Visual behavior

- Indicators appear as compact removable chips inside the chart panel header/toolbar.
- Keep the toolbar on one compact row at normal desktop widths.
- The main price chart remains visually dominant.
- SMA 20 and SMA 50 should render as distinct, restrained overlay lines.
- Bollinger Bands (20, 2) should render as upper/lower bands with a subtle translucent fill between them.
- Volume should render as an integrated histogram at the bottom of the same chart surface, not as a detached card.
- Use red/green volume bars based on session direction where the chart implementation supports it.
- Axes, gridlines, crosshair, zoom/pan, range controls, and existing saved-view behavior should remain intact.
- All indicator labels and controls belong inside the chart container.

## Defaults

For the equity research page, enable by default:

1. SMA 20
2. SMA 50
3. Bollinger Bands (20, 2)
4. Volume

If existing saved-view/user preference logic overrides defaults, preserve the user's saved state after initial load.

## Do not

- Do not add SMA 200 by default for the equity page unless already saved by the user.
- Do not fake indicator values.
- Do not calculate indicators from unadjusted/inconsistent price series if the rest of the chart uses adjusted data.
- Do not create a second charting system if the existing KanzQuant chart engine can be extended.
