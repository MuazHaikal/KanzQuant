"""Controlled, idempotent Yahoo → existing price store / SEC → equity research."""
import argparse
import json
import os
import sys
import time
from contextlib import contextmanager
from datetime import date,timedelta
from pathlib import Path
import numpy as np
import pandas as pd
import requests
from psycopg.types.json import Jsonb

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from research.config import load_local_env
from research.storage import connect,bulk_upsert_market_observations,market_ingestion_states
from research.providers.market import MarketAsset,YahooChartProvider
from research.equities.features import price_features,historical_evidence,cross_section,outcome_summary,completed_prices
from research.equities.fundamentals import normalize_companyfacts

CACHE=ROOT/".cache/equities"
@contextmanager
def sec_access():
    """One process-wide AND cross-process SEC request at a time; <=2/sec."""
    CACHE.mkdir(parents=True,exist_ok=True)
    with (CACHE/".sec-rate.lock").open("a+b") as lock:
        lock.seek(0,2)
        if lock.tell()==0:lock.write(b"0");lock.flush()
        lock.seek(0)
        if os.name=="nt":
            import msvcrt
            deadline=time.monotonic()+90
            while True:
                try:msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1);break
                except OSError:
                    if time.monotonic()>deadline:raise TimeoutError("SEC request queue timed out")
                    time.sleep(.1)
        else:
            import fcntl
            fcntl.flock(lock,fcntl.LOCK_EX)
        try:
            time.sleep(.55)
            yield
        finally:
            lock.seek(0)
            if os.name=="nt":msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)
            else:fcntl.flock(lock,fcntl.LOCK_UN)
def clean(value):
    if isinstance(value,dict):return {k:clean(v) for k,v in value.items()}
    if isinstance(value,list):return [clean(v) for v in value]
    if isinstance(value,(float,np.floating)):return float(value) if np.isfinite(value) else None
    if isinstance(value,np.integer):return int(value)
    return value

def sec_fetch(path,force=False):
    CACHE.mkdir(parents=True,exist_ok=True)
    file=CACHE/(path.replace("/","_"))
    if file.exists() and not force and time.time()-file.stat().st_mtime<7*86400:
        return json.loads(file.read_text(encoding="utf-8"))
    agent=os.getenv("SEC_USER_AGENT","")
    if "@" not in agent:raise RuntimeError("SEC_USER_AGENT requires organization and contact email")
    with sec_access():
        if file.exists() and not force and time.time()-file.stat().st_mtime<7*86400:
            return json.loads(file.read_text(encoding="utf-8"))
        response=requests.get("https://data.sec.gov/"+path,headers={"User-Agent":agent},timeout=(5,25))
        if response.status_code in (403,429):raise RuntimeError(f"SEC access restricted ({response.status_code}); cached data retained")
        response.raise_for_status()
        payload=response.json()
        temp=file.with_suffix(".tmp")
        temp.write_text(json.dumps(payload),encoding="utf-8")
        temp.replace(file)
    return payload

def issuer_facts(symbol,cik,force=False):
    mappings=json.loads((ROOT/"data/equity_issuer_history.json").read_text())
    mapping=mappings.get(symbol,{})
    predecessors=mapping.get("predecessor_ciks",[]) if mapping.get("current_cik")==cik else []
    merged={"facts":{}}
    for issuer in [*predecessors,cik]:
        raw=sec_fetch("api/xbrl/companyfacts/CIK"+issuer+".json",force)
        for taxonomy,concepts in raw.get("facts",{}).items():
            target=merged["facts"].setdefault(taxonomy,{})
            for tag,concept in concepts.items():
                units=target.setdefault(tag,{"units":{}})["units"]
                for unit,values in concept.get("units",{}).items():
                    units.setdefault(unit,[]).extend([{**v,"source_cik":issuer} for v in values])
    return merged

def migrate_and_sync(conn,universe):
    conn.execute((ROOT/"migrations/002_equities.sql").read_text(),prepare=False)
    conn.execute("""INSERT INTO assets(symbol,name,asset_class,provider,metadata)
      SELECT x.symbol,x.name,'Equity','YAHOO_CHART',jsonb_build_object('provider_symbol',replace(x.symbol,'.','-'))
      FROM jsonb_to_recordset(%s::jsonb) x(symbol text,name text)
      ON CONFLICT(symbol) DO NOTHING""",(json.dumps(universe["instruments"]),))
    conn.commit()
    payload=json.dumps(universe["instruments"])
    conn.execute("""INSERT INTO instruments(id,symbol,name,asset_type,exchange,currency,country,sector,industry,provider_ids,memberships,universe_date)
      SELECT a.id,x.symbol,x.name,'EQUITY',x.exchange,x.currency,x.country,NULLIF(x.sector,''),NULLIF(x.industry,''),
      jsonb_build_object('yahoo',replace(x.symbol,'.','-'),'cik',x.cik),x.memberships,%s::date
      FROM jsonb_to_recordset(%s::jsonb) x(symbol text,name text,exchange text,currency text,country text,sector text,industry text,cik text,memberships jsonb)
      JOIN assets a USING(symbol)
      ON CONFLICT(symbol) DO UPDATE SET name=excluded.name,exchange=COALESCE(excluded.exchange,instruments.exchange),
      sector=excluded.sector,industry=excluded.industry,country=excluded.country,provider_ids=excluded.provider_ids,active=true,memberships=excluded.memberships,universe_date=excluded.universe_date,updated_at=now()""",(universe["snapshot_date"],payload))
    conn.commit()

def macro_evidence(frame,regimes,spx):
    prices=frame.adjusted_close
    rows=[]
    for r in regimes:
        d=pd.Timestamp(r["date"])
        i=prices.index.searchsorted(d,side="right")-1
        j=spx.index.searchsorted(d,side="right")-1
        if i>=0 and i+63<len(prices) and j>=0 and j+63<len(spx):
            rows.append({"date":r["date"],"state":r["label"],"i":i,"stock":float((prices.iloc[i+63]/prices.iloc[i]-1)*100),"spx":float((spx.iloc[j+63]/spx.iloc[j]-1)*100)})
    result=[]
    for label in sorted({r["label"] for r in regimes}):
        selected=[]
        for row in rows:
            if row["state"]==label and (not selected or row["i"]-selected[-1]["i"]>=63):selected.append(row)
        result.append({"state":label,"stock":outcome_summary([r["stock"] for r in selected]),"spx":outcome_summary([r["spx"] for r in selected])})
    return {"current_state":regimes[-1]["label"] if regimes else None,"groups":result}

def main():
    load_local_env()
    parser=argparse.ArgumentParser()
    parser.add_argument("--symbol",action="append")
    parser.add_argument("--full",action="store_true",help="Re-download complete ten-year price history")
    parser.add_argument("--force-fundamentals",action="store_true")
    parser.add_argument("--sync-only",action="store_true")
    parser.add_argument("--skip-sync",action="store_true",help=argparse.SUPPRESS)
    parser.add_argument("--skip-rank",action="store_true",help=argparse.SUPPRESS)
    parser.add_argument("--rank-only",action="store_true")
    args=parser.parse_args()
    universe=json.loads((ROOT/"data/equity_universe.json").read_text())
    symbols=set(args.symbol or [r["symbol"] for r in universe["instruments"]])
    selected=[r for r in universe["instruments"] if r["symbol"] in symbols]
    if symbols-{r["symbol"] for r in selected}:raise SystemExit("Symbol outside configured universe")
    failures=[];start=time.monotonic()
    with connect() as conn:
        if not args.skip_sync:migrate_and_sync(conn,universe)
        print(f"Universe persisted: {len(universe['instruments'])}",flush=True)
        if args.sync_only:return 0
        states=market_ingestion_states(conn,list(symbols));conn.commit()
        reg=conn.execute("SELECT observed_at::text AS date,label FROM regimes WHERE run_id=(SELECT id FROM research_runs WHERE module='macro.research' AND status='complete' ORDER BY started_at DESC LIMIT 1) ORDER BY observed_at").fetchall()
        sp=conn.execute("SELECT m.observed_at,m.adjusted_close FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol='SPX' ORDER BY m.observed_at").fetchall()
        spx=pd.Series([r["adjusted_close"] for r in sp],index=pd.to_datetime([r["observed_at"] for r in sp]))
        conn.commit()
        provider=YahooChartProvider(attempts=2,read_timeout=15)
        for number,row in enumerate([] if args.rank_only else selected,1):
            symbol=row["symbol"];began=time.monotonic()
            try:
                state=states.get(symbol,{})
                latest=state.get("latest")
                since=date.today()-timedelta(days=3653) if args.full or not latest else latest-timedelta(days=14)
                asset=MarketAsset(symbol,symbol.replace(".","-"),row["name"],"Equity","US equity; Yahoo adjusted-close research returns")
                fresh=provider.fetch(asset,since)
                # A split/dividend revision changes the adjusted-close ratio on overlap.
                # Re-fetch full history when detected rather than splice incompatible bases.
                if latest and not args.full:
                    old=conn.execute("SELECT adjusted_close FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol=%s AND m.observed_at=%s",(symbol,latest)).fetchone()
                    conn.commit()
                    at=fresh.loc[pd.Timestamp(latest)] if pd.Timestamp(latest) in fresh.index else None
                    if old and at is not None and abs(float(at.adjusted_close)/old["adjusted_close"]-1)>1e-6:fresh=provider.fetch(asset,date.today()-timedelta(days=3653))
                bulk_upsert_market_observations(conn,provider.name,[(asset,fresh,True)])
                instrument=conn.execute("SELECT id FROM instruments WHERE symbol=%s",(symbol,)).fetchone()["id"]
                rows=conn.execute("SELECT m.observed_at,m.open,m.high,m.low,m.close,m.adjusted_close,m.volume FROM market_observations m WHERE asset_id=%s ORDER BY observed_at",(instrument,)).fetchall()
                conn.commit()
                frame=pd.DataFrame(rows).set_index("observed_at");frame.index=pd.to_datetime(frame.index)
                frame=completed_prices(frame)
                if frame.empty:raise RuntimeError("No completed daily session")
                # SEC failures do not discard valid prices or previous fundamentals.
                fundamental_error=None
                if row.get("cik"):
                    try:
                        raw=issuer_facts(symbol,row["cik"],args.force_fundamentals)
                        quarters=normalize_companyfacts(raw,financial=row.get("sector")=="Financials",as_of=frame.index[-1].date().isoformat())
                        with conn.cursor() as cur:
                            with conn.pipeline():
                                for q in quarters:
                                    cur.execute("INSERT INTO equity_fundamentals(instrument_id,period_end,filed_at,payload) VALUES(%s,%s,%s,%s) ON CONFLICT(instrument_id,period_end) DO UPDATE SET filed_at=excluded.filed_at,payload=excluded.payload",(instrument,q["date"],q["filed_at"],Jsonb(clean(q))))
                        conn.commit()
                    except Exception as exc:
                        conn.rollback();fundamental_error=type(exc).__name__;failures.append((symbol,"fundamentals "+fundamental_error))
                fs=conn.execute("SELECT payload FROM equity_fundamentals WHERE instrument_id=%s AND filed_at<=%s AND period_end<=%s ORDER BY period_end DESC LIMIT 1",(instrument,frame.index[-1].date(),frame.index[-1].date())).fetchone()
                conn.commit()
                features=price_features(frame)
                snapshot=clean(features.iloc[-1].to_dict())
                snapshot.update({"date":frame.index[-1].date().isoformat(),"session_complete":True,"price":float(frame.close.iloc[-1]),"observations":len(frame),"fundamentals_status":fundamental_error or ("available" if fs else "Unavailable"),"fundamentals_date":fs["payload"]["date"] if fs else None})
                if fs:
                    for key in ["revenue_yoy","revenue_ttm_growth","eps_yoy","fcf_yoy","gross_margin","operating_margin","net_margin","fcf_margin","ocf_margin","fcf","ocf_consistency","profitability_consistency"]:snapshot[key]=fs["payload"].get(key)
                evidence=clean(historical_evidence(frame,features))
                macro=clean(macro_evidence(frame,reg,spx))
                conn.execute("INSERT INTO equity_feature_snapshots(instrument_id,as_of,features,evidence,macro_context) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(instrument_id,as_of) DO UPDATE SET features=excluded.features,evidence=excluded.evidence,macro_context=excluded.macro_context,computed_at=now()",(instrument,snapshot["date"],Jsonb(snapshot),Jsonb(evidence),Jsonb(macro)))
                conn.commit()
                print(f"[{number}/{len(selected)}] {symbol}: {len(frame)} prices, fundamentals {snapshot['fundamentals_date'] or 'unavailable'}, {len(evidence['neighbours'])} setups · {time.monotonic()-began:.1f}s",flush=True)
            except Exception as exc:
                conn.rollback();failures.append((symbol,type(exc).__name__))
                print(f"[{number}/{len(selected)}] {symbol} FAILED: {type(exc).__name__}",flush=True)
        if args.skip_rank:return int(bool(failures))
        all_rows=conn.execute("SELECT DISTINCT ON(instrument_id) instrument_id,as_of,features FROM equity_feature_snapshots WHERE features->>'session_complete'='true' ORDER BY instrument_id,as_of DESC").fetchall()
        ranked=cross_section([dict(r["features"],_id=str(r["instrument_id"])) for r in all_rows])
        with conn.pipeline():
            for r in ranked:
                instrument=r.pop("_id")
                conn.execute("UPDATE equity_feature_snapshots SET features=%s WHERE instrument_id=%s AND as_of=%s",(Jsonb(clean(r)),instrument,r["date"]))
        conn.execute("INSERT INTO equity_provider_cache(cache_key,payload) VALUES('equity.pipeline.status',%s) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload,fetched_at=now()",(Jsonb({"completed_session_snapshots":len(ranked),"through":max((r["date"] for r in ranked),default=None),"failures":failures,"prices":"YAHOO_CHART","fundamentals":"SEC"}),))
        conn.commit()
    print(json.dumps({"seconds":round(time.monotonic()-start,1),"selected":len(selected),"snapshots_ranked":len(ranked),"failures":failures}),flush=True)
    return int(bool(failures))

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as exc:
        print("Equity pipeline failed: "+type(exc).__name__,flush=True)
        sys.exit(2)
