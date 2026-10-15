# KanzQuant Visual Spec

These assets define the canonical visual direction for future KanzQuant frontend redesign work.

## Global rules

- The three full-page images in `00-full/` are the canonical visual references.

- The micro-crops are implementation references for specific components.

- The KanzQuant brand should be **text-only**. Ignore decorative/logo icons visible in mockups.

- Use one consistent SVG line-icon system rather than raster icon files.

- Dates, metadata, timestamps, filters, labels, and actions should live **inside** their relevant panels.

- Only page title and optional subtitle may generally sit outside panels.

- Visual composition is authoritative; fake/generated data in mockups is **not**.

- Preserve KanzQuant real data, routes, and functionality; do not invent unsupported features merely because a mockup shows them.

## `01-shell/topbar.png`

**COPY**

- compact near-black top bar

- text-only KanzQuant wordmark

- large restrained search field

- tight utility controls

- subtle borders and spacing


**DO NOT COPY BLINDLY**

- decorative logo symbol

- excess header rows

- floating metadata outside containers


## `01-shell/sidebar-icons.png`

**COPY**

- quiet dark navigation rail

- clean line icons

- selected state with blue icon and deep blue background

- small labels and generous vertical rhythm


**DO NOT COPY BLINDLY**

- mixed icon styles

- chunky raster icons

- noisy chevrons or decorative extras


## `01-shell/search-and-controls.png`

**COPY**

- balanced search-to-controls ratio

- compact timeframe pills

- simple dropdowns and utility buttons


**DO NOT COPY BLINDLY**

- oversized controls

- multiple fragmented toolbars


## `02-chart/instrument-header.png`

**COPY**

- large instrument identity

- dominant current value and change

- secondary tags/metadata inside same header

- all header data contained in the main chart panel


**DO NOT COPY BLINDLY**

- placing dates or readouts outside the container

- tiny timid hierarchy


## `02-chart/chart-toolbar.png`

**COPY**

- indicator chips

- compact buttons with subtle borders

- dense but clean toolbar rhythm


**DO NOT COPY BLINDLY**

- too many rows before the chart

- helper text clutter


## `02-chart/chart-style.png`

**COPY**

- dominant chart surface

- subtle gridlines

- high-contrast primary data

- professional dark plotting area


**DO NOT COPY BLINDLY**

- small chart area

- over-boxing within the plot region


## `02-chart/volume-and-axis.png`

**COPY**

- integrated volume strip

- clean axis treatment

- good alignment between plot and scale


**DO NOT COPY BLINDLY**

- detached volume widgets

- misaligned axis labels


## `03-right-rail/insight-card.png`

**COPY**

- stacked compact insight cards

- clear title hierarchy

- supporting text inside self-contained panel


**DO NOT COPY BLINDLY**

- fake AI claims not supported by KanzQuant

- panels with floating labels outside


## `03-right-rail/forecast-card.png`

**COPY**

- compact single-purpose forecast card

- clear value hierarchy

- small supporting mini-chart


**DO NOT COPY BLINDLY**

- invented metrics if unsupported

- large prose-heavy blocks


## `03-right-rail/analogue-rows.png`

**COPY**

- dense row-based historical analogues

- tiny contextual spark paths

- right-aligned outcome values


**DO NOT COPY BLINDLY**

- giant analogue cards

- uncontained section titles


## `04-bottom-analytics/rolling-volatility.png`

**COPY**

- compact analytics card

- small title plus headline metric

- clean mini time-series


**DO NOT COPY BLINDLY**

- too much descriptive text

- oversized legends


## `04-bottom-analytics/rolling-sharpe.png`

**COPY**

- paired comparison lines

- headline metric in card header

- tight internal padding


**DO NOT COPY BLINDLY**

- unnecessary footer details


## `04-bottom-analytics/distribution.png`

**COPY**

- simple distribution chart

- few supporting stats

- readable axes and labels


**DO NOT COPY BLINDLY**

- multiple nested containers


## `04-bottom-analytics/correlation-matrix.png`

**COPY**

- compact readable heatmap

- thin internal grid

- high contrast numeric cells


**DO NOT COPY BLINDLY**

- oversized captions and descriptions


## `05-overview/factor-summary.png`

**COPY**

- stacked factor summary modules

- compact sparkline usage

- clear semantic color coding


**DO NOT COPY BLINDLY**

- oversized cards with too many competing elements


## `05-overview/similar-periods-table.png`

**COPY**

- table-like analogue summary

- compact row rhythm

- clear alignment of similarity and outcomes


**DO NOT COPY BLINDLY**

- dense text blocks

- floating dates


## `06-forecast/verdict.png`

**COPY**

- prominent verdict banner

- single main conclusion

- concise explanation inside panel


**DO NOT COPY BLINDLY**

- multiple equal-priority messages


## `06-forecast/model-comparison.png`

**COPY**

- clean comparison table

- strong numeric hierarchy

- secondary date range contained in header


**DO NOT COPY BLINDLY**

- raw technical clutter outside the card


## `06-forecast/forecast-fan.png`

**COPY**

- large forecast fan chart

- confidence bands with clean layering

- contained legend and metadata


**DO NOT COPY BLINDLY**

- shrunken forecast chart

- metadata floating above/below without container


## `06-forecast/diagnostics.png`

**COPY**

- compact diagnostics surfaces

- tabular statistical readout

- simple supporting chart


**DO NOT COPY BLINDLY**

- long prose explanations

- detached labels
