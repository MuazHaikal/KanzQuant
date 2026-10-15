"""Build a reviewed, persistent current-membership snapshot; never runtime scraping."""
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import requests
import os

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from research.config import load_local_env
def sync():
    result={}
    sources=[]
    for index,url in [
        ("SP500","https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"),
        ("NASDAQ100","https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies"),
    ]:
        response=requests.get(url,headers={"User-Agent":"KanzQuant/0.5 (universe snapshot)"},timeout=(5,25))
        response.raise_for_status()
        tables=pd.read_html(io.StringIO(response.text))
        frame=next((t for t in tables if ("Symbol" in t.columns or "Ticker" in t.columns) and len(t)>90),None)
        if frame is None:
            raise ValueError([(len(t),list(t.columns)) for t in tables])
        for raw in frame.to_dict("records"):
            symbol=str(raw.get("Symbol",raw.get("Ticker"))).strip()
            row=result.setdefault(symbol,{"symbol":symbol,"name":str(raw.get("Security",raw.get("Company",symbol))),"sector":str(raw.get("GICS Sector","")),"industry":str(raw.get("GICS Sub-Industry","")),"exchange":None,"currency":"USD","country":"US","cik":str(raw.get("CIK","")).split(".")[0].zfill(10) if raw.get("CIK") else None,"memberships":[]})
            row["memberships"].append(index)
            if index=="NASDAQ100": row["exchange"]="NASDAQ"
        sources.append({"index":index,"url":url,"rows":len(frame)})
    load_local_env()
    agent=os.getenv("SEC_USER_AGENT")
    if agent:
        response=requests.get("https://www.sec.gov/files/company_tickers_exchange.json",headers={"User-Agent":agent},timeout=(5,25))
        response.raise_for_status()
        listing=response.json()
        lookup={str(r[2]).replace("-","."):dict(zip(listing["fields"],r)) for r in listing["data"]}
        for symbol,row in result.items():
            row["country"]=None  # US listing is not evidence of issuer domicile
            sec=lookup.get(symbol)
            if sec:
                row["cik"]=str(sec["cik"]).zfill(10)
                row["exchange"]=sec.get("exchange") or row["exchange"]
        sources.append({"metadata":"SEC issuer mapping","url":"https://www.sec.gov/files/company_tickers_exchange.json"})
    assert 500<=len(result)<=580 and all(s in result for s in ["MU","AAPL","JPM","XOM","WMT","NVDA"])
    payload={"snapshot_date":datetime.now(timezone.utc).date().isoformat(),"sources":sources,"instruments":sorted(result.values(),key=lambda r:r["symbol"])}
    target=ROOT/"data/equity_universe.json"
    target.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    print(f"Universe snapshot: {len(result)} unique symbols; mapped CIKs={sum(bool(r['cik']) for r in result.values())}")
if __name__=="__main__":sync()
