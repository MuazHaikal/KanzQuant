# Equity chart indicator refinement

Reference pack extracted under docs/design-references/equity-chart-indicators. All five PNGs and VISUAL-SPEC.md were inspected. This is a contained chart refinement, not a new page design, provider integration or methodology change.

## Calculation and rendering

The chart's adjusted-close daily prices are the sole input. SMA20 and SMA50 use the most recent 20/50 valid observed sessions; SMA200 remains optional. There is no calendar filling. Invalid/nonpositive prices are excluded from rolling windows and yield null on their own row; fewer than the required valid observations yields null.

Bollinger (20,2) uses SMA20 as the middle and upper/lower = mean ± 2 × population rolling SD (ddof=0). A removable Welford mean/variance accumulator maintains numerical stability. Computation is memoized from already-loaded bars; no extra requests or persistence are introduced. The middle is drawn by SMA20 when enabled and remains visible as the Bollinger middle when SMA20 is removed.

Upper/lower boundaries are thin and muted; the band fill is 7.5% alpha and drawn behind price candles. Visible bands participate in price autoscaling. Integrated green/red volume bars use close versus open, with a maximum height of 15% of the drawable surface. The volume maximum is labeled on the existing right axis. Other MarketCanvas consumers retain their legacy layout unless they explicitly opt into the new band/fraction options.

## Interaction and saved state

First-visit defaults: SMA20, SMA50, Bollinger (20,2), Volume. Each chip has an accessible remove button. The compact Add Series / Indicator menu re-enables supported indicators and exposes optional SMA200. Range and save/restore controls remain inside the chart panel. Removing or adding indicators preserves the current zoom/pan domain.

Views are stored per symbol in the existing localStorage key, with a version-2 indicator list. Existing legacy saved SMA/volume choices are migrated without introducing Bollinger or removing an explicitly saved SMA200. Saved views are restored automatically after hydration and take precedence over defaults; Save view explicitly persists edits, while Restore view discards unsaved edits. Storage failures fail safely to defaults. No database or production environment changes are needed for indicators.

## Tests and visual QA

Run npm run test:equity-indicators for calculation, warm-up, short history, missing prices/sessions, large-value stability, no lookahead, defaults, toggles, versioned/legacy saved state, invalid storage, accessible server markup and actual canvas band/volume/domain-preservation tests.

Visual captures are stored in docs/equities/screenshots/indicator-review, with MU, AAPL and NVDA checked at 1920×1080 and approximately 1440×900. Final test and deployment outcomes are recorded in the task handoff.

Verified 2026-10-16: all three symbols rendered SMA20/SMA50, Bollinger and 753 visible volume bars on the default 3Y view. The toolbar remained one row at compact desktop width; no document-level horizontal overflow occurred. Browser-observed compact viewport was 1440×901, normalized to 1440×900 for PNG delivery. Captures: mu-1920.png, mu-1440.png, aapl-1920.png, aapl-1440.png, nvda-1920.png and nvda-1440.png in that directory.

Results: 13/13 indicator tests; 99 Python tests (one pre-existing Starlette/httpx warning); ESLint, TypeScript and production build passed. Existing market, equity, visual and Focus Mode suites passed. The final market renderer and equity integration suites were rerun after the volume-axis clipping fix. Legacy MU preferences were verified, edited through the visible toolbar, explicitly saved, then restored automatically on reload. Removing Volume preserved the exact zoomed domain 1834.800,2437.200; Restore/Home returned to the saved preset.

Deployment is authorized by the user's latest direct instruction, overriding the reference brief's earlier local-only status requirement.
