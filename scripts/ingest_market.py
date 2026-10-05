from __future__ import annotations

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from pathlib import Path
from time import perf_counter

import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from research.config import load_local_env
from research.providers.market import ASSETS, MarketAsset, YahooChartProvider
from research.storage import (
    bulk_upsert_market_observations,
    connect,
    count_market_observations,
    market_ingestion_states,
)


def incremental_start(state: dict[str, object] | None, explicit_since: str | None) -> tuple[date | None, bool]:
    if explicit_since:
        return date.fromisoformat(explicit_since), False
    if not state or not state.get("full_history_complete") or not state.get("latest"):
        return None, True
    latest = state["latest"]
    if not isinstance(latest, date):
        raise TypeError("Unexpected market watermark")
    return latest - timedelta(days=14), False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Incrementally ingest real market prices into Neon.")
    parser.add_argument("--asset", action="append", help="KanzQuant asset symbol; repeat to select multiple")
    parser.add_argument("--since", help="Override start date (YYYY-MM-DD)")
    return parser.parse_args()


def timed_fetch(provider: YahooChartProvider, asset: MarketAsset, start: date | None):
    began = perf_counter()
    return provider.fetch(asset, start), perf_counter() - began


def main() -> int:
    load_local_env()
    args = parse_args()
    selected_symbols = set(args.asset or [asset.symbol for asset in ASSETS])
    selected = [asset for asset in ASSETS if asset.symbol in selected_symbols]
    unknown = selected_symbols - {asset.symbol for asset in ASSETS}
    if unknown:
        raise SystemExit("Unknown configured market assets: " + ", ".join(sorted(unknown)))
    provider = YahooChartProvider()
    total_started = perf_counter()
    failures: list[tuple[str, str]] = []
    datasets = []

    with connect() as conn:
        states = market_ingestion_states(conn, [asset.symbol for asset in selected])
        conn.commit()
        plans = {asset.symbol: incremental_start(states.get(asset.symbol), args.since) for asset in selected}
        print(f"Market -> Neon: {len(selected)} assets via {provider.name}", flush=True)
        with ThreadPoolExecutor(max_workers=len(selected), thread_name_prefix="market") as executor:
            futures = {
                executor.submit(timed_fetch, provider, asset, plans[asset.symbol][0]): asset
                for asset in selected
            }
            complete = 0
            for future in as_completed(futures):
                asset = futures[future]
                complete += 1
                start, full_history = plans[asset.symbol]
                try:
                    frame, seconds = future.result()
                    datasets.append((asset, frame, full_history or bool(states.get(asset.symbol, {}).get("full_history_complete"))))
                    scope = "full" if full_history else f"since {start}"
                    print(f"[{complete}/{len(selected)}] {asset.symbol} fetched {len(frame):,} rows in {seconds:.2f}s ({scope})", flush=True)
                except Exception as exc:
                    failures.append((asset.symbol, str(exc)))
                    print(f"[{complete}/{len(selected)}] {asset.symbol} FAILED: {exc}", flush=True)
        if datasets:
            batch_rows = sum(len(frame) for _, frame, _ in datasets)
            print(f"Persisting {batch_rows:,} prices in one Neon bulk batch...", flush=True)
            began = perf_counter()
            persisted = bulk_upsert_market_observations(conn, provider.name, datasets)
            print(f"Neon bulk persistence completed in {perf_counter() - began:.2f}s", flush=True)
            for position, (asset, _, _) in enumerate(sorted(datasets, key=lambda item: item[0].symbol), 1):
                result = persisted[asset.symbol]
                print(f"[{position}/{len(datasets)}] {asset.symbol} persisted {result['attempted']:,} rows ({result['changed']:,} changed)", flush=True)
        asset_count, observation_count = count_market_observations(conn, [asset.symbol for asset in selected])
    print(f"Total: {perf_counter() - total_started:.2f}s | stored {observation_count:,} observations across {asset_count} assets | failed {len(failures)}", flush=True)
    if failures:
        print("Failed assets: " + ", ".join(symbol for symbol, _ in failures), flush=True)
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except psycopg.Error as exc:
        print(f"Database operation failed ({type(exc).__name__}, {exc.sqlstate or 'no-sqlstate'}).", file=sys.stderr)
        raise SystemExit(2)
