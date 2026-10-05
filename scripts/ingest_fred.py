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
from research.providers.fred import FredProvider, FredSeries, SERIES
from research.storage import (
    bulk_upsert_fred_observations,
    connect,
    count_fred_observations,
    fred_ingestion_states,
)

LOOKBACK_DAYS = {"Daily": 14, "Weekly": 35, "Monthly": 93, "Quarterly": 370}


def incremental_start(item: FredSeries, state: dict[str, object] | None, explicit_since: str | None) -> tuple[str | None, bool]:
    if explicit_since:
        return explicit_since, False
    if not state or not state.get("full_history_complete") or not state.get("latest"):
        return None, True
    latest = state["latest"]
    if not isinstance(latest, date):
        raise TypeError(f"Unexpected Neon watermark for {item.external_id}")
    overlap = LOOKBACK_DAYS.get(item.frequency, 93)
    return (latest - timedelta(days=overlap)).isoformat(), False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Incrementally ingest FRED observations into Neon.")
    parser.add_argument("--series", action="append", help="FRED series ID; repeat to select multiple")
    parser.add_argument("--since", help="Override observation start date for all selected series")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent FRED requests (default: 4)")
    return parser.parse_args()


def timed_fetch(provider: FredProvider, series_id: str, start: str | None):
    started = perf_counter()
    values = provider.fetch(series_id, start)
    return values, perf_counter() - started


def main() -> int:
    load_local_env()
    args = parse_args()
    selected_ids = set(args.series or [item.external_id for item in SERIES])
    selected = [item for item in SERIES if item.external_id in selected_ids]
    unknown = selected_ids - {item.external_id for item in SERIES}
    if unknown:
        raise SystemExit("Unknown configured FRED series: " + ", ".join(sorted(unknown)))
    if not selected:
        raise SystemExit("No FRED series selected")
    workers = max(1, min(args.workers, 6, len(selected)))
    provider = FredProvider()
    total_started = perf_counter()
    failures: list[tuple[str, str]] = []
    fetched_total = 0
    changed_total = 0
    datasets = []

    with connect() as conn:
        states = fred_ingestion_states(conn, [item.external_id for item in selected])
        conn.commit()
        plans = {
            item.external_id: incremental_start(item, states.get(item.external_id), args.since)
            for item in selected
        }
        full_repairs = sum(full_history for _, full_history in plans.values())
        print(
            f"FRED -> Neon: {len(selected)} series, {workers} fetch workers, "
            f"{full_repairs} full-history repair(s)",
            flush=True,
        )
        with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="fred") as executor:
            futures = {}
            for item in selected:
                start, full_history = plans[item.external_id]
                future = executor.submit(timed_fetch, provider, item.external_id, start)
                futures[future] = (item, full_history)

            completed = 0
            for future in as_completed(futures):
                item, full_history = futures[future]
                completed += 1
                try:
                    values, fetch_seconds = future.result()
                    fetched_total += len(values)
                    scope = "full" if full_history else "incremental"
                    print(
                        f"[{completed}/{len(selected)}] {item.external_id} fetched "
                        f"{len(values):,} observations in {fetch_seconds:.2f}s ({scope})",
                        flush=True,
                    )
                    datasets.append(
                        (
                            item,
                            values,
                            full_history or bool(states.get(item.external_id, {}).get("full_history_complete")),
                        )
                    )
                except Exception as exc:
                    failures.append((item.external_id, str(exc)))
                    print(f"[{completed}/{len(selected)}] {item.external_id} FAILED: {exc}", flush=True)

        if datasets:
            batch_rows = sum(len(values) for _, values, _ in datasets)
            print(f"Persisting {batch_rows:,} fetched observations to Neon in one bulk batch...", flush=True)
            persist_started = perf_counter()
            persisted = bulk_upsert_fred_observations(conn, datasets)
            persist_seconds = perf_counter() - persist_started
            for position, (item, _, _) in enumerate(datasets, 1):
                result = persisted[item.external_id]
                changed_total += result["changed"]
                print(
                    f"[{position}/{len(datasets)}] {item.external_id} persisted "
                    f"{result['attempted']:,} rows ({result['changed']:,} changed; bulk batch)",
                    flush=True,
                )
            print(f"Neon bulk persistence completed in {persist_seconds:.2f}s", flush=True)

        stored_series, stored_observations = count_fred_observations(
            conn, [item.external_id for item in selected]
        )

    elapsed = perf_counter() - total_started
    print(
        f"Total: {elapsed:.2f}s | fetched {fetched_total:,} | changed {changed_total:,} | "
        f"stored {stored_observations:,} observations across {stored_series} series | "
        f"failed {len(failures)}",
        flush=True,
    )
    if failures:
        print("Failed series: " + ", ".join(series_id for series_id, _ in failures), flush=True)
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except psycopg.Error as exc:
        code = exc.sqlstate or "no-sqlstate"
        print(f"Database operation failed ({type(exc).__name__}, {code}).", file=sys.stderr)
        raise SystemExit(2)
