"""Read-only coverage, invariants and storage report. Never logs connection details."""
import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from research.config import load_local_env
from research.storage import connect
def main():
    load_local_env()
    with connect() as conn:
        counts=conn.execute("""SELECT (SELECT count(*) FROM instruments WHERE active) AS universe,
        (SELECT count(DISTINCT instrument_id) FROM equity_feature_snapshots) AS snapshots,
        (SELECT count(DISTINCT instrument_id) FROM equity_feature_snapshots WHERE features->>'session_complete'='true') AS completed_snapshots,
        (SELECT count(*) FROM market_observations m JOIN instruments i ON i.id=m.asset_id) AS prices,
        (SELECT count(*) FROM equity_fundamentals) AS quarters,
        (SELECT count(DISTINCT instrument_id) FROM equity_fundamentals) AS fundamentals,
        pg_database_size(current_database())/1024/1024 AS database_mb""").fetchone()
        assert counts["universe"]==518
        assert not conn.execute("""SELECT 1 FROM market_observations m JOIN instruments i ON i.id=m.asset_id
        WHERE m.adjusted_close<=0 OR m.close<=0 LIMIT 1""").fetchone()
        for symbol in ["MU","AAPL","JPM","XOM","WMT","NVDA"]:
            r=conn.execute("""SELECT i.symbol,s.features,s.evidence,s.macro_context FROM instruments i
            JOIN LATERAL(SELECT * FROM equity_feature_snapshots WHERE instrument_id=i.id AND features->>'session_complete'='true' ORDER BY as_of DESC LIMIT 1)s ON true WHERE symbol=%s""",(symbol,)).fetchone()
            assert r and r["features"]["observations"]>1000
            assert len(r["evidence"]["neighbours"])>=5 and r["macro_context"]["groups"]
            for neighbour in r["evidence"]["neighbours"]:assert neighbour["date"]<r["features"]["date"]
        assert not conn.execute("""SELECT 1 FROM equity_fundamentals f JOIN instruments i ON i.id=f.instrument_id
        WHERE i.sector='Financials' AND f.payload->>'fcf' IS NOT NULL LIMIT 1""").fetchone()
        constraints=conn.execute("""SELECT count(*) AS n FROM information_schema.table_constraints WHERE table_name IN
        ('instruments','equity_fundamentals','equity_feature_snapshots','equity_provider_cache')""").fetchone()["n"]
        print(json.dumps({**counts,"constraints":constraints}),flush=True)
if __name__=="__main__":main()
