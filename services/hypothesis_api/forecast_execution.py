"""Forecast experiments share the existing service, database pool and compute slot."""
import json
from time import perf_counter
from uuid import uuid4
from psycopg.types.json import Jsonb
from research.forecast.policy import validate
from .execution import Executor, ExecutionBusy, UnknownRun
from .logging import log_exception

class ForecastExecutor(Executor):
    def __init__(self, shared):
        self.pool=shared.pool
        self.slot=shared.slot
        self.compute=shared.compute

    def status(self,run_id):
        with self.connection() as conn:
            row=conn.execute("SELECT status FROM research_runs WHERE id=%s AND module='forecast.lab'",(run_id,)).fetchone()
        if not row:raise UnknownRun()
        return row["status"]

    def execute(self,run_id):
        if not self.slot.acquire(blocking=False):
            status=self.status(run_id)
            if status in {"running","complete"}:return {"run_id":run_id,"status":status}
            raise ExecutionBusy()
        claim=str(uuid4());owned=False;started=perf_counter()
        try:
            with self.connection() as conn:
                row=conn.execute("UPDATE research_runs SET status='running',metadata=(metadata-'error') || jsonb_build_object('claim_id',%s::text,'claimed_at',now(),'attempts',COALESCE((metadata->>'attempts')::int,0)+1) WHERE id=%s AND module='forecast.lab' AND (status IN ('queued','failed') OR (status='running' AND (metadata->>'claimed_at')::timestamptz<now()-interval '3 minutes')) AND COALESCE((metadata->>'attempts')::int,0)<3 RETURNING parameters,metadata",(claim,run_id)).fetchone()
            if not row:return {"run_id":run_id,"status":self.status(run_id)}
            owned=True;spec=validate(row["parameters"])
            with self.connection() as conn:
                saved=conn.execute("SELECT payload FROM research_results WHERE run_id=%s AND result_type='forecast_dataset' AND result_key='input'",(run_id,)).fetchone()
            data=saved["payload"] if saved else None
            if not data or data.get("kind")!="forecast" or data.get("series")!=spec["series"] or data.get("hash")!=row["metadata"].get("dataset_hash") or len(data.get("points",[]))>600 or len(json.dumps(data))>150000:
                raise ValueError("Frozen forecast dataset unavailable")
            result=self.compute(data,spec)
            timing={**result["timing"],"execution_ms":round((perf_counter()-started)*1000)}
            t=perf_counter()
            with self.connection() as conn:
                saved=conn.execute("""WITH owned AS (SELECT id FROM research_runs WHERE id=%s AND module='forecast.lab' AND status='running' AND metadata->>'claim_id'=%s FOR UPDATE),saved AS (INSERT INTO research_results(run_id,result_type,result_key,as_of_date,payload) SELECT id,'forecast','result',%s,%s FROM owned RETURNING run_id) UPDATE research_runs r SET status='complete',completed_at=now(),metadata=metadata || %s FROM saved WHERE r.id=saved.run_id RETURNING r.id""",(run_id,claim,data["as_of"],Jsonb(result),Jsonb({"timing":timing}))).fetchone()
                if not saved:raise RuntimeError("Forecast lease lost")
            timing["persistence_ms"]=round((perf_counter()-t)*1000)
            return {"run_id":run_id,"status":"complete","timing":timing}
        except UnknownRun:raise
        except Exception as error:
            log_exception(run_id,error)
            if owned:
                with self.connection() as conn:
                    conn.execute("UPDATE research_runs SET status='failed',completed_at=now(),metadata=metadata || %s WHERE id=%s AND module='forecast.lab' AND metadata->>'claim_id'=%s",(Jsonb({"error":"MODEL FIT FAILED · Retry this saved experiment."}),run_id,claim))
            return {"run_id":run_id,"status":"failed"}
        finally:self.slot.release()
