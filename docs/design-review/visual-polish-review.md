# Visual QA and refinement

Scope: Overview, SPX Chart Explorer and the supplied saved DGS10 forecast. Canonical composition retained; no new capabilities, routes, backend or methodology changes. Frontend-design guidance informed restraint, hierarchy and consistent spacing.

## Before / reference comparison

| Area | Observed gap against canonical reference | Refinement |
|---|---|---|
| Shell | 56px topbar / 64px rail already appropriate; selected state had competing border rules | Quiet selected background retained; no added destinations or shell layers |
| Chart Explorer | Nested factor/period rectangles crowded the rail; toolbar and instrument switch had heavy outlines | Removed inner card borders, tightened rows and header spacing; controls and interactions retained |
| Chart hierarchy | Main plot already dominant at roughly 73% width; lower cards occupied excessive height | Preserved plot dimensions and rail width; analytics reduced to 180px with compact internal padding |
| Overview | Six factor tiles were too heavy relative to the chart | Reduced tile height and inner border weight; percentile bars remain real summaries |
| Overview alignment | Chart extended well below right rail | Reduced chart-height cap by 30px; three lower panels gain visibility |
| Forecast | Rail dictated a 525px validation row, leaving empty space below the left chart | Compact verdict padding, 29px model rows and tighter settings; row now about 438px |
| Forecast fan | Fixed SVG aspect ratio centered a narrow plot inside a wide panel | ResizeObserver now sizes SVG coordinates to the actual panel, including axes and pointer-date mapping; text proportions retained |
| Forecast diagnostics | Began around y=934, beyond 900px viewport | Begin around y=827 after refinement; readable beginning at 1440 and substantial diagnostics visible at 1920 |
| Containment | Main metadata was already inside panels | Dates, model names, readouts, timeline and actions retained in existing surfaces; no one-string cards added |
| Copy | Research action subtitles added height without aiding selection | Removed them visually; destination labels remain explicit |

## Viewport review

1920×1080 and 1440×900 captures saved for all three requested routes. Browser CSS height at the smaller setting reports 901px due to zoom rounding; exported images use the requested 900px. Browser capture overscan/repeated tiles were normalized to the first complete visible viewport; no component-only crops or synthetic page images used.

At both widths, charts remain dominant, rails are usable and no horizontal document overflow was measured. Overview's lower analytics are visible. Chart Explorer's lower analytics are visible at 1920; at 1440 the first viewport shows their headers and the rest follows naturally. Forecast diagnostics now begin in the first viewport at both targets. No text was globally reduced to force the fit.

## Remaining differences from references

- The reference contains unsupported AI claims, targets, indicators, market-regime probabilities, rolling Sharpe and correlation panels. Existing real research occupies those positions.
- Factor summaries use historical percentile bars rather than sparklines. No new data or calculations were introduced.
- Saved forecast validation has horizon-spaced evaluation points (24 origins here), so its line is sparse. It is not interpolated into a daily backtest.
- Forecast fan shows the saved model's single configured interval, rather than invented 80% and 95% layers.
- Existing chart axes and controls are preserved; the references' axis placement and indicator chips are not copied exactly.
- Some lower content still requires scrolling at 1440×900. This is an intentional readability tradeoff.

## Screenshot paths

All paths are repository-relative:

| Page | Before 1920 | After 1920 | Before 1440 | After 1440 |
|---|---|---|---|---|
| Chart | current/chart-1920.png | final/chart-1920.png | current/chart-1440.png | final/chart-1440.png |
| Overview | current/overview-1920.png | final/overview-1920.png | current/overview-1440.png | final/overview-1440.png |
| Forecast | current/forecast-1920.png | final/forecast-1920.png | current/forecast-1440.png | final/forecast-1440.png |

Paths above are under docs/design-review/.

## Validation

- npm run lint: passed.
- npm run typecheck: passed.
- npm run build: passed on final source.
- npm run test:visual: passed.
- npm run test:context: passed, including real database-backed routes.
- npm run test:market: passed, SPX / GLD / IEF, six intervals, chart interaction and fail-closed checks.
- npm run test:forecast-ui: passed after responsive chart correction.
- npm run test:forecast: passed for DGS10, SPX, inflation and GDP, saved reload/idempotency, authorization, failures and insufficient history. These integration tests create normal saved test runs.
- Python pytest: 75 passed, one existing Starlette/httpx deprecation warning.
- Browser console error scan on final forecast: no errors.

No push. No deployment. Local production server remains at http://localhost:3001.
