"""Replaceable market-data provider boundary and Yahoo Finance chart adapter."""
from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Protocol
from urllib.parse import quote

import pandas as pd
import requests
from requests.adapters import HTTPAdapter


@dataclass(frozen=True)
class MarketAsset:
    symbol: str
    provider_symbol: str
    name: str
    asset_class: str
    description: str


ASSETS = [
    MarketAsset("SPX", "^GSPC", "S&P 500 Index", "Equity index", "Price index for large-cap US equities; excludes dividends."),
    MarketAsset("GLD", "GLD", "SPDR Gold Shares", "Commodity ETF", "Liquid ETF proxy for spot gold exposure; adjusted for splits and distributions."),
    MarketAsset("IEF", "IEF", "iShares 7-10 Year Treasury Bond ETF", "Bond ETF", "Liquid total-return proxy for intermediate US Treasury exposure."),
]


class MarketDataProvider(Protocol):
    name: str

    def fetch(self, asset: MarketAsset, start: date | None = None) -> pd.DataFrame: ...


class YahooChartProvider:
    """Fetch public chart JSON without HTML scraping or an API credential."""

    name = "YAHOO_CHART"
    base_url = "https://query1.finance.yahoo.com/v8/finance/chart"

    def __init__(self, attempts: int = 3, connect_timeout: float = 5, read_timeout: float = 25):
        self.attempts = attempts
        self.timeout = (connect_timeout, read_timeout)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0 KanzQuant/0.1 market ingestion"})
        self.session.mount("https://", HTTPAdapter(pool_connections=4, pool_maxsize=4, max_retries=0))

    def fetch(self, asset: MarketAsset, start: date | None = None) -> pd.DataFrame:
        period1 = int(datetime.combine(start or date(1900, 1, 1), datetime.min.time(), tzinfo=timezone.utc).timestamp())
        params = {
            "period1": period1,
            "period2": int(datetime.now(timezone.utc).timestamp()) + 86_400,
            "interval": "1d",
            "events": "div,splits",
        }
        error: Exception | None = None
        for attempt in range(1, self.attempts + 1):
            try:
                response = self.session.get(
                    f"{self.base_url}/{quote(asset.provider_symbol, safe='')}",
                    params=params,
                    timeout=self.timeout,
                )
                response.raise_for_status()
                chart = response.json().get("chart", {})
                if chart.get("error"):
                    raise ValueError(str(chart["error"].get("description", "provider error")))
                results = chart.get("result") or []
                if not results:
                    raise ValueError("provider returned no result")
                result = results[0]
                timestamps = result.get("timestamp") or []
                quote_rows = ((result.get("indicators") or {}).get("quote") or [{}])[0]
                adjusted = ((result.get("indicators") or {}).get("adjclose") or [{}])[0].get("adjclose")
                if adjusted is None:
                    adjusted = quote_rows.get("close")
                frame = pd.DataFrame(
                    {
                        "open": quote_rows.get("open"),
                        "high": quote_rows.get("high"),
                        "low": quote_rows.get("low"),
                        "close": quote_rows.get("close"),
                        "adjusted_close": adjusted,
                        "volume": quote_rows.get("volume"),
                    },
                    index=pd.to_datetime(timestamps, unit="s", utc=True).tz_convert(None).normalize(),
                )
                frame = frame.apply(pd.to_numeric, errors="coerce")
                frame = frame.dropna(subset=["adjusted_close"]).sort_index()
                frame = frame[~frame.index.duplicated(keep="last")]
                if frame.empty:
                    raise ValueError("provider returned no numeric prices")
                return frame
            except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
                if isinstance(exc, requests.HTTPError) and exc.response is not None:
                    error = RuntimeError(f"HTTP {exc.response.status_code}")
                elif isinstance(exc, requests.Timeout):
                    error = RuntimeError(f"timeout after {self.timeout[1]:g}s")
                elif isinstance(exc, requests.RequestException):
                    error = RuntimeError(type(exc).__name__)
                else:
                    error = exc
                if attempt < self.attempts:
                    time.sleep(0.75 * attempt)
        raise RuntimeError(f"Market request failed for {asset.symbol} after {self.attempts} attempts: {error}")
