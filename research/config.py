"""Local configuration loading shared by standalone research jobs."""
from __future__ import annotations

import os
from pathlib import Path


def load_local_env(root: Path | None = None) -> None:
    """Load .env.local without logging values or overriding exported variables."""
    project_root = root or Path(__file__).resolve().parents[1]
    env_file = project_root / ".env.local"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)
