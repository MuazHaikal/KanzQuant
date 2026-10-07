"""Service-boundary tests; use fake storage unless explicitly opting into real Neon."""
import json
import subprocess
import threading
import time
from copy import deepcopy
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from services.hypothesis_api.auth import verify_token
from services.hypothesis_api.execution import Executor, ExecutionBusy, UnknownRun
from services.hypothesis_api.logging import redact
from services.hypothesis_api.main import create_app
from services.hypothesis_api.schemas import validate_parameters

RUN="11111111-1111-4111-8111-111111111111"
OTHER="22222222-2222-4222-8222-222222222222"
SECRET="test-fixture-not-a-deployment-credential-"*2
PARAMS={"mode":"conditional","conditions":[{"source":"credit","metric":"3","op":"falling","threshold":0}],"asset":"SPX","horizon":1,"spacing":3,"baseline":"others","method":"Automatic","alternative":"two-sided","label":"EXPLORATORY","family":"service-unit-test","seed":42}

def ts_token(run_id=RUN,expiry=None):
    result=subprocess.run(["node","scripts/test_execution_token.mjs"],input=json.dumps({"run_id":run_id,"expiry":expiry or int(time.time())+300,"secret":SECRET}),capture_output=True,text=True,check=True,cwd=Path(__file__).resolve().parents[1])
    return result.stdout

@pytest.mark.parametrize("kind",["valid","expired","tampered","wrong_run","malformed","future","expiry_boundary"])
def test_typescript_signer_python_verifier(kind):
    now=1800000000
    token=ts_token(expiry=now+300)
    run_id=RUN
    if kind=="expired":token=ts_token(expiry=now-1)
    if kind=="tampered":token=token[:-1]+("A" if token[-1]!="A" else "B")
    if kind=="wrong_run":run_id=OTHER
    if kind=="malformed":token="v1.invalid"
    if kind=="future":token=ts_token(expiry=now+301)
    if kind=="expiry_boundary":token=ts_token(expiry=now)
    assert verify_token(run_id,token,SECRET,now)==(kind=="valid")

class MemoryExecutor(Executor):
    def __init__(self):
        self.slot=threading.Lock();self.lock=threading.Lock();self.current="queued";self.count=0;self.error=False;self.claim_id=None;self.started=threading.Event();self.release=threading.Event();self.wait=False;self.persisted=None
    def open(self):pass
    def close(self):pass
    def status(self,run_id):
        if run_id!=RUN:raise UnknownRun()
        return self.current
    def claim(self,run_id,claim_id):
        if run_id!=RUN:return None
        with self.lock:
            if self.current not in {"queued","failed"}:return None
            self.current="running";self.claim_id=claim_id
            return {"parameters":deepcopy(PARAMS),"metadata":{}}
    def dataset(self,metadata):return {"as_of":"2026-09-30","rows":[]}
    def compute(self,data,parameters):
        self.count+=1;self.started.set()
        if self.wait:assert self.release.wait(5)
        if self.error:raise RuntimeError("password=never-store-this")
        return {"summary":{"status":"COMPLETE","p":.5,"evidence":"WEAK","event":{"n":45}},"test_count":1}
    def complete(self,run_id,claim_id,data,result,timing):
        assert claim_id==self.claim_id;self.persisted=result;self.current="complete"
    def fail(self,run_id,claim_id):
        assert claim_id==self.claim_id;self.current="failed";self.persisted={"error":"Research computation or persistence failed. Retry this saved run."}

def test_idempotent_execution_and_concurrent_claim():
    store=MemoryExecutor();store.wait=True
    thread=threading.Thread(target=store.execute,args=(RUN,));thread.start();assert store.started.wait(5)
    assert store.execute(RUN)["status"]=="running"
    store.release.set();thread.join(5)
    assert store.execute(RUN)["status"]=="complete"
    assert store.count==1

def test_failure_is_saved_and_same_id_retry_is_clean(caplog):
    store=MemoryExecutor();store.error=True
    assert store.execute(RUN)["status"]=="failed"
    assert "never-store-this" not in json.dumps(store.persisted)
    assert "never-store-this" not in caplog.text
    assert "RuntimeError" in caplog.text
    store.error=False
    assert store.execute(RUN)["status"]=="complete"
    assert store.count==2

def test_service_auth_cors_narrow_health_and_idempotency():
    store=MemoryExecutor()
    with TestClient(create_app(store,SECRET,["https://kanz-quant.vercel.app"])) as client:
        health=client.get("/healthz")
        assert health.json()=={"status":"ok","service":"kanzquant-hypothesis","version":"0.2"}
        assert client.get("/docs").status_code==404
        assert client.get("/openapi.json").status_code==404
        assert client.post("/v1/hypothesis/run",json={"run_id":RUN}).status_code==400
        assert client.post("/v1/hypothesis/run",content="x"*2049).status_code==413
        assert client.post("/v1/hypothesis/run",headers={"content-length":"invalid"},content="{}").status_code==400
        bad=client.post("/v1/hypothesis/run",json={"run_id":OTHER,"token":"not-a-token"})
        assert bad.status_code==401 and store.count==0
        assert client.post("/v1/hypothesis/run",json={"run_id":OTHER,"token":ts_token(OTHER)}).status_code==404
        token=ts_token()
        assert client.post("/v1/hypothesis/run",json={"run_id":RUN,"token":token,"code":"print(1)"}).status_code==400
        assert client.post("/v1/hypothesis/run",headers={"Origin":"https://untrusted.example"},json={"run_id":RUN,"token":token}).status_code==403
        assert client.post("/v1/hypothesis/run",json={"run_id":RUN,"token":token}).json()["status"]=="complete"
        assert client.post("/v1/hypothesis/run",json={"run_id":RUN,"token":token}).json()["status"]=="complete"
        assert store.count==1
        preflight=client.options("/v1/hypothesis/run",headers={"Origin":"https://kanz-quant.vercel.app","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type"})
        assert preflight.headers["access-control-allow-origin"]=="https://kanz-quant.vercel.app"
        assert client.get("/healthz").status_code==200

@pytest.mark.parametrize("mutation",[{"iterations":1000000},{"asset":"FAKE"},{"horizon":2},{"conditions":[PARAMS["conditions"][0]]*4},{"seed":-1},{"method":"eval"},{"mode":"relationship","method":"Permutation"}])
def test_stored_parameters_have_hard_caps(mutation):
    p=deepcopy(PARAMS);p.update(mutation)
    with pytest.raises((ValueError,TypeError)):validate_parameters(p)

def test_exact_origin_configuration():
    with pytest.raises(RuntimeError):create_app(MemoryExecutor(),SECRET,["*"])

def test_redaction_removes_urls_and_actual_environment_secrets(monkeypatch):
    monkeypatch.setenv("HYPOTHESIS_RUN_SECRET","secret-value-for-test")
    text=redact("postgresql:"+"//account:password@host/db secret-value-for-test token=sample password=sample")
    assert "secret-value-for-test" not in text and "sample" not in text and "account" not in text

def test_bounded_worker_timeout_terminates_process(monkeypatch):
    from queue import Empty
    class Worker:
        def is_alive(self):return True
    class Requests:
        def put(self,value,timeout):assert timeout==5
    class Responses:
        def get(self,timeout):assert timeout==60;raise Empty()
    executor=Executor.__new__(Executor)
    executor.worker=Worker();executor.requests=Requests();executor.responses=Responses()
    stopped=[];monkeypatch.setattr(executor,"stop_worker",lambda:stopped.append(True))
    with pytest.raises(TimeoutError):executor.compute({},PARAMS)
    assert stopped==[True]
