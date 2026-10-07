"""Single-request, bounded stdin JSON bridge; no arbitrary code or external data fetch."""
import json
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from research.hypothesis.engine import run

def serialize(value):
    if isinstance(value,dict):return {k:serialize(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)):return [serialize(v) for v in value]
    if isinstance(value,(np.integer,np.bool_)):return value.item()
    if isinstance(value,(float,np.floating)):return float(value) if np.isfinite(value) else None
    return value

if __name__=="__main__":
    try:
        payload=json.load(sys.stdin)
        output=run(payload["data"],payload["parameters"])
        print(json.dumps(serialize(output),allow_nan=False,separators=(",",":")))
    except Exception as error:
        from services.hypothesis_api.logging import log_exception
        log_exception("canonical-worker",error)
        print(json.dumps({"error":"Hypothesis engine could not complete this run."}))
        sys.exit(1)
