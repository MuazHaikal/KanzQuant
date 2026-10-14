"""One bounded canonical Python compute at a time; atomic Neon run claims."""
from collections import OrderedDict
from contextlib import contextmanager
import json
import multiprocessing
from queue import Empty
from threading import Lock
from time import perf_counter
from uuid import uuid4
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool
from .logging import log_event, log_exception, logger, redact
from .schemas import validate_parameters
from .worker import canonical_worker

ENGINE = "hypothesis-0.2.0"

class ExecutionBusy(Exception):
    pass

class UnknownRun(Exception):
    pass

class Executor:
    def __init__(self, database_url: str):
        self.pool = ConnectionPool(database_url, min_size=0, max_size=2, timeout=10, max_waiting=4, max_idle=60, max_lifetime=600, reconnect_timeout=15, open=False, kwargs={"connect_timeout":10,"row_factory":dict_row},check=ConnectionPool.check_connection)
        self.slot = Lock()
        self.cache = OrderedDict()
        self.worker = None
        self.requests = None
        self.responses = None

    def open(self):
        self.pool.open()

    def close(self):
        self.stop_worker()
        self.pool.close()

    def stop_worker(self):
        if self.worker is not None:
            if self.worker.is_alive():
                self.worker.terminate()
            self.worker.join(timeout=5)
            self.worker.close();self.worker=None
        for channel in (self.requests,self.responses):
            if channel is not None:
                channel.close();channel.cancel_join_thread()
        self.requests=None;self.responses=None

    @contextmanager
    def connection(self):
        with self.pool.connection() as conn:
            # PgBouncer rejects startup options; transaction-local limits work with pooled Neon.
            conn.execute("SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='5s'; SET LOCAL idle_in_transaction_session_timeout='15s'")
            yield conn

    def status(self, run_id):
        with self.connection() as conn:
            row = conn.execute("SELECT status FROM research_runs WHERE id=%s AND module='hypothesis.lab'",(run_id,)).fetchone()
        if not row:
            raise UnknownRun()
        return row["status"]

    def claim(self, run_id, claim_id):
        with self.connection() as conn:
            # The 3-minute crash lease exceeds bounded compute + all database timeouts.
            return conn.execute("UPDATE research_runs SET status='running',completed_at=NULL,metadata=(metadata-'error') || jsonb_build_object('claim_id',%s::text,'claimed_at',now(),'attempts',COALESCE((metadata->>'attempts')::int,0)+1) WHERE id=%s AND module='hypothesis.lab' AND (status IN ('queued','failed') OR (status='running' AND (metadata->>'claimed_at')::timestamptz < now()-interval '3 minutes')) AND metadata->>'execution_protocol'='1' AND COALESCE((metadata->>'attempts')::int,0)<3 RETURNING parameters,metadata",(claim_id,run_id)).fetchone()

    def dataset(self, metadata):
        key=(metadata["source_run"],metadata["dataset_hash"])
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        with self.connection() as conn:
            row=conn.execute("SELECT payload FROM research_results WHERE run_id=%s AND result_type='hypothesis_dataset' AND result_key=%s",key).fetchone()
        if not row:
            raise ValueError("Frozen research dataset unavailable")
        data=row["payload"]
        if data.get("hash")!=key[1] or data.get("source_run")!=key[0] or data.get("as_of")!=metadata["research_date"] or not 1<=len(data.get("rows",[]))<=1200 or len(json.dumps(data))>2000000:
            raise ValueError("Invalid frozen research dataset")
        self.cache[key]=data
        if len(self.cache)>4:
            self.cache.popitem(last=False)
        return data

    def compute(self, data, parameters):
        if self.worker is None or not self.worker.is_alive():
            self.stop_worker();ctx=multiprocessing.get_context("spawn")
            self.requests=ctx.Queue(maxsize=1);self.responses=ctx.Queue(maxsize=1)
            self.worker=ctx.Process(target=canonical_worker,args=(self.requests,self.responses),daemon=True)
            self.worker.start()
        self.requests.put((data,parameters),timeout=5)
        try:
            ok,value,error=self.responses.get(timeout=60)
        except Empty:
            self.stop_worker()
            raise TimeoutError("Hypothesis compute exceeded 60 seconds") from None
        if not ok:
            logger.error("canonical_engine %s",redact(error[:16000]))
            raise RuntimeError("Canonical hypothesis engine failed")
        if len(json.dumps(value,allow_nan=False))>2000000:
            raise ValueError("Research result exceeded safe size")
        expected="forecast-0.4.0" if data.get("kind")=="forecast" else ENGINE
        actual=value.get("engine") if data.get("kind")=="forecast" else value.get("technical",{}).get("engine")
        if actual!=expected:
            raise ValueError("Unexpected research engine response")
        return value

    def complete(self, run_id, claim_id, data, result, timing):
        with self.connection() as conn:
            metadata={"test_count":result["test_count"],"primary_p":result["summary"]["p"],"evidence":result["summary"]["evidence"],"timing":timing,"runtime_ms":timing["execution_ms"]}
            # One statement/transaction stores the result and completes its matching lease.
            row=conn.execute("""WITH owned AS (SELECT id FROM research_runs WHERE id=%s AND module='hypothesis.lab' AND status='running' AND metadata->>'claim_id'=%s FOR UPDATE), saved AS (INSERT INTO research_results(run_id,result_type,result_key,as_of_date,payload) SELECT id,'hypothesis','result',%s,%s FROM owned RETURNING run_id) UPDATE research_runs r SET status='complete',completed_at=now(),metadata=metadata || %s FROM saved WHERE r.id=saved.run_id RETURNING r.id""",(run_id,claim_id,data["as_of"],Jsonb(result),Jsonb(metadata))).fetchone()
            if not row:
                raise RuntimeError("Execution lease lost")

    def fail(self, run_id, claim_id):
        with self.connection() as conn:
            conn.execute("UPDATE research_runs SET status='failed',completed_at=now(),metadata=metadata || %s WHERE id=%s AND module='hypothesis.lab' AND status='running' AND metadata->>'claim_id'=%s",(Jsonb({"error":"Research computation or persistence failed. Retry this saved run."}),run_id,claim_id))

    def execute(self, run_id):
        if not self.slot.acquire(blocking=False):
            status=self.status(run_id)
            if status in {"running","complete"}:
                return {"run_id":run_id,"status":status}
            raise ExecutionBusy()
        claim_id=str(uuid4());claimed=False;started=perf_counter()
        try:
            row=self.claim(run_id,claim_id)
            if row is None:
                return {"run_id":run_id,"status":self.status(run_id)}
            claimed=True
            parameters=validate_parameters(row["parameters"])
            t=perf_counter();data=self.dataset(row["metadata"]);data_ms=round((perf_counter()-t)*1000)
            log_event(run_id=run_id,status="running",mode=parameters["mode"])
            t=perf_counter();result=self.compute(data,parameters);stats_ms=round((perf_counter()-t)*1000)
            timing={"data_load_ms":data_ms,"statistics_ms":stats_ms,"execution_ms":round((perf_counter()-started)*1000)}
            write_started=perf_counter();self.complete(run_id,claim_id,data,result,timing)
            timing["database_write_ms"]=round((perf_counter()-write_started)*1000)
            timing["execution_ms"]=round((perf_counter()-started)*1000)
            log_event(run_id=run_id,status="complete",duration_ms=timing["execution_ms"],event_count=result["summary"].get("event",{}).get("n",result["summary"].get("n")),outcome=result["summary"]["status"],timing=timing)
            return {"run_id":run_id,"status":"complete","timing":timing}
        except UnknownRun:
            raise
        except Exception as error:
            log_exception(run_id,error)
            if claimed:
                try:
                    self.fail(run_id,claim_id)
                except Exception as persistence_error:
                    log_exception(run_id,persistence_error)
            return {"run_id":run_id,"status":"failed"}
        finally:
            self.slot.release()
