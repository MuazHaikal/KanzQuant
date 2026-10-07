"""Reproduce an exact saved result without new market/FRED requests or database writes."""
import json
import sys
import uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from research.config import load_local_env
from research.storage import connect
from research.hypothesis.engine import run
from hypothesis_worker import serialize

def main():
    run_id=str(uuid.UUID(sys.argv[1]));load_local_env()
    with connect() as conn,conn.cursor() as cur:
        cur.execute("SET LOCAL statement_timeout='15s'")
        cur.execute("SELECT parameters,metadata FROM research_runs WHERE id=%s AND module='hypothesis.lab'",(run_id,));row=cur.fetchone()
        if not row:raise ValueError("Run not found")
        cur.execute("SELECT payload FROM research_results WHERE run_id=%s AND result_type='hypothesis_dataset' AND result_key=%s",(row["metadata"]["source_run"],row["metadata"]["dataset_hash"]));data=cur.fetchone()["payload"]
        cur.execute("SELECT payload FROM research_results WHERE run_id=%s AND result_type='hypothesis' AND result_key='result'",(run_id,));saved=cur.fetchone()["payload"]
    computed=serialize(run(data,row["parameters"]))
    if computed!=saved:raise ValueError("Result mismatch")
    print("Exact stored result reproduced; fingerprint "+computed["fingerprint"][:16]+"; no database writes.")

if __name__=="__main__":
    try:main()
    except Exception:
        print("Reproduction failed: check run ID, engine version, database and Python runtime.",file=sys.stderr);sys.exit(1)
