"""Short-lived execution capabilities; ASCII protocol shared with Next.js."""
import base64
import hashlib
import hmac
import re
import time

UUID_PATTERN = r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}"

def verify_token(run_id: str, token: str, secret: str, now: int | None = None, purpose: str = "hypothesis") -> bool:
    if len(secret.encode()) < 32 or not re.fullmatch(UUID_PATTERN, run_id):
        return False
    match = re.fullmatch(r"v1\.([0-9]{10})\.([A-Za-z0-9_-]{43})", token)
    if not match:
        return False
    expiry = int(match[1])
    clock = int(time.time()) if now is None else now
    if purpose not in {"hypothesis","forecast"}:return False
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), f"kanzquant.{purpose}.v1\n{run_id}\n{expiry}".encode("ascii"), hashlib.sha256).digest()).decode().rstrip("=")
    valid = hmac.compare_digest(signature, match[2])
    return valid and clock < expiry <= clock + 300
