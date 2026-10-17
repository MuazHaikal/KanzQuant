# Equity Screener Visual Spec

## Composition
Use `00-full-equity-screener.png` as the full composition reference.

## Primary hierarchy
1. Equity Screener title and compact summary metrics.
2. Compact filter workspace.
3. Large sortable results table.
4. Supporting distribution and sector breakdown analytics.
5. Preset research views as a secondary right-side module.

## Table
- Dense row height.
- Sticky header when the table internally scrolls.
- Symbol/company remain easy to scan.
- Active sorted column receives subtle blue emphasis.
- Sort indicator must clearly distinguish ascending/descending.
- Positive cells use restrained green, negative cells restrained red, neutral cells dark/gray.
- Do not hide exact numerical values behind color.
- Avoid excessive card nesting.

## Filters
- Use compact controls and range sliders.
- Search spans most of the lower filter row.
- `Run Screen` is the primary action.
- Filters belong inside one contained filter surface.

## Scrolling
Reference `18-table-internal-scrollbar.png` for a contained vertical scrollbar. When table height exceeds the workstation allocation, scroll rows inside the table/card while preserving the page shell and table header.

## Supporting analytics
`15-screener-distribution.png` and `16-sector-breakdown.png` remain secondary to the table.

## Data integrity
Do not copy mock values. Use real database values, and render unavailable values as `—` rather than inventing them.
