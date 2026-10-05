from __future__ import annotations
import os
import subprocess
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from research.config import load_local_env
from run_research import run

root=Path(__file__).resolve().parents[1]
load_local_env(root)
database_url=os.getenv("DATABASE_URL")
if database_url:
    subprocess.run(["psql",database_url,"-v","ON_ERROR_STOP=1","-f",str(root/"migrations"/"001_initial.sql")],check=True)
    print("Neon schema applied.")
else:
    print("DATABASE_URL not set; schema step skipped (demo mode).")
result=run(root/"data"/"research_snapshot.json")
print(f"Demo research snapshot ready: {result['as_of']}")
