"""Single genuine startup/health measurement, not a keep-alive monitor."""
import os
from pathlib import Path
import socket
import subprocess
import sys
from time import perf_counter, sleep
from urllib.request import urlopen
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from research.config import load_local_env

if __name__=="__main__":
    load_local_env()
    with socket.socket() as probe:
        probe.bind(("127.0.0.1",8002))
    started=perf_counter()
    process=subprocess.Popen([sys.executable,"-m","uvicorn","services.hypothesis_api.main:app","--host","127.0.0.1","--port","8002","--workers","1","--no-access-log"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=os.environ.copy())
    try:
        while perf_counter()-started<20:
            try:
                with urlopen("http://127.0.0.1:8002/healthz",timeout=1) as response:
                    if response.status==200:
                        print(f"Cold local API startup to healthy: {round((perf_counter()-started)*1000)}ms")
                        break
            except OSError:
                if process.poll() is not None:
                    raise RuntimeError("API exited before health verification") from None
                sleep(.05)
        else:
            raise RuntimeError("API startup exceeded 20 seconds")
    finally:
        process.terminate()
        try:process.wait(timeout=5)
        except subprocess.TimeoutExpired:process.kill();process.wait()
