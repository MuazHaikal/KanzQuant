# Discovery and screener

Persisted snapshots only. Discovery ranks the latest common price date; stale symbols cannot silently enter that day's rankings. Screener displays each row's price date and keeps unavailable metrics last when sorting.

Filters: symbol/company, sector, minimum/maximum momentum percentile, volatility percentile, 20D return z-score, distance SMA200, drawdown, revenue TTM growth and gross margin; positive/negative FCF. Nulls never satisfy numeric filters. All displayed numerical columns sort in both directions. 50-row pages, intentionally scrollable wide table, frozen symbol column. Every row links to research.

| View | Deterministic definition |
|---|---|
| Momentum Leaders | Momentum percentile >=80 |
| Short-Term Reversals | z20 <=-1.5 AND SMA200 distance >0 |
| Near 52W High | Adjusted close within 5% of trailing 252-session high |
| High Volatility | Volatility percentile >=80 |
| Deep Drawdowns | Drawdown <=-30% |
| Strong Revenue Growth | TTM revenue growth >=20% |
| Profitable Growth | TTM revenue growth >10% AND operating margin >0 |

These are descriptive research views, not recommendations. Fundamental rankings use latest mapped quarters, not point-in-time fundamentals, and may compare different fiscal calendars. Quality means operating margin, not a hidden score.
