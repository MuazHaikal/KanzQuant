"""Narrow FastAPI boundary: authenticate before loading any saved research run."""
from contextlib import asynccontextmanager
import asyncio
import os
from urllib.parse import urlsplit
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .auth import verify_token
from .execution import Executor, ExecutionBusy, UnknownRun
from .logging import log_exception
from .schemas import ExecutionRequest

DEFAULT_ORIGINS="https://kanz-quant.vercel.app,http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"

def create_app(executor=None,secret=None,origins=None):
    secret=secret or os.environ.get("HYPOTHESIS_RUN_SECRET","")
    allowed=origins if origins is not None else os.environ.get("ALLOWED_ORIGINS",DEFAULT_ORIGINS).split(",")
    allowed=[o.strip() for o in allowed if o.strip()]
    if not allowed or any("*" in o or urlsplit(o).scheme not in {"http","https"} or not urlsplit(o).hostname or urlsplit(o).path or urlsplit(o).query or urlsplit(o).fragment or urlsplit(o).username for o in allowed):
        raise RuntimeError("Configure exact allowed browser origins")

    @asynccontextmanager
    async def lifespan(app):
        if len(secret.encode())<32:
            raise RuntimeError("Research signing secret is not configured")
        if executor is None:
            if os.environ.get("KANZQUANT_DATA_MODE")!="database" or not os.environ.get("DATABASE_URL"):
                raise RuntimeError("Real database configuration is required")
            app.state.executor=Executor(os.environ["DATABASE_URL"])
        else:
            app.state.executor=executor
        app.state.executor.open()
        yield
        app.state.executor.close()

    app=FastAPI(lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)
    app.add_middleware(CORSMiddleware,allow_origins=allowed,allow_credentials=False,allow_methods=["POST"],allow_headers=["Content-Type"],max_age=600)

    @app.middleware("http")
    async def request_guard(request:Request,call_next):
        if request.url.path=="/v1/hypothesis/run":
            origin=request.headers.get("origin")
            if origin and origin not in allowed:
                return JSONResponse({"error":"Origin not allowed"},status_code=403)
            try:size=int(request.headers.get("content-length","0") or "0")
            except ValueError:return JSONResponse({"error":"Invalid execution request"},status_code=400)
            if size>2048:
                return JSONResponse({"error":"Invalid execution request"},status_code=413)
            body=bytearray()
            try:
                async with asyncio.timeout(5):
                    async for chunk in request.stream():
                        body.extend(chunk)
                        if len(body)>2048:
                            return JSONResponse({"error":"Invalid execution request"},status_code=413)
            except TimeoutError:
                return JSONResponse({"error":"Execution request timed out"},status_code=408)
            # BaseHTTPMiddleware's cached request makes the bounded body available downstream.
            request._body=bytes(body)
        response=await call_next(request)
        response.headers["Cache-Control"]="no-store"
        response.headers["X-Content-Type-Options"]="nosniff"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request,error):
        # Pydantic's usual diagnostics echo input; tokens must never be echoed.
        return JSONResponse({"error":"Invalid execution request"},status_code=400)

    @app.get("/healthz")
    def health():
        return {"status":"ok","service":"kanzquant-hypothesis","version":"0.2"}

    @app.post("/v1/hypothesis/run")
    def execute(body:ExecutionRequest,request:Request):
        run_id=str(body.run_id)
        if not verify_token(run_id,body.token,secret):
            raise HTTPException(401,"Execution authorization failed")
        try:
            return request.app.state.executor.execute(run_id)
        except UnknownRun:
            raise HTTPException(404,"Research run unavailable") from None
        except ExecutionBusy:
            raise HTTPException(429,"Research engine busy; retry this saved run",headers={"Retry-After":"3"}) from None
        except Exception as error:
            log_exception(run_id,error)
            raise HTTPException(503,"Research service temporarily unavailable") from None
    return app

app=create_app()
