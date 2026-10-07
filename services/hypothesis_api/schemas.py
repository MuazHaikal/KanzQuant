"""Defense-in-depth whitelist for canonical stored specifications."""
import math
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

SOURCES = set("growth inflation rates credit liquidity volatility FEDFUNDS DGS2 DGS10 T10Y2Y CPIAUCSL CPILFESL PCEPI UNRATE PAYEMS ICSA INDPRO RSAFS GDPC1 BAA10Y M2SL WALCL VIXCLS".split())
STATES = {"Very low", "Below usual", "In range", "Above usual", "Very high"}

class ExecutionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: UUID
    token: str = Field(min_length=1, max_length=128)

def validate_parameters(p: dict) -> dict:
    keys = {"mode", "conditions", "asset", "horizon", "spacing", "baseline", "method", "alternative", "label", "family", "seed"}
    if not isinstance(p, dict) or set(p) != keys:
        raise ValueError("Invalid stored specification")
    for key, choices in {"mode": {"conditional", "relationship"}, "asset": {"SPX", "GLD", "IEF"}, "horizon": {1,3,6,12}, "spacing": {3,6,9,12}, "baseline": {"others", "full"}, "alternative": {"two-sided", "less", "greater"}, "label": {"EXPLORATORY", "PRE-SPECIFIED"}}.items():
        if p[key] not in choices or isinstance(p[key], bool):
            raise ValueError("Invalid stored specification")
    if type(p["seed"]) is not int or not 0 <= p["seed"] <= 2147483647 or not isinstance(p["family"], str) or len(p["family"]) > 64:
        raise ValueError("Invalid stored specification")
    methods = {"Automatic", "Permutation", "Welch t-test", "Mann-Whitney"} if p["mode"] == "conditional" else {"Automatic", "Correlation", "Regression"}
    conditions = p["conditions"]
    if p["method"] not in methods or not isinstance(conditions,list) or not 1 <= len(conditions) <= (3 if p["mode"] == "conditional" else 1):
        raise ValueError("Invalid stored specification")
    for c in conditions:
        if not isinstance(c,dict) or set(c) != {"source", "metric", "op", "threshold"} or c["source"] not in SOURCES or c["metric"] not in {"level", "1", "3", "12"} or c["op"] not in {"below", "above", "lt", "gt", "rising", "falling", "state"}:
            raise ValueError("Invalid stored condition")
        t = c["threshold"]
        if c["op"] == "state":
            if c["metric"] != "level" or t not in STATES:
                raise ValueError("Invalid stored condition")
        elif type(t) not in (float,int) or not math.isfinite(t) or abs(t)>1e12 or (c["op"] in {"below","above"} and not 1<=t<=99):
            raise ValueError("Invalid stored condition")
        if c["op"] in {"rising","falling"} and c["metric"] == "level":
            raise ValueError("Invalid stored condition")
    return p
