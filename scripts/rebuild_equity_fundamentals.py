"""Re-normalize cached SEC facts in one COPY merge; fetch only missing CIK caches."""
import json
import sys
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.ingest_equities import issuer_facts,clean
from research.config import load_local_env
from research.storage import connect
from research.equities.fundamentals import normalize_companyfacts

KEYS=["revenue_yoy","revenue_ttm_growth","eps_yoy","fcf_yoy","gross_margin","operating_margin","net_margin","fcf_margin","ocf_margin","fcf","ocf_consistency","profitability_consistency"]
def main():
    load_local_env()
    with connect() as conn:
        rows=conn.execute("""SELECT i.symbol,i.sector,i.provider_ids->>'cik' AS cik,s.as_of::text AS date
        FROM instruments i JOIN LATERAL(SELECT as_of FROM equity_feature_snapshots WHERE instrument_id=i.id AND features->>'session_complete'='true' ORDER BY as_of DESC LIMIT 1)s ON true WHERE i.active ORDER BY i.symbol""").fetchall()
        conn.commit()
        datasets=[];missing=[]
        for i,row in enumerate(rows,1):
            if not row["cik"]:missing.append(row["symbol"]);continue
            try:
                raw=issuer_facts(row["symbol"],row["cik"])
                quarters=normalize_companyfacts(raw,row["sector"]=="Financials",as_of=min(row["date"],date.today().isoformat()))
                datasets.append((row["symbol"],quarters))
                if not quarters:missing.append(row["symbol"])
            except Exception as exc:
                missing.append(row["symbol"])
                print(row["symbol"]+" fundamentals unavailable: "+type(exc).__name__,flush=True)
            if i%50==0:print(f"Normalized {i}/{len(rows)} cached issuers",flush=True)
        conn.execute("SET LOCAL statement_timeout='120s'")
        conn.execute("CREATE TEMP TABLE equity_fundamental_stage(symbol text,period_end date,filed_at date,payload jsonb) ON COMMIT DROP")
        with conn.cursor() as cur:
            with cur.copy("COPY equity_fundamental_stage(symbol,period_end,filed_at,payload) FROM STDIN") as copy:
                for symbol,quarters in datasets:
                    for q in quarters:copy.write_row((symbol,q["date"],q["filed_at"],json.dumps(clean(q))))
        conn.execute("""INSERT INTO equity_fundamentals(instrument_id,period_end,filed_at,payload)
        SELECT i.id,s.period_end,s.filed_at,s.payload FROM equity_fundamental_stage s JOIN instruments i USING(symbol)
        ON CONFLICT(instrument_id,period_end) DO UPDATE SET filed_at=excluded.filed_at,payload=excluded.payload""")
        # Replace only derived normalization output for successfully rebuilt issuers.
        # Raw source caches are retained, so omitted obsolete periods are reproducible.
        removed=conn.execute("""DELETE FROM equity_fundamentals f USING instruments i
        WHERE f.instrument_id=i.id AND i.symbol=ANY(%s)
        AND NOT EXISTS(SELECT 1 FROM equity_fundamental_stage s WHERE s.symbol=i.symbol AND s.period_end=f.period_end)""",([symbol for symbol,_ in datasets],)).rowcount
        print(f"Removed {removed} obsolete derived periods; raw SEC caches retained",flush=True)
        # Only enrich the latest snapshot; never relabel historical daily snapshots.
        updates=[]
        for symbol,quarters in datasets:
            q=quarters[-1] if quarters else {}
            updates.append({"symbol":symbol,"payload":clean({**{k:q.get(k) for k in KEYS},"fundamentals_date":q.get("date"),"fundamentals_status":"available" if q else "Unavailable"})})
        conn.execute("""WITH input AS(SELECT * FROM jsonb_to_recordset(%s::jsonb)x(symbol text,payload jsonb))
        UPDATE equity_feature_snapshots s SET features=s.features||x.payload FROM input x JOIN instruments i USING(symbol)
        WHERE s.instrument_id=i.id AND s.as_of=(SELECT max(as_of) FROM equity_feature_snapshots WHERE instrument_id=i.id AND features->>'session_complete'='true')""",(json.dumps(updates),))
        conn.commit()
        print(json.dumps({"issuers":len(rows),"quarters":sum(len(q) for _,q in datasets),"unavailable":missing}),flush=True)
if __name__=="__main__":main()
