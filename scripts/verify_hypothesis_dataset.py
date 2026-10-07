"""Read-only equivalence audit against the existing point-in-time and return semantics."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import pandas as pd
from research.config import load_local_env
from research.storage import connect
from research.pipeline import point_in_time_monthly

def main():
    load_local_env()
    with connect() as conn,conn.cursor() as cur:
        cur.execute("SET LOCAL statement_timeout='15s'")
        cur.execute("SELECT payload FROM research_results WHERE result_type='hypothesis_dataset' ORDER BY created_at DESC LIMIT 1");dataset=cur.fetchone()["payload"]
        cur.execute("SELECT s.external_id,s.frequency,o.observed_at,o.value FROM observations o JOIN series s ON s.id=o.series_id WHERE s.provider='FRED' ORDER BY o.observed_at");macro=pd.DataFrame(cur.fetchall())
        cur.execute("SELECT a.symbol,m.observed_at,m.adjusted_close FROM market_observations m JOIN assets a ON a.id=m.asset_id WHERE a.symbol IN ('SPX','GLD','IEF') AND m.observed_at<=%s ORDER BY m.observed_at",(dataset["as_of"],));markets=pd.DataFrame(cur.fetchall())
    macro["observed_at"]=pd.to_datetime(macro["observed_at"]);markets["observed_at"]=pd.to_datetime(markets["observed_at"])
    raw={}
    for name,g in macro.groupby("external_id"):
        raw[name]=point_in_time_monthly(g.set_index("observed_at")["value"],g["frequency"].iloc[0],pd.Timestamp(dataset["as_of"]))
    prices={name:g.set_index("observed_at")["adjusted_close"].astype(float).resample("ME").last() for name,g in markets.groupby("symbol")}
    count=0
    for row in dataset["rows"]:
        date=pd.Timestamp(row["date"])
        for name,series in raw.items():
            expected=series.get(date,np.nan);actual=row["values"].get(name)
            if actual is not None:assert np.isclose(actual,expected),name+" release-lag mismatch"
        for asset,series in prices.items():
            for horizon in (1,3,6,12):
                target=date+pd.offsets.MonthEnd(horizon);value=row["returns"][asset][str(horizon)]
                expected=(series.get(target,np.nan)/series.get(date,np.nan)-1)*100
                if value is None:assert not np.isfinite(expected) or target>pd.Timestamp(dataset["as_of"])
                else:assert target<=pd.Timestamp(dataset["as_of"]) and np.isclose(value,expected)
                count+=1
    print(f"Real frozen dataset: {len(dataset['rows'])} months; existing FRED release-lag semantics match; {count} exact calendar forward-return alignments audited; no future outcomes or database writes.")

if __name__=="__main__":
    try:main()
    except Exception:
        print("Dataset equivalence audit failed.",file=sys.stderr);sys.exit(1)
