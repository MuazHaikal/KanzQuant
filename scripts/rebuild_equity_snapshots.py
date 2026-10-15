"""Recompute from persisted prices, with COPY publication; no Yahoo requests."""
import json,sys
from itertools import groupby
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.ingest_equities import clean,macro_evidence
from research.config import load_local_env
from research.storage import connect
from research.equities.features import price_features,historical_evidence,completed_prices,cross_section,completed_date

KEYS=["revenue_yoy","revenue_ttm_growth","eps_yoy","fcf_yoy","gross_margin","operating_margin","net_margin","fcf_margin","ocf_margin","fcf","ocf_consistency","profitability_consistency"]
def main():
    load_local_env()
    with connect() as conn:
        conn.execute("SET LOCAL statement_timeout='120s'")
        instruments=conn.execute("SELECT id,symbol FROM instruments WHERE active ORDER BY symbol").fetchall()
        fundamentals=conn.execute("SELECT DISTINCT ON(i.symbol) i.symbol,f.payload FROM equity_fundamentals f JOIN instruments i ON i.id=f.instrument_id WHERE f.filed_at<=%s AND f.period_end<=%s ORDER BY i.symbol,f.period_end DESC",(completed_date(),completed_date())).fetchall()
        by_symbol={}
        for r in fundamentals:by_symbol.setdefault(r["symbol"],[]).append(r["payload"])
        reg=conn.execute("SELECT observed_at::text AS date,label FROM regimes WHERE run_id=(SELECT id FROM research_runs WHERE module='macro.research' AND status='complete' ORDER BY started_at DESC LIMIT 1) ORDER BY observed_at").fetchall()
        sp=conn.execute("SELECT m.observed_at,m.adjusted_close FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol='SPX' ORDER BY m.observed_at").fetchall()
        spx=pd.Series([r["adjusted_close"] for r in sp],index=pd.to_datetime([r["observed_at"] for r in sp]))
        conn.commit()
        print(f"Rebuilding {len(instruments)} instruments from persisted prices; no Yahoo calls",flush=True)
        snapshots=[]
        # Bounded groups prevent loading 1.3m database rows into memory at once.
        for offset in range(0,len(instruments),32):
            chunk=instruments[offset:offset+32]
            conn.execute("SET LOCAL statement_timeout='120s'")
            prices=conn.execute("SELECT i.symbol,observed_at,close,adjusted_close FROM market_observations m JOIN instruments i ON i.id=m.asset_id WHERE asset_id=ANY(%s) ORDER BY i.symbol,observed_at",([r["id"] for r in chunk],)).fetchall()
            conn.commit()
            ids={r["symbol"]:r["id"] for r in chunk}
            for symbol,group in groupby(prices,key=lambda r:r["symbol"]):
                instrument=ids[symbol]
                frame=pd.DataFrame(list(group)).set_index("observed_at")
                frame.index=pd.to_datetime(frame.index)
                frame=completed_prices(frame)
                if frame.empty:continue
                asof=frame.index[-1].date().isoformat()
                qs=[q for q in by_symbol.get(symbol,[]) if q["filed_at"]<=asof and q["date"]<=asof]
                q=qs[-1] if qs else {}
                computed=price_features(frame)
                feature=clean({**computed.iloc[-1].to_dict(),**{k:q.get(k) for k in KEYS},"date":asof,"session_complete":True,"price":float(frame.close.iloc[-1]),"observations":len(frame),"fundamentals_date":q.get("date"),"fundamentals_status":"available" if q else "Unavailable","_id":str(instrument)})
                snapshots.append({"feature":feature,"evidence":clean(historical_evidence(frame,computed)),"macro":clean(macro_evidence(frame,reg,spx))})
            print(f"Completed-session snapshots computed {min(offset+32,len(instruments))}/{len(instruments)}",flush=True)
        cross_section([r["feature"] for r in snapshots])
        conn.execute("SET LOCAL statement_timeout='120s'")
        conn.execute("CREATE TEMP TABLE equity_snapshot_stage(instrument_id uuid,as_of date,features jsonb,evidence jsonb,macro_context jsonb) ON COMMIT DROP")
        with conn.cursor() as cur:
            with cur.copy("COPY equity_snapshot_stage(instrument_id,as_of,features,evidence,macro_context) FROM STDIN") as copy:
                for r in snapshots:
                    f=r["feature"];instrument=f.pop("_id")
                    copy.write_row((instrument,f["date"],json.dumps(f),json.dumps(r["evidence"]),json.dumps(r["macro"])))
        conn.execute("""INSERT INTO equity_feature_snapshots(instrument_id,as_of,features,evidence,macro_context)
        SELECT * FROM equity_snapshot_stage ON CONFLICT(instrument_id,as_of) DO UPDATE SET features=excluded.features,evidence=excluded.evidence,macro_context=excluded.macro_context,computed_at=now()""")
        conn.execute("INSERT INTO equity_provider_cache(cache_key,payload) VALUES('equity.pipeline.status',%s::jsonb) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload,fetched_at=now()",(json.dumps({"completed_session_snapshots":len(snapshots),"through":max(r["feature"]["date"] for r in snapshots),"prices":"YAHOO_CHART","fundamentals":"SEC"}),))
        conn.commit()
        print(f"Published {len(snapshots)} completed-session snapshots atomically",flush=True)
if __name__=="__main__":main()
