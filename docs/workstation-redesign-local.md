# Workstation redesign — local review

The visual direction uses near-black graphite surfaces, text-only KanzQuant branding, a 58px icon rail, restrained teal/blue accents, tabular numbers and shared panel/control/table tokens. The existing Geist fonts and chart infrastructure are retained; no packages were added.

Overview now places market history beside analogues, following the compact six-factor strip. Outcome distributions, unusual conditions and research entry points remain accessible. Chart Explorer has a dominant interactive chart, existing controls grouped into compact controls/disclosures, a current research-context rail, and real historical outcome analytics for supported assets. Factor, hypothesis, forecast, analogue, archive and data screens inherit the shared styling. Forecast model comparison and historical validation take precedence over collapsed diagnostics. Data names precede technical identifiers. Saved forecast/hypothesis runs can be opened from the run manifest.

No research Python, statistical logic, transforms, API logic or source observations were changed. New context panels reuse the existing snapshot; there are no new data providers, decorative data requests or fabricated outputs. Integration verification creates normal saved research results in the existing Neon store. Existing unrelated README and analyst-source-audit edits are preserved.

## Verification

- Python: 75 passed; one existing upstream Starlette deprecation warning.
- Focus/context/market integration: all six factors, source decomposition, analogue spacing, missing data, API validation and all three assets/six market intervals passed.
- Hypothesis integration and service: real conditional/relationship, small samples, AND/shared baseline, FDR, exact saved reopening, rejected capabilities/origins and same-ID failure recovery passed.
- Forecast integration: DGS10/SPX/inflation/quarterly GDP, real multi-step execution, saved reopening, idempotency and insufficient history passed.
- Forecast UI, visual components, guided frontend integration and client execution-state tests passed.
- Database verification: 10 tables, 7 named indexes, 82 constraints; rolled-back read/write probe passed.
- Browser: desktop Overview, market chart, forecast result, Explore, hypothesis result, factor history, analogue and catalogue visually reviewed. Chart keyboard date inspection, search, mobile drawer and dark/light controls checked. Layout measured at 1920×1080, 1440×901, 1000×901 and 390×845 without document overflow on the sampled chart/research screens.
- Explicit viewport screenshot exports can time out in the Chrome connector. Normal viewport captures work; DOM geometry and live controls were used for the explicit responsive checks.
- ESLint, TypeScript and production build passed. The local production build was opened again in Chrome; the final Chart Explorer review reported no console errors. The production web server remains on port 3001 and the local research API on port 8001.

Local only. No commit, push or deployment is part of this redesign.
