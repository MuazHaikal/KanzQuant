# Canonical visual pivot — local review

Reference pack installed at docs/design-references: 23 PNGs and three Markdown documents. All reference images opened and inspected before implementation.

The frontend-design skill informed the graphite surface hierarchy, blue interactions, consistent panel treatment and chart-first composition. The supplied reference takes priority over the previous teal visual system.

Shell: text-only wordmark, 56px topbar, 64px labeled navigation rail, Lucide 20px / 1.7 stroke, no permanent ticker or journey. Chart Explorer contains instrument identity, range, command bar, plot, state strip and historical readout in one surface. Existing linked domains, candles, volume availability, compare/context/events and saved controls retained.

Overview: large contained market chart; six factor-position modules; aligned historical periods and real forward outcomes; three analogue-return distributions below. Forecastability: validation chart and right verdict/model table/settings; full-width forecast fan with contained metadata; rolling error, stationarity/residual summary and interval coverage below. Exact advanced output remains expandable.

Production build reviewed locally at port 3001. Chart Explorer and Overview screenshots inspected at 1920×1080 and 1440×901. Forecast reviewed via screenshot at the smaller desktop size and DOM geometry at both targets; full-page forecast capture intermittently times out in the browser extension. No horizontal overflow measured at either size. Lower forecast diagnostics continue below the fold.

Validation: lint, TypeScript, production build, test:context, test:market, test:forecast-ui, test:visual and test:forecast passed. Python: 75 passed, one existing Starlette deprecation warning. First route-test attempt used a stale running production server during a build; restarted on the completed build and reran successfully. Forecast integration tests created their normal saved research runs.

No backend or statistical-methodology changes. No push or deployment. Existing unrelated README and analyst-source audit edits preserved.
