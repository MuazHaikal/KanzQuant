"""Real server diagnostics with credential redaction; never returned to clients."""
import json
import logging
import os
import re
import traceback

logger = logging.getLogger("kanzquant.hypothesis")

def redact(text: str) -> str:
    for key in ("DATABASE_URL", "HYPOTHESIS_RUN_SECRET", "FRED_API_KEY", "RENDER_API_KEY", "VERCEL_TOKEN"):
        value = os.environ.get(key)
        if value:
            text = text.replace(value, "[REDACTED]")
    text = re.sub(r"(?:postgres(?:ql)?|https?)://[^\s\"']+", "[REDACTED URL]", text)
    return re.sub(r"(?i)(password|token|secret|api_key)\s*[=:]\s*[^\s,;]+", r"\1=[REDACTED]", text)

def log_event(**fields):
    logger.warning(json.dumps(fields,separators=(",",":")))

def log_exception(run_id: str, error: Exception):
    logger.error("run_id=%s %s",run_id,redact("".join(traceback.format_exception(error))))

class CredentialFilter(logging.Filter):
    def filter(self,record):
        record.msg=redact(record.getMessage());record.args=()
        # Pool diagnostics normally provide plain text; never forward an unredacted traceback.
        if record.exc_info:
            record.msg+=" "+redact("".join(traceback.format_exception(*record.exc_info)))
            record.exc_info=None;record.exc_text=None
        return True

logging.getLogger("psycopg.pool").addFilter(CredentialFilter())
