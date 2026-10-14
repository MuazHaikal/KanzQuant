"""One persistent bounded compute process; the statistical engine is not duplicated."""
import os

def canonical_worker(requests, responses):
    # The worker needs no Neon/provider/signing credentials and performs no network I/O.
    safe={k:v for k,v in os.environ.items() if k in {"PATH","SYSTEMROOT","WINDIR","TEMP","TMP","LANG"}}
    os.environ.clear();os.environ.update(safe)
    os.environ.update(OPENBLAS_NUM_THREADS="1",OMP_NUM_THREADS="1",PYTHONUTF8="1")
    from research.hypothesis.engine import run
    from scripts.hypothesis_worker import serialize
    from .logging import redact
    import traceback
    while True:
        data,parameters=requests.get()
        try:
            if data.get("kind")=="forecast":
                from research.forecast.engine import run as forecast
                value=forecast(data,parameters)
            else:
                value=run(data,parameters)
            responses.put((True,serialize(value),None))
        except Exception as error:
            responses.put((False,None,redact("".join(traceback.format_exception(error)))))
