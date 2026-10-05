"""Incremental FRED provider with bounded retries and connection reuse."""
from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass

import pandas as pd
import requests
from requests.adapters import HTTPAdapter

FRED_URL = "https://api.stlouisfed.org/fred/series/observations"


@dataclass(frozen=True)
class FredSeries:
    external_id: str
    name: str
    category: str
    frequency: str
    unit: str


SERIES = [
    FredSeries("FEDFUNDS", "Federal Funds Effective Rate", "Rates", "Monthly", "%"),
    FredSeries("DGS2", "2-Year Treasury", "Rates", "Daily", "%"),
    FredSeries("DGS10", "10-Year Treasury", "Rates", "Daily", "%"),
    FredSeries("T10Y2Y", "10Y minus 2Y Spread", "Rates", "Daily", "pp"),
    FredSeries("CPIAUCSL", "Consumer Price Index", "Inflation", "Monthly", "Index"),
    FredSeries("CPILFESL", "Core Consumer Price Index", "Inflation", "Monthly", "Index"),
    FredSeries("PCEPI", "PCE Price Index", "Inflation", "Monthly", "Index"),
    FredSeries("UNRATE", "Unemployment Rate", "Labour", "Monthly", "%"),
    FredSeries("PAYEMS", "Total Nonfarm Payrolls", "Labour", "Monthly", "Thousands"),
    FredSeries("ICSA", "Initial Claims", "Labour", "Weekly", "Thousands"),
    FredSeries("INDPRO", "Industrial Production", "Growth", "Monthly", "Index"),
    FredSeries("RSAFS", "Retail Sales", "Growth", "Monthly", "USD mn"),
    FredSeries("GDPC1", "Real GDP", "Growth", "Quarterly", "USD bn"),
    FredSeries("BAMLH0A0HYM2", "US High Yield OAS", "Credit", "Daily", "%"),
    FredSeries("BAA10Y", "BAA minus 10Y Treasury", "Credit", "Daily", "%"),
    FredSeries("M2SL", "M2 Money Stock", "Liquidity", "Monthly", "USD bn"),
    FredSeries("WALCL", "Federal Reserve Total Assets", "Liquidity", "Weekly", "USD mn"),
    FredSeries("VIXCLS", "CBOE Volatility Index", "Markets", "Daily", "Index"),
]


class FredProvider:
    def __init__(
        self,
        api_key: str | None = None,
        attempts: int = 2,
        connect_timeout: float = 5.0,
        read_timeout: float = 15.0,
    ):
        self.api_key = api_key or os.getenv("FRED_API_KEY")
        self.attempts = attempts
        self.timeout = (connect_timeout, read_timeout)
        self._thread_local = threading.local()

    def _session(self) -> requests.Session:
        session = getattr(self._thread_local, "session", None)
        if session is None:
            session = requests.Session()
            session.headers.update({"User-Agent": "KanzQuant/0.1 FRED ingestion"})
            session.mount("https://", HTTPAdapter(pool_connections=1, pool_maxsize=1, max_retries=0))
            self._thread_local.session = session
        return session

    def fetch(self, series_id: str, start: str | None = None) -> pd.Series:
        if not self.api_key:
            raise RuntimeError("FRED_API_KEY is missing. Configure it in .env.local.")
        params = {
            "series_id": series_id,
            "api_key": self.api_key,
            "file_type": "json",
            "sort_order": "asc",
        }
        if start:
            params["observation_start"] = start
        error: Exception | None = None
        for attempt in range(1, self.attempts + 1):
            try:
                response = self._session().get(FRED_URL, params=params, timeout=self.timeout)
                response.raise_for_status()
                rows = response.json().get("observations", [])
                if not rows:
                    raise ValueError(f"FRED returned no observations for {series_id}")
                dates = pd.to_datetime([row["date"] for row in rows], errors="coerce")
                values = pd.to_numeric([row["value"] for row in rows], errors="coerce")
                result = pd.Series(values, index=dates, name=series_id).dropna()
                result = result[~result.index.isna()]
                if result.empty:
                    raise ValueError(f"FRED returned no numeric observations for {series_id}")
                if not result.index.is_monotonic_increasing:
                    result = result.sort_index()
                return result[~result.index.duplicated(keep="last")]
            except (requests.RequestException, ValueError, KeyError) as exc:
                if isinstance(exc, requests.HTTPError) and exc.response is not None:
                    error = RuntimeError(f"HTTP {exc.response.status_code}")
                elif isinstance(exc, requests.Timeout):
                    error = RuntimeError(f"{type(exc).__name__} after {self.timeout[1]:g}s read timeout")
                elif isinstance(exc, requests.RequestException):
                    error = RuntimeError(type(exc).__name__)
                else:
                    error = exc
                if attempt < self.attempts:
                    time.sleep(0.75 * attempt)
        raise RuntimeError(f"FRED request failed for {series_id} after {self.attempts} attempts: {error}")
