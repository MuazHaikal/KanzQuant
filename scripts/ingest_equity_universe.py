"""Six bounded workers; final cross-section is computed once after all writes finish."""
import concurrent.futures
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
script=str(ROOT/"scripts/ingest_equities.py")
def run(symbols):
    args=[sys.executable,script,"--skip-sync","--skip-rank"]
    for s in symbols:args+=["--symbol",s]
    return subprocess.run(args,cwd=ROOT).returncode
if __name__=="__main__":
    sync=subprocess.run([sys.executable,script,"--sync-only"],cwd=ROOT)
    if sync.returncode:sys.exit(sync.returncode)
    universe=json.loads((ROOT/"data/equity_universe.json").read_text())
    symbols=[r["symbol"] for r in universe["instruments"]]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        codes=list(pool.map(run,[symbols[i::6] for i in range(6)]))
    rank=subprocess.run([sys.executable,script,"--skip-sync","--rank-only"],cwd=ROOT)
    sys.exit(int(any(codes) or rank.returncode))
