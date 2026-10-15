# Equity formulas and fundamental mappings

All price features use adjusted close P, one actual trading observation per row. No calendar-day filling. A missing price breaks the affected return; missing values remain null. Percentages are multiplied by 100.

| Feature | Definition |
|---|---|
| 1/5/20/63/126/252D return and momentum | P[t]/P[t-n] - 1 |
| 12–1 momentum | P[t-21]/P[t-252] - 1 |
| SMA distance | P[t]/mean(last n prices) - 1; n=20/50/200 |
| SMA50 vs 200 | SMA50/SMA200 - 1 |
| 52W high proximity | P[t]/max(last 252 prices) - 1 |
| 5D / 20D return z-score | Current n-session return minus mean of previous 252 such returns, divided by their sample SD; minimum 126 prior returns |
| SMA distance z | Same trailing normalization of distance from SMA50 |
| Realized volatility | Sample SD of daily simple returns × sqrt(252); n=20/63/252 |
| Downside volatility | sqrt(mean(min(daily return,0)^2)) × sqrt(252), 63 observations |
| Drawdown / maximum drawdown | P/running peak - 1; running minimum of that series |
| 20/60D slope | OLS slope of log price against session index ×100, log-% per session; no t-statistic claimed |
| Skew / kurtosis | pandas unbiased rolling return skew / excess kurtosis, 252-window, minimum 126 |
| Vol20 historical percentile | Average-rank percentile in trailing 252 vol20 observations, minimum 126 |

Cross-sectional percentiles are average rank / valid count ×100, calculated separately for each price date. Momentum = 12–1; volatility = vol20; growth = revenue TTM growth; quality = operating margin. These are individual dimensions, not a composite score. Dimension-specific valid counts are stored. Value remains unavailable.

## SEC quarterly mapping

US-GAAP, USD only except diluted EPS (USD/shares), shares (shares). Eligible forms: 10-Q, 10-K and amendments. Filing/end dates beyond the as-of boundary are excluded. Exact start/end duplicates use the latest eligible filing. Concept aliases are never added together.

| Metric | Concepts in priority order |
|---|---|
| Revenue | Revenues; SalesRevenueNet; RevenueFromContractWithCustomerExcludingAssessedTax; including-assessed-tax variant |
| Financial-company revenue | RevenuesNetOfInterestExpense only |
| Gross profit | GrossProfit |
| Operating income | OperatingIncomeLoss |
| Net income | NetIncomeLoss; ProfitLoss |
| OCF | NetCashProvidedByUsedInOperatingActivities |
| CapEx | PaymentsToAcquirePropertyPlantAndEquipment |
| Diluted EPS | EarningsPerShareDiluted |
| Cash | CashAndCashEquivalentsAtCarryingValue |
| Assets | Assets |
| Equity | StockholdersEquity |
| Shares | CommonStockSharesOutstanding |

The most recently covered supported concept is used, with priority breaking date ties. Older aliases are not stitched automatically. A direct quarter spans 60–110 days. Cumulative 140–400 day flows become quarters only when a same-fiscal-start predecessor ends 60–110 days earlier; difference the two cumulative values. Annual minus nine-month produces Q4. EPS is direct-quarter only: diluted weighted-share effects make automatic annual differencing unsafe. Instant balances are attached only when their dates coincide with a flow period.

FCF = OCF - CapEx. The supported Payments concept is a positive cash outflow. Negative CapEx is treated as ambiguous/unavailable, not silently flipped. For financial-sector issuers, OCF/CapEx/FCF and gross-profit analysis are omitted. No total-debt or valuation estimate is forced.

Margins = numerator/revenue ×100, only for positive revenue. YoY growth uses a positive prior denominator and a comparable 330–400-day prior quarter. TTM sums require four consecutive 60–110-day-spaced quarters with every component present. TTM revenue growth requires a comparable year-earlier TTM. OCF and profitability consistency are the fraction of four contiguous quarters with positive OCF/net income.

When coverage dates match, total Revenues takes precedence over contract revenue: for example, a tower REIT's contract revenue can exclude lease revenue and must not be the denominator for company-wide margins. EPS YoY additionally requires both comparative quarters in the same accession, avoiding ambiguous split bases. EPS history remains as reported, not a uniformly split-adjusted series.

Fundamentals are current-vintage descriptive values, may be restated, and are excluded from historical setup similarity. No accelerating/decelerating label is inferred.

## Chart-only indicators

The equity chart defaults to SMA20, SMA50, Bollinger (20,2) and integrated volume. Bollinger uses population rolling SD (ddof=0) on the same adjusted-close basis as the candles. These display overlays do not change the persisted research feature vector or similarity methodology. SMA200 remains optional and remains in the existing quant snapshot. See INDICATOR-REVIEW.md for null/warm-up rules, saved-view migration, rendering and test coverage.
