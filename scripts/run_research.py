from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from research.config import load_local_env
from research.pipeline import FEATURES, run_real_pipeline
from research.providers.market import ASSETS
from research.storage import connect, load_research_inputs, save_research_run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run KanzQuant monthly macro research.")
    parser.add_argument("--demo", action="store_true", help="Run the explicitly synthetic development fixture")
    parser.add_argument("--output", default="data/research_snapshot.json")
    return parser.parse_args()


def run_database(output: Path) -> dict:
    started = perf_counter()
    series_ids = sorted({spec.source for spec in FEATURES if spec.source != "SPX"})
    asset_symbols = [asset.symbol for asset in ASSETS]
    print(f"Loading {len(series_ids)} FRED series and {len(asset_symbols)} market assets from Neon...", flush=True)
    with connect() as conn:
        macro_rows, market_rows = load_research_inputs(conn, series_ids, asset_symbols)
        conn.commit()
    print(f"Loaded {len(macro_rows):,} macro rows and {len(market_rows):,} market rows", flush=True)
    payload, assignments, labels, neighbours = run_real_pipeline(macro_rows, market_rows)
    run_id = save_research_run(payload, assignments, labels, neighbours)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, allow_nan=False), encoding="utf-8")
    elapsed = perf_counter() - started
    samples = payload["forward_summary"]["SPX"]["n"]
    print(f"Research date: {payload['as_of']}", flush=True)
    print(f"State vector: {len(payload['state_vectors'])} months x {len(payload['features'])} features", flush=True)
    print(f"Current regime: {payload['current_regime']} ({payload['confidence'] * 100:.1f}% confidence)", flush=True)
    print("Top analogues: " + ", ".join(f"{row['date']} ({row['similarity']:.3f})" for row in neighbours), flush=True)
    print("SPX forward samples: " + ", ".join(f"{horizon}={int(count)}" for horizon, count in samples.items()), flush=True)
    print(f"Persisted research run {run_id} in {elapsed:.2f}s", flush=True)
    return payload


def run_demo(output: Path) -> dict:
    """Keep demo mode explicit and isolated; it never persists into Neon."""
    from scripts.demo_research import build_demo_snapshot

    payload = build_demo_snapshot()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, allow_nan=False), encoding="utf-8")
    print(f"Explicit demo research complete: {payload['as_of']} (not persisted)", flush=True)
    return payload


if __name__ == "__main__":
    load_local_env()
    args = parse_args()
    mode = "demo" if args.demo else os.getenv("KANZQUANT_DATA_MODE")
    if mode == "demo":
        run_demo(Path(args.output))
    elif mode == "database":
        if not os.getenv("DATABASE_URL"):
            raise SystemExit("DATABASE_URL is required when KANZQUANT_DATA_MODE=database")
        run_database(Path(args.output))
    else:
        raise SystemExit("Set KANZQUANT_DATA_MODE=database, or pass --demo explicitly")
