# Overview and Chart Explorer composition pass

Scope: only Overview and Chart Explorer, with route-conditional shell chrome. Existing other-route visual changes from the first redesign remain untouched by this pass. No commit, push or deployment.

The two routes omit the global ticker and research journey. Chart Explorer uses an instrument identity/value/change row, one command bar, a dominant chart with aligned thin state history, three content-sized research blocks, and a coordinated evidence row. Interval and source frequency are named separately. Tools, factor overlays, search and saved views remain available without permanent rows. Research context and evidence respond to the selected series; DGS10 includes actual yield/3M basis-point change and related yield/inflation series. Similarity is explicitly market-state similarity.

Overview starts with its chart. Factor names, qualitative states and one percentile visual occupy the right rail, followed by dated analogues and actual 6M/12M SPX outcomes. Four existing analogue-return distributions sit below the hero, with historical medians and sample counts. No volatility/Sharpe metrics, models or synthetic widgets were added.

Browser review used 1920×1080 and 1440×901 (the connector's approximately 900px viewport). Chart Explorer plot begins at about y=207; actual plot height is 600px and 501px respectively. At 1920 the evidence row starts around y=891; at 1440 around y=792. Overview evidence begins around y=821 and y=741 respectively. Screenshots were reviewed and refined. Search/saved/tools panels use normal document flow, preserving chart ownership when closed. Dark/light sanity, source/display metadata, keyboard inspection and saved-view access were checked.

Verification: existing context suite, market suite (all three assets and six intervals, actual canvas interaction tests), guided suite with real frontend/API routes, visual component suite, ESLint, TypeScript and production build passed. No tests were weakened. Statistical engines, source observations, ingestion and API implementations were not changed.
